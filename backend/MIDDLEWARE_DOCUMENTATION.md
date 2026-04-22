# AgriDesk Middleware System - Production-Grade Implementation

## Overview

This document covers the complete middleware system for AgriDesk backend, including JWT authentication, role-based authorization, error handling, and request validation.

## Table of Contents

1. [Authentication Middleware](#authentication-middleware)
2. [Authorization Middleware](#authorization-middleware)
3. [Error Handler Middleware](#error-handler-middleware)
4. [Validation Middleware](#validation-middleware)
5. [Integration Guide](#integration-guide)
6. [Usage Examples](#usage-examples)

---

## Authentication Middleware

### File: `middleware/auth.middleware.js`

Handles JWT token verification and user authentication.

### Exports

```javascript
const auth = require('./middleware/auth.middleware');

// Main authentication
auth.verifyToken              // Verify JWT token from header
auth.verifyTokenOptional      // Optional authentication (proceeds without token)
auth.refreshToken             // Issue new token before expiry

// Role-based auth
auth.requireAuth              // Require authenticated user
auth.requireConsumer          // Require consumer role
auth.requireFarmer            // Require farmer role
auth.requireAdmin             // Require admin role
auth.requireRoles(roles)      // Require one of specified roles

// Ownership
auth.verifyOwnership          // Verify user owns resource

// Session management
auth.logout                   // Logout current session
auth.logoutAll                // Logout from all devices
```

### Configuration

```javascript
// .env
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=7d
```

### Usage Examples

#### Basic Route Protection

```javascript
const router = require('express').Router();
const { requireAuth, requireConsumer } = require('../middleware/auth.middleware');

// Consumer only
router.post('/cart/add', requireAuth, requireConsumer, (req, res) => {
    // Consumer-specific endpoint
});

// Admin only
router.get('/users', requireAuth, requireAdmin, (req, res) => {
    // Admin-specific endpoint
});

// Multiple roles
router.get('/dashboard', requireAuth, requireRoles(['consumer', 'farmer']), (req, res) => {
    // Consumer or Farmer endpoint
});
```

#### Resource Ownership

```javascript
// Only user can view/edit their profile
router.put('/profile/:userId', 
    requireAuth,
    verifyOwnership,
    (req, res) => {
        // Edit profile
    }
);
```

#### Token Refresh

```javascript
router.post('/auth/refresh', refreshToken);
```

#### Logout

```javascript
router.post('/logout', requireAuth, logout);
router.post('/logout-all', requireAuth, logoutAll);
```

### Token Structure

```javascript
{
    id: "user_id",
    email: "user@example.com",
    type: "consumer|farmer|admin",
    customPermissions: [],
    iat: 1234567890,
    exp: 1234654290,
    issuer: "agridesk",
    audience: "agridesk-app"
}
```

---

## Authorization Middleware

### File: `middleware/authorize.middleware.js`

Implements role-based access control (RBAC) and attribute-based access control (ABAC).

### Exports

```javascript
const authorize = require('./middleware/authorize.middleware');

// Role & Permission constants
authorize.ROLES                  // { CONSUMER, FARMER, ADMIN, SUPER_ADMIN }
authorize.PERMISSIONS           // All available permissions

// Permission checking
authorize.requirePermission(perm)           // Single permission
authorize.requireAnyPermission(perms)       // Any of permissions
authorize.requireAllPermissions(perms)      // All permissions

// Resource access
authorize.checkResourceOwnership(field)     // Verify ownership
authorize.checkResourceStatus(statuses)     // Status-based access

// Quotas
authorize.checkQuota(key, limit, window)    // Rate limiting/quotas

// Utilities
authorize.hasPermission(user, perm)         // Check permission
authorize.getUserPermissions(user)          // Get all permissions
```

### Built-in Permissions

```javascript
// Consumer
CONSUMER_VIEW_PRODUCTS
CONSUMER_PURCHASE
CONSUMER_VIEW_ORDERS
CONSUMER_SUBMIT_REVIEW
CONSUMER_MANAGE_PROFILE
CONSUMER_VIEW_CART

// Farmer
FARMER_MANAGE_PRODUCTS
FARMER_VIEW_ORDERS
FARMER_MANAGE_PROFILE
FARMER_VIEW_ANALYTICS
FARMER_RESPOND_REVIEW

// Admin
ADMIN_MANAGE_USERS
ADMIN_MODERATE_REVIEWS
ADMIN_VIEW_ANALYTICS
ADMIN_MANAGE_PRODUCTS
ADMIN_MANAGE_ORDERS

// Super Admin
SUPER_ADMIN_ALL
```

### Usage Examples

#### Permission-Based Access

```javascript
const { PERMISSIONS, requirePermission } = require('../middleware/authorize.middleware');

// Single permission
router.put('/products/:id', 
    requireAuth,
    requireFarmer,
    requirePermission(PERMISSIONS.FARMER_MANAGE_PRODUCTS),
    updateProduct
);

// Any permission
router.get('/analytics', 
    requireAuth,
    requireAnyPermission([
        PERMISSIONS.FARMER_VIEW_ANALYTICS,
        PERMISSIONS.ADMIN_VIEW_ANALYTICS
    ]),
    viewAnalytics
);

// All permissions
router.post('/sensitive-action',
    requireAuth,
    requireAdmin,
    requireAllPermissions([
        PERMISSIONS.ADMIN_MANAGE_USERS,
        PERMISSIONS.ADMIN_MANAGE_PRODUCTS
    ]),
    sensitiveAction
);
```

#### Resource Ownership

```javascript
// Field name defaults to 'userId'
router.delete('/reviews/:reviewId',
    requireAuth,
    checkResourceOwnership('reviewId'),  // Uses userId from route params
    deleteReview
);

// Custom field names
router.put('/products/:producerId',
    requireAuth,
    checkResourceOwnership('producerId'),
    updateProduct
);
```

#### Rate Limiting

```javascript
// 100 API calls per hour
router.get('/api/data',
    requireAuth,
    checkQuota('api_calls', 100, 3600),
    getData
);

// 5 reviews per day
router.post('/reviews',
    requireAuth,
    checkQuota('reviews_per_day', 5, 86400),
    submitReview
);
```

#### Audit Logging

```javascript
const { auditLog } = require('../middleware/authorize.middleware');

router.post('/users/:id/delete',
    requireAuth,
    requireAdmin,
    auditLog('DELETE_USER', 'user'),
    deleteUser
);
```

---

## Error Handler Middleware

### File: `middleware/errorHandler.middleware.js`

Centralized error handling with comprehensive error mapping.

### Error Classes

```javascript
const {
    AppError,                  // Base error class
    ValidationError,           // 400 errors
    AuthenticationError,       // 401 errors
    AuthorizationError,        // 403 errors
    NotFoundError,             // 404 errors
    ConflictError,             // 409 errors (duplicates)
    RateLimitError,            // 429 errors
    catchAsync                 // Async error wrapper
} = require('../middleware/errorHandler.middleware');
```

### Error Response Helpers

```javascript
const {
    validationError,           // Throw 400
    notFound,                  // Throw 404
    conflict,                  // Throw 409
    unauthorized,              // Throw 401
    forbidden,                 // Throw 403
    rateLimited,               // Throw 429
    serverError                // Throw 500
} = require('../middleware/errorHandler.middleware');
```

### Usage Examples

#### In Routes

```javascript
const { catchAsync, notFound, validationError } = require('../middleware/errorHandler.middleware');
const { requireAuth } = require('../middleware/auth.middleware');

// Async error handling
router.get('/products/:id', catchAsync(async (req, res) => {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
        notFound('Product');
    }
    
    res.json({ success: true, data: product });
}));

// Validation error
router.post('/reviews', catchAsync(async (req, res) => {
    if (!req.body.rating || req.body.rating < 1 || req.body.rating > 5) {
        validationError('Rating must be 1-5', 'rating');
    }
    
    // Continue...
}));

// Conflict
router.post('/users', catchAsync(async (req, res) => {
    const existing = await User.findOne({ email: req.body.email });
    
    if (existing) {
        conflict('Email already registered');
    }
    
    // Continue...
}));
```

#### Custom Error Handling

```javascript
router.post('/payment', catchAsync(async (req, res) => {
    try {
        await processPayment(req.body);
    } catch (error) {
        if (error.code === 'INSUFFICIENT_FUNDS') {
            throw new AppError('Insufficient balance', 402, 'PAYMENT_FAILED');
        }
        throw error;
    }
}));
```

### App Setup

```javascript
const express = require('express');
const { 
    errorHandler, 
    notFoundHandler, 
    requestIdMiddleware,
    healthCheck 
} = require('./middleware/errorHandler.middleware');

const app = express();

// Add request ID to all requests
app.use(requestIdMiddleware);

// Health check endpoint
app.get('/health', healthCheck);

// Your routes
app.use('/api', require('./routes'));

// 404 fallback
app.use(notFoundHandler);

// Error handler (MUST be last)
app.use(errorHandler);
```

### Error Response Format

```javascript
{
    success: false,
    message: "Error description",
    code: "ERROR_CODE",
    timestamp: "2024-04-13T10:30:00.000Z",
    requestId: "1712992200000-abc123def",
    
    // Only in development
    stack: "Error stack trace...",
    
    // For validation errors
    field: "fieldName",
    errors: {
        email: "Invalid email format",
        password: "Password too short"
    },
    
    // For rate limit errors
    retryAfter: 60
}
```

---

## Validation Middleware

### File: `middleware/validation.middleware.js`

Request validation, sanitization, and XSS/SQL injection prevention.

### Validation Rules

```javascript
const { ValidationRules } = require('../middleware/validation.middleware');

// Static validation methods
ValidationRules.string(value, { min, max, pattern, required })
ValidationRules.number(value, { min, max, integer, required })
ValidationRules.email(value, { required })
ValidationRules.phone(value, { required, minLength, maxLength })
ValidationRules.array(value, { minLength, maxLength, required })
ValidationRules.enum(value, allowedValues, { required })
ValidationRules.date(value, { required, minDate, maxDate })
ValidationRules.boolean(value, { required })
ValidationRules.objectId(value, { required })
```

### Usage Examples

#### Body Validation

```javascript
const { validateBody, ValidationRules } = require('../middleware/validation.middleware');

const reviewSchema = {
    rating: (val) => ValidationRules.number(val, { min: 1, max: 5, integer: true }),
    comment: (val) => ValidationRules.string(val, { min: 10, max: 1000 }),
    tags: (val) => ValidationRules.array(val, { minLength: 1, maxLength: 5 }),
    email: (val) => ValidationRules.email(val)
};

router.post('/reviews',
    requireAuth,
    validateBody(reviewSchema),
    submitReview
);
```

#### Query Validation

```javascript
const { validateQuery, ValidationRules } = require('../middleware/validation.middleware');

const listSchema = {
    page: (val) => ValidationRules.number(val, { min: 1, required: false }),
    limit: (val) => ValidationRules.number(val, { min: 1, max: 100, required: false }),
    status: (val) => ValidationRules.enum(val, ['active', 'inactive'], { required: false })
};

router.get('/products',
    validateQuery(listSchema),
    listProducts
);
```

#### Params Validation

```javascript
const { validateParams, ValidationRules } = require('../middleware/validation.middleware');

const paramSchema = {
    id: (val) => ValidationRules.objectId(val)
};

router.get('/users/:id',
    validateParams(paramSchema),
    getUser
);
```

#### Pagination

```javascript
const { validatePagination } = require('../middleware/validation.middleware');

router.get('/reviews',
    validatePagination,
    (req, res) => {
        const { page, limit, skip } = req.pagination;
        // Use skip/limit in query
    }
);
```

#### Sanitization

```javascript
const { sanitizeRequestBody, validateContentType } = require('../middleware/validation.middleware');

router.use(validateContentType(['application/json']));
router.use(sanitizeRequestBody);
```

#### SQL Injection Prevention

```javascript
const { preventSqlInjection } = require('../middleware/validation.middleware');

router.use(preventSqlInjection);
```

### Sanitization Functions

```javascript
const {
    sanitizeString,    // XSS prevention
    sanitizeEmail,     // Email validation + lowercase
    sanitizePhone,     // Phone normalization
    sanitizeUrl,       // URL validation
    sanitizeObject     // Recursive sanitization
} = require('../middleware/validation.middleware');

// Example
const email = sanitizeEmail(req.body.email);  // Throws if invalid
const phone = sanitizePhone(req.body.phone);  // Normalizes
```

---

## Integration Guide

### Step 1: Setup Error Handler

```javascript
// app.js or server.js
const express = require('express');
const { errorHandler, notFoundHandler, requestIdMiddleware } = require('./middleware/errorHandler.middleware');

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request tracking
app.use(requestIdMiddleware);

// Your routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/products', require('./routes/product.routes'));
app.use('/api/orders', require('./routes/order.routes'));

// 404 handler (after routes)
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
```

### Step 2: Setup Authentication

```javascript
// routes/auth.routes.js
const router = require('express').Router();
const { verifyToken, requireAuth } = require('../middleware/auth.middleware');
const authController = require('../controllers/auth.controller');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/refresh', authController.refreshToken);
router.post('/logout', requireAuth, authController.logout);

module.exports = router;
```

### Step 3: Protect Routes

```javascript
// routes/consumer.routes.js
const router = require('express').Router();
const { requireAuth, requireConsumer } = require('../middleware/auth.middleware');
const { requirePermission, PERMISSIONS } = require('../middleware/authorize.middleware');
const { validateBody, ValidationRules } = require('../middleware/validation.middleware');

// All routes require auth + consumer role
router.use(requireAuth, requireConsumer);

// Purchase product
const purchaseSchema = {
    productId: (v) => ValidationRules.objectId(v),
    quantity: (v) => ValidationRules.number(v, { min: 1, integer: true }),
    address: (v) => ValidationRules.string(v, { min: 10, max: 500 })
};

router.post('/purchase',
    validateBody(purchaseSchema),
    requirePermission(PERMISSIONS.CONSUMER_PURCHASE),
    purchaseProduct
);

module.exports = router;
```

### Step 4: Middleware Order

```javascript
// CORRECT ORDER
app.use(express.json());                    // 1. Parse JSON
app.use(requestIdMiddleware);               // 2. Request tracking
app.use(preventSqlInjection);               // 3. Security
app.use(sanitizeRequestBody);               // 4. Sanitize

// Authentication
app.use('/api', verifyToken);               // 5. Auth token

// Routes with auth/authz
app.use('/api/auth', authRoutes);
app.use('/api/consumer', consumerRoutes);
app.use('/api/farmer', farmerRoutes);
app.use('/api/admin', adminRoutes);

// 404 & Error
app.use(notFoundHandler);                   // 6. 404
app.use(errorHandler);                      // 7. Errors (LAST)
```

---

## Usage Examples

### Example 1: Consumer Purchase Flow

```javascript
const router = require('express').Router();
const { requireAuth, requireConsumer } = require('../middleware/auth.middleware');
const { requirePermission, PERMISSIONS, checkQuota } = require('../middleware/authorize.middleware');
const { validateBody, ValidationRules } = require('../middleware/validation.middleware');
const { catchAsync } = require('../middleware/errorHandler.middleware');

const schema = {
    productId: (v) => ValidationRules.objectId(v),
    quantity: (v) => ValidationRules.number(v, { min: 1, integer: true }),
    shippingAddress: (v) => ValidationRules.string(v, { min: 10, max: 500 })
};

router.post('/purchase',
    requireAuth,
    requireConsumer,
    validateBody(schema),
    requirePermission(PERMISSIONS.CONSUMER_PURCHASE),
    checkQuota('purchases_per_day', 50, 86400),
    catchAsync(async (req, res) => {
        const order = await Order.create({
            consumerId: req.user.id,
            productId: req.body.productId,
            quantity: req.body.quantity,
            shippingAddress: req.body.shippingAddress
        });
        
        res.json({
            success: true,
            message: 'Purchase successful',
            data: { order }
        });
    })
);

module.exports = router;
```

### Example 2: Admin Moderation

```javascript
const { requireAuth, requireAdmin } = require('../middleware/auth.middleware');
const { requirePermission, PERMISSIONS, auditLog } = require('../middleware/authorize.middleware');
const { validateBody, ValidationRules } = require('../middleware/validation.middleware');
const { catchAsync } = require('../middleware/errorHandler.middleware');

const schema = {
    reviewId: (v) => ValidationRules.objectId(v),
    action: (v) => ValidationRules.enum(v, ['approve', 'reject', 'flag']),
    reason: (v) => ValidationRules.string(v, { max: 500, required: false })
};

router.post('/moderate-review',
    requireAuth,
    requireAdmin,
    validateBody(schema),
    requirePermission(PERMISSIONS.ADMIN_MODERATE_REVIEWS),
    auditLog('MODERATE_REVIEW', 'review'),
    catchAsync(async (req, res) => {
        const review = await Review.findByIdAndUpdate(
            req.body.reviewId,
            {
                status: req.body.action === 'approve' ? 'approved' : 'rejected',
                moderationReason: req.body.reason,
                moderatedBy: req.user.id,
                moderatedAt: new Date()
            }
        );
        
        res.json({
            success: true,
            message: 'Review moderated',
            data: { review }
        });
    })
);
```

### Example 3: Rate Limited API

```javascript
const { validatePagination, validationError } = require('../middleware/validation.middleware');
const { checkQuota } = require('../middleware/authorize.middleware');
const { catchAsync } = require('../middleware/errorHandler.middleware');

router.get('/analytics',
    requireAuth,
    requireFarmer,
    validatePagination,
    checkQuota('analytics_requests', 100, 3600),  // 100/hour
    catchAsync(async (req, res) => {
        const { page, limit, skip } = req.pagination;
        
        const analytics = await Analytics.find({ farmerId: req.user.id })
            .skip(skip)
            .limit(limit);
        
        res.json({
            success: true,
            data: { analytics },
            pagination: { page, limit }
        });
    })
);
```

---

## Production Checklist

- [ ] JWT_SECRET set in .env (strong random value)
- [ ] JWT_EXPIRY set (recommended: 7d)
- [ ] Error handler middleware is last in chain
- [ ] SQL injection prevention enabled
- [ ] XSS sanitization enabled
- [ ] All sensitive operations have audit logging
- [ ] Rate limiting configured for public endpoints
- [ ] HTTPS enabled in production
- [ ] CORS configured appropriately
- [ ] Request size limits set
- [ ] Database connection pooling configured
- [ ] Logging system in place
- [ ] Monitoring alerts configured

---

## File Statistics

| File | Lines | Purpose |
|------|-------|---------|
| auth.middleware.js | 400+ | JWT authentication & role-based access |
| authorize.middleware.js | 350+ | Permission checking & ABAC |
| errorHandler.middleware.js | 400+ | Error handling & response formatting |
| validation.middleware.js | 500+ | Input validation & sanitization |
| **Total** | **1,650+** | Production middleware system |

---

## Support & Troubleshooting

### Issues

- **Token not verifying**: Check JWT_SECRET matches
- **Authorization failing**: Verify user role in token
- **Validation errors**: Check field names match schema
- **Sanitization removing content**: May be too strict, adjust patterns

### Performance Tips

- Use `verifyTokenOptional` for public routes
- Cache permission calculations in Redis
- Use database indices for ownership checks
- Set appropriate rate limit windows
- Enable response caching where possible

