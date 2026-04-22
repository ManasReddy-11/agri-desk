import mongoose from 'mongoose';

/**
 * Payment Schema
 * 
 * Stores payment records for all orders
 * Integrates with Order module
 * Supports multiple payment methods
 * Tracks payment lifecycle and reconciliation
 */

const paymentSchema = new mongoose.Schema(
  {
    // Payment identification
    paymentId: {
      type: String,
      unique: true,
      required: [true, 'Payment ID is required'],
      index: true,
      default: () => `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    },

    // Reference to order
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order ID is required'],
      index: true
    },

    // Consumer information
    consumer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Consumer ID is required'],
      index: true
    },

    // Payment amount
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
      validate: {
        validator: function (value) {
          return value === Math.round(value * 100) / 100; // Max 2 decimal places
        },
        message: 'Amount must have max 2 decimal places'
      }
    },

    // Payment currency
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP'],
      default: 'INR'
    },

    // Payment method
    paymentMethod: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'wallet', 'cod'],
      required: [true, 'Payment method is required']
    },

    // Payment gateway
    paymentGateway: {
      type: String,
      enum: ['razorpay', 'stripe', 'paypal', 'mock'],
      default: 'mock'
    },

    // Payment status lifecycle
    status: {
      type: String,
      enum: ['pending', 'initiated', 'processing', 'success', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
      index: true
    },

    // Transaction details
    transactionId: {
      type: String,
      sparse: true,
      index: true
    },

    // Gateway payment ID (Razorpay/Stripe reference)
    gatewayPaymentId: {
      type: String,
      sparse: true,
      unique: true
    },

    // Gateway order ID
    gatewayOrderId: {
      type: String,
      sparse: true
    },

    // Payment signature (for verification)
    paymentSignature: {
      type: String,
      sparse: true
    },

    // Payment details
    paymentDetails: {
      method: String,
      cardBrand: String,        // visa, mastercard, amex, etc
      cardLast4: String,         // Last 4 digits of card
      cardExpiry: String,        // MM/YY
      upiId: String,             // UPI ID if UPI payment
      accountNumber: String,     // Account number if netbanking (masked)
      bankCode: String,          // Bank code for netbanking
      walletProvider: String,    // Wallet provider name
      walletId: String           // Wallet ID
    },

    // Error information
    errorCode: {
      type: String,
      sparse: true
    },

    errorMessage: {
      type: String,
      sparse: true
    },

    // Attempt information
    attemptCount: {
      type: Number,
      default: 1,
      min: 1
    },

    lastAttemptAt: {
      type: Date,
      sparse: true
    },

    // Receipt and invoice
    receiptNumber: {
      type: String,
      sparse: true,
      unique: true
    },

    invoiceUrl: {
      type: String,
      sparse: true
    },

    // Timestamps
    initiatedAt: {
      type: Date,
      default: Date.now
    },

    processedAt: {
      type: Date,
      sparse: true
    },

    successAt: {
      type: Date,
      sparse: true
    },

    failedAt: {
      type: Date,
      sparse: true
    },

    // Refund information
    refund: {
      status: {
        type: String,
        enum: ['none', 'initiated', 'processing', 'completed', 'failed'],
        default: 'none'
      },
      refundId: String,
      amount: Number,
      reason: String,
      initiatedAt: Date,
      completedAt: Date,
      gatewayRefundId: String
    },

    // Settlement information
    settlement: {
      settled: {
        type: Boolean,
        default: false
      },
      settledAt: Date,
      settlementId: String,
      fees: Number,
      netAmount: Number
    },

    // Additional metadata
    metadata: {
      ipAddress: String,
      userAgent: String,
      deviceId: String,
      notes: String
    },

    // Reconciliation
    reconciled: {
      type: Boolean,
      default: false,
      index: true
    },

    reconciledAt: {
      type: Date,
      sparse: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ============================================================================
// INDEXES
// ============================================================================

paymentSchema.index({ consumer: 1, _id: -1 });           // Consumer's payments
paymentSchema.index({ orderId: 1 });                      // Find payment by order
paymentSchema.index({ status: 1, _id: -1 });             // Payments by status
paymentSchema.index({ createdAt: -1 });                  // Recent payments
paymentSchema.index({ transactionId: 1 });              // Transaction lookup
paymentSchema.index({ 'refund.status': 1 });            // Refund tracking
paymentSchema.index({ reconciled: 1, 'settlement.settled': 1 }); // Reconciliation

// ============================================================================
// VIRTUAL PROPERTIES
// ============================================================================

/**
 * Get payment status label
 */
paymentSchema.virtual('statusLabel').get(function () {
  const labels = {
    pending: 'Awaiting Payment',
    initiated: 'Payment Initiated',
    processing: 'Processing Payment',
    success: 'Payment Successful',
    failed: 'Payment Failed',
    cancelled: 'Payment Cancelled',
    refunded: 'Refunded'
  };
  return labels[this.status] || 'Unknown';
});

/**
 * Check if payment is successful
 */
paymentSchema.virtual('isSuccessful').get(function () {
  return this.status === 'success';
});

/**
 * Check if payment failed
 */
paymentSchema.virtual('isFailed').get(function () {
  return this.status === 'failed';
});

/**
 * Check if payment is refundable
 */
paymentSchema.virtual('isRefundable').get(function () {
  return ['success', 'processing'].includes(this.status) && 
         this.refund.status === 'none';
});

/**
 * Get days since payment
 */
paymentSchema.virtual('daysSincePayment').get(function () {
  if (!this.successAt) return null;
  return Math.floor((Date.now() - this.successAt) / (1000 * 60 * 60 * 24));
});

/**
 * Get formatted amount
 */
paymentSchema.virtual('formattedAmount').get(function () {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: this.currency
  });
  return formatter.format(this.amount);
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Mark payment as initiated
 */
paymentSchema.methods.markInitiated = function (gatewayOrderId) {
  this.status = 'initiated';
  this.gatewayOrderId = gatewayOrderId;
  this.lastAttemptAt = new Date();
  return this.save();
};

/**
 * Mark payment as processing
 */
paymentSchema.methods.markProcessing = function () {
  this.status = 'processing';
  this.lastAttemptAt = new Date();
  return this.save();
};

/**
 * Mark payment as successful
 */
paymentSchema.methods.markSuccess = function (transactionId, gatewayPaymentId, signature = null) {
  this.status = 'success';
  this.transactionId = transactionId;
  this.gatewayPaymentId = gatewayPaymentId;
  this.paymentSignature = signature;
  this.successAt = new Date();
  this.processedAt = new Date();
  return this.save();
};

/**
 * Mark payment as failed
 */
paymentSchema.methods.markFailed = function (errorCode, errorMessage) {
  this.status = 'failed';
  this.errorCode = errorCode;
  this.errorMessage = errorMessage;
  this.failedAt = new Date();
  this.processedAt = new Date();
  this.attemptCount += 1;
  return this.save();
};

/**
 * Mark payment as cancelled
 */
paymentSchema.methods.markCancelled = function (reason = 'User cancelled') {
  this.status = 'cancelled';
  this.errorMessage = reason;
  this.processedAt = new Date();
  return this.save();
};

/**
 * Initiate refund
 */
paymentSchema.methods.initiateRefund = function (refundAmount = null, reason = 'Customer Request') {
  if (!this.isRefundable) {
    throw new Error('Payment is not refundable in current status');
  }

  this.refund.status = 'initiated';
  this.refund.amount = refundAmount || this.amount;
  this.refund.reason = reason;
  this.refund.initiatedAt = new Date();
  this.refund.refundId = `REF_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  return this.save();
};

/**
 * Mark refund as completed
 */
paymentSchema.methods.completeRefund = function (gatewayRefundId) {
  if (this.refund.status !== 'initiated') {
    throw new Error('Refund must be initiated first');
  }

  this.refund.status = 'completed';
  this.refund.completedAt = new Date();
  this.refund.gatewayRefundId = gatewayRefundId;
  this.status = 'refunded';

  return this.save();
};

/**
 * Mark refund as failed
 */
paymentSchema.methods.failRefund = function (reason) {
  this.refund.status = 'failed';
  this.refund.reason = reason;
  return this.save();
};

/**
 * Mark as settled
 */
paymentSchema.methods.markSettled = function (settlementId, fees = 0) {
  this.settlement.settled = true;
  this.settlement.settledAt = new Date();
  this.settlement.settlementId = settlementId;
  this.settlement.fees = fees;
  this.settlement.netAmount = this.amount - fees;
  return this.save();
};

/**
 * Mark as reconciled
 */
paymentSchema.methods.markReconciled = function () {
  this.reconciled = true;
  this.reconciledAt = new Date();
  return this.save();
};

/**
 * Get payment summary
 */
paymentSchema.methods.getSummary = function () {
  return {
    paymentId: this.paymentId,
    amount: this.amount,
    currency: this.currency,
    status: this.status,
    statusLabel: this.statusLabel,
    method: this.paymentMethod,
    transactionId: this.transactionId,
    successAt: this.successAt,
    failedAt: this.failedAt,
    formattedAmount: this.formattedAmount,
    refundStatus: this.refund.status
  };
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Get payments for consumer
 */
paymentSchema.statics.getConsumerPayments = async function (consumerId, filters = {}) {
  const query = { consumer: consumerId };

  if (filters.status) query.status = filters.status;
  if (filters.method) query.paymentMethod = filters.method;
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.max(1, Math.min(100, filters.limit || 10));
  const skip = (page - 1) * limit;

  const payments = await this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('orderId', 'orderNumber status total');

  const total = await this.countDocuments(query);

  return {
    payments,
    pagination: {
      current: page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Find payment by payment ID
 */
paymentSchema.statics.findByPaymentId = async function (paymentId) {
  return this.findOne({ paymentId }).populate('orderId consumer');
};

/**
 * Get payments by status
 */
paymentSchema.statics.getPaymentsByStatus = async function (status, limit = 10) {
  return this.find({ status })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('orderId consumer');
};

/**
 * Get pending payments
 */
paymentSchema.statics.getPendingPayments = async function () {
  return this.find({ status: { $in: ['pending', 'initiated'] } })
    .sort({ initiatedAt: 1 })
    .populate('orderId consumer');
};

/**
 * Get failed payments
 */
paymentSchema.statics.getFailedPayments = async function (hoursAgo = 24) {
  const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  return this.find({
    status: 'failed',
    failedAt: { $gte: cutoffTime }
  }).populate('orderId consumer');
};

/**
 * Get pending refunds
 */
paymentSchema.statics.getPendingRefunds = async function () {
  return this.find({ 'refund.status': 'initiated' })
    .sort({ 'refund.initiatedAt': 1 })
    .populate('orderId consumer');
};

/**
 * Get unreconciled payments
 */
paymentSchema.statics.getUnreconciledPayments = async function () {
  return this.find({ reconciled: false, status: 'success' })
    .sort({ processedAt: 1 })
    .populate('orderId consumer');
};

/**
 * Get successful payments for settlement
 */
paymentSchema.statics.getPaymentsForSettlement = async function (daysThreshold = 3) {
  const cutoffDate = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);
  return this.find({
    status: 'success',
    'settlement.settled': false,
    successAt: { $lte: cutoffDate }
  }).populate('orderId consumer');
};

/**
 * Get payment statistics
 */
paymentSchema.statics.getPaymentStats = async function () {
  const stats = await this.aggregate([
    {
      $facet: {
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } },
          { $sort: { count: -1 } }
        ],
        byMethod: [
          { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$amount' } } },
          { $sort: { count: -1 } }
        ],
        totalRevenue: [
          { $match: { status: 'success' } },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ],
        byGateway: [
          { $group: { _id: '$paymentGateway', count: { $sum: 1 }, total: { $sum: '$amount' } } }
        ],
        refundStats: [
          { $match: { 'refund.status': { $ne: 'none' } } },
          {
            $group: {
              _id: '$refund.status',
              count: { $sum: 1 },
              total: { $sum: '$refund.amount' }
            }
          }
        ]
      }
    }
  ]);

  return stats[0];
};

/**
 * Get daily revenue
 */
paymentSchema.statics.getDailyRevenue = async function (daysBack = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  return this.aggregate([
    {
      $match: {
        status: 'success',
        successAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$successAt' } },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        avg: { $avg: '$amount' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Pre-save validation
 */
paymentSchema.pre('save', function (next) {
  // Ensure status consistency
  if (this.status === 'success' && !this.transactionId) {
    return next(new Error('Transaction ID is required for successful payments'));
  }

  if (this.status === 'failed' && !this.errorCode) {
    return next(new Error('Error code is required for failed payments'));
  }

  next();
});

/**
 * Post-save logging
 */
paymentSchema.post('save', function (doc) {
  // In production, this would write to a logging system
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[Payment] Payment ${this.paymentId} status: ${this.status}`);
  }
});

// ============================================================================
// EXPORT
// ============================================================================

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
