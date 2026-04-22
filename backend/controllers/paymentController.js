import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import { AppError } from '../middleware/errorHandler.js';
import crypto from 'crypto';

const getAuthenticatedUserId = (req) => req.user?.id || req.user?._id;

/**
 * PAYMENT CONTROLLER
 * 
 * Handles all payment operations including:
 * - Payment initiation
 * - Mock gateway simulation (Razorpay/Stripe style)
 * - Payment verification
 * - Refund processing
 * - Payment reconciliation
 */

// ============================================================================
// UTILITY FUNCTIONS - MOCK PAYMENT GATEWAY
// ============================================================================

/**
 * Mock Razorpay Gateway
 * Simulates real payment gateway behavior
 */
class MockPaymentGateway {
  /**
   * Create order in mock gateway
   * Razorpay style: Creates order with amount, currency, receipt
   */
  static createOrder(amount, currency = 'INR', receipt = '') {
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      id: orderId,
      entity: 'order',
      amount: Math.round(amount * 100), // Amount in paise
      amount_paid: 0,
      amount_due: Math.round(amount * 100),
      currency,
      receipt,
      offer_id: null,
      status: 'created',
      attempts: 0,
      notes: {},
      created_at: Math.floor(Date.now() / 1000)
    };
  }

  /**
   * Generate test payment response
   * Simulates customer completing payment
   */
  static processPayment(orderId, paymentMethod = 'card') {
    const success = Math.random() > 0.15; // 85% success rate for testing

    if (success) {
      return {
        status: 'success',
        razorpay_payment_id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        razorpay_order_id: orderId,
        razorpay_signature: crypto.randomBytes(32).toString('hex'),
        method: paymentMethod,
        amount: 0,
        currency: 'INR'
      };
    } else {
      // Random failure reason
      const failures = [
        { code: 'PAYMENT_DECLINED', message: 'Your card was declined' },
        { code: 'INSUFFICIENT_FUNDS', message: 'Insufficient funds in account' },
        { code: 'NETWORK_ERROR', message: 'Network timeout. Please try again' },
        { code: 'INVALID_CARD', message: 'Invalid card details' },
        { code: 'FRAUD_DETECTED', message: 'Transaction blocked for security' }
      ];
      const failure = failures[Math.floor(Math.random() * failures.length)];

      return {
        status: 'failed',
        error: {
          code: failure.code,
          description: failure.message,
          source: 'business',
          reason: 'card_declined',
          metadata: {}
        }
      };
    }
  }

  /**
   * Verify payment signature
   * Mock signature verification (in real Razorpay: HMAC SHA256)
   */
  static verifySignature(paymentId, orderId, signature) {
    // In production: Verify HMAC SHA256 signature
    // For mock: Just validate format
    return signature && signature.length === 64;
  }

  /**
   * Process refund
   */
  static processRefund(paymentId, refundAmount) {
    const refundId = `rfnd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: refundId,
      entity: 'refund',
      payment_id: paymentId,
      amount: refundAmount,
      currency: 'INR',
      receipt: null,
      status: 'processed',
      speed_processed: 'optimized',
      speed_requested: 'optimized',
      notes: {},
      created_at: Math.floor(Date.now() / 1000)
    };
  }
}

// ============================================================================
// CONSUMER OPERATIONS
// ============================================================================

/**
 * POST /api/payment/initiate
 * Consumer initiates payment for order
 * 
 * Body: {
 *   orderId: ObjectId,
 *   paymentMethod: 'card|upi|netbanking|wallet',
 *   paymentGateway: 'razorpay|stripe|mock',
 *   metadata: { ipAddress, userAgent, deviceId }
 * }
 */
export const initiatePayment = async (req, res, next) => {
  try {
    const { orderId, paymentMethod, paymentGateway = 'mock', metadata = {} } = req.body;
    const consumerId = getAuthenticatedUserId(req);

    // Validate input
    if (!orderId || !paymentMethod) {
      return next(new AppError('Order ID and payment method are required', 400));
    }

    // Fetch order
    const order = await Order.findById(orderId).populate('consumer');
    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    // Verify consumer owns order
    if (order.consumer._id.toString() !== consumerId.toString()) {
      return next(new AppError('Not authorized to pay for this order', 403));
    }

    // Check order status
    if (!['pending'].includes(order.status)) {
      return next(new AppError('Only pending orders can be paid', 400));
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ orderId, status: 'success' });
    if (existingPayment) {
      return next(new AppError('Payment already completed for this order', 400));
    }

    // Create payment record
    let payment = new Payment({
      orderId,
      consumer: consumerId,
      amount: order.total,
      currency: order.currency || 'INR',
      paymentMethod,
      paymentGateway,
      status: 'pending',
      metadata: {
        ...metadata,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    // Create gateway order
    const gatewayOrder = MockPaymentGateway.createOrder(
      order.total,
      'INR',
      `order_${orderId}`
    );

    // Update payment with gateway info
    payment = await payment.markInitiated(gatewayOrder.id);

    res.status(200).json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        payment: payment.getSummary(),
        gatewayOrder: {
          id: gatewayOrder.id,
          amount: gatewayOrder.amount,
          currency: gatewayOrder.currency,
          status: gatewayOrder.status
        },
        order: {
          id: order._id,
          total: order.total,
          status: order.status
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payment/process
 * Consumer completes payment through gateway
 * Simulates form submission to payment gateway
 * 
 * Body: {
 *   paymentId: String or ObjectId,
 *   orderId: ObjectId,
 *   method: 'card|upi|netbanking',
 *   cardDetails: { number, expiry, cvv } OR
 *   upiId: String
 * }
 */
export const processPayment = async (req, res, next) => {
  try {
    const { paymentId, orderId, method, cardDetails, upiId } = req.body;
    const consumerId = getAuthenticatedUserId(req);

    // Fetch payment
    let payment = await Payment.findOne({
      $or: [{ _id: paymentId }, { paymentId }],
      consumer: consumerId
    });

    if (!payment) {
      return next(new AppError('Payment record not found', 404));
    }

    // Check payment status
    if (!['pending', 'initiated'].includes(payment.status)) {
      return next(new AppError(`Cannot process payment in ${payment.status} status`, 400));
    }

    // Mark as processing
    payment = await payment.markProcessing();

    // Call mock gateway
    const gatewayResponse = MockPaymentGateway.processPayment(
      payment.gatewayOrderId,
      method
    );

    // Store payment details (masked)
    if (method === 'card' && cardDetails) {
      payment.paymentDetails = {
        method: 'card',
        cardBrand: 'Visa', // Simulated - in real world: from payment gateway
        cardLast4: cardDetails.number.slice(-4) || 'XXXX',
        cardExpiry: cardDetails.expiry
      };
    } else if (method === 'upi' && upiId) {
      payment.paymentDetails = {
        method: 'upi',
        upiId: upiId.split('@')[0] + '@....' // Masked
      };
    }

    // Handle response
    if (gatewayResponse.status === 'success') {
      // Payment successful
      payment = await payment.markSuccess(
        gatewayResponse.razorpay_payment_id,
        gatewayResponse.razorpay_order_id,
        gatewayResponse.razorpay_signature
      );

      // Update order payment status
      await Order.findByIdAndUpdate(
        orderId,
        {
          'payment.status': 'completed',
          'payment.paymentMethod': method,
          'payment.transactionId': gatewayResponse.razorpay_payment_id,
          'payment.paidAt': new Date()
        },
        { new: true }
      );

      res.status(200).json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          payment: payment.getSummary(),
          transactionId: gatewayResponse.razorpay_payment_id,
          receiptUrl: gatewayResponse.receipt || `/receipt/${payment.paymentId}`
        }
      });
    } else {
      // Payment failed
      const errorCode = gatewayResponse.error?.code || 'UNKNOWN_ERROR';
      const errorMessage = gatewayResponse.error?.description || 'Payment processing failed';

      payment = await payment.markFailed(errorCode, errorMessage);

      res.status(400).json({
        success: false,
        message: 'Payment failed',
        data: {
          payment: payment.getSummary(),
          error: {
            code: errorCode,
            message: errorMessage,
            retryable: true
          }
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payment/verify
 * Verify/confirm payment (after redirect from gateway)
 * Simulates webhook verification
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const { paymentId, transactionId, orderId } = req.body;
    const consumerId = getAuthenticatedUserId(req);

    // Fetch payment
    const payment = await Payment.findOne({
      $or: [{ _id: paymentId }, { paymentId }],
      consumer: consumerId
    });

    if (!payment) {
      return next(new AppError('Payment record not found', 404));
    }

    // Check if already verified
    if (payment.status === 'success') {
      res.status(200).json({
        success: true,
        message: 'Payment already verified',
        data: {
          payment: payment.getSummary(),
          status: 'already_verified'
        }
      });
      return;
    }

    // Verify transaction (in production: call gateway API)
    if (!transactionId) {
      return next(new AppError('Transaction ID required for verification', 400));
    }

    // Mark as successful if verification passes
    if (payment.status === 'processing') {
      await payment.markSuccess(transactionId, payment.gatewayOrderId);

      // Update order
      await Order.findByIdAndUpdate(
        orderId,
        {
          'payment.status': 'completed',
          'payment.transactionId': transactionId,
          'payment.paidAt': new Date()
        },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        payment: payment.getSummary()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payment/:paymentId
 * Get payment details
 */
export const getPaymentDetails = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const consumerId = getAuthenticatedUserId(req);

    const payment = await Payment.findOne(
      {
        $or: [{ _id: paymentId }, { paymentId }],
        consumer: consumerId
      }
    ).populate('orderId', 'orderNumber status total');

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Payment details retrieved',
      data: {
        payment: payment.toObject(),
        summary: payment.getSummary()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payment
 * Get consumer's payment history
 */
export const getPaymentHistory = async (req, res, next) => {
  try {
    const consumerId = getAuthenticatedUserId(req);
    const { page = 1, limit = 10, status, method } = req.query;

    const result = await Payment.getConsumerPayments(consumerId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      method
    });

    res.status(200).json({
      success: true,
      message: 'Payment history retrieved',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payment/:paymentId/retry
 * Retry failed payment
 */
export const retryPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const consumerId = getAuthenticatedUserId(req);
    const { method } = req.body;

    const payment = await Payment.findOne(
      {
        $or: [{ _id: paymentId }, { paymentId }],
        consumer: consumerId
      }
    );

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    // Only allow retry for failed payments
    if (payment.status !== 'failed') {
      return next(new AppError('Only failed payments can be retried', 400));
    }

    // Limit retry attempts to 3
    if (payment.attemptCount >= 3) {
      return next(new AppError('Maximum retry attempts exceeded', 400));
    }

    // Reset payment for retry
    payment.status = 'initiated';
    payment.transactionId = null;
    payment.errorCode = null;
    payment.errorMessage = null;
    payment.paymentMethod = method || payment.paymentMethod;

    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Payment retry initiated',
      data: {
        payment: payment.getSummary(),
        attemptNumber: payment.attemptCount + 1
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// REFUND OPERATIONS
// ============================================================================

/**
 * POST /api/payment/:paymentId/refund
 * Initiate refund for payment
 */
export const initiateRefund = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason = 'Customer Request' } = req.body;
    const consumerId = getAuthenticatedUserId(req);

    const payment = await Payment.findOne(
      {
        $or: [{ _id: paymentId }, { paymentId }],
        consumer: consumerId
      }
    );

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    // Check if refundable
    if (!payment.isRefundable) {
      return next(new AppError('Payment is not eligible for refund', 400));
    }

    // Validate refund amount
    const refundAmount = amount || payment.amount;
    if (refundAmount > payment.amount) {
      return next(new AppError('Refund amount cannot exceed payment amount', 400));
    }

    // Initiate refund
    await payment.initiateRefund(refundAmount, reason);

    res.status(200).json({
      success: true,
      message: 'Refund initiated successfully',
      data: {
        payment: payment.getSummary(),
        refund: {
          id: payment.refund.refundId,
          amount: refundAmount,
          status: 'initiated',
          reason
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payment/:paymentId/refund/process
 * Process refund through gateway
 * Admin/System operation
 */
export const processRefund = async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findOne({
      $or: [{ _id: paymentId }, { paymentId }]
    });

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    if (payment.refund.status !== 'initiated') {
      return next(new AppError('Refund must be initiated first', 400));
    }

    // Call mock gateway refund
    const gatewayRefund = MockPaymentGateway.processRefund(
      payment.transactionId,
      payment.refund.amount
    );

    // Update payment
    await payment.completeRefund(gatewayRefund.id);

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        payment: payment.getSummary(),
        refund: {
          id: gatewayRefund.id,
          amount: gatewayRefund.amount,
          status: 'completed',
          processedAt: new Date()
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payment/:paymentId/refund/status
 * Get refund status
 */
export const getRefundStatus = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const consumerId = getAuthenticatedUserId(req);

    const payment = await Payment.findOne(
      {
        $or: [{ _id: paymentId }, { paymentId }],
        consumer: consumerId
      }
    );

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Refund status retrieved',
      data: {
        refund: payment.refund,
        paymentStatus: payment.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// ADMIN OPERATIONS
// ============================================================================

/**
 * GET /api/payment/admin/all
 * Get all payments (admin)
 */
export const getAllPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, method, startDate, endDate } = req.query;

    const query = {};
    if (status) query.status = status;
    if (method) query.paymentMethod = method;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (Math.max(1, page) - 1) * limit;

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('orderId consumer', 'orderNumber status name email');

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'All payments retrieved',
      data: {
        payments,
        pagination: {
          current: page,
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payment/admin/:paymentId
 * Get specific payment details (admin)
 */
export const getPaymentDetailsAdmin = async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findOne({
      $or: [{ _id: paymentId }, { paymentId }]
    }).populate('orderId consumer');

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Payment details retrieved',
      data: {
        payment: payment.toObject()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payment/admin/stats
 * Get payment statistics (admin)
 */
export const getPaymentStats = async (req, res, next) => {
  try {
    const stats = await Payment.getPaymentStats();

    res.status(200).json({
      success: true,
      message: 'Payment statistics retrieved',
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payment/admin/revenue
 * Get revenue analytics (admin)
 */
export const getRevenueAnalytics = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    const dailyRevenue = await Payment.getDailyRevenue(parseInt(days));

    // Calculate summary
    const totalRevenue = dailyRevenue.reduce((sum, day) => sum + day.total, 0);
    const avgDaily = totalRevenue / dailyRevenue.length || 0;
    const totalTransactions = dailyRevenue.reduce((sum, day) => sum + day.count, 0);

    res.status(200).json({
      success: true,
      message: 'Revenue analytics retrieved',
      data: {
        summary: {
          totalRevenue,
          avgDaily,
          totalTransactions,
          period: `${days} days`,
          average: avgDaily
        },
        dailyBreakdown: dailyRevenue
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payment/admin/pending
 * Get pending payments (admin)
 */
export const getPendingPayments = async (req, res, next) => {
  try {
    const payments = await Payment.getPendingPayments();

    res.status(200).json({
      success: true,
      message: 'Pending payments retrieved',
      data: {
        count: payments.length,
        payments
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payment/admin/failed
 * Get failed payments (admin)
 */
export const getFailedPayments = async (req, res, next) => {
  try {
    const { hours = 24 } = req.query;

    const payments = await Payment.getFailedPayments(parseInt(hours));

    res.status(200).json({
      success: true,
      message: 'Failed payments retrieved',
      data: {
        count: payments.length,
        period: `${hours} hours`,
        payments
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payment/admin/refunds/pending
 * Get pending refunds (admin)
 */
export const getPendingRefunds = async (req, res, next) => {
  try {
    const refunds = await Payment.getPendingRefunds();

    res.status(200).json({
      success: true,
      message: 'Pending refunds retrieved',
      data: {
        count: refunds.length,
        refunds
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payment/admin/:paymentId/refund/process
 * Process pending refund (admin)
 */
export const adminProcessRefund = async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findOne({
      $or: [{ _id: paymentId }, { paymentId }]
    });

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    if (payment.refund.status !== 'initiated') {
      return next(new AppError('No initiated refund found', 400));
    }

    // Process through mock gateway
    const gatewayRefund = MockPaymentGateway.processRefund(
      payment.transactionId,
      payment.refund.amount
    );

    await payment.completeRefund(gatewayRefund.id);

    res.status(200).json({
      success: true,
      message: 'Refund processed by admin',
      data: {
        payment: payment.getSummary(),
        refund: gatewayRefund
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payment/admin/reconciliation/pending
 * Get unreconciled payments (admin)
 */
export const getPendingReconciliation = async (req, res, next) => {
  try {
    const payments = await Payment.getUnreconciledPayments();

    res.status(200).json({
      success: true,
      message: 'Unreconciled payments retrieved',
      data: {
        count: payments.length,
        payments
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payment/admin/:paymentId/reconcile
 * Mark payment as reconciled (admin)
 */
export const reconcilePayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findOne({
      $or: [{ _id: paymentId }, { paymentId }]
    });

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    if (payment.status !== 'success') {
      return next(new AppError('Only successful payments can be reconciled', 400));
    }

    await payment.markReconciled();

    res.status(200).json({
      success: true,
      message: 'Payment reconciled',
      data: {
        payment: payment.getSummary()
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
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
};
