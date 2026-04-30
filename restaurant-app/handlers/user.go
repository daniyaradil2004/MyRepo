package handlers

import (
	"encoding/json"
	"net/http"
	"net/mail"
	"regexp"
	"strings"
	//"restaurant-app/middleware"
	"go.mongodb.org/mongo-driver/bson"
	//"go.mongodb.org/mongo-driver/bson/primitive"
	"restaurant-app/models"
)

type UserHandler struct {
	userRepo     *models.UserRepository
	orderRepo    *models.OrderRepository
	favoriteRepo *models.FavoriteRepository
	commentRepo  *models.CommentRepository
	productRepo  *models.ProductRepository
}

func NewUserHandler(u *models.UserRepository, o *models.OrderRepository, f *models.FavoriteRepository, c *models.CommentRepository, p *models.ProductRepository) *UserHandler {
	return &UserHandler{
		userRepo:     u,
		orderRepo:    o,
		favoriteRepo: f,
		commentRepo:  c,
		productRepo:  p,
	}
}

func (h *UserHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	user, err := h.userRepo.FindByID(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	user.Password = ""
	respondJSON(w, http.StatusOK, user)
}

func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	// decode body into a generic map so partial updates are possible
	var body map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// nothing to update
	if len(body) == 0 {
		respondError(w, http.StatusBadRequest, "nothing to update")
		return
	}

	// don't allow updating password here
	if _, exists := body["password"]; exists {
		delete(body, "password")
	}

	update := bson.M{}

	// Handle email: validate and check uniqueness
	if rawEmail, exists := body["email"]; exists {
		emailStr, _ := rawEmail.(string)
		emailStr = strings.TrimSpace(emailStr)
		if emailStr == "" {
			respondError(w, http.StatusBadRequest, "email cannot be empty")
			return
		}
		// validate format
		if _, err := mail.ParseAddress(emailStr); err != nil {
			respondError(w, http.StatusBadRequest, "invalid email format")
			return
		}
		// check uniqueness (only if changed)
		currentUser, err := h.userRepo.FindByID(r.Context(), userID)
		if err == nil && !strings.EqualFold(currentUser.Email, emailStr) {
			if other, err := h.userRepo.FindByEmail(r.Context(), emailStr); err == nil && other != nil {
				respondError(w, http.StatusBadRequest, "email already in use")
				return
			}
		}
		update["email"] = emailStr
	}

	// Handle phone: validate format and check uniqueness
	if rawPhone, exists := body["phone"]; exists {
		if phoneStr, ok := rawPhone.(string); ok {
			phoneStr = strings.TrimSpace(phoneStr)
			if phoneStr != "" {
				// Phone must be 11 digits and start with 8
				phoneRegex := regexp.MustCompile(`^8\d{10}$`)
				if !phoneRegex.MatchString(phoneStr) {
					respondError(w, http.StatusBadRequest, "phone number must be 11 digits and start with 8")
					return
				}

				// Check phone uniqueness (only if changed)
				currentUser, err := h.userRepo.FindByID(r.Context(), userID)
				if err == nil && currentUser.Phone != phoneStr {
					if other, err := h.userRepo.FindByPhone(r.Context(), phoneStr); err == nil && other != nil {
						respondError(w, http.StatusBadRequest, "phone number already in use")
						return
					}
				}
				update["phone"] = phoneStr
			} else {
				// if user explicitly sent empty string, we allow clearing the phone
				update["phone"] = ""
			}
		}
	}

	// Handle name
	if rawName, exists := body["name"]; exists {
		if nameStr, ok := rawName.(string); ok {
			nameStr = strings.TrimSpace(nameStr)
			if nameStr != "" {
				update["name"] = nameStr
			}
		}
	}

	// Handle nested address object (partial updates supported)
	if rawAddr, exists := body["address"]; exists {
		if addrMap, ok := rawAddr.(map[string]interface{}); ok {
			addrUpdate := bson.M{}
			// allowed address fields
			if v, ok := addrMap["street"].(string); ok {
				addrUpdate["street"] = strings.TrimSpace(v)
			}
			if v, ok := addrMap["city"].(string); ok {
				addrUpdate["city"] = strings.TrimSpace(v)
			}
			if v, ok := addrMap["state"].(string); ok {
				addrUpdate["state"] = strings.TrimSpace(v)
			}
			// support both zip_code and zipCode keys from different clients
			if v, ok := addrMap["zip_code"].(string); ok {
				addrUpdate["zip_code"] = strings.TrimSpace(v)
			} else if v, ok := addrMap["zipCode"].(string); ok {
				addrUpdate["zip_code"] = strings.TrimSpace(v)
			}
			if v, ok := addrMap["country"].(string); ok {
				addrUpdate["country"] = strings.TrimSpace(v)
			}

			// only set address if at least one subfield provided
			if len(addrUpdate) > 0 {
				update["address"] = addrUpdate
			}
		} else {
			respondError(w, http.StatusBadRequest, "address must be an object")
			return
		}
	}

	// If nothing valid to update
	if len(update) == 0 {
		respondError(w, http.StatusBadRequest, "no valid fields to update")
		return
	}

	// perform update
	if err := h.userRepo.Update(r.Context(), userID, update); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to update profile: "+err.Error())
		return
	}

	// return updated user
	updatedUser, err := h.userRepo.FindByID(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "profile updated but failed to fetch updated user")
		return
	}
	updatedUser.Password = ""
	respondJSON(w, http.StatusOK, updatedUser)
}

func (h *UserHandler) GetOrderHistory(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	orders, err := h.orderRepo.FindByUserID(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to fetch orders: "+err.Error())
		return
	}
	respondJSON(w, http.StatusOK, orders)
}

func (h *UserHandler) GetFavorites(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	productIDs, err := h.favoriteRepo.FindByUserID(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to fetch favorites: "+err.Error())
		return
	}
	// fetch product documents
	products, err := h.productRepo.FindByIDs(r.Context(), productIDs)
	if err != nil {
		// fallback: return ids if product fetch fails
		respondJSON(w, http.StatusOK, productIDs)
		return
	}
	respondJSON(w, http.StatusOK, products)
}

func (h *UserHandler) GetComments(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	comments, err := h.commentRepo.FindByUserID(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to fetch comments: "+err.Error())
		return
	}
	respondJSON(w, http.StatusOK, comments)
}
