package modules

import (
	"github.com/gin-gonic/gin"
	"github.com/mingfulsnack/app/controllers"
	"github.com/mingfulsnack/app/middleware"
)

// SetupCompareRoutes thiết lập routes cho compare
func SetupCompareRoutes(rg *gin.RouterGroup) {
	compareController := &controllers.CompareController{}

	compare := rg.Group("/compare")
	compare.Use(middleware.AuthMiddleware()) // Tất cả compare routes đều cần auth
	{
		compare.GET("", compareController.GetCompare)
		compare.POST("/add", compareController.AddToCompare)
		compare.DELETE("/remove/:productId", compareController.RemoveFromCompare)
		compare.DELETE("/clear", compareController.ClearCompare)
	}
}
