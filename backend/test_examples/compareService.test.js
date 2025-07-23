const CompareService = require('../../src/services/CompareService');
const TestDataHelper = require('../helpers/testDataHelper');

describe('CompareService', () => {
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
        CompareService.validateUserRole('admin');
      }).toThrow('Admin không có quyền thao tác với compare');
    });

    test('should not throw error for user role', () => {
      expect(() => {
        CompareService.validateUserRole('user');
      }).not.toThrow();
    });
  });

  describe('getUserCompareList', () => {
    test('should return empty compare list for new user', async () => {
      const result = await CompareService.getUserCompareList(testUser.id);

      expect(result).toEqual({
        items: [],
        count: 0
      });
    });

    test('should return existing compare list', async () => {
      // Tạo compare list với items
      const compareItems = await TestDataHelper.createSampleCompareItems(2);
      await TestDataHelper.createTestCompareList(testUser.id, compareItems);

      const result = await CompareService.getUserCompareList(testUser.id);

      expect(result.items).toHaveLength(2);
      expect(result.count).toBe(2);
    });
  });

  describe('addProductToCompare', () => {
    test('should add product to empty compare list successfully', async () => {
      const result = await CompareService.addProductToCompare(testUser.id, testProduct.id);

      expect(result.items).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(result.items[0].product_id).toBe(testProduct.id);
      expect(result.items[0].product_name).toBe(testProduct.name);
    });

    test('should throw error for missing product_id', async () => {
      await expect(
        CompareService.addProductToCompare(testUser.id, null)
      ).rejects.toThrow('product_id là bắt buộc');
    });

    test('should throw error for non-existent product', async () => {
      const nonExistentProductId = 999999;
      
      await expect(
        CompareService.addProductToCompare(testUser.id, nonExistentProductId)
      ).rejects.toThrow('Sản phẩm không tồn tại');
    });

    test('should throw error when product already in compare list', async () => {
      // Thêm product lần đầu
      await CompareService.addProductToCompare(testUser.id, testProduct.id);

      // Thử thêm lại product đó
      await expect(
        CompareService.addProductToCompare(testUser.id, testProduct.id)
      ).rejects.toThrow('Sản phẩm đã có trong compare list');
    });

    test('should add multiple different products', async () => {
      const product2 = await TestDataHelper.createTestProduct({
        name: 'Product 2'
      });

      // Thêm product đầu tiên
      await CompareService.addProductToCompare(testUser.id, testProduct.id);

      // Thêm product thứ hai
      const result = await CompareService.addProductToCompare(testUser.id, product2.id);

      expect(result.items).toHaveLength(2);
      expect(result.count).toBe(2);
    });
  });

  describe('removeProductFromCompare', () => {
    beforeEach(async () => {
      // Thêm product vào compare trước mỗi test
      await CompareService.addProductToCompare(testUser.id, testProduct.id);
    });

    test('should remove product from compare successfully', async () => {
      const result = await CompareService.removeProductFromCompare(testUser.id, testProduct.id);

      expect(result.items).toHaveLength(0);
      expect(result.count).toBe(0);
    });

    test('should throw error when compare does not exist', async () => {
      const newUser = await TestDataHelper.createTestUser();
      
      await expect(
        CompareService.removeProductFromCompare(newUser.id, testProduct.id)
      ).rejects.toThrow('Compare không tồn tại');
    });

    test('should throw error when product not in compare list', async () => {
      const anotherProduct = await TestDataHelper.createTestProduct();
      
      await expect(
        CompareService.removeProductFromCompare(testUser.id, anotherProduct.id)
      ).rejects.toThrow('Sản phẩm không có trong compare list');
    });
  });

  describe('clearUserCompare', () => {
    test('should clear compare successfully', async () => {
      // Thêm một vài products vào compare
      await CompareService.addProductToCompare(testUser.id, testProduct.id);

      const product2 = await TestDataHelper.createTestProduct();
      await CompareService.addProductToCompare(testUser.id, product2.id);

      // Clear compare
      const result = await CompareService.clearUserCompare(testUser.id);
      
      expect(result.items).toHaveLength(0);
      expect(result.count).toBe(0);
    });

    test('should work even when compare does not exist', async () => {
      const newUser = await TestDataHelper.createTestUser();

      const result = await CompareService.clearUserCompare(newUser.id);

      expect(result.items).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe('isProductInCompare', () => {
    test('should return false when compare does not exist', async () => {
      const result = await CompareService.isProductInCompare(testUser.id, testProduct.id);
      expect(result).toBe(false);
    });

    test('should return false when product not in compare list', async () => {
      const anotherProduct = await TestDataHelper.createTestProduct();
      await CompareService.addProductToCompare(testUser.id, testProduct.id);

      const result = await CompareService.isProductInCompare(testUser.id, anotherProduct.id);
      expect(result).toBe(false);
    });

    test('should return true when product is in compare list', async () => {
      await CompareService.addProductToCompare(testUser.id, testProduct.id);

      const result = await CompareService.isProductInCompare(testUser.id, testProduct.id);
      expect(result).toBe(true);
    });
  });

  describe('getCompareCount', () => {
    test('should return 0 for non-existent compare', async () => {
      const count = await CompareService.getCompareCount(testUser.id);
      expect(count).toBe(0);
    });

    test('should return correct count', async () => {
      await CompareService.addProductToCompare(testUser.id, testProduct.id);
      
      const product2 = await TestDataHelper.createTestProduct();
      await CompareService.addProductToCompare(testUser.id, product2.id);

      const count = await CompareService.getCompareCount(testUser.id);
      expect(count).toBe(2);
    });
  });
});
