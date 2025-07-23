import React from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

function Compare() {
  const { compare, compareCount, removeFromCart, clearCart, loading } = useCart()

  const formatPrice = (price) => {
    return `$${price.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")}`
  }

  if (compareCount === 0) {
    return (
      <div className="container py-5">
        <div className="text-center py-5">
          <i className="fas fa-exchange fa-4x text-muted mb-3"></i>
          <h3 className="text-muted">No Products to Compare</h3>
          <p className="text-muted">Add products to compare their features and prices.</p>
          <Link to="/product" className="btn btn-primary">
            Browse Products
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-5">
      <div className="row mb-4">
        <div className="col-12">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <Link to="/" className="text-decoration-none">Home</Link>
              </li>
              <li className="breadcrumb-item active">Compare Products</li>
            </ol>
          </nav>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h1 className="display-4 fw-bold mb-0">Compare Products</h1>
              <p className="text-muted">{compareCount} product(s) to compare</p>
            </div>
            {compareCount > 0 && (
              <button 
                onClick={() => clearCart('compare')}
                className="btn btn-outline-danger"
                disabled={loading}
              >
                <i className="fas fa-trash me-2"></i>
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Product</th>
                        {compare.map((product) => (
            <th key={product.product_id} className="text-center" style={{ minWidth: '200px' }}>
              <img 
                src={product.product_image} 
                alt={product.product_name}
                className="img-fluid mb-2"
                style={{ height: '150px', objectFit: 'cover' }}
              />
              <h6>{product.product_name}</h6>
            </th>
          ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Price</strong></td>
              {compare.map((product) => (
                <td key={product.product_id} className="text-center">
                  <span className="h5 text-primary">{formatPrice(product.price)}</span>
                </td>
              ))}
            </tr>
            <tr>
              <td><strong>SKU</strong></td>
              {compare.map((product) => (
                <td key={product.product_id} className="text-center">{product.product_id}</td>
              ))}
            </tr>
            <tr>
              <td><strong>Availability</strong></td>
              {compare.map((product) => (
                <td key={product.product_id} className="text-center">
                  <span className="badge bg-success">In Stock</span>
                </td>
              ))}
            </tr>
            <tr>
              <td><strong>Action</strong></td>
              {compare.map((product) => (
                <td key={product.product_id} className="text-center">
                  <div className="d-grid gap-2">
                    <Link 
                      to={`/product/${product.product_slug}`} 
                      className="btn btn-primary btn-sm"
                    >
                      View Details
                    </Link>
                    <button 
                      onClick={() => removeFromCart(product.product_id, 'compare')}
                      className="btn btn-danger btn-sm"
                      disabled={loading}
                      title="Remove from Compare"
                    >
                      <i className="fas fa-trash me-1"></i>
                      Remove
                    </button>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Compare 