import React, { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const { isLoggedIn } = useAuth()
  const navigate = useNavigate()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!formData.username || !formData.email || !formData.password) {
      toast.error('Vui lòng nhập đầy đủ các thông tin bắt buộc')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    setIsLoading(true)
    
    try {
      const response = await authAPI.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone: formData.phone
      })
      
      if (response.data.success) {
        toast.success(response.data.message || 'Đăng ký thành công!')
        navigate('/login')
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Đăng ký thất bại'
      toast.error(errorMessage)
      console.error('Register error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword)
  }

  // Redirect if already logged in
  if (isLoggedIn) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow-lg">
            <div className="card-body p-5">
              <div className="text-center mb-4">
                <h2 className="fw-bold">Đăng Ký Tài Khoản</h2>
                <p className="text-muted">Tạo tài khoản mới để bắt đầu mua sắm cùng chúng tôi.</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
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
                      placeholder="Tên đăng nhập"
                      required
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label htmlFor="email" className="form-label">
                      Email <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="full_name" className="form-label">
                    Họ và tên
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    placeholder="Nhập họ và tên đầy đủ"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="phone" className="form-label">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    className="form-control"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="0xxxxxxxxx"
                  />
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
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
                        placeholder="Ít nhất 6 ký tự"
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

                  <div className="col-md-6 mb-3">
                    <label htmlFor="confirmPassword" className="form-label">
                      Xác nhận mật khẩu <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className="form-control"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Nhập lại mật khẩu"
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={toggleConfirmPasswordVisibility}
                      >
                        <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
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
                        Đang đăng ký...
                      </>
                    ) : (
                      'Đăng ký'
                    )}
                  </button>
                </div>
              </form>

              <div className="text-center">
                <p className="mb-0">
                  Đã có tài khoản?{' '}
                  <Link to="/login" className="text-decoration-none">
                    Đăng nhập ngay
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register 