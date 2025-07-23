package modules

import (
	"github.com/gin-gonic/gin"
	"github.com/mingfulsnack/app/controllers"
	"github.com/mingfulsnack/app/middleware"
)

// SetupCategoryRoutes thiết lập routes cho categories
func SetupCategoryRoutes(rg *gin.RouterGroup) {
	categoryController := &controllers.CategoryController{}

	categories := rg.Group("/categories")
	{
		// Public routes
		categories.GET("", categoryController.GetAllCategories)
		categories.GET("/:id", categoryController.GetCategoryByID)

		// Protected routes (require authentication)
		categories.Use(middleware.AuthMiddleware())
		categories.POST("", categoryController.CreateCategory)
		categories.PUT("/:id", categoryController.UpdateCategory)
		categories.DELETE("/:id", categoryController.DeleteCategory)
	}
}
