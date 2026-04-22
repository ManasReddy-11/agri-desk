import express from 'express';
import {
  // Consumer operations
  placeOrder,
  getOrderHistory,
  getOrderDetails,
  cancelOrder,
  trackOrder,
  // Farmer operations
  getFarmerIncomingOrders,
  getFarmerPendingOrders,
  acceptOrder,
  rejectOrder,
  updateDeliveryStatus,
  getFarmerOrderStats,
  // Admin operations
  getAllOrders,
  getOrderById,
  getHighValueOrders,
  getDeliveryDueOrders,
  getOrderStatistics,
} from '../controllers/orderController.js';
import { verifyToken, authorize, isConsumer, isFarmer } from '../middleware/auth.js';

const router = express.Router();

// ==================== CONSUMER ROUTES ====================
// All consumer routes require: verifyToken + isConsumer

// Place order
router.post('/', verifyToken, isConsumer, placeOrder);

// Get order history
router.get('/', verifyToken, isConsumer, getOrderHistory);

// Get order details
router.get('/:orderId', verifyToken, isConsumer, getOrderDetails);

// Track order
router.get('/:orderId/track', verifyToken, isConsumer, trackOrder);

// Track order (compatibility alias)
router.get('/:orderId/tracking', verifyToken, isConsumer, trackOrder);

// Cancel order
router.patch('/:orderId/cancel', verifyToken, isConsumer, cancelOrder);

// ==================== FARMER ROUTES ====================
// All farmer routes require: verifyToken + isFarmer

// Get incoming orders
router.get('/farmer/orders', verifyToken, isFarmer, getFarmerIncomingOrders);

// Get pending orders
router.get('/farmer/pending', verifyToken, isFarmer, getFarmerPendingOrders);

// Get farmer order statistics
router.get('/farmer/stats', verifyToken, isFarmer, getFarmerOrderStats);

// Accept order
router.patch('/:orderId/accept', verifyToken, isFarmer, acceptOrder);

// Reject order
router.patch('/:orderId/reject', verifyToken, isFarmer, rejectOrder);

// Update delivery status
router.patch('/:orderId/delivery-status', verifyToken, isFarmer, updateDeliveryStatus);

// ==================== ADMIN ROUTES ====================
// All admin routes require: verifyToken + authorize('admin')

// Get all orders
router.get('/admin/all', verifyToken, authorize('admin'), getAllOrders);

// Get order by ID
router.get('/admin/:orderId', verifyToken, authorize('admin'), getOrderById);

// Get high-value orders
router.get('/admin/high-value', verifyToken, authorize('admin'), getHighValueOrders);

// Get delivery due orders
router.get('/admin/delivery-due', verifyToken, authorize('admin'), getDeliveryDueOrders);

// Get order statistics
router.get('/admin/stats', verifyToken, authorize('admin'), getOrderStatistics);

export default router;
