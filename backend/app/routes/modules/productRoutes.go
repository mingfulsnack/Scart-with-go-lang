package modules

import (
	"github.com/gin-gonic/gin"
	"github.com/mingfulsnack/app/controllers"
	"github.com/mingfulsnack/app/middleware"
)

// SetupProductRoutes thiết lập routes cho products
func SetupProductRoutes(rg *gin.RouterGroup) {
	productController := controllers.NewProductController()

	products := rg.Group("/products")
	{
		// Public routes
		products.GET("", productController.GetProducts)
		products.GET("/search", productController.SearchProducts)
		products.GET("/category/:category", productController.GetProductsByCategory)
		products.GET("/:slug/recommended", productController.GetRelatedProducts)
		products.GET("/:slug", productController.GetProductBySlug)

		// Protected routes (Admin only)
		protected := products.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.POST("", productController.CreateProduct)
			protected.PUT("/:id", productController.UpdateProduct)
			protected.DELETE("/:id", productController.DeleteProduct)
		}
	}
}
