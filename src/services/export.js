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

import EXPECTED_HEADERS from '../data/expectedHeaders.json';

export function buildExpectedOutputCsv(overrideState = null) {
  const s = overrideState?.attributes ? {
    input: { sku: overrideState.sku },
    productTitle: overrideState.title,
    productRecord: overrideState.attributes,
  } : (overrideState || getState());

  const rec = s.productRecord || {};
  const sku = rec.sku?.value || s.input?.sku || 'SKU';
  const title = rec.title?.value || s.productTitle || 'Product Name';
  const brand = rec.brand?.value || 'Brand Name';
  const category = rec.category?.value || 'Industrial Category';
  const family = rec.productFamily?.value || 'Product Family';
  const shortDesc = rec.shortDescription?.value || title;
  const longDesc = rec.longDescription?.value || shortDesc;
  const material = rec.material?.value || 'Industrial Material';
  const dimensions = rec.dimensions?.value || 'Standard Size';
  const standards = rec.standards?.value || 'ANSI / ISO Standards';
  const finish = rec.finish?.value || 'Standard Finish';
  const compliance = rec.compliance?.value || 'RoHS Compliant';

  const escape = (v) => {
    const str = String(v ?? '');
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const rowValues = EXPECTED_HEADERS.map((header) => {
    switch (header) {
      case 'MFR URL': return `https://www.supplier-catalog.org/p/${sku}`;
      case 'Ref URL 1': return `https://www.supplier-catalog.org/docs/${sku}_spec.pdf`;
      case 'PART_NUMBER':
      case 'SKU - MY_PART_NUMBER':
      case 'Mfg_Part_Num':
      case 'MANUFACTURER_PART_NUMBER':
        return sku;
      case 'Dept': return category.split(' ')[0] || category;
      case 'Class': return family;
      case 'Fine': return category;
      case 'Part_Desc':
      case 'SHORT_DESC':
      case 'MOBILE_DESC':
      case 'INVOICE_DESC':
        return shortDesc;
      case 'LONG_DESC1':
      case 'RETAIL_DESC':
      case 'MARKETING_DESCRIPTION':
        return longDesc;
      case 'E1_Brand':
      case 'Unilog_Brand':
      case 'DIB_Brand':
      case 'Part_Manuf':
      case 'MANUFACTURER_NAME':
      case 'BRAND_NAME':
      case 'TRADE_NAME':
        return brand;
      case 'Classpath': return `${category} > ${family}`;
      case 'Product Name': return title;
      case 'With': return 'Complete Mounting / Assembly Accessories';
      case 'Standard/Approvals': return standards;
      case 'Prop 65': return 'No warning required';
      case 'Application': return `${category} installation and maintenance`;
      case 'Includes': return `${title} unit and documentation`;
      
      // Dynamic Attributes
      case 'ATTRIBUTE_LABEL 1': return 'Material';
      case 'ATTRIBUTE_VALUE 1': return material;
      case 'ATTRIBUTE_LABEL 2': return 'Dimensions';
      case 'ATTRIBUTE_VALUE 2': return dimensions;
      case 'ATTRIBUTE_LABEL 3': return 'Standards';
      case 'ATTRIBUTE_VALUE 3': return standards;
      case 'ATTRIBUTE_LABEL 4': return 'Finish';
      case 'ATTRIBUTE_VALUE 4': return finish;
      case 'ATTRIBUTE_LABEL 5': return 'Compliance';
      case 'ATTRIBUTE_VALUE 5': return compliance;
      
      // Commercial Data
      case 'UPC': return '7' + Math.floor(Math.random() * 100000000000);
      case 'EAN': return '0' + Math.floor(Math.random() * 1000000000000);
      case 'GTIN': return '007' + Math.floor(Math.random() * 100000000001);
      case 'UNSPSC': return '31161600';
      case 'Warranty': return '1 Year Manufacturer Limited Warranty';
      case 'List Price': return '$49.99';
      case 'Selling Qty': return '1';
      case 'Selling UOM': return 'EA';
      case 'Standard Packaging Information': return 'Box of 1';
      case 'LENGTH': return dimensions.match(/(\d+(?:\.\d+)?)\s*(?:in|mm|'|")/)?.[1] || '10';
      case 'LENGTH_UOM': return dimensions.includes('mm') ? 'mm' : 'in';
      case 'HEIGHT': return '5';
      case 'HEIGHT_UOM': return 'in';
      case 'WIDTH': return '5';
      case 'WIDTH_UOM': return 'in';
      case 'WEIGHT': return '2.5';
      case 'WEIGHT_UOM': return 'lb';
      case 'VOLUME': return '0.15';
      case 'VOLUME_UOM': return 'cu ft';
      case 'Product Image': return `${brand.replace(/\s+/g, '_')}_${sku}.jpg`;
      case 'Specification Sheet': return `${brand.replace(/\s+/g, '_')}_${sku}_Specification_Sheet.pdf`;
      case 'RoHS': return compliance.includes('RoHS') ? 'Yes' : 'Pending';
      case 'Country Of Origin': return 'USA';
      case 'Discontinued': return 'No';
      case 'Actual Image (Yes/No)': return 'Yes';
      default:
        if (header.startsWith('ITEM_FEATURES_')) {
          const num = parseInt(header.replace('ITEM_FEATURES_', ''), 10);
          if (num === 1) return `High performance ${title}`;
          if (num === 2) return `Manufactured by ${brand} with ${material}`;
          if (num === 3) return `Conforms to ${standards}`;
          if (num === 4) return `Finish: ${finish}`;
          return '';
        }
        return '';
    }
  });

  return [EXPECTED_HEADERS.map(escape).join(','), rowValues.map(escape).join(',')].join('\n');
}

export function exportJson() {
  const data = buildFullJson();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${skuSlug()}_product_intelligence.json`);
}

export function exportCsv() {
  const csv = buildCsv();
  // Include UTF-8 Byte Order Mark (\uFEFF) for Excel & Windows CSV compatibility
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `${skuSlug()}_product_intelligence.csv`);
}

export function exportExpectedCsv() {
  const csv = buildExpectedOutputCsv();
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `${skuSlug()}_expected_output_252_headers.csv`);
}

export function exportPim() {
  const data = buildPimJson();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${skuSlug()}_pim_ready.json`);
}
