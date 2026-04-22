import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwtUtils.js';
import { comparePassword } from '../utils/passwordUtils.js';

/**
 * Authentication Service
 * Handles user registration, login, token generation, etc.
 */

class AuthService {
  /**
   * Register new user
   */
  async register(userData) {
    try {
      const { email, password, name, role, phone } = userData;
      const normalizedEmail = email?.trim().toLowerCase();

      // Check if user already exists
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        throw new AppError('User with this email already exists', 409);
      }

      // Create new user
      const user = await User.create({
        email: normalizedEmail,
        password,
        name,
        role,
        phone,
      });

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      return {
        user: user.getPublicProfile(),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(email, password) {
    try {
      // Validate input
      if (!email || !password) {
        throw new AppError('Please provide email and password', 400);
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Find user and include password field
      const user = await User.findOne({ email: normalizedEmail }).select('+password');
      if (!user) {
        throw new AppError('Invalid email or password', 401);
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw new AppError('Invalid email or password', 401);
      }

      // Check if account is active
      if (!user.isActive) {
        throw new AppError('Account is inactive', 403);
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens using utility functions
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      return {
        user: user.getPublicProfile(),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Refresh Access Token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, {
        issuer: 'agri-desk',
      });

      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        throw new AppError('User not found or inactive', 401);
      }

      const newAccessToken = generateAccessToken(user);
      return newAccessToken;
    } catch (error) {
      throw new AppError('Failed to refresh token', 401);
    }
  }

  /**
   * Verify user email
   */
  async verifyEmail(verificationToken) {
    try {
      const user = await User.findOne({
        verificationToken,
        verificationTokenExpire: { $gt: Date.now() },
      });

      if (!user) {
        throw new AppError('Invalid or expired verification token', 400);
      }

      user.isVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpire = undefined;

      await user.save();
      return user.getPublicProfile();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Generate reset token (in real app, send via email)
      const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: '1h',
      });

      user.resetPasswordToken = resetToken;
      user.resetPasswordTokenExpire = new Date(Date.now() + 3600000); // 1 hour
      await user.save();

      return resetToken;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(resetToken, newPassword) {
    try {
      const user = await User.findOne({
        resetPasswordToken: resetToken,
        resetPasswordTokenExpire: { $gt: Date.now() },
      });

      if (!user) {
        throw new AppError('Invalid or expired reset token', 400);
      }

      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordTokenExpire = undefined;

      await user.save();
      return user.getPublicProfile();
    } catch (error) {
      throw error;
    }
  }
}

export default new AuthService();
