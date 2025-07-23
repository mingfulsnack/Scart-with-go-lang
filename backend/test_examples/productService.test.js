const ProductService = require('../../src/services/ProductService');
const TestDataHelper = require('../helpers/testDataHelper');

describe('ProductService', () => {
  let testCategory;
  let testProduct;

  beforeEach(async () => {
    testCategory = await TestDataHelper.createTestCategory();
    testProduct = await TestDataHelper.createTestProduct({
      category_id: testCategory.id
    });
  });

  describe('getAllProducts', () => {
    test('should return products with pagination', async () => {
      // Tạo thêm một vài products
      await TestDataHelper.createTestProduct({ category_id: testCategory.id });
      await TestDataHelper.createTestProduct({ category_id: testCategory.id });

      const result = await ProductService.getAllProducts(1, 2);
      
      expect(result.products).toHaveLength(2);
      expect(result.pagination.current_page).toBe(1);
      expect(result.pagination.total_items).toBe(3);
      expect(result.pagination.total_pages).toBe(2);
    });

    test('should filter by category_id', async () => {
      const category2 = await TestDataHelper.createTestCategory();
      await TestDataHelper.createTestProduct({ category_id: category2.id });

      const result = await ProductService.getAllProducts(1, 10, { 
        category_id: testCategory.id 
      });
      
      expect(result.products).toHaveLength(1);
      expect(result.products[0].category_id).toBe(testCategory.id);
    });

    test('should filter by price range', async () => {
      await TestDataHelper.createTestProduct({ 
        category_id: testCategory.id,
        price: 50000 
      });
      await TestDataHelper.createTestProduct({ 
        category_id: testCategory.id,
        price: 150000 
      });

      const result = await ProductService.getAllProducts(1, 10, { 
        min_price: 60000,
        max_price: 120000
      });
      
      expect(result.products).toHaveLength(1);
      expect(result.products[0].price).toBe(100000); // testProduct price
    });

    test('should search by name', async () => {
      await TestDataHelper.createTestProduct({ 
        category_id: testCategory.id,
        name: 'Special Product Name'
      });

      const result = await ProductService.getAllProducts(1, 10, { 
        search: 'Special'
      });
      
      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toContain('Special');
    });
  });

  describe('getProductById', () => {
    test('should return product by id', async () => {
      const product = await ProductService.getProductById(testProduct.id);
      
      expect(product.id).toBe(testProduct.id);
      expect(product.name).toBe(testProduct.name);
    });

    test('should throw error for non-existent product', async () => {
      await expect(
        ProductService.getProductById(999999)
      ).rejects.toThrow('Sản phẩm không tồn tại');
    });
  });

  describe('createProduct', () => {
    test('should create product successfully', async () => {
      const productData = {
        name: 'New Test Product',
        price: 200000,
        category_id: testCategory.id,
        description: 'New product description',
        stock: 5
      };

      const product = await ProductService.createProduct(productData);
      
      expect(product.name).toBe(productData.name);
      expect(product.price).toBe(productData.price);
      expect(product.slug).toBe('new-test-product');
      expect(product.id).toBeDefined();
    });

    test('should throw error for missing required fields', async () => {
      const productData = {
        price: 200000
        // Missing name and category_id
      };

      await expect(
        ProductService.createProduct(productData)
      ).rejects.toThrow('name là bắt buộc');
    });

    test('should throw error for non-existent category', async () => {
      const productData = {
        name: 'Test Product',
        price: 200000,
        category_id: 999999
      };

      await expect(
        ProductService.createProduct(productData)
      ).rejects.toThrow('Category không tồn tại');
    });
  });

  describe('updateProduct', () => {
    test('should update product successfully', async () => {
      const updateData = {
        name: 'Updated Product Name',
        price: 300000
      };

      const updatedProduct = await ProductService.updateProduct(testProduct.id, updateData);
      
      expect(updatedProduct.name).toBe(updateData.name);
      expect(updatedProduct.price).toBe(updateData.price);
      expect(updatedProduct.slug).toBe('updated-product-name');
    });

    test('should throw error for non-existent product', async () => {
      await expect(
        ProductService.updateProduct(999999, { name: 'Test' })
      ).rejects.toThrow('Sản phẩm không tồn tại');
    });

    test('should throw error for non-existent category in update', async () => {
      await expect(
        ProductService.updateProduct(testProduct.id, { category_id: 999999 })
      ).rejects.toThrow('Category không tồn tại');
    });
  });

  describe('deleteProduct', () => {
    test('should delete product successfully', async () => {
      const result = await ProductService.deleteProduct(testProduct.id);
      
      expect(result.message).toContain('đã được xóa thành công');
      
      // Verify product is deleted
      await expect(
        ProductService.getProductById(testProduct.id)
      ).rejects.toThrow('Sản phẩm không tồn tại');
    });

    test('should throw error for non-existent product', async () => {
      await expect(
        ProductService.deleteProduct(999999)
      ).rejects.toThrow('Sản phẩm không tồn tại');
    });
  });

  describe('getFeaturedProducts', () => {
    test('should return only featured products', async () => {
      await TestDataHelper.createTestProduct({ 
        category_id: testCategory.id,
        is_featured: true
      });
      await TestDataHelper.createTestProduct({ 
        category_id: testCategory.id,
        is_featured: false
      });

      const products = await ProductService.getFeaturedProducts(10);
      
      expect(products).toHaveLength(1);
      expect(products[0].is_featured).toBe(true);
    });
  });

  describe('getRelatedProducts', () => {
    test('should return products from same category', async () => {
      const relatedProduct = await TestDataHelper.createTestProduct({ 
        category_id: testCategory.id
      });

      const products = await ProductService.getRelatedProducts(testProduct.id, 10);
      
      expect(products).toHaveLength(1);
      expect(products[0].id).toBe(relatedProduct.id);
      expect(products[0].category_id).toBe(testCategory.id);
    });

    test('should exclude the original product', async () => {
      const products = await ProductService.getRelatedProducts(testProduct.id, 10);
      
      expect(products.every(p => p.id !== testProduct.id)).toBe(true);
    });
  });

  describe('generateSlug', () => {
    test('should generate slug correctly', () => {
      const slug = ProductService.generateSlug('Test Product Name');
      expect(slug).toBe('test-product-name');
    });

    test('should handle special characters', () => {
      const slug = ProductService.generateSlug('Test Product @#$ Name!!!');
      expect(slug).toBe('test-product-name');
    });

    test('should handle multiple spaces', () => {
      const slug = ProductService.generateSlug('Test    Product   Name');
      expect(slug).toBe('test-product-name');
    });
  });

  describe('validateProductData', () => {
    test('should pass validation for valid data', () => {
      const productData = {
        name: 'Valid Product Name',
        price: 100000,
        category_id: 1
      };

      expect(() => {
        ProductService.validateProductData(productData);
      }).not.toThrow();
    });

    test('should throw error for short name', () => {
      const productData = {
        name: 'AB',
        price: 100000,
        category_id: 1
      };

      expect(() => {
        ProductService.validateProductData(productData);
      }).toThrow('Tên sản phẩm phải có ít nhất 3 ký tự');
    });

    test('should throw error for invalid price', () => {
      const productData = {
        name: 'Valid Name',
        price: -100,
        category_id: 1
      };

      expect(() => {
        ProductService.validateProductData(productData);
      }).toThrow('Giá sản phẩm phải lớn hơn 0');
    });

    test('should throw error for missing category_id', () => {
      const productData = {
        name: 'Valid Name',
        price: 100000
      };

      expect(() => {
        ProductService.validateProductData(productData);
      }).toThrow('Category ID là bắt buộc');
    });
  });
});
