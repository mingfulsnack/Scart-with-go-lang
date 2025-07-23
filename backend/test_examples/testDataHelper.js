const User = require('../../src/models/User');
const Product = require('../../src/models/Product');
const Category = require('../../src/models/Category');
const Cart = require('../../src/models/Cart');
const Wishlist = require('../../src/models/Wishlist');
const Compare = require('../../src/models/Compare');
const Order = require('../../src/models/Order');
const OrderDetail = require('../../src/models/OrderDetail');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

class TestDataHelper {
  // Create test user for integration tests (plain password for AuthController)
  static async createTestUser(userData = {}) {
    const plainPassword = 'password123';
    const defaultUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: plainPassword, // Plain text for AuthController compatibility
      full_name: 'Test User',
      phone: '0123456789',
      role: 'user',
      ...userData
    };

    const user = new User(defaultUser);
    const savedUser = await user.save();
    
    // Convert to plain object and add id field for compatibility
    const userObj = savedUser.toObject();
    userObj.id = userObj._id.toString();
    
    // Add plaintext password for testing purposes
    userObj.plainPassword = plainPassword;
    
    return userObj;
  }

  // Create test user for unit tests (hashed password for UserService)
  static async createTestUserForServices(userData = {}) {
    const plainPassword = 'password123';
    const defaultUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: await bcrypt.hash(plainPassword, 10), // Hash password for UserService compatibility
      full_name: 'Test User',
      phone: '0123456789',
      role: 'user',
      ...userData
    };

    const user = new User(defaultUser);
    const savedUser = await user.save();
    
    // Convert to plain object and add id field for compatibility
    const userObj = savedUser.toObject();
    userObj.id = userObj._id.toString();
    
    // Add plaintext password for testing purposes
    userObj.plainPassword = plainPassword;
    
    return userObj;
  }

  // Create test admin
  static async createTestAdmin(adminData = {}) {
    return await this.createTestUser({
      username: `testadmin_${Date.now()}`,
      email: `admin_${Date.now()}@example.com`,
      full_name: 'Test Admin',
      role: 'admin',
      ...adminData
    });
  }

  // Create test admin for unit tests (hashed password for UserService)
  static async createTestAdminForServices(adminData = {}) {
    return await this.createTestUserForServices({
      username: `testadmin_${Date.now()}`,
      email: `admin_${Date.now()}@example.com`,
      full_name: 'Test Admin',
      role: 'admin',
      ...adminData
    });
  }

  // Create test category
  static async createTestCategory(categoryData = {}) {
    const defaultCategory = {
      id: `cat_${Date.now()}`, // Add required id field
      name: `Test Category ${Date.now()}`,
      slug: `test-category-${Date.now()}`,
      description: 'Test category description',
      ...categoryData
    };

    const category = new Category(defaultCategory);
    const savedCategory = await category.save();
    
    // Convert to plain object and add id field for compatibility
    const categoryObj = savedCategory.toObject();
    categoryObj.id = categoryObj.id || categoryObj._id.toString();
    
    return categoryObj;
  }

  // Create test product
  static async createTestProduct(productData = {}) {
    let category;
    if (!productData.category_id && !productData.category) {
      category = await this.createTestCategory();
      productData.category = category._id || category.id;
    } else if (productData.category_id && !productData.category) {
      // Convert category_id to category for database storage
      productData.category = productData.category_id;
      delete productData.category_id; // Remove category_id as it's not a database field
    }

    // Separate the passed data to preserve all fields
    const { category_id, ...restProductData } = productData;

    const defaultProduct = {
      id: `prod_${Date.now()}`, // Add required id field
      name: `Test Product ${Date.now()}`,
      slug: `test-product-${Date.now()}`,
      description: 'Test product description',
      price: 100000,
      amount: 10, // Changed from stock to amount
      image: 'test-image.jpg',
      is_featured: false,
      ...restProductData
    };

    const product = new Product(defaultProduct);
    const savedProduct = await product.save();
    
    // Convert to plain object and add id field for compatibility
    const productObj = savedProduct.toObject();
    productObj.id = productObj.id || productObj._id.toString();
    
    return productObj;
  }

  // Create test cart
  static async createTestCart(userId, items = []) {
    const cart = new Cart({
      user_id: userId,
      cart_type: "cart",
      items: items,
      total_amount: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      total_items: items.reduce((sum, item) => sum + item.quantity, 0)
    });

    await cart.save();
    return cart;
  }

  // Create test wishlist
  static async createTestWishlist(userId, items = []) {
    const wishlist = new Wishlist({
      user_id: userId,
      items: items,
      total_items: items.length
    });

    await wishlist.save();
    return wishlist;
  }

  // Create test compare
  static async createTestCompareList(userId, items = []) {
    const compare = new Compare({
      user_id: userId,
      items: items,
      total_items: items.length
    });

    await compare.save();
    return compare;
  }

  

  // Create test order with order details
  static async createTestOrder(userId, items = [], orderData = {}) {
    // Convert items to proper format for Order schema
    const formattedItems = items.map(item => {
      let productId;
      // Check if item.product_id is already a valid ObjectId or ObjectId string
      if (item.product_id && mongoose.Types.ObjectId.isValid(item.product_id)) {
        productId = new mongoose.Types.ObjectId(item.product_id);
      } else {
        // Create a new ObjectId if product_id is invalid or missing
        productId = new mongoose.Types.ObjectId();
      }
      
      return {
        product_id: productId,
        product_name: item.product_name || 'Test Product',
        product_sku: item.product_sku || 'TEST-001',
        quantity: item.quantity || 1,
        price: item.price || 100000,
        total: item.total || (item.price * item.quantity) || 100000
      };
    });

    // If no items provided, create default items
    if (formattedItems.length === 0) {
      formattedItems.push({
        product_id: new mongoose.Types.ObjectId(),
        product_name: 'Test Product',
        product_sku: 'TEST-001',
        quantity: 2,
        price: 100000,
        total: 200000
      });
    }

    const subtotal = formattedItems.reduce((sum, item) => sum + item.total, 0);
    
    // Generate order number if not provided
    let orderNumber = orderData.order_number;
    if (!orderNumber) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const sequence = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
      orderNumber = `GP${year}${month}${day}${sequence}`;
    }
    
    const defaultOrder = {
      order_number: orderNumber,
      user_id: userId,
      status: 'pending',
      items: formattedItems,
      subtotal: subtotal,
      total_amount: subtotal,
      shipping_address: {
        full_name: 'Test Customer',
        phone: '0123456789',
        email: 'test@example.com',
        street: '123 Test Street',
        city: 'Ho Chi Minh City',
        state: 'Ho Chi Minh',
        postal_code: '700000',
        country: 'Vietnam'
      },
      ...orderData
    };

    const order = new Order(defaultOrder);
    await order.save();

    // Convert to plain object and add id field for compatibility
    const orderObj = order.toObject();
    orderObj.id = orderObj.id || orderObj._id.toString();
    
    return orderObj;
  }

  // Create sample cart items
  static async createSampleCartItems(count = 2) {
    const items = [];
    
    for (let i = 0; i < count; i++) {
      const product = await this.createTestProduct({
        name: `Product ${i + 1}`,
        price: (i + 1) * 50000
      });

      const quantity = i + 1;
      items.push({
        product_id: product.id,
        product_name: product.name,
        product_image: product.image,
        product_slug: product.slug,
        price: product.price,
        quantity: quantity,
        total: product.price * quantity
      });
    }

    return items;
  }

  // Create sample wishlist items
  static async createSampleWishlistItems(count = 2) {
    const items = [];
    
    for (let i = 0; i < count; i++) {
      const product = await this.createTestProduct({
        name: `Wishlist Product ${i + 1}`,
        price: (i + 1) * 30000
      });

      items.push({
        product_id: product.id,
        product_name: product.name,
        product_image: product.image,
        product_slug: product.slug,
        price: product.price
      });
    }

    return items;
  }

  // Create sample compare items
  static async createSampleCompareItems(count = 2) {
    const items = [];
    
    for (let i = 0; i < count; i++) {
      const product = await this.createTestProduct({
        name: `Compare Product ${i + 1}`,
        price: (i + 1) * 30000
      });

      items.push({
        product_id: product.id,
        product_name: product.name,
        product_image: product.image,
        product_slug: product.slug,
        price: product.price
      });
    }

    return items;
  }

  // Clean up all test data
  static async cleanUp() {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Cart.deleteMany({});
    await Wishlist.deleteMany({});
    await Order.deleteMany({});
  }

  // Generate random string
  static generateRandomString(length = 8) {
    return Math.random().toString(36).substring(2, length + 2);
  }

  // Generate unique email
  static generateUniqueEmail() {
    return `test_${Date.now()}_${this.generateRandomString()}@example.com`;
  }

  // Generate unique username
  static generateUniqueUsername() {
    return `testuser_${Date.now()}_${this.generateRandomString()}`;
  }
}

module.exports = TestDataHelper;
