package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type CompareController struct{}

// NewCompareController tạo instance mới của CompareController
func NewCompareController() *CompareController {
	return &CompareController{}
}

// AddToCompareRequest struct for adding products to compare
type AddToCompareRequest struct {
	ProductID string `json:"product_id" binding:"required"`
}

// RemoveFromCompareRequest struct for removing products from compare
type RemoveFromCompareRequest struct {
	ProductID string `json:"product_id" binding:"required"`
}

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

	// Get user role from token
	userRole, roleExists := c.Get("role")
	if !roleExists {
		userRole = "user" // default role
	}

	compareService := NewCompareService()

	// Validate user role
	if err := compareService.ValidateUserRole(userRole.(string)); err != nil {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	compare, err := compareService.GetUserCompareList(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Internal server error",
		})
		return
	}

	message := ""
	if len(compare.Items) == 0 {
		message = "Compare list is empty"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    compare.Items,
		"count":   len(compare.Items),
		"message": message,
	})
}

// AddToCompare thêm sản phẩm vào danh sách so sánh
func (cc *CompareController) AddToCompare(c *gin.Context) {
	var req AddToCompareRequest
	if err := c.ShouldBindJSON(&req); err != nil {
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

	// Get user role from token
	userRole, roleExists := c.Get("role")
	if !roleExists {
		userRole = "user" // default role
	}

	compareService := NewCompareService()

	// Validate user role
	if err := compareService.ValidateUserRole(userRole.(string)); err != nil {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	compare, err := compareService.AddProductToCompare(userID.(string), req.ProductID)
	if err != nil {
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

		if err.Error() == "sản phẩm đã có trong compare list" ||
			err.Error() == "chỉ có thể so sánh tối đa 4 sản phẩm" {
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
		"success": true,
		"message": "Đã thêm vào compare",
		"data":    compare.Items,
		"count":   len(compare.Items),
	})
}

// RemoveFromCompare xóa sản phẩm khỏi danh sách so sánh
func (cc *CompareController) RemoveFromCompare(c *gin.Context) {
	var req RemoveFromCompareRequest
	if err := c.ShouldBindJSON(&req); err != nil {
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

	// Get user role from token
	userRole, roleExists := c.Get("role")
	if !roleExists {
		userRole = "user" // default role
	}

	compareService := NewCompareService()

	// Validate user role
	if err := compareService.ValidateUserRole(userRole.(string)); err != nil {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	compare, err := compareService.RemoveProductFromCompare(userID.(string), req.ProductID)
	if err != nil {
		// Handle specific error types
		if err.Error() == "compare không tồn tại" ||
			err.Error() == "sản phẩm không có trong compare list" {
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
		"message": "Đã xóa sản phẩm khỏi compare",
		"data":    compare.Items,
		"count":   len(compare.Items),
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

	// Get user role from token
	userRole, roleExists := c.Get("role")
	if !roleExists {
		userRole = "user" // default role
	}

	compareService := NewCompareService()

	// Validate user role
	if err := compareService.ValidateUserRole(userRole.(string)); err != nil {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	compare, err := compareService.ClearUserCompare(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đã xóa toàn bộ compare",
		"data":    compare.Items,
		"count":   len(compare.Items),
	})
}
