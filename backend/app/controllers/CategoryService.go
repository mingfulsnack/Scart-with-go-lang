package controllers

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/mingfulsnack/app/config"
	"github.com/mingfulsnack/app/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type CategoryService struct{}

type CategoryResult struct {
	Categories []models.Category `json:"categories"`
	Total      int               `json:"total"`
}

type CategoryWithStats struct {
	models.Category
	ProductCount int `json:"product_count"`
}

type CategoryTreeResult struct {
	ID          primitive.ObjectID   `json:"id"`
	Name        string               `json:"name"`
	Slug        string               `json:"slug"`
	Description string               `json:"description,omitempty"`
	Image       string               `json:"image,omitempty"`
	CreatedAt   time.Time            `json:"created_at"`
	UpdatedAt   time.Time            `json:"updated_at"`
	Children    []CategoryTreeResult `json:"children,omitempty"`
}

// GetAllCategories lấy tất cả categories
func (cs *CategoryService) GetAllCategories() ([]models.Category, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("categories")

	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, errors.New("failed to fetch categories")
	}
	defer cursor.Close(ctx)

	var categories []models.Category
	if err = cursor.All(ctx, &categories); err != nil {
		return nil, errors.New("failed to decode categories")
	}

	return categories, nil
}

// GetCategoriesWithStats lấy categories với thống kê sản phẩm
func (cs *CategoryService) GetCategoriesWithStats() ([]CategoryWithStats, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("categories")

	pipeline := mongo.Pipeline{
		{{Key: "$lookup", Value: bson.D{
			{Key: "from", Value: "products"},
			{Key: "localField", Value: "id"},
			{Key: "foreignField", Value: "category_id"},
			{Key: "as", Value: "products"},
		}}},
		{{Key: "$addFields", Value: bson.D{
			{Key: "product_count", Value: bson.D{{Key: "$size", Value: "$products"}}},
		}}},
		{{Key: "$project", Value: bson.D{
			{Key: "products", Value: 0},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "created_at", Value: -1}}}},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, errors.New("failed to aggregate categories")
	}
	defer cursor.Close(ctx)

	var categoriesWithStats []CategoryWithStats
	if err = cursor.All(ctx, &categoriesWithStats); err != nil {
		return nil, errors.New("failed to decode categories with stats")
	}

	return categoriesWithStats, nil
}

// GetCategoryByID lấy category theo ID
func (cs *CategoryService) GetCategoryByID(categoryID string) (*models.Category, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(categoryID)
	if err != nil {
		return nil, errors.New("invalid category ID")
	}

	db := config.GetDB()
	collection := db.Collection("categories")

	var category models.Category
	err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&category)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("category không tồn tại")
		}
		return nil, errors.New("failed to fetch category")
	}

	return &category, nil
}

// GetCategoryBySlug lấy category theo slug
func (cs *CategoryService) GetCategoryBySlug(slug string) (*models.Category, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("categories")

	var category models.Category
	err := collection.FindOne(ctx, bson.M{"slug": slug}).Decode(&category)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("category không tồn tại")
		}
		return nil, errors.New("failed to fetch category")
	}

	return &category, nil
}

// CreateCategory tạo category mới
func (cs *CategoryService) CreateCategory(categoryData models.Category) (*models.Category, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Validate input
	if err := cs.validateCategoryData(categoryData); err != nil {
		return nil, err
	}

	// Kiểm tra tên category đã tồn tại
	if err := cs.checkDuplicateName(categoryData.Name, ""); err != nil {
		return nil, err
	}

	db := config.GetDB()
	collection := db.Collection("categories")

	// Set timestamps
	categoryData.CreatedAt = time.Now()
	categoryData.UpdatedAt = time.Now()

	result, err := collection.InsertOne(ctx, categoryData)
	if err != nil {
		return nil, errors.New("failed to create category")
	}

	categoryData.ID = result.InsertedID.(primitive.ObjectID)
	return &categoryData, nil
}

// UpdateCategory cập nhật category
func (cs *CategoryService) UpdateCategory(categoryID string, updateData models.Category) (*models.Category, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(categoryID)
	if err != nil {
		return nil, errors.New("invalid category ID")
	}

	// Kiểm tra category có tồn tại
	_, err = cs.GetCategoryByID(categoryID)
	if err != nil {
		return nil, err
	}

	// Validate dữ liệu cập nhật
	if err := cs.validateCategoryData(updateData); err != nil {
		return nil, err
	}

	// Kiểm tra tên category trùng lặp
	if updateData.Name != "" {
		if err := cs.checkDuplicateName(updateData.Name, categoryID); err != nil {
			return nil, err
		}
	}

	db := config.GetDB()
	collection := db.Collection("categories")

	// Prepare update document
	updateDoc := bson.M{
		"updatedAt": time.Now(),
	}

	if updateData.Name != "" {
		updateDoc["name"] = updateData.Name
	}
	if updateData.CategoryID != "" {
		updateDoc["id"] = updateData.CategoryID
	}

	_, err = collection.UpdateOne(ctx, bson.M{"_id": objectID}, bson.M{"$set": updateDoc})
	if err != nil {
		return nil, errors.New("failed to update category")
	}

	// Return updated category
	return cs.GetCategoryByID(categoryID)
}

// DeleteCategory xóa category
func (cs *CategoryService) DeleteCategory(categoryID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(categoryID)
	if err != nil {
		return errors.New("invalid category ID")
	}

	// Kiểm tra category có tồn tại
	_, err = cs.GetCategoryByID(categoryID)
	if err != nil {
		return err
	}

	// Kiểm tra có sản phẩm nào đang sử dụng category này không
	if err := cs.checkProductsInCategory(categoryID); err != nil {
		return err
	}

	db := config.GetDB()
	collection := db.Collection("categories")

	_, err = collection.DeleteOne(ctx, bson.M{"_id": objectID})
	if err != nil {
		return errors.New("failed to delete category")
	}

	return nil
}

// GetProductsByCategory lấy sản phẩm theo category
func (cs *CategoryService) GetProductsByCategory(categoryID string, page, limit int) (*CategoryResult, error) {
	// Kiểm tra category có tồn tại
	_, err := cs.GetCategoryByID(categoryID)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("products")

	skip := int64((page - 1) * limit)
	limitInt64 := int64(limit)

	findOptions := options.Find()
	findOptions.SetSkip(skip)
	findOptions.SetLimit(limitInt64)
	findOptions.SetSort(bson.M{"created_at": -1})

	cursor, err := collection.Find(ctx, bson.M{"category_id": categoryID}, findOptions)
	if err != nil {
		return nil, errors.New("failed to fetch products")
	}
	defer cursor.Close(ctx)

	var products []models.Category // This should be []models.Product in real implementation
	if err = cursor.All(ctx, &products); err != nil {
		return nil, errors.New("failed to decode products")
	}

	// Count total products
	total, err := collection.CountDocuments(ctx, bson.M{"category_id": categoryID})
	if err != nil {
		return nil, errors.New("failed to count products")
	}

	return &CategoryResult{
		Categories: products,
		Total:      int(total),
	}, nil
}

// Helper methods

func (cs *CategoryService) validateCategoryData(category models.Category) error {
	if category.Name == "" {
		return errors.New("tên category là bắt buộc")
	}
	if len(category.Name) < 2 {
		return errors.New("tên category phải có ít nhất 2 ký tự")
	}
	if len(category.Name) > 100 {
		return errors.New("tên category không được vượt quá 100 ký tự")
	}
	return nil
}

func (cs *CategoryService) checkDuplicateName(name, excludeID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("categories")

	filter := bson.M{
		"name": bson.M{"$regex": primitive.Regex{Pattern: "^" + name + "$", Options: "i"}},
	}

	if excludeID != "" {
		objectID, err := primitive.ObjectIDFromHex(excludeID)
		if err == nil {
			filter["_id"] = bson.M{"$ne": objectID}
		}
	}

	count, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		return errors.New("failed to check duplicate name")
	}

	if count > 0 {
		return errors.New("tên category đã tồn tại")
	}

	return nil
}

func (cs *CategoryService) checkProductsInCategory(categoryID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("products")

	count, err := collection.CountDocuments(ctx, bson.M{"category_id": categoryID})
	if err != nil {
		return errors.New("failed to check products in category")
	}

	if count > 0 {
		return fmt.Errorf("không thể xóa category vì có %d sản phẩm đang sử dụng", count)
	}

	return nil
}

// NewCategoryService creates a new instance of CategoryService
func NewCategoryService() *CategoryService {
	return &CategoryService{}
}
