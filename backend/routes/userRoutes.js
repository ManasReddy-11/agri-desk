import express from 'express';
import * as userController from '../controllers/userController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * User Routes
 */

// Get user profile
router.get('/profile/:id', userController.getUserProfile);

// Update user profile
router.put('/profile', verifyToken, userController.updateProfile);

// Get farmer details
router.get('/farmer/:id', userController.getFarmerDetails);

export default router;
