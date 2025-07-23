import React, { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { adminAPI } from '../../services/api'

const ProductManagement = () => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    price: '',
    image: '',
    slug: '',
    amount: '',
    category: '',
    description: ''
  })

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [currentPage, searchTerm, selectedCategory])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getProducts({
        page: currentPage,
        search: searchTerm,
        category: selectedCategory
      })
      
      if (response.data.success) {
        setProducts(response.data.data)
        setTotalPages(response.data.totalPages || 1)
      }
    } catch (error) {
      console.error('Error loading products:', error)
      alert('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await adminAPI.getCategories()
      if (response.data.success) {
        setCategories(response.data.data)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Auto-generate slug from name
    if (name === 'name') {
      const slug = value.toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
      setFormData(prev => ({
        ...prev,
        slug: slug
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.price || !formData.amount) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        amount: parseInt(formData.amount)
      }

      if (editingProduct) {
        await adminAPI.updateProduct(editingProduct._id, productData)
        alert('Product updated successfully!')
      } else {
        await adminAPI.createProduct(productData)
        alert('Product created successfully!')
      }
      
      setShowModal(false)
      setEditingProduct(null)
      resetForm()
      loadProducts()
    } catch (error) {
      console.error('Error saving product:', error)
      alert(error.response?.data?.message || 'Failed to save product')
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      id: product.id || '',
      name: product.name || '',
      price: product.price?.toString() || '',
      image: product.image || '',
      slug: product.slug || '',
      amount: product.amount?.toString() || '',
      category: product.category || '',
      description: product.description || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return
    }

    try {
      await adminAPI.deleteProduct(productId)
      alert('Product deleted successfully!')
      loadProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Failed to delete product')
    }
  }

  const handleAddNew = () => {
    setEditingProduct(null)
    resetForm()
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      price: '',
      image: '',
      slug: '',
      amount: '',
      category: '',
      description: ''
    })
  }

  const generateProductId = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0')
    return `PRD${timestamp}${random}`
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setCurrentPage(1)
    loadProducts()
  }

  return (
    <AdminLayout>
      <div className="container-fluid">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="m-0 text-dark">Product Management</h1>
          <button className="btn btn-primary" onClick={handleAddNew}>
            <i className="fas fa-plus"></i> Add New Product
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
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <select
                  className="form-control"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category._id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
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

        {/* Products Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Products List</h3>
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
                      <th>Image</th>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length > 0 ? (
                      products.map((product) => (
                        <tr key={product._id}>
                          <td>
                            <img 
                              src={product.image || 'https://via.placeholder.com/50'} 
                              alt={product.name}
                              style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                              className="rounded"
                            />
                          </td>
                          <td>{product.id}</td>
                          <td>{product.name}</td>
                          <td>
                            {product.category ? (
                              <span className="badge bg-light text-primary">
                                {categories.find(cat => cat.id === product.category)?.name || product.category}
                              </span>
                            ) : (
                              <span className="badge bg-light text-muted">No Category</span>
                            )}
                          </td>
                          <td>{new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
}).format(product.price)}</td>
                          <td>
                            <span className={`badge bg-light text-${
  product.amount > 10 ? 'success' : product.amount > 0 ? 'warning' : 'danger'
}`}>
  {product.amount}
</span>
                          </td>
                          <td>
                            <button 
                              className="btn btn-sm btn-primary me-2"
                              onClick={() => handleEdit(product)}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button 
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(product._id)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center">No products found</td>
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

        {/* Product Modal */}
        {showModal && (
          <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
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
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label className="form-label">Product ID *</label>
                          <div className="input-group">
                            <input
                              type="text"
                              className="form-control"
                              name="id"
                              value={formData.id}
                              onChange={handleInputChange}
                              required
                            />
                            <div className="input-group-append">
                              <button 
                                type="button" 
                                className="btn btn-secondary"
                                onClick={() => setFormData(prev => ({ ...prev, id: generateProductId() }))}
                              >
                                Generate
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label className="form-label">Product Name *</label>
                          <input
                            type="text"
                            className="form-control"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label className="form-label">Price *</label>
                          <input
                            type="number"
                            className="form-control"
                            name="price"
                            value={formData.price}
                            onChange={handleInputChange}
                            step="0.01"
                            min="0"
                            required
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label className="form-label">Stock Amount *</label>
                          <input
                            type="number"
                            className="form-control"
                            name="amount"
                            value={formData.amount}
                            onChange={handleInputChange}
                            min="0"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label className="form-label">Category</label>
                          <select
                            className="form-control"
                            name="category"
                            value={formData.category}
                            onChange={handleInputChange}
                          >
                            <option value="">-- Select Category --</option>
                            {categories.map(category => (
                              <option key={category._id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label className="form-label">Slug</label>
                          <input
                            type="text"
                            className="form-control"
                            name="slug"
                            value={formData.slug}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Image URL</label>
                      <input
                        type="url"
                        className="form-control"
                        name="image"
                        value={formData.image}
                        onChange={handleInputChange}
                        placeholder="https://example.com/image.jpg"
                      />
                      {formData.image && (
                        <div className="mt-2">
                          <img 
                            src={formData.image} 
                            alt="Preview" 
                            style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                            className="rounded"
                          />
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-control"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows="3"
                        placeholder="Product description..."
                      />
                    </div>

                    <div className="modal-footer">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        {editingProduct ? 'Update Product' : 'Create Product'}
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

export default ProductManagement