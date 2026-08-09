import { db } from '../db/database.js';
import { runPipeline } from '../../src/services/pipeline.js';
import { sanitizeInput } from '../../src/services/security.js';

/**
 * Enterprise Product & Pipeline Database Service
 * Provides database persistence for product records, attributes, evidence, and audit logs.
 */

export async function createOrUpdateProductRecord(inputData, userId = 'usr_system') {
  const safeSku = sanitizeInput(inputData.sku);
  const safeDesc = sanitizeInput(inputData.description || '');
  const safeNotes = sanitizeInput(inputData.notes || '');

  // Check if product already exists in database
  const existing = db.query('products', (p) => p.sku === safeSku);

  // Run pipeline extraction
  const record = await runPipeline(
    { sku: safeSku, description: safeDesc, notes: safeNotes },
    () => {},
    { skipAnimation: true }
  );

  let productId;
  if (existing.length > 0) {
    productId = existing[0].id;
    db.update('products', productId, {
      title: record.title,
      category: record.category,
      confidence_score: record.confidenceScore,
      status: record.status || 'complete',
    });
  } else {
    const inserted = db.insert('products', {
      sku: record.sku,
      title: record.title,
      category: record.category,
      confidence_score: record.confidenceScore,
      status: record.status || 'complete',
      created_by: userId,
    });
    productId = inserted.id;
  }

  // Insert or update attributes in database
  if (record.attributes) {
    for (const [key, attr] of Object.entries(record.attributes)) {
      const existingAttrs = db.query(
        'product_attributes',
        (a) => a.product_id === productId && a.attribute_key === key
      );

      let attrId;
      if (existingAttrs.length > 0) {
        attrId = existingAttrs[0].id;
        db.update('product_attributes', attrId, {
          attribute_value: attr.value,
          confidence: attr.confidence,
          status: attr.status,
        });
      } else {
        const insertedAttr = db.insert('product_attributes', {
          product_id: productId,
          attribute_key: key,
          attribute_label: attr.label || key,
          attribute_value: attr.value,
          confidence: attr.confidence,
          status: attr.status,
        });
        attrId = insertedAttr.id;
      }

      // Store evidence citation if available
      if (attr.evidence) {
        const existingEvidence = db.query(
          'attribute_evidence',
          (e) => e.attribute_id === attrId
        );
        if (existingEvidence.length === 0) {
          db.insert('attribute_evidence', {
            attribute_id: attrId,
            source_document: attr.evidence.source || 'Technical Sheet',
            page_number: attr.evidence.page || 1,
            text_snippet: attr.evidence.snippet || '',
            confidence_score: attr.confidence,
          });
        }
      }
    }
  }

  return getProductRecordBySku(safeSku);
}

/**
 * Retrieve complete product record with attributes and evidence from DB
 */
export function getProductRecordBySku(sku) {
  const products = db.query('products', (p) => p.sku === sku);
  if (products.length === 0) return null;

  const product = products[0];
  const attributes = db.query('product_attributes', (a) => a.product_id === product.id);

  const attrMap = {};
  for (const attr of attributes) {
    const evidenceList = db.query('attribute_evidence', (e) => e.attribute_id === attr.id);
    attrMap[attr.attribute_key] = {
      label: attr.attribute_label,
      value: attr.attribute_value,
      confidence: attr.confidence,
      status: attr.status,
      evidence: evidenceList.length > 0 ? evidenceList[0] : null,
    };
  }

  return {
    id: product.id,
    sku: product.sku,
    title: product.title,
    category: product.category,
    confidenceScore: product.confidence_score,
    status: product.status,
    attributes: attrMap,
    createdAt: product.created_at,
  };
}

/**
 * Apply human review action in DB with full audit trail logging
 */
export function recordReviewAction(sku, attributeKey, action, payload = {}, reviewerId = 'usr_reviewer') {
  const product = getProductRecordBySku(sku);
  if (!product) throw new Error(`Product SKU '${sku}' not found.`);

  const attrs = db.query(
    'product_attributes',
    (a) => a.product_id === product.id && a.attribute_key === attributeKey
  );

  if (attrs.length === 0) throw new Error(`Attribute '${attributeKey}' not found.`);
  const attr = attrs[0];

  const prevValue = attr.attribute_value;
  let newValue = prevValue;
  let newStatus = attr.status;

  if (action === 'approve') {
    newStatus = 'reviewed';
  } else if (action === 'reject') {
    newStatus = 'rejected';
    newValue = '';
  } else if (action === 'edit' && payload.value !== undefined) {
    newStatus = 'reviewed';
    newValue = sanitizeInput(payload.value);
  }

  // Update attribute record
  db.update('product_attributes', attr.id, {
    attribute_value: newValue,
    status: newStatus,
  });

  // Insert audit log entry
  db.insert('review_logs', {
    product_id: product.id,
    attribute_key: attributeKey,
    previous_value: prevValue,
    new_value: newValue,
    action: action,
    reviewer_id: reviewerId,
    notes: payload.notes ? sanitizeInput(payload.notes) : null,
  });

  return getProductRecordBySku(sku);
}
