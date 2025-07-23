package middleware

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/mingfulsnack/app/config"
	"github.com/mingfulsnack/app/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AuthMiddleware middleware để xác thực JWT token
// AuthMiddleware middleware để xác thực JWT token
func AuthMiddleware() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "No authentication token provided",
			})
			c.Abort()
			return
		}

		// Check if the header starts with "Bearer "
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "Invalid authorization header format",
			})
			c.Abort()
			return
		}

		// Extract the token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		// Remove any extra quotes from token
		tokenString = strings.Trim(tokenString, "\"")

		log.Printf("Verifying token: %s...", tokenString[:min(20, len(tokenString))])

		// Get JWT secret
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			secret = "fallback_jwt_secret_g47_project_2024"
		}

		// Parse the token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Make sure the signing method is HMAC
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				log.Printf("Invalid signing method: %v", token.Header["alg"])
				return nil, fmt.Errorf("invalid signing method")
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			log.Printf("JWT verify error: %v", err)
			log.Printf("Token was: %s...", tokenString[:min(50, len(tokenString))])
			log.Printf("JWT_SECRET length: %d", len(secret))

			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// Extract user information from token claims
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			userID := claims["userID"]
			email := claims["email"]
			username := claims["username"]
			role := claims["role"]

			log.Printf("Auth successful for user: %v with role: %v", username, role)

			// Set user information in context
			c.Set("userID", userID)
			c.Set("email", email)
			c.Set("username", username)
			c.Set("role", role)
		}

		c.Next()
	})
}

// OptionalAuthMiddleware - sets user info if token exists, but continues if no token (for guest checkout)
func OptionalAuthMiddleware() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// No token provided - continue without setting user info (guest)
			c.Set("user", nil)
			c.Next()
			return
		}

		// Check if the header starts with "Bearer "
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.Set("user", nil)
			c.Next()
			return
		}

		// Extract the token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		tokenString = strings.Trim(tokenString, "\"")

		log.Printf("Verifying optional token: %s...", tokenString[:min(20, len(tokenString))])

		// Get JWT secret
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			secret = "fallback_jwt_secret_g47_project_2024"
		}

		// Parse the token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("invalid signing method")
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			log.Printf("JWT verify error (optional): %v", err)
			// Invalid token - continue as guest
			c.Set("user", nil)
			c.Next()
			return
		}

		// Extract user information from token claims
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			userID := claims["userID"]
			email := claims["email"]
			username := claims["username"]
			role := claims["role"]

			log.Printf("Optional auth successful for user: %v", username)

			// Set user information in context
			c.Set("userID", userID)
			c.Set("email", email)
			c.Set("username", username)
			c.Set("role", role)
		}

		c.Next()
	})
}

// AuthWithRoleMiddleware middleware để xác thực JWT token với role cụ thể
func AuthWithRoleMiddleware(requiredRole string) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// First run the regular auth middleware logic
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "No authentication token provided",
			})
			c.Abort()
			return
		}

		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "Invalid authorization header format",
			})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		tokenString = strings.Trim(tokenString, "\"")

		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			secret = "fallback_jwt_secret_g47_project_2024"
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("invalid signing method")
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// Extract and validate role
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			userRole, ok := claims["role"].(string)
			if !ok {
				c.JSON(http.StatusForbidden, gin.H{
					"success": false,
					"message": "Role information missing in token",
				})
				c.Abort()
				return
			}

			// Check if user has required role
			if requiredRole != "" && userRole != requiredRole {
				c.JSON(http.StatusForbidden, gin.H{
					"success": false,
					"message": fmt.Sprintf("Access denied. Required role: %s, user role: %s", requiredRole, userRole),
				})
				c.Abort()
				return
			}

			// Set user information in context
			c.Set("userID", claims["userID"])
			c.Set("email", claims["email"])
			c.Set("username", claims["username"])
			c.Set("role", claims["role"])
		}

		c.Next()
	})
}

// AdminMiddleware middleware để kiểm tra quyền admin
func AdminMiddleware() gin.HandlerFunc {
	return AuthWithRoleMiddleware("admin")
}

// CustomerMiddleware middleware để kiểm tra quyền customer (bao gồm cả user và customer role)
func CustomerMiddleware() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// First run auth middleware
		AuthMiddleware()(c)
		if c.IsAborted() {
			return
		}

		role, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": "Role information missing",
			})
			c.Abort()
			return
		}

		userRole := role.(string)
		if userRole != "customer" && userRole != "user" {
			c.JSON(http.StatusForbidden, gin.H{
				"success":        false,
				"message":        "Yêu cầu quyền customer hoặc user để truy cập",
				"required_roles": []string{"customer", "user"},
				"your_role":      userRole,
			})
			c.Abort()
			return
		}

		c.Next()
	})
}

// StaffOrAdminMiddleware middleware để kiểm tra quyền staff hoặc admin
func StaffOrAdminMiddleware() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// First run auth middleware
		AuthMiddleware()(c)
		if c.IsAborted() {
			return
		}

		role, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": "Role information missing",
			})
			c.Abort()
			return
		}

		userRole := role.(string)
		if userRole != "admin" && userRole != "staff" {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": "Yêu cầu quyền staff hoặc admin",
			})
			c.Abort()
			return
		}

		c.Next()
	})
}

// ValidateOrderAccess middleware để kiểm tra quyền truy cập đơn hàng
func ValidateOrderAccess() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		orderID := c.Param("id")
		if orderID == "" {
			orderID = c.Param("orderId")
		}

		if orderID == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Order ID is required",
			})
			c.Abort()
			return
		}

		// Check if orderID is valid ObjectID
		orderOID, err := primitive.ObjectIDFromHex(orderID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "ID đơn hàng không hợp lệ",
			})
			c.Abort()
			return
		}

		// Get order from database
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		db := config.GetDB()
		collection := db.Collection("Orders")

		var order models.Order
		err = collection.FindOne(ctx, bson.M{"_id": orderOID}).Decode(&order)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Không tìm thấy đơn hàng",
			})
			c.Abort()
			return
		}

		// Check access permissions
		userRole, _ := c.Get("role")
		userID, _ := c.Get("userID")

		// Admin và staff có thể truy cập tất cả đơn hàng
		if userRole == "admin" || userRole == "staff" {
			c.Set("order", order)
			c.Next()
			return
		}

		// Customer chỉ có thể truy cập đơn hàng của mình
		if userRole == "customer" || userRole == "user" {
			userIDStr := userID.(string)
			userOID, err := primitive.ObjectIDFromHex(userIDStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"success": false,
					"message": "User ID không hợp lệ",
				})
				c.Abort()
				return
			}

			if order.UserID == nil || *order.UserID != userOID {
				c.JSON(http.StatusForbidden, gin.H{
					"success": false,
					"message": "Không có quyền truy cập đơn hàng này",
				})
				c.Abort()
				return
			}

			c.Set("order", order)
			c.Next()
			return
		}

		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "Không có quyền truy cập",
		})
		c.Abort()
	})
}

// ValidateProduct middleware để kiểm tra sản phẩm tồn tại và active
func ValidateProduct() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		productID := c.Param("id")
		if productID == "" {
			productID = c.Param("productId")
		}

		if productID == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Product ID is required",
			})
			c.Abort()
			return
		}

		// Check if productID is valid ObjectID
		productOID, err := primitive.ObjectIDFromHex(productID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "ID sản phẩm không hợp lệ",
			})
			c.Abort()
			return
		}

		// Get product from database
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		db := config.GetDB()
		collection := db.Collection("Products")

		var product models.Product
		err = collection.FindOne(ctx, bson.M{"_id": productOID}).Decode(&product)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Không tìm thấy sản phẩm",
			})
			c.Abort()
			return
		}

		// Check if product is active (admin can access inactive products)
		// Note: Product model doesn't have Status field, so we'll skip this check for now
		userRole, _ := c.Get("role")

		// For now, all products are considered active unless we add a Status field to Product model
		_ = userRole // Use the variable to avoid unused variable error

		c.Set("product", product)
		c.Next()
	})
}

// CheckCancellationDeadline middleware để kiểm tra thời hạn hủy đơn hàng
func CheckCancellationDeadline() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		orderInterface, exists := c.Get("order")
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Order information missing",
			})
			c.Abort()
			return
		}

		order := orderInterface.(models.Order)

		// Chỉ cho phép hủy đơn hàng có status pending hoặc confirmed
		if order.Status != "pending" && order.Status != "confirmed" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Chỉ có thể hủy đơn hàng ở trạng thái chờ xử lý hoặc đã xác nhận",
			})
			c.Abort()
			return
		}

		// Admin có thể hủy đơn hàng bất kỳ lúc nào
		userRole, _ := c.Get("role")
		if userRole == "admin" {
			c.Next()
			return
		}

		// Customer chỉ có thể hủy trong vòng 2 giờ sau khi đặt hàng
		cancellationDeadline := order.CreatedAt.Add(2 * time.Hour)

		if time.Now().After(cancellationDeadline) {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Đã quá thời hạn hủy đơn hàng (2 giờ sau khi đặt hàng)",
			})
			c.Abort()
			return
		}

		c.Next()
	})
}

// Helper function for min
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
