import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { productAPI, categoryAPI } from '../services/api'

function ProductDetail() {
  const { slug } = useParams()
  const [product, setProduct] = useState(null)
  const [recommendedProducts, setRecommendedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [recommendedLoading, setRecommendedLoading] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const { addToCart, loading: cartLoading } = useCart()
  const [categories, setCategories] = useState([])

  useEffect(() => {
    if (slug) {
      loadProduct()
    }
    loadCategories()
  }, [slug])

  const loadProduct = async () => {
    try {
      setLoading(true)
      console.log('Loading product with slug:', slug)
      const response = await productAPI.getProduct(slug)
      console.log('Product API response:', response.data)
      
      if (response.data.success) {
        console.log('Product data received:', response.data.data)
        setProduct(response.data.data)
        // Load recommended products after getting product data
        loadRecommendedProducts(slug)
      } else {
        console.error('Product API returned success: false')
      }
    } catch (error) {
      console.error('Error loading product:', error)
      console.error('Error details:', error.response?.data)
    } finally {
      setLoading(false)
    }
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

  const loadRecommendedProducts = async (productSlug) => {
    try {
      setRecommendedLoading(true)
      console.log('Loading recommended products for slug:', productSlug)
      const response = await productAPI.getRecommendedProducts(productSlug, { limit: 4 })
      console.log('Recommended products API response:', response.data)
      
      if (response.data.success) {
        console.log('Recommended products data:', response.data.data)
        setRecommendedProducts(response.data.data)
        console.log('Recommended products state updated')
      } else {
        console.error('Recommended products API returned success: false')
        setRecommendedProducts([])
      }
    } catch (error) {
      console.error('Error loading recommended products:', error)
      console.error('Error details:', error.response?.data)
      setRecommendedProducts([])
    } finally {
      setRecommendedLoading(false)
    }
  }

  const handleAddToCart = (instance = 'cart') => {
    if (product) {
      addToCart(product.id, instance, '1')
    }
  }

  const handleRecommendedAddToCart = (productId, instance = 'cart') => {
    addToCart(productId, instance, '1')
  }

  const formatPrice = (price) => {
    return `$${price.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")}`
  }



  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
          <div className="text-center">
            <i className="fa fa-spinner fa-pulse fa-3x mb-3"></i>
            <p>Loading product...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container py-5">
        <div className="text-center py-5">
          <i className="fas fa-exclamation-circle fa-4x text-muted mb-3"></i>
          <h3 className="text-muted">Product Not Found</h3>
          <p className="text-muted">The product you're looking for doesn't exist.</p>
          <Link to="/product" className="btn btn-primary">
            Back to Products
          </Link>
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
              {product.category && (
                <li><Link to={`/category/${product.category.id || product.category}`}>{product.category.name || product.category}</Link></li>
              )}
              <li className="active">{product.name}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Product Details */}
      <section className="section section-sm section-first bg-default">
        <div className="container">
          <div className="row row-30">
            <div className="col-lg-6">
              <div className="product-image-wrapper">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="img-fluid rounded shadow"
                  style={{ width: '100%', height: '500px', objectFit: 'cover' }}
                />
              </div>
            </div>
            
            <div className="col-lg-6">
              <div className="single-product">
                <h3 className="text-transform-none font-weight-medium mb-3">{product.name}</h3>
                
                <p>
                  SKU: <span>{product.id}</span>
                </p>

                <div className="group-md group-middle mb-3">
                  <div className="single-product-price">
                    <span className="h2 text-primary fw-bold">{formatPrice(product.price)}</span>
                  </div>
                </div>

                <hr className="hr-gray-100" />

                {/* Quantity Selector và Add to Cart */}
<div className="d-flex align-items-center gap-4 mb-3">
  <div className="product-stepper">
    <div className="input-group" style={{ width: '120px' }}>
      <button 
        className="btn btn-outline-secondary"
        type="button"
        onClick={() => setQuantity(Math.max(1, quantity - 1))}
      >
        -
      </button>
      <input 
        type="number" 
        className="form-control text-center"
        value={quantity}
        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
        min="1"
      />
      <button 
        className="btn btn-outline-secondary"
        type="button"
        onClick={() => setQuantity(quantity + 1)}
      >
        +
      </button>
    </div>
  </div>

  <div>
    <button 
      className="btn btn-primary btn-lg"
      onClick={() => handleAddToCart('cart')}
      disabled={cartLoading}
    >
      <i className="fas fa-cart-plus me-2"></i>
      Add to cart
    </button>
  </div>
</div>

                <div className="mb-3">
                  Stock status:
                  <span className="text-success ms-2">In stock</span> 
                </div>

                {/* Category */}
                {product.category && (
                  <div className="mb-3">
                    Category: 
                    <Link to={`/category/${product.category.id || product.category}`} className="ms-2 text-decoration-none">
                      {product.category.name || product.category}
                    </Link>
                  </div>
                )}

                <hr className="hr-gray-100" />

                {/* Action Buttons */}
                <div className="group-xs group-middle">
                  <button 
                    className="btn btn-outline-danger me-2"
                    onClick={() => handleAddToCart('wishlist')}
                    disabled={cartLoading}
                    title="Add to Wishlist"
                  >
                    <i className="fas fa-heart"></i>
                  </button>
                  
                  <button 
                    className="btn btn-outline-info"
                    onClick={() => handleAddToCart('compare')}
                    disabled={cartLoading}
                    title="Add to Compare"
                  >
                    <i className="fas fa-exchange"></i>
                  </button>
                </div>

                <hr className="hr-gray-100" />

                {/* Share */}
<div className="d-flex align-items-center gap-3">
  <span className="fw-bold">Share:</span>
  <ul className="list-inline mb-0">
    <li className="list-inline-item">
      <a className="btn btn-outline-primary btn-sm" href="#">
        <i className="fab fa-facebook-f"></i>
      </a>
    </li>
    <li className="list-inline-item">
      <a className="btn btn-outline-info btn-sm" href="#">
        <i className="fab fa-twitter"></i>
      </a>
    </li>
    <li className="list-inline-item">
      <a className="btn btn-outline-danger btn-sm" href="#">
        <i className="fab fa-instagram"></i>
      </a>
    </li>
    <li className="list-inline-item">
      <a className="btn btn-outline-danger btn-sm" href="#">
        <i className="fab fa-youtube"></i>
      </a>
    </li>
  </ul>
</div>
              </div>
            </div>
          </div>

          {/* Product Description Tab */}
<div className="product-tabs mt-5 mb-4">
  <div className="card">
    <div className="card-header bg-white">
      <ul className="nav nav-tabs card-header-tabs">
        <li className="nav-item">
          <a 
            className="nav-link active fw-bold" 
            href="#description" 
            data-bs-toggle="tab"
          >
            <i className="fas fa-info-circle me-2"></i>
            Description
          </a>
        </li>
        {/* You can add more tabs here if needed */}
      </ul>
    </div>

    <div className="card-body">
      <div className="tab-content">
        <div className="tab-pane fade show active" id="description">
          <div className="product-description">
            <h5 className="fw-bold mb-3">Product Details</h5>
            <p className="text-muted">
              This is a high-quality product with excellent features and great value for money.
              Perfect for your needs with premium materials and craftsmanship.
            </p>
            {product.description && (
              <div className="mt-3">
                {product.description}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
        </div>
      </section>

      {/* Recommended Products */}
      {recommendedProducts && recommendedProducts.length > 0 && (
        <section className="section section-sm section-last bg-default">
          <div className="container">
            <h4 className="font-weight-sbold mb-4">Recommended Products</h4>
            {recommendedLoading ? (
              <div className="text-center py-4">
                <i className="fa fa-spinner fa-pulse fa-2x"></i>
              </div>
            ) : (
              <div className="row row-lg row-30 row-lg-50 justify-content-center">
                {recommendedProducts.map((recommendedProduct) => {
                  // Add safety checks for each product
                  if (!recommendedProduct || !recommendedProduct._id) {
                    console.error('Invalid recommended product:', recommendedProduct)
                    return null
                  }
                  
                  return (
                    <div key={recommendedProduct._id} className="col-sm-6 col-md-4 col-lg-3 mb-4">
                      <article className="product">
                        <div className="product-body">
                          <div className="product-figure">
                            <Link to={`/product/${encodeURIComponent(recommendedProduct.slug || recommendedProduct.id)}`}>
                              <img 
                                src={recommendedProduct.image || '/placeholder.jpg'} 
                                alt={recommendedProduct.name || 'Product'}
                                className="img-fluid"
                                onError={(e) => {
                                  e.target.src = '/placeholder.jpg'
                                }}
                              />
                            </Link>
                          </div>
                          <h5 className="product-title">
                            <Link to={`/product/${encodeURIComponent(recommendedProduct.slug || recommendedProduct.id)}`}>
                              {recommendedProduct.name || 'Unnamed Product'}
                            </Link>
                          </h5>
                          
                          <button 
                            onClick={() => handleRecommendedAddToCart(recommendedProduct.id, 'cart')}
                            className="btn btn-secondary btn-sm add-to-cart-list w-100 mb-2"
                            disabled={cartLoading}
                          >
                            <i className="fa fa-cart-plus"></i> Add to cart
                          </button>
                          
                          <div className="product-price-wrap">
                            <div className="product-price">{formatPrice(recommendedProduct.price || 0)}</div>
                          </div>
                        </div>
                        
                        <div className="product-button-wrap">
                          <div className="product-button">
                            <button 
                              className="btn btn-outline-danger btn-sm w-100"
                              onClick={() => handleRecommendedAddToCart(recommendedProduct.id, 'wishlist')}
                              disabled={cartLoading}
                              title="Add to Wishlist"
                            >
                              <i className="fas fa-heart"></i>
                            </button>
                          </div>
                          
                          <div className="product-button">
                            <button 
                              className="btn btn-outline-info btn-sm w-100"
                              onClick={() => handleRecommendedAddToCart(recommendedProduct.id, 'compare')}
                              disabled={cartLoading}
                              title="Add to Compare"
                            >
                              <i className="fa fa-exchange"></i>
                            </button>
                          </div>
                        </div>
                      </article>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

export default ProductDetail 