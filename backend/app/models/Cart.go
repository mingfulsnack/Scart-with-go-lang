package models

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CartItem struct tương đương với cartItemSchema trong JS
type CartItem struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	ProductID    string             `bson:"product_id" json:"product_id"`
	ProductName  string             `bson:"product_name" json:"product_name"`
	ProductImage string             `bson:"product_image" json:"product_image"`
	ProductSlug  string             `bson:"product_slug" json:"product_slug"`
	Price        float64            `bson:"price" json:"price"` // Changed to float64 for monetary values
	Quantity     int                `bson:"quantity" json:"quantity"`
	Total        float64            `bson:"total" json:"total"` // Changed to float64 for monetary values
}

// Cart struct tương đương với cartSchema trong JS
type Cart struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID      primitive.ObjectID `bson:"user_id" json:"user_id"`
	CartType    string             `bson:"cart_type" json:"cart_type"` // "cart", "wishlist", "compare"
	Items       []CartItem         `bson:"items" json:"items"`
	TotalItems  int                `bson:"total_items" json:"total_items"`
	TotalAmount float64            `bson:"total_amount" json:"total_amount"` // Changed to float64 for monetary values
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
}

func EnsureCartCollection(ctx context.Context, db *mongo.Database) (*mongo.Collection, error) {
	coll := db.Collection("Carts") // Tạo index { user_id: 1, cart_type: 1 }
	idxModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "user_id", Value: 1},
			{Key: "cart_type", Value: 1},
		},
		Options: options.Index(),
	}
	if _, err := coll.Indexes().CreateOne(ctx, idxModel); err != nil {
		// Ignore index conflicts, collections might already exist
		return coll, nil
	}
	return coll, nil

}
