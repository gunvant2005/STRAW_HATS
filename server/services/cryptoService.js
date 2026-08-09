import crypto from 'crypto';

/**
 * Enterprise Cryptographic & Database Security Service
 * Implements PBKDF2 password hashing, constant-time verification, and HMAC JWT signatures.
 */

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_enterprise_key_change_in_prod_2026';
const ITERATIONS = 10000;
const KEY_LEN = 64;
const DIGEST = 'sha512';

/**
 * Cross-platform Base64URL encoding/decoding helpers.
 * Works on Node.js 12+ (pre-15.7 without native 'base64url' support) and all current versions.
 * Ensures JWT token generation never fails due to encoding incompatibility.
 */
function toBase64Url(input) {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf-8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad === 2) base64 += '==';
  else if (pad === 3) base64 += '=';
  return Buffer.from(base64, 'base64');
}

function hmacBase64Url(data) {
  const digest = crypto.createHmac('sha256', JWT_SECRET).update(data).digest();
  return toBase64Url(digest);
}

/**
 * Hash password using PBKDF2 with salt to prevent dictionary & rainbow table attacks
 */
export function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.pbkdf2(password, salt, ITERATIONS, KEY_LEN, DIGEST, (err, derivedKey) => {
      if (err) return reject(err);
      resolve({
        hash: derivedKey.toString('hex'),
        salt: salt,
      });
    });
  });
}

/**
 * Synchronous hash helper for fast validation using crypto.pbkdf2Sync
 */
export function hashPasswordSync(password, salt) {
  const derivedKey = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST);
  return derivedKey.toString('hex');
}

/**
 * Verify password against stored hash using constant-time comparison (prevents timing attacks)
 */
export function verifyPassword(password, storedHash, salt) {
  const computedHash = hashPasswordSync(password, salt);
  const hashBuffer = Buffer.from(storedHash, 'hex');
  const computedBuffer = Buffer.from(computedHash, 'hex');
  
  if (hashBuffer.length !== computedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(hashBuffer, computedBuffer);
}

/**
 * Sign JWT authentication token
 */
export function signJwt(payload, expiresInSeconds = 86400) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(fullPayload));
  const signature = hmacBase64Url(`${encodedHeader}.${encodedPayload}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify & decode JWT authentication token
 */
export function verifyJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;

  const expectedSignature = hmacBase64Url(`${encodedHeader}.${encodedPayload}`);

  const sigBuffer = Buffer.from(signature);
  const expectedSigBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
    return null; // Invalid signature
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload).toString('utf-8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Token expired
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * SQL Parameter binding sanitizer (ensures parameters are safely cast to primitives)
 */
export function sanitizeSqlParam(param) {
  if (param === null || param === undefined) return null;
  if (typeof param === 'number' || typeof param === 'boolean') return param;
  if (typeof param === 'string') {
    // Strip control characters and trim
    return param.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
      switch (char) {
        case "\0": return "\\0";
        case "\x08": return "\\b";
        case "\x09": return "\\t";
        case "\x1a": return "\\z";
        case "\n": return "\\n";
        case "\r": return "\\r";
        case "\"": case "'": case "\\": case "%":
          return "\\" + char;
        default:
          return char;
      }
    });
  }
  return String(param);
}
