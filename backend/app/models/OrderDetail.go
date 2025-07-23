package models

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// OrderDetailProduct struct tương đương với orderProductSchema trong JS
type OrderProduct struct {
	ProductID    primitive.ObjectID `bson:"product_id" json:"product_id"`
	ProductName  string             `bson:"product_name" json:"product_name"`
	ProductImage string             `bson:"product_image" json:"product_image"`
	ProductSlug  string             `bson:"product_slug" json:"product_slug"`
	Quantity     int                `bson:"quantity" json:"quantity"`
	UnitPrice    float64            `bson:"unit_price" json:"unit_price"`   // Changed to float64 for monetary values
	TotalPrice   float64            `bson:"total_price" json:"total_price"` // Changed to float64 for monetary values
	Category     string             `bson:"category,omitempty" json:"category,omitempty"`
}

type UserOrder struct {
	OrderID         primitive.ObjectID `bson:"order_id" json:"order_id"`
	OrderNumber     string             `bson:"order_number" json:"order_number"`
	OrderDate       time.Time          `bson:"order_date" json:"order_date"`
	Status          string             `bson:"status" json:"status"`
	TotalAmount     float64            `bson:"total_amount" json:"total_amount"`
	ShippingAddress struct {
		FullName string `bson:"full_name,omitempty" json:"full_name,omitempty"`
		Phone    string `bson:"phone,omitempty" json:"phone,omitempty"`
		Email    string `bson:"email,omitempty" json:"email,omitempty"`
		Street   string `bson:"street,omitempty" json:"street,omitempty"`
		City     string `bson:"city,omitempty" json:"city,omitempty"`
		Country  string `bson:"country,omitempty" json:"country,omitempty"`
	} `bson:"shipping_address" json:"shipping_address"`
	PaymentMethod string         `bson:"payment_method" json:"payment_method"`
	Notes         string         `bson:"notes,omitempty" json:"notes,omitempty"`
	Products      []OrderProduct `bson:"products" json:"products"`
}


// OrderDetail struct tương đương với orderDetailSchema trong JS
type OrderDetail struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	UserID    *primitive.ObjectID `bson:"user_id,omitempty" json:"user_id,omitempty"`
	UserEmail string             `bson:"user_email" json:"user_email"`
	UserName  string             `bson:"user_name" json:"user_name"`
	UserPhone string             `bson:"user_phone" json:"user_phone"`
	Orders    []UserOrder        `bson:"orders" json:"orders"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}


// EnsureOrderDetailCollection khởi tạo collection và index tương tự như JS
func EnsureOrderDetailCollection(ctx context.Context, db *mongo.Database) (*mongo.Collection, error) {
	coll := db.Collection("OrderDetails")

	// Tạo indexes tương tự như trong JS model
	idxModels := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "user_id", Value: 1}},
			Options: options.Index(),
		},
		{
			Keys:    bson.D{{Key: "user_email", Value: 1}},
			Options: options.Index(),
		},
		{
			Keys:    bson.D{{Key: "orders.order_number", Value: 1}},
			Options: options.Index(),
		},
		{
			Keys:    bson.D{{Key: "orders.order_id", Value: 1}},
			Options: options.Index(),
		},
		{
			Keys:    bson.D{{Key: "createdAt", Value: -1}},
			Options: options.Index(),
		},
	}

	if _, err := coll.Indexes().CreateMany(ctx, idxModels); err != nil {
		// Ignore index conflicts, collections might already exist
		return coll, nil
	}
	return coll, nil
}
