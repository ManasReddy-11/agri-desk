const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth.middleware');
const { requirePermission, PERMISSIONS, auditLog } = require('../middleware/authorize.middleware');
const { validateBody, validateParams, ValidationRules, validateQuery } = require('../middleware/validation.middleware');
const adminController = require('../controllers/admin.controller');

/**
 * Admin Routes
 * All routes require authentication and admin role
 * Production-grade implementation
 */

// ============================================================================
// MIDDLEWARE: Apply auth to all routes
// ============================================================================

router.use(requireAuth);
router.use(requireAdmin);

// ============================================================================
// USER MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/admin/users
 * Get all users with filtering
 * Query: page, limit, role, status, verified, banned, search
 */
router.get('/users',
    validateQuery({
        page: (v) => ValidationRules.number(v, { min: 1, required: false }),
        limit: (v) => ValidationRules.number(v, { min: 1, max: 100, required: false }),
        role: (v) => ValidationRules.enum(v, ['consumer', 'farmer', 'admin'], { required: false }),
        status: (v) => ValidationRules.enum(v, ['active', 'inactive', 'suspended'], { required: false }),
        verified: (v) => ValidationRules.boolean(v, { required: false }),
        banned: (v) => ValidationRules.boolean(v, { required: false }),
        search: (v) => ValidationRules.string(v, { max: 100, required: false })
    }),
    requirePermission(PERMISSIONS.ADMIN_MANAGE_USERS),
    adminController.getAllUsers
);

/**
 * GET /api/admin/users/:userId
 * Get detailed user information with stats
 */
router.get('/users/:userId',
    validateParams({
        userId: (v) => ValidationRules.objectId(v)
    }),
    requirePermission(PERMISSIONS.ADMIN_MANAGE_USERS),
    adminController.getUserDetails
);

/**
 * DELETE /api/admin/users/:userId
 * Delete or suspend user account
 */
router.delete('/users/:userId',
    validateParams({
        userId: (v) => ValidationRules.objectId(v)
    }),
    validateBody({
        reason: (v) => ValidationRules.string(v, { min: 5, max: 500 }),
        permanent: (v) => ValidationRules.boolean(v, { required: false })
    }),
    requirePermission(PERMISSIONS.ADMIN_MANAGE_USERS),
    auditLog('DELETE_USER', 'user'),
    adminController.deleteUser
);

/**
 * POST /api/admin/users/:userId/ban
 * Ban or unban user
 */
router.post('/users/:userId/ban',
    validateParams({
        userId: (v) => ValidationRules.objectId(v)
    }),
    validateBody({
        ban: (v) => ValidationRules.boolean(v, { required: false }),
        reason: (v) => ValidationRules.string(v, { min: 5, max: 500 })
    }),
    requirePermission(PERMISSIONS.ADMIN_MANAGE_USERS),
    auditLog('BAN_USER', 'user'),
    adminController.banUser
);

/**
 * POST /api/admin/users/:userId/reset-password
 * Reset user password (admin override)
 */
router.post('/users/:userId/reset-password',
    validateParams({
        userId: (v) => ValidationRules.objectId(v)
    }),
    validateBody({
        temporaryPassword: (v) => ValidationRules.string(v, { min: 8, max: 100 })
    }),
    requirePermission(PERMISSIONS.ADMIN_MANAGE_USERS),
    auditLog('RESET_PASSWORD', 'user'),
    adminController.resetUserPassword
);

// ============================================================================
// PRODUCT MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/admin/products
 * Get all products with approval status
 * Query: page, limit, status, farmerId, category, search
 */
router.get('/products',
    validateQuery({
        page: (v) => ValidationRules.number(v, { min: 1, required: false }),
        limit: (v) => ValidationRules.number(v, { min: 1, max: 100, required: false }),
        status: (v) => ValidationRules.enum(v, ['pending', 'active', 'rejected', 'suspended', 'removed'], { required: false }),
        farmerId: (v) => ValidationRules.objectId(v, { required: false }),
        category: (v) => ValidationRules.string(v, { required: false }),
        search: (v) => ValidationRules.string(v, { max: 100, required: false })
    }),
    requirePermission(PERMISSIONS.ADMIN_MANAGE_PRODUCTS),
    adminController.getAllProducts
);

/**
 * POST /api/admin/products/:productId/approve
 * Approve product
 */
router.post('/products/:productId/approve',
    validateParams({
        productId: (v) => ValidationRules.objectId(v)
    }),
    validateBody({
        reason: (v) => ValidationRules.string(v, { max: 1000, required: false })
    }),
    requirePermission(PERMISSIONS.ADMIN_MANAGE_PRODUCTS),
    auditLog('APPROVE_PRODUCT', 'product'),
    adminController.approveProduct
);

/**
 * POST /api/admin/products/:productId/reject
 * Reject product
 */
router.post('/products/:productId/reject',
    validateParams({
        productId: (v) => ValidationRules.objectId(v)
    }),
    validateBody({
        reason: (v) => ValidationRules.string(v, { min: 5, max: 1000 })
    }),
    requirePermission(PERMISSIONS.ADMIN_MANAGE_PRODUCTS),
    auditLog('REJECT_PRODUCT', 'product'),
    adminController.rejectProduct
);

/**
 * DELETE /api/admin/products/:productId
 * Remove product
 */
router.delete('/products/:productId',
    validateParams({
        productId: (v) => ValidationRules.objectId(v)
    }),
    validateBody({
        reason: (v) => ValidationRules.string(v, { max: 500 })
    }),
    requirePermission(PERMISSIONS.ADMIN_MANAGE_PRODUCTS),
    auditLog('REMOVE_PRODUCT', 'product'),
    adminController.removeProduct
);

/**
 * POST /api/admin/products/:productId/suspend
 * Suspend product temporarily
 */
router.post('/products/:productId/suspend',
    validateParams({
        productId: (v) => ValidationRules.objectId(v)
    }),
    validateBody({
        reason: (v) => ValidationRules.string(v, { min: 5, max: 500 }),
        duration: (v) => ValidationRules.number(v, { min: 1, max: 365, integer: true, required: false })
    }),
    requirePermission(PERMISSIONS.ADMIN_MANAGE_PRODUCTS),
    auditLog('SUSPEND_PRODUCT', 'product'),
    adminController.suspendProduct
);

// ============================================================================
// ORDER MONITORING ROUTES
// ============================================================================

/**
 * GET /api/admin/orders
 * Get all orders with monitoring
 * Query: page, limit, status, fromDate, toDate, farmerId, consumerId
 */
router.get('/orders',
    validateQuery({
        page: (v) => ValidationRules.number(v, { min: 1, required: false }),
        limit: (v) => ValidationRules.number(v, { min: 1, max: 100, required: false }),
        status: (v) => ValidationRules.enum(v, ['pending', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled'], { required: false }),
        fromDate: (v) => ValidationRules.date(v, { required: false }),
        toDate: (v) => ValidationRules.date(v, { required: false }),
        farmerId: (v) => ValidationRules.objectId(v, { required: false }),
        consumerId: (v) => ValidationRules.objectId(v, { required: false })
    }),
    requirePermission(PERMISSIONS.ADMIN_MANAGE_ORDERS),
    adminController.getAllOrders
);

/**
 * GET /api/admin/orders/suspicious
 * Get suspicious/flagged orders
 */
router.get('/orders/suspicious',
    validateQuery({
        page: (v) => ValidationRules.number(v, { min: 1, required: false }),
        limit: (v) => ValidationRules.number(v, { min: 1, max: 100, required: false })
    }),
    requirePermission(PERMISSIONS.ADMIN_MANAGE_ORDERS),
    adminController.getSuspiciousOrders
);

/**
 * POST /api/admin/orders/:orderId/resolve
 * Resolve order dispute
 */
router.post('/orders/:orderId/resolve',
    validateParams({
        orderId: (v) => ValidationRules.objectId(v)
    }),
    validateBody({
        resolution: (v) => ValidationRules.string(v, { min: 5, max: 1000 }),
        refundAmount: (v) => ValidationRules.number(v, { min: 0, required: false })
    }),
    requirePermission(PERMISSIONS.ADMIN_MANAGE_ORDERS),
    auditLog('RESOLVE_ORDER_DISPUTE', 'order'),
    adminController.resolveOrderDispute
);

// ============================================================================
// ANALYTICS & MONITORING ROUTES
// ============================================================================

/**
 * GET /api/admin/analytics
 * Get platform analytics
 * Query: period (week, month, year)
 */
router.get('/analytics',
    validateQuery({
        period: (v) => ValidationRules.enum(v, ['week', 'month', 'year'], { required: false })
    }),
    requirePermission(PERMISSIONS.ADMIN_VIEW_ANALYTICS),
    adminController.getPlatformAnalytics
);

/**
 * GET /api/admin/dashboard
 * Get dashboard overview (quick stats)
 */
router.get('/dashboard',
    requirePermission(PERMISSIONS.ADMIN_VIEW_ANALYTICS),
    adminController.getDashboardOverview
);

/**
 * GET /api/admin/health
 * System health check
 */
router.get('/health',
    adminController.getSystemHealth
);

// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;
