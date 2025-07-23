package modules

import (
	"github.com/gin-gonic/gin"
	"github.com/mingfulsnack/app/controllers"
	"github.com/mingfulsnack/app/middleware"
)

// SetupOrderRoutes thiết lập routes cho orders
func SetupOrderRoutes(rg *gin.RouterGroup) {
	orderController := &controllers.OrderController{}

	orders := rg.Group("/orders")
	orders.Use(middleware.AuthMiddleware()) // Tất cả order routes đều cần auth
	{
		orders.POST("", orderController.CreateOrder)
		orders.GET("", orderController.GetOrders)
		orders.GET("/:id", orderController.GetOrderByID)
		orders.PUT("/:id/cancel", orderController.CancelOrder)

		// Admin routes
		orders.GET("/admin/all", orderController.GetAllOrders)
		orders.PUT("/admin/:id/status", orderController.UpdateOrderStatus)
	}
}
