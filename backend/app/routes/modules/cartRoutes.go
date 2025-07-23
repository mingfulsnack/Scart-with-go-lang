package modules

import (
	"github.com/gin-gonic/gin"
	"github.com/mingfulsnack/app/controllers"
	"github.com/mingfulsnack/app/middleware"
)

// SetupCartRoutes thiết lập routes cho cart
func SetupCartRoutes(rg *gin.RouterGroup) {
	cartController := &controllers.CartController{}

	cart := rg.Group("/cart")
	cart.Use(middleware.AuthMiddleware()) // Tất cả cart routes đều cần auth
	{
		cart.GET("", cartController.GetCart)
		cart.POST("/add", cartController.AddToCart)
		cart.PUT("/update/:productId", cartController.UpdateCartItem)
		cart.DELETE("/remove/:productId", cartController.RemoveFromCart)
		cart.DELETE("/clear", cartController.ClearCart)
	}
}
