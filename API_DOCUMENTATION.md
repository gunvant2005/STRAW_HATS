# Product Intelligence — REST API Specification

**Interactive Product Data Intelligence & Extraction Platform**  
*API Version:* `1.0.0`  
*Base URL (Local):* `http://localhost:5000/api/v1`  
*Base URL (Production):* `https://api.product-intelligence.industrial/v1`  
*Protocol:* `HTTP/1.1 / JSON`  
*Security Architecture:* `PBKDF2-SHA512` · `HMAC-SHA256 JWT` · `CORS Whitelist` · `Sliding Rate Limiter`

---

## 1. Overview & Security Protocols

The **Product Intelligence REST API** provides an enterprise interface for uploading unstructured product catalog data, executing automated 7-stage extraction and validation pipelines, managing product database records, and logging human review actions.

### Authentication & Authorization Headers
All protected endpoints require a Bearer token issued during authentication:
```http
Authorization: Bearer <HMAC-SHA256-JWT-TOKEN>
Content-Type: application/json
```

### Global Rate Limits & Payload Constraints
- **Pipeline Execution Limit**: 5 requests per 10-second sliding window per IP.
- **Maximum Request Body Size**: 1 MB (1,048,576 bytes).
- **HTTP Security Headers on All Responses**:
  ```http
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline';
  ```

---

## 2. API Endpoints

### 1. Health & System Status
Check server liveness, environment, and system timestamp.

```http
GET /api/v1/health
```

#### Response (`200 OK`)
```json
{
  "status": "healthy",
  "timestamp": "2026-08-15T14:30:00.000Z",
  "version": "1.0.0",
  "environment": "development"
}
```

#### Example cURL
```bash
curl -X GET http://localhost:5000/api/v1/health
```

---

### 2. User Registration (PBKDF2 Hashed)
Registers a new enterprise user account with cryptographic PBKDF2 hashing (10k iterations, SHA-512, unique 16-byte salt).

```http
POST /api/v1/auth/register
```

#### Request Body
| Field | Type | Required | Description |
|:---|:---:|:---:|:---|
| `username` | String | Yes | Unique username (min 3 chars) |
| `email` | String | Yes | Unique valid email address |
| `password` | String | Yes | Password (min 8 chars, uppercase, lowercase, number, symbol) |
| `role` | String | No | Role assignment: `admin` \| `reviewer` \| `viewer` (Default: `reviewer`) |

```json
{
  "username": "lead_reviewer",
  "email": "reviewer@nordicfast.com",
  "password": "SecurePassword123!",
  "role": "reviewer"
}
```

#### Response (`201 Created`)
```json
{
  "success": true,
  "user": {
    "id": "users_1786245000_a1b2c",
    "username": "lead_reviewer",
    "email": "reviewer@nordicfast.com",
    "role": "reviewer"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXJzXzE3ODYyNDUwMDBfYTFiMmMiLCJ1c2VybmFtZSI6ImxlYWRfcmV2aWV3ZXIiLCJyb2xlIjoicmV2aWV3ZXIiLCJleHAiOjE3ODYzMzE0MDB9.signature"
}
```

---

### 3. User Authentication & Login
Authenticates credentials with constant-time hash verification and returns an HMAC-SHA256 signed JWT session token.

```http
POST /api/v1/auth/login
```

#### Request Body
```json
{
  "username": "lead_reviewer",
  "password": "SecurePassword123!"
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "user": {
    "id": "users_1786245000_a1b2c",
    "username": "lead_reviewer",
    "email": "reviewer@nordicfast.com",
    "role": "reviewer"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 4. Execute AI Extraction Pipeline
Runs the multi-modal intelligence pipeline to extract, enrich, and validate structured attributes from minimal inputs, and saves the result to the database.

```http
POST /api/v1/pipeline/run
```

#### Request Body
| Field | Type | Required | Description |
|:---|:---:|:---:|:---|
| `sku` | String | Yes | Product SKU or identifier |
| `description` | String | No | Raw supplier catalog description copy |
| `notes` | String | No | Validation and compliance context notes |
| `pdf` | Object | No | Uploaded PDF technical document metadata |
| `image` | Object | No | Uploaded product image metadata |

```json
{
  "sku": "HEX-M12-50",
  "description": "NordicFast DIN 933 hexagon head screw bolt M12 x 50mm in A4-70 316 stainless steel.",
  "notes": "Ensure RoHS and REACH compliance are cited from page 1."
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "record": {
    "id": "products_1786245100_x9y8z",
    "sku": "HEX-M12-50",
    "title": "Hex Head Bolt M12 × 50 mm — 316 Stainless Steel (DIN 933)",
    "category": "Fasteners > Industrial Bolts > Hexagon Bolts",
    "confidenceScore": 0.88,
    "status": "review",
    "attributes": {
      "sku": {
        "label": "SKU",
        "value": "HEX-M12-50",
        "confidence": 0.98,
        "status": "extracted",
        "evidence": {
          "source_document": "TechSheet_HEX-M12_v3.pdf",
          "page_number": 1,
          "text_snippet": "Part Number: HEX-M12-50\nDescription: Hex Head Bolt M12 × 50 mm"
        }
      },
      "material": {
        "label": "Material",
        "value": "316 Stainless Steel (A4-70)",
        "confidence": 0.92,
        "status": "extracted",
        "evidence": {
          "source_document": "TechSheet_HEX-M12_v3.pdf",
          "page_number": 2,
          "text_snippet": "Material: Grade 316 / A4-70 Austenitic Stainless Steel"
        }
      },
      "dimensions": {
        "label": "Dimensions",
        "value": "M12 × 50 mm",
        "confidence": 0.65,
        "status": "extracted",
        "evidence": {
          "source_document": "TechSheet_HEX-M12_v3.pdf",
          "page_number": 2,
          "text_snippet": "Thread size: M12; Length: 50mm / 2 inches"
        }
      }
    },
    "createdAt": "2026-08-15T14:30:00.000Z"
  }
}
```

---

### 5. List All Catalog Products
Retrieves all structured products saved in the relational database.

```http
GET /api/v1/products/list
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "count": 3,
  "products": [
    {
      "id": "products_1",
      "sku": "HEX-M12-50",
      "title": "Hex Head Bolt M12 × 50 mm — 316 Stainless Steel",
      "category": "Fasteners",
      "confidenceScore": 0.88,
      "status": "review"
    },
    {
      "id": "products_2",
      "sku": "BB-6205-2RS",
      "title": "Deep Groove Ball Bearing 6205-2RS",
      "category": "Bearings",
      "confidenceScore": 0.85,
      "status": "complete"
    }
  ]
}
```

---

### 6. Get Product by SKU
Retrieves complete product record, all 14 attributes, and evidence citations for a specific SKU.

```http
GET /api/v1/products?sku=HEX-M12-50
```

#### Response (`200 OK`)
```json
{
  "record": {
    "id": "products_1",
    "sku": "HEX-M12-50",
    "title": "Hex Head Bolt M12 × 50 mm",
    "category": "Fasteners",
    "confidenceScore": 0.88,
    "status": "review",
    "attributes": { ... }
  }
}
```

---

### 7. Record Human Review Action
Records an approve, edit, or reject action on an attribute, updating its status and logging an entry in `review_logs`.

```http
POST /api/v1/reviews/action
```

#### Request Body
| Field | Type | Required | Description |
|:---|:---:|:---:|:---|
| `sku` | String | Yes | Target product SKU |
| `attributeKey` | String | Yes | Attribute identifier (e.g. `dimensions`, `material`) |
| `action` | String | Yes | Action: `approve` \| `edit` \| `reject` |
| `payload` | Object | No | Object containing `{ value?: string, notes?: string }` |

```json
{
  "sku": "HEX-M12-50",
  "attributeKey": "dimensions",
  "action": "edit",
  "payload": {
    "value": "M12 × 50 mm",
    "notes": "Standardized imperial inches to metric millimeters per catalog guidelines."
  }
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "record": {
    "id": "products_1",
    "sku": "HEX-M12-50",
    "status": "reviewed",
    "attributes": { ... }
  }
}
```

---

## 3. Standard Error Responses

All API errors return standard RFC 7807 compliant error payloads:

```json
{
  "error": "Too many requests. Please wait 10 seconds before retrying."
}
```

| HTTP Code | Description | Cause |
|:---:|---|---|
| `400 Bad Request` | Missing or invalid parameters in request body |
| `401 Unauthorized` | Missing or expired JWT Bearer authentication token |
| `403 Forbidden` | User role has insufficient permissions for this operation |
| `404 Not Found` | Requested route or product SKU does not exist |
| `413 Payload Too Large` | Request body exceeds the 1 MB size constraint |
| `429 Too Many Requests` | Sliding rate limiter threshold exceeded (5 req / 10s) |
| `500 Internal Error` | Server error during database transaction or extraction |

---

*Product Intelligence REST API Specification · 2026*
