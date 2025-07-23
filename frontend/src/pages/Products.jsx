import React, { useState, useEffect } from 'react'
import ProductCard from '../components/ProductCard'
import api from '../services/api'

function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const response = await api.get('/products')
      
      if (response.data.success) {
        setProducts(response.data.data)
      }
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
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
    <div className="container py-5">
      {/* Page Header */}
      <div className="row mb-5">
        <div className="col-12">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <a href="/" className="text-decoration-none">Home</a>
              </li>
              <li className="breadcrumb-item active">All Products</li>
            </ol>
          </nav>
          <h1 className="display-4 fw-bold mb-4">All Products</h1>
          <p className="lead">Discover our complete collection of quality products</p>
        </div>
      </div>

      {/* Products Grid */}
      <div className="row">
        {products.length > 0 ? (
          products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        ) : (
          <div className="col-12 text-center py-5">
            <i className="fas fa-box-open fa-4x text-muted mb-3"></i>
            <h3 className="text-muted">No Products Found</h3>
            <p className="text-muted">We couldn't find any products at the moment.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Products 