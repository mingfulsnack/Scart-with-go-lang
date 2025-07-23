package models

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Address struct for user address
type Address struct {
	Street     string `bson:"street,omitempty" json:"street,omitempty"`
	City       string `bson:"city,omitempty" json:"city,omitempty"`
	State      string `bson:"state,omitempty" json:"state,omitempty"`
	PostalCode string `bson:"postal_code,omitempty" json:"postal_code,omitempty"`
	Country    string `bson:"country,omitempty" json:"country,omitempty"`
}

type User struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Username      string             `bson:"username" json:"username"`
	Email         string             `bson:"email" json:"email"`
	Password      string             `bson:"password,omitempty" json:"password,omitempty"`
	FullName      string             `bson:"full_name,omitempty" json:"full_name,omitempty"`
	Phone         string             `bson:"phone,omitempty" json:"phone,omitempty"`
	DateOfBirth   *time.Time         `bson:"date_of_birth,omitempty" json:"date_of_birth,omitempty"`
	Address       Address            `bson:"address,omitempty" json:"address,omitempty"`
	Role          string             `bson:"role" json:"role"`               // enum: ["admin", "user"]
	Status        string             `bson:"status" json:"status"`           // enum: ["active", "inactive", "banned"]
	Avatar        *string            `bson:"avatar,omitempty" json:"avatar,omitempty"`
	EmailVerified bool               `bson:"email_verified" json:"email_verified"`
	LastLogin     *time.Time         `bson:"last_login,omitempty" json:"last_login,omitempty"`
	CreatedAt     time.Time          `bson:"created_at,omitempty" json:"created_at,omitempty"`
	UpdatedAt     time.Time          `bson:"updated_at,omitempty" json:"updated_at,omitempty"`
}

// EnsureUserCollection khởi tạo collection và index
func EnsureUserCollection(ctx context.Context, db *mongo.Database) (*mongo.Collection, error) {
	coll := db.Collection("Users")

	// Tạo indexes
	idxModels := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "username", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys:    bson.D{{Key: "email", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
	}

	if _, err := coll.Indexes().CreateMany(ctx, idxModels); err != nil {
		// Ignore index conflicts, collections might already exist
		return coll, nil
	}
	return coll, nil
}
