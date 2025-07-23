// services/api.js
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      // For admin routes, redirect to regular login since no separate admin login
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/admin')) {
        // Don't redirect immediately to prevent infinite loop
        // Let the component handle the error state
        console.warn('Authentication required for admin route');
      } else {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post("/auth/register", userData),
  login: (credentials) => api.post("/auth/login", credentials),
  logout: () => api.post("/auth/logout"),
  getProfile: () => api.get("/auth/profile"),
  updateProfile: (profileData) => api.put("/auth/profile", profileData),
  changePassword: (passwordData) => api.post("/auth/change-password", passwordData),
  verify: () => api.get("/auth/verify"),
};

// User API
export const userAPI = {
  getUsers: (params) => api.get("/users", { params }),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (userData) => api.post("/users", userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

// Category API
export const categoryAPI = {
  getCategories: (params) => api.get("/categories", { params }),
  getCategory: (slug) => api.get(`/categories/${slug}`),
  getCategoryTree: () => api.get("/categories/tree"),
  getCategoryProducts: (slug, params) => api.get(`/categories/${slug}/products`, { params }),
  createCategory: (categoryData) => api.post("/categories", categoryData),
  updateCategory: (id, categoryData) => api.put(`/categories/${id}`, categoryData),
  deleteCategory: (id) => api.delete(`/categories/${id}`),
};

// Product API
export const productAPI = {
  getProducts: (params) => api.get("/products", { params }),
  getProduct: (slug) => api.get(`/products/${slug}`),
  getProductsByCategory: (category, params) => api.get(`/products/category/${category}`, { params }),
  getRecommendedProducts: (slug, params) => api.get(`/products/${slug}/recommended`, { params }),
  getFeaturedProducts: (limit = 8) => api.get("/products/featured", { params: { limit } }),
  searchProducts: (query, params) => api.get("/products/search", { params: { q: query, ...params } }),
  createProduct: (productData) => api.post("/products", productData),
  updateProduct: (id, productData) => api.put(`/products/${id}`, productData),
  deleteProduct: (id) => api.delete(`/products/${id}`),
};

// Order API
export const orderAPI = {
  createOrder: (orderData) => api.post("/orders", orderData),
  getOrders: (params) => api.get("/orders", { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  getOrderByNumber: (orderNumber) => api.get(`/orders/number/${orderNumber}`),
  getOrdersByEmail: (email) => api.get("/orders/by-email", { params: { email } }),
  getMyOrders: () => api.get("/orders/my-orders"), // API mới: user đăng nhập xem orders riêng
  testMyOrdersAccess: () => api.get("/orders/test-my-orders-access"), // Test quyền truy cập
  updateOrderStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
  cancelOrder: (id) => api.put(`/orders/${id}/cancel`),
};

// Admin API
export const adminAPI = {
  // Dashboard
  getStats: () => api.get('/admin/stats'),
  getRecentOrders: (limit = 10) => api.get(`/admin/recent-orders?limit=${limit}`),
  getRecentUsers: (limit = 10) => api.get(`/admin/recent-users?limit=${limit}`),
  
  // Product Management
  getProducts: (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.search) queryParams.append('search', params.search)
    if (params.category) queryParams.append('category', params.category)
    return api.get(`/admin/products?${queryParams.toString()}`)
  },
  createProduct: (productData) => api.post('/admin/products', productData),
  updateProduct: (productId, productData) => api.put(`/admin/products/${productId}`, productData),
  deleteProduct: (productId) => api.delete(`/admin/products/${productId}`),
  
  // User Management
  getUsers: (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.search) queryParams.append('search', params.search)
    if (params.role) queryParams.append('role', params.role)
    return api.get(`/admin/users?${queryParams.toString()}`)
  },
  updateUser: (userId, userData) => api.put(`/admin/users/${userId}`, userData),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  
  // Order Management
  getOrders: (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.search) queryParams.append('search', params.search)
    if (params.status) queryParams.append('status', params.status)
    return api.get(`/admin/orders?${queryParams.toString()}`)
  },
  updateOrderStatus: (orderId, status) => api.put(`/admin/orders/${orderId}/status`, { status }),
  
  // Categories
  getCategories: (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.search) queryParams.append('search', params.search)
    const queryString = queryParams.toString()
    return api.get(`/admin/categories${queryString ? `?${queryString}` : ''}`)
  },
  createCategory: (data) => api.post('/admin/categories', data),
  updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
  
  // Reports
  getRevenueReport: (period = 'month') => api.get(`/admin/reports/revenue?period=${period}`),
  getOrderReport: (period = 'month') => api.get(`/admin/reports/orders?period=${period}`)
};

// Cart API
export const cartAPI = {
  getCart: () => api.get("/cart"),
  addToCart: (data) => api.post("/cart/add", data), // Changed to accept object directly
  updateCartItem: (data) => api.put("/cart/update", data), // Changed to accept object directly
  removeFromCart: (productId) => api.delete("/cart/remove", { data: { product_id: productId } }),
  clearCart: () => api.delete("/cart/clear"),
};

// Wishlist API
export const wishlistAPI = {
  getWishlist: () => api.get("/wishlist"),
  addToWishlist: (data) => api.post("/wishlist/add", data), // Changed to accept object directly
  removeFromWishlist: (productId) => api.delete("/wishlist/remove", { data: { product_id: productId } }),
  clearWishlist: () => api.delete("/wishlist/clear"),
};

// Compare API
export const compareAPI = {
  getCompare: () => api.get("/compare"),
  addToCompare: (data) => api.post("/compare/add", data), // Changed to accept object directly
  removeFromCompare: (productId) => api.delete("/compare/remove", { data: { product_id: productId } }),
  clearCompare: () => api.delete("/compare/clear"),
};

export default api; 