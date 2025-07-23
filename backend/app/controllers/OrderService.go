package controllers

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/mingfulsnack/app/config"
	"github.com/mingfulsnack/app/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// OrderService handles business logic for order operations
type OrderService struct{}

// NewOrderService creates a new instance of OrderService
func NewOrderService() *OrderService {
	return &OrderService{}
}

// OrderResult represents the result structure for order operations
type OrderResult struct {
	Orders     []models.Order         `json:"orders"`
	Pagination map[string]interface{} `json:"pagination"`
}

// OrderStatistics represents order statistics
type OrderStatistics struct {
	Statistics      []map[string]interface{} `json:"statistics"`
	StatusBreakdown map[string]interface{}   `json:"status_breakdown"`
	TotalOrders     int64                    `json:"total_orders"`
	TotalRevenue    float64                  `json:"total_revenue"`
}

// CreateOrderData represents data for creating an order
type CreateOrderData struct {
	ShippingAddress string `json:"shipping_address"`
	Phone           string `json:"phone"`
	CustomerPhone   string `json:"customer_phone"`
	CustomerName    string `json:"customer_name"`
	CustomerEmail   string `json:"customer_email"`
	PaymentMethod   string `json:"payment_method"`
	Notes           string `json:"notes"`
}

// GetAllOrders lấy tất cả đơn hàng với pagination (cho admin)
func (os *OrderService) GetAllOrders(page, limit int, filters map[string]interface{}) (*OrderResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	skip := (page - 1) * limit
	query := bson.M{}

	// Áp dụng filters
	if status, ok := filters["status"]; ok {
		query["status"] = status
	}

	if userID, ok := filters["user_id"]; ok {
		query["userId"] = userID
	}

	if dateFrom, ok := filters["date_from"]; ok {
		if query["createdAt"] == nil {
			query["createdAt"] = bson.M{}
		}
		query["createdAt"].(bson.M)["$gte"] = dateFrom
	}

	if dateTo, ok := filters["date_to"]; ok {
		if query["createdAt"] == nil {
			query["createdAt"] = bson.M{}
		}
		query["createdAt"].(bson.M)["$lte"] = dateTo
	}

	db := config.GetDB()
	collection := db.Collection("orders")

	// Build sort options
	sortOptions := options.Find()
	sortOptions.SetSort(bson.D{{Key: "createdAt", Value: -1}})
	sortOptions.SetSkip(int64(skip)).SetLimit(int64(limit))

	cursor, err := collection.Find(ctx, query, sortOptions)
	if err != nil {
		return nil, errors.New("lỗi khi lấy danh sách đơn hàng")
	}
	defer cursor.Close(ctx)

	var orders []models.Order
	if err = cursor.All(ctx, &orders); err != nil {
		return nil, errors.New("lỗi khi decode đơn hàng")
	}

	// Count total
	total, err := collection.CountDocuments(ctx, query)
	if err != nil {
		return nil, errors.New("lỗi khi đếm đơn hàng")
	}

	totalPages := (int(total) + limit - 1) / limit

	return &OrderResult{
		Orders: orders,
		Pagination: map[string]interface{}{
			"current_page":   page,
			"total_pages":    totalPages,
			"total_items":    total,
			"items_per_page": limit,
		},
	}, nil
}

// GetUserOrders lấy đơn hàng của user
func (os *OrderService) GetUserOrders(userID string, page, limit int) (*OrderResult, error) {
	filters := map[string]interface{}{
		"user_id": userID,
	}
	return os.GetAllOrders(page, limit, filters)
}

// GetOrderByID lấy chi tiết đơn hàng
func (os *OrderService) GetOrderByID(orderID, userID string) (*models.Order, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("orders")

	query := bson.M{}

	// Try to convert orderID to ObjectID
	if objectID, err := primitive.ObjectIDFromHex(orderID); err == nil {
		query["_id"] = objectID
	} else {
		// If not valid ObjectID, try to find by order number
		query["orderNumber"] = orderID
	}

	// Nếu không phải admin, chỉ được xem đơn hàng của mình
	if userID != "" {
		if userOID, err := primitive.ObjectIDFromHex(userID); err == nil {
			query["userId"] = userOID
		} else {
			query["userId"] = userID
		}
	}

	var order models.Order
	err := collection.FindOne(ctx, query).Decode(&order)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("đơn hàng không tồn tại")
		}
		return nil, errors.New("lỗi khi tìm đơn hàng")
	}

	return &order, nil
}

// CreateOrderFromCart tạo đơn hàng mới từ giỏ hàng
func (os *OrderService) CreateOrderFromCart(userID string, orderData CreateOrderData) (*models.Order, error) {
	// Use phone or customer_phone
	phoneNumber := orderData.Phone
	if phoneNumber == "" {
		phoneNumber = orderData.CustomerPhone
	}

	// Validate required fields
	if orderData.ShippingAddress == "" || phoneNumber == "" {
		return nil, errors.New("địa chỉ giao hàng và số điện thoại là bắt buộc")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Convert userID to ObjectID
	userOID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("user ID không hợp lệ")
	}

	// Lấy giỏ hàng
	db := config.GetDB()
	cartCollection := db.Collection("Carts")

	var cart models.Cart
	err = cartCollection.FindOne(ctx, bson.M{"user_id": userOID}).Decode(&cart)
	if err != nil || len(cart.Items) == 0 {
		return nil, errors.New("giỏ hàng trống")
	}

	// Kiểm tra stock trước khi tạo đơn hàng
	if err := os.validateOrderStock(cart.Items); err != nil {
		return nil, err
	}

	// Convert cart items to order items
	var orderItems []models.OrderItem
	for _, item := range cart.Items {
		// Convert ProductID string to ObjectID
		productOID, err := primitive.ObjectIDFromHex(item.ProductID)
		if err != nil {
			// If conversion fails, create a new ObjectID
			productOID = primitive.NewObjectID()
		}

		orderItems = append(orderItems, models.OrderItem{
			ProductID:   productOID,
			ProductName: item.ProductName,
			ProductSKU:  item.ProductID, // Use original string ID as SKU
			Quantity:    item.Quantity,
			Price:       item.Price,
			Total:       item.Price * float64(item.Quantity),
		})
	}

	// Calculate totals
	subtotal := cart.TotalAmount
	totalAmount := subtotal

	// Generate order number
	orderNumber := os.generateOrderNumber()

	// Map payment method to valid enum value
	paymentMethod := orderData.PaymentMethod
	if paymentMethod == "" || paymentMethod == "cod" {
		paymentMethod = "cash_on_delivery"
	}

	// Prepare shipping address
	shippingAddress := models.ShippingAddress{
		FullName: orderData.CustomerName,
		Phone:    phoneNumber,
		Email:    orderData.CustomerEmail,
		Street:   orderData.ShippingAddress,
		City:     "Ho Chi Minh City",
		Country:  "Vietnam",
	}

	// Tạo đơn hàng
	order := models.Order{
		OrderNumber:     orderNumber,
		UserID:          &userOID,
		Items:           orderItems,
		Subtotal:        subtotal,
		TotalAmount:     totalAmount,
		Status:          "pending",
		ShippingAddress: shippingAddress,
		Payment: models.Payment{
			Method: paymentMethod,
			Status: "pending",
		},
		Notes: &models.Notes{
			Customer: orderData.Notes,
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Save order
	orderCollection := db.Collection("orders")
	result, err := orderCollection.InsertOne(ctx, order)
	if err != nil {
		return nil, errors.New("lỗi khi tạo đơn hàng")
	}

	order.ID = result.InsertedID.(primitive.ObjectID)

	// Update stock
	if err := os.updateProductStock(cart.Items, -1); err != nil {
		return nil, err
	}

	// Clear cart after successful order creation
	_, err = cartCollection.UpdateOne(
		ctx,
		bson.M{"user_id": userOID},
		bson.M{
			"$set": bson.M{
				"items":       []models.CartItem{},
				"totalAmount": 0,
				"totalItems":  0,
				"updatedAt":   time.Now(),
			},
		},
	)
	if err != nil {
		// Log error but don't fail the order creation
		fmt.Printf("Warning: Failed to clear cart after order creation: %v\n", err)
	}

	return &order, nil
}

// UpdateOrderStatus cập nhật trạng thái đơn hàng (admin only)
func (os *OrderService) UpdateOrderStatus(orderID, newStatus, userID string) (*models.Order, error) {
	validStatuses := []string{"pending", "confirmed", "processing", "shipping", "delivered", "cancelled"}

	// Validate status
	isValid := false
	for _, status := range validStatuses {
		if status == newStatus {
			isValid = true
			break
		}
	}
	if !isValid {
		return nil, errors.New("trạng thái không hợp lệ")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("orders")

	// Build query
	query := bson.M{}
	if objectID, err := primitive.ObjectIDFromHex(orderID); err == nil {
		query["_id"] = objectID
	} else {
		return nil, errors.New("order ID không hợp lệ")
	}

	if userID != "" {
		if userOID, err := primitive.ObjectIDFromHex(userID); err == nil {
			query["userId"] = userOID
		}
	}

	// Get current order to check status
	var currentOrder models.Order
	err := collection.FindOne(ctx, query).Decode(&currentOrder)
	if err != nil {
		return nil, errors.New("đơn hàng không tồn tại")
	}

	// Kiểm tra logic chuyển trạng thái
	if currentOrder.Status == "delivered" || currentOrder.Status == "cancelled" {
		return nil, errors.New("không thể thay đổi trạng thái đơn hàng đã hoàn thành hoặc đã hủy")
	}

	// Nếu hủy đơn hàng, hoàn lại stock
	if newStatus == "cancelled" && currentOrder.Status != "cancelled" {
		if err := os.restoreOrderStock(currentOrder.Items); err != nil {
			return nil, err
		}
	}

	// Update order status
	update := bson.M{
		"$set": bson.M{
			"status":    newStatus,
			"updatedAt": time.Now(),
		},
	}

	_, err = collection.UpdateOne(ctx, query, update)
	if err != nil {
		return nil, errors.New("lỗi khi cập nhật đơn hàng")
	}

	// Get updated order
	err = collection.FindOne(ctx, query).Decode(&currentOrder)
	if err != nil {
		return nil, errors.New("lỗi khi lấy đơn hàng đã cập nhật")
	}

	currentOrder.Status = newStatus
	currentOrder.UpdatedAt = time.Now()

	return &currentOrder, nil
}

// CancelOrder hủy đơn hàng (user only)
func (os *OrderService) CancelOrder(orderID, userID string) (*models.Order, error) {
	// First check if order exists and belongs to user
	order, err := os.GetOrderByID(orderID, userID)
	if err != nil {
		return nil, err
	}

	if order.Status != "pending" {
		return nil, errors.New("chỉ có thể hủy đơn hàng đang chờ xử lý")
	}

	return os.UpdateOrderStatus(orderID, "cancelled", userID)
}

// GetOrderStatistics thống kê đơn hàng
func (os *OrderService) GetOrderStatistics(dateFrom, dateTo *time.Time) (*OrderStatistics, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("orders")

	// Build match condition
	matchCondition := bson.M{}
	if dateFrom != nil || dateTo != nil {
		matchCondition["createdAt"] = bson.M{}
		if dateFrom != nil {
			matchCondition["createdAt"].(bson.M)["$gte"] = *dateFrom
		}
		if dateTo != nil {
			matchCondition["createdAt"].(bson.M)["$lte"] = *dateTo
		}
	}

	// Aggregate statistics
	pipeline := []bson.M{
		{"$match": matchCondition},
		{
			"$group": bson.M{
				"_id":          "$status",
				"count":        bson.M{"$sum": 1},
				"total_amount": bson.M{"$sum": "$totalAmount"},
			},
		},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, errors.New("lỗi khi thống kê đơn hàng")
	}
	defer cursor.Close(ctx)

	var statistics []map[string]interface{}
	if err = cursor.All(ctx, &statistics); err != nil {
		return nil, errors.New("lỗi khi decode thống kê")
	}

	// Get total orders
	totalOrders, err := collection.CountDocuments(ctx, matchCondition)
	if err != nil {
		return nil, errors.New("lỗi khi đếm tổng đơn hàng")
	}

	// Get total revenue (excluding cancelled orders)
	revenueMatchCondition := matchCondition
	revenueMatchCondition["status"] = bson.M{"$ne": "cancelled"}

	revenuePipeline := []bson.M{
		{"$match": revenueMatchCondition},
		{
			"$group": bson.M{
				"_id":   nil,
				"total": bson.M{"$sum": "$totalAmount"},
			},
		},
	}

	revenueCursor, err := collection.Aggregate(ctx, revenuePipeline)
	if err != nil {
		return nil, errors.New("lỗi khi tính tổng doanh thu")
	}
	defer revenueCursor.Close(ctx)

	var revenueResult []map[string]interface{}
	revenueCursor.All(ctx, &revenueResult)

	totalRevenue := float64(0)
	if len(revenueResult) > 0 {
		if total, ok := revenueResult[0]["total"].(float64); ok {
			totalRevenue = total
		}
	}

	// Create status breakdown
	statusBreakdown := make(map[string]interface{})
	for _, stat := range statistics {
		if status, ok := stat["_id"].(string); ok {
			statusBreakdown[status] = map[string]interface{}{
				"count":        stat["count"],
				"total_amount": stat["total_amount"],
			}
		}
	}

	return &OrderStatistics{
		Statistics:      statistics,
		StatusBreakdown: statusBreakdown,
		TotalOrders:     totalOrders,
		TotalRevenue:    totalRevenue,
	}, nil
}

// GetRecentOrders lấy đơn hàng gần đây
func (os *OrderService) GetRecentOrders(limit int) ([]models.Order, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("orders")

	opts := options.Find()
	opts.SetSort(bson.D{{Key: "createdAt", Value: -1}})
	opts.SetLimit(int64(limit))

	cursor, err := collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, errors.New("lỗi khi lấy đơn hàng gần đây")
	}
	defer cursor.Close(ctx)

	var orders []models.Order
	if err = cursor.All(ctx, &orders); err != nil {
		return nil, errors.New("lỗi khi decode đơn hàng")
	}

	return orders, nil
}

// ValidateOrderData validate order data
func (os *OrderService) ValidateOrderData(orderData CreateOrderData) error {
	var errors []string

	if len(orderData.ShippingAddress) < 10 {
		errors = append(errors, "Địa chỉ giao hàng phải có ít nhất 10 ký tự")
	}

	phone := orderData.Phone
	if phone == "" {
		phone = orderData.CustomerPhone
	}

	if phone == "" || len(phone) < 10 || len(phone) > 11 {
		errors = append(errors, "Số điện thoại không hợp lệ")
	}

	validPaymentMethods := []string{"COD", "cash_on_delivery", "bank_transfer", "credit_card"}
	if orderData.PaymentMethod != "" {
		isValid := false
		for _, method := range validPaymentMethods {
			if method == orderData.PaymentMethod {
				isValid = true
				break
			}
		}
		if !isValid {
			errors = append(errors, "Phương thức thanh toán không hợp lệ")
		}
	}

	if len(errors) > 0 {
		return fmt.Errorf(errors[0])
	}

	return nil
}

// Private helper methods

// validateOrderStock validate stock trước khi tạo đơn hàng
func (os *OrderService) validateOrderStock(cartItems []models.CartItem) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Products")

	var stockErrors []string

	for _, item := range cartItems {
		var product models.Product

		// Try to find by ProductID
		filter := bson.M{"id": item.ProductID}
		err := collection.FindOne(ctx, filter).Decode(&product)

		if err != nil {
			stockErrors = append(stockErrors, fmt.Sprintf("Sản phẩm %s không còn tồn tại", item.ProductName))
		} else if product.Amount < item.Quantity {
			stockErrors = append(stockErrors, fmt.Sprintf("Sản phẩm %s chỉ còn %d trong kho", item.ProductName, product.Amount))
		}
	}

	if len(stockErrors) > 0 {
		return errors.New(stockErrors[0])
	}

	return nil
}

// updateProductStock cập nhật stock sản phẩm
func (os *OrderService) updateProductStock(cartItems []models.CartItem, multiplier int) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Products")

	for _, item := range cartItems {
		filter := bson.M{"id": item.ProductID}
		update := bson.M{
			"$inc": bson.M{"amount": multiplier * item.Quantity},
		}

		_, err := collection.UpdateOne(ctx, filter, update)
		if err != nil {
			return fmt.Errorf("lỗi khi cập nhật stock cho sản phẩm %s", item.ProductName)
		}
	}

	return nil
}

// restoreOrderStock hoàn lại stock khi hủy đơn hàng
func (os *OrderService) restoreOrderStock(orderItems []models.OrderItem) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Products")

	for _, item := range orderItems {
		filter := bson.M{"id": item.ProductID}
		update := bson.M{
			"$inc": bson.M{"amount": int(item.Total / item.Price)}, // Calculate quantity from total/price
		}

		_, err := collection.UpdateOne(ctx, filter, update)
		if err != nil {
			return fmt.Errorf("lỗi khi hoàn lại stock cho sản phẩm %s", item.ProductName)
		}
	}

	return nil
}

// generateOrderNumber tạo order number
func (os *OrderService) generateOrderNumber() string {
	date := time.Now()
	year := date.Year()
	month := int(date.Month())
	day := date.Day()
	sequence := date.Unix() % 10000 // Use unix timestamp for uniqueness

	return fmt.Sprintf("GP%d%02d%02d%04d", year, month, day, sequence)
}
