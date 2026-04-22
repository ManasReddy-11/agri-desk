/**
 * EXAMPLE ROUTES - Showing proper usage of authentication
 * Copy these patterns to your route files
 */

import express from 'express';
import * as exampleController from '../controllers/exampleController.js';
import {
  verifyToken,
  authorize,
  requirePermission,
  isAdmin,
  isFarmer,
  isConsumer,
  optionalAuth,
} from '../middleware/auth.js';
import handleValidationErrors from '../middleware/validation.js';

const router = express.Router();

/**
 * ═══════════════════════════════════════════════════════════════
 * CONSUMER ROUTES (Any authenticated user)
 * ═══════════════════════════════════════════════════════════════
 */

// View own profile
router.get('/profile/me', verifyToken, exampleController.getOwnProfile);

// Update own profile
router.put('/profile/me', verifyToken, exampleController.updateOwnProfile);

// Browse products (optional auth for logged-in users)
router.get('/products', optionalAuth, exampleController.getProducts);

// Create order
router.post('/orders', verifyToken, isConsumer, exampleController.createOrder);

// View own orders
router.get('/orders/me', verifyToken, isConsumer, exampleController.getMyOrders);

// View order details
router.get('/orders/:id', verifyToken, isConsumer, exampleController.getOrder);

/**
 * ═══════════════════════════════════════════════════════════════
 * FARMER ROUTES (Farmer & Admin)
 * ═══════════════════════════════════════════════════════════════
 */

// Create product (Farmer only)
router.post(
  '/products',
  verifyToken,
  isFarmer, // or: authorize('farmer', 'admin')
  exampleController.createProduct
);

// Update own products
router.put(
  '/products/:id',
  verifyToken,
  authorize('farmer', 'admin'),
  exampleController.updateProduct
);

// Delete own products
router.delete(
  '/products/:id',
  verifyToken,
  authorize('farmer', 'admin'),
  exampleController.deleteProduct
);

// View orders for own products
router.get(
  '/orders/for-my-products',
  verifyToken,
  isFarmer,
  exampleController.getOrdersForMyProducts
);

// View farmer profile (public)
router.get(
  '/farmers/:farmerId',
  exampleController.getFarmerProfile
);

/**
 * ═══════════════════════════════════════════════════════════════
 * ADMIN ROUTES (Admin only)
 * ═══════════════════════════════════════════════════════════════
 */

// Admin dashboard
router.get(
  '/admin/dashboard',
  verifyToken,
  isAdmin,
  exampleController.getAdminDashboard
);

// View all users
router.get(
  '/admin/users',
  verifyToken,
  requirePermission('admin:users'),
  exampleController.getAllUsers
);

// View all products
router.get(
  '/admin/products',
  verifyToken,
  authorize('admin'),
  exampleController.getAllProducts
);

// View all orders
router.get(
  '/admin/orders',
  verifyToken,
  isAdmin,
  exampleController.getAllOrders
);

// Manage user accounts
router.put(
  '/admin/users/:userId',
  verifyToken,
  isAdmin,
  exampleController.updateUser
);

router.delete(
  '/admin/users/:userId',
  verifyToken,
  isAdmin,
  exampleController.deleteUser
);

// Manage products
router.put(
  '/admin/products/:productId/approve',
  verifyToken,
  isAdmin,
  exampleController.approveProduct
);

router.delete(
  '/admin/products/:productId',
  verifyToken,
  isAdmin,
  exampleController.deleteProductAdmin
);

/**
 * ═══════════════════════════════════════════════════════════════
 * MULTI-ROLE ROUTES
 * ═══════════════════════════════════════════════════════════════
 */

// Can be accessed by farmer or admin
router.get(
  '/analytics',
  verifyToken,
  authorize('farmer', 'admin'),
  exampleController.getAnalytics
);

// Can be accessed by any authenticated user
router.post(
  '/reviews',
  verifyToken,
  exampleController.submitReview
);

// Can be accessed by any role but requires permission
router.get(
  '/reports',
  verifyToken,
  requirePermission('user:read'),
  exampleController.getReports
);

export default router;

/**
 * ═══════════════════════════════════════════════════════════════
 * MIDDLEWARE USAGE PATTERNS
 * ═══════════════════════════════════════════════════════════════

1. ANY AUTHENTICATED USER
   ─────────────────────
   router.get('/route', verifyToken, controller.handler);
   
   ✓ Requires valid JWT
   ✓ Works for all roles (consumer, farmer, admin)

2. SPECIFIC ROLE (FARMER ONLY)
   ──────────────────────────
   router.get('/route', verifyToken, isFarmer, controller.handler);
   
   ✓ Returns 403 if not farmer
   ✓ Only farmers + content

3. MULTIPLE ROLES
   ──────────────
   router.get('/route', verifyToken, authorize('farmer', 'admin'), controller.handler);
   
   ✓ Returns 403 if not farmer or admin
   ✓ Consumer cannot access

4. PERMISSION-BASED
   ────────────────
   router.get('/route', verifyToken, requirePermission('admin:access'), controller.handler);
   
   ✓ Returns 403 if permission denied
   ✓ Checks RBAC permission matrix

5. OPTIONAL AUTHENTICATION
   ──────────────────────
   router.get('/route', optionalAuth, controller.handler);
   
   ✓ Attaches user if valid token
   ✓ Doesn't fail if no token
   ✓ Useful for public routes where login is optional

═════════════════════════════════════════════════════════════════════

SHORTCUT MIDDLEWARE:
  isAdmin       → Only admin role
  isFarmer      → Only farmer role
  isConsumer    → Only consumer role
  verifyToken   → Any authenticated user
  optionalAuth  → Optional authentication

FLEXIBLE MIDDLEWARE:
  authorize(...roles)           → Multiple specific roles
  requirePermission(permission) → Permission-based access

═════════════════════════════════════════════════════════════════════
*/
