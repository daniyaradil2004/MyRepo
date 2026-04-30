package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// respond with JSON
func respondJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

func parseIDFromVars(r *http.Request, key string) (primitive.ObjectID, error) {
	vars := mux.Vars(r)
	idStr := vars[key]
	if idStr == "" {
		return primitive.NilObjectID, primitive.ErrInvalidHex
	}
	return primitive.ObjectIDFromHex(idStr)
}
