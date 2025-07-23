import React, { useState, useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { orderAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

function OrderDetail() {
  const { orderNumber } = useParams()
  const [searchParams] = useSearchParams()
  const emailParam = searchParams.get('email')
  const { isLoggedIn, user } = useAuth()
  
  const [order, setOrder] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchData, setSearchData] = useState({
    orderNumber: orderNumber || '',
    email: emailParam || ''
  })
  const [searchType, setSearchType] = useState(orderNumber ? 'number' : 'email')
  const [viewType, setViewType] = useState(isLoggedIn ? 'my-orders' : 'search') // my-orders hoặc search

  useEffect(() => {
    // Auto search if orderNumber is provided in URL
    if (orderNumber) {
      handleSearchByNumber(orderNumber)
    } else if (emailParam) {
      handleSearchByEmail(emailParam)
    } else if (isLoggedIn && viewType === 'my-orders') {
      // Auto load my orders for logged in users
      handleGetMyOrders()
    }
  }, [orderNumber, emailParam, isLoggedIn, viewType])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setSearchData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleGetMyOrders = async () => {
    try {
      setLoading(true)
      const response = await orderAPI.getMyOrders()
      
      if (response.data.success) {
        setOrders(response.data.data)
        setOrder(null)
      }
    } catch (error) {
      console.error('Get my orders error:', error)
      
      if (error.response?.status === 403) {
        // Lỗi phân quyền
        const errorData = error.response.data
        alert(`Access denied: ${errorData.message || 'You do not have permission to view orders'}
Required roles: ${errorData.required_roles?.join(', ') || 'customer'}
Your role: ${errorData.your_role || 'unknown'}`)
      } else {
        alert(error.response?.data?.message || 'Unable to load your orders')
      }
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearchByNumber = async (number = null) => {
    const searchNumber = number || searchData.orderNumber
    if (!searchNumber) {
      alert('Please enter order number')
      return
    }

    try {
      setLoading(true)
      const response = await orderAPI.getOrderByNumber(searchNumber)
      
      if (response.data.success) {
        setOrder(response.data.data)
        setOrders([])
      }
    } catch (error) {
      console.error('Search by number error:', error)
      alert(error.response?.data?.message || 'Order not found')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchByEmail = async (email = null) => {
    const searchEmail = email || searchData.email
    if (!searchEmail) {
      alert('Please enter email address')
      return
    }

    try {
      setLoading(true)
      const response = await orderAPI.getOrdersByEmail(searchEmail)
      
      if (response.data.success) {
        setOrders(response.data.data)
        setOrder(null)
      }
    } catch (error) {
      console.error('Search by email error:', error)
      alert(error.response?.data?.message || 'No orders found for this email')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchType === 'number') {
      handleSearchByNumber()
    } else {
      handleSearchByEmail()
    }
  }

  const formatPrice = (price) => {
    return `$${price.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")}`
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'badge bg-warning',
      confirmed: 'badge bg-info',
      processing: 'badge bg-primary',
      shipped: 'badge bg-success',
      delivered: 'badge bg-success',
      cancelled: 'badge bg-danger',
      refunded: 'badge bg-secondary'
    }
    return statusClasses[status] || 'badge bg-secondary'
  }

  const renderOrderCard = (orderData) => (
    <div key={orderData.order_id || orderData._id} className="card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Order #{orderData.order_number}</h5>
        <span className={getStatusBadge(orderData.status)}>
          {orderData.status.toUpperCase()}
        </span>
      </div>
      <div className="card-body">
        <div className="row">
          <div className="col-md-6">
            <h6>Order Information</h6>
            <p><strong>Date:</strong> {formatDate(orderData.order_date || orderData.createdAt)}</p>
            <p><strong>Total:</strong> {formatPrice(orderData.total_amount)}</p>
            <p><strong>Payment:</strong> {orderData.payment_method || orderData.payment?.method || 'Cash on Delivery'}</p>
          </div>
          <div className="col-md-6">
            <h6>Shipping Address</h6>
            <p><strong>Name:</strong> {orderData.shipping_address?.full_name}</p>
            <p><strong>Phone:</strong> {orderData.shipping_address?.phone}</p>
            <p><strong>Email:</strong> {orderData.shipping_address?.email}</p>
            <p><strong>Address:</strong> {orderData.shipping_address?.street}</p>
          </div>
        </div>
        
        <h6 className="mt-3">Order Items</h6>
        <div className="table-responsive">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {/* Sử dụng products array từ cấu trúc mới */}
              {(orderData.products || orderData.items || []).map((item, index) => (
                <tr key={index}>
                  <td>
                    <div className="d-flex align-items-center">
                      <img 
                        src={item.product_image} 
                        alt={item.product_name}
                        style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                        className="me-2"
                      />
                      <div>
                        <div>{item.product_name}</div>
                        {item.category && (
                          <small className="text-muted">{item.category}</small>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{formatPrice(item.unit_price)}</td>
                  <td>{formatPrice(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {(orderData.notes || orderData.customer_notes) && (
          <div className="mt-3">
            <h6>Customer Notes</h6>
            <p className="text-muted">{orderData.notes || orderData.customer_notes}</p>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="container py-5">
      <div className="row">
        <div className="col-12">
          {/* Breadcrumb */}
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item"><Link to="/">Home</Link></li>
              <li className="breadcrumb-item active">Track Your Order</li>
            </ol>
          </nav>

          <h2 className="mb-4">Track Your Order</h2>

          {/* View Type Selector for Logged in Users */}
          {isLoggedIn && (
            <div className="card mb-4">
              <div className="card-body">
                <div className="d-flex gap-3">
                  <button 
                    className={`btn ${viewType === 'my-orders' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => {
                      setViewType('my-orders')
                      handleGetMyOrders()
                    }}
                  >
                    <i className="fas fa-user me-2"></i>
                    My Orders ({user?.username})
                  </button>
                  
                </div>
              </div>
            </div>
          )}

          {/* Search Form - hiển thị khi viewType = 'search' hoặc user chưa đăng nhập */}
          {(viewType === 'search' || !isLoggedIn) && (
            <div className="card mb-4">
              <div className="card-body">
                <form onSubmit={handleSearch}>
                  <div className="row">
                    <div className="col-md-3">
                      <select 
                        className="form-select" 
                        value={searchType} 
                        onChange={(e) => setSearchType(e.target.value)}
                      >
                        <option value="number">Order Number</option>
                        <option value="email">Email Address</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      {searchType === 'number' ? (
                        <input
                          type="text"
                          className="form-control"
                          name="orderNumber"
                          placeholder="Enter your order number (e.g., GP20241201001)"
                          value={searchData.orderNumber}
                          onChange={handleInputChange}
                          required
                        />
                      ) : (
                        <input
                          type="email"
                          className="form-control"
                          name="email"
                          placeholder="Enter your email address"
                          value={searchData.email}
                          onChange={handleInputChange}
                          required
                        />
                      )}
                    </div>
                    <div className="col-md-3">
                      <button 
                        type="submit" 
                        className="btn btn-primary w-100"
                        disabled={loading}
                      >
                        {loading ? 'Searching...' : 'Search'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-4">
              <i className="fa fa-spinner fa-pulse fa-2x"></i>
              <p className="mt-2">
                {viewType === 'my-orders' ? 'Loading your orders...' : 'Searching for your order...'}
              </p>
            </div>
          )}

          {/* Single Order Result */}
          {order && (
            <div>
              <h4 className="mb-3">Order Details</h4>
              {renderOrderCard(order)}
            </div>
          )}

          {/* Multiple Orders Result */}
          {orders.length > 0 && (
            <div>
              <h4 className="mb-3">
                {viewType === 'my-orders' ? `Your Orders (${orders.length})` : `Orders Found (${orders.length})`}
              </h4>
              {orders.map(orderData => renderOrderCard(orderData))}
            </div>
          )}

          {/* No Results */}
          {!loading && !order && orders.length === 0 && (viewType === 'search' && (searchData.orderNumber || searchData.email)) && (
            <div className="text-center py-5">
              <i className="fas fa-search fa-3x text-muted mb-3"></i>
              <h4>No Orders Found</h4>
              <p className="text-muted">
                {searchType === 'number' 
                  ? 'No order found with this order number.' 
                  : 'No orders found for this email address.'
                }
              </p>
              <Link to="/product" className="btn btn-primary">
                Continue Shopping
              </Link>
            </div>
          )}

          {/* Initial State */}
          {!loading && !order && orders.length === 0 && viewType === 'search' && !searchData.orderNumber && !searchData.email && (
            <div className="text-center py-5">
              <i className="fas fa-package fa-3x text-primary mb-3"></i>
              <h4>Track Your Order</h4>
              <p className="text-muted">
                {isLoggedIn 
                  ? 'Choose "My Orders" to see your order history, or use the search form above.'
                  : 'Enter your order number or email address above to track your order status and view details.'
                }
              </p>
            </div>
          )}

          {/* My Orders Empty State */}
          {!loading && !order && orders.length === 0 && viewType === 'my-orders' && isLoggedIn && (
            <div className="text-center py-5">
              <i className="fas fa-shopping-bag fa-3x text-muted mb-3"></i>
              <h4>No Orders Yet</h4>
              <p className="text-muted">
                You haven't placed any orders yet. Start shopping to see your order history here.
              </p>
              <Link to="/product" className="btn btn-primary">
                Start Shopping
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OrderDetail 