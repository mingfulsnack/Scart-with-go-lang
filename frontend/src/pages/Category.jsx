import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { productAPI, categoryAPI } from '../services/api'
import { useCart } from '../context/CartContext'

function Category() {
  const { category } = useParams()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({})
  const [currentPage, setCurrentPage] = useState(1)
  const [categories, setCategories] = useState([])
  const { addToCart, loading: cartLoading } = useCart()

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (category && categories.length > 0) {
      loadProducts()
    }
  }, [category, currentPage, categories])

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

  const loadProducts = async () => {
    try {
      setLoading(true)
      console.log('Loading products for category:', category)
      
      // First check if category param is already an ID
      let categoryObj = categories.find(cat => cat.id === category)
      
      // If not found by ID, try to find by name
      if (!categoryObj) {
        categoryObj = categories.find(cat => 
          cat.name.toLowerCase() === category.toLowerCase()
        )
      }
      
      if (!categoryObj) {
        console.error('Category not found:', category)
        setProducts([])
        setPagination({})
        setLoading(false)
        return
      }
      
      const categoryId = categoryObj.id
      console.log('Using category ID:', categoryId)
      
      const response = await productAPI.getProductsByCategory(categoryId, {
        page: currentPage,
        limit: 12
      })
      
      console.log('API response:', response.data)
      
      if (response.data.success) {
        setProducts(response.data.data || [])
        setPagination(response.data.pagination || {})
      } else {
        console.error('API returned error:', response.data.message)
        setProducts([])
        setPagination({})
      }
    } catch (error) {
      console.error('Error loading products:', error)
      setProducts([])
      setPagination({})
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = (productId, instance = 'cart') => {
    addToCart(productId, instance, '1')
  }

  const formatPrice = (price) => {
    return `$${price.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")}`
  }

  const getCategoryDisplayName = (categoryParam) => {
    // Try to find by ID first
    let foundCategory = categories.find(cat => cat.id === categoryParam)
    
    // If not found by ID, try to find by name
    if (!foundCategory) {
      foundCategory = categories.find(cat => 
        cat.name.toLowerCase() === categoryParam.toLowerCase()
      )
    }
    
    return foundCategory ? foundCategory.name : categoryParam
  }

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
          <div className="text-center">
            <i className="fa fa-spinner fa-pulse fa-3x mb-3"></i>
            <p>Loading products...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <section className="breadcrumbs-custom">
        <div className="breadcrumbs-custom-footer">
          <div className="container">
            <ul className="breadcrumbs-custom-path">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/product">Shop</Link></li>
              <li className="active">{getCategoryDisplayName(category)}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="section section-xxl bg-default text-md-left">
        <div className="container">
          <div className="row">
            <div className="col-12">
              <div className="mb-4">
                <h1 className="display-4 fw-bold mb-3">
                  {getCategoryDisplayName(category)} Products
                </h1>
                <p className="lead">
                  Discover our {getCategoryDisplayName(category).toLowerCase()} collection 
                  with {pagination.total_items || 0} products
                </p>

              </div>

              {products.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-box-open fa-4x text-muted mb-3"></i>
                  <h3 className="text-muted">No Products Found</h3>
                  <p className="text-muted">No products available in this category.</p>
                  <Link to="/product" className="btn btn-primary">
                    View All Products
                  </Link>
                </div>
              ) : (
                <>
                  {/* Products Grid */}
                  <div className="row row-lg row-30 row-lg-50 justify-content-center">
                    {products.map((product) => (
                      <div key={product._id} className="col-sm-6 col-md-4 col-lg-3 mb-4">
                        <article className="product">
                          <div className="product-body">
                            <div className="product-figure">
                              <Link to={`/product/${product.slug}`}>
                                <img 
                                  src={product.image} 
                                  alt={product.name}
                                  className="img-fluid"
                                />
                              </Link>
                            </div>
                            
                            <h5 className="product-title">
                              <Link to={`/product/${product.slug}`}>
                                {product.name}
                              </Link>
                            </h5>
                            
                            <button 
                              onClick={() => handleAddToCart(product.id, 'cart')}
                              className="btn btn-secondary btn-sm add-to-cart-list w-100 mb-2"
                              disabled={cartLoading}
                            >
                              <i className="fa fa-cart-plus"></i> Add to cart
                            </button>
                            
                            <div className="product-price-wrap">
                              <div className="product-price">{formatPrice(product.price)}</div>
                            </div>
                          </div>
                          
                          <div className="product-button-wrap">
                            <div className="product-button">
                              <button 
                                className="btn btn-outline-danger btn-sm w-100"
                                onClick={() => handleAddToCart(product.id, 'wishlist')}
                                disabled={cartLoading}
                                title="Add to Wishlist"
                              >
                                <i className="fas fa-heart"></i>
                              </button>
                            </div>
                            
                            <div className="product-button">
                              <button 
                                className="btn btn-outline-info btn-sm w-100"
                                onClick={() => handleAddToCart(product.id, 'compare')}
                                disabled={cartLoading}
                                title="Add to Compare"
                              >
                                <i className="fa fa-exchange"></i>
                              </button>
                            </div>
                          </div>
                        </article>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination.total_pages > 1 && (
                    <div className="d-flex justify-content-center mt-5">
                      <nav aria-label="Products pagination">
                        <ul className="pagination">
                          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button 
                              className="page-link"
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                            >
                              Previous
                            </button>
                          </li>
                          
                          {[...Array(pagination.total_pages)].map((_, index) => {
                            const page = index + 1
                            return (
                              <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                                <button 
                                  className="page-link"
                                  onClick={() => setCurrentPage(page)}
                                >
                                  {page}
                                </button>
                              </li>
                            )
                          })}
                          
                          <li className={`page-item ${currentPage === pagination.total_pages ? 'disabled' : ''}`}>
                            <button 
                              className="page-link"
                              onClick={() => setCurrentPage(prev => Math.min(pagination.total_pages, prev + 1))}
                              disabled={currentPage === pagination.total_pages}
                            >
                              Next
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Category 