package modules

import (
	"github.com/gin-gonic/gin"
	"github.com/mingfulsnack/app/controllers"
	"github.com/mingfulsnack/app/middleware"
)

// SetupWishlistRoutes thiết lập routes cho wishlist
func SetupWishlistRoutes(rg *gin.RouterGroup) {
	wishlistController := &controllers.WishlistController{}

	wishlist := rg.Group("/wishlist")
	wishlist.Use(middleware.AuthMiddleware()) // Tất cả wishlist routes đều cần auth
	{
		wishlist.GET("", wishlistController.GetWishlist)
		wishlist.POST("/add", wishlistController.AddToWishlist)
		wishlist.DELETE("/remove/:productId", wishlistController.RemoveFromWishlist)
		wishlist.DELETE("/clear", wishlistController.ClearWishlist)
	}
}
