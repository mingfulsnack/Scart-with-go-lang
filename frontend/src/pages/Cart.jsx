import React from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

function Cart() {
  const { cart, cartCount, removeFromCart, clearCart, updateQuantity, loading } = useCart()

  const formatPrice = (price) => {
    return `$${price.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")}`
  }

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.total, 0)
  }

  const handleQuantityChange = async (productId, newQuantity) => {
    if (newQuantity < 1) {
      // Nếu quantity < 1 thì xóa sản phẩm khỏi giỏ hàng
      await removeFromCart(productId, 'cart')
    } else {
      await updateQuantity(productId, newQuantity)
    }
  }

  if (cartCount === 0) {
    return (
      <div className="container py-5">
        <div className="text-center py-5">
          <i className="fas fa-shopping-cart fa-4x text-muted mb-3"></i>
          <h3 className="text-muted">Your Cart is Empty</h3>
          <p className="text-muted">Looks like you haven't added any items to your cart yet.</p>
          <Link to="/product" className="btn btn-primary">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-5">
      {/* Page Header */}
      <div className="row mb-4">
        <div className="col-12">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <Link to="/" className="text-decoration-none">Home</Link>
              </li>
              <li className="breadcrumb-item active">Shopping Cart</li>
            </ol>
          </nav>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h1 className="display-4 fw-bold mb-0">Shopping Cart</h1>
              <p className="text-muted">{cartCount} item(s) in your cart</p>
            </div>
            {cartCount > 0 && (
              <button 
                onClick={() => clearCart('cart')}
                className="btn btn-outline-danger"
                disabled={loading}
              >
                <i className="fas fa-trash me-2"></i>
                Clear Cart
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="row">
        {/* Cart Items */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <div className="row fw-bold">
                <div className="col-md-2">Product</div>
                <div className="col-md-3">Details</div>
                <div className="col-md-2 text-center">Quantity</div>
                <div className="col-md-2 text-center">Price</div>
                <div className="col-md-2 text-center">Total</div>
                <div className="col-md-1 text-center"></div>
              </div>
            </div>
            <div className="card-body">
              {cart.map((item) => (
                <div key={item.product_id} className="row align-items-center border-bottom py-3">
                  <div className="col-md-2">
                    <img 
                      src={item.product_image} 
                      alt={item.product_name}
                      className="img-fluid rounded"
                      style={{ maxHeight: '80px', objectFit: 'cover' }}
                    />
                  </div>
                  <div className="col-md-3">
                    <h6 className="mb-1">{item.product_name}</h6>
                    <p className="text-muted small mb-0">SKU: {item.product_id}</p>
                  </div>
                  <div className="col-md-2 text-center">
                    <div className="input-group" style={{ maxWidth: '120px', margin: '0 auto' }}>
                      <button 
                        className="btn btn-outline-secondary btn-sm"
                        type="button"
                        onClick={() => handleQuantityChange(item.product_id, item.quantity - 1)}
                        disabled={loading}
                      >
                        <i className="fas fa-minus"></i>
                      </button>
                      <span className="input-group-text text-center" style={{ minWidth: '50px' }}>
                        {item.quantity}
                      </span>
                      <button 
                        className="btn btn-outline-secondary btn-sm"
                        type="button"
                        onClick={() => handleQuantityChange(item.product_id, item.quantity + 1)}
                        disabled={loading}
                      >
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>
                  </div>
                  <div className="col-md-2 text-center">
                    <span className="fw-bold">{formatPrice(item.price)}</span>
                  </div>
                  <div className="col-md-2 text-center">
                    <span className="fw-bold text-primary">
                      {formatPrice(item.total)}
                    </span>
                  </div>
                  <div className="col-md-1 text-center">
                    <button 
                      onClick={() => removeFromCart(item.product_id, 'cart')}
                      className="btn btn-danger btn-sm"
                      disabled={loading}
                      title="Remove from Cart"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
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

        {/* Cart Summary */}
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Order Summary</h5>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal:</span>
                <span>{formatPrice(calculateTotal())}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Shipping:</span>
                <span>Free</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Tax:</span>
                <span>$0</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between fw-bold fs-5">
                <span>Total:</span>
                <span className="text-primary">{formatPrice(calculateTotal())}</span>
              </div>
              
              <Link to="/checkout" className="btn btn-primary w-100 mt-3">
                Proceed to Checkout
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Cart 