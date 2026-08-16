/**
 * Security & Input Validation Service
 * Provides sanitization, rate-limiting, file security checks, and payload bounds.
 */

/** Sanitize dynamic string against XSS attacks */
export function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/\0/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/`/g, '&#x60;')
    .replace(/\//g, '&#x2F;');
}

/** Validate input size constraints to prevent memory payload buffer overflow */
export function validateInputLength(input, maxLen = 10000) {
  if (!input) return true;
  return String(input).length <= maxLen;
}

/** Allowed MIME types and max size validation for file uploads */
const ALLOWED_FILE_TYPES = {
  pdf: ['application/pdf', '.pdf'],
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', '.jpeg', '.jpg', '.png', '.webp'],
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit

export function validateFileUpload(file, expectedType = 'pdf') {
  if (!file) return { valid: true };

  // Size check
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds 10MB limit (uploaded: ${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
    };
  }

  // File extension & type check
  const allowed = ALLOWED_FILE_TYPES[expectedType] || [];
  const fileNameLower = (file.name || '').toLowerCase();
  const fileTypeLower = (file.type || '').toLowerCase();

  const extensionMatch = allowed.some((ext) => fileNameLower.endsWith(ext));
  const typeMatch = allowed.some((mime) => fileTypeLower.includes(mime.replace('.', '')));

  if (!extensionMatch && !typeMatch) {
    return {
      valid: false,
      error: `Invalid file format for ${file.name}. Allowed types for ${expectedType}: ${allowed.join(', ')}.`,
    };
  }

  return { valid: true };
}

/** Rate limiter to prevent rapid submission spam */
class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 10000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.timestamps = [];
  }

  canExecute() {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((ts) => now - ts < this.windowMs);
    if (this.timestamps.length >= this.maxAttempts) {
      return false;
    }
    this.timestamps.push(now);
    return true;
  }

  reset() {
    this.timestamps = [];
  }
}

export const pipelineRateLimiter = new RateLimiter(5, 10000);

/** Sanitize input against SQL injection and command payload injection patterns (recursive pass prevents keyword bypasses) */
export function sanitizeSqlInjection(str) {
  if (typeof str !== 'string') return str;
  let prev = str;
  let cleaned = str;
  const sqlRegex = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC|UNION|CREATE|WHERE|TABLE|FROM|INTO|VALUES|TRUNCATE)\b)/gi;
  do {
    prev = cleaned;
    cleaned = cleaned.replace(sqlRegex, '').replace(/['";\-]/g, '');
  } while (cleaned !== prev);
  return cleaned;
}

/** Recursively sanitize strings inside nested objects and arrays */
export function sanitizeObject(obj) {
  if (obj === null || typeof obj !== 'object') {
    return typeof obj === 'string' ? sanitizeInput(obj) : obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }
  return sanitized;
}

/** Detailed password security scoring and checklist evaluation for live feedback */
export function evaluatePasswordSecurity(password) {
  const p = typeof password === 'string' ? password : '';
  const checks = {
    length: p.length >= 8,
    upper: /[A-Z]/.test(p),
    lower: /[a-z]/.test(p),
    digit: /\d/.test(p),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(p),
  };

  const passedCount = Object.values(checks).filter(Boolean).length;
  let score = 0;
  let label = 'Very Weak';
  let color = 'var(--error)';

  if (p.length === 0) {
    score = 0;
    label = 'None';
    color = 'var(--text-muted)';
  } else if (passedCount <= 2) {
    score = 1;
    label = 'Weak';
    color = 'var(--error)';
  } else if (passedCount === 3 || passedCount === 4) {
    score = 2;
    label = 'Moderate';
    color = 'var(--warning)';
  } else if (passedCount === 5 && p.length < 12) {
    score = 3;
    label = 'Strong';
    color = 'var(--accent)';
  } else if (passedCount === 5 && p.length >= 12) {
    score = 4;
    label = 'Maximum Security';
    color = 'var(--success)';
  }

  return {
    valid: checks.length && checks.upper && checks.lower && checks.digit && checks.special,
    score,
    label,
    color,
    checks,
    message: passedCount === 5 ? 'Strong enterprise password' : 'Password must satisfy all security requirements',
  };
}

/** Password complexity check utility for user authentication security */
export function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  const evalResult = evaluatePasswordSecurity(password);
  if (!evalResult.valid) {
    return { valid: false, message: 'Password must contain at least 8 characters, uppercase, lowercase, number, and special character' };
  }
  return { valid: true, message: 'Strong password' };
}

