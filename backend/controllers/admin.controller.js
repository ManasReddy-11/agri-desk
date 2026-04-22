const logger = require('../utils/logger');
const { catchAsync, notFound, conflict, validationError } = require('../middleware/errorHandler.middleware');

/**
 * Admin Controller
 * Handles user management, product approval, order monitoring, and analytics
 * Production-grade implementation with comprehensive logging and validation
 */

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Get all users with filtering and pagination
 * Filters: role, status, verified, banned
 */
exports.getAllUsers = catchAsync(async (req, res) => {
    const { page = 1, limit = 20, role, status, verified, banned, search } = req.query;
    const skip = (page - 1) * limit;
    
    // Build filter query
    const filter = {};
    
    if (role) filter.type = role;
    if (status) filter.status = status;
    if (verified !== undefined) filter.verified = verified === 'true';
    if (banned !== undefined) filter.banned = banned === 'true';
    
    // Search by email or name
    if (search) {
        filter.$or = [
            { email: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } }
        ];
    }
    
    // Get total count
    const total = await User.countDocuments(filter);
    
    // Get users with pagination
    const users = await User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    
    logger.info('Fetched all users', {
        userId: req.user.id,
        filters: filter,
        count: users.length,
        total
    });
    
    res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data: {
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

/**
 * Get user details
 */
exports.getUserDetails = catchAsync(async (req, res) => {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
        .select('-password')
        .lean();
    
    if (!user) {
        notFound('User');
    }
    
    // Get user stats
    let stats = {};
    const type = user.type;
    
    if (type === 'consumer') {
        stats = {
            totalOrders: await Order.countDocuments({ consumerId: userId }),
            totalSpent: await Order.aggregate([
                { $match: { consumerId: userId } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            reviewsGiven: await Review.countDocuments({ consumerId: userId }),
            averageRating: await Review.aggregate([
                { $match: { farmerId: userId, status: 'approved' } },
                { $group: { _id: null, avg: { $avg: '$rating.overall' } } }
            ])
        };
    } else if (type === 'farmer') {
        stats = {
            totalProducts: await Product.countDocuments({ farmerId: userId }),
            totalOrders: await Order.countDocuments({ farmerId: userId }),
            totalRevenue: await Order.aggregate([
                { $match: { farmerId: userId, status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            averageRating: await Review.aggregate([
                { $match: { farmerId: userId, status: 'approved' } },
                { $group: { _id: null, avg: { $avg: '$rating.overall' } } }
            ])
        };
    }
    
    res.status(200).json({
        success: true,
        data: {
            user,
            stats
        }
    });
});

/**
 * Delete or suspend user
 * Soft delete: marks as deleted but keeps data for audit
 */
exports.deleteUser = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const { reason, permanent = false } = req.body;
    
    if (!reason) {
        validationError('Deletion reason is required', 'reason');
    }
    
    const user = await User.findById(userId);
    if (!user) {
        notFound('User');
    }
    
    // Prevent admin deletion of other admins
    if (user.type === 'admin' && req.user.id !== userId) {
        const isCurrentUserSuperAdmin = req.user.type === 'super_admin';
        if (!isCurrentUserSuperAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete admin users'
            });
        }
    }
    
    // Update user
    await User.findByIdAndUpdate(userId, {
        deleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id,
        deletionReason: reason,
        permanent
    });
    
    // Log action
    logger.warn('User deleted by admin', {
        adminId: req.user.id,
        deletedUserId: userId,
        userType: user.type,
        reason,
        permanent
    });
    
    // If farmer, also suspend all products
    if (user.type === 'farmer') {
        await Product.updateMany(
            { farmerId: userId },
            {
                status: 'suspended',
                suspendedAt: new Date(),
                suspensionReason: `Farmer account deleted: ${reason}`
            }
        );
    }
    
    res.status(200).json({
        success: true,
        message: `User ${permanent ? 'permanently' : 'temporarily'} deleted`,
        data: { deletedUserId: userId }
    });
});

/**
 * Ban/unban user
 */
exports.banUser = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const { ban = true, reason } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
        notFound('User');
    }
    
    await User.findByIdAndUpdate(userId, {
        banned: ban,
        bannedAt: ban ? new Date() : null,
        bannedReason: ban ? reason : null,
        bannedBy: ban ? req.user.id : null
    });
    
    logger.warn(`User ${ban ? 'banned' : 'unbanned'}`, {
        adminId: req.user.id,
        userId,
        reason: ban ? reason : 'Unbanned'
    });
    
    res.status(200).json({
        success: true,
        message: `User ${ban ? 'banned' : 'unbanned'} successfully`,
        data: { userId, banned: ban }
    });
});

/**
 * Reset user password (admin override)
 */
exports.resetUserPassword = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const { temporaryPassword } = req.body;
    
    if (!temporaryPassword || temporaryPassword.length < 8) {
        validationError('Temporary password must be at least 8 characters', 'temporaryPassword');
    }
    
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    
    await User.findByIdAndUpdate(userId, {
        password: hashedPassword,
        passwordResetBy: req.user.id,
        passwordResetAt: new Date(),
        forcePasswordChange: true
    });
    
    logger.warn('Admin reset user password', {
        adminId: req.user.id,
        userId
    });
    
    res.status(200).json({
        success: true,
        message: 'Password reset successfully. User must change on next login.'
    });
});

// ============================================================================
// PRODUCT MANAGEMENT
// ============================================================================

/**
 * Get all products with approval status
 */
exports.getAllProducts = catchAsync(async (req, res) => {
    const { page = 1, limit = 20, status, farmerId, category, search } = req.query;
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (status) filter.status = status;
    if (farmerId) filter.farmerId = farmerId;
    if (category) filter.category = category;
    
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }
    
    const total = await Product.countDocuments(filter);
    
    const products = await Product.find(filter)
        .populate('farmerId', 'name email type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    
    logger.info('Fetched all products', {
        userId: req.user.id,
        count: products.length,
        filters: filter
    });
    
    res.status(200).json({
        success: true,
        data: {
            products,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

/**
 * Approve product (change status from pending to active)
 */
exports.approveProduct = catchAsync(async (req, res) => {
    const { productId } = req.params;
    const { reason } = req.body;
    
    const product = await Product.findById(productId);
    if (!product) {
        notFound('Product');
    }
    
    if (product.status === 'active') {
        conflict('Product is already approved');
    }
    
    await Product.findByIdAndUpdate(productId, {
        status: 'active',
        approvedAt: new Date(),
        approvedBy: req.user.id,
        approvalNotes: reason
    });
    
    logger.info('Product approved by admin', {
        adminId: req.user.id,
        productId,
        farmerId: product.farmerId,
        reason
    });
    
    res.status(200).json({
        success: true,
        message: 'Product approved successfully',
        data: { productId }
    });
});

/**
 * Reject product
 */
exports.rejectProduct = catchAsync(async (req, res) => {
    const { productId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
        validationError('Rejection reason is required', 'reason');
    }
    
    const product = await Product.findById(productId);
    if (!product) {
        notFound('Product');
    }
    
    await Product.findByIdAndUpdate(productId, {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: req.user.id,
        rejectionReason: reason
    });
    
    logger.warn('Product rejected by admin', {
        adminId: req.user.id,
        productId,
        reason
    });
    
    res.status(200).json({
        success: true,
        message: 'Product rejected',
        data: { productId }
    });
});

/**
 * Remove product (soft delete)
 */
exports.removeProduct = catchAsync(async (req, res) => {
    const { productId } = req.params;
    const { reason } = req.body;
    
    const product = await Product.findById(productId);
    if (!product) {
        notFound('Product');
    }
    
    await Product.findByIdAndUpdate(productId, {
        status: 'removed',
        removedAt: new Date(),
        removedBy: req.user.id,
        removalReason: reason
    });
    
    logger.warn('Product removed by admin', {
        adminId: req.user.id,
        productId,
        reason
    });
    
    res.status(200).json({
        success: true,
        message: 'Product removed',
        data: { productId }
    });
});

/**
 * Suspend product temporarily
 */
exports.suspendProduct = catchAsync(async (req, res) => {
    const { productId } = req.params;
    const { reason, duration = 7 } = req.body;
    
    const product = await Product.findById(productId);
    if (!product) {
        notFound('Product');
    }
    
    const suspendUntil = new Date();
    suspendUntil.setDate(suspendUntil.getDate() + duration);
    
    await Product.findByIdAndUpdate(productId, {
        status: 'suspended',
        suspendedAt: new Date(),
        suspendedBy: req.user.id,
        suspensionReason: reason,
        suspendUntil
    });
    
    logger.warn('Product suspended by admin', {
        adminId: req.user.id,
        productId,
        reason,
        days: duration
    });
    
    res.status(200).json({
        success: true,
        message: `Product suspended for ${duration} days`,
        data: { productId, suspendUntil }
    });
});

// ============================================================================
// ORDER MONITORING
// ============================================================================

/**
 * Get all orders with monitoring
 */
exports.getAllOrders = catchAsync(async (req, res) => {
    const { page = 1, limit = 20, status, fromDate, toDate, farmerId, consumerId } = req.query;
    const skip = (page - 1) * limit;
    
    const filter = {};
    
    if (status) filter.status = status;
    if (farmerId) filter.farmerId = farmerId;
    if (consumerId) filter.consumerId = consumerId;
    
    // Date range filter
    if (fromDate || toDate) {
        filter.createdAt = {};
        if (fromDate) filter.createdAt.$gte = new Date(fromDate);
        if (toDate) filter.createdAt.$lte = new Date(toDate);
    }
    
    const total = await Order.countDocuments(filter);
    
    const orders = await Order.find(filter)
        .populate('farmerId', 'name email')
        .populate('consumerId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    
    logger.info('Fetched all orders', {
        userId: req.user.id,
        count: orders.length,
        filters: filter
    });
    
    res.status(200).json({
        success: true,
        data: {
            orders,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

/**
 * Get suspicious orders (flagged for review)
 */
exports.getSuspiciousOrders = catchAsync(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const filter = {
        $or: [
            { flagged: true },
            { status: 'cancelled_by_system' },
            { paymentStatus: 'failed' },
            { refundStatus: 'requested' }
        ]
    };
    
    const total = await Order.countDocuments(filter);
    
    const orders = await Order.find(filter)
        .populate('farmerId', 'name email')
        .populate('consumerId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    
    res.status(200).json({
        success: true,
        data: {
            orders,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

/**
 * Resolve order dispute
 */
exports.resolveOrderDispute = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { resolution, refundAmount = 0 } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
        notFound('Order');
    }
    
    await Order.findByIdAndUpdate(orderId, {
        disputeResolution: resolution,
        disputeResolvedAt: new Date(),
        disputeResolvedBy: req.user.id,
        refundAmount: refundAmount || order.totalAmount,
        flagged: false
    });
    
    logger.info('Order dispute resolved', {
        adminId: req.user.id,
        orderId,
        resolution,
        refundAmount
    });
    
    res.status(200).json({
        success: true,
        message: 'Dispute resolved',
        data: { orderId }
    });
});

// ============================================================================
// PLATFORM ANALYTICS
// ============================================================================

/**
 * Get comprehensive platform analytics
 */
exports.getPlatformAnalytics = catchAsync(async (req, res) => {
    const { period = 'month' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    if (period === 'week') {
        startDate.setDate(endDate.getDate() - 7);
    } else if (period === 'month') {
        startDate.setMonth(endDate.getMonth() - 1);
    } else if (period === 'year') {
        startDate.setFullYear(endDate.getFullYear() - 1);
    }
    
    // User statistics
    const userStats = await User.aggregate([
        {
            $facet: {
                total: [{ $count: 'count' }],
                byType: [
                    { $group: { _id: '$type', count: { $sum: 1 } } }
                ],
                newUsers: [
                    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
                    { $count: 'count' }
                ],
                activeUsers: [
                    { $match: { lastLogin: { $gte: startDate, $lte: endDate } } },
                    { $count: 'count' }
                ]
            }
        }
    ]);
    
    // Order statistics
    const orderStats = await Order.aggregate([
        {
            $facet: {
                total: [{ $count: 'count' }],
                totalRevenue: [
                    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
                ],
                revenueInPeriod: [
                    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
                    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
                ],
                byStatus: [
                    { $group: { _id: '$status', count: { $sum: 1 } } }
                ],
                averageOrderValue: [
                    { $group: { _id: null, avg: { $avg: '$totalAmount' } } }
                ]
            }
        }
    ]);
    
    // Product statistics
    const productStats = await Product.aggregate([
        {
            $facet: {
                total: [{ $count: 'count' }],
                byStatus: [
                    { $group: { _id: '$status', count: { $sum: 1 } } }
                ],
                activeProducts: [
                    { $match: { status: 'active' } },
                    { $count: 'count' }
                ],
                topCategories: [
                    { $group: { _id: '$category', count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 10 }
                ]
            }
        }
    ]);
    
    // Review statistics
    const reviewStats = await Review.aggregate([
        {
            $facet: {
                total: [{ $count: 'count' }],
                averageRating: [
                    { $match: { status: 'approved' } },
                    { $group: { _id: null, avg: { $avg: '$rating.overall' } } }
                ],
                byStatus: [
                    { $group: { _id: '$status', count: { $sum: 1 } } }
                ],
                flaggedReviews: [
                    { $match: { status: 'flagged' } },
                    { $count: 'count' }
                ]
            }
        }
    ]);
    
    // Payment statistics
    const paymentStats = await Payment.aggregate([
        {
            $facet: {
                totalTransactions: [{ $count: 'count' }],
                totalAmount: [
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ],
                byStatus: [
                    { $group: { _id: '$status', count: { $sum: 1 } } }
                ],
                failedTransactions: [
                    { $match: { status: 'failed' } },
                    { $count: 'count' }
                ]
            }
        }
    ]);
    
    logger.info('Platform analytics retrieved', {
        userId: req.user.id,
        period
    });
    
    res.status(200).json({
        success: true,
        data: {
            period,
            dateRange: { startDate, endDate },
            users: userStats[0],
            orders: orderStats[0],
            products: productStats[0],
            reviews: reviewStats[0],
            payments: paymentStats[0]
        }
    });
});

/**
 * Get dashboard overview
 */
exports.getDashboardOverview = catchAsync(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Today's stats
    const todayOrders = await Order.countDocuments({
        createdAt: { $gte: today, $lt: tomorrow }
    });
    
    const todayRevenue = await Order.aggregate([
        {
            $match: {
                createdAt: { $gte: today, $lt: tomorrow },
                status: { $in: ['completed', 'pending'] }
            }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    const newUsers = await User.countDocuments({
        createdAt: { $gte: today, $lt: tomorrow }
    });
    
    const flaggedReviews = await Review.countDocuments({
        status: 'flagged'
    });
    
    const suspiciousOrders = await Order.countDocuments({
        flagged: true
    });
    
    const pendingApprovals = await Product.countDocuments({
        status: 'pending'
    });
    
    res.status(200).json({
        success: true,
        data: {
            today: {
                orders: todayOrders,
                revenue: todayRevenue[0]?.total || 0,
                newUsers,
                timestamp: new Date().toISOString()
            },
            alerts: {
                flaggedReviews,
                suspiciousOrders,
                pendingApprovals
            }
        }
    });
});

/**
 * Get system health check
 */
exports.getSystemHealth = catchAsync(async (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        services: {}
    };
    
    // Check database connection
    try {
        await User.findOne().batchSize(1);
        health.services.database = { status: 'connected', responseTime: 'fast' };
    } catch (error) {
        health.services.database = { status: 'error', error: error.message };
        health.status = 'degraded';
    }
    
    res.status(200).json({
        success: true,
        data: health
    });
});

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
    // User management
    getAllUsers: exports.getAllUsers,
    getUserDetails: exports.getUserDetails,
    deleteUser: exports.deleteUser,
    banUser: exports.banUser,
    resetUserPassword: exports.resetUserPassword,
    
    // Product management
    getAllProducts: exports.getAllProducts,
    approveProduct: exports.approveProduct,
    rejectProduct: exports.rejectProduct,
    removeProduct: exports.removeProduct,
    suspendProduct: exports.suspendProduct,
    
    // Order monitoring
    getAllOrders: exports.getAllOrders,
    getSuspiciousOrders: exports.getSuspiciousOrders,
    resolveOrderDispute: exports.resolveOrderDispute,
    
    // Analytics
    getPlatformAnalytics: exports.getPlatformAnalytics,
    getDashboardOverview: exports.getDashboardOverview,
    getSystemHealth: exports.getSystemHealth
};
