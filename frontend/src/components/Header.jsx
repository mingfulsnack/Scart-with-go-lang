import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { categoryAPI } from '../services/api'

function Header() {
  const [searchKeyword, setSearchKeyword] = useState('')
  const { cartCount, wishlistCount, compareCount } = useCart()
  const { isLoggedIn, user, logout } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])

  const getCategoryIcon = (categoryName) => {
    const icons = {
      'Food': 'fa-utensils',
      'Electronics': 'fa-laptop',
      'Fashion': 'fa-tshirt', 
      'Books': 'fa-book',
      'Sports': 'fa-football-ball',
      'Home': 'fa-home',
      'Beauty': 'fa-spa',
      'Travel': 'fa-plane'
    }
    return icons[categoryName] || 'fa-tag' // default icon
  }

  const getCategoryColor = (categoryName) => {
    const colors = {
      'Food': 'success',
      'Electronics': 'primary',
      'Fashion': 'danger',
      'Books': 'warning',
      'Sports': 'info',
      'Home': 'secondary',
      'Beauty': 'pink',
      'Travel': 'info'
    }
    return colors[categoryName] || 'primary' // default color
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchKeyword.trim()) {
      navigate(`/search?keyword=${encodeURIComponent(searchKeyword.trim())}`)
      setSearchKeyword('')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }


  const loadCategories = async () => {
    try {
      const response = await categoryAPI.getCategories()
      console.log('Categories response:', response.data)
      
      // Handle different response formats
      if (response.data.success && response.data.data) {
        setCategories(response.data.data)
      } else if (response.data.categories) {
        setCategories(response.data.categories)
      } else {
        console.error('No categories found in response:', response.data)
        setCategories([])
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      setCategories([])
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  return (
    <header className="page-header">
      <nav className="navbar navbar-expand-lg navbar-light bg-white">
        <div className="container">
          {/* Brand */}
          <Link className="navbar-brand" to="/">
            <img 
              src="https://demo.s-cart.org/GP247/Core/logo/logo.png" 
              alt="GP247 CMS" 
              width="105" 
              height="44"
            />
          </Link>

          {/* Mobile toggle */}
          <button 
            className="navbar-toggler" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* Navigation */}
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <Link className="nav-link" to="/news">News</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/product">All products</Link>
              </li>
              <li className="nav-item dropdown">
    <a 
      className="nav-link dropdown-toggle" 
      href="#" 
      role="button" 
      data-bs-toggle="dropdown"
    >
      Categories
    </a>
    <ul className="dropdown-menu">
      {categories.length > 0 ? (
        categories.map(category => (
          <li key={category._id}>
            <Link 
              className="dropdown-item" 
              to={`/category/${category.name}`}
            >
              <i className={`fas ${getCategoryIcon(category.name)} me-2 text-${getCategoryColor(category.name)}`}></i>
              {category.name}
            </Link>
          </li>
        ))
      ) : (
        <li>
          <span className="dropdown-item text-muted">No categories found</span>
        </li>
      )}
    </ul>
  </li>
              <li className="nav-item">
                <Link className="nav-link" to="/about">About</Link>
              </li>

              <li className="nav-item">
                <a className="nav-link" href="https://gp247.net" target="_blank" rel="noopener noreferrer">
                  GP247
                </a>
              </li>
              
              {/* Account Section */}
              {isLoggedIn ? (
                // User is logged in - show user info
                <li className="nav-item dropdown">
                  <a 
                    className="nav-link dropdown-toggle" 
                    href="#" 
                    role="button" 
                    data-bs-toggle="dropdown"
                  >
                    <i className="fas fa-user-circle text-success"></i> 
                    <span className="text-success fw-bold">Signed as: {user?.username}</span>
                  </a>
                  <ul className="dropdown-menu">
                    <li>
                      <div className="dropdown-item-text">
                        <div className="d-flex align-items-center">
                          <i className="fas fa-user-circle fa-2x text-primary me-2"></i>
                          <div>
                            <div className="fw-bold">{user?.username}</div>
                          
                            <div>
                              <span className={`badge ${user?.role === 'admin' ? 'bg-danger' : 'bg-primary'}`}>
                                {user?.role?.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    {user?.role === 'admin' && (
                      <li>
                        <Link className="dropdown-item" to="/admin/dashboard">
                          <i className="fas fa-tachometer-alt text-success"></i> Admin Dashboard
                        </Link>
                      </li>
                    )}
                    <li>
                      <Link className="dropdown-item" to="/order-tracking">
                        <i className="fas fa-shopping-bag text-primary me-2"></i> My Orders
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" to="/wishlist">
                        <i className="fas fa-heart text-danger"></i> Wishlist 
                        <span className="badge bg-danger ms-1">{wishlistCount}</span>
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" to="/compare">
                        <i className="fa fa-exchange text-info"></i> Compare 
                        <span className="badge bg-info ms-1">{compareCount}</span>
                      </Link>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button 
                        className="dropdown-item text-danger" 
                        onClick={handleLogout}
                      >
                        <i className="fas fa-sign-out-alt"></i> Logout
                      </button>
                    </li>
                  </ul>
                </li>
              ) : (
                // User is not logged in - show login option
                <li className="nav-item dropdown">
                  <a 
                    className="nav-link dropdown-toggle" 
                    href="#" 
                    role="button" 
                    data-bs-toggle="dropdown"
                  >
                    <i className="fa fa-lock"></i> Account
                  </a>
                  <ul className="dropdown-menu">
                    <li>
                      <Link className="dropdown-item" to="/login">
                        <i className="fa fa-user"></i> Login
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" to="/register">
                        <i className="fas fa-user-plus"></i> Register
                      </Link>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <Link className="dropdown-item" to="/wishlist">
                        <i className="fas fa-heart"></i> Wishlist 
                        <span className="badge bg-danger ms-1">{wishlistCount}</span>
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" to="/compare">
                        <i className="fa fa-exchange"></i> Compare 
                        <span className="badge bg-info ms-1">{compareCount}</span>
                      </Link>
                    </li>
                  </ul>
                </li>
              )}

              {/* Currency Dropdown */}
              <li className="nav-item dropdown">
                <a 
                  className="nav-link" 
                  href="#" 
                  role="button" 
                  data-bs-toggle="dropdown"
                >
                  USD<i className="fas fa-caret-down"></i>
                </a>
                <ul className="dropdown-menu">
                  <li><a className="dropdown-item active" href="#">USD</a></li>
                  <li><a className="dropdown-item" href="#">VND</a></li>
                </ul>
              </li>

              {/* Language Dropdown */}
              <li className="nav-item dropdown">
                <a 
                  className="nav-link" 
                  href="#" 
                  role="button" 
                  data-bs-toggle="dropdown"
                >
                  <img 
                    src="https://demo.s-cart.org/GP247/Core/language/flag_uk.png" 
                    style={{height: '25px'}} 
                    alt="English"
                  /> 
                  <i className="fas fa-caret-down"></i>
                </a>
                <ul className="dropdown-menu">
                  <li>
                    <a className="dropdown-item" href="#">
                      <img 
                        src="https://demo.s-cart.org/GP247/Core/language/flag_uk.png" 
                        style={{height: '25px'}} 
                        alt="English"
                      /> English
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" href="#">
                      <img 
                        src="https://demo.s-cart.org/GP247/Core/language/flag_vn.png" 
                        style={{height: '25px'}} 
                        alt="Tiếng Việt"
                      /> Tiếng Việt
                    </a>
                  </li>
                </ul>
              </li>
            </ul>

            {/* Search Form */}
            <form className="d-flex me-3" onSubmit={handleSearch}>
              <div className="input-group">
                <input 
                  className="form-control" 
                  type="text" 
                  placeholder="Input keyword"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
                <button className="btn btn-outline-primary" type="submit">
                  <i className="fas fa-search"></i>
                </button>
              </div>
            </form>

            {/* Cart Button */}
            <div className="position-relative">
              <Link to="/cart" className="btn btn-outline-primary position-relative">
                <i className="fas fa-shopping-cart"></i>
                {cartCount > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}

export default Header 