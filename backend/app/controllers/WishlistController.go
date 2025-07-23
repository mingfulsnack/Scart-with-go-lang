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

type WishlistController struct{}

// GetWishlist lấy wishlist của user
func (wc *WishlistController) GetWishlist(c *gin.Context) {
	// Get user ID from token
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Không thể xác thực người dùng",
		})
		return
	}

	// Convert userID to ObjectID
	userOIDHex := userID.(string)
	userOID, err := primitive.ObjectIDFromHex(userOIDHex)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "User ID không hợp lệ",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Wishlists")

	var wishlist models.Wishlist
	err = collection.FindOne(ctx, bson.M{"user_id": userOID}).Decode(&wishlist)
	if err != nil {
		// Nếu không tìm thấy wishlist, tạo mới
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"user_id": userOID,
				"items":   []models.WishlistItem{},
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    wishlist,
	})
}

// AddToWishlist thêm sản phẩm vào wishlist
func (wc *WishlistController) AddToWishlist(c *gin.Context) {
	log.Printf("AddToWishlist called")

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
	collection := db.Collection("Wishlists")

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

	// Tìm wishlist của user bằng ObjectID
	var wishlist models.Wishlist
	err = collection.FindOne(ctx, bson.M{"user_id": userOID}).Decode(&wishlist)

	log.Printf("Wishlist lookup result - error: %v", err)

	newItem := models.WishlistItem{
		ProductID:    productOID.Hex(),
		ProductName:  product.Name,
		ProductImage: product.Image,
		ProductSlug:  product.Slug,
		Price:        product.Price,
		AddedAt:      time.Now(),
	}

	if err != nil {
		// Tạo wishlist mới nếu chưa có
		log.Printf("Creating new wishlist for user: %s", userOID.Hex())

		wishlist = models.Wishlist{
			UserID:    userOID,
			Items:     []models.WishlistItem{newItem},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		result, err := collection.InsertOne(ctx, wishlist)
		if err != nil {
			log.Printf("Error creating wishlist: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Lỗi khi tạo wishlist: " + err.Error(),
			})
			return
		}

		wishlist.ID = result.InsertedID.(primitive.ObjectID)
	} else {
		// Kiểm tra xem sản phẩm đã có trong wishlist chưa
		for _, item := range wishlist.Items {
			if item.ProductID == productOID.Hex() {
				c.JSON(http.StatusConflict, gin.H{
					"success": false,
					"message": "Sản phẩm đã có trong wishlist",
				})
				return
			}
		}

		// Thêm sản phẩm vào wishlist
		update := bson.M{
			"$push": bson.M{"items": newItem},
			"$set":  bson.M{"updatedAt": time.Now()},
		}

		_, err = collection.UpdateOne(ctx, bson.M{"_id": wishlist.ID}, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Lỗi khi thêm sản phẩm vào wishlist",
			})
			return
		}

		wishlist.Items = append(wishlist.Items, newItem)
		wishlist.UpdatedAt = time.Now()
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Thêm sản phẩm vào wishlist thành công",
		"data":    wishlist,
	})
}

// RemoveFromWishlist xóa sản phẩm khỏi wishlist
func (wc *WishlistController) RemoveFromWishlist(c *gin.Context) {
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

	// Convert userID to ObjectID
	userOIDHex := userID.(string)
	userOID, err := primitive.ObjectIDFromHex(userOIDHex)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "User ID không hợp lệ",
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
	collection := db.Collection("Wishlists")

	// Xóa sản phẩm khỏi wishlist
	update := bson.M{
		"$pull": bson.M{"items": bson.M{"product_id": productOID.Hex()}},
		"$set":  bson.M{"updatedAt": time.Now()},
	}

	result, err := collection.UpdateOne(ctx, bson.M{"user_id": userOID}, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi xóa sản phẩm khỏi wishlist",
		})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Không tìm thấy wishlist",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Xóa sản phẩm khỏi wishlist thành công",
	})
}

// ClearWishlist xóa toàn bộ wishlist
func (wc *WishlistController) ClearWishlist(c *gin.Context) {
	// Get user ID from token
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Không thể xác thực người dùng",
		})
		return
	}

	// Convert userID to ObjectID
	userOIDHex := userID.(string)
	userOID, err := primitive.ObjectIDFromHex(userOIDHex)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "User ID không hợp lệ",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Wishlists")

	// Xóa toàn bộ items trong wishlist
	update := bson.M{
		"$set": bson.M{
			"items":     []models.WishlistItem{},
			"updatedAt": time.Now(),
		},
	}

	result, err := collection.UpdateOne(ctx, bson.M{"user_id": userOID}, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi xóa wishlist",
		})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Không tìm thấy wishlist",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Xóa toàn bộ wishlist thành công",
	})
}
