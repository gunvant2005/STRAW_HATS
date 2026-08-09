import { db } from '../db/database.js';
import { hashPassword, verifyPassword, signJwt, verifyJwt } from './cryptoService.js';
import { validatePasswordStrength } from '../../src/services/security.js';

/**
 * Enterprise Authentication & Access Control Service
 */

export const ROLES = {
  ADMIN: 'admin',
  REVIEWER: 'reviewer',
  VIEWER: 'viewer',
};

/**
 * Register a new user with PBKDF2 password encryption
 */
export async function registerUser({ username, email, password, role = ROLES.VIEWER }) {
  if (!username || !email || !password) {
    throw new Error('Registration failed: Username, email, and password are required.');
  }

  const passCheck = validatePasswordStrength(password);
  if (!passCheck.valid) {
    throw new Error(`Security Exception: ${passCheck.message}`);
  }

  const { hash, salt } = await hashPassword(password);

  const newUser = db.insert('users', {
    username,
    email,
    password_hash: hash,
    salt: salt,
    role: ROLES[role.toUpperCase()] ? role : ROLES.VIEWER,
  });

  const token = signJwt({
    userId: newUser.id,
    username: newUser.username,
    role: newUser.role,
  });

  return {
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
    },
    token,
  };
}

/**
 * Authenticate user with password verification & issue JWT token
 */
export async function loginUser({ username, password }) {
  if (!username || !password) {
    throw new Error('Login failed: Username and password required.');
  }

  const users = db.query('users', (u) => u.username === username || u.email === username);
  if (users.length === 0) {
    throw new Error('Authentication failed: Invalid credentials.');
  }

  const user = users[0];
  const isValid = verifyPassword(password, user.password_hash, user.salt);

  if (!isValid) {
    throw new Error('Authentication failed: Invalid credentials.');
  }

  // Update last login
  db.update('users', user.id, { last_login: new Date().toISOString() });

  const token = signJwt({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    token,
  };
}

/**
 * Verify JWT authorization token from header
 */
export function authenticateToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Authorization header missing or malformed' };
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyJwt(token);

  if (!decoded) {
    return { authenticated: false, error: 'Invalid or expired token' };
  }

  return { authenticated: true, user: decoded };
}
