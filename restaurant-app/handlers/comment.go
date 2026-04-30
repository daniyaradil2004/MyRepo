package handlers

import (
	"encoding/json"
	"net/http"

	"restaurant-app/models"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CommentHandler struct {
	commentRepo       *models.CommentRepository
	productRepo       *models.ProductRepository
	userRepo          *models.UserRepository
	recommendationRepo *models.RecommendationRepository
}

func NewCommentHandler(c *models.CommentRepository, p *models.ProductRepository, u *models.UserRepository, rec *models.RecommendationRepository) *CommentHandler {
	return &CommentHandler{
		commentRepo:       c,
		productRepo:       p,
		userRepo:          u,
		recommendationRepo: rec,
	}
}

type addCommentReq struct {
	ProductID string  `json:"product_id"`
	Text      string  `json:"text"`
	Rating    float64 `json:"rating"`
}

func (h *CommentHandler) AddComment(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req addCommentReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid body")
		return
	}
	pid, err := primitive.ObjectIDFromHex(req.ProductID)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid product id")
		return
	}
	comment := &models.Comment{
		UserID:    userID,
		ProductID: pid,
		Text:      req.Text,
		Rating:    req.Rating,
	}
	if err := h.commentRepo.Add(r.Context(), comment); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to add comment: "+err.Error())
		return
	}

	// update product rating
	if req.Rating > 0 {
		_ = h.productRepo.UpdateRating(r.Context(), pid, req.Rating)
	}

	// Add review to Neo4j if rating is 5 stars
	if req.Rating >= 5.0 {
		_ = h.recommendationRepo.AddReview(r.Context(), userID, pid, req.Rating)
	}

	respondJSON(w, http.StatusCreated, comment)
}

func (h *CommentHandler) UpdateComment(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	vars := mux.Vars(r)
	idStr := vars["id"]
	cid, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid comment id")
		return
	}

	comment, err := h.commentRepo.FindByID(r.Context(), cid)
	if err != nil {
		respondError(w, http.StatusNotFound, "comment not found")
		return
	}
	if comment.UserID != userID {
		respondError(w, http.StatusForbidden, "not allowed")
		return
	}

	var req struct {
		Text   *string  `json:"text"`
		Rating *float64 `json:"rating"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid body")
		return
	}

	update := map[string]interface{}{}
	if req.Text != nil {
		update["text"] = *req.Text
	}
	if req.Rating != nil {
		update["rating"] = *req.Rating
		// update product rating as well
		_ = h.productRepo.UpdateRating(r.Context(), comment.ProductID, *req.Rating)
		
		// Update review in Neo4j
		if *req.Rating >= 5.0 {
			_ = h.recommendationRepo.AddReview(r.Context(), userID, comment.ProductID, *req.Rating)
		} else {
			// Remove review if rating drops below 5
			_ = h.recommendationRepo.RemoveReview(r.Context(), userID, comment.ProductID)
		}
	}

	if len(update) == 0 {
		respondError(w, http.StatusBadRequest, "nothing to update")
		return
	}

	if err := h.commentRepo.Update(r.Context(), cid, update); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to update comment: "+err.Error())
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *CommentHandler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	vars := mux.Vars(r)
	idStr := vars["id"]
	cid, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid comment id")
		return
	}
	comment, err := h.commentRepo.FindByID(r.Context(), cid)
	if err != nil {
		respondError(w, http.StatusNotFound, "comment not found")
		return
	}
	if comment.UserID != userID {
		respondError(w, http.StatusForbidden, "not allowed")
		return
	}
	
	// Remove review from Neo4j if it was a 5-star review
	if comment.Rating >= 5.0 {
		_ = h.recommendationRepo.RemoveReview(r.Context(), userID, comment.ProductID)
	}
	
	if err := h.commentRepo.Delete(r.Context(), cid); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to delete comment: "+err.Error())
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *CommentHandler) GetProductComments(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	productIdStr := vars["productId"]
	pid, err := primitive.ObjectIDFromHex(productIdStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid product id")
		return
	}
	comments, err := h.commentRepo.FindByProductID(r.Context(), pid)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to fetch comments: "+err.Error())
		return
	}

	// Enrich comments with user names
	type CommentWithUserName struct {
		*models.Comment
		UserName string `json:"user_name"`
	}
	commentsWithNames := make([]CommentWithUserName, 0, len(comments))
	for _, comment := range comments {
		user, err := h.userRepo.FindByID(r.Context(), comment.UserID)
		userName := "Anonymous User"
		if err == nil && user != nil {
			userName = user.Name
		}
		commentsWithNames = append(commentsWithNames, CommentWithUserName{
			Comment:  comment,
			UserName: userName,
		})
	}

	respondJSON(w, http.StatusOK, commentsWithNames)
}
