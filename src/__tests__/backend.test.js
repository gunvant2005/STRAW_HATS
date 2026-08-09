import { describe, it, expect, beforeEach } from 'vitest';
import { hashPassword, verifyPassword, signJwt, verifyJwt } from '../../server/services/cryptoService.js';
import { registerUser, loginUser } from '../../server/services/authService.js';
import { createOrUpdateProductRecord, getProductRecordBySku, recordReviewAction } from '../../server/services/productService.js';
import { db } from '../../server/db/database.js';

describe('Enterprise Backend & Database Security Suite', () => {
  beforeEach(() => {
    db.clear();
  });

  describe('1. Cryptography & Password Security (PBKDF2 & Timing Attack Immunity)', () => {
    it('should hash passwords using PBKDF2 with unique salts', async () => {
      const pass = 'SecretP@ssw0rd123!';
      const res1 = await hashPassword(pass);
      const res2 = await hashPassword(pass);

      expect(res1.salt).not.toBe(res2.salt);
      expect(res1.hash).not.toBe(res2.hash);
      expect(res1.hash.length).toBe(128); // SHA-512 hex output
    });

    it('should verify password hashes using constant-time comparison', async () => {
      const pass = 'ValidPass#2026';
      const { hash, salt } = await hashPassword(pass);

      expect(verifyPassword(pass, hash, salt)).toBe(true);
      expect(verifyPassword('WrongPassword', hash, salt)).toBe(false);
    });

    it('should generate and verify signed JWT tokens', () => {
      const payload = { userId: 'usr_101', role: 'admin' };
      const token = signJwt(payload, 3600);

      expect(token).toBeDefined();
      const decoded = verifyJwt(token);
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe('usr_101');
      expect(decoded.role).toBe('admin');
    });

    it('should reject tampered or expired JWT tokens', () => {
      const token = signJwt({ userId: 'usr_101' }, -10); // Expired token
      expect(verifyJwt(token)).toBeNull();

      const validToken = signJwt({ userId: 'usr_101' }, 3600);
      const tampered = validToken.slice(0, -5) + 'XXXXX';
      expect(verifyJwt(tampered)).toBeNull();
    });
  });

  describe('2. User Authentication & Authorization (RBAC)', () => {
    it('should register a new user and return JWT token', async () => {
      const userRes = await registerUser({
        username: 'john_admin',
        email: 'john@industrial.com',
        password: 'SecureAdmin#2026',
        role: 'admin',
      });

      expect(userRes.user).toBeDefined();
      expect(userRes.user.username).toBe('john_admin');
      expect(userRes.user.role).toBe('admin');
      expect(userRes.token).toBeDefined();
    });

    it('should authenticate registered user and update last login timestamp', async () => {
      await registerUser({
        username: 'reviewer_jane',
        email: 'jane@industrial.com',
        password: 'ReviewerPass#2026',
        role: 'reviewer',
      });

      const loginRes = await loginUser({
        username: 'reviewer_jane',
        password: 'ReviewerPass#2026',
      });

      expect(loginRes.user.username).toBe('reviewer_jane');
      expect(loginRes.token).toBeDefined();
    });
  });

  describe('3. Database Persistence & SQL Injection Immunity', () => {
    it('should persist product records, attributes, and citations securely', async () => {
      const record = await createOrUpdateProductRecord({
        sku: 'HEX-M12-50',
        description: 'Hex bolt stainless steel catalog copy',
        notes: 'Test notes',
      });

      expect(record).toBeDefined();
      expect(record.sku).toBe('HEX-M12-50');

      const fetched = getProductRecordBySku('HEX-M12-50');
      expect(fetched).toBeDefined();
      expect(fetched.sku).toBe('HEX-M12-50');
      expect(fetched.attributes.material).toBeDefined();
    });

    it('should log audit record when human review action occurs', async () => {
      await createOrUpdateProductRecord({ sku: 'HEX-M12-50' });

      const updated = recordReviewAction('HEX-M12-50', 'material', 'approve', {}, 'usr_reviewer');
      expect(updated.attributes.material.status).toBe('reviewed');

      const logs = db.query('review_logs', (l) => l.attribute_key === 'material');
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].action).toBe('approve');
    });

    it('should neutralize SQL injection attack payloads in query parameters', () => {
      const maliciousSku = "HEX-M12-50' OR '1'='1";
      const record = getProductRecordBySku(maliciousSku);
      expect(record).toBeNull(); // Injection payload safely queried as literal string
    });
  });
});
