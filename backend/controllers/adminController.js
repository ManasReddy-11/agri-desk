import mongoose from 'mongoose';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import { AppError } from '../middleware/errorHandler.js';

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 1 ? fallback : parsed;
};

const toObjectId = (value, label) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(`Invalid ${label} format`, 400);
  }

  return new mongoose.Types.ObjectId(value);
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getPagination = async (model, filter, page, limit) => {
  const total = await model.countDocuments(filter);

  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit) || 1,
  };
};

const getDateRange = (period = 'month') => {
  const endDate = new Date();
  const startDate = new Date(endDate);

  if (period === 'week') {
    startDate.setDate(endDate.getDate() - 7);
  } else if (period === 'year') {
    startDate.setFullYear(endDate.getFullYear() - 1);
  } else {
    startDate.setMonth(endDate.getMonth() - 1);
  }

  return { startDate, endDate };
};

export const getAllUsers = async (req, res) => {
  const page = toPositiveInt(req.query.page, 1);
  const limit = Math.min(toPositiveInt(req.query.limit, 20), 100);
  const skip = (page - 1) * limit;
  const filter = {};

  if (req.query.role) {
    filter.role = req.query.role;
  }

  if (req.query.verified === 'true' || req.query.verified === 'false') {
    filter.isVerified = req.query.verified === 'true';
  }

  if (req.query.active === 'true' || req.query.active === 'false') {
    filter.isActive = req.query.active === 'true';
  }

  if (req.query.search) {
    const pattern = new RegExp(escapeRegex(req.query.search.trim()), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const [users, pagination] = await Promise.all([
    User.find(filter)
      .select('-password -verificationToken -verificationTokenExpire -resetPasswordToken -resetPasswordTokenExpire')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    getPagination(User, filter, page, limit),
  ]);

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination,
    },
  });
};

export const getUserDetails = async (req, res) => {
  const userId = toObjectId(req.params.userId, 'user id');
  const user = await User.findById(userId)
    .select('-password -verificationToken -verificationTokenExpire -resetPasswordToken -resetPasswordTokenExpire')
    .lean();

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const [productCount, consumerOrders, farmerOrders] = await Promise.all([
    Product.countDocuments({ farmer: userId }),
    Order.countDocuments({ consumer: userId }),
    Order.countDocuments({ 'farmers.farmerId': userId }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      user,
      stats: {
        productCount,
        consumerOrders,
        farmerOrders,
      },
    },
  });
};

export const deleteUser = async (req, res) => {
  const userId = toObjectId(req.params.userId, 'user id');
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.role === 'admin' && user.id !== req.user.id) {
    throw new AppError('Cannot deactivate another admin account', 403);
  }

  user.isActive = false;
  await user.save();

  if (user.role === 'farmer') {
    await Product.updateMany({ farmer: userId }, { $set: { isActive: false } });
  }

  res.status(200).json({
    success: true,
    message: 'User deactivated successfully',
    data: { userId: user.id },
  });
};

export const banUser = async (req, res) => {
  const userId = toObjectId(req.params.userId, 'user id');
  const ban = req.body?.ban !== false;
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { isActive: !ban } },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    message: ban ? 'User disabled successfully' : 'User re-enabled successfully',
    data: {
      userId: user.id,
      isActive: user.isActive,
    },
  });
};

export const resetUserPassword = async (req, res) => {
  const userId = toObjectId(req.params.userId, 'user id');
  const { temporaryPassword } = req.body;

  if (!temporaryPassword || temporaryPassword.length < 8) {
    throw new AppError('Temporary password must be at least 8 characters', 400);
  }

  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.password = temporaryPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'User password reset successfully',
  });
};

export const getAllProducts = async (req, res) => {
  const page = toPositiveInt(req.query.page, 1);
  const limit = Math.min(toPositiveInt(req.query.limit, 20), 100);
  const skip = (page - 1) * limit;
  const filter = {};

  if (req.query.category) {
    filter.category = req.query.category;
  }

  if (req.query.farmerId) {
    filter.farmer = toObjectId(req.query.farmerId, 'farmer id');
  }

  if (req.query.search) {
    const pattern = new RegExp(escapeRegex(req.query.search.trim()), 'i');
    filter.$or = [{ name: pattern }, { description: pattern }];
  }

  if (req.query.active === 'true' || req.query.active === 'false') {
    filter.isActive = req.query.active === 'true';
  }

  const [products, pagination] = await Promise.all([
    Product.find(filter)
      .populate('farmer', 'name email role isActive')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    getPagination(Product, filter, page, limit),
  ]);

  res.status(200).json({
    success: true,
    data: {
      products,
      pagination,
    },
  });
};

export const approveProduct = async (req, res) => {
  const productId = toObjectId(req.params.productId, 'product id');
  const product = await Product.findByIdAndUpdate(
    productId,
    { $set: { isActive: true } },
    { new: true, runValidators: true }
  );

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Product approved successfully',
    data: { productId: product.id, isActive: product.isActive },
  });
};

export const rejectProduct = async (req, res) => {
  const productId = toObjectId(req.params.productId, 'product id');
  const product = await Product.findByIdAndUpdate(
    productId,
    { $set: { isActive: false } },
    { new: true, runValidators: true }
  );

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Product rejected successfully',
    data: { productId: product.id, isActive: product.isActive },
  });
};

export const removeProduct = async (req, res) => {
  const productId = toObjectId(req.params.productId, 'product id');
  const product = await Product.findByIdAndDelete(productId);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Product removed successfully',
    data: { productId: product.id },
  });
};

export const suspendProduct = async (req, res) => {
  const productId = toObjectId(req.params.productId, 'product id');
  const product = await Product.findByIdAndUpdate(
    productId,
    { $set: { isActive: false, inStock: false } },
    { new: true, runValidators: true }
  );

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Product suspended successfully',
    data: { productId: product.id, isActive: product.isActive },
  });
};

export const getAllOrders = async (req, res) => {
  const page = toPositiveInt(req.query.page, 1);
  const limit = Math.min(toPositiveInt(req.query.limit, 20), 100);
  const skip = (page - 1) * limit;
  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.consumerId) {
    filter.consumer = toObjectId(req.query.consumerId, 'consumer id');
  }

  if (req.query.farmerId) {
    filter['farmers.farmerId'] = toObjectId(req.query.farmerId, 'farmer id');
  }

  const [orders, pagination] = await Promise.all([
    Order.find(filter)
      .populate('consumer', 'name email role')
      .populate('items.product', 'name category price')
      .populate('items.farmer', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    getPagination(Order, filter, page, limit),
  ]);

  res.status(200).json({
    success: true,
    data: {
      orders,
      pagination,
    },
  });
};

export const getSuspiciousOrders = async (req, res) => {
  const page = toPositiveInt(req.query.page, 1);
  const limit = Math.min(toPositiveInt(req.query.limit, 20), 100);
  const skip = (page - 1) * limit;
  const filter = {
    $or: [{ paymentStatus: 'failed' }, { refundEligible: true, status: 'rejected' }],
  };

  const [orders, pagination] = await Promise.all([
    Order.find(filter)
      .populate('consumer', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    getPagination(Order, filter, page, limit),
  ]);

  res.status(200).json({
    success: true,
    data: {
      orders,
      pagination,
    },
  });
};

export const resolveOrderDispute = async (req, res) => {
  const orderId = toObjectId(req.params.orderId, 'order id');
  const order = await Order.findById(orderId);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  order.adminNotes = req.body?.resolution || 'Resolved by admin';
  if (typeof req.body?.refundAmount === 'number' && req.body.refundAmount >= 0) {
    order.refundEligible = req.body.refundAmount > 0;
  }
  await order.save();

  res.status(200).json({
    success: true,
    message: 'Order dispute resolved successfully',
    data: { orderId: order.id },
  });
};

export const getPlatformAnalytics = async (req, res) => {
  const { startDate, endDate } = getDateRange(req.query.period);
  const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };

  const [
    totalUsers,
    totalFarmers,
    totalConsumers,
    newUsers,
    activeProducts,
    totalProducts,
    totalOrders,
    ordersInPeriod,
    revenueInPeriod,
    pendingPayments,
    successfulPayments,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'farmer' }),
    User.countDocuments({ role: 'consumer' }),
    User.countDocuments(dateFilter),
    Product.countDocuments({ isActive: true }),
    Product.countDocuments(),
    Order.countDocuments(),
    Order.countDocuments(dateFilter),
    Order.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Payment.countDocuments({ status: { $in: ['pending', 'processing', 'initiated'] } }),
    Payment.countDocuments({ status: 'success' }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      period: req.query.period || 'month',
      dateRange: { startDate, endDate },
      users: {
        totalUsers,
        totalFarmers,
        totalConsumers,
        newUsers,
      },
      products: {
        totalProducts,
        activeProducts,
      },
      orders: {
        totalOrders,
        ordersInPeriod,
        revenueInPeriod: revenueInPeriod[0]?.total || 0,
      },
      payments: {
        pendingPayments,
        successfulPayments,
      },
    },
  });
};

export const getDashboardOverview = async (req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [
    totalProducts,
    totalFarmers,
    totalOrders,
    revenue,
    recentUsers,
  ] = await Promise.all([
    Product.countDocuments(),
    User.countDocuments({ role: 'farmer' }),
    Order.countDocuments(),
    Order.aggregate([
      { $match: { createdAt: { $gte: startOfToday, $lt: endOfToday } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    User.find()
      .select('name email role isActive createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalProducts,
        totalFarmers,
        totalOrders,
        revenueToday: revenue[0]?.total || 0,
      },
      recentUsers,
    },
  });
};

export const getSystemHealth = async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : 'disconnected';

  res.status(200).json({
    success: true,
    data: {
      status: dbState === 1 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        database: {
          status: dbStatus,
          readyState: dbState,
        },
      },
    },
  });
};
