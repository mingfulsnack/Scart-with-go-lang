import React, { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { adminAPI } from '../../services/api'

const OrderManagement = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [newStatus, setNewStatus] = useState('')

  const orderStatuses = [
    'pending',
    'confirmed', 
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded'
  ]

  useEffect(() => {
    loadOrders()
  }, [currentPage, searchTerm, selectedStatus])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getOrders({
        page: currentPage,
        search: searchTerm,
        status: selectedStatus
      })
      
      if (response.data.success) {
        setOrders(response.data.data)
        setTotalPages(response.data.pagination?.totalPages || 1)
      }
    } catch (error) {
      console.error('Error loading orders:', error)
      alert('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setCurrentPage(1)
    loadOrders()
  }

  const handleViewOrder = (order) => {
    setSelectedOrder(order)
    setNewStatus(order.status)
    setShowModal(true)
  }

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return

    try {
      await adminAPI.updateOrderStatus(selectedOrder._id, newStatus)
      alert('Order status updated successfully!')
      setShowModal(false)
      loadOrders()
    } catch (error) {
      console.error('Error updating order status:', error)
      alert('Failed to update order status')
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      confirmed: 'info',
      processing: 'primary',
      shipped: 'secondary',
      delivered: 'success',
      cancelled: 'danger',
      refunded: 'dark'
    }
    return colors[status] || 'secondary'
  }

  return (
    <AdminLayout>
      <div className="container-fluid">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="m-0 text-dark">Order Management</h1>
        </div>

        {/* Search and Filter */}
        <div className="card mb-3">
          <div className="card-body">
            <form onSubmit={handleSearch} className="row">
              <div className="col-md-4">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <select
                  className="form-control"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="">All Status</option>
                  {orderStatuses.map(status => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
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

        {/* Orders Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Orders List</h3>
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
                      <th>Order #</th>
                      <th>Customer</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length > 0 ? (
                      orders.map((order) => (
                        <tr key={order._id}>
                          <td>
                            <strong>{order.order_number}</strong>
                          </td>
                          <td>{order.shipping_address?.full_name || 'N/A'}</td>
                          <td>{order.shipping_address?.email || 'N/A'}</td>
                          <td>
                            <span className={`badge bg-light text-${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td>{formatCurrency(order.total_amount)}</td>
                          <td>{formatDate(order.createdAt)}</td>
                          <td>
                            <button 
                              className="btn btn-sm btn-primary"
                              onClick={() => handleViewOrder(order)}
                            >
                              <i className="fas fa-eye"></i> View
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center">No orders found</td>
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

        {/* Order Details Modal */}
        {showModal && selectedOrder && (
          <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Order Details - {selectedOrder.order_number}</h5>
                  <button 
                    type="button" 
                    className="close" 
                    onClick={() => setShowModal(false)}
                  >
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6">
                      <h6>Customer Information</h6>
                      <p><strong>Name:</strong> {selectedOrder.shipping_address?.full_name}</p>
                      <p><strong>Email:</strong> {selectedOrder.shipping_address?.email}</p>
                      <p><strong>Phone:</strong> {selectedOrder.shipping_address?.phone}</p>
                      <p><strong>Address:</strong> {selectedOrder.shipping_address?.street}</p>
                      <p><strong>City:</strong> {selectedOrder.shipping_address?.city}</p>
                      <p><strong>Country:</strong> {selectedOrder.shipping_address?.country}</p>
                    </div>
                    <div className="col-md-6">
                      <h6>Order Information</h6>
                      <p><strong>Order Number:</strong> {selectedOrder.order_number}</p>
                      <p><strong>Date:</strong> {formatDate(selectedOrder.createdAt)}</p>
                      <p><strong>Total:</strong> {formatCurrency(selectedOrder.total_amount)}</p>
                      <p><strong>Payment Method:</strong> {selectedOrder.payment?.method}</p>
                      
                      <div className="form-group">
                        <label><strong>Status:</strong></label>
                        <select
                          className="form-control"
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                        >
                          {orderStatuses.map(status => (
                            <option key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <h6 className="mt-3">Order Items</h6>
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>SKU</th>
                          <th>Price</th>
                          <th>Qty</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items?.map((item, index) => (
                          <tr key={index}>
                            <td>{item.product_name}</td>
                            <td>{item.product_sku}</td>
                            <td>{formatCurrency(item.price)}</td>
                            <td>{item.quantity}</td>
                            <td>{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="4"><strong>Total:</strong></td>
                          <td><strong>{formatCurrency(selectedOrder.total_amount)}</strong></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {selectedOrder.notes?.customer && (
                    <div className="mt-3">
                      <h6>Customer Notes</h6>
                      <p>{selectedOrder.notes.customer}</p>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Close
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleUpdateStatus}>
                    Update Status
                  </button>
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

export default OrderManagement