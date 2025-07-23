import React, { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { adminAPI } from '../../services/api'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalProducts: 0,
    totalUsers: 0,
    totalRevenue: 0
  })
  const [revenueStats, setRevenueStats] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    lastMonth: 0
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [recentUsers, setRecentUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [monthChartData, setMonthChartData] = useState({ days: [], orderCounts: [], revenues: [] })
  const [yearChartData, setYearChartData] = useState({ months: [], revenues: [] })

  useEffect(() => {
    loadDashboardData()
    loadChartData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [statsRes, ordersRes, usersRes, revenueRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getRecentOrders(),
        adminAPI.getRecentUsers(),
        adminAPI.getRevenueReport('detailed')
      ])

      if (statsRes.data.success) {
        setStats(statsRes.data.data)
      }

      if (ordersRes.data.success) {
        setRecentOrders(ordersRes.data.data)
      }

      if (usersRes.data.success) {
        setRecentUsers(usersRes.data.data)
      }

      if (revenueRes.data.success) {
        setRevenueStats(revenueRes.data.data)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadChartData = async () => {
    try {
      // API trả về { days: [...], orderCounts: [...], revenues: [...] }
      const monthRes = await adminAPI.getOrderReport('month')
      if (monthRes.data.success) {
        setMonthChartData(monthRes.data.data)
      }
      // API trả về { months: [...], revenues: [...] }
      const yearRes = await adminAPI.getOrderReport('year')
      if (yearRes.data.success) {
        setYearChartData(yearRes.data.data)
      }
    } catch (err) {
      // eslint-disable-next-line
      console.error('Error loading chart data:', err)
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

  if (loading) {
    return (
      <AdminLayout>
        <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
          <div className="loading-spinner"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="container-fluid">
        <h1 className="m-0 text-dark">Dashboard</h1>
        <div className="more_info"></div>

        {/* Statistics Cards */}
        <div className="row mt-3">
          <div className="col-md-3 col-sm-6">
            <div className="info-box">
              <span className="info-box-icon bg-green">
                <i className="fas fa-shopping-cart"></i>
              </span>
              <div className="info-box-content">
                <span className="info-box-text">Total Orders</span>
                <span className="info-box-number">{stats.totalOrders}</span>
                <a href="/admin/orders" className="small-box-footer">
                  View more <i className="fa fa-arrow-circle-right"></i>
                </a>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="info-box">
              <span className="info-box-icon bg-aqua">
                <i className="fa fa-tags"></i>
              </span>
              <div className="info-box-content">
                <span className="info-box-text">Total Products</span>
                <span className="info-box-number">{stats.totalProducts}</span>
                <a href="/admin/products" className="small-box-footer">
                  View more <i className="fa fa-arrow-circle-right"></i>
                </a>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="info-box">
              <span className="info-box-icon bg-yellow">
                <i className="fas fa-user"></i>
              </span>
              <div className="info-box-content">
                <span className="info-box-text">Total Users</span>
                <span className="info-box-number">{stats.totalUsers}</span>
                <a href="/admin/users" className="small-box-footer">
                  View more <i className="fa fa-arrow-circle-right"></i>
                </a>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="info-box">
              <span className="info-box-icon bg-red">
                <i className="fas fa-dollar-sign"></i>
              </span>
              <div className="info-box-content">
                <span className="info-box-text">Total Revenue</span>
                <span className="info-box-number">{formatCurrency(stats.totalRevenue)}</span>
                <a href="/admin/dashboard" className="small-box-footer">
                  View more <i className="fa fa-arrow-circle-right"></i>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Cards */}
        <div className="row mt-3">
          <div className="col-md-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Order in month</h5>
                <div className="card-tools">
                  <button type="button" className="btn btn-tool" onClick={loadChartData}>
                    <i className="fas fa-sync"></i>
                  </button>
                </div>
              </div>
              <div className="card-body">
                <HighchartsReact
                  highcharts={Highcharts}
                  options={{
                    credits: { enabled: false },
                    title: { text: 'Order in month' },
                    xAxis: { categories: monthChartData.days, crosshair: false },
                    yAxis: [
                      { min: 0, title: { text: 'Order' } },
                      { title: { text: 'Amount' }, opposite: true }
                    ],
                    legend: { align: 'left', verticalAlign: 'top', borderWidth: 0 },
                    tooltip: {
                      headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
                      pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                        '<td style="padding:0"><b>{point.y:.0f} </b></td></tr>',
                      footerFormat: '</table>',
                      shared: true,
                      useHTML: true
                    },
                    plotOptions: {
                      column: { pointPadding: 0.2, borderWidth: 0 },
                    },
                    series: [
                      {
                        type: 'column',
                        name: 'Order',
                        data: monthChartData.orderCounts,
                        dataLabels: { enabled: true, format: '{point.y:.0f}' }
                      },
                      {
                        type: 'line',
                        name: 'Amount',
                        color: '#c7730c',
                        yAxis: 1,
                        data: monthChartData.revenues,
                        borderWidth: 0,
                        dataLabels: {
                          enabled: true,
                          borderRadius: 3,
                          backgroundColor: 'rgba(252, 255, 197, 0.7)',
                          borderWidth: 0.5,
                          borderColor: '#AAA',
                          y: -6
                        }
                      }
                    ]
                  }}
                />
              </div>
            </div>
          </div>

          <div className="col-md-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Order in year</h5>
                <div className="card-tools">
                  <button type="button" className="btn btn-tool" onClick={loadChartData}>
                    <i className="fas fa-sync"></i>
                  </button>
                </div>
              </div>
              <div className="card-body">
                <HighchartsReact
                  highcharts={Highcharts}
                  options={{
                    chart: {
                      type: 'column',
                      options3d: { enabled: true, alpha: 0, beta: 10, depth: 50, viewDistance: 25 }
                    },
                    title: { text: 'Order in year' },
                    legend: { enabled: false },
                    credits: { enabled: false },
                    xAxis: { categories: yearChartData.months, crosshair: false },
                    yAxis: [
                      { min: 0, title: { text: 'Amount' } }
                    ],
                    plotOptions: {
                      column: { depth: 25 },
                      series: {
                        dataLabels: {
                          enabled: true,
                          borderRadius: 3,
                          backgroundColor: 'rgba(252, 255, 197, 0.7)',
                          borderWidth: 0.5,
                          borderColor: '#AAA',
                          y: -6
                        }
                      }
                    },
                    series: [
                      {
                        name: 'Amount',
                        data: yearChartData.revenues
                      },
                      {
                        type: 'line',
                        color: '#d05135',
                        name: 'Amount',
                        data: yearChartData.revenues
                      }
                    ]
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Orders and Users */}
        <div className="row">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header border-transparent">
                <h3 className="card-title">Recent Orders</h3>
                <div className="card-tools">
                  <button type="button" className="btn btn-tool" onClick={loadDashboardData}>
                    <i className="fas fa-sync"></i>
                  </button>
                </div>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table m-0">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th>Total</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.length > 0 ? (
                        recentOrders.map((order) => (
                          <tr key={order._id}>
                            <td>
                              <a href={`/admin/orders/${order._id}`}>
                                #{order.order_number}
                              </a>
                            </td>
                            <td>{order.shipping_address?.full_name || 'N/A'}</td>
                            <td>
                              <span className={`badge badge-${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </td>
                            <td>{formatCurrency(order.total_amount)}</td>
                            <td>{formatDate(order.createdAt)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center">No recent orders</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="card-footer clearfix">
                <a href="/admin/orders" className="btn btn-sm btn-info float-left">View All Orders</a>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card">
              <div className="card-header border-transparent">
                <h3 className="card-title">Recent Users</h3>
                <div className="card-tools">
                  <button type="button" className="btn btn-tool" onClick={loadDashboardData}>
                    <i className="fas fa-sync"></i>
                  </button>
                </div>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table m-0">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentUsers.length > 0 ? (
                        recentUsers.map((user) => (
                          <tr key={user._id}>
                            <td>{user.username}</td>
                            <td>{user.email}</td>
                            <td>
                              <span className={`badge badge-${getRoleColor(user.role)}`}>
                                {user.role}
                              </span>
                            </td>
                            <td>{formatDate(user.createdAt)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center">No recent users</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="card-footer clearfix">
                <a href="/admin/users" className="btn btn-sm btn-info float-left">View All Users</a>
              </div>
            </div>
          </div>
        </div>

        {/* Welcome Card */}
        <div className="row">
          <div className="col-md-12">
            <div className="card">
              <div className="card-body text-center">
                <h3>Welcome to Admin Panel!</h3>
                <p>Manage your products, orders, users and view detailed reports.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

// Helper functions for styling
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

const getRoleColor = (role) => {
  const colors = {
    admin: 'danger',
    user: 'primary',
    customer: 'success'
  }
  return colors[role] || 'secondary'
}

export default Dashboard