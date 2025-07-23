package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/mingfulsnack/app/models"
)

// CategoryController handles category-related HTTP requests
type CategoryController struct{}

// CreateCategoryRequest struct for creating categories
type CreateCategoryRequest struct {
	Name       string `json:"name" binding:"required"`
	CategoryID string `json:"id,omitempty"`
}

// UpdateCategoryRequest struct for updating categories
type UpdateCategoryRequest struct {
	Name       string `json:"name,omitempty"`
	CategoryID string `json:"id,omitempty"`
}

// GetAllCategories lấy tất cả categories
func (cc *CategoryController) GetAllCategories(c *gin.Context) {
	categoryService := NewCategoryService()
	categories, err := categoryService.GetAllCategories()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to fetch categories",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    categories,
		"count":   len(categories),
	})
}

// GetCategoriesWithStats lấy categories với thống kê sản phẩm
func (cc *CategoryController) GetCategoriesWithStats(c *gin.Context) {
	categoryService := NewCategoryService()
	categories, err := categoryService.GetCategoriesWithStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to fetch categories with stats",
		})
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

	categoryService := NewCategoryService()
	category, err := categoryService.GetCategoryByID(id)
	if err != nil {
		if err.Error() == "category không tồn tại" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    category,
	})
}

// GetCategoryBySlug lấy category theo slug
func (cc *CategoryController) GetCategoryBySlug(c *gin.Context) {
	slug := c.Param("slug")

	categoryService := NewCategoryService()
	category, err := categoryService.GetCategoryBySlug(slug)
	if err != nil {
		if err.Error() == "category không tồn tại" {
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
		"data":    category,
	})
}

// CreateCategory tạo category mới
func (cc *CategoryController) CreateCategory(c *gin.Context) {
	var req CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	categoryData := models.Category{
		Name:       req.Name,
		CategoryID: req.CategoryID,
	}

	categoryService := NewCategoryService()
	category, err := categoryService.CreateCategory(categoryData)
	if err != nil {
		// Handle specific error types
		if err.Error() == "tên category đã tồn tại" ||
			err.Error() == "tên category là bắt buộc" ||
			err.Error() == "tên category phải có ít nhất 2 ký tự" ||
			err.Error() == "tên category không được vượt quá 100 ký tự" {
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

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Tạo category thành công",
		"data":    category,
	})
}

// UpdateCategory cập nhật category
func (cc *CategoryController) UpdateCategory(c *gin.Context) {
	id := c.Param("id")

	var req UpdateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	updateData := models.Category{
		Name:       req.Name,
		CategoryID: req.CategoryID,
	}

	categoryService := NewCategoryService()
	category, err := categoryService.UpdateCategory(id, updateData)
	if err != nil {
		// Handle specific error types
		if err.Error() == "category không tồn tại" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		if err.Error() == "tên category đã tồn tại" ||
			err.Error() == "tên category là bắt buộc" ||
			err.Error() == "tên category phải có ít nhất 2 ký tự" ||
			err.Error() == "tên category không được vượt quá 100 ký tự" {
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
		"message": "Cập nhật category thành công",
		"data":    category,
	})
}

// DeleteCategory xóa category
func (cc *CategoryController) DeleteCategory(c *gin.Context) {
	id := c.Param("id")

	categoryService := NewCategoryService()
	err := categoryService.DeleteCategory(id)
	if err != nil {
		// Handle specific error types
		if err.Error() == "category không tồn tại" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		if err.Error() == "invalid category ID" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		// Check if it's a products in category error
		if err.Error()[:41] == "không thể xóa category vì có" {
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
		"message": "Xóa category thành công",
	})
}

// GetProductsByCategory lấy sản phẩm theo category
func (cc *CategoryController) GetProductsByCategory(c *gin.Context) {
	categoryID := c.Param("id")

	// Get pagination parameters
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

	categoryService := NewCategoryService()
	result, err := categoryService.GetProductsByCategory(categoryID, page, limit)
	if err != nil {
		if err.Error() == "category không tồn tại" {
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

	totalPages := (result.Total + limit - 1) / limit

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result.Categories,
		"pagination": gin.H{
			"current_page":   page,
			"total_pages":    totalPages,
			"total_items":    result.Total,
			"items_per_page": limit,
		},
	})
}
