const CartService = require('../../src/services/CartService');
const TestDataHelper = require('../helpers/testDataHelper');

describe('CartService', () => {
  let testUser, testAdmin, testProduct;

  beforeEach(async () => {
    // Tạo test data
    testUser = await TestDataHelper.createTestUserForServices();
    testAdmin = await TestDataHelper.createTestAdminForServices();
    testProduct = await TestDataHelper.createTestProduct();
  });

  describe('validateUserRole', () => {
      test('should throw error for admin role', () => {
        expect(() => {
          CartService.validateUserRole('admin');
        }).toThrow('Admin không có quyền thao tác với giỏ hàng');
      });
  
      test('should not throw error for user role', () => {
        expect(() => {
          CartService.validateUserRole('user');
        }).not.toThrow();
      });
    });

    describe('getUserCart', () => {
    test('should return empty cart for new user', async () => {
      const result = await CartService.getUserCart(testUser.id, 'user');
        expect(result).toEqual({
            items: [],
            total_amount: 0,
            total_items: 0
        });
    });

    test('should return existing cart', async () => {
      // Tạo cart với items
      const cartItems = await TestDataHelper.createSampleCartItems(2);
      await TestDataHelper.createTestCart(testUser.id, cartItems);

      const result = await CartService.getUserCart(testUser.id, 'user');

      expect(result.items).toHaveLength(2);
      expect(result.total_items).toBe(3); // quantity 1 + 2 = 3
      expect(result.total_amount).toBe(cartItems.reduce((total, item) => total + (item.price * item.quantity), 0));
    });
  });

  describe('addToCart', () => {
    test('should add product to empty cart successfully', async () => {
      const result = await CartService.addToCart(testUser.id, 'user', testProduct.id, 1);

      expect(result.items).toHaveLength(1);
      expect(result.total_items).toBe(1);
      expect(result.items[0].product_id).toBe(testProduct.id);
      expect(result.items[0].product_name).toBe(testProduct.name);
    });

  test('should throw error for missing product_id', async () => {
    await expect(
      CartService.addToCart(testUser.id, 'user', null, 1)
      ).rejects.toThrow('product_id là bắt buộc');
    });

    test('should throw error for non-existent product', async () => {
      const nonExistentProductId = 999999;
      
      await expect(
        CartService.addToCart(testUser.id, 'user', nonExistentProductId, 1)
      ).rejects.toThrow('Sản phẩm không tồn tại');
    });


    test('should add multiple different products', async () => {
      const product2 = await TestDataHelper.createTestProduct({
        name: 'Product 2'
      });

      // Thêm product đầu tiên
      await CartService.addToCart(testUser.id, 'user', testProduct.id, 1);

      // Thêm product thứ hai
      const result = await CartService.addToCart(testUser.id, 'user', product2.id, 1);

      expect(result.items).toHaveLength(2);
      expect(result.total_items).toBe(2);
    });

    test('should increase quantity when adding same product', async () => {
      // Thêm lần đầu
      await CartService.addToCart(testUser.id, 'user', testProduct.id, 1);
      
      // Thêm lần thứ hai cùng product
      const result = await CartService.addToCart(testUser.id, 'user', testProduct.id, 2);

      expect(result.items).toHaveLength(1);
      expect(result.total_items).toBe(3);
      expect(result.items[0].quantity).toBe(3);
    });

    test('should throw error for invalid quantity', async () => {
      await expect(
        CartService.addToCart(testUser.id, 'user', testProduct.id, 0)
      ).rejects.toThrow('Số lượng phải lớn hơn 0');

      await expect(
        CartService.addToCart(testUser.id, 'user', testProduct.id, -1)
      ).rejects.toThrow('Số lượng phải lớn hơn 0');

      await expect(
        CartService.addToCart(testUser.id, 'user', testProduct.id, 1.5)
      ).rejects.toThrow('Số lượng phải là số nguyên');
    });

    test('should throw error when exceeding stock', async () => {
      const productWithLimitedStock = await TestDataHelper.createTestProduct({
        amount: 2
      });

      await expect(
        CartService.addToCart(testUser.id, 'user', productWithLimitedStock.id, 5)
      ).rejects.toThrow('Sản phẩm chỉ còn 2 trong kho');
    });

    test('should throw error when adding to existing item exceeds stock', async () => {
      const productWithLimitedStock = await TestDataHelper.createTestProduct({
        amount: 3
      });

      // Thêm 2 sản phẩm trước
      await CartService.addToCart(testUser.id, 'user', productWithLimitedStock.id, 2);

      // Thêm 2 nữa sẽ vượt quá stock (2+2=4 > 3)
      await expect(
        CartService.addToCart(testUser.id, 'user', productWithLimitedStock.id, 2)
      ).rejects.toThrow('Sản phẩm chỉ còn 3 trong kho');
    });
  });

  describe('updateCartItem', () => {
    test('should update quantity successfully', async () => {
      // Thêm product vào cart trước
      await CartService.addToCart(testUser.id, 'user', testProduct.id, 1);

      // Update quantity
      const result = await CartService.updateCartItem(testUser.id, 'user', testProduct.id, 3);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(3);
      expect(result.total_items).toBe(3);
    });

    test('should throw error for non-existent cart', async () => {
      await expect(
        CartService.updateCartItem(testUser.id, 'user', testProduct.id, 2)
      ).rejects.toThrow('Giỏ hàng không tồn tại');
    });

    test('should throw error for non-existent product in cart', async () => {
      // Tạo cart với product khác
      const product2 = await TestDataHelper.createTestProduct();
      await CartService.addToCart(testUser.id, 'user', product2.id, 1);

      // Cập nhật product không có trong cart
      await expect(
        CartService.updateCartItem(testUser.id, 'user', testProduct.id, 2)
      ).rejects.toThrow('Sản phẩm không có trong giỏ hàng');
    });

    test('should throw error for invalid quantity', async () => {
      await CartService.addToCart(testUser.id, 'user', testProduct.id, 1);

      await expect(
        CartService.updateCartItem(testUser.id, 'user', testProduct.id, 0)
      ).rejects.toThrow('Số lượng phải lớn hơn 0');
    });

    test('should throw error when exceeding stock', async () => {
      const productWithLimitedStock = await TestDataHelper.createTestProduct({
        amount: 2
      });

      await CartService.addToCart(testUser.id, 'user', productWithLimitedStock.id, 1);

      await expect(
        CartService.updateCartItem(testUser.id, 'user', productWithLimitedStock.id, 5)
      ).rejects.toThrow('Sản phẩm chỉ còn 2 trong kho');
    });

    test('should recalculate totals correctly', async () => {
      const product2 = await TestDataHelper.createTestProduct({
        price: 200000
      });

      await CartService.addToCart(testUser.id, 'user', testProduct.id, 1); // 100000
      await CartService.addToCart(testUser.id, 'user', product2.id, 1); // 200000

      const result = await CartService.updateCartItem(testUser.id, 'user', testProduct.id, 3); // 300000

      expect(result.total_amount).toBe(500000); // 300000 + 200000
      expect(result.total_items).toBe(4); // 3 + 1
    });
  });

  describe('removeFromCart', () => {
    test('should remove product successfully', async () => {
      await CartService.addToCart(testUser.id, 'user', testProduct.id, 2);

      const result = await CartService.removeFromCart(testUser.id, 'user', testProduct.id);

      expect(result.items).toHaveLength(0);
      expect(result.total_items).toBe(0);
      expect(result.total_amount).toBe(0);
    });

    test('should remove only specified product', async () => {
      const product2 = await TestDataHelper.createTestProduct({
        price: 200000
      });

      await CartService.addToCart(testUser.id, 'user', testProduct.id, 1);
      await CartService.addToCart(testUser.id, 'user', product2.id, 1);

      const result = await CartService.removeFromCart(testUser.id, 'user', testProduct.id);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].product_id).toBe(product2.id);
      expect(result.total_amount).toBe(200000);
      expect(result.total_items).toBe(1);
    });

    test('should throw error for non-existent cart', async () => {
      await expect(
        CartService.removeFromCart(testUser.id, 'user', testProduct.id)
      ).rejects.toThrow('Giỏ hàng không tồn tại');
    });

    test('should throw error for non-existent product in cart', async () => {
      const product2 = await TestDataHelper.createTestProduct();
      await CartService.addToCart(testUser.id, 'user', product2.id, 1);

      await expect(
        CartService.removeFromCart(testUser.id, 'user', testProduct.id)
      ).rejects.toThrow('Sản phẩm không có trong giỏ hàng');
    });
  });

  describe('clearCart', () => {
    test('should clear cart successfully', async () => {
      // Thêm một vài products vào cart
      await CartService.addToCart(testUser.id, 'user', testProduct.id, 1);

      const product2 = await TestDataHelper.createTestProduct();
      await CartService.addToCart(testUser.id, 'user', product2.id, 1);

      // Clear cart
      const result = await CartService.clearCart(testUser.id, 'user');
      
      expect(result.items).toHaveLength(0);
      expect(result.total_items).toBe(0);
      expect(result.total_amount).toBe(0);
    });

    test('should work even when cart does not exist', async () => {
      const newUser = await TestDataHelper.createTestUserForServices();

      const result = await CartService.clearCart(newUser.id, 'user');

      expect(result.items).toHaveLength(0);
      expect(result.total_items).toBe(0);
      expect(result.total_amount).toBe(0);
    });
  });

    describe('getCartCount', () => {
        test('should return 0 for non-existent cart', async () => {
          const count = await CartService.getCartCount(testUser.id);
          expect(count).toBe(0);
        });
    
        test('should return correct count', async () => {
          await CartService.addToCart(testUser.id, 'user', testProduct.id, 1);
          
          const product2 = await TestDataHelper.createTestProduct();
          await CartService.addToCart(testUser.id, 'user', product2.id, 1);

          const count = await CartService.getCartCount(testUser.id);
          expect(count).toBe(2);
        });
    });

  describe('validateCartStock', () => {
    test('should validate cart stock successfully', async () => {
      // Thêm product vào cart
      await CartService.addToCart(testUser.id, 'user', testProduct.id, 2);

      const result = await CartService.validateCartStock(testUser.id);

      expect(result.valid).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].product_id).toBe(testProduct.id);
      expect(result.items[0].quantity).toBe(2);
      expect(result.items[0].available_stock).toBe(testProduct.amount);
      expect(result.items[0].valid).toBe(true);
    });

    test('should detect insufficient stock', async () => {
      // Tạo product với stock thấp
      const lowStockProduct = await TestDataHelper.createTestProduct({ amount: 1 });

      // Force thêm vào cart với số lượng lớn (bypass validation bằng cách tạo cart trực tiếp)
      const Cart = require('../../src/models/Cart');
      const cart = new Cart({
        user_id: testUser.id,
        items: [{
          product_id: lowStockProduct.id,
          product_name: lowStockProduct.name,
          product_image: lowStockProduct.image,
          product_slug: lowStockProduct.slug,
          price: lowStockProduct.price,
          quantity: 5, // Vượt quá stock
          total: lowStockProduct.price * 5
        }],
        total_items: 5,
        total_amount: lowStockProduct.price * 5
      });
      await cart.save();

      const result = await CartService.validateCartStock(testUser.id);

      expect(result.valid).toBe(false);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].product_id).toBe(lowStockProduct.id);
      expect(result.items[0].quantity).toBe(5);
      expect(result.items[0].available_stock).toBe(1);
      expect(result.items[0].valid).toBe(false);
    });

    test('should handle empty cart', async () => {
      const newUser = await TestDataHelper.createTestUserForServices();

      const result = await CartService.validateCartStock(newUser.id);

      expect(result.valid).toBe(true);
      expect(result.items).toHaveLength(0);
    });

    test('should handle unavailable products', async () => {
      // Thêm product vào cart trước
      await CartService.addToCart(testUser.id, 'user', testProduct.id, 1);

      // Xoá product khỏi database để simulate unavailable product
      const Product = require('../../src/models/Product');
      await Product.findOneAndDelete({ id: testProduct.id });

      const result = await CartService.validateCartStock(testUser.id);

      expect(result.valid).toBe(false);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].product_id.toString()).toBe(testProduct.id.toString());
      expect(result.items[0].quantity).toBe(1);
      expect(result.items[0].available_stock).toBe(0);
      expect(result.items[0].valid).toBe(false);
    });
  });
});
