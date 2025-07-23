import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext()

const initialState = {
  isLoggedIn: false,
  user: null,
  token: null,
  loading: true
}

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isLoggedIn: true,
        user: action.payload.user,
        token: action.payload.token,
        loading: false
      }
    
    case 'LOGOUT':
      return {
        ...state,
        isLoggedIn: false,
        user: null,
        token: null,
        loading: false
      }
    
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      }
    
    default:
      return state
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Kiểm tra token khi app khởi động
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token') // Changed from 'accessToken' to 'token'
      const user = localStorage.getItem('user')
      
      if (token && user) {
        // Verify token with backend
        const response = await authAPI.getProfile()
        if (response.data.success) {
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: {
              user: response.data.user,
              token: token
            }
          })
        } else {
          throw new Error('Token invalid')
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      logout()
    }
  }

  const login = (data, options = {}) => {
    const { token, user } = data
    
    // Lưu vào localStorage
    localStorage.setItem('token', token) // Changed from 'accessToken' to 'token'
    localStorage.setItem('user', JSON.stringify(user))
    
    dispatch({
      type: 'LOGIN_SUCCESS',
      payload: { user, token }
    })

    // Handle redirect after login based on role and options
    if (options.redirect !== false) {
      handlePostLoginRedirect(user, options.from)
    }
  }

  const handlePostLoginRedirect = (user, from) => {
    // Redirect logic based on user role
    if (user.role === 'admin') {
      window.location.href = '/admin/dashboard'
    } else {
      // Regular user redirect to intended page or home
      const redirectTo = from || '/'
      window.location.href = redirectTo
    }
  }

  const logout = () => {
    localStorage.removeItem('token') // Changed from 'accessToken' to 'token'
    localStorage.removeItem('user')
    
    dispatch({ type: 'LOGOUT' })
  }

  const updateUser = (userData) => {
    const updatedUser = { ...state.user, ...userData }
    localStorage.setItem('user', JSON.stringify(updatedUser))
    
    dispatch({
      type: 'UPDATE_USER',
      payload: userData
    })
  }

  const isAdmin = () => {
    return state.user?.role === 'admin'
  }

  const isUser = () => {
    return state.user?.role === 'user'
  }

  const value = {
    ...state,
    login,
    logout,
    updateUser,
    isAdmin,
    isUser,
    username: state.user?.username,
    userRole: state.user?.role
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 