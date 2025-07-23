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
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type OrderController struct{}

// OrderResponse struct for pagination
type OrderResponse struct {
	Success    bool                   `json:"success"`
	Data       []models.Order         `json:"data"`
	Pagination map[string]interface{} `json:"pagination"`
}

// CreateOrder tạo đơn hàng mới
func (oc *OrderController) CreateOrder(c *gin.Context) {
	var order models.Order

	if err := c.ShouldBindJSON(&order); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	// Get user ID from token
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Không thể xác thực người dùng",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Set order data
	userOID := userID.(primitive.ObjectID)
	order.UserID = &userOID
	order.CreatedAt = time.Now()
	order.UpdatedAt = time.Now()
	order.Status = "pending"

	db := config.GetDB()
	collection := db.Collection("orders")

	result, err := collection.InsertOne(ctx, order)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi tạo đơn hàng",
		})
		return
	}

	order.ID = result.InsertedID.(primitive.ObjectID)
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Tạo đơn hàng thành công",
		"data":    order,
	})
}

// GetOrders lấy danh sách đơn hàng của user
func (oc *OrderController) GetOrders(c *gin.Context) {
	// Get user ID from token
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Không thể xác thực người dùng",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Parse query parameters
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "10")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 10
	}

	db := config.GetDB()
	collection := db.Collection("orders")

	filter := bson.M{"userId": userID}

	// Build sort options
	sortOptions := options.Find()
	sortOptions.SetSort(bson.D{{Key: "createdAt", Value: -1}})

	// Apply pagination
	skip := (page - 1) * limit
	sortOptions.SetSkip(int64(skip)).SetLimit(int64(limit))

	cursor, err := collection.Find(ctx, filter, sortOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi lấy danh sách đơn hàng",
		})
		return
	}
	defer cursor.Close(ctx)

	var orders []models.Order
	if err = cursor.All(ctx, &orders); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi decode đơn hàng",
		})
		return
	}

	// Count total
	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi đếm đơn hàng",
		})
		return
	}

	totalPages := (int(total) + limit - 1) / limit

	c.JSON(http.StatusOK, OrderResponse{
		Success: true,
		Data:    orders,
		Pagination: map[string]interface{}{
			"current_page":   page,
			"total_pages":    totalPages,
			"total_items":    total,
			"items_per_page": limit,
		},
	})
}

// GetOrderByID lấy chi tiết đơn hàng theo ID
func (oc *OrderController) GetOrderByID(c *gin.Context) {
	id := c.Param("id")

	// Get user ID from token
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Không thể xác thực người dùng",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("orders")

	var order models.Order
	var err error

	// Try to find by ObjectID first
	if objectID, parseErr := primitive.ObjectIDFromHex(id); parseErr == nil {
		filter := bson.M{"_id": objectID, "userId": userID}
		err = collection.FindOne(ctx, filter).Decode(&order)
	} else {
		// If not valid ObjectID, try to find by order number or other string ID
		filter := bson.M{
			"$or": []bson.M{
				{"orderNumber": id, "userId": userID},
				{"_id": id, "userId": userID}, // Try string ID as well
			},
		}
		err = collection.FindOne(ctx, filter).Decode(&order)
	}

	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Không tìm thấy đơn hàng",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Lỗi khi tìm đơn hàng: " + err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    order,
	})
}

// UpdateOrderStatus cập nhật trạng thái đơn hàng (Admin only)
func (oc *OrderController) UpdateOrderStatus(c *gin.Context) {
	id := c.Param("id")

	var updateData struct {
		Status string `json:"status" binding:"required"`
	}

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
	collection := db.Collection("orders")

	var filter bson.M
	if objectID, parseErr := primitive.ObjectIDFromHex(id); parseErr == nil {
		filter = bson.M{"_id": objectID}
	} else {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID không hợp lệ",
		})
		return
	}

	update := bson.M{
		"$set": bson.M{
			"status":    updateData.Status,
			"updatedAt": time.Now(),
		},
	}

	result, err := collection.UpdateOne(ctx, filter, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi cập nhật đơn hàng",
		})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Không tìm thấy đơn hàng",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Cập nhật trạng thái đơn hàng thành công",
	})
}

// GetAllOrders lấy tất cả đơn hàng (Admin only)
func (oc *OrderController) GetAllOrders(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Parse query parameters
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "10")
	status := c.Query("status")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 10
	}

	db := config.GetDB()
	collection := db.Collection("orders")

	// Build filter
	filter := bson.M{}
	if status != "" {
		filter["status"] = status
	}

	// Build sort options
	sortOptions := options.Find()
	sortOptions.SetSort(bson.D{{Key: "createdAt", Value: -1}})

	// Apply pagination
	skip := (page - 1) * limit
	sortOptions.SetSkip(int64(skip)).SetLimit(int64(limit))

	cursor, err := collection.Find(ctx, filter, sortOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi lấy danh sách đơn hàng",
		})
		return
	}
	defer cursor.Close(ctx)

	var orders []models.Order
	if err = cursor.All(ctx, &orders); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi decode đơn hàng",
		})
		return
	}

	// Count total
	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi đếm đơn hàng",
		})
		return
	}

	totalPages := (int(total) + limit - 1) / limit

	c.JSON(http.StatusOK, OrderResponse{
		Success: true,
		Data:    orders,
		Pagination: map[string]interface{}{
			"current_page":   page,
			"total_pages":    totalPages,
			"total_items":    total,
			"items_per_page": limit,
		},
	})
}

// CancelOrder hủy đơn hàng
func (oc *OrderController) CancelOrder(c *gin.Context) {
	id := c.Param("id")

	// Get user ID from token
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Không thể xác thực người dùng",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("orders")

	var filter bson.M
	if objectID, parseErr := primitive.ObjectIDFromHex(id); parseErr == nil {
		filter = bson.M{"_id": objectID, "userId": userID}
	} else {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID không hợp lệ",
		})
		return
	}

	update := bson.M{
		"$set": bson.M{
			"status":    "cancelled",
			"updatedAt": time.Now(),
		},
	}

	result, err := collection.UpdateOne(ctx, filter, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi hủy đơn hàng",
		})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Không tìm thấy đơn hàng",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Hủy đơn hàng thành công",
	})
}
