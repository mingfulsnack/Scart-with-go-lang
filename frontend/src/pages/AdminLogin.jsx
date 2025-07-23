import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import '../styles/admin.css'

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await authAPI.login(formData)
      
      if (response.data.success) {
        const { user, token } = response.data
        
        // Check if user is admin
        if (user.role === 'admin') {
          login({ user, token }, { redirect: false })
          navigate('/admin/dashboard')
        } else {
          setError('Access denied. Admin privileges required.')
        }
      } else {
        setError(response.data.message || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message && (error.message.includes('jwt') || error.message.includes('token'))) {
        errorMessage = 'Authentication error. Try clearing cache at /debug-auth';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false)
    }
  };  return (
    <div className="login-page" style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="login-box" style={{ width: '400px' }}>
        <div className="card">
          <div className="card-body login-card-body">
            <div className="login-logo text-center mb-4">
              <h2><strong>GP247 Admin</strong></h2>
              <p>Sign in to access admin panel</p>
            </div>

            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
                {error.includes('Authentication error') && (
                  <div className="mt-2">
                    <a href="/debug-auth" style={{ color: '#fff', textDecoration: 'underline' }}>
                      🔧 Go to Debug Page
            </a>
          </div>
                )}
          </div>
            )}
          
          <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <div className="input-group">
                  <input 
                    type="text" 
                    className="form-control"
                    name="username" 
                    placeholder="Username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                  <div className="input-group-append">
                    <div className="input-group-text">
                      <span className="fas fa-user"></span>
                    </div>
                </div>
              </div>
            </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-group">
                  <input 
                    type="password" 
                    className="form-control"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                  <div className="input-group-append">
                    <div className="input-group-text">
                      <span className="fas fa-lock"></span>
                    </div>
                </div>
              </div>
            </div>
            
              <div className="row">
                <div className="col-12">
                  <button
                    type="submit"
                    className="btn btn-primary btn-block"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                </button>
              </div>
              </div>
            </form>

            <div className="text-center mt-3">
              <p className="mb-0">
                <a href="/" className="text-center">Back to Website</a>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 text-center text-white">
          <small>&copy; 2025 GP247 Admin Panel. All rights reserved.</small>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin 