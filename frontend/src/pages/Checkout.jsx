import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { orderAPI } from '../services/api'

function Checkout() {
  const { cart = [], cartCount = 0, clearCart } = useCart()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: 'VN',
    address1: '',
    address2: '',
    comment: '',
    paymentMethod: 'COD' // Add payment method field with valid default
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const calculateSubtotal = () => {
    if (!cart || cart.length === 0) return 0
    return cart.reduce((total, item) => total + item.total, 0)
  }

  const calculateTotal = () => {
    return calculateSubtotal()
  }

  const handleCheckout = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.address1 || !formData.paymentMethod) {
      alert('Please fill in all required fields including payment method')
      return
    }

    if (cart.length === 0) {
      alert('Your cart is empty')
      return
    }

    try {
      setIsSubmitting(true)
      
      // Create full address string
      const fullAddress = formData.address2 
        ? `${formData.address1}, ${formData.address2}` 
        : formData.address1
      
      const orderData = {
        shipping_address: fullAddress,
        phone: formData.phone,
        customer_phone: formData.phone,
        customer_name: `${formData.firstName} ${formData.lastName}`,
        customer_email: formData.email,
        payment_method: formData.paymentMethod,
        notes: formData.comment || ""
      }
      
      console.log('Creating order with data:', orderData)
      
      const response = await orderAPI.createOrder(orderData)
      
      if (response.data.success) {
        alert(`Order Placed Successfully! Order Number: ${response.data.data.order_number}`)
        
        // Save order number to localStorage for tracking
        localStorage.setItem('lastOrderNumber', response.data.data.order_number)
        
        if (clearCart) {
          clearCart()
        }
        
        // Navigate to order success page or home
        navigate('/', { state: { orderSuccess: true, orderNumber: response.data.data.order_number } })
      } else {
        throw new Error(response.data.message || 'Order creation failed')
      }
      
    } catch (error) {
      console.error('Checkout error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Checkout Failed. Please try again.'
      alert(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Debug log
  console.log('Checkout render - cart:', cart, 'cartCount:', cartCount)

  return (
    <div className="container mt-5">
      <div className="row">
        <div className="col-12">
          <h2>Checkout</h2>
          
          {/* Breadcrumb */}
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item"><Link to="/">Home</Link></li>
              <li className="breadcrumb-item active">Checkout</li>
            </ol>
          </nav>

          {cartCount === 0 ? (
            <div className="text-center">
              <h3>Your cart is empty</h3>
              <p>Add some products to proceed with checkout.</p>
              <Link to="/product" className="btn btn-primary">
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="row">
              {/* Order Summary */}
              <div className="col-md-6">
                <h4>Order Summary</h4>
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Qty</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart && cart.map((item, index) => (
                        <tr key={item.product_id || index}>
                          <td>
                            <img src={item.product_image || 'https://via.placeholder.com/50'} 
                                 alt={item.product_name} 
                                 width="50" 
                                 className="me-2" />
                            {item.product_name}
                          </td>
                          <td>${item.price}</td>
                          <td>{item.quantity}</td>
                          <td>${item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="3"><strong>Total:</strong></td>
                        <td><strong>${calculateTotal().toFixed(2)}</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Shipping Form */}
              <div className="col-md-6">
                <h4>Shipping Information</h4>
                <form onSubmit={handleCheckout}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">First Name</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Last Name</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Phone</label>
                    <input 
                      type="tel" 
                      className="form-control" 
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Country</label>
                    <select 
                      className="form-control" 
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                    >
                      <option value="VN">Vietnam</option>
                      <option value="US">United States</option>
                      <option value="GB">United Kingdom</option>
                      <option value="CA">Canada</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Address</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="address1"
                      value={formData.address1}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Address 2 (Optional)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="address2"
                      value={formData.address2}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Payment Method</label>
                    <select 
                      className="form-control" 
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Payment Method</option>
                      <option value="COD">Cash on Delivery (COD)</option>
                      <option value="cash_on_delivery">Cash on Delivery</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="credit_card">Credit Card</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea 
                      className="form-control" 
                      name="comment"
                      rows="3"
                      value={formData.comment}
                      onChange={handleInputChange}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-lg w-100" disabled={isSubmitting}>
                    {isSubmitting ? 'Placing Order...' : 'Complete Order'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Checkout 