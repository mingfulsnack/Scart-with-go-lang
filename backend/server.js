// server.js
require("dotenv").config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const connectDB = require('./src/config/db');
const { errorHandler } = require('./src/middleware/authMiddleware');

const app = express();

// Database Connection
connectDB();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(helmet());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const cartRoutes = require('./src/routes/cartRoutes');
const wishlistRoutes = require('./src/routes/wishlistRoutes');
const compareRoutes = require('./src/routes/compareRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/admin', adminRoutes);

// Legacy routes cho tương thích với frontend cũ
app.get('/api/banners', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        image: "https://picsum.photos/1200/400?random=1",
      },
      {
        id: 2,
        image: "https://picsum.photos/1200/400?random=2",
      },
      {
        id: 3,
        image: "https://picsum.photos/1200/400?random=3",
      }
    ]
  });
});

app.get('/api/search', async (req, res) => {
  try {
    const { keyword } = req.query;
    const Product = require('./src/models/Product');
    
    if (!keyword) {
      return res.json({ success: true, data: [] });
    }

    const products = await Product.find({
      name: { $regex: keyword, $options: 'i' }
    }).limit(20);

    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, message: "Search error" });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server - tạm thời hardcode port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 GP247 Backend API server is running on http://localhost:${PORT}`);
  console.log(`📱 CORS enabled for: http://localhost:5173`);
}); 