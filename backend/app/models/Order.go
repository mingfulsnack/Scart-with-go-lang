package models

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// OrderItem struct tương đương với orderItemSchema trong JS
type OrderItem struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	ProductID   primitive.ObjectID `bson:"product_id" json:"product_id"`
	ProductName string             `bson:"product_name" json:"product_name"`
	ProductSKU  string             `bson:"product_sku" json:"product_sku"`
	Quantity    int                `bson:"quantity" json:"quantity"`
	Price       float64            `bson:"price" json:"price"` // Changed to float64 for monetary values
	Total       float64            `bson:"total" json:"total"` // Changed to float64 for monetary values
}

// ShippingAddress struct tương đương với shipping_address trong JS
type ShippingAddress struct {
	FullName   string `bson:"full_name" json:"full_name"`
	Phone      string `bson:"phone" json:"phone"`
	Email      string `bson:"email" json:"email"`
	Street     string `bson:"street" json:"street"`
	City       string `bson:"city" json:"city"`
	State      string `bson:"state,omitempty" json:"state,omitempty"`
	PostalCode string `bson:"postal_code,omitempty" json:"postal_code,omitempty"`
	Country    string `bson:"country,omitempty" json:"country,omitempty"`
}

// BillingAddress struct tương đương với billing_address trong JS
type BillingAddress struct {
	FullName   string `bson:"full_name" json:"full_name"`
	Phone      string `bson:"phone" json:"phone"`
	Email      string `bson:"email" json:"email"`
	Street     string `bson:"street" json:"street"`
	City       string `bson:"city" json:"city"`
	State      string `bson:"state,omitempty" json:"state,omitempty"`
	PostalCode string `bson:"postal_code,omitempty" json:"postal_code,omitempty"`
	Country    string `bson:"country,omitempty" json:"country,omitempty"`
}

// Payment struct tương đương với payment trong JS
type Payment struct {
	Method        string     `bson:"method" json:"method"` // "cash_on_delivery", "bank_transfer", "credit_card", "e_wallet"
	Status        string     `bson:"status" json:"status"` // "pending", "paid", "failed", "refunded"
	TransactionID string     `bson:"transaction_id,omitempty" json:"transaction_id,omitempty"`
	PaidAt        *time.Time `bson:"paid_at,omitempty" json:"paid_at,omitempty"`
}

// Notes struct tương đương với notes trong JS
type Notes struct {
	Customer string `bson:"customer,omitempty" json:"customer,omitempty"`
	Admin    string `bson:"admin,omitempty" json:"admin,omitempty"`
}

// Tracking struct tương đương với tracking trong JS
type Tracking struct {
	Carrier        string `bson:"carrier,omitempty" json:"carrier,omitempty"`
	TrackingNumber string `bson:"tracking_number,omitempty" json:"tracking_number,omitempty"`
	TrackingURL    string `bson:"tracking_url,omitempty" json:"tracking_url,omitempty"`
}

// Order struct tương đương với orderSchema trong JS
type Order struct {
	ID              primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	OrderNumber     string              `bson:"order_number" json:"order_number"` // Unique order number
	UserID          *primitive.ObjectID `bson:"user_id,omitempty" json:"user_id"` // nullable cho guest checkout
	Status          string              `bson:"status" json:"status"`             // "pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"
	Items           []OrderItem         `bson:"items" json:"items"`
	Subtotal        float64             `bson:"subtotal" json:"subtotal"`               // Changed to float64 for monetary values
	TaxAmount       float64             `bson:"tax_amount" json:"tax_amount"`           // Changed to float64 for monetary values
	ShippingAmount  float64             `bson:"shipping_amount" json:"shipping_amount"` // Changed to float64 for monetary values
	DiscountAmount  float64             `bson:"discount_amount" json:"discount_amount"` // Changed to float64 for monetary values
	TotalAmount     float64             `bson:"total_amount" json:"total_amount"`       // Changed to float64 for monetary values
	Currency        string              `bson:"currency" json:"currency"`               // Default "VND"
	ShippingAddress ShippingAddress     `bson:"shipping_address" json:"shipping_address"`
	BillingAddress  *BillingAddress     `bson:"billing_address,omitempty" json:"billing_address"` // Optional
	Payment         Payment             `bson:"payment" json:"payment"`
	Notes           *Notes               `bson:"notes" json:"notes"`
	Tracking        *Tracking           `bson:"tracking,omitempty" json:"tracking"` // Optional tracking info
	ShippedAt       *time.Time          `bson:"shipped_at,omitempty" json:"shipped_at"`
	DeliveredAt     *time.Time          `bson:"delivered_at,omitempty" json:"delivered_at"`
	CancelledAt     *time.Time          `bson:"cancelled_at,omitempty" json:"cancelled_at"`
	CreatedAt       time.Time           `bson:"createdAt" json:"createdAt"`
	UpdatedAt       time.Time           `bson:"updatedAt" json:"updatedAt"`
}

// EnsureOrderCollection khởi tạo collection và index tương tự như JS
func EnsureOrderCollection(ctx context.Context, db *mongo.Database) (*mongo.Collection, error) {
	coll := db.Collection("orders") // Collection name theo JS pattern

	// Tạo indexes tương tự như trong JS model
	idxModels := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "order_number", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys:    bson.D{{Key: "user_id", Value: 1}},
			Options: options.Index(),
		},
		{
			Keys:    bson.D{{Key: "status", Value: 1}},
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
