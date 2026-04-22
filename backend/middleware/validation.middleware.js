const logger = require('../utils/logger');

/**
 * Request Validation Middleware
 * Validates request data, sanitizes inputs, prevents common attacks
 * Production-grade implementation
 */

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitize string input (XSS prevention)
 */
function sanitizeString(value) {
    if (typeof value !== 'string') return value;
    
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Sanitize email (basic validation + lowercase)
 */
function sanitizeEmail(email) {
    if (typeof email !== 'string') return email;
    
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(trimmed)) {
        throw new Error('Invalid email format');
    }
    
    return trimmed;
}

/**
 * Sanitize phone number (remove special chars, allow numbers only)
 */
function sanitizePhone(phone) {
    if (typeof phone !== 'string') return phone;
    
    const sanitized = phone.replace(/\D/g, '');
    
    if (sanitized.length < 10 || sanitized.length > 15) {
        throw new Error('Invalid phone number');
    }
    
    return sanitized;
}

/**
 * Sanitize URL
 */
function sanitizeUrl(url) {
    if (typeof url !== 'string') return url;
    
    try {
        const parsed = new URL(url);
        
        // Only allow http and https
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new Error('Invalid URL protocol');
        }
        
        return parsed.toString();
    } catch (error) {
        throw new Error('Invalid URL format');
    }
}

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj, options = {}) {
    const {
        maxStringLength = 1000,
        allowedFields = null,
        stripUnknown = false
    } = options;
    
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
        if (obj.length > maxStringLength) {
            throw new Error(`String exceeds max length of ${maxStringLength}`);
        }
        return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item, options));
    }
    
    if (typeof obj === 'object') {
        const sanitized = {};
        
        for (const [key, value] of Object.entries(obj)) {
            // Check allowed fields
            if (allowedFields && !allowedFields.includes(key)) {
                if (!stripUnknown) {
                    throw new Error(`Unknown field: ${key}`);
                }
                continue;
            }
            
            sanitized[key] = sanitizeObject(value, options);
        }
        
        return sanitized;
    }
    
    return obj;
}

// ============================================================================
// VALIDATION RULES
// ============================================================================

class ValidationRules {
    /**
     * String validation
     */
    static string(value, options = {}) {
        const { min = 0, max = 1000, pattern = null, required = true } = options;
        
        if (value === null || value === undefined) {
            if (required) throw new Error('Field is required');
            return true;
        }
        
        if (typeof value !== 'string') {
            throw new Error('Field must be a string');
        }
        
        const length = value.trim().length;
        
        if (length < min) {
            throw new Error(`Field must be at least ${min} characters`);
        }
        
        if (length > max) {
            throw new Error(`Field must not exceed ${max} characters`);
        }
        
        if (pattern && !pattern.test(value)) {
            throw new Error('Field format is invalid');
        }
        
        return true;
    }
    
    /**
     * Number validation
     */
    static number(value, options = {}) {
        const { min = 0, max = Infinity, integer = false, required = true } = options;
        
        if (value === null || value === undefined) {
            if (required) throw new Error('Field is required');
            return true;
        }
        
        const num = Number(value);
        
        if (isNaN(num)) {
            throw new Error('Field must be a number');
        }
        
        if (integer && !Number.isInteger(num)) {
            throw new Error('Field must be an integer');
        }
        
        if (num < min) {
            throw new Error(`Field must be at least ${min}`);
        }
        
        if (num > max) {
            throw new Error(`Field must not exceed ${max}`);
        }
        
        return true;
    }
    
    /**
     * Email validation
     */
    static email(value, options = {}) {
        const { required = true } = options;
        
        if (!value) {
            if (required) throw new Error('Email is required');
            return true;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(value)) {
            throw new Error('Invalid email format');
        }
        
        return true;
    }
    
    /**
     * Phone number validation
     */
    static phone(value, options = {}) {
        const { required = true, minLength = 10, maxLength = 15 } = options;
        
        if (!value) {
            if (required) throw new Error('Phone is required');
            return true;
        }
        
        const digits = value.replace(/\D/g, '');
        
        if (digits.length < minLength || digits.length > maxLength) {
            throw new Error(`Phone must be between ${minLength} and ${maxLength} digits`);
        }
        
        return true;
    }
    
    /**
     * Array validation
     */
    static array(value, options = {}) {
        const { minLength = 0, maxLength = Infinity, required = true } = options;
        
        if (!value) {
            if (required) throw new Error('Field is required');
            return true;
        }
        
        if (!Array.isArray(value)) {
            throw new Error('Field must be an array');
        }
        
        if (value.length < minLength) {
            throw new Error(`Array must have at least ${minLength} items`);
        }
        
        if (value.length > maxLength) {
            throw new Error(`Array must not exceed ${maxLength} items`);
        }
        
        return true;
    }
    
    /**
     * Enum validation
     */
    static enum(value, allowedValues, options = {}) {
        const { required = true } = options;
        
        if (!value) {
            if (required) throw new Error('Field is required');
            return true;
        }
        
        if (!allowedValues.includes(value)) {
            throw new Error(`Field must be one of: ${allowedValues.join(', ')}`);
        }
        
        return true;
    }
    
    /**
     * Date validation
     */
    static date(value, options = {}) {
        const { required = true, minDate = null, maxDate = null } = options;
        
        if (!value) {
            if (required) throw new Error('Date is required');
            return true;
        }
        
        const date = new Date(value);
        
        if (isNaN(date.getTime())) {
            throw new Error('Invalid date format');
        }
        
        if (minDate && date < new Date(minDate)) {
            throw new Error(`Date must be after ${minDate}`);
        }
        
        if (maxDate && date > new Date(maxDate)) {
            throw new Error(`Date must be before ${maxDate}`);
        }
        
        return true;
    }
    
    /**
     * Boolean validation
     */
    static boolean(value, options = {}) {
        const { required = true } = options;
        
        if (value === null || value === undefined) {
            if (required) throw new Error('Field is required');
            return true;
        }
        
        if (typeof value !== 'boolean') {
            throw new Error('Field must be a boolean');
        }
        
        return true;
    }
    
    /**
     * MongoDB ObjectId validation
     */
    static objectId(value, options = {}) {
        const { required = true } = options;
        
        if (!value) {
            if (required) throw new Error('ID is required');
            return true;
        }
        
        const objectIdRegex = /^[0-9a-fA-F]{24}$/;
        
        if (!objectIdRegex.test(value)) {
            throw new Error('Invalid ID format');
        }
        
        return true;
    }
}

// ============================================================================
// REQUEST VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Validate request body
 */
const validateBody = (schema) => {
    return (req, res, next) => {
        try {
            const errors = {};
            
            for (const [field, rules] of Object.entries(schema)) {
                const value = req.body[field];
                
                try {
                    // Call validation function
                    if (typeof rules === 'function') {
                        rules(value);
                    } else if (rules.validate) {
                        rules.validate(value);
                    }
                } catch (error) {
                    errors[field] = error.message;
                }
            }
            
            if (Object.keys(errors).length > 0) {
                logger.warn('Validation failed', {
                    path: req.path,
                    errors,
                    userId: req.user?.id
                });
                
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    errors
                });
            }
            
            next();
        } catch (error) {
            logger.error('Error in validation middleware', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Error validating request'
            });
        }
    };
};

/**
 * Validate request query parameters
 */
const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            const errors = {};
            
            for (const [field, rules] of Object.entries(schema)) {
                const value = req.query[field];
                
                try {
                    if (typeof rules === 'function') {
                        rules(value);
                    } else if (rules.validate) {
                        rules.validate(value);
                    }
                } catch (error) {
                    errors[field] = error.message;
                }
            }
            
            if (Object.keys(errors).length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid query parameters',
                    code: 'VALIDATION_ERROR',
                    errors
                });
            }
            
            next();
        } catch (error) {
            logger.error('Error in query validation', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Error validating request'
            });
        }
    };
};

/**
 * Validate request params
 */
const validateParams = (schema) => {
    return (req, res, next) => {
        try {
            const errors = {};
            
            for (const [field, rules] of Object.entries(schema)) {
                const value = req.params[field];
                
                try {
                    if (typeof rules === 'function') {
                        rules(value);
                    } else if (rules.validate) {
                        rules.validate(value);
                    }
                } catch (error) {
                    errors[field] = error.message;
                }
            }
            
            if (Object.keys(errors).length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid route parameters',
                    code: 'VALIDATION_ERROR',
                    errors
                });
            }
            
            next();
        } catch (error) {
            logger.error('Error in params validation', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Error validating request'
            });
        }
    };
};

// ============================================================================
// COMMON VALIDATIONS
// ============================================================================

/**
 * Trim and sanitize request body
 */
const sanitizeRequestBody = (req, res, next) => {
    try {
        if (!req.body || typeof req.body !== 'object') {
            return next();
        }
        
        req.body = sanitizeObject(req.body, {
            maxStringLength: 5000,
            stripUnknown: false
        });
        
        next();
    } catch (error) {
        logger.warn('Sanitization error', { error: error.message });
        
        res.status(400).json({
            success: false,
            message: 'Invalid request data',
            code: 'SANITIZATION_ERROR',
            error: error.message
        });
    }
};

/**
 * Validate Content-Type header
 */
const validateContentType = (allowedTypes = ['application/json']) => {
    return (req, res, next) => {
        const contentType = req.get('content-type');
        
        if (!contentType) {
            if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
                return res.status(400).json({
                    success: false,
                    message: 'Content-Type header is required',
                    code: 'MISSING_CONTENT_TYPE'
                });
            }
            return next();
        }
        
        const type = contentType.split(';')[0].trim();
        
        if (!allowedTypes.includes(type)) {
            return res.status(415).json({
                success: false,
                message: `Invalid Content-Type. Allowed types: ${allowedTypes.join(', ')}`,
                code: 'UNSUPPORTED_MEDIA_TYPE'
            });
        }
        
        next();
    };
};

/**
 * Validate request size
 */
const validateRequestSize = (maxSize = '10mb') => {
    const sizeInBytes = parseSize(maxSize);
    
    return (req, res, next) => {
        const contentLength = parseInt(req.get('content-length'), 10);
        
        if (contentLength && contentLength > sizeInBytes) {
            return res.status(413).json({
                success: false,
                message: `Request body exceeds maximum size of ${maxSize}`,
                code: 'REQUEST_TOO_LARGE'
            });
        }
        
        next();
    };
};

/**
 * Prevent SQL injection patterns
 */
const preventSqlInjection = (req, res, next) => {
    const sqlPattern = /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b)/gi;
    
    const checkValue = (value) => {
        if (typeof value === 'string' && sqlPattern.test(value)) {
            throw new Error('Potential SQL injection detected');
        }
        
        if (Array.isArray(value)) {
            value.forEach(checkValue);
        } else if (typeof value === 'object' && value !== null) {
            Object.values(value).forEach(checkValue);
        }
    };
    
    try {
        checkValue(req.body);
        checkValue(req.query);
        checkValue(req.params);
        next();
    } catch (error) {
        logger.warn('SQL injection attempt detected', {
            path: req.path,
            ip: req.ip
        });
        
        res.status(400).json({
            success: false,
            message: 'Invalid request data',
            code: 'INVALID_INPUT'
        });
    }
};

// ============================================================================
// PAGINATION VALIDATION
// ============================================================================

/**
 * Validate and normalize pagination params
 */
const validatePagination = (req, res, next) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const maxLimit = 100;
    
    if (page < 1) {
        return res.status(400).json({
            success: false,
            message: 'Page must be >= 1',
            code: 'INVALID_PAGINATION'
        });
    }
    
    if (limit < 1 || limit > maxLimit) {
        return res.status(400).json({
            success: false,
            message: `Limit must be between 1 and ${maxLimit}`,
            code: 'INVALID_PAGINATION'
        });
    }
    
    req.pagination = {
        page,
        limit,
        skip: (page - 1) * limit
    };
    
    next();
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseSize(size) {
    const units = {
        b: 1,
        kb: 1024,
        mb: 1024 * 1024,
        gb: 1024 * 1024 * 1024
    };
    
    const match = size.match(/^(\d+)(b|kb|mb|gb)$/i);
    if (!match) return 10 * 1024 * 1024; // Default 10MB
    
    return parseInt(match[1], 10) * units[match[2].toLowerCase()];
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    // Sanitization
    sanitizeString,
    sanitizeEmail,
    sanitizePhone,
    sanitizeUrl,
    sanitizeObject,
    
    // Rules
    ValidationRules,
    
    // Middleware
    validateBody,
    validateQuery,
    validateParams,
    sanitizeRequestBody,
    validateContentType,
    validateRequestSize,
    preventSqlInjection,
    validatePagination
};
