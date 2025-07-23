import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedAdminRoute = ({ children }) => {
  const { isLoggedIn, user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (!isLoggedIn) {
    // Redirect to regular login page since no separate admin login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (user?.role !== 'admin') {
    // User is logged in but not admin - show access denied or redirect to home
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedAdminRoute 