// controllers/OrderController.js
const Product = require("../models/Product");
const Order = require("../models/Order");
const OrderDetail = require("../models/OrderDetail");
const User = require("../models/User");

class OrderController {
  // Tạo đơn hàng mới (cho frontend)
  async createOrder(req, res) {
    try {
      // Debug: Kiểm tra user authentication
      console.log('=== CREATE ORDER DEBUG ===');
      console.log('req.user:', req.user);
      console.log('User ID:', req.user?.id);
      console.log('User email:', req.user?.email);
      console.log('===============================');

      const {
        items,
        customer,
        total
      } = req.body;

      // Validation
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ 
          success: false,
          message: "Đơn hàng phải có ít nhất 1 sản phẩm" 
        });
      }

      if (!customer || !customer.firstName || !customer.lastName || !customer.email || !customer.phone || !customer.address1) {
        return res.status(400).json({ 
          success: false,
          message: "Thông tin khách hàng không đầy đủ" 
        });
      }

      // Validate và tính toán items
      let validatedItems = [];
      let subtotal = 0;

      for (const item of items) {
        const product = await Product.findOne({ id: item.product_id });
        if (!product) {
          return res.status(400).json({ 
            success: false,
            message: `Sản phẩm với ID ${item.product_id} không tồn tại` 
          });
        }

        // Kiểm tra số lượng tồn kho
        if (product.amount < item.quantity) {
          return res.status(400).json({ 
            success: false,
            message: `Sản phẩm ${product.name} chỉ còn ${product.amount} trong kho` 
          });
        }

        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;

        validatedItems.push({
          product_id: product._id,
          product_name: product.name,
          product_sku: product.id,
          quantity: item.quantity,
          price: product.price,
          total: itemTotal
        });

        // Giảm số lượng tồn kho
        product.amount -= item.quantity;
        await product.save();
      }

      // Tạo order_number trước khi save
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      // Tìm order cuối cùng trong ngày để tạo sequence number
      const lastOrder = await Order.findOne({
        order_number: new RegExp(`^GP${year}${month}${day}`)
      }).sort({ order_number: -1 });
      
      let sequence = 1;
      if (lastOrder) {
        const lastSequence = parseInt(lastOrder.order_number.slice(-4));
        sequence = lastSequence + 1;
      }
      
      const orderNumber = `GP${year}${month}${day}${String(sequence).padStart(4, '0')}`;

      // Tạo đơn hàng
      const orderData = {
        order_number: orderNumber, // Thêm order_number vào orderData
        user_id: req.user?.id || null,
        items: validatedItems, // Giữ để compatibility
        subtotal: subtotal,
        tax_amount: 0,
        shipping_amount: 0,
        total_amount: subtotal,
        shipping_address: {
          full_name: `${customer.firstName} ${customer.lastName}`,
          phone: customer.phone,
          email: customer.email,
          street: customer.address1 + (customer.address2 ? `, ${customer.address2}` : ''),
          city: 'Ho Chi Minh City',
          country: customer.country || 'VN',
        },
        payment: { method: "cash_on_delivery" },
        notes: { customer: customer.comment || '' }
      };

      const order = new Order(orderData);
      await order.save();

      // Tạo OrderDetail cho user (user-based tracking thay vì product-based)
      const userEmail = req.user?.email || customer.email; // Ưu tiên email từ auth token
      const userName = `${customer.firstName} ${customer.lastName}`;
      const userPhone = customer.phone;
      const userId = req.user?.id || null;

      console.log('Creating OrderDetail with:', { userId, userEmail, userName });

      // Tìm hoặc tạo OrderDetail record cho user này
      let userOrderDetail = await OrderDetail.findOne({ 
        user_email: userEmail 
      });

      if (!userOrderDetail) {
        // Tạo OrderDetail record mới cho user
        userOrderDetail = new OrderDetail({
          user_id: userId, // Sử dụng userId từ token nếu có
          user_email: userEmail,
          user_name: userName,
          user_phone: userPhone,
          orders: []
        });
      } else {
        // Cập nhật user_id nếu user đăng nhập và chưa có user_id
        if (userId && !userOrderDetail.user_id) {
          userOrderDetail.user_id = userId;
          console.log('Updated existing OrderDetail with user_id:', userId);
        }
      }

      // Tạo array các products cho đơn hàng này
      const orderProducts = await Promise.all(items.map(async (item) => {
        const product = await Product.findOne({ id: item.product_id });
        return {
          product_id: product._id,
          product_name: product.name,
          product_image: product.image,
          product_slug: product.slug,
          quantity: item.quantity,
          unit_price: product.price,
          total_price: product.price * item.quantity,
          category: product.category
        };
      }));

      // Thêm đơn hàng mới vào mảng orders của user
      const newOrder = {
        order_id: order._id,
        order_number: order.order_number,
        order_date: order.createdAt,
        status: order.status,
        total_amount: order.total_amount,
        shipping_address: order.shipping_address,
        payment_method: order.payment.method,
        notes: order.notes.customer || '',
        products: orderProducts
      };

      userOrderDetail.orders.push(newOrder);
      await userOrderDetail.save();

      console.log(`Order created successfully: ${order.order_number}`);
      console.log(`OrderDetail updated for user: ${userEmail} - Total orders: ${userOrderDetail.orders.length}`);

      res.status(201).json({
        success: true,
        message: "Đặt hàng thành công",
        data: {
          order_id: order._id,
          order_number: order.order_number,
          total_amount: order.total_amount,
          items_count: items.length
        }
      });
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({ 
        success: false,
        message: "Lỗi server",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  // Lấy chi tiết đơn hàng theo order_number
  async getOrderByNumber(req, res) {
    try {
      const { orderNumber } = req.params;
      
      // Tìm OrderDetail chứa order với order_number này
      const userOrderDetail = await OrderDetail.findOne({
        "orders.order_number": orderNumber
      }).populate('orders.products.product_id', 'name image slug category');

      if (!userOrderDetail) {
        return res.status(404).json({ 
          success: false,
          message: "Không tìm thấy đơn hàng" 
        });
      }

      // Tìm order cụ thể trong mảng orders
      const order = userOrderDetail.orders.find(o => o.order_number === orderNumber);
      
      if (!order) {
        return res.status(404).json({ 
          success: false,
          message: "Không tìm thấy đơn hàng" 
        });
      }

      console.log(`Found order ${orderNumber} for user ${userOrderDetail.user_email}`);

      res.json({
        success: true,
        data: {
          order: {
            ...order.toObject(),
            user_info: {
              email: userOrderDetail.user_email,
              name: userOrderDetail.user_name,
              phone: userOrderDetail.user_phone
            }
          }
        }
      });
    } catch (error) {
      console.error("Get order by number error:", error);
      res.status(500).json({ 
        success: false,
        message: "Lỗi server",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  // Lấy danh sách đơn hàng theo email
  async getOrdersByEmail(req, res) {
    try {
      const { email } = req.query;
      
      if (!email) {
        return res.status(400).json({ 
          success: false,
          message: "Email là bắt buộc" 
        });
      }

      // Tìm OrderDetail của user theo email
      const userOrderDetail = await OrderDetail.findOne({ 
        user_email: email 
      }).populate('orders.products.product_id', 'name image slug category');

      if (!userOrderDetail) {
        return res.json({
          success: true,
          data: [],
          message: "Không tìm thấy đơn hàng nào cho email này"
        });
      }

      // Sort orders by date (newest first)
      const sortedOrders = userOrderDetail.orders.sort((a, b) => 
        new Date(b.order_date) - new Date(a.order_date)
      );

      console.log(`Found ${sortedOrders.length} orders for email ${email}`);

      res.json({
        success: true,
        data: sortedOrders,
        user_info: {
          email: userOrderDetail.user_email,
          name: userOrderDetail.user_name,
          phone: userOrderDetail.user_phone,
          total_orders: sortedOrders.length
        }
      });
    } catch (error) {
      console.error("Get orders by email error:", error);
      res.status(500).json({ 
        success: false,
        message: "Lỗi server",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  // API mới: Lấy orders của user đăng nhập
  async getMyOrders(req, res) {
    try {
      const userId = req.user.id;
      const userEmail = req.user.email;

      console.log(`=== GET MY ORDERS DEBUG ===`);
      console.log(`UserId: ${userId}, UserEmail: ${userEmail}`);

      // Tìm tất cả OrderDetail của user (có thể có nhiều records)
      const userOrderDetails = await OrderDetail.find({
        $or: [
          { user_id: userId },
          { user_email: userEmail }
        ]
      }).populate('orders.products.product_id', 'name image slug category');

      console.log(`Found ${userOrderDetails.length} OrderDetail records`);

      if (userOrderDetails.length === 0) {
        return res.json({
          success: true,
          data: [],
          message: "Bạn chưa có đơn hàng nào"
        });
      }

      // Gộp tất cả orders từ các OrderDetail records
      let allOrders = [];
      userOrderDetails.forEach((orderDetail, index) => {
        console.log(`OrderDetail ${index + 1}: ${orderDetail.orders.length} orders`);
        allOrders = allOrders.concat(orderDetail.orders);
      });

      // Loại bỏ duplicate orders (theo order_id)
      const uniqueOrders = allOrders.filter((order, index, self) => 
        index === self.findIndex(o => o.order_id.toString() === order.order_id.toString())
      );

      // Sort orders by date (newest first)
      const sortedOrders = uniqueOrders.sort((a, b) => 
        new Date(b.order_date) - new Date(a.order_date)
      );

      console.log(`Total orders found: ${allOrders.length}, Unique orders: ${sortedOrders.length}`);

      // Nếu có nhiều OrderDetail records, merge chúng lại thành 1
      if (userOrderDetails.length > 1) {
        console.log(`Merging ${userOrderDetails.length} OrderDetail records into one...`);
        
        const primaryRecord = userOrderDetails[0];
        primaryRecord.orders = sortedOrders;
        
        // Cập nhật user_id nếu thiếu
        if (userId && !primaryRecord.user_id) {
          primaryRecord.user_id = userId;
        }
        
        await primaryRecord.save();
        
        // Xóa các records còn lại
        const recordsToDelete = userOrderDetails.slice(1);
        for (const record of recordsToDelete) {
          await OrderDetail.deleteOne({ _id: record._id });
          console.log(`Deleted duplicate OrderDetail record: ${record._id}`);
        }
      }
      
      console.log('===============================');

      res.json({
        success: true,
        data: sortedOrders,
        user_info: {
          email: userEmail,
          name: userOrderDetails[0].user_name,
          phone: userOrderDetails[0].user_phone,
          total_orders: sortedOrders.length,
          debug_info: {
            total_order_detail_records: userOrderDetails.length,
            orders_per_record: userOrderDetails.map(od => od.orders.length)
          }
        }
      });
    } catch (error) {
      console.error("Get my orders error:", error);
      res.status(500).json({ 
        success: false,
        message: "Lỗi server",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  // Lấy danh sách đơn hàng của user
  async getUserOrders(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      
      let query = { user_id: req.user.id };
      if (status) query.status = status;

      const orders = await Order.find(query)
        .populate('items.product_id', 'name images slug')
        .sort('-createdAt')
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Order.countDocuments(query);

      res.json({
        orders,
        pagination: {
          current_page: Number(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: Number(limit),
        }
      });
    } catch (error) {
      console.error("Get user orders error:", error);
      res.status(500).json({ 
        message: "Lỗi server",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  // Lấy chi tiết đơn hàng
  async getOrder(req, res) {
    try {
      const { orderId } = req.params;
      
      let query = { _id: orderId };
      
      // Customer chỉ xem được đơn hàng của mình
      if (req.user.role === "customer") {
        query.user_id = req.user.id;
      }

      const order = await Order.findOne(query)
        .populate('items.product_id', 'name images slug category_id')
        .populate('user_id', 'full_name email phone');

      if (!order) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      res.json({
        order
      });
    } catch (error) {
      console.error("Get order error:", error);
      res.status(500).json({ 
        message: "Lỗi server",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  // Hủy đơn hàng
  async cancelOrder(req, res) {
    try {
      const order = req.order; // Từ middleware validateOrderAccess
      
      // Cập nhật trạng thái
      order.status = "cancelled";
      order.cancelled_at = new Date();
      
      if (req.body.reason) {
        order.notes.customer = req.body.reason;
      }

      await order.save();

      // Hoàn lại tồn kho
      for (const item of order.items) {
        const product = await Product.findById(item.product_id);
        if (product && product.track_inventory) {
          product.stock_quantity += item.quantity;
          await product.save();
        }
      }

      res.json({
        message: "Hủy đơn hàng thành công",
        order
      });
    } catch (error) {
      console.error("Cancel order error:", error);
      res.status(500).json({ 
        message: "Lỗi server",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  // Admin: Lấy tất cả đơn hàng
  async getAllOrders(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        status, 
        start_date, 
        end_date,
        user_email 
      } = req.query;

      let query = {};
      
      if (status) query.status = status;
      
      if (start_date || end_date) {
        query.createdAt = {};
        if (start_date) query.createdAt.$gte = new Date(start_date);
        if (end_date) query.createdAt.$lte = new Date(end_date);
      }

      // Search by user email
      if (user_email) {
        const users = await User.find({ 
          email: { $regex: user_email, $options: 'i' } 
        }).select('_id');
        query.user_id = { $in: users.map(u => u._id) };
      }

      const orders = await Order.find(query)
        .populate('items.product_id', 'name images slug')
        .populate('user_id', 'full_name email phone')
        .sort('-createdAt')
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Order.countDocuments(query);

      res.json({
        orders,
        pagination: {
          current_page: Number(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: Number(limit),
        }
      });
    } catch (error) {
      console.error("Get all orders error:", error);
      res.status(500).json({ 
        message: "Lỗi server",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  // Admin: Cập nhật trạng thái đơn hàng
  async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { status, notes, tracking } = req.body;

      const validStatuses = [
        "pending", "confirmed", "processing", 
        "shipped", "delivered", "cancelled", "refunded"
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: "Trạng thái đơn hàng không hợp lệ" 
        });
      }

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      // Cập nhật trạng thái và timestamps
      order.status = status;
      
      if (status === "shipped") {
        order.shipped_at = new Date();
        if (tracking) order.tracking = tracking;
      }
      
      if (status === "delivered") {
        order.delivered_at = new Date();
      }
      
      if (status === "cancelled") {
        order.cancelled_at = new Date();
        // Hoàn lại tồn kho
        for (const item of order.items) {
          const product = await Product.findById(item.product_id);
          if (product && product.track_inventory) {
            product.stock_quantity += item.quantity;
            await product.save();
          }
        }
      }

      if (notes) {
        order.notes.admin = notes;
      }

      await order.save();

      const updatedOrder = await Order.findById(orderId)
        .populate('items.product_id', 'name images slug')
        .populate('user_id', 'full_name email phone');

      res.json({
        message: "Cập nhật trạng thái đơn hàng thành công",
        order: updatedOrder
      });
    } catch (error) {
      console.error("Update order status error:", error);
      res.status(500).json({ 
        message: "Lỗi server",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  // Thống kê đơn hàng
  async getOrderStats(req, res) {
    try {
      const { period = "month" } = req.query;
      
      let startDate = new Date();
      switch (period) {
        case "week":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case "year":
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      const stats = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            total_amount: { $sum: "$total_amount" }
          }
        }
      ]);

      const totalOrders = await Order.countDocuments({
        createdAt: { $gte: startDate }
      });

      const totalRevenue = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: { $in: ["delivered", "confirmed", "processing", "shipped"] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$total_amount" }
          }
        }
      ]);

      res.json({
        period,
        total_orders: totalOrders,
        total_revenue: totalRevenue[0]?.total || 0,
        status_breakdown: stats
      });
    } catch (error) {
      console.error("Get order stats error:", error);
      res.status(500).json({ 
        message: "Lỗi server",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  // Admin: Lấy tất cả OrderDetails (để kiểm tra dữ liệu)
  async getAllOrderDetails(req, res) {
    try {
      const { page = 1, limit = 20, order_id } = req.query;
      
      let query = {};
      if (order_id) {
        query.order_id = order_id;
      }

      const orderDetails = await OrderDetail.find(query)
        .populate('order_id', 'order_number status createdAt shipping_address.email')
        .populate('product_id', 'name image slug category amount')
        .sort('-createdAt')
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await OrderDetail.countDocuments(query);

      console.log(`Admin queried OrderDetails: ${orderDetails.length} items found`);

      res.json({
        success: true,
        data: orderDetails,
        pagination: {
          current_page: Number(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: Number(limit),
        }
      });
    } catch (error) {
      console.error("Get all order details error:", error);
      res.status(500).json({ 
        success: false,
        message: "Lỗi server",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  // Admin: Thống kê OrderDetails
  async getOrderDetailsStats(req, res) {
    try {
      const totalOrderDetails = await OrderDetail.countDocuments();
      
      const statsByCategory = await OrderDetail.aggregate([
        {
          $group: {
            _id: "$category",
            total_items: { $sum: "$quantity" },
            total_orders: { $sum: 1 },
            total_revenue: { $sum: "$total_price" }
          }
        },
        {
          $sort: { total_revenue: -1 }
        }
      ]);

      const topProducts = await OrderDetail.aggregate([
        {
          $group: {
            _id: "$product_id",
            product_name: { $first: "$product_name" },
            total_quantity: { $sum: "$quantity" },
            total_orders: { $sum: 1 },
            total_revenue: { $sum: "$total_price" }
          }
        },
        {
          $sort: { total_quantity: -1 }
        },
        {
          $limit: 10
        }
      ]);

      console.log(`OrderDetails Stats: ${totalOrderDetails} total records`);

      res.json({
        success: true,
        data: {
          total_order_details: totalOrderDetails,
          stats_by_category: statsByCategory,
          top_products: topProducts
        }
      });
    } catch (error) {
      console.error("Get order details stats error:", error);
      res.status(500).json({ 
        success: false,
        message: "Lỗi server",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  // Test API: Kiểm tra kết nối OrderDetails collection
  async testOrderDetails(req, res) {
    try {
      // Kiểm tra connection và collection
      const collectionExists = await OrderDetail.db.db.listCollections({name: 'OrderDetails'}).hasNext();
      const totalRecords = await OrderDetail.countDocuments();
      
      // Lấy 3 record mới nhất để test (theo cấu trúc mới)
      const sampleRecords = await OrderDetail.find()
        .populate('user_id', 'username email')
        .sort('-createdAt')
        .limit(3);

      // Đếm tổng số orders trong tất cả users
      const totalOrders = await OrderDetail.aggregate([
        { $unwind: '$orders' },
        { $count: 'total' }
      ]);

      res.json({
        success: true,
        message: "OrderDetails collection test successful (new structure)",
        data: {
          collection_exists: collectionExists,
          total_user_records: totalRecords,
          total_orders_across_users: totalOrders[0]?.total || 0,
          sample_user_records: sampleRecords.map(record => ({
            user_id: record.user_id,
            user_email: record.user_email,
            user_name: record.user_name,
            total_orders: record.orders.length,
            latest_order: record.orders[record.orders.length - 1]?.order_number || 'No orders'
          })),
          collection_name: "OrderDetails",
          structure: "user-based (each user has orders array)"
        }
      });
    } catch (error) {
      console.error("Test OrderDetails error:", error);
      res.status(500).json({ 
        success: false,
        message: "Test failed",
        error: error.message
      });
    }
  }

  // Test API: Tạo đơn hàng test để debug
  async testCreateOrder(req, res) {
    try {
      console.log('=== TEST CREATE ORDER START ===');
      
      // Tìm product đầu tiên có sẵn trong database
      const availableProduct = await Product.findOne({ amount: { $gt: 0 } });
      if (!availableProduct) {
        return res.status(400).json({
          success: false,
          message: `Test failed: No products available in database. Please create some test products first.`,
          suggestion: "Use POST /api/products to create test products"
        });
      }

      console.log('Found available product:', availableProduct.name, 'with ID:', availableProduct.id);

      // Test data với product có sẵn
      const testOrderData = {
        items: [
          {
            product_id: availableProduct.id, // Sử dụng product có sẵn
            quantity: 1
          }
        ],
        customer: {
          firstName: 'Test',
          lastName: 'User', 
          email: 'test@example.com',
          phone: '0123456789',
          address1: '123 Test Street',
          country: 'VN'
        },
        total: availableProduct.price
      };

      // Gọi lại logic tạo đơn hàng
      const { items, customer } = testOrderData;

      console.log('Using product:', {
        id: availableProduct.id,
        name: availableProduct.name,
        price: availableProduct.price,
        amount: availableProduct.amount
      });

      // Tạo order_number
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      const lastOrder = await Order.findOne({
        order_number: new RegExp(`^GP${year}${month}${day}`)
      }).sort({ order_number: -1 });
      
      let sequence = 1;
      if (lastOrder) {
        const lastSequence = parseInt(lastOrder.order_number.slice(-4));
        sequence = lastSequence + 1;
      }
      
      const orderNumber = `GP${year}${month}${day}${String(sequence).padStart(4, '0')}`;
      console.log('Generated order_number:', orderNumber);

      // Tạo orderData
      const orderData = {
        order_number: orderNumber,
        user_id: null,
        items: [{
          product_id: availableProduct._id,
          product_name: availableProduct.name,
          product_sku: availableProduct.id,
          quantity: items[0].quantity,
          price: availableProduct.price,
          total: availableProduct.price * items[0].quantity
        }],
        subtotal: availableProduct.price * items[0].quantity,
        tax_amount: 0,
        shipping_amount: 0,
        total_amount: availableProduct.price * items[0].quantity,
        shipping_address: {
          full_name: `${customer.firstName} ${customer.lastName}`,
          phone: customer.phone,
          email: customer.email,
          street: customer.address1,
          city: 'Ho Chi Minh City',
          country: customer.country,
        },
        payment: { method: "cash_on_delivery" },
        notes: { customer: 'Test order created via API' }
      };

      console.log('Creating test order with order_number:', orderNumber);

      // Tạo order
      const order = new Order(orderData);
      await order.save();

      console.log('✅ Order saved successfully:', order.order_number);

      // Tạo OrderDetail theo cấu trúc mới (user-based)
      const testUserEmail = 'test@example.com';
      const testUserName = 'Test User';
      const testUserPhone = '0123456789';

      let userOrderDetail = await OrderDetail.findOne({ 
        user_email: testUserEmail 
      });

      if (!userOrderDetail) {
        userOrderDetail = new OrderDetail({
          user_id: null,
          user_email: testUserEmail,
          user_name: testUserName,
          user_phone: testUserPhone,
          orders: []
        });
      }

      const orderProducts = [{
        product_id: availableProduct._id,
        product_name: availableProduct.name,
        product_image: availableProduct.image,
        product_slug: availableProduct.slug,
        quantity: items[0].quantity,
        unit_price: availableProduct.price,
        total_price: availableProduct.price * items[0].quantity,
        category: availableProduct.category
      }];

      const newOrder = {
        order_id: order._id,
        order_number: order.order_number,
        order_date: order.createdAt,
        status: order.status,
        total_amount: order.total_amount,
        shipping_address: order.shipping_address,
        payment_method: order.payment.method,
        notes: 'Test order created via API',
        products: orderProducts
      };

      userOrderDetail.orders.push(newOrder);
      await userOrderDetail.save();
      
      console.log('✅ OrderDetail saved successfully for user:', testUserEmail);

      // Giảm stock
      availableProduct.amount -= items[0].quantity;
      await availableProduct.save();
      console.log('✅ Product stock updated:', availableProduct.amount);

      res.json({
        success: true,
        message: "Test order created successfully",
        data: {
          order_id: order._id,
          order_number: order.order_number,
          product_used: {
            id: availableProduct.id,
            name: availableProduct.name,
            remaining_stock: availableProduct.amount
          },
          test: true
        }
      });

    } catch (error) {
      console.error("Test create order error:", error);
      res.status(500).json({ 
        success: false,
        message: "Test failed",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      });
    }
  }

  // Test API: Kiểm tra quyền truy cập my-orders
  async testMyOrdersAccess(req, res) {
    try {
      const userInfo = {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      };

      console.log('User accessing my-orders:', userInfo);

      res.json({
        success: true,
        message: "Access to my-orders granted successfully",
        user: userInfo,
        allowed_roles: ["user", "customer"],
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Test my orders access error:", error);
      res.status(500).json({ 
        success: false,
        message: "Test failed",
        error: error.message
      });
    }
  }
}

module.exports = new OrderController(); 