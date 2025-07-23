package controllers

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"strings"
	"time"

	"github.com/mingfulsnack/app/config"
	"github.com/mingfulsnack/app/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ProductService struct{}

// PaginatedProducts represents paginated product response
type PaginatedProducts struct {
	Data       []models.Product       `json:"data"`
	Pagination map[string]interface{} `json:"pagination"`
}

// ProductWithCategory represents product with populated category info
type ProductWithCategory struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	ProductID   string             `bson:"id" json:"id"`
	Name        string             `bson:"name" json:"name"`
	Price       float64            `bson:"price" json:"price"`
	Image       string             `bson:"image" json:"image"`
	Slug        string             `bson:"slug" json:"slug"`
	Amount      int                `bson:"amount" json:"amount"`
	Category    interface{}        `bson:"category" json:"category"` // Can be string or Category object
	IsFeatured  bool               `bson:"is_featured" json:"is_featured"`
	Description string             `bson:"description,omitempty" json:"description,omitempty"`
	Stock       int                `bson:"stock" json:"stock"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
}

// NewProductService creates a new product service instance
func NewProductService() *ProductService {
	return &ProductService{}
}

// GetAllProducts retrieves all products with pagination and filters
func (ps *ProductService) GetAllProducts(page, limit int, search, sortBy, category string) (*PaginatedProducts, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Products")

	// Default values
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 12
	}

	// Build query filter
	filter := bson.M{}

	// Search by name
	if search != "" {
		filter["name"] = bson.M{"$regex": search, "$options": "i"}
	}

	// Filter by category
	if category != "" {
		filter["category"] = category
	}

	// Build sort options
	sortOptions := options.Find()
	switch sortBy {
	case "price":
		sortOptions.SetSort(bson.D{{Key: "price", Value: 1}})
	case "-price":
		sortOptions.SetSort(bson.D{{Key: "price", Value: -1}})
	case "name":
		sortOptions.SetSort(bson.D{{Key: "name", Value: 1}})
	case "-name":
		sortOptions.SetSort(bson.D{{Key: "name", Value: -1}})
	default:
		sortOptions.SetSort(bson.D{{Key: "name", Value: 1}})
	}

	// Apply pagination
	skip := (page - 1) * limit
	sortOptions.SetSkip(int64(skip)).SetLimit(int64(limit))

	// Execute query
	cursor, err := collection.Find(ctx, filter, sortOptions)
	if err != nil {
		return nil, fmt.Errorf("error finding products: %v", err)
	}
	defer cursor.Close(ctx)

	var products []models.Product
	if err = cursor.All(ctx, &products); err != nil {
		return nil, fmt.Errorf("error decoding products: %v", err)
	}

	// Count total documents
	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("error counting products: %v", err)
	}

	totalPages := (int(total) + limit - 1) / limit

	return &PaginatedProducts{
		Data: products,
		Pagination: map[string]interface{}{
			"current_page":   page,
			"total_pages":    totalPages,
			"total_items":    total,
			"items_per_page": limit,
		},
	}, nil
}

// GetProductByID retrieves a product by ID, ProductID, or slug with category population
func (ps *ProductService) GetProductByID(id string) (*ProductWithCategory, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Products")

	var product models.Product
	var err error

	// Try to find by ObjectID first, then by ProductID, then by slug
	if objectID, parseErr := primitive.ObjectIDFromHex(id); parseErr == nil {
		err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&product)
	} else {
		// Try finding by ProductID first
		err = collection.FindOne(ctx, bson.M{"id": id}).Decode(&product)
		if err != nil {
			// If not found by ProductID, try finding by slug
			err = collection.FindOne(ctx, bson.M{"slug": id}).Decode(&product)
		}
	}

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("product not found")
		}
		return nil, fmt.Errorf("error finding product: %v", err)
	}

	// Populate category information
	productWithCategory := &ProductWithCategory{
		ID:          product.ID,
		ProductID:   product.ProductID,
		Name:        product.Name,
		Price:       product.Price,
		Image:       product.Image,
		Slug:        product.Slug,
		Amount:      product.Amount,
		IsFeatured:  product.IsFeatured,
		Description: product.Description,
		Stock:       product.Stock,
		CreatedAt:   product.CreatedAt,
		UpdatedAt:   product.UpdatedAt,
	}

	// If category is set, try to populate it
	if product.Category != "" {
		categoryCollection := db.Collection("categories")
		var category models.Category
		err = categoryCollection.FindOne(ctx, bson.M{"id": product.Category}).Decode(&category)
		if err == nil {
			productWithCategory.Category = category
		} else {
			// If category not found, keep the string value
			productWithCategory.Category = product.Category
		}
	} else {
		productWithCategory.Category = product.Category
	}

	return productWithCategory, nil
}

// CreateProduct creates a new product
func (ps *ProductService) CreateProduct(productData models.Product) (*models.Product, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Products")

	// Validate required fields
	if productData.ProductID == "" {
		return nil, fmt.Errorf("product ID is required")
	}
	if productData.Name == "" {
		return nil, fmt.Errorf("product name is required")
	}

	// Generate slug if not provided
	if productData.Slug == "" {
		productData.Slug = ps.generateSlug(productData.Name)
	}

	// Validate category exists if provided
	if productData.Category != "" {
		if !ps.categoryExists(productData.Category) {
			return nil, fmt.Errorf("category does not exist")
		}
	} else {
		productData.Category = "food" // default category
	}

	// Check if product with same ID or slug exists
	existingFilter := bson.M{
		"$or": []bson.M{
			{"id": productData.ProductID},
			{"slug": productData.Slug},
		},
	}

	var existing models.Product
	err := collection.FindOne(ctx, existingFilter).Decode(&existing)
	if err == nil {
		return nil, fmt.Errorf("product with this ID or slug already exists")
	} else if err != mongo.ErrNoDocuments {
		return nil, fmt.Errorf("error checking existing product: %v", err)
	}

	// Set timestamps
	now := time.Now()
	productData.CreatedAt = now
	productData.UpdatedAt = now

	// Insert product
	result, err := collection.InsertOne(ctx, productData)
	if err != nil {
		return nil, fmt.Errorf("error creating product: %v", err)
	}

	productData.ID = result.InsertedID.(primitive.ObjectID)
	return &productData, nil
}

// UpdateProduct updates an existing product
func (ps *ProductService) UpdateProduct(id string, updateData bson.M) (*models.Product, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Products")

	// Build filter
	var filter bson.M
	if objectID, parseErr := primitive.ObjectIDFromHex(id); parseErr == nil {
		filter = bson.M{"_id": objectID}
	} else {
		filter = bson.M{"id": id}
	}

	// Validate category if being updated
	if category, exists := updateData["category"]; exists {
		if categoryStr, ok := category.(string); ok && categoryStr != "" {
			if !ps.categoryExists(categoryStr) {
				return nil, fmt.Errorf("category does not exist")
			}
		}
	}

	// Generate new slug if name is being updated
	if name, exists := updateData["name"]; exists {
		if nameStr, ok := name.(string); ok && nameStr != "" {
			updateData["slug"] = ps.generateSlug(nameStr)
		}
	}

	// Set updated timestamp
	updateData["updated_at"] = time.Now()

	// Update product
	update := bson.M{"$set": updateData}
	result, err := collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return nil, fmt.Errorf("error updating product: %v", err)
	}

	if result.MatchedCount == 0 {
		return nil, fmt.Errorf("product not found")
	}

	// Fetch and return updated product
	var updatedProduct models.Product
	err = collection.FindOne(ctx, filter).Decode(&updatedProduct)
	if err != nil {
		return nil, fmt.Errorf("error fetching updated product: %v", err)
	}

	return &updatedProduct, nil
}

// DeleteProduct deletes a product
func (ps *ProductService) DeleteProduct(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Products")

	// Build filter
	var filter bson.M
	if objectID, parseErr := primitive.ObjectIDFromHex(id); parseErr == nil {
		filter = bson.M{"_id": objectID}
	} else {
		filter = bson.M{"id": id}
	}

	// Delete product
	result, err := collection.DeleteOne(ctx, filter)
	if err != nil {
		return fmt.Errorf("error deleting product: %v", err)
	}

	if result.DeletedCount == 0 {
		return fmt.Errorf("product not found")
	}

	return nil
}

// GetProductsByCategory retrieves products by category with pagination
func (ps *ProductService) GetProductsByCategory(categoryID string, page, limit int) (*PaginatedProducts, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Products")

	// Default values
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 12
	}

	filter := bson.M{"category": categoryID}

	// Build sort options
	sortOptions := options.Find()
	sortOptions.SetSort(bson.D{{Key: "name", Value: 1}})

	// Apply pagination
	skip := (page - 1) * limit
	sortOptions.SetSkip(int64(skip)).SetLimit(int64(limit))

	// Execute query
	cursor, err := collection.Find(ctx, filter, sortOptions)
	if err != nil {
		return nil, fmt.Errorf("error finding products by category: %v", err)
	}
	defer cursor.Close(ctx)

	var products []models.Product
	if err = cursor.All(ctx, &products); err != nil {
		return nil, fmt.Errorf("error decoding products: %v", err)
	}

	// Count total documents
	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("error counting products: %v", err)
	}

	totalPages := (int(total) + limit - 1) / limit

	return &PaginatedProducts{
		Data: products,
		Pagination: map[string]interface{}{
			"current_page":   page,
			"total_pages":    totalPages,
			"total_items":    total,
			"items_per_page": limit,
		},
	}, nil
}

// SearchProducts searches for products by keyword
func (ps *ProductService) SearchProducts(keyword string, page, limit int) (*PaginatedProducts, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Products")

	// Default values
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 12
	}

	// Return empty result if no keyword
	if keyword == "" {
		return &PaginatedProducts{
			Data: []models.Product{},
			Pagination: map[string]interface{}{
				"current_page":   page,
				"total_pages":    0,
				"total_items":    0,
				"items_per_page": limit,
			},
		}, nil
	}

	filter := bson.M{
		"name": bson.M{"$regex": keyword, "$options": "i"},
	}

	// Build sort options
	sortOptions := options.Find()
	sortOptions.SetSort(bson.D{{Key: "name", Value: 1}})

	// Apply pagination
	skip := (page - 1) * limit
	sortOptions.SetSkip(int64(skip)).SetLimit(int64(limit))

	// Execute query
	cursor, err := collection.Find(ctx, filter, sortOptions)
	if err != nil {
		return nil, fmt.Errorf("error searching products: %v", err)
	}
	defer cursor.Close(ctx)

	var products []models.Product
	if err = cursor.All(ctx, &products); err != nil {
		return nil, fmt.Errorf("error decoding products: %v", err)
	}

	// Count total documents
	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("error counting search results: %v", err)
	}

	totalPages := (int(total) + limit - 1) / limit

	return &PaginatedProducts{
		Data: products,
		Pagination: map[string]interface{}{
			"current_page":   page,
			"total_pages":    totalPages,
			"total_items":    total,
			"items_per_page": limit,
		},
	}, nil
}

// GetFeaturedProducts retrieves featured products
func (ps *ProductService) GetFeaturedProducts(limit int) ([]models.Product, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Products")

	if limit < 1 {
		limit = 8
	}

	filter := bson.M{"is_featured": true}

	// Build options
	findOptions := options.Find()
	findOptions.SetLimit(int64(limit))
	findOptions.SetSort(bson.D{{Key: "name", Value: 1}})

	cursor, err := collection.Find(ctx, filter, findOptions)
	if err != nil {
		return nil, fmt.Errorf("error finding featured products: %v", err)
	}
	defer cursor.Close(ctx)

	var products []models.Product
	if err = cursor.All(ctx, &products); err != nil {
		return nil, fmt.Errorf("error decoding featured products: %v", err)
	}

	return products, nil
}

// GetRelatedProducts retrieves products related to a given product (by category)
func (ps *ProductService) GetRelatedProducts(identifier string, limit int) ([]models.Product, string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Products")

	if limit < 1 {
		limit = 4
	}

	// First, get the current product - try by slug first, then by ID, then by ObjectID
	var currentProduct models.Product
	var err error

	// Try to find by slug first
	err = collection.FindOne(ctx, bson.M{"slug": identifier}).Decode(&currentProduct)
	if err != nil {
		// If not found by slug, try by ProductID
		err = collection.FindOne(ctx, bson.M{"id": identifier}).Decode(&currentProduct)
		if err != nil {
			// If not found by ProductID, try by ObjectID
			if objectID, parseErr := primitive.ObjectIDFromHex(identifier); parseErr == nil {
				err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&currentProduct)
			}
		}
	}

	if err != nil {
		return nil, "", fmt.Errorf("product not found: %v", err)
	}

	// Build query for related products
	var filter bson.M
	if currentProduct.Category != "" {
		// Get products from same category, excluding current product
		filter = bson.M{
			"category": currentProduct.Category,
			"$and": []bson.M{
				{"slug": bson.M{"$ne": currentProduct.Slug}},
				{"id": bson.M{"$ne": currentProduct.ProductID}},
				{"_id": bson.M{"$ne": currentProduct.ID}},
			},
		}
	} else {
		// Fallback: get random products excluding current product
		filter = bson.M{
			"$and": []bson.M{
				{"slug": bson.M{"$ne": currentProduct.Slug}},
				{"id": bson.M{"$ne": currentProduct.ProductID}},
				{"_id": bson.M{"$ne": currentProduct.ID}},
			},
		}
	}

	// Build options
	findOptions := options.Find()
	findOptions.SetLimit(int64(limit))
	findOptions.SetSort(bson.D{{Key: "name", Value: 1}})

	cursor, err := collection.Find(ctx, filter, findOptions)
	if err != nil {
		return nil, "", fmt.Errorf("error finding related products: %v", err)
	}
	defer cursor.Close(ctx)

	var products []models.Product
	if err = cursor.All(ctx, &products); err != nil {
		return nil, "", fmt.Errorf("error decoding related products: %v", err)
	}

	category := currentProduct.Category
	if category == "" {
		category = "general"
	}

	return products, category, nil
}

// Helper methods

// generateSlug creates a URL-friendly slug from a name
func (ps *ProductService) generateSlug(name string) string {
	// Convert to lowercase
	slug := strings.ToLower(name)

	// Replace spaces and special characters with hyphens
	reg := regexp.MustCompile(`[^a-z0-9]+`)
	slug = reg.ReplaceAllString(slug, "-")

	// Remove leading/trailing hyphens
	slug = strings.Trim(slug, "-")

	// Add timestamp to ensure uniqueness
	timestamp := time.Now().Unix()
	return fmt.Sprintf("%s-%d", slug, timestamp)
}

// categoryExists checks if a category exists
func (ps *ProductService) categoryExists(categoryID string) bool {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("categories")

	var category models.Category
	err := collection.FindOne(ctx, bson.M{"id": categoryID}).Decode(&category)
	if err != nil {
		log.Printf("Category validation error: %v", err)
		return false
	}
	return true
}
