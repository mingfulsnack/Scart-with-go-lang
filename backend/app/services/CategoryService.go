package controllers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mingfulsnack/app/config"
	"github.com/mingfulsnack/app/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// CategoryController handles category-related operations
type CategoryController struct{}

// GetAllCategories lấy tất cả categories
func (cc *CategoryController) GetAllCategories(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("categories")

	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch categories"})
		return
	}
	defer cursor.Close(ctx)

	var categories []models.Category
	if err = cursor.All(ctx, &categories); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode categories"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    categories,
		"count":   len(categories),
	})
}

// GetCategoryByID lấy category theo ID
func (cc *CategoryController) GetCategoryByID(c *gin.Context) {
	id := c.Param("id")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("categories")

	var category models.Category
	var err error

	// Try to find by ObjectID first, then by CategoryID
	if objectID, parseErr := primitive.ObjectIDFromHex(id); parseErr == nil {
		err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&category)
	} else {
		err = collection.FindOne(ctx, bson.M{"id": id}).Decode(&category)
	}

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    category,
	})
}

// CreateCategory tạo category mới
func (cc *CategoryController) CreateCategory(c *gin.Context) {
	var category models.Category

	if err := c.ShouldBindJSON(&category); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Set timestamps
	category.CreatedAt = time.Now()
	category.UpdatedAt = time.Now()

	db := config.GetDB()
	collection := db.Collection("categories")

	result, err := collection.InsertOne(ctx, category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create category"})
		return
	}

	category.ID = result.InsertedID.(primitive.ObjectID)
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Category created successfully",
		"data":    category,
	})
}

// UpdateCategory cập nhật category
func (cc *CategoryController) UpdateCategory(c *gin.Context) {
	id := c.Param("id")

	var updateData bson.M
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Add update timestamp
	updateData["updated_at"] = time.Now()

	db := config.GetDB()
	collection := db.Collection("categories")

	var filter bson.M
	if objectID, parseErr := primitive.ObjectIDFromHex(id); parseErr == nil {
		filter = bson.M{"_id": objectID}
	} else {
		filter = bson.M{"id": id}
	}

	update := bson.M{"$set": updateData}
	result, err := collection.UpdateOne(ctx, filter, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update category"})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Category updated successfully",
	})
}

// DeleteCategory xóa category
func (cc *CategoryController) DeleteCategory(c *gin.Context) {
	id := c.Param("id")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("categories")

	var filter bson.M
	if objectID, parseErr := primitive.ObjectIDFromHex(id); parseErr == nil {
		filter = bson.M{"_id": objectID}
	} else {
		filter = bson.M{"id": id}
	}

	result, err := collection.DeleteOne(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete category"})
		return
	}

	if result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Category deleted successfully",
	})
}
