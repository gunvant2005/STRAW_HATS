import { registerUser, loginUser, authenticateToken } from '../services/authService.js';
import { createOrUpdateProductRecord, getProductRecordBySku, recordReviewAction, getAllProducts } from '../services/productService.js';
import { setSecurityHeaders, applyRateLimit, sanitizeRequestBody } from '../middleware/securityMiddleware.js';

/**
 * Server Router & Request Handler
 */

export async function handleApiRequest(req, res, bodyData) {
  setSecurityHeaders(req, res);

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method.toUpperCase();

  // Helper to send JSON response
  const sendJson = (statusCode, data) => {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    });
    res.end(JSON.stringify(data));
  };

  // Pre-flight CORS request
  if (method === 'OPTIONS') {
    sendJson(200, { status: 'ok' });
    return;
  }

  // Sanitize body payload
  const body = sanitizeRequestBody(bodyData || {});

  try {
    // ------------------------------------------------------------------------
    // HEALTH CHECK
    // ------------------------------------------------------------------------
    if (pathname === '/api/v1/health' && method === 'GET') {
      sendJson(200, {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      });
      return;
    }

    // ------------------------------------------------------------------------
    // AUTH ROUTES
    // ------------------------------------------------------------------------
    if (pathname === '/api/v1/auth/register' && method === 'POST') {
      const result = await registerUser(body);
      sendJson(201, result);
      return;
    }

    if (pathname === '/api/v1/auth/login' && method === 'POST') {
      const result = await loginUser(body);
      sendJson(200, result);
      return;
    }

    // ------------------------------------------------------------------------
    // PRODUCT & PIPELINE ROUTES
    // ------------------------------------------------------------------------
    if (pathname === '/api/v1/pipeline/run' && method === 'POST') {
      if (!applyRateLimit(req, res)) return;
      const record = await createOrUpdateProductRecord(body);
      sendJson(200, { success: true, record });
      return;
    }

    if (pathname === '/api/v1/products/list' && method === 'GET') {
      const products = getAllProducts();
      sendJson(200, { success: true, count: products.length, products });
      return;
    }

    if (pathname === '/api/v1/products' && method === 'GET') {
      const sku = url.searchParams.get('sku') || 'HEX-M12-50';
      const record = getProductRecordBySku(sku);
      if (!record) {
        sendJson(404, { error: `Product SKU '${sku}' not found.` });
        return;
      }
      sendJson(200, { record });
      return;
    }

    // ------------------------------------------------------------------------
    // REVIEWS ROUTE
    // ------------------------------------------------------------------------
    if (pathname === '/api/v1/reviews/action' && method === 'POST') {
      const { sku, attributeKey, action, payload } = body;
      if (!sku || !attributeKey || !action) {
        sendJson(400, { error: 'Missing required parameters: sku, attributeKey, action' });
        return;
      }

      const updatedRecord = recordReviewAction(sku, attributeKey, action, payload || {});
      sendJson(200, { success: true, record: updatedRecord });
      return;
    }

    // Route not found
    sendJson(404, { error: `Route '${method} ${pathname}' not found.` });
  } catch (err) {
    console.error('API Error:', err.message);
    sendJson(500, { error: err.message || 'Internal Server Error' });
  }
}
