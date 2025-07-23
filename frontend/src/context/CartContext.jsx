import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { cartAPI, wishlistAPI, compareAPI } from '../services/api'
import { useAuth } from './AuthContext'
import { toast } from 'react-toastify'

const CartContext = createContext()

const initialState = {
  cart: [],
  wishlist: [],
  compare: [],
  cartCount: 0,
  wishlistCount: 0,
  compareCount: 0,
  loading: false
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    
    case 'SET_CART':
      return {
        ...state,
        cart: action.payload.data || [],
        cartCount: action.payload.count || 0
      }
    
    case 'SET_WISHLIST':
      return {
        ...state,
        wishlist: action.payload.data || [],
        wishlistCount: action.payload.count || 0
      }
    
    case 'SET_COMPARE':
      return {
        ...state,
        compare: action.payload.data || [],
        compareCount: action.payload.count || 0
      }
    
    case 'CLEAR_ALL':
      return {
        ...state,
        cart: [],
        wishlist: [],
        compare: [],
        cartCount: 0,
        wishlistCount: 0,
        compareCount: 0
      }
    
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)
  const { isLoggedIn, isAdmin } = useAuth()

  // Load cart data when user logs in
  useEffect(() => {
    if (isLoggedIn && !isAdmin()) {
      loadAllCartData()
    } else {
      // Clear cart data when logged out or admin
      dispatch({ type: 'CLEAR_ALL' })
    }
  }, [isLoggedIn])

  const loadAllCartData = async () => {
    try {
      await Promise.all([
        loadCartData(),
        loadWishlistData(),
        loadCompareData()
      ])
    } catch (error) {
      console.error('Error loading cart data:', error)
    }
  }

  const loadCartData = async () => {
    try {
      const response = await cartAPI.getCart()
      if (response.data.success) {
        dispatch({
          type: 'SET_CART',
          payload: response.data
        })
      }
    } catch (error) {
      console.error('Error loading cart:', error)
      if (error.response?.status === 401) {
        dispatch({ type: 'CLEAR_ALL' })
      }
    }
  }

  const loadWishlistData = async () => {
    try {
      const response = await wishlistAPI.getWishlist()
      if (response.data.success) {
        dispatch({
          type: 'SET_WISHLIST',
          payload: response.data
        })
      }
    } catch (error) {
      console.error('Error loading wishlist:', error)
      if (error.response?.status === 401) {
        dispatch({ type: 'CLEAR_ALL' })
      }
    }
  }

  const loadCompareData = async () => {
    try {
      const response = await compareAPI.getCompare()
      if (response.data.success) {
        dispatch({
          type: 'SET_COMPARE',
          payload: response.data
        })
      }
    } catch (error) {
      console.error('Error loading compare:', error)
      if (error.response?.status === 401) {
        dispatch({ type: 'CLEAR_ALL' })
      }
    }
  }

  const addToCart = async (productId, cartType = 'cart', quantity = 1) => {
    if (!isLoggedIn) {
      toast.error('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng')
      return
    }

    if (isAdmin()) {
      toast.error('Admin không thể thêm sản phẩm vào giỏ hàng')
      return
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      let response
      if (cartType === 'cart') {
        response = await cartAPI.addToCart({
          product_id: productId,
          quantity: parseInt(quantity)
        })
      } else if (cartType === 'wishlist') {
        response = await wishlistAPI.addToWishlist({
          product_id: productId
        })
      } else if (cartType === 'compare') {
        response = await compareAPI.addToCompare({
          product_id: productId
        })
      }

      if (response.data.success) {
        // Update the corresponding cart state
        const actionType = cartType === 'cart' ? 'SET_CART' : 
                          cartType === 'wishlist' ? 'SET_WISHLIST' : 'SET_COMPARE'
        dispatch({
          type: actionType,
          payload: response.data
        })

        const cartTypeText = cartType === 'cart' ? 'giỏ hàng' : 
                            cartType === 'wishlist' ? 'danh sách yêu thích' : 'so sánh'
        toast.success(`Đã thêm sản phẩm vào ${cartTypeText}`)
      }
    } catch (error) {
      console.error('Add to cart error:', error)
      const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra khi thêm sản phẩm'
      toast.error(errorMessage)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const removeFromCart = async (productId, cartType = 'cart') => {
    if (!isLoggedIn) {
      toast.error('Vui lòng đăng nhập')
      return
    }

    if (isAdmin()) {
      toast.error('Admin không có giỏ hàng')
      return
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      let response
      if (cartType === 'cart') {
        response = await cartAPI.removeFromCart(productId)
      } else if (cartType === 'wishlist') {
        response = await wishlistAPI.removeFromWishlist(productId)
      } else if (cartType === 'compare') {
        response = await compareAPI.removeFromCompare(productId)
      }

      if (response.data.success) {
        // Update the corresponding cart state
        const actionType = cartType === 'cart' ? 'SET_CART' : 
                          cartType === 'wishlist' ? 'SET_WISHLIST' : 'SET_COMPARE'
        dispatch({
          type: actionType,
          payload: response.data
        })

        toast.success('Đã xóa sản phẩm')
      }
    } catch (error) {
      console.error('Remove from cart error:', error)
      const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra khi xóa sản phẩm'
      toast.error(errorMessage)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const clearCart = async (cartType = 'cart') => {
    if (!isLoggedIn) {
      toast.error('Vui lòng đăng nhập')
      return
    }

    if (isAdmin()) {
      toast.error('Admin không có giỏ hàng')
      return
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      let response
      if (cartType === 'cart') {
        response = await cartAPI.clearCart()
      } else if (cartType === 'wishlist') {
        response = await wishlistAPI.clearWishlist()
      } else if (cartType === 'compare') {
        response = await compareAPI.clearCompare()
      }

      if (response.data.success) {
        // Update the corresponding cart state
        const actionType = cartType === 'cart' ? 'SET_CART' : 
                          cartType === 'wishlist' ? 'SET_WISHLIST' : 'SET_COMPARE'
        dispatch({
          type: actionType,
          payload: response.data
        })

        const cartTypeText = cartType === 'cart' ? 'giỏ hàng' : 
                            cartType === 'wishlist' ? 'danh sách yêu thích' : 'so sánh'
        toast.success(`Đã xóa toàn bộ ${cartTypeText}`)
      }
    } catch (error) {
      console.error('Clear cart error:', error)
      const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra'
      toast.error(errorMessage)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const updateQuantity = async (productId, quantity) => {
    if (!isLoggedIn) {
      toast.error('Vui lòng đăng nhập')
      return
    }

    if (isAdmin()) {
      toast.error('Admin không có giỏ hàng')
      return
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const response = await cartAPI.updateCartItem({
        product_id: productId,
        quantity: parseInt(quantity)
      })

      if (response.data.success) {
        dispatch({
          type: 'SET_CART',
          payload: response.data
        })
      }
    } catch (error) {
      console.error('Update quantity error:', error)
      const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật số lượng'
      toast.error(errorMessage)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const getCartTotal = () => {
    return state.cart.reduce((total, item) => total + item.total, 0)
  }

  const value = {
    ...state,
    addToCart,
    removeFromCart,
    clearCart,
    updateQuantity,
    getCartTotal,
    loadCartData,
    loadWishlistData,
    loadCompareData
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
} 
