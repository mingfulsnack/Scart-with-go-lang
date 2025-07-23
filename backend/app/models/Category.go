// models/category.go
package models

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Category struct tương đương với categorySchema trong JS
type Category struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	CategoryID   string             `bson:"id" json:"id"` // Custom string ID như trong JS
	Name         string             `bson:"name" json:"name"`
	ProductCount int                `bson:"productCount" json:"productCount"` // Changed to int for consistency
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`       // JS style timestamps
	UpdatedAt    time.Time          `bson:"updatedAt" json:"updatedAt"`       // JS style timestamps
}

// EnsureCategoryCollection khởi tạo collection và index
func EnsureCategoryCollection(ctx context.Context, db *mongo.Database) (*mongo.Collection, error) {
	coll := db.Collection("categories")
	// index unique trên field id và name
	idxModels := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "id", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys:    bson.D{{Key: "name", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
	}
	if _, err := coll.Indexes().CreateMany(ctx, idxModels); err != nil {
		// Ignore index conflicts, collections might already exist
		return coll, nil
	}
	return coll, nil
}
