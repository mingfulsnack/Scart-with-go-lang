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

// WishlistService handles business logic for wishlist operations
type WishlistService struct{}

// NewWishlistService creates a new instance of WishlistService
func NewWishlistService() *WishlistService {
	return &WishlistService{}
}

// WishlistResult represents the result structure for wishlist operations
type WishlistResult struct {
	Items []models.WishlistItem `json:"items"`
	Count int                   `json:"count"`
}

// GetUserWishlist lấy wishlist của user
func (ws *WishlistService) GetUserWishlist(userID string) (*WishlistResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Convert userID to ObjectID
	userOID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("user ID không hợp lệ")
	}

	db := config.GetDB()
	collection := db.Collection("Wishlists")

	var wishlist models.Wishlist
	err = collection.FindOne(ctx, bson.M{"user_id": userOID}).Decode(&wishlist)
	if err != nil {
		// Return empty wishlist if not found
		return &WishlistResult{
			Items: []models.WishlistItem{},
			Count: 0,
		}, nil
	}

	return &WishlistResult{
		Items: wishlist.Items,
		Count: len(wishlist.Items),
	}, nil
}

// ValidateUserRole kiểm tra quyền admin
func (ws *WishlistService) ValidateUserRole(userRole string) error {
	if userRole == "admin" {
		return errors.New("admin không có quyền thao tác với wishlist")
	}
	return nil
}

// ValidateProductID validate product_id
func (ws *WishlistService) ValidateProductID(productID string) error {
	if productID == "" {
		return errors.New("product_id là bắt buộc")
	}
	return nil
}

// FindProductByID tìm sản phẩm theo ID
func (ws *WishlistService) FindProductByID(productID string) (*models.Product, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Products")

	var product models.Product
	// Search by the 'id' field (not '_id') which contains product IDs like "P001", "P002", etc.
	err := collection.FindOne(ctx, bson.M{"id": productID}).Decode(&product)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("sản phẩm không tồn tại")
		}
		return nil, fmt.Errorf("lỗi tìm kiếm sản phẩm: %v", err)
	}

	return &product, nil
}

// FindOrCreateWishlist tìm hoặc tạo wishlist mới
func (ws *WishlistService) FindOrCreateWishlist(userID string) (*models.Wishlist, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Convert userID to ObjectID
	userOID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("user ID không hợp lệ")
	}

	db := config.GetDB()
	collection := db.Collection("Wishlists")

	var wishlist models.Wishlist
	err = collection.FindOne(ctx, bson.M{"user_id": userOID}).Decode(&wishlist)
	if err != nil {
		// Create new wishlist if not found
		wishlist = models.Wishlist{
			UserID:    userOID,
			Items:     []models.WishlistItem{},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
	}

	return &wishlist, nil
}

// CheckProductInWishlist kiểm tra sản phẩm có trong wishlist không
func (ws *WishlistService) CheckProductInWishlist(wishlist *models.Wishlist, productID string) bool {
	for _, item := range wishlist.Items {
		if item.ProductID == productID {
			return true
		}
	}
	return false
}

// AddProductToWishlist thêm sản phẩm vào wishlist
func (ws *WishlistService) AddProductToWishlist(userID, productID string) (*WishlistResult, error) {
	// Validate input
	if err := ws.ValidateProductID(productID); err != nil {
		return nil, err
	}

	// Tìm sản phẩm
	product, err := ws.FindProductByID(productID)
	if err != nil {
		return nil, err
	}

	// Tìm hoặc tạo wishlist
	wishlist, err := ws.FindOrCreateWishlist(userID)
	if err != nil {
		return nil, err
	}

	// Kiểm tra sản phẩm đã có trong wishlist chưa
	if ws.CheckProductInWishlist(wishlist, productID) {
		return nil, errors.New("sản phẩm đã có trong wishlist")
	}

	// Tạo item mới
	newItem := models.WishlistItem{
		ProductID:    productID,
		ProductName:  product.Name,
		ProductImage: product.Image,
		ProductSlug:  product.Slug,
		Price:        product.Price,
		AddedAt:      time.Now(),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Wishlists")

	if wishlist.ID.IsZero() {
		// Insert new wishlist
		wishlist.Items = append(wishlist.Items, newItem)
		result, err := collection.InsertOne(ctx, wishlist)
		if err != nil {
			return nil, errors.New("lỗi khi tạo wishlist")
		}
		wishlist.ID = result.InsertedID.(primitive.ObjectID)
	} else {
		// Update existing wishlist
		update := bson.M{
			"$push": bson.M{"items": newItem},
			"$set":  bson.M{"updatedAt": time.Now()},
		}

		_, err = collection.UpdateOne(ctx, bson.M{"_id": wishlist.ID}, update)
		if err != nil {
			return nil, errors.New("lỗi khi cập nhật wishlist")
		}

		wishlist.Items = append(wishlist.Items, newItem)
		wishlist.UpdatedAt = time.Now()
	}

	return &WishlistResult{
		Items: wishlist.Items,
		Count: len(wishlist.Items),
	}, nil
}

// RemoveProductFromWishlist xóa sản phẩm khỏi wishlist
func (ws *WishlistService) RemoveProductFromWishlist(userID, productID string) (*WishlistResult, error) {
	wishlist, err := ws.GetUserWishlist(userID)
	if err != nil {
		return nil, err
	}

	if len(wishlist.Items) == 0 {
		return nil, errors.New("wishlist không tồn tại")
	}

	// Lưu số lượng items trước khi xóa để kiểm tra
	originalLength := len(wishlist.Items)

	// Xóa sản phẩm
	var newItems []models.WishlistItem
	for _, item := range wishlist.Items {
		if item.ProductID != productID {
			newItems = append(newItems, item)
		}
	}

	// Kiểm tra xem có sản phẩm nào bị xóa không
	if len(newItems) == originalLength {
		return nil, errors.New("sản phẩm không có trong wishlist")
	}

	// Convert userID to ObjectID
	userOID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("user ID không hợp lệ")
	}

	// Update database
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Wishlists")

	update := bson.M{
		"$set": bson.M{
			"items":     newItems,
			"updatedAt": time.Now(),
		},
	}

	_, err = collection.UpdateOne(ctx, bson.M{"user_id": userOID}, update)
	if err != nil {
		return nil, errors.New("lỗi khi cập nhật wishlist")
	}

	return &WishlistResult{
		Items: newItems,
		Count: len(newItems),
	}, nil
}

// ClearUserWishlist xóa toàn bộ wishlist
func (ws *WishlistService) ClearUserWishlist(userID string) (*WishlistResult, error) {
	// Convert userID to ObjectID
	userOID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("user ID không hợp lệ")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Wishlists")

	update := bson.M{
		"$set": bson.M{
			"items":     []models.WishlistItem{},
			"updatedAt": time.Now(),
		},
	}

	// Use upsert to create if doesn't exist
	_, err = collection.UpdateOne(
		ctx,
		bson.M{"user_id": userOID},
		update,
		// options.Update().SetUpsert(true) - can add this if needed
	)
	if err != nil {
		return nil, errors.New("lỗi khi xóa wishlist")
	}

	return &WishlistResult{
		Items: []models.WishlistItem{},
		Count: 0,
	}, nil
}

// IsProductInWishlist kiểm tra sản phẩm có trong wishlist không (cho frontend)
func (ws *WishlistService) IsProductInWishlist(userID, productID string) (bool, error) {
	wishlist, err := ws.GetUserWishlist(userID)
	if err != nil {
		return false, err
	}

	if len(wishlist.Items) == 0 {
		return false, nil
	}

	for _, item := range wishlist.Items {
		if item.ProductID == productID {
			return true, nil
		}
	}

	return false, nil
}

// GetWishlistCount lấy số lượng items trong wishlist
func (ws *WishlistService) GetWishlistCount(userID string) (int, error) {
	wishlist, err := ws.GetUserWishlist(userID)
	if err != nil {
		return 0, err
	}

	return wishlist.Count, nil
}
