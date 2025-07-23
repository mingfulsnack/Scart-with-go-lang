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
    console.log('OrderDetail useEffect triggered', { orderNumber, emailParam, isLoggedIn, viewType })
    
    // Prevent infinite loops by adding a flag
    let isMounted = true
    
    const loadData = async () => {
      if (!isMounted) return
      
      try {
        // Auto search if orderNumber is provided in URL
        if (orderNumber) {
          console.log('Auto searching by order number:', orderNumber)
          await handleSearchByNumber(orderNumber)
        } else if (emailParam) {
          console.log('Auto searching by email:', emailParam)
          await handleSearchByEmail(emailParam)
        } else if (isLoggedIn && viewType === 'my-orders') {
          // Auto load my orders for logged in users
          console.log('Auto loading my orders for logged in user')
          await handleGetMyOrders()
        }
      } catch (error) {
        console.error('Error in useEffect:', error)
      }
    }
    
    loadData()
    
    // Cleanup function
    return () => {
      isMounted = false
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
      
      console.log('API Response:', response.data) // Debug log
      
      if (response.data.success) {
        // Make sure data is an array before setting
        const ordersData = Array.isArray(response.data.data) ? response.data.data : []
        console.log('Orders data:', ordersData) // Debug log
        setOrders(ordersData)
        setOrder(null)
      } else {
        console.error('API returned success: false')
        setOrders([])
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
        console.error('Error details:', error.response?.data)
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
    if (price === null || price === undefined || isNaN(price)) {
      return "$0"
    }
    const numPrice = Number(price)
    return `$${numPrice.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")}`
  }

  const formatDate = (dateString) => {
    if (!dateString) {
      return 'N/A'
    }
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      console.warn('Date formatting error:', error)
      return 'Invalid Date'
    }
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

  const renderOrderCard = (orderData) => {
    // Safety checks to prevent crashes
    if (!orderData) {
      console.warn('renderOrderCard called with null/undefined orderData')
      return null
    }

    // Ensure required fields exist with defaults
    const safeOrderData = {
      order_id: orderData.order_id || orderData._id || 'unknown',
      order_number: orderData.order_number || 'N/A',
      status: orderData.status || 'pending',
      order_date: orderData.order_date || orderData.createdAt || new Date().toISOString(),
      total_amount: orderData.total_amount || 0,
      payment_method: orderData.payment_method || orderData.payment?.method || 'Cash on Delivery',
      shipping_address: orderData.shipping_address || {},
      products: orderData.products || orderData.items || [],
      notes: orderData.notes || orderData.customer_notes || '',
      ...orderData
    }

    return (
      <div key={safeOrderData.order_id} className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Order #{String(safeOrderData.order_number)}</h5>
          <span className={getStatusBadge(safeOrderData.status)}>
            {String(safeOrderData.status).toUpperCase()}
          </span>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <h6>Order Information</h6>
              <p><strong>Date:</strong> {formatDate(safeOrderData.order_date)}</p>
              <p><strong>Total:</strong> {formatPrice(safeOrderData.total_amount)}</p>
              <p><strong>Payment:</strong> {String(safeOrderData.payment_method)}</p>
            </div>
            <div className="col-md-6">
              <h6>Shipping Address</h6>
              <p><strong>Name:</strong> {String(safeOrderData.shipping_address?.full_name || 'N/A')}</p>
              <p><strong>Phone:</strong> {String(safeOrderData.shipping_address?.phone || 'N/A')}</p>
              <p><strong>Email:</strong> {String(safeOrderData.shipping_address?.email || 'N/A')}</p>
              <p><strong>Address:</strong> {String(safeOrderData.shipping_address?.street || 'N/A')}</p>
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
                {safeOrderData.products.length > 0 ? (
                  safeOrderData.products.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <div className="d-flex align-items-center">
                          <img 
                            src={item.product_image || '/placeholder.jpg'} 
                            alt={String(item.product_name || 'Product')}
                            style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                            className="me-2"
                            onError={(e) => {
                              e.target.src = '/placeholder.jpg'
                            }}
                          />
                          <div>
                            <div>{String(item.product_name || 'Unknown Product')}</div>
                            {item.category && (
                              <small className="text-muted">{String(item.category)}</small>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{String(item.quantity || 0)}</td>
                      <td>{formatPrice(item.unit_price || 0)}</td>
                      <td>{formatPrice(item.total_price || 0)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center text-muted">No items found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {safeOrderData.notes && (
            <div className="mt-3">
              <h6>Customer Notes</h6>
              <p className="text-muted">{String(safeOrderData.notes)}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container py-5">
      <div className="row">
        <div className="col-12">
          {/* Debug Info */}
          <div style={{ backgroundColor: '#f8f9fa', padding: '10px', marginBottom: '20px', fontSize: '12px' }}>
            <strong>Debug Info:</strong> isLoggedIn: {String(isLoggedIn)}, 
            viewType: {String(viewType)}, 
            orders: {String(orders.length)}, 
            loading: {String(loading)},
            user: {user ? user.username || 'User' : 'null'}
          </div>

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
                    My Orders ({user?.username || 'User'})
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
          {order && !loading && (
            <div>
              <h4 className="mb-3">Order Details</h4>
              {renderOrderCard(order)}
            </div>
          )}

          {/* Multiple Orders Result */}
          {orders.length > 0 && !loading && (
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