import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'

function Login() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const { isLoggedIn, login } = useAuth()
  const location = useLocation()
  
  // Redirect path after successful login
  const from = location.state?.from?.pathname || '/'

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.username || !formData.password) {
      toast.error('Vui lòng nhập đầy đủ username và mật khẩu')
      return
    }

    setIsLoading(true)
    
    try {
      const response = await authAPI.login({
        username: formData.username,
        password: formData.password
      })
      
      if (response.data.success) {
        const user = response.data.user
        
        // Success message
        toast.success(response.data.message || 'Đăng nhập thành công!')
        
        // Login with redirect options
        login({
          token: response.data.token,
          user: response.data.user
        }, { from })
        
        // Show role-specific message
        if (user.role === 'admin') {
          toast.info('Đang chuyển hướng đến trang quản trị...', { autoClose: 2000 })
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Đăng nhập thất bại'
      toast.error(errorMessage)
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  // Check if already logged in and redirect accordingly
  useEffect(() => {
  if (isLoggedIn) {
      const { user } = JSON.parse(localStorage.getItem('user') || '{}')
      if (user?.role === 'admin') {
        window.location.href = '/admin/dashboard'
      } else {
        window.location.href = from
      }
  }
  }, [isLoggedIn, from])

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-lg">
            <div className="card-body p-5">
              <div className="text-center mb-4">
                <h2 className="fw-bold">Đăng Nhập</h2>
                <p className="text-muted">Chào mừng trở lại! Hãy đăng nhập để tiếp tục.</p>
                <div className="alert alert-info py-2" style={{ fontSize: '0.9rem' }}>
                  <i className="fas fa-info-circle me-1"></i>
                  <strong>Admin:</strong> Đăng nhập bằng tài khoản admin để truy cập trang quản trị
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="username" className="form-label">
                    Username <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Nhập username của bạn"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">
                    Mật khẩu <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Nhập mật khẩu của bạn"
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={togglePasswordVisibility}
                    >
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <div className="d-grid gap-2 mb-3">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <i className="fa fa-spinner fa-spin me-2"></i>
                        Đang đăng nhập...
                      </>
                    ) : (
                      'Đăng nhập'
                    )}
                  </button>
                </div>
              </form>

              <div className="text-center">
                <p className="mb-2">
                  Chưa có tài khoản?{' '}
                  <Link to="/register" className="text-decoration-none">
                    Đăng ký ngay
                  </Link>
                </p>
                <p className="mb-0">
                  <small className="text-muted">
                    Gặp lỗi đăng nhập?{' '}
                    <Link to="/debug-auth" className="text-decoration-none">
                      🔧 Debug Auth
                    </Link>
                  </small>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login 