package models

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type Favorite struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`
	ProductID primitive.ObjectID `bson:"product_id" json:"product_id"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
}

type FavoriteRepository struct {
	collection *mongo.Collection
}

func NewFavoriteRepository(db *mongo.Database) *FavoriteRepository {
	return &FavoriteRepository{
		collection: db.Collection("favorites"),
	}
}

func (r *FavoriteRepository) Add(ctx context.Context, userID, productID primitive.ObjectID) error {
	// Check if already exists
	count, err := r.collection.CountDocuments(ctx, bson.M{
		"user_id":    userID,
		"product_id": productID,
	})
	if err != nil {
		return err
	}

	if count > 0 {
		return nil // Already in favorites
	}

	favorite := Favorite{
		UserID:    userID,
		ProductID: productID,
		CreatedAt: time.Now(),
	}

	_, err = r.collection.InsertOne(ctx, favorite)
	return err
}

func (r *FavoriteRepository) Remove(ctx context.Context, userID, productID primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{
		"user_id":    userID,
		"product_id": productID,
	})
	return err
}

func (r *FavoriteRepository) FindByUserID(ctx context.Context, userID primitive.ObjectID) ([]primitive.ObjectID, error) {
	cursor, err := r.collection.Find(ctx, bson.M{"user_id": userID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var favorites []Favorite
	if err := cursor.All(ctx, &favorites); err != nil {
		return nil, err
	}

	productIDs := make([]primitive.ObjectID, len(favorites))
	for i, fav := range favorites {
		productIDs[i] = fav.ProductID
	}

	return productIDs, nil
}

func (r *FavoriteRepository) IsFavorite(ctx context.Context, userID, productID primitive.ObjectID) (bool, error) {
	count, err := r.collection.CountDocuments(ctx, bson.M{
		"user_id":    userID,
		"product_id": productID,
	})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
