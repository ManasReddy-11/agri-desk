import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';
import { hasPermission, hasAnyRole } from '../utils/rbac.js';

/**
 * Verify JWT Token Middleware
 * Protects routes that require authentication
 */
export const verifyToken = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new AppError('No token provided', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'agri-desk',
      audience: 'agri-desk-api',
    });

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Token expired', 401);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid token', 401);
    }
    throw new AppError('Authentication failed', 401);
  }
};

/**
 * Role-based Access Control
 * Restrict routes to specific user roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (!hasAnyRole(req.user.role, roles)) {
      throw new AppError(
        `Not authorized. Required roles: ${roles.join(', ')}`,
        403
      );
    }

    next();
  };
};

/**
 * Permission-based Access Control
 * Restrict routes to users with specific permissions
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (!hasPermission(req.user.role, permission)) {
      throw new AppError(
        `Permission denied. Required permission: ${permission}`,
        403
      );
    }

    next();
  };
};

/**
 * Optional Authentication
 * Attaches user if token exists, doesn't fail if missing
 */
export const optionalAuth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'agri-desk',
        audience: 'agri-desk-api',
      });
      req.user = decoded;
    }

    next();
  } catch (error) {
    // Token invalid but optional, so continue anyway
    next();
  }
};

/**
 * Admin Only Middleware
 * Shortcut for admin verification
 */
export const isAdmin = (req, res, next) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  if (req.user.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  next();
};

/**
 * Farmer Only Middleware
 * Shortcut for farmer verification
 */
export const isFarmer = (req, res, next) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  if (req.user.role !== 'farmer') {
    throw new AppError('Farmer access required', 403);
  }

  next();
};

/**
 * Consumer Only Middleware
 * Shortcut for consumer verification
 */
export const isConsumer = (req, res, next) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  if (req.user.role !== 'consumer') {
    throw new AppError('Consumer access required', 403);
  }

  next();
};

export default verifyToken;
