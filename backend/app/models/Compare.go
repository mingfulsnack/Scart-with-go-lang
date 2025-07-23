package models

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CompareItem struct tương đương với compareItemSchema trong JS
type CompareItem struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	ProductID    string             `bson:"product_id" json:"product_id"`
	ProductName  string             `bson:"product_name" json:"product_name"`
	ProductImage string             `bson:"product_image" json:"product_image"`
	ProductSlug  string             `bson:"product_slug" json:"product_slug"`
	Price        float64            `bson:"price" json:"price"` // Changed to float64 for monetary values
	AddedAt      time.Time          `bson:"added_at" json:"added_at"`
}

// Compare struct tương đương với compareSchema trong JS
type Compare struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID     primitive.ObjectID `bson:"user_id" json:"user_id"` // Unique - mỗi user chỉ có 1 compare list
	Items      []CompareItem      `bson:"items" json:"items"`     // Tối đa 3 items
	TotalItems int                `bson:"total_items" json:"total_items"`
	CreatedAt  time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt  time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// ValidateCompareItems validates that compare list has max 3 items (tương tự middleware trong JS)
func (c *Compare) ValidateCompareItems() error {
	if len(c.Items) > 3 {
		return fmt.Errorf("chỉ được so sánh tối đa 3 sản phẩm")
	}
	return nil
}

// EnsureCompareCollection khởi tạo collection và index
func EnsureCompareCollection(ctx context.Context, db *mongo.Database) (*mongo.Collection, error) {
	coll := db.Collection("Compares")

	// Tạo index unique cho user_id (mỗi user chỉ có 1 compare list)
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
