import bcryptjs from 'bcryptjs';

/**
 * Password Hashing Utilities
 * Handles password hashing and comparison with bcrypt
 */

const SALT_ROUNDS = 10;

/**
 * Hash Password
 * Generates a bcrypt hash of the password
 */
export const hashPassword = async (password) => {
  try {
    const salt = await bcryptjs.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcryptjs.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    throw new Error(`Password hashing failed: ${error.message}`);
  }
};

/**
 * Compare Password
 * Compares plain password with hashed password
 */
export const comparePassword = async (plainPassword, hashedPassword) => {
  try {
    const isMatch = await bcryptjs.compare(plainPassword, hashedPassword);
    return isMatch;
  } catch (error) {
    throw new Error(`Password comparison failed: ${error.message}`);
  }
};

/**
 * Validate Password Strength
 * Checks if password meets security requirements
 * Requirements:
 *   - Minimum 8 characters
 *   - At least one uppercase letter
 *   - At least one lowercase letter
 *   - At least one number
 *   - At least one special character
 */
export const validatePasswordStrength = (password) => {
  const requirements = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const passed = Object.values(requirements).filter((req) => req).length;
  const total = Object.keys(requirements).length;

  return {
    isStrong: passed === total,
    requirements,
    score: (passed / total) * 100,
  };
};

export default {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
};
