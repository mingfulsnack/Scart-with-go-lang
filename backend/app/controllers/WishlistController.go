package controllers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

type WishlistController struct{}

// NewWishlistController tạo instance mới của WishlistController
func NewWishlistController() *WishlistController {
	return &WishlistController{}
}

// AddToWishlistRequest struct for adding products to wishlist
type AddToWishlistRequest struct {
	ProductID string `json:"product_id" binding:"required"`
}

// RemoveFromWishlistRequest struct for removing products from wishlist
type RemoveFromWishlistRequest struct {
	ProductID string `json:"product_id" binding:"required"`
}

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

	// Get user role from token
	userRole, roleExists := c.Get("role")
	if !roleExists {
		userRole = "user" // default role
	}

	wishlistService := NewWishlistService()

	// Validate user role
	if err := wishlistService.ValidateUserRole(userRole.(string)); err != nil {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	result, err := wishlistService.GetUserWishlist(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Internal server error",
		})
		return
	}

	message := ""
	if result.Count == 0 {
		message = "Wishlist is empty"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result.Items,
		"count":   result.Count,
		"message": message,
	})
}

// AddToWishlist thêm sản phẩm vào wishlist
func (wc *WishlistController) AddToWishlist(c *gin.Context) {
	var req AddToWishlistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	// Debug: log the received request
	fmt.Printf("AddToWishlist - Received ProductID: %s\n", req.ProductID)

	// Get user ID from token
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Không thể xác thực người dùng",
		})
		return
	}

	fmt.Printf("AddToWishlist - UserID: %s\n", userID.(string))

	// Get user role from token
	userRole, roleExists := c.Get("role")
	if !roleExists {
		userRole = "user" // default role
	}

	fmt.Printf("AddToWishlist - UserRole: %s\n", userRole.(string))

	wishlistService := NewWishlistService()

	// Validate user role
	if err := wishlistService.ValidateUserRole(userRole.(string)); err != nil {
		fmt.Printf("AddToWishlist - Role validation error: %s\n", err.Error())
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	fmt.Printf("AddToWishlist - Calling service with UserID: %s, ProductID: %s\n", userID.(string), req.ProductID)
	result, err := wishlistService.AddProductToWishlist(userID.(string), req.ProductID)
	if err != nil {
		fmt.Printf("AddToWishlist - Service error: %s\n", err.Error())
		// Handle specific error types
		if err.Error() == "product_id là bắt buộc" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		if err.Error() == "sản phẩm không tồn tại" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		if err.Error() == "sản phẩm đã có trong wishlist" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Internal server error: " + err.Error(),
		})
		return
	}

	fmt.Printf("AddToWishlist - Success: %+v\n", result)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đã thêm vào wishlist",
		"data":    result.Items,
		"count":   result.Count,
	})
}

// RemoveFromWishlist xóa sản phẩm khỏi wishlist
func (wc *WishlistController) RemoveFromWishlist(c *gin.Context) {
	// Get productId from URL parameter
	productId := c.Param("productId")
	if productId == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Product ID is required",
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

	// Get user role from token
	userRole, roleExists := c.Get("role")
	if !roleExists {
		userRole = "user" // default role
	}

	wishlistService := NewWishlistService()

	// Validate user role
	if err := wishlistService.ValidateUserRole(userRole.(string)); err != nil {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	result, err := wishlistService.RemoveProductFromWishlist(userID.(string), productId)
	if err != nil {
		// Handle specific error types
		if err.Error() == "wishlist không tồn tại" ||
			err.Error() == "sản phẩm không có trong wishlist" {
			c.JSON(http.StatusNotFound, gin.H{
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
		"success": true,
		"message": "Đã xóa sản phẩm khỏi wishlist",
		"data":    result.Items,
		"count":   result.Count,
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

	// Get user role from token
	userRole, roleExists := c.Get("role")
	if !roleExists {
		userRole = "user" // default role
	}

	wishlistService := NewWishlistService()

	// Validate user role
	if err := wishlistService.ValidateUserRole(userRole.(string)); err != nil {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	result, err := wishlistService.ClearUserWishlist(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đã xóa toàn bộ wishlist",
		"data":    result.Items,
		"count":   result.Count,
	})
}
