import { config } from '../config.js';

/**
 * Real-World HTTP API Client with Automatic Offline Fallback
 * Connects frontend workspace to backend REST server.
 */

// Token is read lazily inside request() so that tokens set after
// module initialization (e.g. from loadStoredUser) are always picked up.
let _authToken = null;

export function setAuthToken(token) {
  _authToken = token;
  if (token) {
    localStorage.setItem('pi_auth_token', token);
  } else {
    localStorage.removeItem('pi_auth_token');
  }
}

export function getAuthToken() {
  if (_authToken) return _authToken;
  // Lazy-load from storage on first access
  _authToken = localStorage.getItem('pi_auth_token') || null;
  return _authToken;
}

async function request(endpoint, options = {}, retries = 1) {
  const baseUrl = config.apiBaseUrl.startsWith('http')
    ? config.apiBaseUrl
    : 'http://localhost:5000/api/v1';

  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 3500);

  try {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (retries > 0 && (options.method || 'GET').toUpperCase() === 'GET') {
      await new Promise((r) => setTimeout(r, 500));
      return request(endpoint, options, retries - 1);
    }
    if (err.name === 'AbortError') {
      throw new Error('API Request timed out. Backend server may be offline.');
    }
    throw err;
  }
}

export const apiClient = {
  // Health check
  async getHealth() {
    return request('/health');
  },

  // Auth routes
  async register(username, email, password, role) {
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, role }),
    });
    if (res.token) setAuthToken(res.token);
    return res;
  },

  async login(username, password) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (res.token) setAuthToken(res.token);
    return res;
  },

  // Pipeline execution
  async runPipeline(inputData) {
    return request('/pipeline/run', {
      method: 'POST',
      body: JSON.stringify(inputData),
    });
  },

  // Product fetching
  async getProduct(sku) {
    return request(`/products?sku=${encodeURIComponent(sku)}`);
  },

  async listProducts() {
    return request('/products/list');
  },

  // Review action
  async recordReview(sku, attributeKey, action, payload = {}) {
    return request('/reviews/action', {
      method: 'POST',
      body: JSON.stringify({ sku, attributeKey, action, payload }),
    });
  },
};
