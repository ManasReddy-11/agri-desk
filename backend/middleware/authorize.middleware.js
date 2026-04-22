const logger = require('../utils/logger');

/**
 * Role-Based Authorization Middleware
 * Provides granular permission checking and resource access control
 * Production-grade implementation
 */

// ============================================================================
// ROLE & PERMISSION DEFINITIONS
// ============================================================================

const ROLES = {
    CONSUMER: 'consumer',
    FARMER: 'farmer',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin'
};

const PERMISSIONS = {
    // Consumer permissions
    CONSUMER_VIEW_PRODUCTS: 'consumer:view_products',
    CONSUMER_PURCHASE: 'consumer:purchase',
    CONSUMER_VIEW_ORDERS: 'consumer:view_orders',
    CONSUMER_SUBMIT_REVIEW: 'consumer:submit_review',
    CONSUMER_MANAGE_PROFILE: 'consumer:manage_profile',
    CONSUMER_VIEW_CART: 'consumer:view_cart',
    
    // Farmer permissions
    FARMER_MANAGE_PRODUCTS: 'farmer:manage_products',
    FARMER_VIEW_ORDERS: 'farmer:view_orders',
    FARMER_MANAGE_PROFILE: 'farmer:manage_profile',
    FARMER_VIEW_ANALYTICS: 'farmer:view_analytics',
    FARMER_RESPOND_REVIEW: 'farmer:respond_review',
    
    // Admin permissions
    ADMIN_MANAGE_USERS: 'admin:manage_users',
    ADMIN_MODERATE_REVIEWS: 'admin:moderate_reviews',
    ADMIN_VIEW_ANALYTICS: 'admin:view_analytics',
    ADMIN_MANAGE_PRODUCTS: 'admin:manage_products',
    ADMIN_MANAGE_ORDERS: 'admin:manage_orders',
    
    // Super admin permissions
    SUPER_ADMIN_ALL: 'super_admin:all'
};

// Role to permissions mapping
const ROLE_PERMISSIONS = {
    [ROLES.CONSUMER]: [
        PERMISSIONS.CONSUMER_VIEW_PRODUCTS,
        PERMISSIONS.CONSUMER_PURCHASE,
        PERMISSIONS.CONSUMER_VIEW_ORDERS,
        PERMISSIONS.CONSUMER_SUBMIT_REVIEW,
        PERMISSIONS.CONSUMER_MANAGE_PROFILE,
        PERMISSIONS.CONSUMER_VIEW_CART
    ],
    [ROLES.FARMER]: [
        PERMISSIONS.FARMER_MANAGE_PRODUCTS,
        PERMISSIONS.FARMER_VIEW_ORDERS,
        PERMISSIONS.FARMER_MANAGE_PROFILE,
        PERMISSIONS.FARMER_VIEW_ANALYTICS,
        PERMISSIONS.FARMER_RESPOND_REVIEW
    ],
    [ROLES.ADMIN]: [
        PERMISSIONS.ADMIN_MANAGE_USERS,
        PERMISSIONS.ADMIN_MODERATE_REVIEWS,
        PERMISSIONS.ADMIN_VIEW_ANALYTICS,
        PERMISSIONS.ADMIN_MANAGE_PRODUCTS,
        PERMISSIONS.ADMIN_MANAGE_ORDERS
    ],
    [ROLES.SUPER_ADMIN]: [
        PERMISSIONS.SUPER_ADMIN_ALL
    ]
};

const getUserRole = (user) => user?.type || user?.role;

// ============================================================================
// PERMISSION CHECKING MIDDLEWARE
// ============================================================================

/**
 * Check if user has specific permission
 */
exports.requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            logger.warn('Permission check on unauthenticated request', {
                path: req.path,
                method: req.method
            });
            
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'UNAUTHENTICATED'
            });
        }
        
        const userPermissions = getUserPermissions(req.user);
        
        if (!userPermissions.includes(permission)) {
            logger.warn('Permission denied', {
                userId: req.user.id,
                userRole: getUserRole(req.user),
                requiredPermission: permission,
                path: req.path
            });
            
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to perform this action',
                code: 'PERMISSION_DENIED',
                requiredPermission: permission
            });
        }
        
        req.permissions = userPermissions;
        next();
    };
};

/**
 * Check if user has any of specified permissions
 */
exports.requireAnyPermission = (permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        
        const userPermissions = getUserPermissions(req.user);
        const hasPermission = permissions.some(p => userPermissions.includes(p));
        
        if (!hasPermission) {
            logger.warn('Permission denied - any required', {
                userId: req.user.id,
                requiredPermissions: permissions,
                path: req.path
            });
            
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to perform this action',
                code: 'PERMISSION_DENIED'
            });
        }
        
        req.permissions = userPermissions;
        next();
    };
};

/**
 * Check if user has all specified permissions
 */
exports.requireAllPermissions = (permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        
        const userPermissions = getUserPermissions(req.user);
        const hasAllPermissions = permissions.every(p => userPermissions.includes(p));
        
        if (!hasAllPermissions) {
            logger.warn('Permission denied - all required', {
                userId: req.user.id,
                requiredPermissions: permissions,
                path: req.path
            });
            
            return res.status(403).json({
                success: false,
                message: 'You do not have all required permissions',
                code: 'PERMISSION_DENIED'
            });
        }
        
        req.permissions = userPermissions;
        next();
    };
};

// ============================================================================
// ATTRIBUTE-BASED ACCESS CONTROL (ABAC)
// ============================================================================

/**
 * Check resource ownership or admin status
 */
exports.checkResourceOwnership = (resourceOwnerField = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        
        // Admin can access anything
        if (getUserRole(req.user) === ROLES.ADMIN || getUserRole(req.user) === ROLES.SUPER_ADMIN) {
            req.isOwner = true;
            return next();
        }
        
        const resourceOwnerId = req.params[resourceOwnerField] || 
                               req.body[resourceOwnerField] ||
                               req.query[resourceOwnerField];
        
        if (!resourceOwnerId) {
            logger.warn('Resource owner ID not found', {
                field: resourceOwnerField,
                path: req.path
            });
            
            return res.status(400).json({
                success: false,
                message: 'Resource owner information not found',
                code: 'INVALID_REQUEST'
            });
        }
        
        const isOwner = req.user.id === resourceOwnerId;
        
        if (!isOwner) {
            logger.warn('Unauthorized resource access', {
                userId: req.user.id,
                resourceOwnerId,
                path: req.path
            });
            
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this resource',
                code: 'FORBIDDEN_OWNERSHIP'
            });
        }
        
        req.isOwner = true;
        next();
    };
};

/**
 * Check resource status-based access
 * Example: Only access non-deleted, verified resources
 */
exports.checkResourceStatus = (allowedStatuses) => {
    return (req, res, next) => {
        const resourceStatus = req.resource?.status;
        
        if (!resourceStatus) {
            logger.error('Resource status not found in request', {
                path: req.path
            });
            
            return res.status(500).json({
                success: false,
                message: 'Error checking resource status'
            });
        }
        
        if (!allowedStatuses.includes(resourceStatus)) {
            logger.warn('Access denied - invalid resource status', {
                resourceStatus,
                allowedStatuses,
                path: req.path
            });
            
            return res.status(403).json({
                success: false,
                message: `Cannot access resource with status: ${resourceStatus}`,
                code: 'FORBIDDEN_STATUS'
            });
        }
        
        next();
    };
};

// ============================================================================
// RATE LIMITING & QUOTA CHECKS
// ============================================================================

/**
 * Check user action quota
 * Example usage: checkQuota('api_calls', 100, 3600)
 */
exports.checkQuota = (quotaKey, limit, windowSeconds) => {
    // In production, use Redis for distributed quota tracking
    const quotaStore = new Map();
    
    return (req, res, next) => {
        const userId = req.user?.id;
        if (!userId) return next();
        
        const key = `${userId}:${quotaKey}`;
        const now = Date.now();
        
        if (!quotaStore.has(key)) {
            quotaStore.set(key, {
                count: 0,
                resetAt: now + (windowSeconds * 1000)
            });
        }
        
        const quota = quotaStore.get(key);
        
        // Reset if window expired
        if (now > quota.resetAt) {
            quota.count = 0;
            quota.resetAt = now + (windowSeconds * 1000);
        }
        
        if (quota.count >= limit) {
            logger.warn('Quota exceeded', {
                userId,
                quotaKey,
                limit,
                windowSeconds
            });
            
            return res.status(429).json({
                success: false,
                message: 'Request quota exceeded',
                code: 'QUOTA_EXCEEDED',
                retryAfter: Math.ceil((quota.resetAt - now) / 1000)
            });
        }
        
        quota.count++;
        req.quotaRemaining = limit - quota.count;
        next();
    };
};

// ============================================================================
// DELEGATION & IMPERSONATION
// ============================================================================

/**
 * Allow admin to impersonate another user
 * Requires super_admin role and audit logging
 */
exports.allowImpersonation = (req, res, next) => {
    if (getUserRole(req.user) !== ROLES.SUPER_ADMIN) {
        return next();
    }
    
    const impersonateUserId = req.headers['x-impersonate-user'];
    
    if (impersonateUserId) {
        logger.warn('Super admin impersonating user', {
            adminId: req.user.id,
            impersonatedUserId: impersonateUserId,
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString()
        });
        
        req.originalUser = req.user;
        req.user.id = impersonateUserId;
        req.impersonated = true;
    }
    
    next();
};

// ============================================================================
// AUDIT TRAIL
// ============================================================================

/**
 * Log sensitive operations for audit
 */
exports.auditLog = (action, resource) => {
    return (req, res, next) => {
        const auditData = {
            timestamp: new Date().toISOString(),
            action,
            resource,
            userId: req.user?.id,
            userRole: getUserRole(req.user),
            method: req.method,
            path: req.path,
            ip: req.ip,
            userAgent: req.get('user-agent')
        };
        
        // In production, save to audit database
        logger.info('Audit log', auditData);
        
        // Attach to response for potential logging
        req.auditData = auditData;
        
        next();
    };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all permissions for a user based on role
 */
function getUserPermissions(user) {
    const permissions = ROLE_PERMISSIONS[getUserRole(user)] || [];
    
    // Add custom permissions if present
    if (user.customPermissions && Array.isArray(user.customPermissions)) {
        return [...new Set([...permissions, ...user.customPermissions])];
    }
    
    return permissions;
}

/**
 * Check if user has permission
 */exports.hasPermission = (user, permission) => {
    const permissions = getUserPermissions(user);
    return permissions.includes(permission);
};

/**
 * Get user permissions
 */
exports.getUserPermissions = getUserPermissions;

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    // Constants
    ROLES,
    PERMISSIONS,
    ROLE_PERMISSIONS,
    
    // Middleware
    requirePermission: exports.requirePermission,
    requireAnyPermission: exports.requireAnyPermission,
    requireAllPermissions: exports.requireAllPermissions,
    checkResourceOwnership: exports.checkResourceOwnership,
    checkResourceStatus: exports.checkResourceStatus,
    checkQuota: exports.checkQuota,
    allowImpersonation: exports.allowImpersonation,
    auditLog: exports.auditLog,
    
    // Helpers
    hasPermission: exports.hasPermission,
    getUserPermissions: exports.getUserPermissions
};
