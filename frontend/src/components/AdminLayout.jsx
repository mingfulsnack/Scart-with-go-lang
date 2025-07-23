import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { adminAPI } from '../services/api'

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [openMenus, setOpenMenus] = useState({})

  // Toggle dropdown menu
  const toggleMenu = (index) => {
    setOpenMenus(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const menuItems = [
    {
      title: 'Dashboard',
      icon: 'fas fa-tachometer-alt',
      path: '/admin/dashboard',
      children: []
    },
    {
      title: 'Product & Category',
      icon: 'fas fa-folder-open',
      path: '#',
      children: [
        { title: 'Products', icon: 'far fa-file-image', path: '/admin/products' },
        { title: 'Categories', icon: 'fas fa-folder-open', path: '/admin/categories' }
      ]
    },
    {
      title: 'Order Manager',
      icon: 'fas fa-shopping-cart',
      path: '#',
      children: [
        { title: 'Orders', icon: 'fas fa-shopping-cart', path: '/admin/orders' }
      ]
    },
    {
      title: 'User Manager',
      icon: 'fas fa-user',
      path: '#',
      children: [
        { title: 'Users', icon: 'fas fa-user', path: '/admin/users' }
      ]
    },

  ]

  return (
    <div className={`wrapper ${sidebarCollapsed ? 'sidebar-collapse' : ''}`}>
      {/* Navbar */}
      <nav className="main-header navbar navbar-expand navbar-dark navbar-lightblue">
        <ul className="navbar-nav">
          <li className="nav-item">
            <button 
              className="nav-link btn btn-link" 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{ border: 'none', background: 'none', color: 'inherit' }}
            >
              <i className="fas fa-bars"></i>
            </button>
          </li>
          <li className="nav-item">
            <a 
              href="/" 
              className="nav-link" 
              title="Về trang chủ"
              style={{ color: 'inherit' }}
            >
              <i className="fas fa-home"></i>
              <span className="d-none d-sm-inline ms-1">Home</span>
            </a>
          </li>
        </ul>

      
      </nav>

      {/* Sidebar */}
      <aside className="main-sidebar sidebar-light-pink elevation-4">
        <Link to="/admin/dashboard" className="brand-link text-center">
          <span className="brand-text font-weight-light">
            <strong>Admin</strong>
          </span>
        </Link>

        <div className="sidebar">
          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column">
              {menuItems.map((item, index) => (
                <li key={index} className="nav-item">
                  {item.children.length > 0 ? (
                    <>
                      <button 
                        className={`nav-link w-100 d-flex align-items-center justify-content-between ${
                          item.children.some(child => isActive(child.path)) ? 'active' : ''
                        }`}
                        onClick={() => toggleMenu(index)}
                        style={{ 
                          border: 'none',
                          background: 'transparent',
                          textAlign: 'left'
                        }}
                      >
                        <div>
                          <i className={`nav-icon ${item.icon} me-2`}></i>
                          <span>{item.title}</span>
                        </div>
                        <i className={`fas fa-angle-${openMenus[index] ? 'down' : 'right'} ms-auto`}></i>
                      </button>
                      
                      <div className={`collapse ${openMenus[index] ? 'show' : ''}`}>
                        <ul className="nav nav-treeview">
                          {item.children.map((child, childIndex) => (
                            <li key={childIndex} className="nav-item">
                              <Link 
                                to={child.path}
                                className={`nav-link ${isActive(child.path) ? 'active' : ''}`}
                                style={{ paddingLeft: '2.5rem' }}
                              >
                                <i className={`${child.icon} nav-icon me-2`}></i>
                                <span>{child.title}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  ) : (
                    <Link 
                      to={item.path}
                      className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                    >
                      <i className={`nav-icon ${item.icon} me-2`}></i>
                      <span>{item.title}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Content Wrapper */}
      <div className="content-wrapper">
        <div className="content-header">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-12">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="main-footer">
        <div className="float-right d-none d-sm-inline-block">
          <strong>Admin Panel</strong> v1.0
        </div>
        <strong>Copyright &copy; 2025 Admin.</strong> All rights reserved.
      </footer>
    </div>
  )
}

export default AdminLayout 