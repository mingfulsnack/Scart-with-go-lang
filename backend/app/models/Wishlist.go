package models

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// WishlistItem struct tương đương với wishlistItemSchema trong JS
type WishlistItem struct {
	ProductID    string    `bson:"product_id" json:"product_id"`
	ProductName  string    `bson:"product_name" json:"product_name"`
	ProductImage string    `bson:"product_image" json:"product_image"`
	ProductSlug  string    `bson:"product_slug" json:"product_slug"`
	Price        float64   `bson:"price" json:"price"`
	AddedAt      time.Time `bson:"added_at,omitempty" json:"added_at,omitempty"`
}

// Wishlist struct tương đương với wishlistSchema trong JS
type Wishlist struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	UserID     primitive.ObjectID `bson:"user_id" json:"user_id"` // Reference to User
	Items      []WishlistItem     `bson:"items" json:"items"`
	TotalItems int                `bson:"total_items" json:"total_items"`
	CreatedAt  time.Time          `bson:"created_at,omitempty" json:"created_at,omitempty"`
	UpdatedAt  time.Time          `bson:"updated_at,omitempty" json:"updated_at,omitempty"`
}

// EnsureWishlistCollection khởi tạo collection và index
func EnsureWishlistCollection(ctx context.Context, db *mongo.Database) (*mongo.Collection, error) {
	coll := db.Collection("Wishlists")

	// Tạo index unique cho user_id (mỗi user chỉ có 1 wishlist)
	idxModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "user_id", Value: 1}},
		Options: options.Index().SetUnique(true),
	}

	if _, err := coll.Indexes().CreateOne(ctx, idxModel); err != nil {
		// Ignore index conflicts, collections might already exist
		return coll, nil
	}
	return coll, nil
}
