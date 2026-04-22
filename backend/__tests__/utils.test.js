import {
  hasRole,
  hasAnyRole,
  hasPermission,
  getRoleLevel,
} from '../utils/rbac.js';
import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
} from '../utils/passwordUtils.js';
import {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwtUtils.js';

describe('RBAC utils', () => {
  test('checks role and permission helpers', () => {
    expect(hasRole('admin', 'admin')).toBe(true);
    expect(hasAnyRole('farmer', ['admin', 'farmer'])).toBe(true);
    expect(hasPermission('consumer', 'product:read')).toBe(true);
    expect(getRoleLevel('admin')).toBeGreaterThan(getRoleLevel('consumer'));
  });
});

describe('Password utils', () => {
  test('hashes and compares password', async () => {
    const plain = 'Password123!';
    const hashed = await hashPassword(plain);

    expect(hashed).not.toBe(plain);
    await expect(comparePassword(plain, hashed)).resolves.toBe(true);
    await expect(comparePassword('WrongPass123!', hashed)).resolves.toBe(false);
  });

  test('validates password strength', () => {
    expect(validatePasswordStrength('Weak').isStrong).toBe(false);
    expect(validatePasswordStrength('Strong@123').isStrong).toBe(true);
  });
});

describe('JWT utils', () => {
  test('generates and verifies access token', () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-123456789';
    process.env.JWT_EXPIRE = '1h';

    const user = {
      _id: '507f1f77bcf86cd799439011',
      email: 'test@example.com',
      role: 'consumer',
      name: 'Test User',
    };

    const token = generateAccessToken(user);
    const decoded = verifyAccessToken(token);

    expect(decoded.email).toBe(user.email);
    expect(decoded.role).toBe(user.role);
  });

  test('generates and verifies refresh token', () => {
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key-123456789';
    process.env.JWT_REFRESH_EXPIRE = '1d';

    const user = { _id: '507f1f77bcf86cd799439011' };

    const token = generateRefreshToken(user);
    const decoded = verifyRefreshToken(token);

    expect(decoded.id).toBe(user._id);
    expect(decoded.type).toBe('refresh');
  });
});
