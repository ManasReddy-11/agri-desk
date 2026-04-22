import express from 'express';
import { verifyToken, isAdmin } from '../middleware/auth.js';
import {
  approveProduct,
  banUser,
  deleteUser,
  getAllOrders,
  getAllProducts,
  getAllUsers,
  getDashboardOverview,
  getPlatformAnalytics,
  getSuspiciousOrders,
  getSystemHealth,
  getUserDetails,
  rejectProduct,
  removeProduct,
  resetUserPassword,
  resolveOrderDispute,
  suspendProduct,
} from '../controllers/adminController.js';

const router = express.Router();

router.use(verifyToken, isAdmin);

router.get('/users', getAllUsers);
router.get('/users/:userId', getUserDetails);
router.delete('/users/:userId', deleteUser);
router.post('/users/:userId/ban', banUser);
router.post('/users/:userId/reset-password', resetUserPassword);

router.get('/products', getAllProducts);
router.post('/products/:productId/approve', approveProduct);
router.post('/products/:productId/reject', rejectProduct);
router.delete('/products/:productId', removeProduct);
router.post('/products/:productId/suspend', suspendProduct);

router.get('/orders', getAllOrders);
router.get('/orders/suspicious', getSuspiciousOrders);
router.post('/orders/:orderId/resolve', resolveOrderDispute);

router.get('/analytics', getPlatformAnalytics);
router.get('/dashboard', getDashboardOverview);
router.get('/health', getSystemHealth);

export default router;
