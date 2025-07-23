package controllers

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/mingfulsnack/app/config"
	"github.com/mingfulsnack/app/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

type AuthController struct{}

// RegisterRequest struct for registration data
type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	FullName string `json:"full_name"`
	Phone    string `json:"phone"`
}

// LoginRequest struct for login data
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse struct for authentication response
type AuthResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Token   string      `json:"token,omitempty"`
	User    interface{} `json:"user,omitempty"`
}

// UserResponse struct for user data in response
type UserResponse struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	FullName string `json:"full_name"`
	Phone    string `json:"phone"`
	Role     string `json:"role"`
	Status   string `json:"status"`
}

// Register đăng ký tài khoản mới
func (ac *AuthController) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, AuthResponse{
			Success: false,
			Message: "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Users")

	// Kiểm tra username đã tồn tại
	var existingUser models.User
	err := collection.FindOne(ctx, bson.M{"username": req.Username}).Decode(&existingUser)
	if err == nil {
		c.JSON(http.StatusBadRequest, AuthResponse{
			Success: false,
			Message: "Username đã được sử dụng",
		})
		return
	}

	// Kiểm tra email đã tồn tại
	err = collection.FindOne(ctx, bson.M{"email": req.Email}).Decode(&existingUser)
	if err == nil {
		c.JSON(http.StatusBadRequest, AuthResponse{
			Success: false,
			Message: "Email đã được sử dụng",
		})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, AuthResponse{
			Success: false,
			Message: "Lỗi mã hóa mật khẩu",
		})
		return
	}

	// Tạo user mới
	user := models.User{
		Username:      req.Username,
		Email:         req.Email,
		Password:      string(hashedPassword),
		FullName:      req.FullName,
		Phone:         req.Phone,
		Role:          "user",
		Status:        "active",
		EmailVerified: false,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	result, err := collection.InsertOne(ctx, user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, AuthResponse{
			Success: false,
			Message: "Lỗi server trong quá trình đăng ký",
		})
		return
	}

	user.ID = result.InsertedID.(primitive.ObjectID)

	// Tạo JWT token
	token, err := ac.generateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, AuthResponse{
			Success: false,
			Message: "Lỗi tạo token",
		})
		return
	}

	// Chuẩn bị response
	userResponse := UserResponse{
		ID:       user.ID.Hex(),
		Username: user.Username,
		Email:    user.Email,
		FullName: user.FullName,
		Phone:    user.Phone,
		Role:     user.Role,
		Status:   user.Status,
	}

	c.JSON(http.StatusCreated, AuthResponse{
		Success: true,
		Message: "Đăng ký thành công",
		Token:   token,
		User:    userResponse,
	})
}

// Login đăng nhập
func (ac *AuthController) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("Login binding error: %v", err)
		c.JSON(http.StatusBadRequest, AuthResponse{
			Success: false,
			Message: "Username và password là bắt buộc",
		})
		return
	}

	log.Printf("Login attempt - Username: '%s', Password length: %d", req.Username, len(req.Password))

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Users")

	// Tìm user
	var user models.User
	err := collection.FindOne(ctx, bson.M{"username": req.Username}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			log.Printf("User not found: %s", req.Username)
			c.JSON(http.StatusUnauthorized, AuthResponse{
				Success: false,
				Message: "Tên đăng nhập hoặc mật khẩu không đúng",
			})
			return
		}
		log.Printf("Database error finding user: %v", err)
		c.JSON(http.StatusInternalServerError, AuthResponse{
			Success: false,
			Message: "Lỗi server",
		})
		return
	}

	log.Printf("User found: %s, Role: %s, Status: %s", user.Username, user.Role, user.Status)
	log.Printf("Stored password hash: %s", user.Password)
	log.Printf("Input password: %s", req.Password)

	// Kiểm tra password - hỗ trợ cả plain text và bcrypt hash
	var passwordValid bool

	// Kiểm tra xem password có được hash bằng bcrypt chưa
	if len(user.Password) >= 50 && user.Password[0] == '$' {
		// Password đã được hash bằng bcrypt
		err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
		passwordValid = (err == nil)
		if err != nil {
			log.Printf("Bcrypt password comparison failed: %v", err)
		} else {
			log.Printf("Bcrypt password comparison successful")
		}
	} else {
		// Password chưa được hash - so sánh trực tiếp (tạm thời)
		passwordValid = (user.Password == req.Password)
		if passwordValid {
			log.Printf("Plain text password comparison successful")
		} else {
			log.Printf("Plain text password comparison failed")
		}
	}

	if !passwordValid {
		c.JSON(http.StatusUnauthorized, AuthResponse{
			Success: false,
			Message: "Tên đăng nhập hoặc mật khẩu không đúng",
		})
		return
	}

	// Kiểm tra trạng thái user
	if user.Status != "active" {
		c.JSON(http.StatusUnauthorized, AuthResponse{
			Success: false,
			Message: "Tài khoản đã bị khóa",
		})
		return
	}

	// Cập nhật last login
	now := time.Now()
	user.LastLogin = &now
	collection.UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{
		"$set": bson.M{"last_login": now},
	})

	// Tạo JWT token
	token, err := ac.generateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, AuthResponse{
			Success: false,
			Message: "Lỗi tạo token",
		})
		return
	}

	// Chuẩn bị response
	userResponse := UserResponse{
		ID:       user.ID.Hex(),
		Username: user.Username,
		Email:    user.Email,
		FullName: user.FullName,
		Phone:    user.Phone,
		Role:     user.Role,
		Status:   user.Status,
	}

	c.JSON(http.StatusOK, AuthResponse{
		Success: true,
		Message: "Đăng nhập thành công",
		Token:   token,
		User:    userResponse,
	})
}

// generateToken tạo JWT token
func (ac *AuthController) generateToken(user models.User) (string, error) {
	claims := jwt.MapClaims{
		"userID":   user.ID.Hex(),
		"username": user.Username,
		"email":    user.Email,
		"role":     user.Role,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "fallback_jwt_secret_g47_project_2024"
	}

	return token.SignedString([]byte(secret))
}

// GetProfile lấy thông tin profile
func (ac *AuthController) GetProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, AuthResponse{
			Success: false,
			Message: "Unauthorized",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, AuthResponse{
			Success: false,
			Message: "Invalid user ID",
		})
		return
	}

	db := config.GetDB()
	collection := db.Collection("Users")

	var user models.User
	err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, AuthResponse{
			Success: false,
			Message: "User not found",
		})
		return
	}

	userResponse := UserResponse{
		ID:       user.ID.Hex(),
		Username: user.Username,
		Email:    user.Email,
		FullName: user.FullName,
		Phone:    user.Phone,
		Role:     user.Role,
		Status:   user.Status,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user":    userResponse,
	})
}
