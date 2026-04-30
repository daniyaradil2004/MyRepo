package models

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Product struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"name" json:"name"`
	Description string             `bson:"description" json:"description"`
	Price       float64            `bson:"price" json:"price"`
	Category    string             `bson:"category" json:"category"`
	Image       string             `bson:"image" json:"image"`
	Available   bool               `bson:"available" json:"available"`
	Rating      float64            `bson:"rating" json:"rating"`
	RatingCount int                `bson:"rating_count" json:"rating_count"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
}

type ProductRepository struct {
	collection *mongo.Collection
}

func NewProductRepository(db *mongo.Database) *ProductRepository {
	return &ProductRepository{
		collection: db.Collection("products"),
	}
}

func (r *ProductRepository) Create(ctx context.Context, product *Product) error {
	product.CreatedAt = time.Now()
	product.UpdatedAt = time.Now()
	product.Available = true
	product.Rating = 0
	product.RatingCount = 0

	result, err := r.collection.InsertOne(ctx, product)
	if err != nil {
		return err
	}

	product.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *ProductRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*Product, error) {
	var product Product
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&product)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("product not found")
		}
		return nil, err
	}
	return &product, nil
}

func (r *ProductRepository) FindAll(ctx context.Context, filter bson.M, opts ...*options.FindOptions) ([]*Product, error) {
	cursor, err := r.collection.Find(ctx, filter, opts...)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var products []*Product
	if err := cursor.All(ctx, &products); err != nil {
		return nil, err
	}

	return products, nil
}

func (r *ProductRepository) Search(ctx context.Context, query string, category string) ([]*Product, error) {
	filter := bson.M{"available": true}

	if query != "" {
		filter["$or"] = []bson.M{
			{"name": bson.M{"$regex": query, "$options": "i"}},
			{"description": bson.M{"$regex": query, "$options": "i"}},
		}
	}

	if category != "" {
		filter["category"] = category
	}

	return r.FindAll(ctx, filter)
}

func (r *ProductRepository) Update(ctx context.Context, id primitive.ObjectID, update bson.M) error {
	update["updated_at"] = time.Now()
	_, err := r.collection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": update})
	return err
}

func (r *ProductRepository) UpdateRating(ctx context.Context, id primitive.ObjectID, newRating float64) error {
	// Get current product
	product, err := r.FindByID(ctx, id)
	if err != nil {
		return err
	}

	// Calculate new average rating
	totalRating := product.Rating * float64(product.RatingCount)
	newCount := product.RatingCount + 1
	newAverage := (totalRating + newRating) / float64(newCount)

	update := bson.M{
		"rating":       newAverage,
		"rating_count": newCount,
		"updated_at":   time.Now(),
	}

	return r.Update(ctx, id, update)
}

func (r *ProductRepository) FindByIDs(ctx context.Context, ids []primitive.ObjectID) ([]*Product, error) {
	filter := bson.M{"_id": bson.M{"$in": ids}}
	return r.FindAll(ctx, filter)
}
