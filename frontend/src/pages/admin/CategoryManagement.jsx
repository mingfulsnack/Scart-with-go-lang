import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import AdminLayout from '../../components/AdminLayout';
import { adminAPI } from '../../services/api';

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({
    name: ''
  });



  useEffect(() => {
    fetchCategories();
  }, [currentPage, searchTerm]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getCategories({
        page: currentPage,
        search: searchTerm
      });
      if (response.data.success) {
        setCategories(response.data.data);
        setTotalPages(response.data.totalPages || 1);
      }
    } catch (error) {
      console.error('Fetch categories error:', error);
      if (error.response?.status === 401) {
        setError('Authentication required. Please login again.');
        // Don't try to refetch on auth error to prevent infinite loop
        return;
      }
      setError('Failed to load categories');
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setFormData({ name: '' });
    setShowModal(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }

    try {
      if (editingCategory) {
        // Update category
        const response = await adminAPI.updateCategory(editingCategory._id, formData);
        if (response.data.success) {
          toast.success('Category updated successfully');
          fetchCategories();
          setShowModal(false);
        }
      } else {
        // Create category
        const response = await adminAPI.createCategory(formData);
        if (response.data.success) {
          toast.success('Category created successfully');
          fetchCategories();
          setShowModal(false);
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'An error occurred';
      toast.error(errorMessage);
      console.error('Category operation error:', error);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        const response = await adminAPI.deleteCategory(categoryId);
        if (response.data.success) {
          toast.success('Category deleted successfully');
          fetchCategories();
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Error deleting category';
        toast.error(errorMessage);
        console.error('Delete category error:', error);
      }
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCategories();
  };

  const filteredCategories = categories;

  if (loading) {
    return (
      <AdminLayout>
        <div className="container-fluid">
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="container-fluid">
          <div className="alert alert-danger" role="alert">
            <h4 className="alert-heading">Error</h4>
            <p>{error}</p>
            <hr />
            <button 
              className="btn btn-outline-danger" 
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container-fluid">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="m-0 text-dark">Category Management</h1>
          <button className="btn btn-primary" onClick={handleCreateCategory}>
            <i className="fas fa-plus"></i> Add New Category
          </button>
        </div>

        {/* Search and Filter */}
        <div className="card mb-3">
          <div className="card-body">
            <form onSubmit={handleSearch} className="row">
              <div className="col-md-4">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="col-md-2">
                <button type="submit" className="btn btn-secondary">
                  <i className="fas fa-search"></i> Search
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Categories Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Categories List</h3>
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
                      <th>ID</th>
                      <th>Name</th>
                      <th>Product Count</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map((category, index) => (
                        <tr key={category._id}>
                          <td>{category.id}</td>
                          <td><strong>{category.name}</strong></td>
                          <td>
                            <span className="badge rounded-pill bg-light text-primary border border-primary">
                              {category.productCount || 0}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-primary me-2"
                              onClick={() => handleEditCategory(category)}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteCategory(category._id)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center">No categories found</td>
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

        {/* Category Modal */}
        {showModal && (
          <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingCategory ? 'Edit Category' : 'Add New Category'}
                  </h5>
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
                      <label className="form-label">Category Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Enter category name..."
                        required
                      />
                    </div>
                    
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowModal(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        {editingCategory ? 'Update Category' : 'Create Category'}
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
  );
};

export default CategoryManagement; 