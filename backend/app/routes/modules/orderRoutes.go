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

	// Public routes (no auth required)
	orders.GET("/number/:orderNumber", orderController.GetOrderByNumber) // Get order by number
	orders.GET("/by-email", orderController.GetOrdersByEmail)            // Get orders by email

	// Protected routes (auth required)
	orders.Use(middleware.AuthMiddleware())
	{
		orders.POST("", orderController.CreateOrder)
		orders.GET("", orderController.GetOrders)
		orders.GET("/my-orders", orderController.GetOrders) // Explicit route for my orders
		orders.GET("/:id", orderController.GetOrderByID)
		orders.PUT("/:id/cancel", orderController.CancelOrder)

		// Admin routes
		orders.GET("/admin/all", orderController.GetAllOrders)
		orders.PUT("/admin/:id/status", orderController.UpdateOrderStatus)
	}
}
