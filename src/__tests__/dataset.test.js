import { describe, it, expect } from 'vitest';
import { runPipeline } from '../services/pipeline.js';
import { matchProduct } from '../data/products.js';

describe('Sample Dataset Pipeline Integration', () => {
  it('should match and enrich Diablo Sanding Belt (DCB518ASTS06G) from sample dataset', async () => {
    const product = matchProduct('DCB518ASTS06G');
    expect(product).toBeDefined();
    expect(product.fields.sku.value).toBe('DCB518ASTS06G');

    const record = await runPipeline(
      { sku: 'DCB518ASTS06G', description: '', notes: '' },
      () => {},
      { skipAnimation: true }
    );

    expect(record).toBeDefined();
    expect(record.sku).toBe('DCB518ASTS06G');
    expect(record.attributes.title.value).toContain('Diablo');
    expect(record.attributes.brand.value).toContain('Freud');
    expect(record.attributes.category.value).toBe('Abrasives & Sanding');
  });

  it('should match and enrich Milwaukee Cut Off Disc (49-94-0013) from sample dataset', async () => {
    const record = await runPipeline(
      { sku: '49-94-0013', description: '', notes: '' },
      () => {},
      { skipAnimation: true }
    );

    expect(record).toBeDefined();
    expect(record.sku).toBe('49-94-0013');
    expect(record.attributes.brand.value).toContain('Milwaukee');
    expect(record.attributes.category.value).toBe('Abrasives & Cutting Discs');
  });

  it('should match and enrich KitchenAid Dishwasher (KDFM404KPS) from sample dataset', async () => {
    const record = await runPipeline(
      { sku: 'KDFM404KPS', description: '', notes: '' },
      () => {},
      { skipAnimation: true }
    );

    expect(record).toBeDefined();
    expect(record.sku).toBe('KDFM404KPS');
    expect(record.attributes.category.value).toBe('Commercial Appliances');
  });
});
