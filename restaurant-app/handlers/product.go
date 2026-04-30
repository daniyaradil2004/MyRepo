package handlers

import (
	"net/http"
	"strconv"

	"restaurant-app/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ProductHandler struct {
	productRepo *models.ProductRepository
	commentRepo *models.CommentRepository
}

func NewProductHandler(p *models.ProductRepository, c *models.CommentRepository) *ProductHandler {
	return &ProductHandler{productRepo: p, commentRepo: c}
}

func (h *ProductHandler) GetProducts(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	pageStr := q.Get("page")
	limitStr := q.Get("limit")
	category := q.Get("category")

	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 50
	}

	skip := int64((page - 1) * limit)
	limit64 := int64(limit)

	filter := bson.M{"available": true}
	if category != "" {
		filter["category"] = category
	}

	findOpts := options.Find().SetSkip(skip).SetLimit(limit64)

	products, err := h.productRepo.FindAll(r.Context(), filter, findOpts)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to fetch products: "+err.Error())
		return
	}

	respondJSON(w, http.StatusOK, products)
}

func (h *ProductHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDFromVars(r, "id")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid product id")
		return
	}
	product, err := h.productRepo.FindByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "product not found")
		return
	}
	respondJSON(w, http.StatusOK, product)
}

func (h *ProductHandler) SearchProducts(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	query := q.Get("query")
	category := q.Get("category")

	products, err := h.productRepo.Search(r.Context(), query, category)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "search failed: "+err.Error())
		return
	}
	respondJSON(w, http.StatusOK, products)
}
