package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// Test data structures
type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
	Phone    string `json:"phone"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Token   string      `json:"token,omitempty"`
	User    interface{} `json:"user,omitempty"`
}

const baseURL = "http://localhost:5000/api"

func main() {
	fmt.Println("🧪 Testing G47 Backend API...")
	fmt.Println("================================")

	// Test 1: Health check
	fmt.Println("\n1. Testing health endpoint...")
	testHealthCheck()

	// Test 2: Create a test user
	fmt.Println("\n2. Creating test user...")
	testCreateUser()

	// Test 3: Login with test user
	fmt.Println("\n3. Testing login...")
	testLogin()

	// Test 4: Test products endpoint
	fmt.Println("\n4. Testing products endpoint...")
	testProducts()

	fmt.Println("\n✅ API Testing completed!")
}

func testHealthCheck() {
	resp, err := http.Get(baseURL + "/health")
	if err != nil {
		fmt.Printf("❌ Health check failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("✅ Health check: %d - %s\n", resp.StatusCode, string(body))
}

func testCreateUser() {
	user := RegisterRequest{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "123456",
		FullName: "Test User",
		Phone:    "0123456789",
	}

	jsonData, _ := json.Marshal(user)
	resp, err := http.Post(baseURL+"/auth/register", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("❌ Register failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var response Response
	json.Unmarshal(body, &response)

	if resp.StatusCode == 201 || resp.StatusCode == 409 { // 409 = user already exists
		fmt.Printf("✅ Register: %d - %s\n", resp.StatusCode, response.Message)
	} else {
		fmt.Printf("❌ Register failed: %d - %s\n", resp.StatusCode, response.Message)
	}
}

func testLogin() {
	login := LoginRequest{
		Username: "testuser",
		Password: "123456",
	}

	jsonData, _ := json.Marshal(login)
	resp, err := http.Post(baseURL+"/auth/login", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("❌ Login failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var response Response
	json.Unmarshal(body, &response)

	if resp.StatusCode == 200 {
		fmt.Printf("✅ Login successful: %s\n", response.Message)
		fmt.Printf("   Token: %s...\n", response.Token[:20])
	} else {
		fmt.Printf("❌ Login failed: %d - %s\n", resp.StatusCode, response.Message)
		fmt.Printf("   Response body: %s\n", string(body))
	}
}

func testProducts() {
	resp, err := http.Get(baseURL + "/products")
	if err != nil {
		fmt.Printf("❌ Products endpoint failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var response Response
	json.Unmarshal(body, &response)

	if resp.StatusCode == 200 {
		fmt.Printf("✅ Products endpoint: %s\n", response.Message)
	} else {
		fmt.Printf("❌ Products failed: %d\n", resp.StatusCode)
		fmt.Printf("   Response: %s\n", string(body))
	}
}
