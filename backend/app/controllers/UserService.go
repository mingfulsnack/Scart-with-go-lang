package controllers

import (
	"context"
	"fmt"
	"os"
	"regexp"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/mingfulsnack/app/config"
	"github.com/mingfulsnack/app/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

type UserService struct{}

// PaginatedUsers represents paginated user response
type PaginatedUsers struct {
	Users      []models.User          `json:"users"`
	Pagination map[string]interface{} `json:"pagination"`
}

// UserLoginResult represents login result with user and token
type UserLoginResult struct {
	User  models.User `json:"user"`
	Token string      `json:"token"`
}

// UserStatistics represents user statistics
type UserStatistics struct {
	TotalUsers        int64 `json:"total_users"`
	TotalAdmins       int64 `json:"total_admins"`
	TotalCustomers    int64 `json:"total_customers"`
	NewUsersThisMonth int64 `json:"new_users_this_month"`
}

// UserFilters represents filters for user queries
type UserFilters struct {
	Role   string `json:"role"`
	Search string `json:"search"`
}

// NewUserService creates a new user service instance
func NewUserService() *UserService {
	return &UserService{}
}

// GetAllUsers retrieves all users with pagination and filters (admin only)
func (us *UserService) GetAllUsers(page, limit int, filters UserFilters) (*PaginatedUsers, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Users")

	// Default values
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}

	// Build query filter
	filter := bson.M{}

	// Apply role filter
	if filters.Role != "" {
		filter["role"] = filters.Role
	}

	// Apply search filter
	if filters.Search != "" {
		filter["$or"] = []bson.M{
			{"username": bson.M{"$regex": filters.Search, "$options": "i"}},
			{"email": bson.M{"$regex": filters.Search, "$options": "i"}},
			{"full_name": bson.M{"$regex": filters.Search, "$options": "i"}},
		}
	}

	// Build sort options
	sortOptions := options.Find()
	sortOptions.SetSort(bson.D{{Key: "created_at", Value: -1}})

	// Apply pagination
	skip := (page - 1) * limit
	sortOptions.SetSkip(int64(skip)).SetLimit(int64(limit))

	// Execute query
	cursor, err := collection.Find(ctx, filter, sortOptions)
	if err != nil {
		return nil, fmt.Errorf("error finding users: %v", err)
	}
	defer cursor.Close(ctx)

	var users []models.User
	if err = cursor.All(ctx, &users); err != nil {
		return nil, fmt.Errorf("error decoding users: %v", err)
	}

	// Remove password from response
	for i := range users {
		users[i].Password = ""
	}

	// Count total documents
	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("error counting users: %v", err)
	}

	totalPages := (int(total) + limit - 1) / limit

	return &PaginatedUsers{
		Users: users,
		Pagination: map[string]interface{}{
			"current_page":   page,
			"total_pages":    totalPages,
			"total_items":    total,
			"items_per_page": limit,
		},
	}, nil
}

// GetUserByID retrieves a user by ID
func (us *UserService) GetUserByID(userID string) (*models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Users")

	objectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID format")
	}

	var user models.User
	err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("user does not exist")
		}
		return nil, fmt.Errorf("error finding user: %v", err)
	}

	// Remove password from result
	user.Password = ""
	return &user, nil
}

// RegisterUser creates a new user account
func (us *UserService) RegisterUser(userData models.User) (*models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Users")

	// Validate user data
	if err := us.validateUserData(userData, false); err != nil {
		return nil, err
	}

	// Check if username exists
	var existingUser models.User
	err := collection.FindOne(ctx, bson.M{"username": userData.Username}).Decode(&existingUser)
	if err == nil {
		return nil, fmt.Errorf("username already exists")
	} else if err != mongo.ErrNoDocuments {
		return nil, fmt.Errorf("error checking username: %v", err)
	}

	// Check if email exists
	err = collection.FindOne(ctx, bson.M{"email": userData.Email}).Decode(&existingUser)
	if err == nil {
		return nil, fmt.Errorf("email already exists")
	} else if err != mongo.ErrNoDocuments {
		return nil, fmt.Errorf("error checking email: %v", err)
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(userData.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("error hashing password: %v", err)
	}

	// Set user data with defaults
	now := time.Now()
	userData.Password = string(hashedPassword)
	userData.Role = "user" // Default role
	userData.Status = "active"
	userData.EmailVerified = false
	userData.CreatedAt = now
	userData.UpdatedAt = now

	// Insert user
	result, err := collection.InsertOne(ctx, userData)
	if err != nil {
		return nil, fmt.Errorf("error creating user: %v", err)
	}

	userData.ID = result.InsertedID.(primitive.ObjectID)
	userData.Password = "" // Remove password from response

	return &userData, nil
}

// LoginUser authenticates a user
func (us *UserService) LoginUser(username, password string) (*UserLoginResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Users")

	if username == "" || password == "" {
		return nil, fmt.Errorf("username and password are required")
	}

	// Find user by username
	var user models.User
	err := collection.FindOne(ctx, bson.M{"username": username}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("username or password is incorrect")
		}
		return nil, fmt.Errorf("error finding user: %v", err)
	}

	// Check password - support both plain text and bcrypt hash
	var passwordValid bool
	if len(user.Password) >= 50 && user.Password[0] == '$' {
		// Bcrypt hashed password
		err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
		passwordValid = (err == nil)
	} else {
		// Plain text password (legacy compatibility)
		passwordValid = (user.Password == password)
	}

	if !passwordValid {
		return nil, fmt.Errorf("username or password is incorrect")
	}

	// Check if user is active
	if user.Status != "active" {
		return nil, fmt.Errorf("account is disabled")
	}

	// Update last login
	now := time.Now()
	user.LastLogin = &now
	collection.UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{
		"$set": bson.M{"last_login": now},
	})

	// Generate JWT token
	token, err := us.generateToken(user)
	if err != nil {
		return nil, fmt.Errorf("error generating token: %v", err)
	}

	// Remove password from response
	user.Password = ""

	return &UserLoginResult{
		User:  user,
		Token: token,
	}, nil
}

// LoginAdmin authenticates an admin user
func (us *UserService) LoginAdmin(username, password string) (*UserLoginResult, error) {
	loginResult, err := us.LoginUser(username, password)
	if err != nil {
		return nil, err
	}

	if loginResult.User.Role != "admin" {
		return nil, fmt.Errorf("you do not have permission to access admin area")
	}

	return loginResult, nil
}

// UpdateUser updates user information
func (us *UserService) UpdateUser(userID string, updateData bson.M, currentUserID, currentUserRole string) (*models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Users")

	// Check permissions: user can only update themselves, admin can update anyone
	if currentUserRole != "admin" && userID != currentUserID {
		return nil, fmt.Errorf("you do not have permission to update this user")
	}

	objectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID format")
	}

	// Get current user
	var currentUser models.User
	err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&currentUser)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("user does not exist")
		}
		return nil, fmt.Errorf("error finding user: %v", err)
	}

	// Validate update data
	if email, exists := updateData["email"]; exists {
		if emailStr, ok := email.(string); ok {
			if err := us.validateEmail(emailStr); err != nil {
				return nil, err
			}
			// Check if email already exists for another user
			var existingUser models.User
			err = collection.FindOne(ctx, bson.M{"email": emailStr, "_id": bson.M{"$ne": objectID}}).Decode(&existingUser)
			if err == nil {
				return nil, fmt.Errorf("email already exists")
			}
		}
	}

	if username, exists := updateData["username"]; exists {
		if usernameStr, ok := username.(string); ok {
			if err := us.validateUsername(usernameStr); err != nil {
				return nil, err
			}
			// Check if username already exists for another user
			var existingUser models.User
			err = collection.FindOne(ctx, bson.M{"username": usernameStr, "_id": bson.M{"$ne": objectID}}).Decode(&existingUser)
			if err == nil {
				return nil, fmt.Errorf("username already exists")
			}
		}
	}

	// Hash password if provided
	if password, exists := updateData["password"]; exists {
		if passwordStr, ok := password.(string); ok {
			if err := us.validatePassword(passwordStr); err != nil {
				return nil, err
			}
			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(passwordStr), bcrypt.DefaultCost)
			if err != nil {
				return nil, fmt.Errorf("error hashing password: %v", err)
			}
			updateData["password"] = string(hashedPassword)
		}
	}

	// Regular users cannot change their role
	if currentUserRole != "admin" {
		delete(updateData, "role")
	}

	// Set updated timestamp
	updateData["updated_at"] = time.Now()

	// Update user
	update := bson.M{"$set": updateData}
	result, err := collection.UpdateOne(ctx, bson.M{"_id": objectID}, update)
	if err != nil {
		return nil, fmt.Errorf("error updating user: %v", err)
	}

	if result.MatchedCount == 0 {
		return nil, fmt.Errorf("user not found")
	}

	// Fetch and return updated user
	var updatedUser models.User
	err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&updatedUser)
	if err != nil {
		return nil, fmt.Errorf("error fetching updated user: %v", err)
	}

	updatedUser.Password = "" // Remove password from response
	return &updatedUser, nil
}

// DeleteUser removes a user (admin only)
func (us *UserService) DeleteUser(userID, currentUserRole string) error {
	if currentUserRole != "admin" {
		return fmt.Errorf("you do not have permission to delete users")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Users")

	objectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID format")
	}

	// Get user to check if it's admin
	var user models.User
	err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return fmt.Errorf("user does not exist")
		}
		return fmt.Errorf("error finding user: %v", err)
	}

	// Don't allow deleting admin users
	if user.Role == "admin" {
		return fmt.Errorf("cannot delete admin account")
	}

	// Delete user
	result, err := collection.DeleteOne(ctx, bson.M{"_id": objectID})
	if err != nil {
		return fmt.Errorf("error deleting user: %v", err)
	}

	if result.DeletedCount == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

// ChangePassword changes user password
func (us *UserService) ChangePassword(userID, currentPassword, newPassword string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Users")

	if currentPassword == "" || newPassword == "" {
		return fmt.Errorf("current password and new password are required")
	}

	objectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID format")
	}

	// Get user
	var user models.User
	err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return fmt.Errorf("user does not exist")
		}
		return fmt.Errorf("error finding user: %v", err)
	}

	// Verify current password
	var passwordValid bool
	if len(user.Password) >= 50 && user.Password[0] == '$' {
		// Bcrypt hashed password
		err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(currentPassword))
		passwordValid = (err == nil)
	} else {
		// Plain text password (legacy compatibility)
		passwordValid = (user.Password == currentPassword)
	}

	if !passwordValid {
		return fmt.Errorf("current password is incorrect")
	}

	// Validate new password
	if err := us.validatePassword(newPassword); err != nil {
		return err
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("error hashing new password: %v", err)
	}

	// Update password
	update := bson.M{
		"$set": bson.M{
			"password":   string(hashedPassword),
			"updated_at": time.Now(),
		},
	}

	_, err = collection.UpdateOne(ctx, bson.M{"_id": objectID}, update)
	if err != nil {
		return fmt.Errorf("error updating password: %v", err)
	}

	return nil
}

// GetUserStatistics returns user statistics
func (us *UserService) GetUserStatistics() (*UserStatistics, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := config.GetDB()
	collection := db.Collection("Users")

	// Count total users
	totalUsers, err := collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return nil, fmt.Errorf("error counting total users: %v", err)
	}

	// Count admins
	totalAdmins, err := collection.CountDocuments(ctx, bson.M{"role": "admin"})
	if err != nil {
		return nil, fmt.Errorf("error counting admins: %v", err)
	}

	// Count customers/regular users
	totalCustomers, err := collection.CountDocuments(ctx, bson.M{"role": "user"})
	if err != nil {
		return nil, fmt.Errorf("error counting customers: %v", err)
	}

	// Users registered in the last 30 days
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	newUsersThisMonth, err := collection.CountDocuments(ctx, bson.M{
		"created_at": bson.M{"$gte": thirtyDaysAgo},
	})
	if err != nil {
		return nil, fmt.Errorf("error counting new users: %v", err)
	}

	return &UserStatistics{
		TotalUsers:        totalUsers,
		TotalAdmins:       totalAdmins,
		TotalCustomers:    totalCustomers,
		NewUsersThisMonth: newUsersThisMonth,
	}, nil
}

// Helper methods

// generateToken creates JWT token for user
func (us *UserService) generateToken(user models.User) (string, error) {
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

// validateUserData validates user registration/update data
func (us *UserService) validateUserData(userData models.User, isUpdate bool) error {
	var errors []string

	if !isUpdate || userData.Username != "" {
		if err := us.validateUsername(userData.Username); err != nil {
			errors = append(errors, err.Error())
		}
	}

	if !isUpdate || userData.Email != "" {
		if err := us.validateEmail(userData.Email); err != nil {
			errors = append(errors, err.Error())
		}
	}

	if !isUpdate || userData.Password != "" {
		if err := us.validatePassword(userData.Password); err != nil {
			errors = append(errors, err.Error())
		}
	}

	if !isUpdate || userData.FullName != "" {
		if len(userData.FullName) < 2 {
			errors = append(errors, "full name must be at least 2 characters")
		}
	}

	if userData.Phone != "" {
		if err := us.validatePhone(userData.Phone); err != nil {
			errors = append(errors, err.Error())
		}
	}

	if len(errors) > 0 {
		return fmt.Errorf("%v", errors)
	}

	return nil
}

// validateUsername validates username format
func (us *UserService) validateUsername(username string) error {
	if len(username) < 3 {
		return fmt.Errorf("username must be at least 3 characters")
	}

	matched, err := regexp.MatchString("^[a-zA-Z0-9_]+$", username)
	if err != nil || !matched {
		return fmt.Errorf("username can only contain letters, numbers and underscores")
	}

	return nil
}

// validateEmail validates email format
func (us *UserService) validateEmail(email string) error {
	emailRegex := regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
	if !emailRegex.MatchString(email) {
		return fmt.Errorf("invalid email format")
	}
	return nil
}

// validatePassword validates password strength
func (us *UserService) validatePassword(password string) error {
	if len(password) < 6 {
		return fmt.Errorf("password must be at least 6 characters")
	}
	return nil
}

// validatePhone validates phone number format
func (us *UserService) validatePhone(phone string) error {
	phoneRegex := regexp.MustCompile(`^[0-9]{10,11}$`)
	if !phoneRegex.MatchString(phone) {
		return fmt.Errorf("invalid phone number format")
	}
	return nil
}

// ValidateAdminRole checks if user has admin role
func (us *UserService) ValidateAdminRole(userRole string) error {
	if userRole != "admin" {
		return fmt.Errorf("you do not have permission to perform this action")
	}
	return nil
}
