package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
) // AuthMiddleware middleware để xác thực JWT token
func AuthMiddleware() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Check if the header starts with "Bearer "
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		// Extract the token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		// Parse the token (you'll need to implement this based on your JWT secret)
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Make sure the signing method is HMAC
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			// Get secret from environment variable
			secret := os.Getenv("JWT_SECRET")
			if secret == "" {
				secret = "fallback_jwt_secret_g47_project_2024"
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Extract user information from token claims
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			c.Set("userID", claims["userID"])
			c.Set("email", claims["email"])
		}

		c.Next()
	})
}

// AdminMiddleware middleware để kiểm tra quyền admin
func AdminMiddleware() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// This should be used after AuthMiddleware
		// You can get user info from the context and check if user is admin

		// TODO: Implement admin check logic
		// For now, just continue
		c.Next()
	})
}
