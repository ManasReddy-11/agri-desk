const logger = require('../utils/logger');

/**
 * Global Error Handler Middleware
 * Centralized error handling for all routes
 * Production-grade implementation with comprehensive error mapping
 */

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

/**
 * Application error base class
 */
class AppError extends Error {
    constructor(message, statusCode, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.timestamp = new Date().toISOString();
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Validation error
 */
class ValidationError extends AppError {
    constructor(message, field = null, code = 'VALIDATION_ERROR') {
        super(message, 400, code);
        this.field = field;
    }
}

/**
 * Authentication error
 */
class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed', code = 'AUTHENTICATION_ERROR') {
        super(message, 401, code);
    }
}

/**
 * Authorization error
 */
class AuthorizationError extends AppError {
    constructor(message = 'Access denied', code = 'AUTHORIZATION_ERROR') {
        super(message, 403, code);
    }
}

/**
 * Not found error
 */
class NotFoundError extends AppError {
    constructor(resource = 'Resource', code = 'NOT_FOUND') {
        super(`${resource} not found`, 404, code);
    }
}

/**
 * Conflict error
 */
class ConflictError extends AppError {
    constructor(message, code = 'CONFLICT') {
        super(message, 409, code);
    }
}

/**
 * Rate limit error
 */
class RateLimitError extends AppError {
    constructor(message = 'Too many requests', retryAfter = 60, code = 'RATE_LIMIT_EXCEEDED') {
        super(message, 429, code);
        this.retryAfter = retryAfter;
    }
}

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================

/**
 * Main error handler middleware
 * Should be placed AFTER all routes and other middleware
 */
const errorHandler = (err, req, res, next) => {
    // Handle async errors from routes
    if (err instanceof AppError) {
        return handleAppError(err, req, res);
    }
    
    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors)
            .map(e => e.message)
            .join(', ');
        return handleAppError(
            new ValidationError(message, null, 'MONGOOSE_VALIDATION_ERROR'),
            req,
            res
        );
    }
    
    // Handle Mongoose cast errors
    if (err.name === 'CastError') {
        return handleAppError(
            new ValidationError(`Invalid ${err.kind}: ${err.value}`, 'id', 'INVALID_ID_FORMAT'),
            req,
            res
        );
    }
    
    // Handle MongoDB duplicate key errors
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return handleAppError(
            new ConflictError(`${field} already exists`, 'DUPLICATE_ENTRY'),
            req,
            res
        );
    }
    
    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return handleAppError(
            new AuthenticationError('Invalid token', 'INVALID_TOKEN'),
            req,
            res
        );
    }
    
    if (err.name === 'TokenExpiredError') {
        return handleAppError(
            new AuthenticationError('Token has expired', 'TOKEN_EXPIRED'),
            req,
            res
        );
    }
    
    // Handle syntax errors in JSON
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return handleAppError(
            new ValidationError('Invalid JSON in request body', 'body', 'INVALID_JSON'),
            req,
            res
        );
    }
    
    // Handle unknown errors
    handleUnknownError(err, req, res);
};

/**
 * Handle application errors
 */
function handleAppError(error, req, res) {
    const statusCode = error.statusCode || 500;
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Log error
    logError(error, req, statusCode);
    
    // Send response
    const response = {
        success: false,
        message: error.message,
        code: error.code,
        timestamp: error.timestamp
    };
    
    // Add field for validation errors
    if (error.field) {
        response.field = error.field;
    }
    
    // Add retry after for rate limit errors
    if (error.retryAfter) {
        response.retryAfter = error.retryAfter;
        res.set('Retry-After', error.retryAfter);
    }
    
    // Add stack trace in development
    if (isDevelopment) {
        response.stack = error.stack;
    }
    
    // Add request ID for tracking
    if (req.id) {
        response.requestId = req.id;
    }
    
    res.status(statusCode).json(response);
}

/**
 * Handle unexpected errors
 */
function handleUnknownError(error, req, res) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const statusCode = error.statusCode || 500;
    
    logger.error('Unexpected error', {
        message: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        ip: req.ip,
        body: req.body
    });
    
    const response = {
        success: false,
        message: isDevelopment 
            ? error.message 
            : 'An unexpected error occurred',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString()
    };
    
    if (req.id) {
        response.requestId = req.id;
    }
    
    if (isDevelopment) {
        response.stack = error.stack;
    }
    
    res.status(statusCode).json(response);
}

/**
 * Log error with appropriate level
 */
function logError(error, req, statusCode) {
    const logContext = {
        statusCode,
        errorCode: error.code,
        message: error.message,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get('user-agent')
    };
    
    if (statusCode >= 500) {
        logger.error('Server error', {
            ...logContext,
            stack: error.stack
        });
    } else if (statusCode >= 400) {
        logger.warn('Client error', logContext);
    } else {
        logger.debug('Error', logContext);
    }
}

// ============================================================================
// ASYNC ERROR WRAPPER
// ============================================================================

/**
 * Wrap async route handlers to catch errors
 * Usage: router.get('/', catchAsync(async (req, res) => { ... }))
 */
const catchAsync = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// ============================================================================
// ERROR RESPONSE HELPERS
// ============================================================================

/**
 * Send validation error response
 */
const validationError = (message, field = null, code = 'VALIDATION_ERROR') => {
    throw new ValidationError(message, field, code);
};

/**
 * Send not found error response
 */
const notFound = (resource = 'Resource', code = 'NOT_FOUND') => {
    throw new NotFoundError(resource, code);
};

/**
 * Send conflict error response
 */
const conflict = (message, code = 'CONFLICT') => {
    throw new ConflictError(message, code);
};

/**
 * Send authentication error response
 */
const unauthorized = (message = 'Authentication failed', code = 'AUTHENTICATION_ERROR') => {
    throw new AuthenticationError(message, code);
};

/**
 * Send authorization error response
 */
const forbidden = (message = 'Access denied', code = 'AUTHORIZATION_ERROR') => {
    throw new AuthorizationError(message, code);
};

/**
 * Send rate limit error response
 */
const rateLimited = (message = 'Too many requests', retryAfter = 60, code = 'RATE_LIMIT_EXCEEDED') => {
    throw new RateLimitError(message, retryAfter, code);
};

/**
 * Send internal server error response
 */
const serverError = (message = 'Internal server error', code = 'INTERNAL_SERVER_ERROR') => {
    throw new AppError(message, 500, code);
};

// ============================================================================
// 404 HANDLER
// ============================================================================

/**
 * Handle 404 - Not Found
 * Should be placed AFTER all routes
 */
const notFoundHandler = (req, res, next) => {
    logger.warn('Route not found', {
        path: req.path,
        method: req.method,
        ip: req.ip
    });
    
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        code: 'ROUTE_NOT_FOUND',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
};

// ============================================================================
// REQUEST TRACKING
// ============================================================================

/**
 * Add request ID to track requests through logs
 */
const requestIdMiddleware = (req, res, next) => {
    req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Request-ID', req.id);
    next();
};

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

/**
 * Health check endpoint for monitoring/load balancing
 */
const healthCheck = (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Service is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV
    });
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    // Error handler
    errorHandler,
    notFoundHandler,
    requestIdMiddleware,
    healthCheck,
    
    // Error classes
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    
    // Utilities
    catchAsync,
    validationError,
    notFound,
    conflict,
    unauthorized,
    forbidden,
    rateLimited,
    serverError
};
