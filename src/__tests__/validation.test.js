import { describe, it, expect } from 'vitest';
import { runValidationRules, summarizeIssues, issuesForField } from '../data/validationRules.js';

describe('Validation Engine', () => {
  it('should detect missing required fields in product attributes', () => {
    const incompleteRecord = {
      sku: 'TEST-SKU',
      attributes: {
        material: { value: 'Steel', confidence: 0.9 },
        // missing standard attributes
      },
    };

    const issues = runValidationRules(incompleteRecord);
    expect(issues.some((i) => i.type === 'missing_field')).toBe(true);
  });

  it('should flag low confidence attributes', () => {
    const lowConfRecord = {
      sku: 'TEST-SKU',
      attributes: {
        material: { value: 'Steel', confidence: 0.4 },
      },
    };

    const issues = runValidationRules(lowConfRecord);
    expect(issues.some((i) => i.type === 'low_confidence')).toBe(true);
  });

  it('should return no issues for complete, high-confidence product record', () => {
    const completeRecord = {
      sku: 'HEX-M12-50',
      attributes: {
        material: { value: '316 Stainless Steel', confidence: 0.95 },
        category: { value: 'Fasteners', confidence: 0.98 },
        title: { value: 'Hex Head Bolt M12 × 50', confidence: 0.96 },
        brand: { value: 'NordicFast', confidence: 0.92 },
      },
    };

    const issues = runValidationRules(completeRecord);
    expect(issues).toHaveLength(0);
  });

  it('should summarize issues by severity correctly', () => {
    const issues = [
      { field: 'material', severity: 'error', message: 'Missing material' },
      { field: 'category', severity: 'warning', message: 'Low confidence' },
      { field: 'brand', severity: 'info', message: 'Suggested verify' },
    ];
    const summary = summarizeIssues(issues);
    expect(summary.error).toBe(1);
    expect(summary.warning).toBe(1);
    expect(summary.info).toBe(1);
  });

  it('should filter issues for a specific field', () => {
    const issues = [
      { field: 'material', severity: 'error', message: 'Missing material' },
      { field: 'brand', severity: 'warning', message: 'Low confidence' },
    ];
    const materialIssues = issuesForField(issues, 'material');
    expect(materialIssues).toHaveLength(1);
    expect(materialIssues[0].field).toBe('material');
  });
});
