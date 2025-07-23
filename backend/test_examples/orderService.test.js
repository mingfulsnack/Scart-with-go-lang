const OrderService = require('../../src/services/OrderService');
const TestDataHelper = require('../helpers/testDataHelper');
const mongoose = require('mongoose');

describe('OrderService', () => {
  let testUser, testAdmin, testProduct1, testProduct2, testOrder;

  beforeEach(async () => {
    // Tạo test data
    testUser = await TestDataHelper.createTestUserForServices();
    testAdmin = await TestDataHelper.createTestAdminForServices();
    testProduct1 = await TestDataHelper.createTestProduct({ 
      name: 'Test Product 1',
      price: 100000,
      amount: 10
    });
    testProduct2 = await TestDataHelper.createTestProduct({ 
      name: 'Test Product 2',
      price: 200000,
      amount: 5
    });
  });

  describe('getAllOrders', () => {
    test('should return empty orders for admin', async () => {
      const result = await OrderService.getAllOrders();

      expect(result.orders).toEqual([]);
      expect(result.pagination).toEqual({
        current_page: 1,
        total_pages: 0,
        total_items: 0,
        items_per_page: 10
      });
    });

    test('should return orders with pagination', async () => {
      // Tạo một số orders trước
      const order1 = await TestDataHelper.createTestOrder(testUser.id, [
        { product_id: testProduct1.id, quantity: 2, price: testProduct1.price }
      ]);
      const order2 = await TestDataHelper.createTestOrder(testUser.id, [
        { product_id: testProduct2.id, quantity: 1, price: testProduct2.price }
      ]);

      const result = await OrderService.getAllOrders(1, 10);

      expect(result.orders).toHaveLength(2);
      expect(result.pagination.total_items).toBe(2);
      expect(result.pagination.current_page).toBe(1);
      expect(result.pagination.total_pages).toBe(1);
    });

    test('should filter orders by status', async () => {
      // Tạo orders với status khác nhau
      const pendingOrder = await TestDataHelper.createTestOrder(testUser.id, [
        { product_id: testProduct1.id, quantity: 1, price: testProduct1.price }
      ], { status: 'pending' });
      
      const completedOrder = await TestDataHelper.createTestOrder(testUser.id, [
        { product_id: testProduct2.id, quantity: 1, price: testProduct2.price }
      ], { status: 'delivered' });

      const result = await OrderService.getAllOrders(1, 10, { status: 'pending' });

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].status).toBe('pending');
    });

    test('should filter orders by user_id', async () => {
      const user2 = await TestDataHelper.createTestUserForServices({
        username: 'testuser2',
        email: 'test2@example.com'
      });

      await TestDataHelper.createTestOrder(testUser.id, [
        { product_id: testProduct1.id, quantity: 1, price: testProduct1.price }
      ]);
      
      await TestDataHelper.createTestOrder(user2.id, [
        { product_id: testProduct2.id, quantity: 1, price: testProduct2.price }
      ]);

      const result = await OrderService.getAllOrders(1, 10, { user_id: testUser.id });

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].user_id.toString()).toBe(testUser.id);
    });
  });

  describe('getUserOrders', () => {
    test('should return empty orders for new user', async () => {
      const result = await OrderService.getUserOrders(testUser.id);

      expect(result.orders).toEqual([]);
      expect(result.pagination.total_items).toBe(0);
    });

    test('should return user orders with pagination', async () => {
      // Tạo orders cho user
      await TestDataHelper.createTestOrder(testUser.id, [
        { product_id: testProduct1.id, quantity: 2, price: testProduct1.price }
      ]);
      await TestDataHelper.createTestOrder(testUser.id, [
        { product_id: testProduct2.id, quantity: 1, price: testProduct2.price }
      ]);

      const result = await OrderService.getUserOrders(testUser.id);

      expect(result.orders).toHaveLength(2);
      expect(result.pagination.total_items).toBe(2);
      result.orders.forEach(order => {
        expect(order.user_id.toString()).toBe(testUser.id);
      });
    });
  });

  describe('getOrderById', () => {
    test('should return order by id', async () => {
      const createdOrder = await TestDataHelper.createTestOrder(testUser.id, [
        { product_id: testProduct1.id, quantity: 2, price: testProduct1.price }
      ]);

      const result = await OrderService.getOrderById(createdOrder._id);

      expect(result).toBeTruthy();
      expect(result.id).toBe(createdOrder.id);
      expect(result.user_id.toString()).toBe(testUser.id);
    });

    test('should return null for non-existent order', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await expect(
        OrderService.getOrderById(fakeId)
      ).rejects.toThrow('Đơn hàng không tồn tại');
    });

    test('should return null for wrong user', async () => {
      const user2 = await TestDataHelper.createTestUserForServices({
        username: 'testuser2',
        email: 'test2@example.com'
      });

      const createdOrder = await TestDataHelper.createTestOrder(testUser.id, [
        { product_id: testProduct1.id, quantity: 1, price: testProduct1.price }
      ]);

      await expect(
        OrderService.getOrderById(createdOrder._id, user2.id)
      ).rejects.toThrow('Đơn hàng không tồn tại');
    });
  });

  describe('createOrderFromCart', () => {
    test('should create order from cart successfully', async () => {
      // Tạo cart với items
      const cart = await TestDataHelper.createTestCart(testUser.id, [
        { 
          product_id: testProduct1.id, 
          product_name: testProduct1.name,
          product_slug: testProduct1.slug,
          product_image: testProduct1.image,
          quantity: 2, 
          price: testProduct1.price,
          total: testProduct1.price * 2
        }
      ]);

      const orderData = {
        customer_name: 'Test Customer',
        customer_phone: '0123456789',
        customer_email: 'test@example.com',
        shipping_address: '123 Test Street',
        payment_method: 'cod',
        notes: 'Test order'
      };

      const result = await OrderService.createOrderFromCart(testUser.id, orderData);

      expect(result.order).toBeTruthy();
      expect(result.order.user_id).toBe(testUser.id);
      expect(result.order.customer_name).toBe(orderData.customer_name);
      expect(result.order.status).toBe('pending');
      expect(result.orderDetails).toHaveLength(1);
      expect(result.orderDetails[0].product_id).toBe(testProduct1.id);
      expect(result.orderDetails[0].quantity).toBe(2);
    });

    test('should throw error for empty cart', async () => {
      const orderData = {
        shipping_address: '123 Test Street',
        phone: '0123456789',
        payment_method: 'COD'
      };

      await expect(
        OrderService.createOrderFromCart(testUser.id, orderData)
      ).rejects.toThrow('Giỏ hàng trống');
    });

    test('should throw error for insufficient stock', async () => {
      // Tạo product với stock thấp
      const lowStockProduct = await TestDataHelper.createTestProduct({
        name: 'Low Stock Product',
        price: 50000,
        amount: 1
      });

      // Tạo cart với quantity lớn hơn stock
      await TestDataHelper.createTestCart(testUser.id, [
        { 
          product_id: lowStockProduct.id, 
          product_name: lowStockProduct.name,
          product_slug: lowStockProduct.slug,
          product_image: lowStockProduct.image,
          quantity: 5, 
          price: lowStockProduct.price,
          total: lowStockProduct.price * 5
        }
      ]);

      const orderData = {
        customer_name: 'Test Customer',
        customer_phone: '0123456789',
        customer_email: 'test@example.com',
        shipping_address: '123 Test Street',
        payment_method: 'cod'
      };

      await expect(
        OrderService.createOrderFromCart(testUser.id, orderData)
      ).rejects.toThrow(/chỉ còn.*trong kho/);
    });
  });

  describe('updateOrderStatus', () => {
    test('should update order status successfully', async () => {
      const createdOrder = await TestDataHelper.createTestOrder(testUser.id, [
        { product_id: testProduct1.id, quantity: 1, price: testProduct1.price }
      ]);

      const result = await OrderService.updateOrderStatus(createdOrder._id, 'confirmed');

      expect(result.status).toBe('confirmed');
    });

    test('should throw error for non-existent order', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await expect(
        OrderService.updateOrderStatus(fakeId, 'confirmed')
      ).rejects.toThrow('Đơn hàng không tồn tại');
    });

    test('should throw error when updating cancelled order', async () => {
      const createdOrder = await TestDataHelper.createTestOrder(testUser.id, [
        { product_id: testProduct1.id, quantity: 1, price: testProduct1.price }
      ], { status: 'cancelled' });

      await expect(
        OrderService.updateOrderStatus(createdOrder._id, 'confirmed')
      ).rejects.toThrow('Không thể thay đổi trạng thái đơn hàng đã hoàn thành hoặc đã hủy');
    });

    test('should throw error when updating delivered order', async () => {
      const createdOrder = await TestDataHelper.createTestOrder(testUser.id, [
        { product_id: testProduct1.id, quantity: 1, price: testProduct1.price }
      ], { status: 'delivered' });

      await expect(
        OrderService.updateOrderStatus(createdOrder._id, 'confirmed')
      ).rejects.toThrow('Không thể thay đổi trạng thái đơn hàng đã hoàn thành hoặc đã hủy');
    });
  });

  describe('cancelOrder', () => {
    test('should cancel order successfully', async () => {
      const createdOrder = await TestDataHelper.createTestOrder(testUser.id, [
        { product_id: testProduct1.id, quantity: 2, price: testProduct1.price }
      ]);

      const result = await OrderService.cancelOrder(createdOrder._id, testUser.id);

      expect(result.status).toBe('cancelled');
    });

    test('should throw error for non-existent order', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await expect(
        OrderService.cancelOrder(fakeId, testUser.id)
      ).rejects.toThrow('Đơn hàng không tồn tại');
    });

    test('should throw error when cancelling other user order', async () => {
      const user2 = await TestDataHelper.createTestUserForServices({
        username: 'testuser2',
        email: 'test2@example.com'
      });

      const createdOrder = await TestDataHelper.createTestOrder(testUser.id, [
        { product_id: testProduct1.id, quantity: 1, price: testProduct1.price }
      ]);

      await expect(
        OrderService.cancelOrder(createdOrder._id, user2.id)
      ).rejects.toThrow('Không có quyền hủy đơn hàng này');
    });
  });

  describe('validateOrderStock', () => {
    test('should validate stock successfully', async () => {
      const cartItems = [
        { product_id: testProduct1.id, product_name: testProduct1.name, quantity: 2 },
        { product_id: testProduct2.id, product_name: testProduct2.name, quantity: 1 }
      ];

      const result = await OrderService.validateOrderStock(cartItems);

      expect(result).toBe(true);
    });

    test('should detect insufficient stock', async () => {
      const cartItems = [
        { product_id: testProduct1.id, product_name: testProduct1.name, quantity: 20 }, // Vượt quá stock (10)
        { product_id: testProduct2.id, product_name: testProduct2.name, quantity: 1 }
      ];

      await expect(
        OrderService.validateOrderStock(cartItems)
      ).rejects.toThrow(`Sản phẩm ${testProduct1.name} chỉ còn ${testProduct1.amount} trong kho`);
    });
  });

  describe('getOrderStatistics', () => {
    test('should return order statistics', async () => {
      // Tạo một số orders
      await TestDataHelper.createTestOrder(testUser.id, [
        { product_id: testProduct1.id, quantity: 2, price: testProduct1.price }
      ], { status: 'delivered' });

      await TestDataHelper.createTestOrder(testUser.id, [
        { product_id: testProduct2.id, quantity: 1, price: testProduct2.price }
      ], { status: 'pending' });

      const result = await OrderService.getOrderStatistics();

      expect(result).toHaveProperty('total_orders');
      expect(result).toHaveProperty('total_revenue');
      expect(result).toHaveProperty('status_breakdown');
      expect(result.total_orders).toBeGreaterThan(0);
    });
  });

  describe('getRecentOrders', () => {
    test('should return recent orders', async () => {
      // Tạo một số orders
      await TestDataHelper.createTestOrder(testUser.id, [
        { product_id: testProduct1.id, quantity: 1, price: testProduct1.price }
      ]);

      await TestDataHelper.createTestOrder(testUser.id, [
        { product_id: testProduct2.id, quantity: 1, price: testProduct2.price }
      ]);

      const result = await OrderService.getRecentOrders(5);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    test('should return empty array when no orders', async () => {
      const result = await OrderService.getRecentOrders();

      expect(Array.isArray(result)).toBe(true);
    });
  });
});