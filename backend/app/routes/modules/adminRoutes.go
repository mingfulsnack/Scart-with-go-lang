package modules

import (
	"github.com/gin-gonic/gin"
	"github.com/mingfulsnack/app/controllers"
	"github.com/mingfulsnack/app/middleware"
)

// SetupAdminRoutes thiết lập routes cho admin
func SetupAdminRoutes(rg *gin.RouterGroup) {
	adminController := &controllers.AdminController{}

	admin := rg.Group("/admin")
	admin.Use(middleware.AuthMiddleware()) // Tất cả admin routes đều cần auth
	{
		admin.GET("/dashboard", adminController.GetDashboardStats)
		admin.GET("/users", adminController.GetAllUsers)
		admin.PUT("/users/:id/status", adminController.UpdateUserStatus)
		admin.DELETE("/users/:id", adminController.DeleteUser)
		admin.GET("/orders/recent", adminController.GetRecentOrders)
	}
}
