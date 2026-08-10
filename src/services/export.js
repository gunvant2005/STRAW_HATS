import { FIELD_LABELS, FIELD_ORDER } from '../data/products.js';
import { getState } from '../state/appState.js';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

function skuSlug() {
  const { productRecord, input } = getState();
  const sku = productRecord?.sku?.value || input.sku || 'product';
  return String(sku).replace(/[^\w.-]+/g, '_');
}

export function buildFullJson(overrideState = null) {
  const s = overrideState?.attributes ? {
    selectedProductId: overrideState.id || overrideState.sku,
    productTitle: overrideState.title,
    phase: 'complete',
    input: { sku: overrideState.sku || '' },
    productRecord: overrideState.attributes,
    validationIssues: overrideState.validationIssues || [],
    reviewQueue: [],
  } : (overrideState || getState());

  const attributes = {};
  for (const key of FIELD_ORDER) {
    const f = s.productRecord?.[key];
    if (!f) continue;
    attributes[key] = {
      label: FIELD_LABELS[key] || key,
      value: f.value,
      confidence: f.confidence,
      status: f.status,
      evidence: f.evidence,
    };
  }

  return {
    sku: s.productRecord?.sku?.value || s.input?.sku || 'product',
    meta: {
      generatedAt: new Date().toISOString(),
      productId: s.selectedProductId,
      displayName: s.productTitle,
      phase: s.phase,
      sourceInputs: {
        sku: s.input?.sku,
        description: s.input?.description,
        notes: s.input?.notes,
        pdf: s.input?.pdf?.name || null,
        image: s.input?.image?.name || null,
      },
    },
    metadata: {
      exportedAt: new Date().toISOString(),
    },
    attributes,
    validation: {
      issues: s.validationIssues || [],
      summary: {
        errors: (s.validationIssues || []).filter((i) => i.severity === 'error').length,
        warnings: (s.validationIssues || []).filter((i) => i.severity === 'warning').length,
        info: (s.validationIssues || []).filter((i) => i.severity === 'info').length,
      },
    },
    review: {
      queue: s.reviewQueue || [],
      completed: (s.reviewQueue || []).filter((q) => q.status !== 'pending').length,
      total: (s.reviewQueue || []).length,
    },
  };
}

export function buildCsv(overrideState = null) {
  const s = overrideState?.attributes ? {
    input: { sku: overrideState.sku },
    productRecord: overrideState.attributes,
  } : (overrideState || getState());

  const header = ['SKU', 'Attribute', 'Value', 'Confidence', 'Status', 'Source', 'Page', 'Section'];
  const rows = [header.join(',')];

  const escape = (v) => {
    const str = String(v ?? '');
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const keys = s.productRecord ? Object.keys(s.productRecord) : FIELD_ORDER;
  for (const key of keys) {
    const f = s.productRecord?.[key];
    if (!f) continue;
    rows.push(
      [
        s.input?.sku || s.productRecord?.sku?.value || 'SKU',
        FIELD_LABELS[key] || key,
        f.value,
        f.confidence,
        f.status,
        f.evidence?.source,
        f.evidence?.page,
        f.evidence?.section,
      ]
        .map(escape)
        .join(',')
    );
  }

  return rows.join('\n');
}

export function buildPimJson(overrideState = null) {
  const s = overrideState?.attributes ? {
    input: { sku: overrideState.sku },
    productTitle: overrideState.title,
    productRecord: overrideState.attributes,
    reviewQueue: [],
  } : (overrideState || getState());

  const productId = s.productRecord?.sku?.value || s.input?.sku || 'UNKNOWN';

  const attributes = {};
  const keys = s.productRecord ? Object.keys(s.productRecord) : FIELD_ORDER;
  for (const key of keys) {
    const f = s.productRecord?.[key];
    if (!f) continue;
    attributes[key] = f.value;
  }

  const complianceRaw = s.productRecord?.compliance?.value || '';
  const compliance = complianceRaw
    ? complianceRaw.split(/[;,]/).map((c) => c.trim()).filter(Boolean)
    : [];

  const mediaTags = (s.productRecord?.mediaTags?.value || '')
    .split(/[,]/)
    .map((t) => t.trim())
    .filter(Boolean);

  const related = (s.productRecord?.relatedProducts?.value || '')
    .split(/[,]/)
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    pim_record_id: productId,
    title: s.productRecord?.title?.value || s.productTitle,
    brand: s.productRecord?.brand?.value || '',
    category: s.productRecord?.category?.value || '',
    productFamily: s.productRecord?.productFamily?.value || '',
    attributes,
    relatedProducts: related,
    media: [
      {
        type: s.input?.image ? 'image' : 'document',
        fileName: s.input?.image?.name || s.input?.pdf?.name || null,
        tags: mediaTags,
      },
    ],
    compliance,
    reviewMetadata: {
      reviewedFields: (s.reviewQueue || [])
        .filter((q) => q.status !== 'pending')
        .map((q) => ({
          field: q.field,
          action: q.status,
          notes: q.notes,
        })),
      exportedAt: new Date().toISOString(),
    },
  };
}

export function exportJson() {
  const data = buildFullJson();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${skuSlug()}_product_intelligence.json`);
}

export function exportCsv() {
  const csv = buildCsv();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `${skuSlug()}_product_intelligence.csv`);
}

export function exportPim() {
  const data = buildPimJson();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${skuSlug()}_pim_ready.json`);
}
