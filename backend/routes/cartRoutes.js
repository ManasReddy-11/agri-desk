import express from 'express';
import {
  // Basic cart operations
  getCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,

  // Cart summary and details
  getCartSummary,
  getCartGroupedByFarmer,

  // Shipping and coupons
  updateShippingCost,
  applyCoupon,
  removeCoupon,

  // Validation
  validateCartItems,

  // Admin
  getCartByConsumer,
} from '../controllers/cartController.js';
import { verifyToken, authorize, isConsumer } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

/**
 * ═══════════════════════════════════════════════════════════════
 * CONSUMER CART OPERATIONS (Protected - Requires Authentication)
 * ═══════════════════════════════════════════════════════════════
 */

// Get consumer's cart
router.get('/', verifyToken, isConsumer, getCart);

// Get cart summary
router.get('/summary', verifyToken, isConsumer, getCartSummary);

// Get cart grouped by farmer (for checkout)
router.get('/grouped', verifyToken, isConsumer, getCartGroupedByFarmer);

// Validate cart items (check availability)
router.get('/validation', verifyToken, isConsumer, validateCartItems);

// Add item to cart
router.post('/', verifyToken, isConsumer, addToCart);

// Update cart item quantity
router.patch('/item/quantity', verifyToken, isConsumer, updateCartQuantity);

// Remove item from cart
router.delete('/item', verifyToken, isConsumer, removeFromCart);

// Clear entire cart
router.delete('/', verifyToken, isConsumer, clearCart);

// Update shipping cost
router.patch('/shipping', verifyToken, isConsumer, updateShippingCost);

// Apply coupon code
router.post('/coupon', verifyToken, isConsumer, applyCoupon);

// Remove coupon code
router.delete('/coupon', verifyToken, isConsumer, removeCoupon);

/**
 * ═══════════════════════════════════════════════════════════════
 * ADMIN OPERATIONS
 * ═══════════════════════════════════════════════════════════════
 */

// Get specific consumer's cart (Admin only)
router.get('/:consumerId', verifyToken, authorize('admin'), getCartByConsumer);

export default router;
