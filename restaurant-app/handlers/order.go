package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"time"

	"restaurant-app/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type OrderHandler struct {
	userRepo           *models.UserRepository
	orderRepo          *models.OrderRepository
	cartRepo           *models.CartRepository
	productRepo        *models.ProductRepository
	recommendationRepo *models.RecommendationRepository
}

// Note: constructor now requires userRepo as first argument
func NewOrderHandler(u *models.UserRepository, o *models.OrderRepository, c *models.CartRepository, p *models.ProductRepository, r *models.RecommendationRepository) *OrderHandler {
	return &OrderHandler{
		userRepo:           u,
		orderRepo:          o,
		cartRepo:           c,
		productRepo:        p,
		recommendationRepo: r,
	}
}

type createOrderRequest struct {
	DeliveryAddress models.Address `json:"delivery_address"`
}

func (h *OrderHandler) CreateOrder(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	// get user's cart
	cart, err := h.cartRepo.FindByUserID(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to fetch cart: "+err.Error())
		return
	}
	if len(cart.Items) == 0 {
		respondError(w, http.StatusBadRequest, "cart is empty")
		return
	}

	// Try to decode delivery_address from body. Allow empty body (io.EOF).
	var req createOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && err != io.EOF {
		respondError(w, http.StatusBadRequest, "invalid request")
		return
	}

	// If client didn't provide a delivery address (zero value), try to use user's saved address
	zeroAddr := models.Address{}
	if req.DeliveryAddress == zeroAddr {
		user, uerr := h.userRepo.FindByID(r.Context(), userID)
		if uerr == nil {
			// if user has a non-empty address, use it
			if user.Address != zeroAddr {
				req.DeliveryAddress = user.Address
			}
		}
	}

	// If still empty, return error (we require a delivery address)
	if req.DeliveryAddress == zeroAddr {
		respondError(w, http.StatusBadRequest, "delivery address required (either in profile or request body)")
		return
	}

	order := &models.Order{
		UserID:          userID,
		Items:           []models.OrderItem{},
		Total:           cart.Total,
		Status:          models.OrderPending,
		DeliveryAddress: req.DeliveryAddress,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	// build order items
	productIDs := make([]primitive.ObjectID, 0, len(cart.Items))
	for _, it := range cart.Items {
		p, err := h.productRepo.FindByID(r.Context(), it.ProductID)
		if err == nil {
			order.Items = append(order.Items, models.OrderItem{
				ProductID:   it.ProductID,
				ProductName: p.Name,
				Quantity:    it.Quantity,
				Price:       it.Price,
			})
			productIDs = append(productIDs, it.ProductID)
		}
	}

	// create order in DB
	if err := h.orderRepo.Create(r.Context(), order); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to create order: "+err.Error())
		return
	}

	// Update recommendation graph: add purchase relations and co-occurrence
	if h.recommendationRepo != nil {
		// Create a map of product ID to quantity for efficient lookup
		productQuantityMap := make(map[primitive.ObjectID]int)
		for _, item := range cart.Items {
			productQuantityMap[item.ProductID] = item.Quantity
		}
		
		// Add purchases with quantities
		for _, pid := range productIDs {
			quantity := productQuantityMap[pid]
			if quantity > 0 {
				_ = h.recommendationRepo.AddPurchase(r.Context(), userID, pid, quantity)
			}
		}
		_ = h.recommendationRepo.AddCoOccurrences(r.Context(), productIDs)
	}

	// clear cart
	_ = h.cartRepo.ClearCart(r.Context(), userID)

	respondJSON(w, http.StatusCreated, order)
}

func (h *OrderHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
	oid, err := parseIDFromVars(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid order id")
		return
	}

	order, err := h.orderRepo.FindByID(r.Context(), oid)
	if err != nil {
		respondError(w, http.StatusNotFound, "order not found")
		return
	}
	respondJSON(w, http.StatusOK, order)
}
