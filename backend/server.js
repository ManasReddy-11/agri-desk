import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import 'express-async-errors';

// Load environment variables
dotenv.config();

// Import middleware
import { globalErrorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import userRoutes from './routes/userRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Import database connection
import { connectDB } from './config/db.js';

const app = express();
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================
// Database Connection
// ============================================
if (NODE_ENV !== 'test') {
  connectDB();
}

// ============================================
// Middleware Configuration
// ============================================

// Security Middleware
app.use(helmet()); // Set security HTTP headers

// CORS Configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Logging Middleware
app.use(morgan('combined'));
app.use(requestLogger);

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// ============================================
// API Routes
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

// ============================================
// Health Check Endpoint
// ============================================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// 404 Handler
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// ============================================
// Global Error Handler (Must be last)
// ============================================
app.use(globalErrorHandler);

// ============================================
// Server Startup
// ============================================
const PORT = process.env.PORT || 5000;
let server;

if (NODE_ENV !== 'test') {
  server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║         AgriDesk Backend Server               ║
╚═══════════════════════════════════════════════╝
Server running on: http://localhost:${PORT}
Environment: ${NODE_ENV}
Time: ${new Date().toISOString()}
  `);
  });
}

// ============================================
// Graceful Shutdown
// ============================================
if (server) {
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

export default app;
