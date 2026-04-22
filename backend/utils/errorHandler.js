/**
 * Custom Error Class for Application Errors
 */

export class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        // Maintains proper stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Custom Error for Validation
 */
export class ValidationError extends AppError {
    constructor(message, errors = []) {
        super(message, 400);
        this.errors = errors;
    }
}

/**
 * Custom Error for Authentication
 */
export class AuthError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401);
    }
}

/**
 * Custom Error for Authorization
 */
export class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403);
    }
}

/**
 * Custom Error for Not Found
 */
export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}

/**
 * Custom Error for Conflict
 */
export class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(message, 409);
    }
}

export default AppError;
