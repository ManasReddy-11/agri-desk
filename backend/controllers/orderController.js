import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { AppError } from '../utils/errorHandler.js';

// ==================== CONSUMER OPERATIONS ====================

/**
 * Place a new order from cart
 */
export const placeOrder = async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod } = req.body;
    const consumerId = req.user.id;

    // Validate input
    if (!shippingAddress) {
      return next(new AppError('Shipping address is required', 400));
    }

    // Get consumer's cart
    const cart = await Cart.findOne({ consumer: consumerId });

    if (!cart || cart.items.length === 0) {
      return next(new AppError('Cart is empty. Add items before placing order', 400));
    }

    // Validate cart items availability
    const unavailableItems = [];
    for (const item of cart.items) {
      const product = await Product.findById(item.product);

      if (!product || !product.isActive) {
        unavailableItems.push(item.productName);
        continue;
      }

      if (!product.inStock || product.quantity < item.quantity) {
        unavailableItems.push(`${item.productName} (Only ${product.quantity} available)`);
      }
    }

    if (unavailableItems.length > 0) {
      return next(
        new AppError(
          `Following items are not available: ${unavailableItems.join(', ')}. Please update cart.`,
          400
        )
      );
    }

    // Create order from cart
    const order = await Order.createFromCart(cart.toObject(), consumerId, shippingAddress);

    order.paymentMethod = paymentMethod || 'upi';
    order.paymentStatus = 'pending';

    await order.save();

    // Clear cart after successful order
    await Cart.findByIdAndUpdate(cart._id, { items: [], isEmpty: true }, { new: true });

    // Deduct inventory
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        {
          $inc: { quantity: -item.quantity },
        },
        { new: true }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        order,
        summary: order.getSummary(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get consumer's order history
 */
export const getOrderHistory = async (req, res, next) => {
  try {
    const consumerId = req.user.id;
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query;

    const filters = { page: parseInt(page), limit: parseInt(limit) };

    if (status) filters.status = status;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const result = await Order.getConsumerOrders(consumerId, filters);

    res.status(200).json({
      success: true,
      message: 'Order history retrieved',
      data: {
        orders: result.orders,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single order details
 */
export const getOrderDetails = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const consumerId = req.user.id;

    const order = await Order.findById(orderId)
      .populate('consumer', 'name email phone')
      .populate('items.farmer', 'name email')
      .populate('items.product', 'name description');

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    // Check if consumer owns this order
    if (order.consumer._id.toString() !== consumerId) {
      return next(new AppError('You are not authorized to view this order', 403));
    }

    res.status(200).json({
      success: true,
      message: 'Order details retrieved',
      data: {
        order,
        groupedByFarmer: order.getGroupedByFarmer(),
        summary: order.getSummary(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel order
 */
export const cancelOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const consumerId = req.user.id;

    const order = await Order.findById(orderId);

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    // Verify consumer owns order
    if (order.consumer.toString() !== consumerId) {
      return next(new AppError('You are not authorized to cancel this order', 403));
    }

    // Cancel order
    await order.cancelOrder(reason || 'Cancelled by consumer');

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Track order status
 */
export const trackOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const consumerId = req.user.id;

    const order = await Order.findById(orderId)
      .populate('consumer', 'name')
      .populate('items.farmer', 'name');

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    if (order.consumer._id.toString() !== consumerId) {
      return next(new AppError('You are not authorized to track this order', 403));
    }

    const timeline = [
      { key: 'ordered', label: 'Order Placed', completedAt: order.orderDate || order.createdAt },
      { key: 'accepted', label: 'Accepted', completedAt: order.acceptedDate || null },
      { key: 'packed', label: 'Packed', completedAt: order.packedDate || null },
      { key: 'shipped', label: 'Shipped', completedAt: order.shippedDate || null },
      { key: 'delivered', label: 'Delivered', completedAt: order.deliveredDate || null },
    ];

    const statusToStep = {
      pending: 'ordered',
      accepted: 'accepted',
      packed: 'packed',
      shipped: 'shipped',
      delivered: 'delivered',
      rejected: 'ordered',
      cancelled: 'ordered',
    };

    res.status(200).json({
      success: true,
      message: 'Order tracking info',
      data: {
        _id: order._id,
        status: order.status,
        orderDate: order.orderDate,
        acceptedDate: order.acceptedDate,
        packedDate: order.packedDate,
        shippedDate: order.shippedDate,
        deliveredDate: order.deliveredDate,
        estimatedDelivery: order.estimatedDelivery,
        trackingNumber: order.trackingNumber,
        currentStep: statusToStep[order.status] || 'ordered',
        timeline,
        groupedByFarmer: order.getGroupedByFarmer(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==================== FARMER OPERATIONS ====================

/**
 * Get incoming orders (farmer)
 */
export const getFarmerIncomingOrders = async (req, res, next) => {
  try {
    const farmerId = req.user.id;
    const { status, itemStatus, startDate, endDate, page = 1, limit = 10 } = req.query;

    const filters = { page: parseInt(page), limit: parseInt(limit) };

    if (status) filters.status = status;
    if (itemStatus) filters.itemStatus = itemStatus;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const result = await Order.getFarmerOrders(farmerId, filters);

    res.status(200).json({
      success: true,
      message: 'Incoming orders retrieved',
      data: {
        orders: result.orders,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending orders for farmer
 */
export const getFarmerPendingOrders = async (req, res, next) => {
  try {
    const farmerId = req.user.id;

    const orders = await Order.getPendingOrders(farmerId);

    res.status(200).json({
      success: true,
      message: 'Pending orders retrieved',
      data: { orders, count: orders.length },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Accept order (farmer)
 */
export const acceptOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { notes } = req.body;
    const farmerId = req.user.id;

    const order = await Order.findById(orderId);

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    // Check if farmer is in this order
    const farmerInOrder = order.farmers.some((f) => f.farmerId.toString() === farmerId);
    if (!farmerInOrder) {
      return next(new AppError('You are not part of this order', 403));
    }

    // Accept order
    await order.acceptOrder(farmerId, notes || '');

    res.status(200).json({
      success: true,
      message: 'Order accepted successfully',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject order (farmer)
 */
export const rejectOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const farmerId = req.user.id;

    if (!reason) {
      return next(new AppError('Rejection reason is required', 400));
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    // Check if farmer is in this order
    const farmerInOrder = order.farmers.some((f) => f.farmerId.toString() === farmerId);
    if (!farmerInOrder) {
      return next(new AppError('You are not part of this order', 403));
    }

    // Reject order
    await order.rejectOrder(farmerId, reason);

    res.status(200).json({
      success: true,
      message: 'Order rejected successfully',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update delivery status (farmer)
 */
export const updateDeliveryStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status, trackingNumber, estimatedDelivery, notes } = req.body;
    const farmerId = req.user.id;

    if (!status) {
      return next(new AppError('Status is required', 400));
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    // Check if farmer is in this order
    const farmerInOrder = order.farmers.some((f) => f.farmerId.toString() === farmerId);
    if (!farmerInOrder) {
      return next(new AppError('You are not part of this order', 403));
    }

    // Update delivery status
    await order.updateDeliveryStatus(farmerId, status, notes || '');

    // Update order-level tracking info
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (estimatedDelivery) order.estimatedDelivery = new Date(estimatedDelivery);

    await order.save();

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get farmer's order statistics
 */
export const getFarmerOrderStats = async (req, res, next) => {
  try {
    const farmerId = req.user.id;

    const stats = await Order.aggregate([
      {
        $match: {
          'farmers.farmerId': mongoose.Types.ObjectId(farmerId),
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const pendingCount = await Order.countDocuments({
      'farmers.farmerId': farmerId,
      'farmers.status': 'pending',
    });

    res.status(200).json({
      success: true,
      message: 'Order statistics retrieved',
      data: {
        pending: pendingCount,
        byStatus: stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==================== ADMIN OPERATIONS ====================

/**
 * Get all orders (admin)
 */
export const getAllOrders = async (req, res, next) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 10, minAmount, maxAmount } = req.query;

    const query = {};

    if (status) query.status = status;
    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate) query.orderDate.$lte = new Date(endDate);
    }
    if (minAmount || maxAmount) {
      query.total = {};
      if (minAmount) query.total.$gte = parseFloat(minAmount);
      if (maxAmount) query.total.$lte = parseFloat(maxAmount);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const orders = await Order.find(query)
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('consumer', 'name email phone')
      .populate('items.farmer', 'name');

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'All orders retrieved',
      data: {
        orders,
        pagination: {
          current: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get order by ID (admin)
 */
export const getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('consumer', 'name email phone address')
      .populate('items.farmer', 'name email phone')
      .populate('items.product', 'name description price');

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Order details retrieved',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get high-value orders (admin)
 */
export const getHighValueOrders = async (req, res, next) => {
  try {
    const { minAmount = 5000 } = req.query;

    const orders = await Order.getHighValueOrders(parseFloat(minAmount));

    res.status(200).json({
      success: true,
      message: 'High-value orders retrieved',
      data: { orders, count: orders.length },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get delivery due orders (admin)
 */
export const getDeliveryDueOrders = async (req, res, next) => {
  try {
    const { daysThreshold = 3 } = req.query;

    const orders = await Order.getDeliveryDue(parseInt(daysThreshold));

    res.status(200).json({
      success: true,
      message: 'Delivery due orders retrieved',
      data: { orders, count: orders.length },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get order statistics (admin)
 */
export const getOrderStatistics = async (req, res, next) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          avgAmount: { $avg: '$total' },
        },
      },
    ]);

    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: 'Order statistics retrieved',
      data: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        byStatus: stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  // Consumer
  placeOrder,
  getOrderHistory,
  getOrderDetails,
  cancelOrder,
  trackOrder,
  // Farmer
  getFarmerIncomingOrders,
  getFarmerPendingOrders,
  acceptOrder,
  rejectOrder,
  updateDeliveryStatus,
  getFarmerOrderStats,
  // Admin
  getAllOrders,
  getOrderById,
  getHighValueOrders,
  getDeliveryDueOrders,
  getOrderStatistics,
};
