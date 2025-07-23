# GP247 E-commerce Platform

Một nền tảng thương mại điện tử toàn diện được xây dựng với React (Frontend) và Node.js (Backend), tích hợp MongoDB cho cơ sở dữ liệu và hệ thống xác thực JWT.

## 🚀 Tính năng chính

### Backend (Node.js + Express + MongoDB)
- ✅ **Xác thực & Phân quyền**: JWT Authentication với role-based access control
- ✅ **Models**: User, Product, Category, Order với MongoDB schemas
- ✅ **Controllers**: Auth, Product, Category, Order với business logic đầy đủ
- ✅ **Middleware**: Rate limiting, error handling, authentication
- ✅ **API Security**: Helmet, CORS, input validation
- ✅ **Database**: MongoDB với Mongoose ODM

### Frontend (React 18 + Vite)
- ✅ **Authentication**: Login/Register với AuthContext
- ✅ **Protected Routes**: Route protection dựa trên authentication
- ✅ **State Management**: Context API cho Auth và Cart
- ✅ **UI Components**: Modern responsive design với Bootstrap 5
- ✅ **API Integration**: Axios với interceptors và error handling
- ✅ **Toast Notifications**: React-toastify cho user feedback

### Chức năng E-commerce
- 🛍️ **Catalog**: Product listing, search, filtering, categories
- 🛒 **Shopping Cart**: Add/remove items, quantity management
- ❤️ **Wishlist**: Save favorite products
- ⚖️ **Compare**: Compare products side by side
- 📦 **Orders**: Order management với status tracking
- 👤 **User Management**: Profile, order history
- 🔐 **Admin Panel**: Product/category/order management

## 📋 Yêu cầu hệ thống

- **Node.js**: >= 16.0.0
- **MongoDB**: >= 4.4
- **NPM**: >= 8.0.0

## 🛠️ Cài đặt

### 1. Clone repository
\`\`\`bash
git clone <repository-url>
cd G47
\`\`\`

### 2. Setup Backend
\`\`\`bash
cd backend

# Cài đặt dependencies
npm install

# Tạo file .env
cp .env.example .env

# Cập nhật file .env với thông tin của bạn:
# PORT=3001
# NODE_ENV=development
# MONGODB_URI=mongodb://localhost:27017/gp247_ecommerce
# JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
# JWT_EXPIRE=24h
\`\`\`

### 3. Setup Frontend
\`\`\`bash
cd frontend

# Cài đặt dependencies
npm install
\`\`\`

### 4. Setup Database
Đảm bảo MongoDB đang chạy trên máy của bạn:
\`\`\`bash
# Khởi động MongoDB (Ubuntu/Debian)
sudo systemctl start mongod

# Hoặc sử dụng MongoDB Atlas (cloud)
# Cập nhật MONGODB_URI trong .env với connection string của Atlas
\`\`\`

## 🚀 Chạy ứng dụng

### Development Mode

**Terminal 1 - Backend:**
\`\`\`bash
cd backend
npm run dev
# Server chạy tại: http://localhost:3001
\`\`\`

**Terminal 2 - Frontend:**
\`\`\`bash
cd frontend
npm run dev
# App chạy tại: http://localhost:5173
\`\`\`

## 📚 API Documentation

### Authentication Endpoints
\`\`\`
POST /api/auth/register - Đăng ký tài khoản
POST /api/auth/login - Đăng nhập
GET /api/auth/profile - Lấy thông tin profile
PUT /api/auth/profile - Cập nhật profile
POST /api/auth/change-password - Đổi mật khẩu
GET /api/auth/verify - Verify token
\`\`\`

### Product Endpoints
\`\`\`
GET /api/products - Lấy danh sách sản phẩm
GET /api/products/featured - Sản phẩm nổi bật
GET /api/products/search - Tìm kiếm sản phẩm
GET /api/products/:slug - Chi tiết sản phẩm
POST /api/products - Tạo sản phẩm (Admin)
PUT /api/products/:id - Cập nhật sản phẩm (Admin)
DELETE /api/products/:id - Xóa sản phẩm (Admin)
\`\`\`

### Category Endpoints
\`\`\`
GET /api/categories - Danh sách danh mục
GET /api/categories/tree - Cây danh mục
GET /api/categories/:slug - Chi tiết danh mục
GET /api/categories/:slug/products - Sản phẩm theo danh mục
POST /api/categories - Tạo danh mục (Admin)
PUT /api/categories/:id - Cập nhật danh mục (Admin)
DELETE /api/categories/:id - Xóa danh mục (Admin)
\`\`\`

### Order Endpoints
\`\`\`
POST /api/orders - Tạo đơn hàng
GET /api/orders/my-orders - Đơn hàng của user
GET /api/orders/:orderId - Chi tiết đơn hàng
POST /api/orders/:orderId/cancel - Hủy đơn hàng
GET /api/orders - Tất cả đơn hàng (Admin)
PUT /api/orders/:orderId/status - Cập nhật trạng thái (Admin)
GET /api/orders/stats/overview - Thống kê (Admin)
\`\`\`

## 🔑 User Roles

### Customer
- Xem sản phẩm, danh mục
- Thêm vào giỏ hàng, wishlist, compare
- Đặt hàng, xem lịch sử đơn hàng
- Hủy đơn hàng (trong 2 giờ)
- Cập nhật profile

### Admin
- Tất cả quyền của Customer
- Quản lý sản phẩm (CRUD)
- Quản lý danh mục (CRUD)
- Quản lý đơn hàng (cập nhật trạng thái)
- Xem thống kê

## 🏗️ Cấu trúc thư mục

\`\`\`
G47/
├── backend/
│   ├── src/
│   │   ├── config/         # Database config
│   │   ├── models/         # MongoDB models
│   │   ├── controllers/    # Business logic
│   │   ├── routes/         # API routes
│   │   └── middleware/     # Custom middleware
│   ├── server.js           # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React contexts
│   │   ├── services/       # API services
│   │   └── styles/         # CSS files
│   ├── index.html
│   └── package.json
└── README.md
\`\`\`

## 🔧 Scripts

### Backend
\`\`\`bash
npm start          # Production mode
npm run dev        # Development mode với nodemon
\`\`\`

### Frontend
\`\`\`bash
npm run dev        # Development server
npm run build      # Build cho production
npm run preview    # Preview build
\`\`\`

## 🐛 Troubleshooting

### Lỗi kết nối MongoDB
- Kiểm tra MongoDB service đang chạy
- Xác nhận connection string trong .env
- Kiểm tra firewall/network settings

### Lỗi CORS
- Kiểm tra frontend URL trong backend CORS config
- Đảm bảo withCredentials được set đúng

### Lỗi JWT
- Kiểm tra JWT_SECRET trong .env
- Clear localStorage và đăng nhập lại

## 📄 License

MIT License

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit changes (\`git commit -m 'Add AmazingFeature'\`)
4. Push to branch (\`git push origin feature/AmazingFeature\`)
5. Open Pull Request

## 📞 Support

Nếu gặp vấn đề, vui lòng tạo issue trên GitHub repository. 