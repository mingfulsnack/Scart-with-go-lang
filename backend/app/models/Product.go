package models

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Product struct tương đương với productSchema trong JS
type Product struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	ProductID   string             `bson:"id" json:"id"` // tương ứng với field `id` trong mongoose (ví dụ: "P001")
	Name        string             `bson:"name" json:"name"`
	Price       float64            `bson:"price" json:"price"`
	Image       string             `bson:"image" json:"image"`
	Slug        string             `bson:"slug" json:"slug"`
	Amount      int                `bson:"amount" json:"amount"`
	Category    string             `bson:"category,omitempty" json:"category,omitempty"` // tương ứng với Category.id
	IsFeatured  bool               `bson:"is_featured" json:"is_featured"`
	Description string             `bson:"description,omitempty" json:"description,omitempty"`
	Stock       int                `bson:"stock" json:"stock"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
}


// EnsureProductCollection khởi tạo collection và index
func EnsureProductCollection(ctx context.Context, db *mongo.Database) (*mongo.Collection, error) {
	coll := db.Collection("Products")

	// Tạo indexes để tăng performance
	idxModels := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "category", Value: 1}},
			Options: options.Index(),
		},
		{
			Keys:    bson.D{{Key: "slug", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys:    bson.D{{Key: "id", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
	}

	if _, err := coll.Indexes().CreateMany(ctx, idxModels); err != nil {
		// Ignore index conflicts, collections might already exist
		return coll, nil
	}
	return coll, nil
}
