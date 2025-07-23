package controllers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mingfulsnack/app/config"
	"github.com/mingfulsnack/app/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ProductController struct{}

// ProductResponse struct for pagination
type ProductResponse struct {
	Success    bool                   `json:"success"`
	Data       []models.Product       `json:"data"`
	Pagination map[string]interface{} `json:"pagination"`
}

// GetProducts lấy danh sách sản phẩm (public)
func (pc *ProductController) GetProducts(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Parse query parameters
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "12")
	search := c.Query("search")
	sortStr := c.DefaultQuery("sort", "name")
	category := c.Query("category")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
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

	db := config.GetDB()
	collection := db.Collection("Products")

	// Build sort options
	sortOptions := options.Find()
	if sortStr == "price" {
		sortOptions.SetSort(bson.D{{Key: "price", Value: 1}})
	} else if sortStr == "-price" {
		sortOptions.SetSort(bson.D{{Key: "price", Value: -1}})
	} else if sortStr == "name" {
		sortOptions.SetSort(bson.D{{Key: "name", Value: 1}})
	} else if sortStr == "-name" {
		sortOptions.SetSort(bson.D{{Key: "name", Value: -1}})
	}

	// Apply pagination
	skip := (page - 1) * limit
	sortOptions.SetSkip(int64(skip)).SetLimit(int64(limit))

	// Execute query
	cursor, err := collection.Find(ctx, filter, sortOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi lấy danh sách sản phẩm",
		})
		return
	}
	defer cursor.Close(ctx)

	var products []models.Product
	if err = cursor.All(ctx, &products); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi decode sản phẩm",
		})
		return
	}

	// Count total
	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi đếm sản phẩm",
		})
		return
	}

	totalPages := (int(total) + limit - 1) / limit

	c.JSON(http.StatusOK, ProductResponse{
		Success: true,
		Data:    products,
		Pagination: map[string]interface{}{
			"current_page":   page,
			"total_pages":    totalPages,
			"total_items":    total,
			"items_per_page": limit,
		},
	})
}

// GetProductByID lấy chi tiết sản phẩm theo ID, ProductID, hoặc slug
func (pc *ProductController) GetProductByID(c *gin.Context) {
	id := c.Param("id")

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
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Không tìm thấy sản phẩm",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    product,
	})
}

// GetProductBySlug lấy sản phẩm theo slug
func (pc *ProductController) GetProductBySlug(c *gin.Context) {
	slug := c.Param("slug")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Products")

	var product models.Product
	err := collection.FindOne(ctx, bson.M{"slug": slug}).Decode(&product)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Không tìm thấy sản phẩm",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    product,
	})
}

// CreateProduct tạo sản phẩm mới (Admin only)
func (pc *ProductController) CreateProduct(c *gin.Context) {
	var product models.Product

	if err := c.ShouldBindJSON(&product); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Products")

	result, err := collection.InsertOne(ctx, product)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi tạo sản phẩm",
		})
		return
	}

	product.ID = result.InsertedID.(primitive.ObjectID)
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Tạo sản phẩm thành công",
		"data":    product,
	})
}

// UpdateProduct cập nhật sản phẩm (Admin only)
func (pc *ProductController) UpdateProduct(c *gin.Context) {
	id := c.Param("id")

	var updateData bson.M
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Products")

	var filter bson.M
	if objectID, parseErr := primitive.ObjectIDFromHex(id); parseErr == nil {
		filter = bson.M{"_id": objectID}
	} else {
		filter = bson.M{"id": id}
	}

	update := bson.M{"$set": updateData}
	result, err := collection.UpdateOne(ctx, filter, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi cập nhật sản phẩm",
		})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Không tìm thấy sản phẩm",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Cập nhật sản phẩm thành công",
	})
}

// DeleteProduct xóa sản phẩm (Admin only)
func (pc *ProductController) DeleteProduct(c *gin.Context) {
	id := c.Param("id")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Products")

	var filter bson.M
	if objectID, parseErr := primitive.ObjectIDFromHex(id); parseErr == nil {
		filter = bson.M{"_id": objectID}
	} else {
		filter = bson.M{"id": id}
	}

	result, err := collection.DeleteOne(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi xóa sản phẩm",
		})
		return
	}

	if result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Không tìm thấy sản phẩm",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Xóa sản phẩm thành công",
	})
}

// GetProductsByCategory lấy sản phẩm theo category
func (pc *ProductController) GetProductsByCategory(c *gin.Context) {
	category := c.Param("category")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Parse query parameters
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "12")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 12
	}

	db := config.GetDB()
	collection := db.Collection("Products")

	filter := bson.M{"category": category}

	// Build sort options
	sortOptions := options.Find()
	sortOptions.SetSort(bson.D{{Key: "name", Value: 1}})

	// Apply pagination
	skip := (page - 1) * limit
	sortOptions.SetSkip(int64(skip)).SetLimit(int64(limit))

	cursor, err := collection.Find(ctx, filter, sortOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi lấy sản phẩm theo category",
		})
		return
	}
	defer cursor.Close(ctx)

	var products []models.Product
	if err = cursor.All(ctx, &products); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi decode sản phẩm",
		})
		return
	}

	// Count total
	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi đếm sản phẩm",
		})
		return
	}

	totalPages := (int(total) + limit - 1) / limit

	c.JSON(http.StatusOK, ProductResponse{
		Success: true,
		Data:    products,
		Pagination: map[string]interface{}{
			"current_page":   page,
			"total_pages":    totalPages,
			"total_items":    total,
			"items_per_page": limit,
		},
	})
}

// SearchProducts tìm kiếm sản phẩm
func (pc *ProductController) SearchProducts(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Query parameter 'q' is required",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Parse query parameters
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "12")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 12
	}

	db := config.GetDB()
	collection := db.Collection("Products")

	// Search filter
	filter := bson.M{
		"name": bson.M{"$regex": query, "$options": "i"},
	}

	// Build sort options
	sortOptions := options.Find()
	sortOptions.SetSort(bson.D{{Key: "name", Value: 1}})

	// Apply pagination
	skip := (page - 1) * limit
	sortOptions.SetSkip(int64(skip)).SetLimit(int64(limit))

	cursor, err := collection.Find(ctx, filter, sortOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi tìm kiếm sản phẩm",
		})
		return
	}
	defer cursor.Close(ctx)

	var products []models.Product
	if err = cursor.All(ctx, &products); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi decode sản phẩm",
		})
		return
	}

	// Count total
	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi đếm sản phẩm",
		})
		return
	}

	totalPages := (int(total) + limit - 1) / limit

	c.JSON(http.StatusOK, ProductResponse{
		Success: true,
		Data:    products,
		Pagination: map[string]interface{}{
			"current_page":   page,
			"total_pages":    totalPages,
			"total_items":    total,
			"items_per_page": limit,
		},
	})
}
