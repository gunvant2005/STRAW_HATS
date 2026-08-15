import { describe, it, expect } from 'vitest';
import {
  sanitizeInput,
  validateInputLength,
  validateFileUpload,
  validatePasswordStrength,
  sanitizeSqlInjection,
  sanitizeObject,
} from '../services/security.js';

describe('Security & Validation Utilities', () => {
  it('should sanitize HTML strings to prevent XSS injection', () => {
    const malicious = '<script>alert("xss")</script>';
    const sanitized = sanitizeInput(malicious);
    expect(sanitized).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
  });

  it('should enforce input length limits', () => {
    const longString = 'a'.repeat(10001);
    expect(validateInputLength('short', 100)).toBe(true);
    expect(validateInputLength(longString, 10000)).toBe(false);
    expect(validateInputLength(null)).toBe(true);
  });

  it('should validate file extension and size for upload security', () => {
    const validPdf = { name: 'tech_sheet.pdf', size: 1024 * 1024, type: 'application/pdf' };
    const invalidFile = { name: 'malicious.exe', size: 1024, type: 'application/x-msdownload' };
    const oversizedFile = { name: 'large.pdf', size: 20 * 1024 * 1024, type: 'application/pdf' };

    expect(validateFileUpload(validPdf, 'pdf').valid).toBe(true);
    expect(validateFileUpload(invalidFile, 'pdf').valid).toBe(false);
    expect(validateFileUpload(oversizedFile, 'pdf').valid).toBe(false);
    expect(validateFileUpload(null).valid).toBe(true);
  });

  it('should validate password strength requirements', () => {
    expect(validatePasswordStrength('Weak').valid).toBe(false);
    expect(validatePasswordStrength('NoSpecial123').valid).toBe(false);
    expect(validatePasswordStrength('nouppercase!123').valid).toBe(false);
    expect(validatePasswordStrength('Complex@Pass123').valid).toBe(true);
    expect(validatePasswordStrength('').valid).toBe(false);
  });

  it('should strip dangerous SQL injection keywords recursively', () => {
    const sqli = "HEX-M12'; DROP TABLE products; SELECT * FROM users--";
    const cleaned = sanitizeSqlInjection(sqli);
    expect(cleaned.toLowerCase()).not.toContain('drop');
    expect(cleaned.toLowerCase()).not.toContain('table');
    expect(cleaned.toLowerCase()).not.toContain('select');
  });

  it('should recursively sanitize nested objects and arrays', () => {
    const nested = {
      title: '<b>Bolt</b>',
      tags: ['<i>DIN 933</i>', '<script>alert(1)</script>'],
      meta: {
        note: '<img src=x onerror=alert(1)>',
      },
    };
    const clean = sanitizeObject(nested);
    expect(clean.title).toBe('&lt;b&gt;Bolt&lt;&#x2F;b&gt;');
    expect(clean.tags[0]).toBe('&lt;i&gt;DIN 933&lt;&#x2F;i&gt;');
    expect(clean.meta.note).toContain('&lt;img');
  });
});
