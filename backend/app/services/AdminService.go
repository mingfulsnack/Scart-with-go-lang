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

type AdminController struct{}

// DashboardStats struct for admin dashboard statistics
type DashboardStats struct {
	TotalUsers      int64   `json:"totalUsers"`
	TotalProducts   int64   `json:"totalProducts"`
	TotalOrders     int64   `json:"totalOrders"`
	TotalCategories int64   `json:"totalCategories"`
	TotalRevenue    float64 `json:"totalRevenue"`
	OrdersToday     int64   `json:"ordersToday"`
	RevenueToday    float64 `json:"revenueToday"`
}

// GetDashboardStats lấy thống kê cho dashboard admin
func (ac *AdminController) GetDashboardStats(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()

	// Count total users
	userCollection := db.Collection("Users")
	totalUsers, err := userCollection.CountDocuments(ctx, bson.M{})
	if err != nil {
		totalUsers = 0
	}

	// Count total products
	productCollection := db.Collection("Products")
	totalProducts, err := productCollection.CountDocuments(ctx, bson.M{})
	if err != nil {
		totalProducts = 0
	}

	// Count total orders
	orderCollection := db.Collection("orders")
	totalOrders, err := orderCollection.CountDocuments(ctx, bson.M{})
	if err != nil {
		totalOrders = 0
	}

	// Count total categories
	categoryCollection := db.Collection("categories")
	totalCategories, err := categoryCollection.CountDocuments(ctx, bson.M{})
	if err != nil {
		totalCategories = 0
	}

	// Calculate total revenue
	pipeline := []bson.M{
		{
			"$group": bson.M{
				"_id":          nil,
				"totalRevenue": bson.M{"$sum": "$totalAmount"},
			},
		},
	}

	cursor, err := orderCollection.Aggregate(ctx, pipeline)
	var totalRevenue float64 = 0
	if err == nil {
		var result []bson.M
		if err := cursor.All(ctx, &result); err == nil && len(result) > 0 {
			if revenue, ok := result[0]["totalRevenue"].(float64); ok {
				totalRevenue = revenue
			}
		}
		cursor.Close(ctx)
	}

	// Calculate today's stats
	today := time.Now()
	startOfDay := time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, today.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	todayFilter := bson.M{
		"createdAt": bson.M{
			"$gte": startOfDay,
			"$lt":  endOfDay,
		},
	}

	ordersToday, err := orderCollection.CountDocuments(ctx, todayFilter)
	if err != nil {
		ordersToday = 0
	}

	// Calculate today's revenue
	pipelineToday := []bson.M{
		{"$match": todayFilter},
		{
			"$group": bson.M{
				"_id":          nil,
				"revenueToday": bson.M{"$sum": "$totalAmount"},
			},
		},
	}

	cursor, err = orderCollection.Aggregate(ctx, pipelineToday)
	var revenueToday float64 = 0
	if err == nil {
		var result []bson.M
		if err := cursor.All(ctx, &result); err == nil && len(result) > 0 {
			if revenue, ok := result[0]["revenueToday"].(float64); ok {
				revenueToday = revenue
			}
		}
		cursor.Close(ctx)
	}

	stats := DashboardStats{
		TotalUsers:      totalUsers,
		TotalProducts:   totalProducts,
		TotalOrders:     totalOrders,
		TotalCategories: totalCategories,
		TotalRevenue:    totalRevenue,
		OrdersToday:     ordersToday,
		RevenueToday:    revenueToday,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetAllUsers lấy danh sách tất cả users (Admin only)
func (ac *AdminController) GetAllUsers(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Parse query parameters
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "10")
	search := c.Query("search")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 10
	}

	db := config.GetDB()
	collection := db.Collection("Users")

	// Build filter
	filter := bson.M{}
	if search != "" {
		filter["$or"] = []bson.M{
			{"name": bson.M{"$regex": search, "$options": "i"}},
			{"email": bson.M{"$regex": search, "$options": "i"}},
		}
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
			"message": "Lỗi khi lấy danh sách users",
		})
		return
	}
	defer cursor.Close(ctx)

	var users []models.User
	if err = cursor.All(ctx, &users); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi decode users",
		})
		return
	}

	// Hide password field
	for i := range users {
		users[i].Password = ""
	}

	// Count total
	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi đếm users",
		})
		return
	}

	totalPages := (int(total) + limit - 1) / limit

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    users,
		"pagination": gin.H{
			"current_page":   page,
			"total_pages":    totalPages,
			"total_items":    total,
			"items_per_page": limit,
		},
	})
}

// UpdateUserStatus cập nhật trạng thái user (Admin only)
func (ac *AdminController) UpdateUserStatus(c *gin.Context) {
	id := c.Param("id")

	var updateData struct {
		IsActive bool `json:"isActive"`
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
	collection := db.Collection("Users")

	var filter bson.M
	if objectID, parseErr := primitive.ObjectIDFromHex(id); parseErr == nil {
		filter = bson.M{"_id": objectID}
	} else {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "User ID không hợp lệ",
		})
		return
	}

	update := bson.M{
		"$set": bson.M{
			"isActive":  updateData.IsActive,
			"updatedAt": time.Now(),
		},
	}

	result, err := collection.UpdateOne(ctx, filter, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi cập nhật user",
		})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Không tìm thấy user",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Cập nhật trạng thái user thành công",
	})
}

// DeleteUser xóa user (Admin only)
func (ac *AdminController) DeleteUser(c *gin.Context) {
	id := c.Param("id")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Users")

	var filter bson.M
	if objectID, parseErr := primitive.ObjectIDFromHex(id); parseErr == nil {
		filter = bson.M{"_id": objectID}
	} else {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "User ID không hợp lệ",
		})
		return
	}

	result, err := collection.DeleteOne(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi xóa user",
		})
		return
	}

	if result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Không tìm thấy user",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Xóa user thành công",
	})
}

// GetRecentOrders lấy danh sách đơn hàng gần đây (Admin only)
func (ac *AdminController) GetRecentOrders(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 10
	}

	db := config.GetDB()
	collection := db.Collection("orders")

	// Build sort options
	sortOptions := options.Find()
	sortOptions.SetSort(bson.D{{Key: "createdAt", Value: -1}})
	sortOptions.SetLimit(int64(limit))

	cursor, err := collection.Find(ctx, bson.M{}, sortOptions)
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

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    orders,
	})
}
