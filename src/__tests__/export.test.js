import { describe, it, expect } from 'vitest';
import { buildFullJson, buildCsv, buildPimJson } from '../services/export.js';

describe('Export Formatter Service', () => {
  const sampleRecord = {
    sku: 'HEX-M12-50',
    title: 'Hex Bolt M12x50',
    attributes: {
      material: { label: 'Material', value: '316 Stainless Steel', confidence: 0.95 },
      thread_size: { label: 'Thread Size', value: 'M12', confidence: 0.98 },
    },
    evidence: [],
    validationIssues: [],
  };

  it('should build full JSON structure with metadata', () => {
    const json = buildFullJson(sampleRecord);

    expect(json.sku).toBe('HEX-M12-50');
    expect(json.attributes.material.value).toBe('316 Stainless Steel');
    expect(json.metadata.exportedAt).toBeDefined();
  });

  it('should build valid CSV string containing header and product row', () => {
    const csvStr = buildCsv(sampleRecord);
    expect(csvStr).toContain('SKU,Attribute,Value,Confidence');
    expect(csvStr).toContain('HEX-M12-50');
  });

  it('should build valid PIM-ready JSON format', () => {
    const pimJson = buildPimJson(sampleRecord);

    expect(pimJson.pim_record_id).toBe('HEX-M12-50');
    expect(pimJson.attributes.material).toBe('316 Stainless Steel');
  });
});
