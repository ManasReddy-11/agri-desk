import express from 'express';
import {
  initiatePayment,
  processPayment,
  verifyPayment,
  getPaymentDetails,
  getPaymentHistory,
  retryPayment,
  initiateRefund,
  processRefund,
  getRefundStatus,
  getAllPayments,
  getPaymentDetailsAdmin,
  getPaymentStats,
  getRevenueAnalytics,
  getPendingPayments,
  getFailedPayments,
  getPendingRefunds,
  adminProcessRefund,
  getPendingReconciliation,
  reconcilePayment
} from '../controllers/paymentController.js';
import { verifyToken, isConsumer, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * ============================================================================
 * CONSUMER PAYMENT ROUTES (Protected - Consumer Only)
 * ============================================================================
 */

// POST /api/payment/initiate
// Initiate payment for an order
router.post('/initiate', verifyToken, isConsumer, initiatePayment);

// POST /api/payment/process
// Process payment through mock gateway
router.post('/process', verifyToken, isConsumer, processPayment);

// POST /api/payment/verify
// Verify payment completion (after gateway redirect)
router.post('/verify', verifyToken, isConsumer, verifyPayment);

// GET /api/payment/:paymentId
// Get specific payment details
router.get('/:paymentId', verifyToken, isConsumer, getPaymentDetails);

// GET /api/payment
// Get consumer's payment history
router.get('/', verifyToken, isConsumer, getPaymentHistory);

// POST /api/payment/:paymentId/retry
// Retry failed payment
router.post('/:paymentId/retry', verifyToken, isConsumer, retryPayment);

// ============================================================================
// REFUND ROUTES (Consumer can initiate, admin processes)
// ============================================================================

// POST /api/payment/:paymentId/refund
// Initiate refund for a payment
router.post('/:paymentId/refund', verifyToken, isConsumer, initiateRefund);

// GET /api/payment/:paymentId/refund/status
// Get refund status
router.get('/:paymentId/refund/status', verifyToken, isConsumer, getRefundStatus);

// POST /api/payment/:paymentId/refund/process
// Process refund (admin only)
router.post('/:paymentId/refund/process', verifyToken, authorize('admin'), processRefund);

/**
 * ============================================================================
 * ADMIN PAYMENT ROUTES (Protected - Admin Only)
 * ============================================================================
 */

// GET /api/payment/admin/all
// Get all payments with filters
router.get('/admin/all', verifyToken, authorize('admin'), getAllPayments);

// GET /api/payment/admin/stats
// Get payment statistics
router.get('/admin/stats', verifyToken, authorize('admin'), getPaymentStats);

// GET /api/payment/admin/revenue
// Get revenue analytics
router.get('/admin/revenue', verifyToken, authorize('admin'), getRevenueAnalytics);

// GET /api/payment/admin/pending
// Get pending payments
router.get('/admin/pending', verifyToken, authorize('admin'), getPendingPayments);

// GET /api/payment/admin/failed
// Get failed payments
router.get('/admin/failed', verifyToken, authorize('admin'), getFailedPayments);

// GET /api/payment/admin/refunds/pending
// Get pending refunds
router.get('/admin/refunds/pending', verifyToken, authorize('admin'), getPendingRefunds);

// POST /api/payment/admin/:paymentId/refund/process
// Admin process refund
router.post('/admin/:paymentId/refund/process', verifyToken, authorize('admin'), adminProcessRefund);

// GET /api/payment/admin/:paymentId
// Get specific payment details (admin)
router.get('/admin/:paymentId', verifyToken, authorize('admin'), getPaymentDetailsAdmin);

// GET /api/payment/admin/reconciliation/pending
// Get pending reconciliation
router.get('/admin/reconciliation/pending', verifyToken, authorize('admin'), getPendingReconciliation);

// POST /api/payment/admin/:paymentId/reconcile
// Mark payment as reconciled
router.post('/admin/:paymentId/reconcile', verifyToken, authorize('admin'), reconcilePayment);

export default router;
