package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mingfulsnack/app/models"
	"go.mongodb.org/mongo-driver/bson"
)

type AuthController struct {
	userService *UserService
}

// NewAuthController creates a new auth controller instance
func NewAuthController() *AuthController {
	return &AuthController{
		userService: NewUserService(),
	}
}

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

	// Create user data
	userData := models.User{
		Username: req.Username,
		Email:    req.Email,
		Password: req.Password,
		FullName: req.FullName,
		Phone:    req.Phone,
	}

	// Call service method
	createdUser, err := ac.userService.RegisterUser(userData)
	if err != nil {
		c.JSON(http.StatusBadRequest, AuthResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	// Generate JWT token
	loginResult, err := ac.userService.LoginUser(req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, AuthResponse{
			Success: false,
			Message: "Lỗi tạo token: " + err.Error(),
		})
		return
	}

	// Prepare response
	userResponse := UserResponse{
		ID:       createdUser.ID.Hex(),
		Username: createdUser.Username,
		Email:    createdUser.Email,
		FullName: createdUser.FullName,
		Phone:    createdUser.Phone,
		Role:     createdUser.Role,
		Status:   createdUser.Status,
	}

	c.JSON(http.StatusCreated, AuthResponse{
		Success: true,
		Message: "Đăng ký thành công",
		Token:   loginResult.Token,
		User:    userResponse,
	})
}

// Login đăng nhập
func (ac *AuthController) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, AuthResponse{
			Success: false,
			Message: "Username và password là bắt buộc",
		})
		return
	}

	// Call service method
	loginResult, err := ac.userService.LoginUser(req.Username, req.Password)
	if err != nil {
		if err.Error() == "username or password is incorrect" {
			c.JSON(http.StatusUnauthorized, AuthResponse{
				Success: false,
				Message: "Tên đăng nhập hoặc mật khẩu không đúng",
			})
		} else if err.Error() == "account is disabled" {
			c.JSON(http.StatusUnauthorized, AuthResponse{
				Success: false,
				Message: "Tài khoản đã bị khóa",
			})
		} else {
			c.JSON(http.StatusInternalServerError, AuthResponse{
				Success: false,
				Message: "Lỗi server: " + err.Error(),
			})
		}
		return
	}

	// Prepare response
	userResponse := UserResponse{
		ID:       loginResult.User.ID.Hex(),
		Username: loginResult.User.Username,
		Email:    loginResult.User.Email,
		FullName: loginResult.User.FullName,
		Phone:    loginResult.User.Phone,
		Role:     loginResult.User.Role,
		Status:   loginResult.User.Status,
	}

	c.JSON(http.StatusOK, AuthResponse{
		Success: true,
		Message: "Đăng nhập thành công",
		Token:   loginResult.Token,
		User:    userResponse,
	})
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

	// Call service method
	user, err := ac.userService.GetUserByID(userID.(string))
	if err != nil {
		if err.Error() == "user does not exist" {
			c.JSON(http.StatusNotFound, AuthResponse{
				Success: false,
				Message: "User not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, AuthResponse{
				Success: false,
				Message: "Lỗi server: " + err.Error(),
			})
		}
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

// UpdateProfile cập nhật thông tin profile
func (ac *AuthController) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Unauthorized",
		})
		return
	}

	var updateData bson.M
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	userRole, _ := c.Get("userRole")

	// Call service method
	updatedUser, err := ac.userService.UpdateUser(userID.(string), updateData, userID.(string), userRole.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Cập nhật thông tin thành công",
		"user":    updatedUser,
	})
}

// ChangePassword đổi mật khẩu
func (ac *AuthController) ChangePassword(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Unauthorized",
		})
		return
	}

	var req struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Vui lòng nhập đầy đủ mật khẩu cũ và mới",
		})
		return
	}

	// Call service method
	err := ac.userService.ChangePassword(userID.(string), req.CurrentPassword, req.NewPassword)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đổi mật khẩu thành công",
	})
}
