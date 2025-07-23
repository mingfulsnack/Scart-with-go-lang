package config

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var DB *mongo.Database

// ConnectDB kết nối tới MongoDB
func ConnectDB() {
	// Debug: Print all environment variables related to MongoDB
	log.Printf("MONGODB_URI from env: '%s'", os.Getenv("MONGODB_URI"))
	log.Printf("DB_NAME from env: '%s'", os.Getenv("DB_NAME"))

	// Lấy MongoDB URI từ environment variable hoặc sử dụng default
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		log.Println("MONGODB_URI not found in environment, using default connection")
		mongoURI = "mongodb+srv://minhnk2004:1952004@minhnk2004.behaj.mongodb.net/G47?retryWrites=true&w=majority"
	}
	log.Printf("Using MongoDB URI: %s", mongoURI)

	// Tạo context với timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Connect tới MongoDB
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}

	// Ping database để kiểm tra kết nối
	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatal("Failed to ping MongoDB:", err)
	}

	// Lấy database name từ environment variable
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "G47" // fallback database name
	}

	DB = client.Database(dbName)

	// Log thông tin kết nối thành công
	fmt.Printf("Connected to MongoDB!\n")
	fmt.Printf("Connected to database: %s\n", dbName)

	// Log collections trong development mode (tương tự như code JS)
	if os.Getenv("NODE_ENV") == "development" || os.Getenv("GO_ENV") == "development" {
		listCollections(ctx, DB)
	}
}

// listCollections hiển thị danh sách collections có sẵn (tương tự code JS)
func listCollections(ctx context.Context, db *mongo.Database) {
	collections, err := db.ListCollectionNames(ctx, map[string]interface{}{})
	if err != nil {
		log.Printf("Error listing collections: %v", err)
		return
	}

	if len(collections) > 0 {
		fmt.Printf("Available collections: %v\n", collections)
	} else {
		fmt.Println("No collections found in database")
	}
}

// GetDB trả về database instance
func GetDB() *mongo.Database {
	return DB
}
