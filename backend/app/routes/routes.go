package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/mingfulsnack/app/routes/modules"
)

// SetupRoutes thiết lập tất cả routes cho API
func SetupRoutes(router *gin.Engine) {
	// API prefix
	api := router.Group("/api")

	// Health check route
	api.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "OK",
			"message": "Server is running",
		})
	})

	// Setup all module routes
	modules.SetupAuthRoutes(api)
	modules.SetupCategoryRoutes(api)
	modules.SetupProductRoutes(api)
	modules.SetupCartRoutes(api)
	modules.SetupOrderRoutes(api)
	modules.SetupWishlistRoutes(api)
	modules.SetupCompareRoutes(api)
	modules.SetupAdminRoutes(api)
}
