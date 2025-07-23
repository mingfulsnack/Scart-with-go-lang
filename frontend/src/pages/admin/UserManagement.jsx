import React, { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { adminAPI } from '../../services/api'

const UserManagement = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    phone: '',
    role: 'user',
    status: 'active'
  })

  useEffect(() => {
    loadUsers()
  }, [currentPage, searchTerm, selectedRole])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getUsers({
        page: currentPage,
        search: searchTerm,
        role: selectedRole
      })
      
      if (response.data.success) {
        setUsers(response.data.data)
        setTotalPages(response.data.pagination?.totalPages || 1)
      }
    } catch (error) {
      console.error('Error loading users:', error)
      alert('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.full_name || !formData.role) {
      alert('Please fill in all required fields')
      return
    }

    try {
      if (editingUser) {
        await adminAPI.updateUser(editingUser._id, formData)
        alert('User updated successfully!')
      }
      
      setShowModal(false)
      setEditingUser(null)
      resetForm()
      loadUsers()
    } catch (error) {
      console.error('Error saving user:', error)
      alert(error.response?.data?.message || 'Failed to save user')
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      username: user.username || '',
      email: user.email || '',
      full_name: user.full_name || '',
      phone: user.phone || '',
      role: user.role || 'user',
      status: user.status || 'active'
    })
    setShowModal(true)
  }

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return
    }

    try {
      await adminAPI.deleteUser(userId)
      alert('User deleted successfully!')
      loadUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      alert(error.response?.data?.message || 'Failed to delete user')
    }
  }

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      full_name: '',
      phone: '',
      role: 'user',
      status: 'active'
    })
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setCurrentPage(1)
    loadUsers()
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleColor = (role) => {
    const colors = {
      admin: 'danger',
      user: 'primary',
      customer: 'success'
    }
    return colors[role] || 'secondary'
  }

  const getStatusColor = (status) => {
    const colors = {
      active: 'success',
      inactive: 'warning',
      banned: 'danger'
    }
    return colors[status] || 'secondary'
  }

  return (
    <AdminLayout>
      <div className="container-fluid">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="m-0 text-dark">User Management</h1>
        </div>

        {/* Search and Filter */}
        <div className="card mb-3">
          <div className="card-body">
            <form onSubmit={handleSearch} className="row">
              <div className="col-md-4">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <select
                  className="form-control"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                  <option value="customer">Customer</option>
                </select>
              </div>
              <div className="col-md-2">
                <button type="submit" className="btn btn-secondary">
                  <i className="fas fa-search"></i> Search
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Users Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Users List</h3>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="text-center">
                <div className="loading-spinner"></div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Full Name</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length > 0 ? (
                      users.map((user) => (
                        <tr key={user._id}>
                          <td>{user.username}</td>
                          <td>{user.email}</td>
                          <td>{user.full_name || 'N/A'}</td>
                          <td>{user.phone || 'N/A'}</td>
                          <td>
                            <span className={`badge bg-light text-${getRoleColor(user.role)}`}>
                              {user.role}
                            </span>
                          </td>
                          <td>
                            <span className={`badge bg-light text-${getStatusColor(user.status)}`}>
                              {user.status || 'active'}
                            </span>
                          </td>
                          <td>{formatDate(user.createdAt)}</td>
                          <td>
                            <button 
                              className="btn btn-sm btn-primary me-2"
                              onClick={() => handleEdit(user)}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            {user.role !== 'admin' && (
                              <button 
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDelete(user._id)}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="text-center">No users found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <nav>
                <ul className="pagination justify-content-center">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                  </li>
                  {[...Array(totalPages)].map((_, index) => (
                    <li key={index} className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => setCurrentPage(index + 1)}
                      >
                        {index + 1}
                      </button>
                    </li>
                  ))}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        </div>

        {/* Edit User Modal */}
        {showModal && (
          <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Edit User</h5>
                  <button 
                    type="button" 
                    className="close" 
                    onClick={() => setShowModal(false)}
                  >
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label className="form-label">Username</label>
                      <input
                        type="text"
                        className="form-control"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        disabled
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Role *</label>
                      <select
                        className="form-control"
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="user">User</option>
                        <option value="customer">Customer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select
                        className="form-control"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="banned">Banned</option>
                      </select>
                    </div>

                    <div className="modal-footer">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Update User
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Backdrop */}
        {showModal && <div className="modal-backdrop fade show"></div>}
      </div>
    </AdminLayout>
  )
}

export default UserManagement 