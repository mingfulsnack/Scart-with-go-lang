package controllers

import (
	"context"
	"errors"
	"time"

	"github.com/mingfulsnack/app/config"
	"github.com/mingfulsnack/app/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// CompareService handles business logic for compare operations
type CompareService struct{}

// NewCompareService creates a new instance of CompareService
func NewCompareService() *CompareService {
	return &CompareService{}
}

// CompareResult represents the result structure for compare operations
type CompareResult struct {
	Items []models.CompareItem `json:"items"`
	Count int                  `json:"count"`
}

// GetUserCompareList lấy danh sách sản phẩm so sánh của user
func (cs *CompareService) GetUserCompareList(userID string) (*models.Compare, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Convert userID to ObjectID
	userOID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("user ID không hợp lệ")
	}

	db := config.GetDB()
	collection := db.Collection("Compares")

	var compare models.Compare
	err = collection.FindOne(ctx, bson.M{"user_id": userOID}).Decode(&compare)
	if err != nil {
		// Return empty compare if not found
		return &models.Compare{
			UserID: userOID,
			Items:  []models.CompareItem{},
		}, nil
	}

	return &compare, nil
}

// ValidateUserRole kiểm tra quyền admin
func (cs *CompareService) ValidateUserRole(userRole string) error {
	if userRole == "admin" {
		return errors.New("admin không có quyền thao tác với compare")
	}
	return nil
}

// ValidateProductID validate product_id
func (cs *CompareService) ValidateProductID(productID string) error {
	if productID == "" {
		return errors.New("product_id là bắt buộc")
	}
	return nil
}

// FindProductByID tìm sản phẩm theo ID
func (cs *CompareService) FindProductByID(productID string) (*models.Product, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Convert productID to ObjectID
	productOID, err := primitive.ObjectIDFromHex(productID)
	if err != nil {
		return nil, errors.New("product ID không hợp lệ")
	}

	db := config.GetDB()
	collection := db.Collection("Products")

	var product models.Product
	err = collection.FindOne(ctx, bson.M{"_id": productOID}).Decode(&product)
	if err != nil {
		return nil, errors.New("sản phẩm không tồn tại")
	}

	return &product, nil
}

// FindOrCreateCompare tìm hoặc tạo compare mới
func (cs *CompareService) FindOrCreateCompare(userID string) (*models.Compare, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Convert userID to ObjectID
	userOID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("user ID không hợp lệ")
	}

	db := config.GetDB()
	collection := db.Collection("Compares")

	var compare models.Compare
	err = collection.FindOne(ctx, bson.M{"user_id": userOID}).Decode(&compare)
	if err != nil {
		// Create new compare if not found
		compare = models.Compare{
			UserID:    userOID,
			Items:     []models.CompareItem{},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
	}

	return &compare, nil
}

// CheckProductInCompare kiểm tra sản phẩm có trong compare không
func (cs *CompareService) CheckProductInCompare(compare *models.Compare, productID string) bool {
	for _, item := range compare.Items {
		if item.ProductID == productID {
			return true
		}
	}
	return false
}

// AddProductToCompare thêm sản phẩm vào compare
func (cs *CompareService) AddProductToCompare(userID, productID string) (*models.Compare, error) {
	// Validate input
	if err := cs.ValidateProductID(productID); err != nil {
		return nil, err
	}

	// Tìm sản phẩm
	product, err := cs.FindProductByID(productID)
	if err != nil {
		return nil, err
	}

	// Tìm hoặc tạo compare
	compare, err := cs.FindOrCreateCompare(userID)
	if err != nil {
		return nil, err
	}

	// Kiểm tra giới hạn tối đa 4 sản phẩm
	if len(compare.Items) >= 4 {
		return nil, errors.New("chỉ có thể so sánh tối đa 4 sản phẩm")
	}

	// Kiểm tra sản phẩm đã có trong compare chưa
	if cs.CheckProductInCompare(compare, productID) {
		return nil, errors.New("sản phẩm đã có trong compare list")
	}

	// Tạo item mới
	newItem := models.CompareItem{
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
	collection := db.Collection("Compares")

	if compare.ID.IsZero() {
		// Insert new compare
		compare.Items = append(compare.Items, newItem)
		result, err := collection.InsertOne(ctx, compare)
		if err != nil {
			return nil, errors.New("lỗi khi tạo danh sách so sánh")
		}
		compare.ID = result.InsertedID.(primitive.ObjectID)
	} else {
		// Update existing compare
		update := bson.M{
			"$push": bson.M{"items": newItem},
			"$set":  bson.M{"updatedAt": time.Now()},
		}

		_, err = collection.UpdateOne(ctx, bson.M{"_id": compare.ID}, update)
		if err != nil {
			return nil, errors.New("lỗi khi thêm sản phẩm vào danh sách so sánh")
		}

		compare.Items = append(compare.Items, newItem)
		compare.UpdatedAt = time.Now()
	}

	return compare, nil
}

// RemoveProductFromCompare xóa sản phẩm khỏi compare
func (cs *CompareService) RemoveProductFromCompare(userID, productID string) (*models.Compare, error) {
	compare, err := cs.GetUserCompareList(userID)
	if err != nil {
		return nil, err
	}

	if len(compare.Items) == 0 {
		return nil, errors.New("compare không tồn tại")
	}

	// Lưu số lượng items trước khi xóa để kiểm tra
	originalLength := len(compare.Items)

	// Xóa sản phẩm
	var newItems []models.CompareItem
	for _, item := range compare.Items {
		if item.ProductID != productID {
			newItems = append(newItems, item)
		}
	}

	// Kiểm tra xem có sản phẩm nào bị xóa không
	if len(newItems) == originalLength {
		return nil, errors.New("sản phẩm không có trong compare list")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Compares")

	// Convert userID to ObjectID
	userOID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("user ID không hợp lệ")
	}

	// Update database
	update := bson.M{
		"$pull": bson.M{"items": bson.M{"product_id": productID}},
		"$set":  bson.M{"updatedAt": time.Now()},
	}

	_, err = collection.UpdateOne(ctx, bson.M{"user_id": userOID}, update)
	if err != nil {
		return nil, errors.New("lỗi khi xóa sản phẩm khỏi danh sách so sánh")
	}

	compare.Items = newItems
	compare.UpdatedAt = time.Now()

	return compare, nil
}

// ClearUserCompare xóa toàn bộ compare
func (cs *CompareService) ClearUserCompare(userID string) (*models.Compare, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Convert userID to ObjectID
	userOID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("user ID không hợp lệ")
	}

	db := config.GetDB()
	collection := db.Collection("Compares")

	// Clear all items
	update := bson.M{
		"$set": bson.M{
			"items":     []models.CompareItem{},
			"updatedAt": time.Now(),
		},
	}

	_, err = collection.UpdateOne(ctx, bson.M{"user_id": userOID}, update)
	if err != nil {
		return nil, errors.New("lỗi khi xóa danh sách so sánh")
	}

	return &models.Compare{
		UserID: userOID,
		Items:  []models.CompareItem{},
	}, nil
}

// IsProductInCompare kiểm tra sản phẩm có trong compare không (cho frontend)
func (cs *CompareService) IsProductInCompare(userID, productID string) (bool, error) {
	compare, err := cs.GetUserCompareList(userID)
	if err != nil {
		return false, err
	}

	if len(compare.Items) == 0 {
		return false, nil
	}

	return cs.CheckProductInCompare(compare, productID), nil
}

// GetCompareCount lấy số lượng items trong compare
func (cs *CompareService) GetCompareCount(userID string) (int, error) {
	compare, err := cs.GetUserCompareList(userID)
	if err != nil {
		return 0, err
	}

	return len(compare.Items), nil
}
