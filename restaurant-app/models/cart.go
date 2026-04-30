package models

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type CartItem struct {
	ProductID primitive.ObjectID `bson:"product_id" json:"product_id"`
	Quantity  int                `bson:"quantity" json:"quantity"`
	Price     float64            `bson:"price" json:"price"`
}

type Cart struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`
	Items     []CartItem         `bson:"items" json:"items"`
	Total     float64            `bson:"total" json:"total"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}

type CartRepository struct {
	collection *mongo.Collection
}

func NewCartRepository(db *mongo.Database) *CartRepository {
	return &CartRepository{
		collection: db.Collection("carts"),
	}
}

func (r *CartRepository) FindByUserID(ctx context.Context, userID primitive.ObjectID) (*Cart, error) {
	var cart Cart
	err := r.collection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&cart)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			// Create new cart if doesn't exist
			cart = Cart{
				UserID:    userID,
				Items:     []CartItem{},
				Total:     0,
				UpdatedAt: time.Now(),
			}
			result, err := r.collection.InsertOne(ctx, cart)
			if err != nil {
				return nil, err
			}
			cart.ID = result.InsertedID.(primitive.ObjectID)
			return &cart, nil
		}
		return nil, err
	}
	return &cart, nil
}

func (r *CartRepository) AddItem(ctx context.Context, userID, productID primitive.ObjectID, quantity int, price float64) error {
	cart, err := r.FindByUserID(ctx, userID)
	if err != nil {
		return err
	}

	// Check if item already exists
	itemExists := false
	for i, item := range cart.Items {
		if item.ProductID == productID {
			cart.Items[i].Quantity += quantity
			itemExists = true
			break
		}
	}

	if !itemExists {
		cart.Items = append(cart.Items, CartItem{
			ProductID: productID,
			Quantity:  quantity,
			Price:     price,
		})
	}

	return r.UpdateCart(ctx, cart)
}

func (r *CartRepository) UpdateItem(ctx context.Context, userID, productID primitive.ObjectID, quantity int) error {
	cart, err := r.FindByUserID(ctx, userID)
	if err != nil {
		return err
	}

	itemFound := false
	for i, item := range cart.Items {
		if item.ProductID == productID {
			if quantity <= 0 {
				// Remove item if quantity is 0 or less
				cart.Items = append(cart.Items[:i], cart.Items[i+1:]...)
			} else {
				cart.Items[i].Quantity = quantity
			}
			itemFound = true
			break
		}
	}

	if !itemFound {
		return errors.New("item not found in cart")
	}

	return r.UpdateCart(ctx, cart)
}

func (r *CartRepository) RemoveItem(ctx context.Context, userID, productID primitive.ObjectID) error {
	cart, err := r.FindByUserID(ctx, userID)
	if err != nil {
		return err
	}

	for i, item := range cart.Items {
		if item.ProductID == productID {
			cart.Items = append(cart.Items[:i], cart.Items[i+1:]...)
			break
		}
	}

	return r.UpdateCart(ctx, cart)
}

func (r *CartRepository) ClearCart(ctx context.Context, userID primitive.ObjectID) error {
	cart, err := r.FindByUserID(ctx, userID)
	if err != nil {
		return err
	}

	cart.Items = []CartItem{}
	cart.Total = 0
	return r.UpdateCart(ctx, cart)
}

func (r *CartRepository) UpdateCart(ctx context.Context, cart *Cart) error {
	// Recalculate total
	total := 0.0
	for _, item := range cart.Items {
		total += item.Price * float64(item.Quantity)
	}
	cart.Total = total
	cart.UpdatedAt = time.Now()

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"user_id": cart.UserID},
		bson.M{"$set": cart},
	)
	return err
}
