import { AppError } from './errorHandler.js';

/**
 * Role-Based Access Control (RBAC) Middleware
 * Defines permission levels for different roles
 */

/**
 * Role Hierarchy
 * Higher level has access to lower level permissions
 */
const ROLE_HIERARCHY = {
  admin: 3,
  farmer: 2,
  consumer: 1,
};

/**
 * Permission Matrix
 * Define what each role can do
 */
export const PERMISSIONS = {
  // User permissions
  'user:read': ['admin', 'farmer', 'consumer'],
  'user:update:own': ['admin', 'farmer', 'consumer'],
  'user:update:any': ['admin'],
  'user:delete:own': ['admin', 'farmer', 'consumer'],
  'user:delete:any': ['admin'],
  'user:view:profiles': ['admin', 'farmer', 'consumer'],

  // Product permissions
  'product:create': ['admin', 'farmer'],
  'product:read': ['admin', 'farmer', 'consumer'],
  'product:update:own': ['admin', 'farmer'],
  'product:update:any': ['admin'],
  'product:delete:own': ['admin', 'farmer'],
  'product:delete:any': ['admin'],

  // Order permissions
  'order:create': ['admin', 'farmer', 'consumer'],
  'order:read:own': ['admin', 'farmer', 'consumer'],
  'order:read:any': ['admin', 'farmer'],
  'order:update:own': ['admin', 'consumer'],
  'order:update:any': ['admin'],
  'order:cancel:own': ['admin', 'farmer', 'consumer'],

  // Admin permissions
  'admin:access': ['admin'],
  'admin:users': ['admin'],
  'admin:products': ['admin'],
  'admin:orders': ['admin'],
  'admin:analytics': ['admin'],
};

/**
 * Check if user has required role
 */
export const hasRole = (userRole, requiredRole) => {
  return userRole === requiredRole;
};

/**
 * Check if user has any of the required roles
 */
export const hasAnyRole = (userRole, requiredRoles) => {
  return requiredRoles.includes(userRole);
};

/**
 * Check if user has permission
 */
export const hasPermission = (userRole, permission) => {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) {
    throw new AppError('Permission not defined', 500);
  }
  return allowedRoles.includes(userRole);
};

/**
 * Get role level (higher number = more permissions)
 */
export const getRoleLevel = (role) => {
  return ROLE_HIERARCHY[role] || 0;
};

/**
 * Check if user role is higher than another role
 */
export const isRoleHigherThan = (userRole, comparedRole) => {
  return getRoleLevel(userRole) > getRoleLevel(comparedRole);
};

/**
 * Check if user role is higher or equal to another role
 */
export const isRoleHigherOrEqual = (userRole, comparedRole) => {
  return getRoleLevel(userRole) >= getRoleLevel(comparedRole);
};

/**
 * Get all permissions for a role
 */
export const getRolePermissions = (role) => {
  return Object.entries(PERMISSIONS)
    .filter(([, roles]) => roles.includes(role))
    .map(([permission]) => permission);
};

export default {
  ROLE_HIERARCHY,
  PERMISSIONS,
  hasRole,
  hasAnyRole,
  hasPermission,
  getRoleLevel,
  isRoleHigherThan,
  isRoleHigherOrEqual,
  getRolePermissions,
};
