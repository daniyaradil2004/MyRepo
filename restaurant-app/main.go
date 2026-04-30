package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"time"

	"restaurant-app/config"
	"restaurant-app/handlers"
	"restaurant-app/middleware"
	"restaurant-app/models"

	"github.com/gorilla/mux"
)

func main() {
	// Initialize configurations
	cfg := config.LoadConfig()

	// Initialize databases
	mongoClient, mongoDB := config.ConnectMongoDB(cfg.MongoURI, cfg.MongoDB)
	neo4jDB := config.ConnectNeo4j(cfg.Neo4jURI, cfg.Neo4jUser, cfg.Neo4jPassword)

	// Ensure resources are closed on exit
	// use a background context for the deferred disconnects
	defer func() {
		// disconnect mongo client
		if err := mongoClient.Disconnect(context.Background()); err != nil {
			log.Printf("Error disconnecting MongoDB client: %v", err)
		}
		// close neo4j driver (requires context)
		if err := neo4jDB.Close(context.Background()); err != nil {
			log.Printf("Error closing Neo4j driver: %v", err)
		}
	}()

	// Initialize repositories
	userRepo := models.NewUserRepository(mongoDB)
	productRepo := models.NewProductRepository(mongoDB)
	orderRepo := models.NewOrderRepository(mongoDB)
	cartRepo := models.NewCartRepository(mongoDB)
	favoriteRepo := models.NewFavoriteRepository(mongoDB)
	commentRepo := models.NewCommentRepository(mongoDB)
	recommendationRepo := models.NewRecommendationRepository(neo4jDB)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userRepo)
	productHandler := handlers.NewProductHandler(productRepo, commentRepo)
	cartHandler := handlers.NewCartHandler(cartRepo, productRepo)
	orderHandler := handlers.NewOrderHandler(userRepo, orderRepo, cartRepo, productRepo, recommendationRepo)
	favoriteHandler := handlers.NewFavoriteHandler(favoriteRepo, productRepo)
	commentHandler := handlers.NewCommentHandler(commentRepo, productRepo, userRepo, recommendationRepo)
	userHandler := handlers.NewUserHandler(userRepo, orderRepo, favoriteRepo, commentRepo, productRepo)
	recommendationHandler := handlers.NewRecommendationHandler(recommendationRepo, productRepo, cartRepo, orderRepo, commentRepo)

	// Setup router
	router := mux.NewRouter()

	// CORS middleware - MUST be applied first before any routes
	router.Use(middleware.CORSMiddleware)

	router.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			log.Printf(">>> Incoming request: %s %s", r.Method, r.URL.Path)
			next.ServeHTTP(w, r)
		})
	})
	// Public routes
	router.HandleFunc("/api/auth/register", authHandler.Register).Methods("POST", "OPTIONS")
	router.HandleFunc("/api/auth/login", authHandler.Login).Methods("POST", "OPTIONS")
	router.HandleFunc("/api/products", productHandler.GetProducts).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/products/search", productHandler.SearchProducts).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/products/{id}", productHandler.GetProduct).Methods("GET", "OPTIONS")

	// Protected routes
	api := router.PathPrefix("/api").Subrouter()
	// Apply CORS to subrouter as well
	api.Use(middleware.CORSMiddleware)
	api.Use(middleware.AuthMiddleware)

	// User routes
	api.HandleFunc("/user/profile", userHandler.GetProfile).Methods("GET")
	api.HandleFunc("/user/profile", userHandler.UpdateProfile).Methods("PUT")
	api.HandleFunc("/user/orders", userHandler.GetOrderHistory).Methods("GET")
	api.HandleFunc("/user/favorites", userHandler.GetFavorites).Methods("GET")
	api.HandleFunc("/user/comments", userHandler.GetComments).Methods("GET")

	// Cart routes
	api.HandleFunc("/cart", cartHandler.GetCart).Methods("GET")
	api.HandleFunc("/cart/items", cartHandler.AddItem).Methods("POST")
	api.HandleFunc("/cart/items/{productId}", cartHandler.UpdateItem).Methods("PUT")
	api.HandleFunc("/cart/items/{productId}", cartHandler.RemoveItem).Methods("DELETE")
	api.HandleFunc("/cart/clear", cartHandler.ClearCart).Methods("DELETE")

	// Order routes
	api.HandleFunc("/orders", orderHandler.CreateOrder).Methods("POST")
	api.HandleFunc("/orders/{id}", orderHandler.GetOrder).Methods("GET")

	// Favorite routes
	api.HandleFunc("/favorites", favoriteHandler.AddFavorite).Methods("POST")
	api.HandleFunc("/favorites/{productId}", favoriteHandler.RemoveFavorite).Methods("DELETE")

	// Comment routes
	api.HandleFunc("/comments", commentHandler.AddComment).Methods("POST")
	api.HandleFunc("/comments/{id}", commentHandler.UpdateComment).Methods("PUT")
	api.HandleFunc("/comments/{id}", commentHandler.DeleteComment).Methods("DELETE")
	api.HandleFunc("/products/{productId}/comments", commentHandler.GetProductComments).Methods("GET")

	// Recommendation routes
	api.HandleFunc("/recommendations/personalized", recommendationHandler.GetPersonalizedRecommendations).Methods("GET")
	api.HandleFunc("/recommendations/cart", recommendationHandler.GetCartBasedRecommendations).Methods("GET")
	api.HandleFunc("/recommendations/mostfrequent", recommendationHandler.GetMostFrequentByUser).Methods("GET")
	api.HandleFunc("/recommendations/trending", recommendationHandler.GetMostFrequentGlobal).Methods("GET")
	api.HandleFunc("/recommendations/reviewbased", recommendationHandler.GetReviewBasedRecommendations).Methods("GET")

	// Add this after all route setup, before srv := &http.Server
	log.Println("Registered routes:")
	router.Walk(func(route *mux.Route, router *mux.Router, ancestors []*mux.Route) error {
		pathTemplate, _ := route.GetPathTemplate()
		methods, _ := route.GetMethods()
		log.Printf("  %s %v", pathTemplate, methods)
		return nil
	})

	// Wrap router with CORS handler as final safety measure
	corsHandler := middleware.CORSMiddleware(router)

	// Start server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      corsHandler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("Server starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)
	<-c

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	srv.Shutdown(ctx)
	log.Println("Server shutting down gracefully")
}
