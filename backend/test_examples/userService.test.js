const UserService = require('../../src/services/UserService');
const TestDataHelper = require('../helpers/testDataHelper');
const bcrypt = require('bcryptjs');

describe('UserService', () => {
  let testUser;
  let testAdmin;

  beforeEach(async () => {
    testUser = await TestDataHelper.createTestUserForServices();
    testAdmin = await TestDataHelper.createTestAdminForServices();
  });

  describe('getAllUsers', () => {
    test('should return users with pagination', async () => {
      // Tạo thêm users
      await TestDataHelper.createTestUserForServices();
      await TestDataHelper.createTestUserForServices();

      const result = await UserService.getAllUsers(1, 2);
      
      expect(result.users).toHaveLength(2);
      expect(result.pagination.current_page).toBe(1);
      expect(result.pagination.total_items).toBe(4); // 2 từ beforeEach + 2 mới tạo
    });

    test('should filter by role', async () => {
      const result = await UserService.getAllUsers(1, 10, { role: 'admin' });
      
      expect(result.users).toHaveLength(1);
      expect(result.users[0].role).toBe('admin');
    });

    test('should search by username/email', async () => {
      const uniqueUsername = `searchable_${Date.now()}`;
      await TestDataHelper.createTestUserForServices({ username: uniqueUsername });

      const result = await UserService.getAllUsers(1, 10, { search: uniqueUsername });
      
      expect(result.users).toHaveLength(1);
      expect(result.users[0].username).toBe(uniqueUsername);
    });

    test('should not return passwords', async () => {
      const result = await UserService.getAllUsers(1, 10);
      
      result.users.forEach(user => {
        expect(user.password).toBeUndefined();
      });
    });
  });

  describe('getUserById', () => {
    test('should return user without password', async () => {
      const user = await UserService.getUserById(testUser.id);
      
      expect(user.id).toBe(testUser.id);
      expect(user.username).toBe(testUser.username);
      expect(user.password).toBeUndefined();
    });

    test('should throw error for non-existent user', async () => {
      const mongoose = require('mongoose');
      const fakeObjectId = new mongoose.Types.ObjectId();
      
      await expect(
        UserService.getUserById(fakeObjectId)
      ).rejects.toThrow('User không tồn tại');
    });
  });

  describe('registerUser', () => {
    test('should register user successfully', async () => {
      const userData = {
        username: TestDataHelper.generateUniqueUsername(),
        email: TestDataHelper.generateUniqueEmail(),
        password: 'password123',
        full_name: 'New Test User',
        phone: '0987654321'
      };

      const user = await UserService.registerUser(userData);
      
      expect(user.username).toBe(userData.username);
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe('user');
      expect(user.password).toBeUndefined();
      expect(user.id).toBeDefined();
    });

    test('should throw error for duplicate username', async () => {
      const userData = {
        username: testUser.username,
        email: TestDataHelper.generateUniqueEmail(),
        password: 'password123',
        full_name: 'Test User'
      };

      await expect(
        UserService.registerUser(userData)
      ).rejects.toThrow('Username đã tồn tại');
    });

    test('should throw error for duplicate email', async () => {
      const userData = {
        username: TestDataHelper.generateUniqueUsername(),
        email: testUser.email,
        password: 'password123',
        full_name: 'Test User'
      };

      await expect(
        UserService.registerUser(userData)
      ).rejects.toThrow('Email đã tồn tại');
    });

    test('should hash password correctly', async () => {
      const userData = {
        username: TestDataHelper.generateUniqueUsername(),
        email: TestDataHelper.generateUniqueEmail(),
        password: 'password123',
        full_name: 'Test User'
      };

      await UserService.registerUser(userData);
      
      // Verify password is hashed in database
      const userInDb = await require('../../src/models/User').findOne({ 
        username: userData.username 
      });
      
      expect(userInDb.password).not.toBe(userData.password);
      expect(await bcrypt.compare(userData.password, userInDb.password)).toBe(true);
    });
  });

  describe('loginUser', () => {
    test('should login successfully with correct credentials', async () => {
      const loginData = {
        username: testUser.username,
        password: 'password123' // Default password from TestDataHelper
      };

      const result = await UserService.loginUser(loginData);
      
      expect(result.user.id).toBe(testUser.id);
      expect(result.user.username).toBe(testUser.username);
      expect(result.user.password).toBeUndefined();
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    test('should throw error for invalid username', async () => {
      const loginData = {
        username: 'nonexistentuser',
        password: 'password123'
      };

      await expect(
        UserService.loginUser(loginData)
      ).rejects.toThrow('Username hoặc password không đúng');
    });

    test('should throw error for invalid password', async () => {
      const loginData = {
        username: testUser.username,
        password: 'wrongpassword'
      };

      await expect(
        UserService.loginUser(loginData)
      ).rejects.toThrow('Username hoặc password không đúng');
    });

    test('should throw error for missing credentials', async () => {
      await expect(
        UserService.loginUser({ username: testUser.username })
      ).rejects.toThrow('Username và password là bắt buộc');

      await expect(
        UserService.loginUser({ password: 'password123' })
      ).rejects.toThrow('Username và password là bắt buộc');
    });
  });

  describe('loginAdmin', () => {
    test('should login admin successfully', async () => {
      const loginData = {
        username: testAdmin.username,
        password: 'password123'
      };

      const result = await UserService.loginAdmin(loginData);
      
      expect(result.user.role).toBe('admin');
      expect(result.token).toBeDefined();
    });

    test('should throw error for non-admin user', async () => {
      const loginData = {
        username: testUser.username,
        password: 'password123'
      };

      await expect(
        UserService.loginAdmin(loginData)
      ).rejects.toThrow('Bạn không có quyền truy cập trang admin');
    });
  });

  describe('updateUser', () => {
    test('should allow user to update own information', async () => {
      const updateData = {
        full_name: 'Updated Name',
        phone: '0999999999'
      };

      const updatedUser = await UserService.updateUser(
        testUser.id, 
        updateData, 
        testUser.id, 
        'user'
      );
      
      expect(updatedUser.full_name).toBe(updateData.full_name);
      expect(updatedUser.phone).toBe(updateData.phone);
    });

    test('should allow admin to update any user', async () => {
      const updateData = {
        full_name: 'Admin Updated Name'
      };

      const updatedUser = await UserService.updateUser(
        testUser.id, 
        updateData, 
        testAdmin.id, 
        'admin'
      );
      
      expect(updatedUser.full_name).toBe(updateData.full_name);
    });

    test('should prevent user from updating other users', async () => {
      const anotherUser = await TestDataHelper.createTestUserForServices();
      
      await expect(
        UserService.updateUser(
          anotherUser.id, 
          { full_name: 'Unauthorized Update' }, 
          testUser.id, 
          'user'
        )
      ).rejects.toThrow('Bạn không có quyền cập nhật thông tin user này');
    });

    test('should prevent duplicate username in update', async () => {
      const anotherUser = await TestDataHelper.createTestUserForServices();
      
      await expect(
        UserService.updateUser(
          testUser.id, 
          { username: anotherUser.username }, 
          testUser.id, 
          'user'
        )
      ).rejects.toThrow('Username đã tồn tại');
    });

    test('should prevent user from changing role', async () => {
      const updatedUser = await UserService.updateUser(
        testUser.id, 
        { role: 'admin' }, 
        testUser.id, 
        'user'
      );
      
      expect(updatedUser.role).toBe('user'); // Role should not change
    });
  });

  describe('deleteUser', () => {
    test('should allow admin to delete user', async () => {
      const result = await UserService.deleteUser(testUser.id, 'admin');
      
      expect(result.message).toContain('đã được xóa thành công');
      
      // Verify user is deleted
      await expect(
        UserService.getUserById(testUser.id)
      ).rejects.toThrow('User không tồn tại');
    });

    test('should prevent non-admin from deleting user', async () => {
      await expect(
        UserService.deleteUser(testUser.id, 'user')
      ).rejects.toThrow('Bạn không có quyền xóa user');
    });

    test('should prevent deleting admin user', async () => {
      await expect(
        UserService.deleteUser(testAdmin.id, 'admin')
      ).rejects.toThrow('Không thể xóa tài khoản admin');
    });
  });

  describe('changePassword', () => {
    test('should change password successfully', async () => {
      const passwordData = {
        current_password: 'password123',
        new_password: 'newpassword123'
      };

      const result = await UserService.changePassword(testUser.id, passwordData);
      
      expect(result.message).toContain('Đổi mật khẩu thành công');
      
      // Verify new password works
      const loginResult = await UserService.loginUser({
        username: testUser.username,
        password: 'newpassword123'
      });
      expect(loginResult.token).toBeDefined();
    });

    test('should throw error for incorrect current password', async () => {
      const passwordData = {
        current_password: 'wrongpassword',
        new_password: 'newpassword123'
      };

      await expect(
        UserService.changePassword(testUser.id, passwordData)
      ).rejects.toThrow('Mật khẩu hiện tại không đúng');
    });
  });

  describe('validateUserData', () => {
    test('should pass validation for valid data', () => {
      const userData = {
        username: 'validuser',
        email: 'valid@example.com',
        password: 'password123',
        full_name: 'Valid User'
      };

      expect(() => {
        UserService.validateUserData(userData);
      }).not.toThrow();
    });

    test('should throw error for short username', () => {
      const userData = {
        username: 'ab',
        email: 'valid@example.com',
        password: 'password123',
        full_name: 'Valid User'
      };

      expect(() => {
        UserService.validateUserData(userData);
      }).toThrow('Username phải có ít nhất 3 ký tự');
    });

    test('should throw error for invalid email', () => {
      const userData = {
        username: 'validuser',
        email: 'invalid-email',
        password: 'password123',
        full_name: 'Valid User'
      };

      expect(() => {
        UserService.validateUserData(userData);
      }).toThrow('Email không hợp lệ');
    });

    test('should throw error for short password', () => {
      const userData = {
        username: 'validuser',
        email: 'valid@example.com',
        password: '123',
        full_name: 'Valid User'
      };

      expect(() => {
        UserService.validateUserData(userData);
      }).toThrow('Mật khẩu phải có ít nhất 6 ký tự');
    });
  });

  describe('validateAdminRole', () => {
    test('should not throw error for admin role', () => {
      expect(() => {
        UserService.validateAdminRole('admin');
      }).not.toThrow();
    });

    test('should throw error for non-admin role', () => {
      expect(() => {
        UserService.validateAdminRole('user');
      }).toThrow('Bạn không có quyền thực hiện hành động này');
    });
  });
});
