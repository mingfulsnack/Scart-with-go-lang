import React from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

function Wishlist() {
  const { wishlist, wishlistCount, removeFromCart, clearCart, loading } = useCart()

  const formatPrice = (price) => {
    return `$${price.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")}`
  }

  if (wishlistCount === 0) {
    return (
      <div className="container py-5">
        <div className="text-center py-5">
          <i className="fas fa-heart fa-4x text-muted mb-3"></i>
          <h3 className="text-muted">Your Wishlist is Empty</h3>
          <p className="text-muted">Save your favorite items here for later.</p>
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
              <li className="breadcrumb-item active">Wishlist</li>
            </ol>
          </nav>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h1 className="display-4 fw-bold mb-0">My Wishlist</h1>
              <p className="text-muted">{wishlistCount} item(s) in your wishlist</p>
            </div>
            {wishlistCount > 0 && (
              <button 
                onClick={() => clearCart('wishlist')}
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

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              {wishlist.map((item) => (
                <div key={item.product_id} className="row align-items-center border-bottom py-3">
                  <div className="col-md-2">
                    <img 
                      src={item.product_image} 
                      alt={item.product_name}
                      className="img-fluid rounded"
                    />
                  </div>
                  <div className="col-md-4">
                    <h6 className="mb-1">
                      <Link to={`/product/${item.product_slug}`} className="text-decoration-none">
                        {item.product_name}
                      </Link>
                    </h6>
                    <p className="text-muted small mb-0">SKU: {item.product_id}</p>
                  </div>
                  <div className="col-md-2 text-center">
                    <span className="fw-bold text-primary">{formatPrice(item.price)}</span>
                  </div>
                  <div className="col-md-2 text-center">
                    <span className="badge bg-success">In Stock</span>
                  </div>
                  <div className="col-md-2 text-center">
  <div className="d-flex justify-content-center gap-2">
    <Link 
      to={`/product/${item.product_slug}`}
      className="btn btn-primary btn-sm"
    >
      <i className="fas fa-eye me-1"></i>
      View
    </Link>
    <button 
      onClick={() => removeFromCart(item.product_id, 'wishlist')}
      className="btn btn-danger btn-sm"
      disabled={loading}
      title="Remove from Wishlist"
    >
      <i className="fas fa-trash"></i>
    </button>
  </div>
</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <Link to="/product" className="btn btn-outline-primary">
              <i className="fas fa-arrow-left me-2"></i>
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Wishlist 