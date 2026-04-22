import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema(
  {
    // Consumer Reference
    consumer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Consumer ID is required'],
      index: true,
    },

    // Order Items
    items: [
      {
        _id: false,
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        productName: {
          type: String,
          required: true,
        },
        productImage: String,
        farmer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        farmerName: String,
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Quantity cannot be less than 1'],
        },
        price: {
          type: Number,
          required: true,
          min: [0, 'Price cannot be negative'],
        },
        discount: {
          type: Number,
          default: 0,
          min: [0, 'Discount cannot be negative'],
        },
        finalPrice: {
          type: Number,
          required: true,
        },
        itemTotal: {
          type: Number,
          required: true,
        },
        unit: String,
        status: {
          type: String,
          default: 'pending',
          enum: ['pending', 'accepted', 'packed', 'shipped', 'delivered'],
        },
        acceptedAt: Date,
        packedAt: Date,
        shippedAt: Date,
        deliveredAt: Date,
        rejectionReason: String,
        rejectedAt: Date,
      },
    ],

    // Order Totals
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative'],
    },
    totalDiscount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
    },
    taxes: {
      type: Number,
      required: true,
      min: [0, 'Taxes cannot be negative'],
    },
    shippingCost: {
      type: Number,
      default: 0,
      min: [0, 'Shipping cost cannot be negative'],
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative'],
    },

    // Coupon Applied
    coupon: {
      code: String,
      discountAmount: {
        type: Number,
        default: 0,
      },
      discountPercentage: {
        type: Number,
        default: 0,
      },
    },

    // Shipping Details
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      phone: String,
    },

    // Order Status & Timeline
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'accepted', 'packed', 'shipped', 'delivered', 'cancelled', 'rejected'],
      index: true,
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    acceptedDate: Date,
    packedDate: Date,
    shippedDate: Date,
    deliveredDate: Date,
    cancellationReason: String,
    cancelledDate: Date,
    rejectionReason: String,
    rejectedDate: Date,

    // Payment Information
    paymentStatus: {
      type: String,
      default: 'pending',
      enum: ['pending', 'completed', 'failed', 'refunded'],
    },
    paymentMethod: String,
    transactionId: String,
    paidAt: Date,

    // Notes
    consumerNotes: String,
    farmerNotes: String,
    adminNotes: String,

    // Tracking
    trackingNumber: String,
    estimatedDelivery: Date,

    // Multi-farmer Support
    farmers: [
      {
        _id: false,
        farmerId: mongoose.Schema.Types.ObjectId,
        items: [Number], // References to items array indices
        status: {
          type: String,
          default: 'pending',
          enum: ['pending', 'accepted', 'rejected', 'packed', 'shipped', 'delivered'],
        },
        acceptedAt: Date,
        rejectedAt: Date,
        rejectionReason: String,
      },
    ],

    // Cart Reference
    cart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cart',
    },

    // Metadata
    isExpedited: {
      type: Boolean,
      default: false,
    },
    isCancellable: {
      type: Boolean,
      default: true,
    },
    refundEligible: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ==================== INDEXES ====================

OrderSchema.index({ consumer: 1, orderDate: -1 });
OrderSchema.index({ 'farmers.farmerId': 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ orderDate: -1 });
OrderSchema.index({ 'items.farmer': 1 });

// ==================== VIRTUALS ====================

OrderSchema.virtual('itemCount').get(function () {
  return this.items.reduce((acc, item) => acc + item.quantity, 0);
});

OrderSchema.virtual('uniqueItemCount').get(function () {
  return this.items.length;
});

OrderSchema.virtual('daysOld').get(function () {
  const now = new Date();
  const diff = now - new Date(this.orderDate);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

OrderSchema.virtual('isDelivered').get(function () {
  return this.status === 'delivered';
});

OrderSchema.virtual('isPending').get(function () {
  return this.status === 'pending';
});

OrderSchema.virtual('isCompleted').get(function () {
  return ['delivered', 'rejected', 'cancelled'].includes(this.status);
});

// ==================== INSTANCE METHODS ====================

/**
 * Accept order (Farmer operation)
 */
OrderSchema.methods.acceptOrder = async function (farmerId, notes = '') {
  const farmerOrder = this.farmers.find((f) => f.farmerId.toString() === farmerId.toString());

  if (!farmerOrder) {
    throw new Error('Farmer not found in this order');
  }

  if (farmerOrder.status !== 'pending') {
    throw new Error('Order is not in pending status');
  }

  farmerOrder.status = 'accepted';
  farmerOrder.acceptedAt = new Date();

  // Update associated items
  farmerOrder.items.forEach((itemIndex) => {
    this.items[itemIndex].status = 'accepted';
    this.items[itemIndex].acceptedAt = new Date();
  });

  // Check if all farmers accepted
  const allFarmersAccepted = this.farmers.every((f) => f.status === 'accepted');
  if (allFarmersAccepted) {
    this.status = 'accepted';
    this.acceptedDate = new Date();
  }

  this.farmerNotes = notes;

  await this.save();
  return this;
};

/**
 * Reject order (Farmer operation)
 */
OrderSchema.methods.rejectOrder = async function (farmerId, reason = '') {
  const farmerOrder = this.farmers.find((f) => f.farmerId.toString() === farmerId.toString());

  if (!farmerOrder) {
    throw new Error('Farmer not found in this order');
  }

  if (farmerOrder.status !== 'pending') {
    throw new Error('Order is not in pending status');
  }

  farmerOrder.status = 'rejected';
  farmerOrder.rejectedAt = new Date();
  farmerOrder.rejectionReason = reason;

  // Update associated items
  farmerOrder.items.forEach((itemIndex) => {
    this.items[itemIndex].status = 'rejected';
    this.items[itemIndex].rejectionReason = reason;
    this.items[itemIndex].rejectedAt = new Date();
  });

  // If any farmer rejects, entire order is rejected (can be customized)
  this.status = 'rejected';
  this.rejectionReason = reason;
  this.rejectedDate = new Date();
  this.refundEligible = true;

  await this.save();
  return this;
};

/**
 * Update delivery status
 */
OrderSchema.methods.updateDeliveryStatus = async function (farmerId, newStatus, notes = '') {
  const validStatuses = ['accepted', 'packed', 'shipped', 'delivered'];

  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const farmerOrder = this.farmers.find((f) => f.farmerId.toString() === farmerId.toString());

  if (!farmerOrder) {
    throw new Error('Farmer not found in this order');
  }

  farmerOrder.status = newStatus;

  // Update items and timeline
  const statusDateMap = {
    accepted: 'acceptedAt',
    packed: 'packedAt',
    shipped: 'shippedAt',
    delivered: 'deliveredAt',
  };

  farmerOrder.items.forEach((itemIndex) => {
    this.items[itemIndex].status = newStatus;
    this.items[itemIndex][statusDateMap[newStatus]] = new Date();
  });

  // Update order-level status
  const statusPriority = { accepted: 1, packed: 2, shipped: 3, delivered: 4 };
  const maxStatus = Math.max(...this.farmers.map((f) => statusPriority[f.status] || 0));
  const statusMap = { 1: 'accepted', 2: 'packed', 3: 'shipped', 4: 'delivered' };

  if (statusMap[maxStatus]) {
    this.status = statusMap[maxStatus];
    const dateFieldMap = { 1: 'acceptedDate', 2: 'packedDate', 3: 'shippedDate', 4: 'deliveredDate' };
    this[dateFieldMap[maxStatus]] = new Date();
  }

  this.farmerNotes = notes;

  await this.save();
  return this;
};

/**
 * Cancel order
 */
OrderSchema.methods.cancelOrder = async function (reason = 'Cancelled by consumer') {
  if (!this.isCancellable) {
    throw new Error('This order cannot be cancelled');
  }

  if (!['pending', 'accepted'].includes(this.status)) {
    throw new Error('Only pending or accepted orders can be cancelled');
  }

  this.status = 'cancelled';
  this.cancellationReason = reason;
  this.cancelledDate = new Date();
  this.isCancellable = false;
  this.refundEligible = true;

  await this.save();
  return this;
};

/**
 * Calculate totals
 */
OrderSchema.methods.calculateTotals = function () {
  this.subtotal = this.items.reduce((acc, item) => acc + item.itemTotal, 0);
  this.totalDiscount = this.items.reduce((acc, item) => acc + item.discount * item.quantity, 0);
  this.taxes = this.subtotal * 0.05; // 5% GST

  let couponDiscount = 0;
  if (this.coupon) {
    if (this.coupon.discountPercentage) {
      couponDiscount = this.subtotal * (this.coupon.discountPercentage / 100);
    } else if (this.coupon.discountAmount) {
      couponDiscount = this.coupon.discountAmount;
    }
  }

  this.total = Math.max(0, this.subtotal + this.taxes + this.shippingCost - this.totalDiscount - couponDiscount);
};

/**
 * Get grouped items by farmer
 */
OrderSchema.methods.getGroupedByFarmer = function () {
  const grouped = {};

  this.farmers.forEach((farmer) => {
    const farmerId = farmer.farmerId.toString();
    if (!grouped[farmerId]) {
      grouped[farmerId] = {
        farmerId: farmer.farmerId,
        items: [],
        status: farmer.status,
        acceptedAt: farmer.acceptedAt,
        rejectedAt: farmer.rejectedAt,
        rejectionReason: farmer.rejectionReason,
        subtotal: 0,
      };
    }

    farmer.items.forEach((itemIndex) => {
      const item = this.items[itemIndex];
      grouped[farmerId].items.push(item);
      grouped[farmerId].subtotal += item.itemTotal;
    });
  });

  return Object.values(grouped);
};

/**
 * Get order summary
 */
OrderSchema.methods.getSummary = function () {
  return {
    _id: this._id,
    status: this.status,
    itemCount: this.itemCount,
    total: this.total,
    orderDate: this.orderDate,
    deliveredDate: this.deliveredDate,
    daysOld: this.daysOld,
    paymentStatus: this.paymentStatus,
    farmerCount: this.farmers.length,
  };
};

// ==================== STATIC METHODS ====================

/**
 * Create order from cart
 */
OrderSchema.statics.createFromCart = async function (cartData, consumerId, shippingAddress) {
  const Order = this;

  // Group items by farmer
  const farmerGroups = {};
  cartData.items.forEach((item) => {
    const farmerId = item.farmer.toString();
    if (!farmerGroups[farmerId]) {
      farmerGroups[farmerId] = [];
    }
    farmerGroups[farmerId].push(item);
  });

  // Create farmers array for order
  const farmers = Object.keys(farmerGroups).map((farmerId, index) => ({
    farmerId: new mongoose.Types.ObjectId(farmerId),
    items: Object.keys(farmerGroups[farmerId]).map(
      (itemIdx) =>
        cartData.items.findIndex(
          (item) =>
            item.farmer.toString() === farmerId &&
            item.product.toString() === farmerGroups[farmerId][itemIdx].product.toString()
        )
    ),
    status: 'pending',
  }));

  const order = new Order({
    consumer: consumerId,
    items: cartData.items,
    subtotal: cartData.subtotal,
    totalDiscount: cartData.totalDiscount,
    taxes: cartData.taxes,
    shippingCost: cartData.shippingCost,
    total: cartData.total,
    coupon: cartData.coupon,
    shippingAddress,
    farmers,
    paymentStatus: 'pending',
  });

  order.calculateTotals();
  await order.save();
  return order;
};

/**
 * Get consumer orders
 */
OrderSchema.statics.getConsumerOrders = async function (consumerId, filters = {}) {
  const query = { consumer: consumerId };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.startDate || filters.endDate) {
    query.orderDate = {};
    if (filters.startDate) {
      query.orderDate.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.orderDate.$lte = new Date(filters.endDate);
    }
  }

  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const skip = (page - 1) * limit;

  const orders = await this.find(query)
    .sort({ orderDate: -1 })
    .skip(skip)
    .limit(limit)
    .populate('consumer', 'name email phone')
    .populate('items.farmer', 'name email');

  const total = await this.countDocuments(query);

  return {
    orders,
    pagination: {
      current: page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get farmer orders
 */
OrderSchema.statics.getFarmerOrders = async function (farmerId, filters = {}) {
  const query = { 'farmers.farmerId': farmerId };

  if (filters.status) {
    query['farmers.status'] = filters.status;
  }

  if (filters.itemStatus) {
    query['items.status'] = filters.itemStatus;
  }

  if (filters.startDate || filters.endDate) {
    query.orderDate = {};
    if (filters.startDate) {
      query.orderDate.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.orderDate.$lte = new Date(filters.endDate);
    }
  }

  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const skip = (page - 1) * limit;

  const orders = await this.find(query)
    .sort({ orderDate: -1 })
    .skip(skip)
    .limit(limit)
    .populate('consumer', 'name email phone')
    .populate('items.product', 'name');

  // Filter to show only this farmer's items
  const filteredOrders = orders.map((order) => {
    const farmerOrder = order.toObject();
    const farmerData = farmerOrder.farmers.find((f) => f.farmerId.toString() === farmerId.toString());

    if (farmerData) {
      farmerOrder.items = farmerOrder.items.filter((item, idx) => farmerData.items.includes(idx));
    }

    return farmerOrder;
  });

  const total = await this.countDocuments(query);

  return {
    orders: filteredOrders,
    pagination: {
      current: page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get pending orders
 */
OrderSchema.statics.getPendingOrders = async function (farmerId) {
  return await this.find({
    'farmers.farmerId': farmerId,
    'farmers.status': 'pending',
  })
    .sort({ orderDate: 1 })
    .populate('consumer', 'name email phone')
    .populate('items.product', 'name');
};

/**
 * Get orders by status
 */
OrderSchema.statics.getOrdersByStatus = async function (status) {
  return await this.find({ status }).sort({ orderDate: -1 }).populate('consumer', 'name email').populate('items.farmer', 'name');
};

/**
 * Get high-value orders
 */
OrderSchema.statics.getHighValueOrders = async function (minAmount = 5000) {
  return await this.find({ total: { $gte: minAmount }, status: { $ne: 'cancelled' } })
    .sort({ total: -1 })
    .limit(10)
    .populate('consumer', 'name email')
    .populate('items.farmer', 'name');
};

/**
 * Get delivery due
 */
OrderSchema.statics.getDeliveryDue = async function (daysThreshold = 3) {
  const dateThreshold = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);

  return await this.find({
    status: 'shipped',
    shippedDate: { $lte: dateThreshold },
  })
    .sort({ shippedDate: 1 })
    .populate('consumer', 'name email phone')
    .populate('items.farmer', 'name');
};

const Order = mongoose.model('Order', OrderSchema);

export default Order;
