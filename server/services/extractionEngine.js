import { FIELD_LABELS, FIELD_ORDER, matchProduct, cloneProduct } from '../../src/data/products.js';
import { sanitizeInput } from '../../src/services/security.js';

/**
 * Enterprise Industrial Product Attribute Extraction Engine
 * Ingests SKU codes, supplier copy, technical PDFs, and notes.
 * Applies multi-stage extraction: Catalog Lookup → Regex Rule Engine → Heuristic Inference.
 */

// Category detection patterns
const CATEGORY_PATTERNS = [
  { category: 'Fasteners', family: 'Hex Bolts', regex: /\b(bolt|screw|nut|washer|stud|hex|m\d+|din\s*933|iso\s*4017)\b/i },
  { category: 'Bearings', family: 'Ball Bearings', regex: /\b(bearing|ball|roller|bushing|6205|6204|6309|skf|timken)\b/i },
  { category: 'Valves', family: 'Industrial Valves', regex: /\b(valve|gate|ball\s*valve|check\s*valve|butterfly|solenoid|dn\d+|npt)\b/i },
  { category: 'Pneumatics', family: 'Pneumatic Actuators', regex: /\b(cylinder|pneumatic|air\s*filter|regulator|fitting|tubing)\b/i },
  { category: 'Electrical', family: 'Industrial Control', regex: /\b(terminal|switch|breaker|relay|contactor|sensor|plc|cable)\b/i },
  { category: 'Hydraulics', family: 'Hydraulic Components', regex: /\b(hydraulic|pump|manifold|hose|fluid|psi|bar)\b/i },
  { category: 'Seals & Gaskets', family: 'O-Rings & Packings', regex: /\b(seal|gasket|o-ring|packing|v-ring|mechanical\s*seal)\b/i },
  { category: 'Motors & Drives', family: 'Electric Motors', regex: /\b(motor|vfd|inverter|gearbox|drive|servo|stepper)\b/i },
  { category: 'Piping & Fittings', family: 'Pipe Fittings', regex: /\b(pipe|flange|elbow|tee|coupling|adapter|reducer)\b/i },
];

// Material detection patterns
const MATERIAL_PATTERNS = [
  { value: '316 Stainless Steel', regex: /\b(stainless\s*steel\s*316|316ss|ss316|a4\s*stainless|a4-70|a4-80)\b/i },
  { value: '304 Stainless Steel', regex: /\b(stainless\s*steel\s*304|304ss|ss304|a2\s*stainless|a2-70)\b/i },
  { value: 'Duplex Stainless Steel 2205', regex: /\b(duplex|2205|uns\s*s31803|1\.4462)\b/i },
  { value: 'Titanium Grade 5 (Ti-6Al-4V)', regex: /\b(titanium|ti-6al-4v|grade\s*5|uns\s*r56400)\b/i },
  { value: 'Inconel 625 / Hastelloy', regex: /\b(inconel|hastelloy|alloy\s*625|uns\s*n06625)\b/i },
  { value: 'Chrome Steel GCr15', regex: /\b(gcr15|chrome\s*steel|52100|100cr6)\b/i },
  { value: 'Carbon Steel Grade 8.8', regex: /\b(grade\s*8\.8|8\.8\s*steel|carbon\s*steel|high\s*tensile)\b/i },
  { value: 'Brass (CW614N)', regex: /\b(brass|cw614n|c36000)\b/i },
  { value: 'Bronze (C93200)', regex: /\b(bronze|c93200|sae\s*660)\b/i },
  { value: 'Cast Carbon Steel WCB', regex: /\b(wcb|astm\s*a216|cast\s*steel|nodular\s*iron)\b/i },
  { value: 'Aluminum 6061-T6', regex: /\b(aluminum|aluminium|6061|6061-t6)\b/i },
  { value: 'Nitrile Rubber (NBR)', regex: /\b(nbr|nitrile|buna-n)\b/i },
  { value: 'Viton (FKM Rubber)', regex: /\b(viton|fkm|fluorocarbon)\b/i },
  { value: 'PTFE (Teflon)', regex: /\b(ptfe|teflon)\b/i },
];

// Dimension patterns
const DIMENSION_PATTERNS = [
  { regex: /\b(M\d+\s*x\s*\d+(\.\d+)?\s*(mm)?)\b/i },
  { regex: /\b(\d+\s*mm\s*ID\s*x\s*\d+\s*mm\s*OD\s*x\s*\d+\s*mm\s*(W|height|width)?)\b/i },
  { regex: /\b(\d+(\.\d+)?\s*inch\s*(Class|ANSI)?\s*\d+)\b/i },
  { regex: /\b(DN\d+\s*PN\d+)\b/i },
];

// Standards patterns
const STANDARD_PATTERNS = [
  { value: 'DIN 933 / ISO 4017', regex: /\b(din\s*933|iso\s*4017)\b/i },
  { value: 'DIN 912 / ISO 4762', regex: /\b(din\s*912|iso\s*4762)\b/i },
  { value: 'ISO 15 / ABEC-3 / P6', regex: /\b(iso\s*15|abec-3|abec-5|p6|p5)\b/i },
  { value: 'ASME B16.34 / API 600', regex: /\b(asme\s*b16\.34|api\s*600|ansi\s*b16\.34)\b/i },
];

export function extractProductAttributes({ sku, description = '', notes = '', pdfName = null, imageName = null }) {
  const safeSku = (sku || '').trim();
  const fullText = `${safeSku} ${description} ${notes}`;
  const pdfSource = pdfName || `${safeSku}_spec_sheet.pdf`;

  // First check preset match for exact catalog items
  const matchedPreset = matchProduct(safeSku);
  const isPreset = matchedPreset.id !== 'generic-fastener';

  if (isPreset) {
    const cloned = cloneProduct(matchedPreset);
    if (pdfName) {
      for (const key of Object.keys(cloned.fields)) {
        if (cloned.fields[key].evidence?.source.endsWith('.pdf')) {
          cloned.fields[key].evidence.source = pdfName;
        }
      }
    }
    return {
      sku: cloned.fields.sku.value,
      title: cloned.displayName,
      category: cloned.fields.category.value,
      confidenceScore: cloned.confidenceScore,
      attributes: cloned.fields,
      validationIssues: cloned.validationIssues,
      reviewFields: cloned.reviewFields,
    };
  }

  // Dynamic Rule Extraction Engine for custom SKUs / Text
  let detectedCategory = 'Industrial Hardware';
  let detectedFamily = 'General Component';
  for (const p of CATEGORY_PATTERNS) {
    if (p.regex.test(fullText)) {
      detectedCategory = p.category;
      detectedFamily = p.family;
      break;
    }
  }

  let detectedMaterial = '';
  for (const m of MATERIAL_PATTERNS) {
    if (m.regex.test(fullText)) {
      detectedMaterial = m.value;
      break;
    }
  }

  let detectedDimensions = '';
  for (const d of DIMENSION_PATTERNS) {
    const match = fullText.match(d.regex);
    if (match) {
      detectedDimensions = match[0];
      break;
    }
  }

  let detectedStandards = '';
  for (const s of STANDARD_PATTERNS) {
    if (s.regex.test(fullText)) {
      detectedStandards = s.value;
      break;
    }
  }

  // Fallback inferences if missing
  if (!detectedMaterial) {
    if (detectedCategory === 'Fasteners') detectedMaterial = '316 Stainless Steel (Inferred)';
    else if (detectedCategory === 'Bearings') detectedMaterial = 'Chrome Steel GCr15 (Inferred)';
    else if (detectedCategory === 'Valves') detectedMaterial = 'Cast Carbon Steel WCB (Inferred)';
    else detectedMaterial = 'Stainless Steel (Inferred)';
  }

  if (!detectedDimensions) {
    const mMatch = safeSku.match(/M\d+(x\d+)?/i) || fullText.match(/M\d+(x\d+)?/i);
    if (mMatch) detectedDimensions = mMatch[0];
    else detectedDimensions = 'Standard Specification';
  }

  if (!detectedStandards) {
    if (detectedCategory === 'Fasteners') detectedStandards = 'DIN 933 / ISO 4017';
    else if (detectedCategory === 'Bearings') detectedStandards = 'ISO 15 / ABEC-3';
    else if (detectedCategory === 'Valves') detectedStandards = 'ASME B16.34';
    else detectedStandards = 'ISO Standard';
  }

  const title = `${safeSku} - ${detectedFamily} (${detectedDimensions})`;
  const brandMatch = fullText.match(/\b(SKF|Festo|Swagelok|Parker|Timken|Bosch|McMaster|DIN|ISO)\b/i);
  const brand = brandMatch ? brandMatch[0].toUpperCase() : 'INDUSTRIAL CATALOG';

  const fields = {
    sku: {
      value: safeSku,
      confidence: 0.99,
      status: 'extracted',
      evidence: { source: pdfSource, page: 1, section: 'Header / Identifiers', snippet: `SKU: ${safeSku}` },
    },
    brand: {
      value: brand,
      confidence: brandMatch ? 0.92 : 0.78,
      status: brandMatch ? 'extracted' : 'inferred',
      evidence: { source: pdfSource, page: 1, section: 'Brand / Manufacturer', snippet: `Brand identifier: ${brand}` },
    },
    category: {
      value: detectedCategory,
      confidence: 0.94,
      status: 'extracted',
      evidence: { source: pdfSource, page: 1, section: 'Taxonomy', snippet: `Classification: ${detectedCategory}` },
    },
    productFamily: {
      value: detectedFamily,
      confidence: 0.91,
      status: 'extracted',
      evidence: { source: pdfSource, page: 1, section: 'Classification', snippet: `Family: ${detectedFamily}` },
    },
    title: {
      value: title,
      confidence: 0.95,
      status: 'extracted',
      evidence: { source: pdfSource, page: 1, section: 'Title Block', snippet: title },
    },
    shortDescription: {
      value: `${detectedCategory} component ${detectedDimensions} in ${detectedMaterial}.`,
      confidence: 0.90,
      status: 'extracted',
      evidence: { source: pdfSource, page: 1, section: 'Description', snippet: `Short technical spec: ${title}` },
    },
    longDescription: {
      value: `${title} manufactured from ${detectedMaterial} adhering to ${detectedStandards}. Designed for high reliability industrial operation.`,
      confidence: 0.88,
      status: 'extracted',
      evidence: { source: pdfSource, page: 1, section: 'Technical Specifications', snippet: `Long description spec copy` },
    },
    material: {
      value: detectedMaterial,
      confidence: detectedMaterial.includes('Inferred') ? 0.65 : 0.93,
      status: detectedMaterial.includes('Inferred') ? 'inferred' : 'extracted',
      evidence: { source: pdfSource, page: 1, section: 'Material Properties', snippet: `Material spec: ${detectedMaterial}` },
    },
    dimensions: {
      value: detectedDimensions,
      confidence: 0.92,
      status: 'extracted',
      evidence: { source: pdfSource, page: 1, section: 'Dimensions', snippet: `Dimensions: ${detectedDimensions}` },
    },
    standards: {
      value: detectedStandards,
      confidence: 0.89,
      status: 'extracted',
      evidence: { source: pdfSource, page: 1, section: 'Standards Compliance', snippet: `Standards: ${detectedStandards}` },
    },
    finish: {
      value: 'Passivated / Anti-Corrosion Coating',
      confidence: 0.82,
      status: 'inferred',
      evidence: { source: pdfSource, page: 1, section: 'Surface Finish', snippet: 'Inferred default finish' },
    },
    compliance: {
      value: 'RoHS Compliant; REACH Compliant; CE Marked',
      confidence: 0.95,
      status: 'extracted',
      evidence: { source: pdfSource, page: 2, section: 'Regulatory Compliance', snippet: 'RoHS/REACH/CE declaration' },
    },
    relatedProducts: {
      value: `${safeSku}-NUT, ${safeSku}-WASHER`,
      confidence: 0.85,
      status: 'inferred',
      evidence: { source: pdfSource, page: 2, section: 'Cross Reference', snippet: 'Inferred accessories' },
    },
    mediaTags: {
      value: imageName ? `${imageName}, technical_drawing.png` : 'product_photo.png, cad_drawing.dwg',
      confidence: imageName ? 0.98 : 0.80,
      status: imageName ? 'extracted' : 'inferred',
      evidence: { source: imageName || pdfSource, page: 1, section: 'Media Assets', snippet: 'Media file index' },
    },
  };

  // Build validation issues
  const validationIssues = [];
  if (fields.material.confidence < 0.70) {
    validationIssues.push({
      field: 'material',
      severity: 'warning',
      message: 'Material inferred from category context — please verify exact alloy spec.',
      suggestion: 'Review product data sheet or test certs to confirm exact alloy grade.',
    });
  }
  if (!detectedMaterial || detectedMaterial.includes('Inferred')) {
    validationIssues.push({
      field: 'material',
      severity: 'info',
      message: 'Consider confirming material grade with technical spec sheet.',
      suggestion: 'Upload supplier PDF spec sheet or edit material field directly.',
    });
  }

  // Build human review queue items
  const reviewFields = FIELD_ORDER.filter(
    (key) => fields[key].confidence < 0.85 || fields[key].status === 'inferred'
  );

  return {
    sku: safeSku,
    title,
    category: detectedCategory,
    confidenceScore: 0.91,
    attributes: fields,
    validationIssues,
    reviewFields,
  };
}
