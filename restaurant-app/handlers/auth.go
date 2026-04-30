package handlers

import (
	"encoding/json"
	"net/http"
	"net/mail"
	"os"
	"regexp"
	"strings"
	"time"

	"restaurant-app/middleware"
	"restaurant-app/models"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AuthHandler struct {
	userRepo *models.UserRepository
}

func NewAuthHandler(u *models.UserRepository) *AuthHandler {
	return &AuthHandler{userRepo: u}
}

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
	Phone    string `json:"phone"`
}

type checkEmailResponse struct {
	Email     string `json:"email"`
	Available bool   `json:"available"`
}

// CheckEmailAvailability is a side-effect-free endpoint used by the frontend
// for asynchronous form validation during registration.
// GET /api/auth/check-email?email=you@example.com
func (h *AuthHandler) CheckEmailAvailability(w http.ResponseWriter, r *http.Request) {
	email := strings.TrimSpace(r.URL.Query().Get("email"))
	if email == "" {
		respondError(w, http.StatusBadRequest, "email is required")
		return
	}
	if _, err := mail.ParseAddress(email); err != nil {
		respondError(w, http.StatusBadRequest, "invalid email format")
		return
	}

	_, err := h.userRepo.FindByEmail(r.Context(), email)
	// If user exists -> not available. If not found -> available.
	available := err != nil
	respondJSON(w, http.StatusOK, checkEmailResponse{
		Email:     email,
		Available: available,
	})
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	// Basic validation
	if req.Email == "" || req.Password == "" {
		respondError(w, http.StatusBadRequest, "email and password required")
		return
	}

	// Validate email format
	req.Email = strings.TrimSpace(req.Email)
	if _, err := mail.ParseAddress(req.Email); err != nil {
		respondError(w, http.StatusBadRequest, "invalid email format")
		return
	}

	// Check email uniqueness
	if existingUser, err := h.userRepo.FindByEmail(r.Context(), req.Email); err == nil && existingUser != nil {
		respondError(w, http.StatusBadRequest, "email already in use")
		return
	}

	// Validate phone number if provided
	if req.Phone != "" {
		req.Phone = strings.TrimSpace(req.Phone)
		// Phone must be 11 digits and start with 8
		phoneRegex := regexp.MustCompile(`^8\d{10}$`)
		if !phoneRegex.MatchString(req.Phone) {
			respondError(w, http.StatusBadRequest, "phone number must be 11 digits and start with 8")
			return
		}

		// Check phone uniqueness
		if existingUser, err := h.userRepo.FindByPhone(r.Context(), req.Phone); err == nil && existingUser != nil {
			respondError(w, http.StatusBadRequest, "phone number already in use")
			return
		}
	}

	user := &models.User{
		Email:    req.Email,
		Password: req.Password,
		Name:     req.Name,
		Phone:    req.Phone,
	}

	if err := h.userRepo.Create(r.Context(), user); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to create user: "+err.Error())
		return
	}

	// Create token for automatic login after registration
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "your-secret-key-change-in-production"
	}

	claims := middleware.Claims{
		UserID: user.ID.Hex(),
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(72 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	// sanitize user before sending
	user.Password = ""

	respondJSON(w, http.StatusCreated, loginResponse{
		Token: tokenString,
		User:  user,
	})
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginResponse struct {
	Token string       `json:"token"`
	User  *models.User `json:"user,omitempty"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	user, err := h.userRepo.FindByEmail(r.Context(), req.Email)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if err := h.userRepo.VerifyPassword(user.Password, req.Password); err != nil {
		respondError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	// create token
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "your-secret-key-change-in-production"
	}

	claims := middleware.Claims{
		UserID: user.ID.Hex(),
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(72 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	// sanitize user before sending
	userCopy := *user
	userCopy.Password = ""

	respondJSON(w, http.StatusOK, loginResponse{
		Token: tokenString,
		User:  &userCopy,
	})
}

// helper: get user id from request context
func getUserIDFromContext(r *http.Request) (primitive.ObjectID, bool) {
	val := r.Context().Value(middleware.UserIDKey)
	if val == nil {
		return primitive.NilObjectID, false
	}
	uid, ok := val.(primitive.ObjectID)
	return uid, ok
}
