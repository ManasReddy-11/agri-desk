import express from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/authController.js';
import handleValidationErrors from '../middleware/validation.js';
import { verifyToken } from '../middleware/auth.js';
import { authValidators } from '../utils/validators.js';

const router = express.Router();

/**
 * Authentication Routes
 */

// Register
router.post('/register', authValidators.register, handleValidationErrors, authController.register);

// Login
router.post('/login', authValidators.login, handleValidationErrors, authController.login);

// Logout
router.post('/logout', authController.logout);

// Refresh Token
router.post('/refresh-token', authController.refreshToken);

// Verify Email
router.post('/verify-email', authController.verifyEmail);

// Request Password Reset
router.post(
  '/request-password-reset',
  body('email').isEmail().normalizeEmail(),
  handleValidationErrors,
  authController.requestPasswordReset
);

// Reset Password
router.post(
  '/reset-password',
  body('token').notEmpty(),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  handleValidationErrors,
  authController.resetPassword
);

// Get Current User (Protected)
router.get('/me', verifyToken, authController.getCurrentUser);

export default router;
