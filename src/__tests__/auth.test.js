import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkPermission,
  setRole,
  ROLES,
  ROLE_PERMISSIONS,
  DEMO_ACCOUNTS,
  generateRealisticJwt,
  setAuthUser,
  getAuthUser,
  clearStoredUser,
  authenticateUser,
  registerUserAccount,
} from '../services/auth.js';
import {
  sanitizeSqlInjection,
  validatePasswordStrength,
  evaluatePasswordSecurity,
} from '../services/security.js';

describe('Auth RBAC & Password Security Utilities', () => {
  beforeEach(() => {
    clearStoredUser();
  });

  it('should grant full permissions to ADMIN role', () => {
    setRole(ROLES.ADMIN);
    expect(checkPermission('canRunPipeline')).toBe(true);
    expect(checkPermission('canReview')).toBe(true);
    expect(checkPermission('canResetState')).toBe(true);
    expect(checkPermission('canExport')).toBe(true);
  });

  it('should restrict state reset permission for REVIEWER role', () => {
    setRole(ROLES.REVIEWER);
    expect(checkPermission('canRunPipeline')).toBe(true);
    expect(checkPermission('canReview')).toBe(true);
    expect(checkPermission('canResetState')).toBe(false);
  });

  it('should restrict pipeline execution for VIEWER role', () => {
    setRole(ROLES.VIEWER);
    expect(checkPermission('canRunPipeline')).toBe(false);
    expect(checkPermission('canReview')).toBe(false);
    expect(checkPermission('canExport')).toBe(true);
  });

  it('should evaluate password security levels and criteria breakdown', () => {
    const emptyCheck = evaluatePasswordSecurity('');
    expect(emptyCheck.score).toBe(0);
    expect(emptyCheck.valid).toBe(false);

    const weakCheck = evaluatePasswordSecurity('short');
    expect(weakCheck.valid).toBe(false);
    expect(weakCheck.score).toBe(1);

    const moderateCheck = evaluatePasswordSecurity('Abcdef12');
    expect(moderateCheck.valid).toBe(false); // missing special char
    expect(moderateCheck.checks.special).toBe(false);
    expect(moderateCheck.score).toBe(2);

    const strongCheck = evaluatePasswordSecurity('Admin#Secure2026!');
    expect(strongCheck.valid).toBe(true);
    expect(strongCheck.checks.length).toBe(true);
    expect(strongCheck.checks.upper).toBe(true);
    expect(strongCheck.checks.lower).toBe(true);
    expect(strongCheck.checks.digit).toBe(true);
    expect(strongCheck.checks.special).toBe(true);
    expect(strongCheck.score).toBe(4);
    expect(strongCheck.label).toBe('Maximum Security');
  });

  it('should generate valid base64 JWT tokens with user claims and expiration', async () => {
    const mockUser = {
      id: 'usr_test_123',
      username: 'johndoe',
      fullName: 'John Doe',
      email: 'john@industrial.io',
      role: 'admin',
      org: 'Test Industrial Org',
    };

    const token = await generateRealisticJwt(mockUser);
    expect(typeof token).toBe('string');
    const parts = token.split('.');
    expect(parts.length).toBe(3);

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    expect(payload.sub).toBe('usr_test_123');
    expect(payload.username).toBe('johndoe');
    expect(payload.role).toBe('admin');
    expect(payload.iss).toBe('auth.productintel.io');
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it('should have valid Demo Account presets meeting complexity requirements', () => {
    expect(DEMO_ACCOUNTS.length).toBeGreaterThanOrEqual(3);
    for (const acc of DEMO_ACCOUNTS) {
      expect(acc.username).toBeDefined();
      expect(acc.password).toBeDefined();
      expect(acc.role).toBeDefined();
      expect(validatePasswordStrength(acc.password).valid).toBe(true);
    }
  });

  it('should strip SQL injection keywords from malicious inputs', () => {
    const malicious = "SELECT * FROM users WHERE '1'='1'; DROP TABLE products;";
    const cleaned = sanitizeSqlInjection(malicious);
    expect(cleaned).not.toContain('SELECT');
    expect(cleaned).not.toContain('DROP');
    expect(cleaned).not.toContain("'");
  });

  it('should validate password complexity requirement', () => {
    expect(validatePasswordStrength('weak').valid).toBe(false);
    expect(validatePasswordStrength('StrongP@ss123').valid).toBe(true);
  });

  it('should successfully authenticate with valid demo credentials', async () => {
    const { user, token } = await authenticateUser({
      usernameOrEmail: 'admin_lead',
      password: 'Admin#Secure2026!',
    });
    expect(user).toBeDefined();
    expect(user.username).toBe('admin_lead');
    expect(user.role).toBe('admin');
    expect(typeof token).toBe('string');
  });

  it('should reject authentication when password is incorrect', async () => {
    await expect(
      authenticateUser({
        usernameOrEmail: 'admin_lead',
        password: 'WrongPassword123!',
      })
    ).rejects.toThrow(/Incorrect password/i);
  });

  it('should reject authentication for non-existent user account', async () => {
    await expect(
      authenticateUser({
        usernameOrEmail: 'unknown_ghost_user',
        password: 'SomePassword123!',
      })
    ).rejects.toThrow(/No enterprise account found/i);
  });

  it('should register a new account and allow immediate authentication', async () => {
    const uniqueUser = `elena_${Date.now()}`;
    const uniqueEmail = `elena_${Date.now()}@industrial.org`;

    const { user, token } = await registerUserAccount({
      username: uniqueUser,
      email: uniqueEmail,
      fullName: 'Dr. Elena Rostova',
      password: 'Elena#Password2026!',
      org: 'Nordic Robotics Labs',
      role: 'admin',
    });

    expect(user.username).toBe(uniqueUser);
    expect(user.role).toBe('admin');
    expect(token).toBeDefined();

    // Verify user can now authenticate with the new credentials
    const loginRes = await authenticateUser({
      usernameOrEmail: uniqueEmail,
      password: 'Elena#Password2026!',
    });
    expect(loginRes.user.username).toBe(uniqueUser);
    expect(loginRes.user.fullName).toBe('Dr. Elena Rostova');
  });

  it('should reject registration when username or email is already taken', async () => {
    await expect(
      registerUserAccount({
        username: 'admin_lead',
        email: 'unique_new_email@company.com',
        fullName: 'Imposter Lead',
        password: 'Some#Password2026!',
        role: 'reviewer',
      })
    ).rejects.toThrow(/already registered/i);
  });
});

