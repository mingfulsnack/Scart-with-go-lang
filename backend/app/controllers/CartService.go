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
)

type CartService struct{}

type CartResult struct {
	Items       []models.CartItem `json:"items"`
	TotalAmount float64           `json:"total_amount"`
	TotalItems  int               `json:"total_items"`
}

type StockValidationItem struct {
	ProductID      string `json:"product_id"`
	Quantity       int    `json:"quantity"`
	AvailableStock int    `json:"available_stock"`
	Valid          bool   `json:"valid"`
}

type StockValidationResult struct {
	Valid bool                  `json:"valid"`
	Items []StockValidationItem `json:"items"`
}

// ValidateUserRole kiểm tra quyền admin
func (cs *CartService) ValidateUserRole(userRole string) error {
	if userRole == "admin" {
		return errors.New("admin không có quyền thao tác với giỏ hàng")
	}
	return nil
}

// ValidateCartInput validate input data
func (cs *CartService) ValidateCartInput(productID string, quantity int) error {
	if productID == "" {
		return errors.New("product_id là bắt buộc")
	}

	if quantity <= 0 {
		return errors.New("số lượng phải lớn hơn 0")
	}

	return nil
}

// ValidateProduct tìm sản phẩm và kiểm tra tồn kho
func (cs *CartService) ValidateProduct(productID string, requestedQuantity int) (*models.Product, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Products")

	var product models.Product
	var filter bson.M

	// Try to find by ObjectID first, then by string ID
	if objectID, err := primitive.ObjectIDFromHex(productID); err == nil {
		filter = bson.M{"_id": objectID}
	} else {
		filter = bson.M{"id": productID}
	}

	err := collection.FindOne(ctx, filter).Decode(&product)
	if err != nil {
		return nil, errors.New("sản phẩm không tồn tại")
	}

	if product.Amount < requestedQuantity {
		return nil, fmt.Errorf("sản phẩm chỉ còn %d trong kho", product.Amount)
	}

	return &product, nil
}

// FindOrCreateCart tìm hoặc tạo giỏ hàng mới
func (cs *CartService) FindOrCreateCart(userID string) (*models.Cart, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}

	db := config.GetDB()
	collection := db.Collection("Carts")

	var cart models.Cart
	err = collection.FindOne(ctx, bson.M{
		"user_id":   userObjectID,
		"cart_type": "cart",
	}).Decode(&cart)

	if err == mongo.ErrNoDocuments {
		// Create new cart
		cart = models.Cart{
			UserID:      userObjectID,
			CartType:    "cart",
			Items:       []models.CartItem{},
			TotalItems:  0,
			TotalAmount: 0,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
	} else if err != nil {
		return nil, err
	}

	return &cart, nil
}

// CalculateCartTotals tính toán lại tổng tiền và số lượng
func (cs *CartService) CalculateCartTotals(cart *models.Cart) {
	// Calculate total for each item first
	for i := range cart.Items {
		cart.Items[i].Total = cart.Items[i].Price * float64(cart.Items[i].Quantity)
	}

	cart.TotalAmount = 0
	cart.TotalItems = 0
	for _, item := range cart.Items {
		cart.TotalAmount += item.Total
		cart.TotalItems += item.Quantity
	}
}

// FindCartItem tìm item trong giỏ hàng
func (cs *CartService) FindCartItem(cart *models.Cart, productID string) *models.CartItem {
	for i := range cart.Items {
		if cart.Items[i].ProductID == productID {
			return &cart.Items[i]
		}
	}
	return nil
}

// SaveCart lưu giỏ hàng vào database
func (cs *CartService) SaveCart(cart *models.Cart) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Carts")

	cart.UpdatedAt = time.Now()

	if cart.ID.IsZero() {
		result, err := collection.InsertOne(ctx, cart)
		if err != nil {
			return err
		}
		cart.ID = result.InsertedID.(primitive.ObjectID)
	} else {
		_, err := collection.ReplaceOne(ctx, bson.M{"_id": cart.ID}, cart)
		if err != nil {
			return err
		}
	}

	return nil
}

// GetUserCart lấy giỏ hàng của user
func (cs *CartService) GetUserCart(userID, userRole string) (*CartResult, error) {
	// Kiểm tra quyền admin
	if err := cs.ValidateUserRole(userRole); err != nil {
		return nil, err
	}

	cart, err := cs.FindOrCreateCart(userID)
	if err != nil {
		return nil, err
	}

	return &CartResult{
		Items:       cart.Items,
		TotalAmount: cart.TotalAmount,
		TotalItems:  cart.TotalItems,
	}, nil
}

// AddToCart thêm sản phẩm vào giỏ hàng
func (cs *CartService) AddToCart(userID, userRole, productID string, quantity int) (*CartResult, error) {
	// Kiểm tra quyền admin
	if err := cs.ValidateUserRole(userRole); err != nil {
		return nil, err
	}

	// Validate input
	if err := cs.ValidateCartInput(productID, quantity); err != nil {
		return nil, err
	}

	// Validate product
	product, err := cs.ValidateProduct(productID, quantity)
	if err != nil {
		return nil, err
	}

	// Tìm hoặc tạo giỏ hàng
	cart, err := cs.FindOrCreateCart(userID)
	if err != nil {
		return nil, err
	}

	// Kiểm tra sản phẩm đã có trong giỏ hàng chưa
	existingItem := cs.FindCartItem(cart, productID)

	if existingItem != nil {
		// Kiểm tra tổng số lượng sau khi cộng thêm
		newQuantity := existingItem.Quantity + quantity
		if product.Amount < newQuantity {
			return nil, fmt.Errorf("sản phẩm chỉ còn %d trong kho", product.Amount)
		}

		existingItem.Quantity = newQuantity
		existingItem.Total = existingItem.Price * float64(newQuantity)
	} else {
		// Thêm sản phẩm mới
		newItem := models.CartItem{
			ProductID:    product.ProductID,
			ProductName:  product.Name,
			ProductImage: product.Image,
			ProductSlug:  product.Slug,
			Price:        product.Price,
			Quantity:     quantity,
			Total:        product.Price * float64(quantity),
		}

		cart.Items = append(cart.Items, newItem)
	}

	// Tính toán lại tổng
	cs.CalculateCartTotals(cart)

	// Lưu cart
	if err := cs.SaveCart(cart); err != nil {
		return nil, err
	}

	return &CartResult{
		Items:       cart.Items,
		TotalAmount: cart.TotalAmount,
		TotalItems:  cart.TotalItems,
	}, nil
}

// UpdateCartItem cập nhật số lượng sản phẩm trong giỏ hàng
func (cs *CartService) UpdateCartItem(userID, userRole, productID string, quantity int) (*CartResult, error) {
	// Kiểm tra quyền admin
	if err := cs.ValidateUserRole(userRole); err != nil {
		return nil, err
	}

	// Validate input
	if err := cs.ValidateCartInput(productID, quantity); err != nil {
		return nil, err
	}

	// Validate product
	_, err := cs.ValidateProduct(productID, quantity)
	if err != nil {
		return nil, err
	}

	cart, err := cs.FindOrCreateCart(userID)
	if err != nil {
		return nil, err
	}

	if len(cart.Items) == 0 {
		return nil, errors.New("giỏ hàng không tồn tại")
	}

	existingItem := cs.FindCartItem(cart, productID)
	if existingItem == nil {
		return nil, errors.New("sản phẩm không có trong giỏ hàng")
	}

	existingItem.Quantity = quantity
	existingItem.Total = existingItem.Price * float64(quantity)

	// Tính toán lại tổng
	cs.CalculateCartTotals(cart)

	// Lưu cart
	if err := cs.SaveCart(cart); err != nil {
		return nil, err
	}

	return &CartResult{
		Items:       cart.Items,
		TotalAmount: cart.TotalAmount,
		TotalItems:  cart.TotalItems,
	}, nil
}

// RemoveFromCart xóa sản phẩm khỏi giỏ hàng
func (cs *CartService) RemoveFromCart(userID, userRole, productID string) (*CartResult, error) {
	// Kiểm tra quyền admin
	if err := cs.ValidateUserRole(userRole); err != nil {
		return nil, err
	}

	cart, err := cs.FindOrCreateCart(userID)
	if err != nil {
		return nil, err
	}

	if len(cart.Items) == 0 {
		return nil, errors.New("giỏ hàng không tồn tại")
	}

	originalLength := len(cart.Items)
	newItems := make([]models.CartItem, 0)
	for _, item := range cart.Items {
		if item.ProductID != productID {
			newItems = append(newItems, item)
		}
	}
	cart.Items = newItems

	if len(cart.Items) == originalLength {
		return nil, errors.New("sản phẩm không có trong giỏ hàng")
	}

	// Tính toán lại tổng
	cs.CalculateCartTotals(cart)

	// Lưu cart
	if err := cs.SaveCart(cart); err != nil {
		return nil, err
	}

	return &CartResult{
		Items:       cart.Items,
		TotalAmount: cart.TotalAmount,
		TotalItems:  cart.TotalItems,
	}, nil
}

// ClearCart xóa toàn bộ giỏ hàng
func (cs *CartService) ClearCart(userID, userRole string) (*CartResult, error) {
	// Kiểm tra quyền admin
	if err := cs.ValidateUserRole(userRole); err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}

	db := config.GetDB()
	collection := db.Collection("Carts")

	err = collection.FindOneAndUpdate(
		ctx,
		bson.M{
			"user_id":   userObjectID,
			"cart_type": "cart",
		},
		bson.M{
			"$set": bson.M{
				"items":        []models.CartItem{},
				"total_amount": 0,
				"total_items":  0,
				"updatedAt":    time.Now(),
			},
		},
	).Decode(&models.Cart{})

	if err != nil && err != mongo.ErrNoDocuments {
		return nil, err
	}

	return &CartResult{
		Items:       []models.CartItem{},
		TotalAmount: 0,
		TotalItems:  0,
	}, nil
}

// GetCartCount lấy số lượng items trong giỏ hàng
func (cs *CartService) GetCartCount(userID string) (int, error) {
	cart, err := cs.FindOrCreateCart(userID)
	if err != nil {
		return 0, err
	}
	return cart.TotalItems, nil
}

// ValidateCartStock kiểm tra và cập nhật giỏ hàng với stock hiện tại
func (cs *CartService) ValidateCartStock(userID string) (*StockValidationResult, error) {
	cart, err := cs.FindOrCreateCart(userID)
	if err != nil {
		return nil, err
	}

	if len(cart.Items) == 0 {
		return &StockValidationResult{
			Valid: true,
			Items: []StockValidationItem{},
		}, nil
	}

	items := make([]StockValidationItem, 0)
	allValid := true

	for _, item := range cart.Items {
		product, err := cs.ValidateProduct(item.ProductID, 0) // Just check if product exists
		isValid := err == nil && product != nil && product.Amount >= item.Quantity

		if !isValid {
			allValid = false
		}

		availableStock := 0
		if product != nil {
			availableStock = product.Amount
		}

		items = append(items, StockValidationItem{
			ProductID:      item.ProductID,
			Quantity:       item.Quantity,
			AvailableStock: availableStock,
			Valid:          isValid,
		})
	}

	return &StockValidationResult{
		Valid: allValid,
		Items: items,
	}, nil
}

// NewCartService creates a new instance of CartService
func NewCartService() *CartService {
	return &CartService{}
}
