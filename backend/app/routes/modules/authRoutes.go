package modules

import (
	"github.com/gin-gonic/gin"
	"github.com/mingfulsnack/app/controllers"
	"github.com/mingfulsnack/app/middleware"
)

// SetupAuthRoutes thiết lập routes cho authentication
func SetupAuthRoutes(rg *gin.RouterGroup) {
	authController := controllers.NewAuthController()

	auth := rg.Group("/auth")
	{
		// Public routes
		auth.POST("/register", authController.Register)
		auth.POST("/login", authController.Login)

		// Protected routes
		protected := auth.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/profile", authController.GetProfile)
			protected.PUT("/profile", authController.UpdateProfile)
			protected.POST("/change-password", authController.ChangePassword)
		}
	}
}
