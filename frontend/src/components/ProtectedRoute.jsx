import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

function ProtectedRoute({ children, requireAdmin = false, requireStaff = false }) {
  const { isLoggedIn, user, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check admin requirement
  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Check staff requirement (admin or staff)
  if (requireStaff && !['admin', 'staff'].includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  // User is authenticated and has required permissions
  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requireAdmin: PropTypes.bool,
  requireStaff: PropTypes.bool,
};

export default ProtectedRoute; 