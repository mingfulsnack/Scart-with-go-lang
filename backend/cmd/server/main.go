package main

import (
	"context"
	"log"
	//"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/mingfulsnack/app/config"
	"github.com/mingfulsnack/app/models"
	"github.com/mingfulsnack/app/routes"
	"go.mongodb.org/mongo-driver/mongo"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(".env"); err != nil {
		log.Printf("Error loading .env file: %v", err)
		// Try loading from current directory
		if err2 := godotenv.Load("../../.env"); err2 != nil {
			log.Printf("Error loading ../../.env file: %v", err2)
			log.Println("Continuing without .env file")
		}
	} else {
		log.Println("Successfully loaded .env file")
	} // Connect to database
	config.ConnectDB()

	// Initialize collections and indexes
	initializeCollections()

	// Setup Gin router
	router := gin.Default()

	// Setup CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:5173"}, // Frontend URLs
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Setup routes
	routes.SetupRoutes(router)

	// Get port from environment variable or use default
	port := "5000" //os.Getenv("PORT")
	/*if port == "" {
		port = "8000"
	}*/

	log.Printf("Server starting on port %s", port)
	log.Fatal(router.Run(":" + port))
}

// initializeCollections tạo collections và indexes
func initializeCollections() {
	ctx := context.Background()
	db := config.GetDB()

	// Initialize all collections
	collections := []func(context.Context, *mongo.Database) (*mongo.Collection, error){
		models.EnsureUserCollection,
		models.EnsureCategoryCollection,
		models.EnsureProductCollection,
		models.EnsureCartCollection,
		models.EnsureOrderCollection,
		models.EnsureWishlistCollection,
		models.EnsureCompareCollection,
	}

	for _, ensureFunc := range collections {
		if _, err := ensureFunc(ctx, db); err != nil {
			log.Printf("Error initializing collection: %v", err)
		}
	}

	log.Println("All collections initialized successfully")
}
