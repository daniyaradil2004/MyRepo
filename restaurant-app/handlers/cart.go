package handlers

import (
	"encoding/json"
	"net/http"

	"restaurant-app/models"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CartHandler struct {
	cartRepo    *models.CartRepository
	productRepo *models.ProductRepository
}

func NewCartHandler(c *models.CartRepository, p *models.ProductRepository) *CartHandler {
	return &CartHandler{
		cartRepo:    c,
		productRepo: p,
	}
}

type addItemRequest struct {
	ProductID string `json:"product_id"`
	Quantity  int    `json:"quantity"`
}

func (h *CartHandler) GetCart(w http.ResponseWriter, r *http.Request) {
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
	respondJSON(w, http.StatusOK, cart)
}

func (h *CartHandler) AddItem(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req addItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request")
		return
	}

	pid, err := primitive.ObjectIDFromHex(req.ProductID)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid product id")
		return
	}
	product, err := h.productRepo.FindByID(r.Context(), pid)
	if err != nil {
		respondError(w, http.StatusNotFound, "product not found")
		return
	}

	if req.Quantity <= 0 {
		req.Quantity = 1
	}

	if err := h.cartRepo.AddItem(r.Context(), userID, pid, req.Quantity, product.Price); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to add item: "+err.Error())
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "added"})
}

func (h *CartHandler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	vars := mux.Vars(r)
	productIdStr := vars["productId"]
	pid, err := primitive.ObjectIDFromHex(productIdStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid product id")
		return
	}
	var req struct {
		Quantity int `json:"quantity"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if err := h.cartRepo.UpdateItem(r.Context(), userID, pid, req.Quantity); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to update item: "+err.Error())
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *CartHandler) RemoveItem(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	vars := mux.Vars(r)
	productIdStr := vars["productId"]
	pid, err := primitive.ObjectIDFromHex(productIdStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid product id")
		return
	}
	if err := h.cartRepo.RemoveItem(r.Context(), userID, pid); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to remove item: "+err.Error())
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "removed"})
}

func (h *CartHandler) ClearCart(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if err := h.cartRepo.ClearCart(r.Context(), userID); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to clear cart: "+err.Error())
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "cleared"})
}
