/**
 * Environment Configuration Manager
 * Handles environment variables safely with fallback defaults for production deployment.
 */

function getApiBaseUrl() {
  if (import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5000/api/v1';
  }
  return 'https://api.product-intelligence.industrial/v1';
}

export const config = {
  appName: import.meta.env?.VITE_APP_TITLE || 'Product Intelligence | Industrial Commerce',
  apiBaseUrl: getApiBaseUrl(),
  environment: import.meta.env?.VITE_APP_ENV || 'production',
  enableAnalytics: import.meta.env?.VITE_ENABLE_ANALYTICS !== 'false',
  gaMeasurementId: import.meta.env?.VITE_GA_ID || 'G-DEMO123456',
  maxFileUploadSizeMb: 10,
  rateLimitWindowMs: 10000,
  maxPipelineRequestsPerWindow: 5,
};
