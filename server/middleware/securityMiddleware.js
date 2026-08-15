import { authenticateToken } from '../services/authService.js';
import { sanitizeSqlInjection, pipelineRateLimiter } from '../../src/services/security.js';

/**
 * Security Middleware Layer
 * Protects API routes against CORS exploits, SQL Injection, Rate Limit Spikes, and Unauthorized Access.
 */

/** Set Security Headers (CSP, X-Content-Type-Options, HSTS, X-Frame-Options) */
export function setSecurityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  );
  if (next) next();
}

/** Rate Limiting Middleware */
export function applyRateLimit(req, res, next) {
  if (!pipelineRateLimiter.canExecute()) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Too many requests. Please wait 10 seconds before retrying.' }));
    return false;
  }
  if (next) next();
  return true;
}

/** JWT Authentication Guard Middleware */
export function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const authResult = authenticateToken(authHeader);

  if (!authResult.authenticated) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: authResult.error || 'Unauthorized request.' }));
    return false;
  }

  req.user = authResult.user;
  if (next) next();
  return true;
}

/** Role-Based Authorization Guard Middleware */
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden: Insufficient role permissions.' }));
      return false;
    }
    if (next) next();
    return true;
  };
}

/**
 * Request Body Sanitization Filter
 * Recursively sanitizes strings inside nested objects and arrays to prevent SQL Injection & XSS.
 */
export function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') return body;

  // Fields that must NEVER be sanitized (passwords get hashed, not queried)
  const RAW_FIELDS = new Set(['password', 'password_hash', 'salt']);

  if (Array.isArray(body)) {
    return body.map((item) => sanitizeRequestBody(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(body)) {
    if (RAW_FIELDS.has(key)) {
      sanitized[key] = value; // Pass through raw — will be hashed by crypto service
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeSqlInjection(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) => (typeof item === 'string' ? sanitizeSqlInjection(item) : sanitizeRequestBody(item)));
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeRequestBody(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/** Validate payload size to prevent DOS/buffer overflow attacks */
export function validatePayloadSize(body, maxBytes = 1048576) { // 1 MB default
  if (!body) return true;
  try {
    const jsonStr = typeof body === 'string' ? body : JSON.stringify(body);
    return Buffer.byteLength(jsonStr, 'utf-8') <= maxBytes;
  } catch {
    return true;
  }
}
