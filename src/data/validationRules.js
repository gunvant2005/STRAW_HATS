/**
 * Validation rule definitions used to document checks.
 * Actual issues are authored per product in products.js;
 * this module provides helpers to filter and summarize.
 */

export const VALIDATION_CHECKS = [
  {
    id: 'missing_required',
    label: 'Missing required fields',
    description: 'Flags empty values for commerce-critical attributes.',
  },
  {
    id: 'unit_consistency',
    label: 'Unit consistency',
    description: 'Detects mixed measurement units within a single attribute.',
  },
  {
    id: 'duplicate_conflict',
    label: 'Duplicate or conflicting values',
    description: 'Surfaces synonymous or competing material/spec strings.',
  },
  {
    id: 'category_mismatch',
    label: 'Category mismatches',
    description: 'Checks taxonomy alignment between category and product family.',
  },
  {
    id: 'low_confidence',
    label: 'Low-confidence attributes',
    description: 'Queues attributes below the confidence review threshold.',
  },
];

export const CONFIDENCE_REVIEW_THRESHOLD = 0.7;

/** Required attribute keys that every product record must contain. */
const REQUIRED_ATTRIBUTE_KEYS = ['material', 'category', 'title', 'brand'];

/**
 * Run validation rules against a product record.
 * Returns an array of issue objects with { type, field, message, severity }.
 * Supported types: 'missing_field', 'low_confidence'
 *
 * @param {{ sku: string, attributes: Record<string, { value: any, confidence: number }> }} record
 * @returns {Array<{ type: string, field: string, message: string, severity: string }>}
 */
export function runValidationRules(record) {
  const issues = [];
  const attrs = record?.attributes ?? {};

  // Check for missing required fields
  for (const key of REQUIRED_ATTRIBUTE_KEYS) {
    if (!attrs[key] || attrs[key].value === undefined || attrs[key].value === null || attrs[key].value === '') {
      issues.push({
        type: 'missing_field',
        field: key,
        message: `Required attribute '${key}' is missing or empty.`,
        severity: 'error',
      });
    }
  }

  // Check for low-confidence attributes
  for (const [key, attr] of Object.entries(attrs)) {
    if (attr && typeof attr.confidence === 'number' && attr.confidence < CONFIDENCE_REVIEW_THRESHOLD) {
      issues.push({
        type: 'low_confidence',
        field: key,
        message: `Attribute '${key}' has low confidence (${(attr.confidence * 100).toFixed(0)}%).`,
        severity: 'warning',
      });
    }
  }

  return issues;
}

export function summarizeIssues(issues = []) {
  const counts = { error: 0, warning: 0, info: 0 };
  for (const issue of issues) {
    if (counts[issue.severity] !== undefined) counts[issue.severity] += 1;
  }
  return counts;
}

export function issuesForField(issues = [], fieldKey) {
  return issues.filter((i) => i.field === fieldKey);
}
