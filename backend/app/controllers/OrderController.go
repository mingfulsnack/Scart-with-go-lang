package controllers

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/mingfulsnack/app/models"
)

type OrderController struct{}

// CreateOrderRequest struct for creating orders
type CreateOrderRequest struct {
	ShippingAddress string `json:"shipping_address" binding:"required"`
	Phone           string `json:"phone"`
	CustomerPhone   string `json:"customer_phone"`
	CustomerName    string `json:"customer_name"`
	CustomerEmail   string `json:"customer_email"`
	PaymentMethod   string `json:"payment_method"`
	Notes           string `json:"notes"`
}

// UpdateOrderStatusRequest struct for updating order status
type UpdateOrderStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

// OrderResponse struct for pagination
type OrderResponse struct {
	Success    bool                   `json:"success"`
	Data       []interface{}          `json:"data"`
	Pagination map[string]interface{} `json:"pagination"`
}

// CreateOrder tạo đơn hàng mới từ giỏ hàng
func (oc *OrderController) CreateOrder(c *gin.Context) {
	var req CreateOrderRequest
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

	orderService := NewOrderService()

	// Validate order data
	orderData := CreateOrderData{
		ShippingAddress: req.ShippingAddress,
		Phone:           req.Phone,
		CustomerPhone:   req.CustomerPhone,
		CustomerName:    req.CustomerName,
		CustomerEmail:   req.CustomerEmail,
		PaymentMethod:   req.PaymentMethod,
		Notes:           req.Notes,
	}

	if err := orderService.ValidateOrderData(orderData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	// Create order from cart
	order, err := orderService.CreateOrderFromCart(userID.(string), orderData)
	if err != nil {
		// Handle specific error types
		if err.Error() == "giỏ hàng trống" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		if err.Error() == "địa chỉ giao hàng và số điện thoại là bắt buộc" {
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

	fmt.Printf("DEBUG: GetOrders - userID from JWT: %v\n", userID)

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

	orderService := NewOrderService()
	result, err := orderService.GetUserOrders(userID.(string), page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, OrderResponse{
		Success:    true,
		Data:       convertOrdersToInterface(result.Orders),
		Pagination: result.Pagination,
	})
}

// Helper function to convert orders to interface{} slice
func convertOrdersToInterface(orders []models.Order) []interface{} {
	data := make([]interface{}, len(orders))
	for i, order := range orders {
		// Transform Go model fields to match frontend expectations
		orderMap := map[string]interface{}{
			"_id":              order.ID,
			"order_id":         order.ID.Hex(),
			"order_number":     order.OrderNumber,
			"user_id":          order.UserID,
			"status":           order.Status,
			"total_amount":     order.TotalAmount,
			"subtotal":         order.Subtotal,
			"tax_amount":       order.TaxAmount,
			"shipping_amount":  order.ShippingAmount,
			"discount_amount":  order.DiscountAmount,
			"currency":         order.Currency,
			"shipping_address": order.ShippingAddress,
			"billing_address":  order.BillingAddress,
			"payment":          order.Payment,
			"payment_method":   order.Payment.Method,
			"notes":            order.Notes,
			"customer_notes":   "",
			"tracking":         order.Tracking,
			"shipped_at":       order.ShippedAt,
			"delivered_at":     order.DeliveredAt,
			"cancelled_at":     order.CancelledAt,
			"order_date":       order.CreatedAt,
			"createdAt":        order.CreatedAt,
			"updatedAt":        order.UpdatedAt,
		}

		// Transform order items/products
		products := make([]map[string]interface{}, len(order.Items))
		for j, item := range order.Items {
			products[j] = map[string]interface{}{
				"_id":           item.ID,
				"product_id":    item.ProductID,
				"product_name":  item.ProductName,
				"product_sku":   item.ProductSKU,
				"product_image": "", // Add default empty image
				"quantity":      item.Quantity,
				"unit_price":    item.Price,
				"price":         item.Price,
				"total_price":   item.Total,
				"total":         item.Total,
			}
		}
		orderMap["products"] = products
		orderMap["items"] = products // Provide both field names for compatibility

		// Add customer notes from nested structure
		if order.Notes != nil && order.Notes.Customer != "" {
			orderMap["customer_notes"] = order.Notes.Customer
		}

		data[i] = orderMap
	}
	return data
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

	orderService := NewOrderService()
	order, err := orderService.GetOrderByID(id, userID.(string))
	if err != nil {
		if err.Error() == "đơn hàng không tồn tại" {
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
		"data":    order,
	})
}

// UpdateOrderStatus cập nhật trạng thái đơn hàng (Admin only)
func (oc *OrderController) UpdateOrderStatus(c *gin.Context) {
	id := c.Param("id")

	var req UpdateOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	orderService := NewOrderService()
	order, err := orderService.UpdateOrderStatus(id, req.Status, "")
	if err != nil {
		// Handle specific error types
		if err.Error() == "đơn hàng không tồn tại" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		if err.Error() == "trạng thái không hợp lệ" ||
			err.Error() == "không thể thay đổi trạng thái đơn hàng đã hoàn thành hoặc đã hủy" {
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
		"message": "Cập nhật trạng thái đơn hàng thành công",
		"data":    order,
	})
}

// GetAllOrders lấy tất cả đơn hàng (Admin only)
func (oc *OrderController) GetAllOrders(c *gin.Context) {
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

	// Build filters
	filters := make(map[string]interface{})
	if status != "" {
		filters["status"] = status
	}

	orderService := NewOrderService()
	result, err := orderService.GetAllOrders(page, limit, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Internal server error",
		})
		return
	}

	// Convert to interface{} slice for response
	data := make([]interface{}, len(result.Orders))
	for i, order := range result.Orders {
		data[i] = order
	}

	c.JSON(http.StatusOK, OrderResponse{
		Success:    true,
		Data:       data,
		Pagination: result.Pagination,
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

	orderService := NewOrderService()
	order, err := orderService.CancelOrder(id, userID.(string))
	if err != nil {
		// Handle specific error types
		if err.Error() == "đơn hàng không tồn tại" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}

		if err.Error() == "chỉ có thể hủy đơn hàng đang chờ xử lý" {
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
		"message": "Hủy đơn hàng thành công",
		"data":    order,
	})
}

// GetOrderByNumber lấy đơn hàng theo order number
func (oc *OrderController) GetOrderByNumber(c *gin.Context) {
	orderNumber := c.Param("orderNumber")

	orderService := NewOrderService()
	order, err := orderService.GetOrderByNumber(orderNumber)
	if err != nil {
		if err.Error() == "đơn hàng không tồn tại" {
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
		"data":    order,
	})
}

// GetOrdersByEmail lấy đơn hàng theo email
func (oc *OrderController) GetOrdersByEmail(c *gin.Context) {
	email := c.Query("email")
	if email == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Email là bắt buộc",
		})
		return
	}

	orderService := NewOrderService()
	orders, err := orderService.GetOrdersByEmail(email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    orders,
	})
}
