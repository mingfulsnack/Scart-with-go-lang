package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/mingfulsnack/app/models"
	"go.mongodb.org/mongo-driver/bson"
)

type ProductController struct {
	productService *ProductService
}

// NewProductController creates a new product controller instance
func NewProductController() *ProductController {
	return &ProductController{
		productService: NewProductService(),
	}
}

// GetProducts lấy danh sách sản phẩm với phân trang và bộ lọc (public)
func (pc *ProductController) GetProducts(c *gin.Context) {
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

	// Call service method
	result, err := pc.productService.GetAllProducts(page, limit, search, sortStr, category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi lấy danh sách sản phẩm: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       result.Data,
		"pagination": result.Pagination,
	})
}

// GetProductByID lấy chi tiết sản phẩm theo ID, ProductID, hoặc slug
func (pc *ProductController) GetProductByID(c *gin.Context) {
	id := c.Param("id")

	// Call service method
	product, err := pc.productService.GetProductByID(id)
	if err != nil {
		if err.Error() == "product not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Không tìm thấy sản phẩm",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Lỗi khi lấy sản phẩm: " + err.Error(),
			})
		}
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

	// Call service method
	product, err := pc.productService.GetProductByID(slug)
	if err != nil {
		if err.Error() == "product not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Không tìm thấy sản phẩm",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Lỗi khi lấy sản phẩm: " + err.Error(),
			})
		}
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

	// Call service method
	createdProduct, err := pc.productService.CreateProduct(product)
	if err != nil {
		if err.Error() == "product with this ID or slug already exists" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": err.Error(),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Lỗi khi tạo sản phẩm: " + err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Tạo sản phẩm thành công",
		"data":    createdProduct,
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

	// Call service method
	updatedProduct, err := pc.productService.UpdateProduct(id, updateData)
	if err != nil {
		if err.Error() == "product not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Không tìm thấy sản phẩm",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Lỗi khi cập nhật sản phẩm: " + err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Cập nhật sản phẩm thành công",
		"data":    updatedProduct,
	})
}

// DeleteProduct xóa sản phẩm (Admin only)
func (pc *ProductController) DeleteProduct(c *gin.Context) {
	id := c.Param("id")

	// Call service method
	err := pc.productService.DeleteProduct(id)
	if err != nil {
		if err.Error() == "product not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Không tìm thấy sản phẩm",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Lỗi khi xóa sản phẩm: " + err.Error(),
			})
		}
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

	// Call service method
	result, err := pc.productService.GetProductsByCategory(category, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi lấy sản phẩm theo category: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       result.Data,
		"pagination": result.Pagination,
	})
}

// SearchProducts tìm kiếm sản phẩm
func (pc *ProductController) SearchProducts(c *gin.Context) {
	query := c.Query("q")

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

	// Call service method
	result, err := pc.productService.SearchProducts(query, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi tìm kiếm sản phẩm: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       result.Data,
		"pagination": result.Pagination,
	})
}

// GetFeaturedProducts lấy sản phẩm nổi bật
func (pc *ProductController) GetFeaturedProducts(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "8")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 8
	}

	// Call service method
	products, err := pc.productService.GetFeaturedProducts(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi lấy sản phẩm nổi bật: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    products,
	})
}

// GetRelatedProducts lấy sản phẩm liên quan
func (pc *ProductController) GetRelatedProducts(c *gin.Context) {
	// Try to get slug first, then id (for backward compatibility)
	identifier := c.Param("slug")
	if identifier == "" {
		identifier = c.Param("id")
	}

	limitStr := c.DefaultQuery("limit", "4")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 4
	}

	// Call service method
	products, category, err := pc.productService.GetRelatedProducts(identifier, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Lỗi khi lấy sản phẩm liên quan: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"data":     products,
		"category": category,
	})
}
