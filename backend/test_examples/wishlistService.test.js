const WishlistService = require('../../src/services/WishlistService');
const TestDataHelper = require('../helpers/testDataHelper');

describe('WishlistService', () => {
  let testUser;
  let testAdmin;
  let testProduct;

  beforeEach(async () => {
    // Tạo test data
    testUser = await TestDataHelper.createTestUser();
    testAdmin = await TestDataHelper.createTestAdmin();
    testProduct = await TestDataHelper.createTestProduct();
  });

  describe('validateUserRole', () => {
    test('should throw error for admin role', () => {
      expect(() => {
        WishlistService.validateUserRole('admin');
      }).toThrow('Admin không có quyền thao tác với wishlist');
    });

    test('should not throw error for user role', () => {
      expect(() => {
        WishlistService.validateUserRole('user');
      }).not.toThrow();
    });
  });

  describe('getUserWishlist', () => {
    test('should return empty wishlist for new user', async () => {
      const result = await WishlistService.getUserWishlist(testUser.id);
      
      expect(result).toEqual({
        items: [],
        count: 0
      });
    });

    test('should return existing wishlist', async () => {
      // Tạo wishlist với items
      const wishlistItems = await TestDataHelper.createSampleWishlistItems(2);
      await TestDataHelper.createTestWishlist(testUser.id, wishlistItems);

      const result = await WishlistService.getUserWishlist(testUser.id);
      
      expect(result.items).toHaveLength(2);
      expect(result.count).toBe(2);
    });
  });

  describe('addProductToWishlist', () => {
    test('should add product to empty wishlist successfully', async () => {
      const result = await WishlistService.addProductToWishlist(testUser.id, testProduct.id);
      
      expect(result.items).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(result.items[0].product_id).toBe(testProduct.id);
      expect(result.items[0].product_name).toBe(testProduct.name);
    });

    test('should throw error for missing product_id', async () => {
      await expect(
        WishlistService.addProductToWishlist(testUser.id, null)
      ).rejects.toThrow('product_id là bắt buộc');
    });

    test('should throw error for non-existent product', async () => {
      const nonExistentProductId = 999999;
      
      await expect(
        WishlistService.addProductToWishlist(testUser.id, nonExistentProductId)
      ).rejects.toThrow('Sản phẩm không tồn tại');
    });

    test('should throw error when product already in wishlist', async () => {
      // Thêm product lần đầu
      await WishlistService.addProductToWishlist(testUser.id, testProduct.id);
      
      // Thử thêm lại product đó
      await expect(
        WishlistService.addProductToWishlist(testUser.id, testProduct.id)
      ).rejects.toThrow('Sản phẩm đã có trong wishlist');
    });

    test('should add multiple different products', async () => {
      const product2 = await TestDataHelper.createTestProduct({
        name: 'Product 2'
      });

      // Thêm product đầu tiên
      await WishlistService.addProductToWishlist(testUser.id, testProduct.id);
      
      // Thêm product thứ hai
      const result = await WishlistService.addProductToWishlist(testUser.id, product2.id);
      
      expect(result.items).toHaveLength(2);
      expect(result.count).toBe(2);
    });
  });

  describe('removeProductFromWishlist', () => {
    beforeEach(async () => {
      // Thêm product vào wishlist trước mỗi test
      await WishlistService.addProductToWishlist(testUser.id, testProduct.id);
    });

    test('should remove product from wishlist successfully', async () => {
      const result = await WishlistService.removeProductFromWishlist(testUser.id, testProduct.id);
      
      expect(result.items).toHaveLength(0);
      expect(result.count).toBe(0);
    });

    test('should throw error when wishlist does not exist', async () => {
      const newUser = await TestDataHelper.createTestUser();
      
      await expect(
        WishlistService.removeProductFromWishlist(newUser.id, testProduct.id)
      ).rejects.toThrow('Wishlist không tồn tại');
    });

    test('should throw error when product not in wishlist', async () => {
      const anotherProduct = await TestDataHelper.createTestProduct();
      
      await expect(
        WishlistService.removeProductFromWishlist(testUser.id, anotherProduct.id)
      ).rejects.toThrow('Sản phẩm không có trong wishlist');
    });
  });

  describe('clearUserWishlist', () => {
    test('should clear wishlist successfully', async () => {
      // Thêm một vài products vào wishlist
      await WishlistService.addProductToWishlist(testUser.id, testProduct.id);
      
      const product2 = await TestDataHelper.createTestProduct();
      await WishlistService.addProductToWishlist(testUser.id, product2.id);

      // Clear wishlist
      const result = await WishlistService.clearUserWishlist(testUser.id);
      
      expect(result.items).toHaveLength(0);
      expect(result.count).toBe(0);
    });

    test('should work even when wishlist does not exist', async () => {
      const newUser = await TestDataHelper.createTestUser();
      
      const result = await WishlistService.clearUserWishlist(newUser.id);
      
      expect(result.items).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe('isProductInWishlist', () => {
    test('should return false when wishlist does not exist', async () => {
      const result = await WishlistService.isProductInWishlist(testUser.id, testProduct.id);
      expect(result).toBe(false);
    });

    test('should return false when product not in wishlist', async () => {
      const anotherProduct = await TestDataHelper.createTestProduct();
      await WishlistService.addProductToWishlist(testUser.id, testProduct.id);
      
      const result = await WishlistService.isProductInWishlist(testUser.id, anotherProduct.id);
      expect(result).toBe(false);
    });

    test('should return true when product is in wishlist', async () => {
      await WishlistService.addProductToWishlist(testUser.id, testProduct.id);
      
      const result = await WishlistService.isProductInWishlist(testUser.id, testProduct.id);
      expect(result).toBe(true);
    });
  });

  describe('getWishlistCount', () => {
    test('should return 0 for non-existent wishlist', async () => {
      const count = await WishlistService.getWishlistCount(testUser.id);
      expect(count).toBe(0);
    });

    test('should return correct count', async () => {
      await WishlistService.addProductToWishlist(testUser.id, testProduct.id);
      
      const product2 = await TestDataHelper.createTestProduct();
      await WishlistService.addProductToWishlist(testUser.id, product2.id);

      const count = await WishlistService.getWishlistCount(testUser.id);
      expect(count).toBe(2);
    });
  });
});
