package controllers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
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

// RemoveFromCartRequest struct for removing items from cart
type RemoveFromCartRequest struct {
	ProductID string `json:"product_id" binding:"required"`
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

	userRole, _ := c.Get("role")
	userRoleStr := ""
	if userRole != nil {
		userRoleStr = userRole.(string)
	}

	cartService := NewCartService()
	result, err := cartService.GetUserCart(userID.(string), userRoleStr)
	if err != nil {
		if err.Error() == "admin không có quyền thao tác với giỏ hàng" {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Internal server error",
		})
		return
	}

	message := ""
	if result.TotalItems == 0 {
		message = "Cart is empty"
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"data":         result.Items,
		"count":        result.TotalItems,
		"total_amount": result.TotalAmount,
		"message":      message,
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

	userRole, _ := c.Get("role")
	userRoleStr := ""
	if userRole != nil {
		userRoleStr = userRole.(string)
	}

	cartService := NewCartService()
	result, err := cartService.AddToCart(userID.(string), userRoleStr, req.ProductID, req.Quantity)
	if err != nil {
		// Handle specific error types
		if err.Error() == "admin không có quyền thao tác với giỏ hàng" {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		// Client errors (400)
		if err.Error() == "product_id là bắt buộc" ||
			err.Error() == "số lượng phải lớn hơn 0" ||
			err.Error() == "sản phẩm không tồn tại" ||
			strings.Contains(err.Error(), "trong kho") {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"message":      "Đã thêm vào giỏ hàng",
		"data":         result.Items,
		"count":        result.TotalItems,
		"total_amount": result.TotalAmount,
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

	userRole, _ := c.Get("role")
	userRoleStr := ""
	if userRole != nil {
		userRoleStr = userRole.(string)
	}

	cartService := NewCartService()
	result, err := cartService.UpdateCartItem(userID.(string), userRoleStr, productID, req.Quantity)
	if err != nil {
		// Handle specific error types
		if err.Error() == "admin không có quyền thao tác với giỏ hàng" {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		// Client errors (400)
		if err.Error() == "giỏ hàng không tồn tại" ||
			err.Error() == "sản phẩm không có trong giỏ hàng" ||
			err.Error() == "số lượng phải lớn hơn 0" ||
			strings.Contains(err.Error(), "trong kho") {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"message":      "Đã cập nhật số lượng",
		"data":         result.Items,
		"count":        result.TotalItems,
		"total_amount": result.TotalAmount,
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
	if productID == "" {
		// Try to get from request body for POST requests
		var req RemoveFromCartRequest
		if err := c.ShouldBindJSON(&req); err == nil {
			productID = req.ProductID
		}
	}

	if productID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Product ID is required",
		})
		return
	}

	userRole, _ := c.Get("role")
	userRoleStr := ""
	if userRole != nil {
		userRoleStr = userRole.(string)
	}

	cartService := NewCartService()
	result, err := cartService.RemoveFromCart(userID.(string), userRoleStr, productID)
	if err != nil {
		// Handle specific error types
		if err.Error() == "admin không có quyền thao tác với giỏ hàng" {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		// Client errors (400)
		if err.Error() == "giỏ hàng không tồn tại" ||
			err.Error() == "sản phẩm không có trong giỏ hàng" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"message":      "Đã xóa sản phẩm khỏi giỏ hàng",
		"data":         result.Items,
		"count":        result.TotalItems,
		"total_amount": result.TotalAmount,
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

	userRole, _ := c.Get("role")
	userRoleStr := ""
	if userRole != nil {
		userRoleStr = userRole.(string)
	}

	cartService := NewCartService()
	result, err := cartService.ClearCart(userID.(string), userRoleStr)
	if err != nil {
		// Handle specific error types
		if err.Error() == "admin không có quyền thao tác với giỏ hàng" {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"message":      "Đã xóa toàn bộ giỏ hàng",
		"data":         result.Items,
		"count":        result.TotalItems,
		"total_amount": result.TotalAmount,
	})
}
