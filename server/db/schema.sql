-- ============================================================================
-- Product Intelligence Platform - Database Schema
-- Security Controls: Foreign Keys, Unique Indexes, Prepared Statements Support
-- ============================================================================

-- 1. Users Table (Password Encryption, Roles, Security Audit Flags)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer', -- 'admin', 'reviewer', 'viewer'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- 2. Products Table (Structured Product Catalog Records)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    category TEXT,
    confidence_score REAL DEFAULT 0.0,
    status TEXT DEFAULT 'draft', -- 'draft', 'processing', 'review', 'complete'
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. Attributes Table (Normalized Attribute Name / Value Pairs with Confidence)
CREATE TABLE IF NOT EXISTS product_attributes (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    attribute_key TEXT NOT NULL,
    attribute_label TEXT NOT NULL,
    attribute_value TEXT,
    confidence REAL DEFAULT 0.0,
    status TEXT DEFAULT 'extracted', -- 'extracted', 'validated', 'needs_review', 'reviewed'
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(product_id, attribute_key)
);

-- 4. Evidence Citations Table (Traceability Citing Page & Snippets)
CREATE TABLE IF NOT EXISTS attribute_evidence (
    id TEXT PRIMARY KEY,
    attribute_id TEXT NOT NULL,
    source_document TEXT NOT NULL,
    page_number INTEGER,
    text_snippet TEXT NOT NULL,
    confidence_score REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attribute_id) REFERENCES product_attributes(id) ON DELETE CASCADE
);

-- 5. Human Review Audit Log Table (Tracking Approvals, Edits, and Rejections)
CREATE TABLE IF NOT EXISTS review_logs (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    attribute_key TEXT NOT NULL,
    previous_value TEXT,
    new_value TEXT,
    action TEXT NOT NULL, -- 'approve', 'edit', 'reject', 'notes'
    reviewer_id TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for high-performance security queries
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_attributes_product ON product_attributes(product_id);
CREATE INDEX IF NOT EXISTS idx_evidence_attribute ON attribute_evidence(attribute_id);
CREATE INDEX IF NOT EXISTS idx_review_product ON review_logs(product_id);
