package handlers

import (
	"encoding/json"
	"log" // Add this import
	"net/http"

	"restaurant-app/models"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FavoriteHandler struct {
	favRepo     *models.FavoriteRepository
	productRepo *models.ProductRepository
}

func NewFavoriteHandler(f *models.FavoriteRepository, p *models.ProductRepository) *FavoriteHandler {
	return &FavoriteHandler{
		favRepo:     f,
		productRepo: p,
	}
}

type favReq struct {
	ProductID string `json:"product_id"`
}

func (h *FavoriteHandler) AddFavorite(w http.ResponseWriter, r *http.Request) {
	log.Println("=== AddFavorite handler called ===")
	log.Printf("Method: %s, URL: %s", r.Method, r.URL.Path)

	userID, ok := getUserIDFromContext(r)
	if !ok {
		log.Println("Failed to get user ID from context")
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	log.Printf("User ID: %s", userID.Hex())

	var req favReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Failed to decode body: %v", err)
		respondError(w, http.StatusBadRequest, "invalid body")
		return
	}
	log.Printf("Product ID from request: %s", req.ProductID)

	pid, err := primitive.ObjectIDFromHex(req.ProductID)
	if err != nil {
		log.Printf("Invalid product ID hex: %v", err)
		respondError(w, http.StatusBadRequest, "invalid product id")
		return
	}

	if err := h.favRepo.Add(r.Context(), userID, pid); err != nil {
		log.Printf("Failed to add favorite: %v", err)
		respondError(w, http.StatusInternalServerError, "failed to add favorite: "+err.Error())
		return
	}

	log.Println("Favorite added successfully")
	respondJSON(w, http.StatusOK, map[string]string{"status": "added"})
}

func (h *FavoriteHandler) RemoveFavorite(w http.ResponseWriter, r *http.Request) {
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
	if err := h.favRepo.Remove(r.Context(), userID, pid); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to remove favorite: "+err.Error())
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "removed"})
}
