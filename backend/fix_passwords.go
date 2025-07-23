package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/mingfulsnack/app/config"
	"github.com/mingfulsnack/app/models"
	"go.mongodb.org/mongo-driver/bson"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Kết nối database
	config.ConnectDB()
	db := config.GetDB()
	collection := db.Collection("Users")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Tìm tất cả users có password không được hash
	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		log.Fatal("Error finding users:", err)
	}
	defer cursor.Close(ctx)

	var users []models.User
	if err = cursor.All(ctx, &users); err != nil {
		log.Fatal("Error decoding users:", err)
	}

	fmt.Printf("Found %d users\n", len(users))

	for _, user := range users {
		// Kiểm tra xem password có được hash chưa
		// Bcrypt hash thường bắt đầu với $2a$, $2b$, $2x$, $2y$ và dài khoảng 60 ký tự
		if len(user.Password) < 50 || user.Password[0] != '$' {
			fmt.Printf("Fixing password for user: %s (current: %s)\n", user.Username, user.Password)

			// Hash password hiện tại
			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
			if err != nil {
				log.Printf("Error hashing password for user %s: %v", user.Username, err)
				continue
			}

			// Update user với password đã hash
			_, err = collection.UpdateOne(
				ctx,
				bson.M{"_id": user.ID},
				bson.M{"$set": bson.M{"password": string(hashedPassword)}},
			)
			if err != nil {
				log.Printf("Error updating user %s: %v", user.Username, err)
				continue
			}

			fmt.Printf("✓ Updated password for user: %s\n", user.Username)
		} else {
			fmt.Printf("User %s already has hashed password\n", user.Username)
		}
	}

	fmt.Println("Password fixing completed!")
}
