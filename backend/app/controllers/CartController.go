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
	"go.mongodb.org/mongo-driver/mongo"
)

type CartController struct{}

// AddToCartRequest struct for adding items to cart
type AddToCartRequest struct {
	ProductID string `json:"product_id" binding:"required"`
	Quantity  int    `json:"quantity" binding:"required,min=1"`
}

// UpdateCartRequest struct for updating cart item quantity
type UpdateCartRequest struct {
	Quantity int `json:"quantity" binding:"required,min=0"`
}

// GetCart lấy giỏ hàng của user
func (cc *CartController) GetCart(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Unauthorized",
		})
		return
	}

	// Admin không có giỏ hàng
	userRole, _ := c.Get("role")
	if userRole == "admin" {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "Admin không có giỏ hàng",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid user ID",
		})
		return
	}

	db := config.GetDB()
	collection := db.Collection("Carts")

	var cart models.Cart
	err = collection.FindOne(ctx, bson.M{
		"user_id":   objectID,
		"cart_type": "cart",
	}).Decode(&cart)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusOK, gin.H{
				"success":      true,
				"data":         []interface{}{},
				"count":        0,
				"total_amount": 0,
				"message":      "Cart is empty",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi lấy giỏ hàng",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"data":         cart.Items,
		"count":        cart.TotalItems,
		"total_amount": cart.TotalAmount,
	})
}

// AddToCart thêm sản phẩm vào giỏ hàng
func (cc *CartController) AddToCart(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Unauthorized",
		})
		return
	}

	var req AddToCartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userObjectID, err := primitive.ObjectIDFromHex(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid user ID",
		})
		return
	}

	// Kiểm tra sản phẩm có tồn tại không
	db := config.GetDB()
	productCollection := db.Collection("Products")

	var product models.Product
	var productFilter bson.M
	if productObjectID, parseErr := primitive.ObjectIDFromHex(req.ProductID); parseErr == nil {
		productFilter = bson.M{"_id": productObjectID}
	} else {
		productFilter = bson.M{"id": req.ProductID}
	}

	err = productCollection.FindOne(ctx, productFilter).Decode(&product)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Không tìm thấy sản phẩm",
		})
		return
	}

	// Kiểm tra số lượng tồn kho
	if product.Amount < req.Quantity {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Số lượng sản phẩm không đủ",
		})
		return
	}

	cartCollection := db.Collection("Carts")

	// Tìm hoặc tạo cart
	var cart models.Cart
	err = cartCollection.FindOne(ctx, bson.M{
		"user_id":   userObjectID,
		"cart_type": "cart",
	}).Decode(&cart)

	if err == mongo.ErrNoDocuments {
		// Tạo cart mới
		cart = models.Cart{
			UserID:      userObjectID,
			CartType:    "cart",
			Items:       []models.CartItem{},
			TotalItems:  0,
			TotalAmount: 0,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
	}

	// Kiểm tra sản phẩm đã có trong cart chưa
	found := false
	for i, item := range cart.Items {
		if item.ProductID == req.ProductID {
			// Cập nhật số lượng
			cart.Items[i].Quantity += req.Quantity
			cart.Items[i].Total = cart.Items[i].Price * float64(cart.Items[i].Quantity)
			found = true
			break
		}
	}

	if !found {
		// Thêm item mới
		newItem := models.CartItem{
			ProductID:    req.ProductID,
			ProductName:  product.Name,
			ProductImage: product.Image,
			ProductSlug:  product.Slug,
			Price:        product.Price,
			Quantity:     req.Quantity,
			Total:        product.Price * float64(req.Quantity),
		}
		cart.Items = append(cart.Items, newItem)
	}

	// Tính lại total
	cart.TotalItems = 0
	cart.TotalAmount = 0
	for _, item := range cart.Items {
		cart.TotalItems += item.Quantity
		cart.TotalAmount += item.Total
	}
	cart.UpdatedAt = time.Now()

	// Lưu cart
	if cart.ID.IsZero() {
		_, err = cartCollection.InsertOne(ctx, cart)
	} else {
		_, err = cartCollection.ReplaceOne(ctx, bson.M{"_id": cart.ID}, cart)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi cập nhật giỏ hàng",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đã thêm sản phẩm vào giỏ hàng",
		"data":    cart,
	})
}

// UpdateCartItem cập nhật số lượng sản phẩm trong giỏ hàng
func (cc *CartController) UpdateCartItem(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Unauthorized",
		})
		return
	}

	productID := c.Param("productId")
	var req UpdateCartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userObjectID, err := primitive.ObjectIDFromHex(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid user ID",
		})
		return
	}

	db := config.GetDB()
	cartCollection := db.Collection("Carts")

	var cart models.Cart
	err = cartCollection.FindOne(ctx, bson.M{
		"user_id":   userObjectID,
		"cart_type": "cart",
	}).Decode(&cart)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Không tìm thấy giỏ hàng",
		})
		return
	}

	// Tìm và cập nhật item
	found := false
	for i, item := range cart.Items {
		if item.ProductID == productID {
			if req.Quantity == 0 {
				// Xóa item
				cart.Items = append(cart.Items[:i], cart.Items[i+1:]...)
			} else {
				// Cập nhật số lượng
				cart.Items[i].Quantity = req.Quantity
				cart.Items[i].Total = cart.Items[i].Price * float64(req.Quantity)
			}
			found = true
			break
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Không tìm thấy sản phẩm trong giỏ hàng",
		})
		return
	}

	// Tính lại total trong UpdateCartItem
	cart.TotalItems = 0
	cart.TotalAmount = 0
	for _, item := range cart.Items {
		cart.TotalItems += item.Quantity
		cart.TotalAmount += item.Total
	}
	cart.UpdatedAt = time.Now()

	// Lưu cart trong UpdateCartItem
	_, err = cartCollection.ReplaceOne(ctx, bson.M{"_id": cart.ID}, cart)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi cập nhật giỏ hàng",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Cập nhật giỏ hàng thành công",
		"data":    cart,
	})
}

// RemoveFromCart xóa sản phẩm khỏi giỏ hàng
func (cc *CartController) RemoveFromCart(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Unauthorized",
		})
		return
	}

	productID := c.Param("productId")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userObjectID, err := primitive.ObjectIDFromHex(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid user ID",
		})
		return
	}

	db := config.GetDB()
	cartCollection := db.Collection("Carts")

	var cart models.Cart
	err = cartCollection.FindOne(ctx, bson.M{
		"user_id":   userObjectID,
		"cart_type": "cart",
	}).Decode(&cart)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Không tìm thấy giỏ hàng",
		})
		return
	}

	// Tìm và xóa item
	found := false
	for i, item := range cart.Items {
		if item.ProductID == productID {
			cart.Items = append(cart.Items[:i], cart.Items[i+1:]...)
			found = true
			break
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Không tìm thấy sản phẩm trong giỏ hàng",
		})
		return
	}

	// Tính lại total trong RemoveFromCart
	cart.TotalItems = 0
	cart.TotalAmount = 0
	for _, item := range cart.Items {
		cart.TotalItems += item.Quantity
		cart.TotalAmount += item.Total
	}
	cart.UpdatedAt = time.Now()

	// Lưu cart trong RemoveFromCart
	_, err = cartCollection.ReplaceOne(ctx, bson.M{"_id": cart.ID}, cart)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi cập nhật giỏ hàng",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đã xóa sản phẩm khỏi giỏ hàng",
		"data":    cart,
	})
}

// ClearCart xóa toàn bộ giỏ hàng
func (cc *CartController) ClearCart(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Unauthorized",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userObjectID, err := primitive.ObjectIDFromHex(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid user ID",
		})
		return
	}

	db := config.GetDB()
	cartCollection := db.Collection("Carts")

	_, err = cartCollection.DeleteOne(ctx, bson.M{
		"user_id":   userObjectID,
		"cart_type": "cart",
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi xóa giỏ hàng",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đã xóa toàn bộ giỏ hàng",
	})
}
