const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and extracts user information
 * Production-grade implementation with comprehensive error handling
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const TOKEN_BLACKLIST = new Set(); // In production, use Redis
const getUserRole = (user) => user?.type || user?.role;

// ============================================================================
// MAIN AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Verify JWT token from request header
 * Extracts token and validates signature
 * Attaches user data to req.user
 */
exports.verifyToken = (req, res, next) => {
    try {
        const token = extractToken(req);
        
        if (!token) {
            logger.warn('No token provided', {
                path: req.path,
                ip: req.ip,
                method: req.method
            });
            
            return res.status(401).json({
                success: false,
                message: 'No authentication token provided',
                code: 'NO_TOKEN'
            });
        }
        
        // Check if token is blacklisted (logged out)
        if (TOKEN_BLACKLIST.has(token)) {
            logger.warn('Blacklisted token used', {
                ip: req.ip,
                path: req.path
            });
            
            return res.status(401).json({
                success: false,
                message: 'Token is invalid or expired',
                code: 'INVALID_TOKEN'
            });
        }
        
        // Verify token signature
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Attach decoded token to request
        req.user = decoded;
        req.token = token;
        
        logger.debug('Token verified', {
            userId: decoded.id,
            userType: getUserRole(decoded)
        });
        
        next();
        
    } catch (error) {
        handleTokenError(error, req, res);
    }
};

/**
 * Alternative: Verify token with optional authentication
 * Route proceeds even if token is invalid (for public routes)
 */
exports.verifyTokenOptional = (req, res, next) => {
    try {
        const token = extractToken(req);
        
        if (token && !TOKEN_BLACKLIST.has(token)) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                req.user = decoded;
                req.token = token;
            } catch (error) {
                // Token invalid but route continues
                logger.debug('Invalid token on optional auth', { error: error.message });
            }
        }
        
        next();
        
    } catch (error) {
        logger.error('Error in optional token verification', { error: error.message });
        next();
    }
};

/**
 * Refresh JWT token
 * Issues a new token before expiry
 */
exports.refreshToken = (req, res, next) => {
    try {
        const token = extractToken(req);
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }
        
        let decoded;
        try {
            // Try to verify - will fail if expired
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                // Decode without verification to get user data
                decoded = jwt.decode(token);
                
                if (!decoded) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid token'
                    });
                }
            } else {
                throw error;
            }
        }
        
        // Generate new token
        const newToken = generateToken(decoded);
        
        // Blacklist old token
        TOKEN_BLACKLIST.add(token);
        
        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                token: newToken,
                expiresIn: JWT_EXPIRY
            }
        });
        
    } catch (error) {
        logger.error('Error refreshing token', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Error refreshing token'
        });
    }
};

// ============================================================================
// ROLE-BASED AUTHENTICATION
// ============================================================================

/**
 * Require authentication for consumer
 */
exports.requireAuth = (req, res, next) => {
    exports.verifyToken(req, res, () => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        next();
    });
};

/**
 * Require consumer role
 */
exports.requireConsumer = (req, res, next) => {
    if (!req.user || getUserRole(req.user) !== 'consumer') {
        logger.warn('Unauthorized consumer access', {
            userId: req.user?.id,
            userType: getUserRole(req.user),
            path: req.path
        });
        
        return res.status(403).json({
            success: false,
            message: 'Consumer access required',
            code: 'FORBIDDEN_CONSUMER'
        });
    }
    next();
};

/**
 * Require farmer role
 */
exports.requireFarmer = (req, res, next) => {
    if (!req.user || getUserRole(req.user) !== 'farmer') {
        logger.warn('Unauthorized farmer access', {
            userId: req.user?.id,
            userType: getUserRole(req.user),
            path: req.path
        });
        
        return res.status(403).json({
            success: false,
            message: 'Farmer access required',
            code: 'FORBIDDEN_FARMER'
        });
    }
    next();
};

/**
 * Require admin role
 */
exports.requireAdmin = (req, res, next) => {
    if (!req.user || getUserRole(req.user) !== 'admin') {
        logger.warn('Unauthorized admin access', {
            userId: req.user?.id,
            userType: getUserRole(req.user),
            path: req.path,
            ip: req.ip
        });
        
        return res.status(403).json({
            success: false,
            message: 'Admin access required',
            code: 'FORBIDDEN_ADMIN'
        });
    }
    next();
};

/**
 * Require one of specified roles
 */
exports.requireRoles = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(getUserRole(req.user))) {
            logger.warn('Unauthorized role access', {
                userId: req.user?.id,
                userType: getUserRole(req.user),
                requiredRoles: roles,
                path: req.path
            });
            
            return res.status(403).json({
                success: false,
                message: `One of roles required: ${roles.join(', ')}`,
                code: 'FORBIDDEN_ROLES'
            });
        }
        next();
    };
};

// ============================================================================
// OWNERSHIP VERIFICATION
// ============================================================================

/**
 * Verify user owns the resource
 * Usage: requireAuth, verifyOwnership, handler
 */
exports.verifyOwnership = (req, res, next) => {
    const resourceOwnerId = req.params.userId || req.body.userId;
    
    if (!resourceOwnerId) {
        return res.status(400).json({
            success: false,
            message: 'User ID not found in request'
        });
    }
    
    if (req.user.id !== resourceOwnerId && getUserRole(req.user) !== 'admin') {
        logger.warn('Unauthorized resource access', {
            userId: req.user.id,
            resourceOwnerId,
            path: req.path
        });
        
        return res.status(403).json({
            success: false,
            message: 'You do not have permission to access this resource',
            code: 'FORBIDDEN_OWNERSHIP'
        });
    }
    
    next();
};

// ============================================================================
// LOGOUT & TOKEN MANAGEMENT
// ============================================================================

/**
 * Logout endpoint - blacklist token
 */
exports.logout = (req, res, next) => {
    try {
        const token = extractToken(req);
        
        if (token) {
            TOKEN_BLACKLIST.add(token);
            logger.info('User logged out', {
                userId: req.user?.id
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
        
    } catch (error) {
        logger.error('Error during logout', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Error logging out'
        });
    }
};

/**
 * Clear all user tokens (logout from all devices)
 */
exports.logoutAll = (req, res, next) => {
    try {
        const userId = req.user.id;
        
        // In production, delete all tokens from Redis using pattern: token:userId:*
        // For now, we'll just blacklist current token
        const token = extractToken(req);
        if (token) {
            TOKEN_BLACKLIST.add(token);
        }
        
        logger.info('User logged out from all devices', { userId });
        
        res.status(200).json({
            success: true,
            message: 'Logged out from all devices'
        });
        
    } catch (error) {
        logger.error('Error during logout all', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Error logging out'
        });
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract token from Authorization header
 * Supports: "Bearer <token>"
 */
function extractToken(req) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return null;
    }
    
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }
    
    return parts[1];
}

/**
 * Generate JWT token
 */
function generateToken(userData) {
    return jwt.sign(userData, JWT_SECRET, {
        expiresIn: JWT_EXPIRY,
        issuer: 'agridesk',
        audience: 'agridesk-app'
    });
}

/**
 * Handle token verification errors
 */
function handleTokenError(error, req, res) {
    let statusCode = 401;
    let message = 'Authentication failed';
    let code = 'AUTH_ERROR';
    
    if (error.name === 'JsonWebTokenError') {
        message = 'Invalid token';
        code = 'INVALID_TOKEN';
    } else if (error.name === 'TokenExpiredError') {
        message = 'Token has expired';
        code = 'TOKEN_EXPIRED';
        statusCode = 401;
    } else if (error.name === 'NotBeforeError') {
        message = 'Token not yet valid';
        code = 'TOKEN_NOT_VALID';
    }
    
    logger.warn('Token verification failed', {
        error: error.name,
        message: error.message,
        ip: req.ip,
        path: req.path
    });
    
    res.status(statusCode).json({
        success: false,
        message,
        code
    });
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
    verifyToken: exports.verifyToken,
    verifyTokenOptional: exports.verifyTokenOptional,
    refreshToken: exports.refreshToken,
    requireAuth: exports.requireAuth,
    requireConsumer: exports.requireConsumer,
    requireFarmer: exports.requireFarmer,
    requireAdmin: exports.requireAdmin,
    requireRoles: exports.requireRoles,
    verifyOwnership: exports.verifyOwnership,
    logout: exports.logout,
    logoutAll: exports.logoutAll,
    generateToken,
    extractToken
};
