import express from 'express';
import {
  // Consumer endpoints
  getAllProducts,
  getProduct,
  searchProducts,
  filterByPrice,
  filterByLocation,
  getByCategory,
  getBestSellers,
  getOrganicProducts,
  getFarmerProfile,
  getWishlist,
  toggleWishlist,

  // Farmer endpoints
  createProduct,
  updateProduct,
  updateQuantity,
  deleteProduct,
  toggleProductStatus,
  getFarmerProducts,
} from '../controllers/productController.js';
import { verifyToken, isFarmer, authorize } from '../middleware/auth.js';
import handleValidationErrors from '../middleware/validation.js';
import { productValidators, paginationValidators } from '../utils/validators.js';

const router = express.Router();

/**
 * ═══════════════════════════════════════════════════════════════
 * CONSUMER ROUTES - Public/Read-only
 * ═══════════════════════════════════════════════════════════════
 */

// Browse all products with filters
router.get('/', paginationValidators, handleValidationErrors, getAllProducts);

// Search products by name/description
router.post('/search', searchProducts);

// Filter products by price range
router.get('/filter/price', filterByPrice);

// Filter products by location
router.get('/filter/location', filterByLocation);

// Get products by category
router.get('/category/:category', getByCategory);

// Get best selling products
router.get('/bestsellers', getBestSellers);

// Get organic/certified products
router.get('/organic/certified', getOrganicProducts);

// Get specific farmer's profile and products
router.get('/farmer/:farmerId', getFarmerProfile);

/**
 * ═══════════════════════════════════════════════════════════════
 * CONSUMER WISHLIST/FAVORITES ROUTES - Protected
 * ═══════════════════════════════════════════════════════════════
 */

// Get user's wishlist/favorites
router.get('/favorites', verifyToken, getWishlist);

// Toggle product in favorites
router.post('/:productId/favorites', verifyToken, toggleWishlist);
router.delete('/:productId/favorites', verifyToken, toggleWishlist);

// Get single product (must come after concrete routes like /favorites)
router.get('/:id', getProduct);

/**
 * ═══════════════════════════════════════════════════════════════
 * FARMER ROUTES - Protected (Requires Authentication + Farmer Role)
 * ═══════════════════════════════════════════════════════════════
 */

// Create new product (Farmer only)
router.post(
  '/',
  verifyToken,
  authorize('farmer'),
  productValidators.create,
  handleValidationErrors,
  createProduct
);

// Get logged-in farmer's products
router.get('/my/products', verifyToken, authorize('farmer'), getFarmerProducts);

// Update product details (Farmer only)
router.put(
  '/:id',
  verifyToken,
  authorize('farmer'),
  productValidators.update,
  handleValidationErrors,
  updateProduct
);

// Update product quantity (Farmer only - for restocking)
router.patch('/:id/quantity', verifyToken, authorize('farmer'), updateQuantity);

// Toggle product active/inactive status (Farmer only)
router.patch('/:id/status', verifyToken, authorize('farmer'), toggleProductStatus);

// Delete product (Farmer only - soft delete)
router.delete('/:id', verifyToken, authorize('farmer'), deleteProduct);

export default router;
