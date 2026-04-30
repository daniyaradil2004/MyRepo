package handlers

import (
	"context"
	"log"
	"net/http"
	"strconv"

	"restaurant-app/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type RecommendationHandler struct {
	recommendationRepo *models.RecommendationRepository
	productRepo        *models.ProductRepository
	cartRepo           *models.CartRepository
	orderRepo          *models.OrderRepository
	commentRepo        *models.CommentRepository
}

func NewRecommendationHandler(r *models.RecommendationRepository, p *models.ProductRepository, c *models.CartRepository, o *models.OrderRepository, commentRepo *models.CommentRepository) *RecommendationHandler {
	return &RecommendationHandler{
		recommendationRepo: r,
		productRepo:        p,
		cartRepo:           c,
		orderRepo:          o,
		commentRepo:        commentRepo,
	}
}

func (h *RecommendationHandler) GetPersonalizedRecommendations(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	limit := 10
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			limit = v
		}
	}
	minLimit := 3 // Ensure at least 3 recommendations

	// 1) try Neo4j co-occurrence recommender
	ids, err := h.recommendationRepo.GetPersonalizedRecommendations(r.Context(), userID, limit)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get recommendations: "+err.Error())
		return
	}
	// If Neo4j returned some ids, fetch product docs and return
	if len(ids) > 0 {
		products, err := h.productRepo.FindByIDs(r.Context(), ids)
		if err == nil && len(products) > 0 {
			// Ensure we have at least minLimit products
			if len(products) < minLimit {
				products = h.ensureMinimumRecommendations(r.Context(), products, userID, minLimit)
			}
			respondJSON(w, http.StatusOK, products)
			return
		}
		// else continue to fallback logic
	}

	// 2) Fallback: recommend based on user's order history
	stats, err := h.orderRepo.GetUserOrderStats(r.Context(), userID)
	if err != nil {
		// If error getting stats, log but continue to fallback
		log.Printf("Error getting user order stats: %v", err)
	}
	
	userBoughtIDs := make([]primitive.ObjectID, 0)
	if len(stats) > 0 {
		// Sort products by order count to find top and second best
		type productCount struct {
			id    primitive.ObjectID
			count int
		}
		productCounts := make([]productCount, 0, len(stats))
		for pid, cnt := range stats {
			userBoughtIDs = append(userBoughtIDs, pid)
			productCounts = append(productCounts, productCount{id: pid, count: cnt})
		}

		// Sort by count descending
		for i := 0; i < len(productCounts)-1; i++ {
			for j := i + 1; j < len(productCounts); j++ {
				if productCounts[i].count < productCounts[j].count {
					productCounts[i], productCounts[j] = productCounts[j], productCounts[i]
				}
			}
		}

		var recommendations []*models.Product
		categoriesToTry := make(map[string]bool)

		// Try top product's category (even if user only has one order)
		if len(productCounts) > 0 {
			topProd, err := h.productRepo.FindByID(r.Context(), productCounts[0].id)
			if err == nil && topProd.Category != "" {
				categoriesToTry[topProd.Category] = true
			}
		}

		// Try second best product's category (if available)
		if len(productCounts) > 1 {
			secondProd, err := h.productRepo.FindByID(r.Context(), productCounts[1].id)
			if err == nil && secondProd.Category != "" {
				categoriesToTry[secondProd.Category] = true
			}
		}

		// Get recommendations from these categories
		for category := range categoriesToTry {
			filter := bson.M{
				"category":  category,
				"available": true,
				"_id":       bson.M{"$nin": userBoughtIDs},
			}
			opts := options.Find().SetSort(bson.D{{Key: "rating_count", Value: -1}}).SetLimit(int64(limit))
			candidates, err := h.productRepo.FindAll(r.Context(), filter, opts)
			if err == nil {
				recommendations = append(recommendations, candidates...)
			}
		}

		// Remove duplicates and ensure minimum
		uniqueProducts := h.removeDuplicateProducts(recommendations)
		if len(uniqueProducts) >= minLimit {
			// Ensure we return at least minLimit products
			if len(uniqueProducts) > limit {
				respondJSON(w, http.StatusOK, uniqueProducts[:limit])
			} else {
				respondJSON(w, http.StatusOK, uniqueProducts)
			}
			return
		}

		// If we don't have enough, fill with global most ordered products
		needed := minLimit - len(uniqueProducts)
		if needed > 0 {
			globalProducts := h.getGlobalMostOrderedProducts(r.Context(), userBoughtIDs, needed)
			uniqueProducts = append(uniqueProducts, globalProducts...)
		}
		
		// Remove duplicates again after adding global products
		uniqueProducts = h.removeDuplicateProducts(uniqueProducts)
		if len(uniqueProducts) > 0 {
			if len(uniqueProducts) > limit {
				respondJSON(w, http.StatusOK, uniqueProducts[:limit])
			} else {
				respondJSON(w, http.StatusOK, uniqueProducts)
			}
			return
		}
	}

	// 3) Last fallback: global most ordered products across all users
	globalProducts := h.getGlobalMostOrderedProducts(r.Context(), userBoughtIDs, minLimit)
	if len(globalProducts) < minLimit {
		// If still not enough, add top-rated products
		filter := bson.M{"available": true}
		if len(userBoughtIDs) > 0 {
			filter["_id"] = bson.M{"$nin": userBoughtIDs}
		}
		needed := minLimit - len(globalProducts)
		opts := options.Find().SetSort(bson.D{{Key: "rating_count", Value: -1}}).SetLimit(int64(needed))
		topRated, err := h.productRepo.FindAll(r.Context(), filter, opts)
		if err == nil {
			globalProducts = append(globalProducts, topRated...)
		}
	}
	
	// Remove duplicates
	globalProducts = h.removeDuplicateProducts(globalProducts)
	
	if len(globalProducts) > 0 {
		if len(globalProducts) > limit {
			respondJSON(w, http.StatusOK, globalProducts[:limit])
		} else {
			respondJSON(w, http.StatusOK, globalProducts)
		}
		return
	}

	// Final fallback: any available products (excluding user's bought products)
	filter := bson.M{"available": true}
	if len(userBoughtIDs) > 0 {
		filter["_id"] = bson.M{"$nin": userBoughtIDs}
	}
	opts := options.Find().SetSort(bson.D{{Key: "rating_count", Value: -1}}).SetLimit(int64(limit))
	global, err := h.productRepo.FindAll(r.Context(), filter, opts)
	if err != nil {
		log.Printf("Error getting final fallback products: %v", err)
		respondJSON(w, http.StatusOK, []models.Product{})
		return
	}
	
	if len(global) < minLimit {
		// If we still don't have enough, include user's bought products too
		filterAll := bson.M{"available": true}
		optsAll := options.Find().SetSort(bson.D{{Key: "rating_count", Value: -1}}).SetLimit(int64(minLimit))
		allProducts, _ := h.productRepo.FindAll(r.Context(), filterAll, optsAll)
		if len(allProducts) > 0 {
			respondJSON(w, http.StatusOK, allProducts)
			return
		}
	}
	
	respondJSON(w, http.StatusOK, global)
}

// Helper function to ensure minimum recommendations
func (h *RecommendationHandler) ensureMinimumRecommendations(ctx context.Context, existing []*models.Product, userID primitive.ObjectID, minLimit int) []*models.Product {
	if len(existing) >= minLimit {
		return existing
	}

	// Get user's bought products
	stats, _ := h.orderRepo.GetUserOrderStats(ctx, userID)
	userBoughtIDs := make([]primitive.ObjectID, 0, len(stats))
	for pid := range stats {
		userBoughtIDs = append(userBoughtIDs, pid)
	}

	// Get existing product IDs
	existingIDs := make(map[primitive.ObjectID]bool)
	for _, p := range existing {
		existingIDs[p.ID] = true
	}

	// Fill with global most ordered products
	needed := minLimit - len(existing)
	globalProducts := h.getGlobalMostOrderedProducts(ctx, userBoughtIDs, needed)
	
	result := make([]*models.Product, len(existing))
	copy(result, existing)
	
	for _, p := range globalProducts {
		if !existingIDs[p.ID] {
			result = append(result, p)
			if len(result) >= minLimit {
				break
			}
		}
	}

	return result
}

// Helper function to get global most ordered products
func (h *RecommendationHandler) getGlobalMostOrderedProducts(ctx context.Context, excludeIDs []primitive.ObjectID, limit int) []*models.Product {
	// Get all orders and aggregate product counts
	allOrders, err := h.orderRepo.FindAll(ctx)
	if err != nil {
		// Fallback to top-rated products if we can't get orders
		filter := bson.M{"available": true}
		if len(excludeIDs) > 0 {
			filter["_id"] = bson.M{"$nin": excludeIDs}
		}
		opts := options.Find().SetSort(bson.D{{Key: "rating_count", Value: -1}}).SetLimit(int64(limit))
		products, _ := h.productRepo.FindAll(ctx, filter, opts)
		return products
	}

	// Count product quantities across all orders
	productCounts := make(map[primitive.ObjectID]int)
	excludeMap := make(map[primitive.ObjectID]bool)
	for _, id := range excludeIDs {
		excludeMap[id] = true
	}

	for _, order := range allOrders {
		for _, item := range order.Items {
			if !excludeMap[item.ProductID] {
				productCounts[item.ProductID] += item.Quantity
			}
		}
	}

	// Sort by count
	type productCount struct {
		id    primitive.ObjectID
		count int
	}
	counts := make([]productCount, 0, len(productCounts))
	for pid, cnt := range productCounts {
		counts = append(counts, productCount{id: pid, count: cnt})
	}

	// Simple sort
	for i := 0; i < len(counts)-1; i++ {
		for j := i + 1; j < len(counts); j++ {
			if counts[i].count < counts[j].count {
				counts[i], counts[j] = counts[j], counts[i]
			}
		}
	}

	// Get top product IDs
	productIDs := make([]primitive.ObjectID, 0, limit)
	for i := 0; i < len(counts) && i < limit; i++ {
		productIDs = append(productIDs, counts[i].id)
	}

	if len(productIDs) == 0 {
		// Fallback to top-rated products
		filter := bson.M{"available": true}
		if len(excludeIDs) > 0 {
			filter["_id"] = bson.M{"$nin": excludeIDs}
		}
		opts := options.Find().SetSort(bson.D{{Key: "rating_count", Value: -1}}).SetLimit(int64(limit))
		products, _ := h.productRepo.FindAll(ctx, filter, opts)
		return products
	}

	products, err := h.productRepo.FindByIDs(ctx, productIDs)
	if err != nil {
		return []*models.Product{}
	}

	return products
}

// Helper function to remove duplicate products
func (h *RecommendationHandler) removeDuplicateProducts(products []*models.Product) []*models.Product {
	seen := make(map[primitive.ObjectID]bool)
	result := make([]*models.Product, 0, len(products))
	for _, p := range products {
		if !seen[p.ID] {
			seen[p.ID] = true
			result = append(result, p)
		}
	}
	return result
}

func (h *RecommendationHandler) GetCartBasedRecommendations(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	cart, err := h.cartRepo.FindByUserID(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get cart: "+err.Error())
		return
	}
	productIDs := make([]primitive.ObjectID, 0, len(cart.Items))
	for _, it := range cart.Items {
		productIDs = append(productIDs, it.ProductID)
	}
	limit := 10
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			limit = v
		}
	}
	ids, err := h.recommendationRepo.GetCartRecommendations(r.Context(), productIDs, limit)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get cart recommendations: "+err.Error())
		return
	}
	products, err := h.productRepo.FindByIDs(r.Context(), ids)
	if err != nil {
		respondJSON(w, http.StatusOK, ids)
		return
	}
	respondJSON(w, http.StatusOK, products)
}

// GetMostFrequentByUser returns the most frequently ordered product by the user (considering quantity)
func (h *RecommendationHandler) GetMostFrequentByUser(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	limit := 1
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			limit = v
		}
	}

	// Try Neo4j first
	ids, err := h.recommendationRepo.GetMostFrequentByUser(r.Context(), userID, limit)
	if err == nil && len(ids) > 0 {
		products, err := h.productRepo.FindByIDs(r.Context(), ids)
		if err == nil && len(products) > 0 {
			respondJSON(w, http.StatusOK, products)
			return
		}
	}

	// Fallback to MongoDB order stats
	stats, err := h.orderRepo.GetUserOrderStats(r.Context(), userID)
	if err == nil && len(stats) > 0 {
		// Find most frequently ordered product
		var topProdID primitive.ObjectID
		maxCount := -1
		for pid, cnt := range stats {
			if cnt > maxCount {
				maxCount = cnt
				topProdID = pid
			}
		}

		if maxCount > 0 {
			product, err := h.productRepo.FindByID(r.Context(), topProdID)
			if err == nil {
				respondJSON(w, http.StatusOK, []*models.Product{product})
				return
			}
		}
	}

	// Final fallback: empty array
	respondJSON(w, http.StatusOK, []models.Product{})
}

// GetMostFrequentGlobal returns the most frequently ordered product across all users
func (h *RecommendationHandler) GetMostFrequentGlobal(w http.ResponseWriter, r *http.Request) {
	limit := 1
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			limit = v
		}
	}

	// Try Neo4j first
	ids, err := h.recommendationRepo.GetMostFrequentGlobal(r.Context(), limit)
	if err == nil && len(ids) > 0 {
		products, err := h.productRepo.FindByIDs(r.Context(), ids)
		if err == nil && len(products) > 0 {
			respondJSON(w, http.StatusOK, products)
			return
		}
	}

	// Fallback to MongoDB: get global most ordered products
	globalProducts := h.getGlobalMostOrderedProducts(r.Context(), []primitive.ObjectID{}, limit)
	if len(globalProducts) > 0 {
		respondJSON(w, http.StatusOK, globalProducts)
		return
	}

	// Final fallback: top-rated products
	filter := bson.M{"available": true}
	opts := options.Find().SetSort(bson.D{{Key: "rating_count", Value: -1}}).SetLimit(int64(limit))
	topRated, err := h.productRepo.FindAll(r.Context(), filter, opts)
	if err == nil && len(topRated) > 0 {
		respondJSON(w, http.StatusOK, topRated)
		return
	}

	respondJSON(w, http.StatusOK, []models.Product{})
}

// GetReviewBasedRecommendations returns products the user has rated 5 stars
func (h *RecommendationHandler) GetReviewBasedRecommendations(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	limit := 1
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			limit = v
		}
	}

	// Try Neo4j first
	ids, err := h.recommendationRepo.GetReviewBasedRecommendations(r.Context(), userID, limit)
	if err == nil && len(ids) > 0 {
		products, err := h.productRepo.FindByIDs(r.Context(), ids)
		if err == nil && len(products) > 0 {
			respondJSON(w, http.StatusOK, products)
			return
		}
	}

	// Fallback: get user's comments with 5-star ratings from MongoDB
	comments, err := h.commentRepo.FindByUserID(r.Context(), userID)
	if err == nil {
		var fiveStarProductIDs []primitive.ObjectID
		for _, comment := range comments {
			if comment.Rating >= 5.0 {
				fiveStarProductIDs = append(fiveStarProductIDs, comment.ProductID)
				if len(fiveStarProductIDs) >= limit {
					break
				}
			}
		}

		if len(fiveStarProductIDs) > 0 {
			products, err := h.productRepo.FindByIDs(r.Context(), fiveStarProductIDs)
			if err == nil && len(products) > 0 {
				respondJSON(w, http.StatusOK, products)
				return
			}
		}
	}

	// Final fallback: empty array
	respondJSON(w, http.StatusOK, []models.Product{})
}
