package modules

import (
	"github.com/gin-gonic/gin"
	"github.com/mingfulsnack/app/controllers"
	"github.com/mingfulsnack/app/middleware"
)

// SetupAdminRoutes thiết lập routes cho admin
func SetupAdminRoutes(rg *gin.RouterGroup) {
	adminController := controllers.NewAdminController()

	admin := rg.Group("/admin")
	admin.Use(middleware.AuthMiddleware()) // Tất cả admin routes đều cần auth
	{
		// Dashboard
		admin.GET("/dashboard", adminController.GetDashboardStats)
		admin.GET("/stats", adminController.GetDashboardStats) // Alias for dashboard stats

		// User Management
		admin.GET("/users", adminController.GetAllUsers)
		admin.PUT("/users/:id/status", adminController.UpdateUserStatus)
		admin.DELETE("/users/:id", adminController.DeleteUser)

		// Order Management
		admin.GET("/orders", adminController.GetAllOrders)
		admin.GET("/orders/recent", adminController.GetRecentOrders)
		admin.PUT("/orders/:id/status", adminController.UpdateOrderStatus)

		// Product Management
		admin.GET("/products", adminController.GetAllProducts)
		admin.POST("/products", adminController.CreateProduct)
		admin.PUT("/products/:id", adminController.UpdateProduct)
		admin.DELETE("/products/:id", adminController.DeleteProduct)

		// Category Management
		admin.GET("/categories", adminController.GetAllCategories)
		admin.POST("/categories", adminController.CreateCategory)
		admin.PUT("/categories/:id", adminController.UpdateCategory)
		admin.DELETE("/categories/:id", adminController.DeleteCategory)
	}
}
