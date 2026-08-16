/**
 * Authentication & Role-Based Access Control (RBAC) Service
 * Simulates user sessions, cryptographically-signed JWT tokens (HMAC-SHA256
 * via Web Crypto API), and permission guards for enterprise workflow.
 *
 * SECURITY NOTE: Demo account passwords below are intentionally visible for
 * hackathon evaluation purposes only. In production, credentials must be
 * stored server-side as PBKDF2 hashes — never in source code.
 */

export const ROLES = {
  ADMIN: 'admin',
  REVIEWER: 'reviewer',
  VIEWER: 'viewer',
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: {
    canRunPipeline: true,
    canReview: true,
    canEditAttributes: true,
    canExport: true,
    canResetState: true,
    label: 'Administrator (Full Access)',
    badge: '👑 Admin',
    desc: 'Complete control over pipeline orchestration, data mutation, review approvals, and system reset.',
  },
  [ROLES.REVIEWER]: {
    canRunPipeline: true,
    canReview: true,
    canEditAttributes: true,
    canExport: true,
    canResetState: false,
    label: 'Product Reviewer',
    badge: '🔍 Reviewer',
    desc: 'Authorized to execute extraction pipelines, approve/edit attributes, flag issues, and export records.',
  },
  [ROLES.VIEWER]: {
    canRunPipeline: false,
    canReview: false,
    canEditAttributes: false,
    canExport: true,
    canResetState: false,
    label: 'Read-Only Viewer / Auditor',
    badge: '👁️ Auditor',
    desc: 'Read-only access to inspect pipeline telemetry, validation metrics, and download approved exports.',
  },
};

export const DEMO_ACCOUNTS = [
  {
    id: 'usr_admin_01',
    username: 'admin_lead',
    email: 'admin@productintel.io',
    password: 'Admin#Secure2026!',
    fullName: 'Marcus Sterling',
    role: ROLES.ADMIN,
    org: 'Industrial Catalog Operations',
    title: 'Lead Solutions Architect',
    avatar: 'MS',
  },
  {
    id: 'usr_rev_02',
    username: 'sarah_reviewer',
    email: 'sarah.c@industrial.com',
    password: 'Reviewer#Pass2026!',
    fullName: 'Dr. Sarah Chen',
    role: ROLES.REVIEWER,
    org: 'Precision Fasteners & Logistics',
    title: 'Senior Technical Reviewer',
    avatar: 'SC',
  },
  {
    id: 'usr_view_03',
    username: 'alex_auditor',
    email: 'alex.v@compliance.org',
    password: 'Auditor#Safe2026!',
    fullName: 'Alex Vance',
    role: ROLES.VIEWER,
    org: 'Global Standards Compliance',
    title: 'Data Governance Auditor',
    avatar: 'AV',
  },
];

const USER_STORAGE_KEY = 'pi_authenticated_user_v1';
const TOKEN_STORAGE_KEY = 'pi_auth_token';

let currentRole = ROLES.ADMIN;
let currentUser = null;

/**
 * Generate a cryptographically signed HMAC-SHA256 JWT token using Web Crypto API.
 * Falls back to a deterministic base64 representation if crypto.subtle is unavailable.
 * @returns {Promise<string>} Signed JWT string in standard header.payload.signature format
 */
export async function generateRealisticJwt(user) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days
  const iat = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id || `usr_${Date.now()}`,
    name: user.fullName || user.username,
    username: user.username,
    email: user.email,
    role: user.role || 'reviewer',
    org: user.org || 'Enterprise Commerce Org',
    iat,
    exp,
    iss: 'auth.productintel.io',
    aud: 'api.productintel.io',
  };

  const b64url = (obj) => {
    const json = typeof obj === 'string' ? obj : JSON.stringify(obj);
    try {
      return btoa(unescape(encodeURIComponent(json)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    } catch {
      return btoa(json)
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    }
  };

  const rawHeader = b64url(header);
  const rawPayload = b64url(payload);
  const signingInput = `${rawHeader}.${rawPayload}`;

  // Attempt real HMAC-SHA256 via Web Crypto API
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      // Use a session-scoped secret key stored in sessionStorage for reproducibility
      let secret = sessionStorage.getItem('pi_jwt_secret');
      if (!secret) {
        const arr = new Uint8Array(32);
        crypto.getRandomValues(arr);
        secret = Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
        sessionStorage.setItem('pi_jwt_secret', secret);
      }

      const keyData = new TextEncoder().encode(secret);
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        new TextEncoder().encode(signingInput)
      );

      const signatureArray = new Uint8Array(signatureBuffer);
      const signatureB64 = btoa(String.fromCharCode(...signatureArray))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

      return `${signingInput}.${signatureB64}`;
    }
  } catch (cryptoErr) {
    console.warn('Web Crypto unavailable, falling back to mock signature:', cryptoErr.message);
  }

  // Fallback: deterministic mock signature (non-cryptographic, for environments without crypto.subtle)
  const mockSig = btoa(`fallback_sig_${Date.now()}`)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .slice(0, 43);

  return `${signingInput}.${mockSig}`;
}

export function getCurrentRole() {
  return currentRole;
}

export function setRole(role) {
  const normalized = (role || '').toLowerCase();
  if (ROLES[normalized.toUpperCase()]) {
    currentRole = normalized;
    if (currentUser) {
      currentUser.role = normalized;
      saveStoredUser(currentUser);
    }
    return true;
  }
  return false;
}

export function getRolePermissions(role = currentRole) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[ROLES.VIEWER];
}

export function checkPermission(permission, role = currentRole) {
  const perms = getRolePermissions(role);
  return Boolean(perms[permission]);
}

export function getAuthUser() {
  if (currentUser) return currentUser;
  return {
    id: 'usr_ind_9921',
    username: 'admin_lead',
    fullName: 'Marcus Sterling',
    email: 'admin@productintel.io',
    org: 'Industrial Catalog Operations',
    role: currentRole,
    roleLabel: ROLE_PERMISSIONS[currentRole].label,
    token: generateRealisticJwt({ id: 'usr_ind_9921', username: 'admin_lead', role: currentRole }),
  };
}

export function setAuthUser(user) {
  currentUser = user;
  if (user && user.role) {
    currentRole = user.role;
  }
  saveStoredUser(user);
}

export function saveStoredUser(user) {
  try {
    if (!user) {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      currentUser = null;
      return;
    }
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    if (user.token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, user.token);
    }
  } catch {}
}

export function loadStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.username) {
      currentUser = parsed;
      currentRole = parsed.role || ROLES.ADMIN;
      return parsed;
    }
  } catch {}
  return null;
}

export function clearStoredUser() {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {}
  currentUser = null;
  currentRole = ROLES.ADMIN;
}

const USER_DIRECTORY_KEY = 'pi_user_directory_v1';

export function getRegisteredUsers() {
  try {
    const raw = localStorage.getItem(USER_DIRECTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  // Seed with default demo accounts if none in storage
  const seeded = [...DEMO_ACCOUNTS];
  try {
    localStorage.setItem(USER_DIRECTORY_KEY, JSON.stringify(seeded));
  } catch {}
  return seeded;
}

export function saveRegisteredUsers(users) {
  try {
    localStorage.setItem(USER_DIRECTORY_KEY, JSON.stringify(users));
  } catch {}
}

export function findUserByUsernameOrEmail(identifier) {
  if (!identifier) return null;
  const clean = String(identifier).trim().toLowerCase();
  const users = getRegisteredUsers();
  return users.find(
    (u) =>
      (u.username && u.username.toLowerCase() === clean) ||
      (u.email && u.email.toLowerCase() === clean)
  ) || null;
}

export async function authenticateUser({ usernameOrEmail, password }) {
  if (!usernameOrEmail || !password) {
    throw new Error('Username / work email and password are required.');
  }

  const clean = String(usernameOrEmail).trim();
  const user = findUserByUsernameOrEmail(clean);

  if (!user) {
    throw new Error(`Authentication failed: No enterprise account found with username or email "${clean}".`);
  }

  if (user.password !== password) {
    throw new Error('Authentication failed: Incorrect password. Please verify your credentials.');
  }

  // Update last login
  user.lastLoginAt = new Date().toISOString();
  const users = getRegisteredUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    users[idx] = user;
    saveRegisteredUsers(users);
  }

  const token = await generateRealisticJwt(user);
  const authUser = {
    id: user.id,
    username: user.username,
    fullName: user.fullName || user.username,
    email: user.email,
    org: user.org || 'Industrial Commerce Enterprise',
    role: user.role || ROLES.REVIEWER,
    roleLabel: ROLE_PERMISSIONS[user.role || ROLES.REVIEWER]?.label || user.role,
    avatar: user.avatar || user.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U',
    token,
    lastLoginAt: user.lastLoginAt,
  };

  setAuthUser(authUser);
  return { user: authUser, token };
}

export async function registerUserAccount({ username, email, fullName, password, org, role = ROLES.REVIEWER }) {
  if (!username || !email || !password) {
    throw new Error('Full Name, Username, Work Email, and Password are all required.');
  }

  const cleanUsername = String(username).trim();
  const cleanEmail = String(email).trim().toLowerCase();

  const existingByUsername = findUserByUsernameOrEmail(cleanUsername);
  if (existingByUsername) {
    throw new Error(`Account creation failed: Username "${cleanUsername}" is already registered. Please sign in instead.`);
  }

  const existingByEmail = findUserByUsernameOrEmail(cleanEmail);
  if (existingByEmail) {
    throw new Error(`Account creation failed: Email address "${cleanEmail}" is already registered. Please sign in instead.`);
  }

  const normalizedRole = ROLES[role.toUpperCase()] ? role.toLowerCase() : ROLES.REVIEWER;
  const initials = (fullName || cleanUsername)
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  const newUser = {
    id: `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    username: cleanUsername,
    fullName: fullName ? fullName.trim() : cleanUsername,
    email: cleanEmail,
    password, // Stored for local evaluation
    role: normalizedRole,
    org: org ? org.trim() : 'Industrial Commerce Organization',
    avatar: initials,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  const users = getRegisteredUsers();
  users.push(newUser);
  saveRegisteredUsers(users);

  const token = await generateRealisticJwt(newUser);
  const authUser = {
    ...newUser,
    roleLabel: ROLE_PERMISSIONS[newUser.role]?.label || newUser.role,
    token,
  };

  setAuthUser(authUser);
  return { user: authUser, token };
}

