package controllers

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mingfulsnack/app/config"
	"github.com/mingfulsnack/app/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CompareController struct{}

// GetCompare lấy danh sách so sánh của user
func (cc *CompareController) GetCompare(c *gin.Context) {
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
	collection := db.Collection("Compares")

	// Convert userID to ObjectID để query
	userOIDHex := userID.(string)
	userOID, err := primitive.ObjectIDFromHex(userOIDHex)
	if err != nil {
		log.Printf("Invalid userID format: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "User ID không hợp lệ",
		})
		return
	}

	var compare models.Compare
	err = collection.FindOne(ctx, bson.M{"user_id": userOID}).Decode(&compare)
	if err != nil {
		// Nếu không tìm thấy compare, tạo mới
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"user_id": userID,
				"items":   []models.CompareItem{},
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    compare,
	})
}

// AddToCompare thêm sản phẩm vào danh sách so sánh
func (cc *CompareController) AddToCompare(c *gin.Context) {
	log.Printf("AddToCompare called")

	var request struct {
		ProductID string `json:"product_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		log.Printf("Binding error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	log.Printf("Request ProductID: %s", request.ProductID)

	// Get user ID from token
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Không thể xác thực người dùng",
		})
		return
	}

	// Convert productID to ObjectID
	productOID, err := primitive.ObjectIDFromHex(request.ProductID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Product ID không hợp lệ",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Compares")

	// Kiểm tra xem sản phẩm có tồn tại không
	productCollection := db.Collection("Products")
	var product models.Product
	err = productCollection.FindOne(ctx, bson.M{"_id": productOID}).Decode(&product)
	if err != nil {
		log.Printf("Product not found, error: %v", err)
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Không tìm thấy sản phẩm: " + err.Error(),
		})
		return
	}

	log.Printf("Product found: %s", product.Name)

	// Convert userID to ObjectID để query
	userOIDHex := userID.(string)
	userOID, err := primitive.ObjectIDFromHex(userOIDHex)
	if err != nil {
		log.Printf("Invalid userID format: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "User ID không hợp lệ",
		})
		return
	}

	// Tìm compare của user bằng ObjectID
	var compare models.Compare
	err = collection.FindOne(ctx, bson.M{"user_id": userOID}).Decode(&compare)

	log.Printf("Compare lookup result - error: %v", err)

	newItem := models.CompareItem{
		ProductID:    productOID.Hex(),
		ProductName:  product.Name,
		ProductImage: product.Image,
		ProductSlug:  product.Slug,
		Price:        product.Price,
		AddedAt:      time.Now(),
	}

	if err != nil {
		// Tạo compare mới nếu chưa có
		userOIDHex := userID.(string)
		userOID, err := primitive.ObjectIDFromHex(userOIDHex)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "User ID không hợp lệ",
			})
			return
		}

		compare = models.Compare{
			UserID:    userOID,
			Items:     []models.CompareItem{newItem},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		result, err := collection.InsertOne(ctx, compare)
		if err != nil {
			log.Printf("Error creating compare: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Lỗi khi tạo danh sách so sánh: " + err.Error(),
			})
			return
		}

		compare.ID = result.InsertedID.(primitive.ObjectID)
	} else {
		// Kiểm tra xem đã đạt giới hạn so sánh chưa (tối đa 4 sản phẩm)
		if len(compare.Items) >= 4 {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"message": "Chỉ có thể so sánh tối đa 4 sản phẩm",
			})
			return
		}

		// Kiểm tra xem sản phẩm đã có trong danh sách so sánh chưa
		for _, item := range compare.Items {
			if item.ProductID == productOID.Hex() {
				c.JSON(http.StatusConflict, gin.H{
					"success": false,
					"message": "Sản phẩm đã có trong danh sách so sánh",
				})
				return
			}
		}

		// Thêm sản phẩm vào danh sách so sánh
		update := bson.M{
			"$push": bson.M{"items": newItem},
			"$set":  bson.M{"updatedAt": time.Now()},
		}

		_, err = collection.UpdateOne(ctx, bson.M{"_id": compare.ID}, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Lỗi khi thêm sản phẩm vào danh sách so sánh",
			})
			return
		}

		compare.Items = append(compare.Items, newItem)
		compare.UpdatedAt = time.Now()
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Thêm sản phẩm vào danh sách so sánh thành công",
		"data":    compare,
	})
}

// RemoveFromCompare xóa sản phẩm khỏi danh sách so sánh
func (cc *CompareController) RemoveFromCompare(c *gin.Context) {
	productID := c.Param("productId")

	// Get user ID from token
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Không thể xác thực người dùng",
		})
		return
	}

	// Convert productID to ObjectID
	productOID, err := primitive.ObjectIDFromHex(productID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Product ID không hợp lệ",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Compares")

	// Convert userID to ObjectID để query
	userOIDHex := userID.(string)
	userOID, err := primitive.ObjectIDFromHex(userOIDHex)
	if err != nil {
		log.Printf("Invalid userID format: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "User ID không hợp lệ",
		})
		return
	}

	// Xóa sản phẩm khỏi danh sách so sánh
	update := bson.M{
		"$pull": bson.M{"items": bson.M{"product_id": productOID.Hex()}},
		"$set":  bson.M{"updatedAt": time.Now()},
	}

	result, err := collection.UpdateOne(ctx, bson.M{"user_id": userOID}, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi xóa sản phẩm khỏi danh sách so sánh",
		})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Không tìm thấy danh sách so sánh",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Xóa sản phẩm khỏi danh sách so sánh thành công",
	})
}

// ClearCompare xóa toàn bộ danh sách so sánh
func (cc *CompareController) ClearCompare(c *gin.Context) {
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
	collection := db.Collection("Compares")

	// Convert userID to ObjectID để query
	userOIDHex := userID.(string)
	userOID, err := primitive.ObjectIDFromHex(userOIDHex)
	if err != nil {
		log.Printf("Invalid userID format: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "User ID không hợp lệ",
		})
		return
	}

	// Xóa toàn bộ items trong danh sách so sánh
	update := bson.M{
		"$set": bson.M{
			"items":     []models.CompareItem{},
			"updatedAt": time.Now(),
		},
	}

	result, err := collection.UpdateOne(ctx, bson.M{"user_id": userOID}, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi xóa danh sách so sánh",
		})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Không tìm thấy danh sách so sánh",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Xóa toàn bộ danh sách so sánh thành công",
	})
}
