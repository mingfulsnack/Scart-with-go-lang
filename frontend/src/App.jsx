import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Category from './pages/Category'
import About from './pages/About'
import News from './pages/News'
import Cart from './pages/Cart'
import Wishlist from './pages/Wishlist'
import Compare from './pages/Compare'
import Search from './pages/Search'
import Login from './pages/Login'
import Register from './pages/Register'
import Checkout from './pages/Checkout'
import OrderDetail from './pages/OrderDetail'
import DebugAuth from './pages/DebugAuth'

import LoadingSpinner from './components/LoadingSpinner'
import ProtectedRoute from './components/ProtectedRoute'
import ProtectedAdminRoute from './components/ProtectedAdminRoute'

// Admin Pages
import Dashboard from './pages/admin/Dashboard'
import ProductManagement from './pages/admin/ProductManagement'
import CategoryManagement from './pages/admin/CategoryManagement'
import UserManagement from './pages/admin/UserManagement'
import OrderManagement from './pages/admin/OrderManagement'

import { CartProvider } from './context/CartContext'
import { AuthProvider, useAuth } from './context/AuthContext'

// App content component để sử dụng useAuth hook
function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="App">
      <Header />
      <main>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/product" element={<Products />} />
          <Route path="/product/:slug" element={<ProductDetail />} />
          <Route path="/category/:category" element={<Category />} />
          <Route path="/about" element={<About />} />
          <Route path="/news" element={<News />} />
          <Route path="/search" element={<Search />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/debug-auth" element={<DebugAuth />} />
          <Route path="/order-tracking" element={<OrderDetail />} />
          <Route path="/order-tracking/:orderNumber" element={<OrderDetail />} />
          
          {/* Protected Routes - Require Authentication */}
          <Route 
            path="/cart" 
            element={
              <ProtectedRoute>
                <Cart />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/wishlist" 
            element={
              <ProtectedRoute>
                <Wishlist />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/compare" 
            element={
              <ProtectedRoute>
                <Compare />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/checkout" 
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin Routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedAdminRoute>
                <Dashboard />
              </ProtectedAdminRoute>
            } 
          />
          <Route 
            path="/admin/products" 
            element={
              <ProtectedAdminRoute>
                <ProductManagement />
              </ProtectedAdminRoute>
            } 
          />
          <Route 
            path="/admin/categories" 
            element={
              <ProtectedAdminRoute>
                <CategoryManagement />
              </ProtectedAdminRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <ProtectedAdminRoute>
                <UserManagement />
              </ProtectedAdminRoute>
            } 
          />
          <Route 
            path="/admin/orders" 
            element={
              <ProtectedAdminRoute>
                <OrderManagement />
              </ProtectedAdminRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedAdminRoute>
                <Dashboard />
              </ProtectedAdminRoute>
            } 
          />
        </Routes>
      </main>
      <Footer />
      
      {/* Toast Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}

export default App; 