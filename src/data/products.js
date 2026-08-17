/** Field key → display label */
export const FIELD_LABELS = {
  sku: 'SKU',
  brand: 'Brand',
  category: 'Category',
  productFamily: 'Product Family',
  title: 'Title',
  shortDescription: 'Short Description',
  longDescription: 'Long Description',
  material: 'Material',
  dimensions: 'Dimensions',
  standards: 'Standards',
  finish: 'Finish',
  compliance: 'Compliance',
  relatedProducts: 'Related Products',
  mediaTags: 'Media Tags',
};

export const FIELD_ORDER = Object.keys(FIELD_LABELS);

function field(value, confidence, status, evidence) {
  return { value, confidence, status, evidence };
}

function evidence(source, page, section, snippet) {
  return { source, page, section, snippet };
}

/** Hex Bolt M12×50 */
const hexBolt = {
  id: 'hex-bolt',
  matchKeys: ['hex-m12-50', 'hex bolt', 'hexbolt', 'm12x50', 'm12×50'],
  displayName: 'Hex Bolt M12×50',
  pipelineMeta: {
    pagesParsed: 8,
    docsIndexed: 2,
    ocrComplete: true,
  },
  fields: {
    sku: field(
      'HEX-M12-50',
      0.98,
      'extracted',
      evidence(
        'TechSheet_HEX-M12_v3.pdf',
        1,
        'Header — Product Identification',
        'Part Number: HEX-M12-50\nDescription: Hex Head Bolt M12 × 50 mm'
      )
    ),
    brand: field(
      'NordicFast Industrial',
      0.91,
      'extracted',
      evidence(
        'TechSheet_HEX-M12_v3.pdf',
        1,
        'Header — Manufacturer',
        'Manufacturer: NordicFast Industrial GmbH\nBrand: NordicFast'
      )
    ),
    category: field(
      'Fasteners',
      0.88,
      'inferred',
      evidence(
        'Catalog_Fasteners_2024.pdf',
        12,
        'Section 3 — Hex Bolts',
        'Category path: Fasteners > Hex Bolts > Metric'
      )
    ),
    productFamily: field(
      'Structural Hardware',
      0.72,
      'inferred',
      evidence(
        'Catalog_Fasteners_2024.pdf',
        12,
        'Section 3 — Family Mapping',
        'Product family assignment: Structural Hardware (metric hex series)'
      )
    ),
    title: field(
      'Hex Head Bolt M12 × 50 mm, Stainless Steel 304',
      0.96,
      'extracted',
      evidence(
        'TechSheet_HEX-M12_v3.pdf',
        1,
        'Product Title',
        'Hex Head Bolt M12 × 50 mm, Stainless Steel 304, Full Thread'
      )
    ),
    shortDescription: field(
      'Metric hex head bolt, M12 × 50 mm, A2 stainless, DIN 933 compliant.',
      0.93,
      'extracted',
      evidence(
        'TechSheet_HEX-M12_v3.pdf',
        2,
        'Section 1.1 — Summary',
        'Short description: Metric hex head bolt, M12 × 50 mm, A2 stainless, DIN 933 compliant.'
      )
    ),
    longDescription: field(
      'Full-thread hex head bolt manufactured from stainless steel 304 (A2). Designed for structural and machinery fastening where corrosion resistance is required. Thread pitch 1.75 mm. Suitable for indoor and outdoor industrial environments when paired with matching nuts and washers.',
      0.9,
      'extracted',
      evidence(
        'TechSheet_HEX-M12_v3.pdf',
        2,
        'Section 1.2 — Description',
        'Full-thread hex head bolt manufactured from stainless steel 304 (A2). Designed for structural and machinery fastening where corrosion resistance is required.'
      )
    ),
    material: field(
      'Stainless Steel 304 (A2)',
      0.94,
      'extracted',
      evidence(
        'TechSheet_HEX-M12_v3.pdf',
        4,
        'Section 2.1 — Mechanical Properties',
        'Material: Stainless Steel 304 / AISI 304 / A2\nTensile strength: ≥ 700 MPa'
      )
    ),
    dimensions: field(
      'M12 × 50 mm (pitch 1.75 mm); head AF 18 mm',
      0.85,
      'extracted',
      evidence(
        'TechSheet_HEX-M12_v3.pdf',
        3,
        'Section 1.4 — Dimensions',
        'Nominal diameter: M12\nLength: 50 mm (2.0 in)\nThread pitch: 1.75 mm\nAcross flats (AF): 18 mm'
      )
    ),
    standards: field(
      'DIN 933, ISO 4017',
      0.95,
      'extracted',
      evidence(
        'TechSheet_HEX-M12_v3.pdf',
        5,
        'Section 3 — Standards',
        'Conforms to: DIN 933 (hexagon head screws, full thread)\nAlso referenced: ISO 4017'
      )
    ),
    finish: field(
      '',
      0.42,
      'inferred',
      evidence(
        'TechSheet_HEX-M12_v3.pdf',
        4,
        'Section 2.2 — Surface',
        'Surface condition: mill finish (not explicitly specified as coated)'
      )
    ),
    compliance: field(
      'RoHS, REACH',
      0.62,
      'inferred',
      evidence(
        'Catalog_Fasteners_2024.pdf',
        48,
        'Appendix B — Compliance Declarations',
        'Series HEX-M** declared RoHS and REACH compliant. Individual lot certificates on request.'
      )
    ),
    relatedProducts: field(
      'HEX-NUT-M12, WASHER-M12-A2, HEX-M12-40',
      0.8,
      'inferred',
      evidence(
        'Catalog_Fasteners_2024.pdf',
        13,
        'Section 3.2 — Compatible Components',
        'Recommended pairing: HEX-NUT-M12, WASHER-M12-A2\nAlternate length: HEX-M12-40'
      )
    ),
    mediaTags: field(
      'product, fastener, hex-bolt, stainless, metric',
      0.87,
      'inferred',
      evidence(
        'product_hex_m12.jpg',
        1,
        'Image metadata / vision tags',
        'Detected: hex head fastener, metallic finish, metric bolt profile'
      )
    ),
  },
  validationIssues: [
    {
      id: 'hex-finish-missing',
      severity: 'error',
      field: 'finish',
      message: 'Finish not found in source documents',
      suggestion: 'Confirm mill finish or specify coating (e.g. plain A2, passivated).',
    },
    {
      id: 'hex-unit',
      severity: 'warning',
      field: 'dimensions',
      message: 'Length listed as 50 mm and 2.0 in — verify unit consistency',
      suggestion: 'Normalize to millimetres as primary unit; retain inch as secondary.',
    },
    {
      id: 'hex-material-dup',
      severity: 'warning',
      field: 'material',
      message: 'Material listed as SS304 vs Stainless Steel 304 (duplicate phrasing)',
      suggestion: 'Standardize on “Stainless Steel 304 (A2)”.',
    },
    {
      id: 'hex-category',
      severity: 'info',
      field: 'productFamily',
      message: "Category 'Fasteners' vs family 'Structural Hardware' — confirm taxonomy mapping",
      suggestion: 'Align PIM taxonomy so family nests under Fasteners.',
    },
    {
      id: 'hex-compliance-low',
      severity: 'warning',
      field: 'compliance',
      message: 'Compliance field: 62% confidence',
      suggestion: 'Attach lot-level RoHS/REACH certificate or approve inferred declaration.',
    },
  ],
  reviewFields: ['finish', 'compliance', 'productFamily', 'dimensions'],
};

/** Deep Groove Ball Bearing 6205-2RS */
const ballBearing = {
  id: 'ball-bearing',
  matchKeys: ['bb-6205-2rs', 'ball bearing', '6205-2rs', '6205'],
  displayName: 'Deep Groove Ball Bearing 6205-2RS',
  pipelineMeta: {
    pagesParsed: 14,
    docsIndexed: 2,
    ocrComplete: true,
  },
  fields: {
    sku: field(
      'BB-6205-2RS',
      0.99,
      'extracted',
      evidence(
        'Datasheet_6205-2RS.pdf',
        1,
        'Header — Designation',
        'Bearing designation: 6205-2RS\nInternal SKU: BB-6205-2RS'
      )
    ),
    brand: field(
      'PrecisionDrive Bearings',
      0.92,
      'extracted',
      evidence(
        'Datasheet_6205-2RS.pdf',
        1,
        'Manufacturer block',
        'PrecisionDrive Bearings AG — Deep Groove Series 62'
      )
    ),
    category: field(
      'Bearings',
      0.94,
      'extracted',
      evidence(
        'Datasheet_6205-2RS.pdf',
        2,
        'Classification',
        'Product category: Rolling bearings > Deep groove ball bearings'
      )
    ),
    productFamily: field(
      'Single Row Deep Groove',
      0.9,
      'extracted',
      evidence(
        'Datasheet_6205-2RS.pdf',
        2,
        'Series overview',
        'Family: Single row deep groove ball bearings, series 62'
      )
    ),
    title: field(
      'Deep Groove Ball Bearing 6205-2RS, Rubber Sealed',
      0.97,
      'extracted',
      evidence(
        'Datasheet_6205-2RS.pdf',
        1,
        'Title',
        '6205-2RS Deep Groove Ball Bearing — Contact rubber seals both sides'
      )
    ),
    shortDescription: field(
      'Single-row deep groove ball bearing, 25×52×15 mm, 2RS contact seals.',
      0.95,
      'extracted',
      evidence(
        'Datasheet_6205-2RS.pdf',
        1,
        'Summary',
        'd×D×B = 25 × 52 × 15 mm; seals: 2RS (NBR contact)'
      )
    ),
    longDescription: field(
      'Metric deep groove ball bearing with dual contact rubber seals (2RS). Optimized for moderate radial and axial loads in electric motors, gearboxes, and industrial machinery. Pre-lubricated with lithium soap grease. Limiting speed depends on load and lubrication condition.',
      0.91,
      'extracted',
      evidence(
        'Datasheet_6205-2RS.pdf',
        3,
        'Section 2 — Application',
        'Optimized for moderate radial and axial loads in electric motors, gearboxes, and industrial machinery. Pre-lubricated with lithium soap grease.'
      )
    ),
    material: field(
      'Chrome steel (AISI 52100) rings & balls; NBR seals',
      0.89,
      'extracted',
      evidence(
        'Datasheet_6205-2RS.pdf',
        4,
        'Section 3.1 — Materials',
        'Rings/balls: Chrome steel AISI 52100 (100Cr6)\nSeals: Nitrile rubber (NBR)\nCage: Pressed steel'
      )
    ),
    dimensions: field(
      '25 × 52 × 15 mm (bore × OD × width)',
      0.98,
      'extracted',
      evidence(
        'Datasheet_6205-2RS.pdf',
        2,
        'Dimensional table',
        'd = 25 mm | D = 52 mm | B = 15 mm\nMass ≈ 0.128 kg'
      )
    ),
    standards: field(
      'ISO 15, ISO 492 (class P0)',
      0.86,
      'extracted',
      evidence(
        'Datasheet_6205-2RS.pdf',
        5,
        'Section 4 — Standards',
        'Boundary dimensions per ISO 15\nTolerance class: Normal (P0) per ISO 492'
      )
    ),
    finish: field(
      'Ground raceways; black oxide optional on request',
      0.58,
      'inferred',
      evidence(
        'Datasheet_6205-2RS.pdf',
        4,
        'Section 3.2 — Surface',
        'Standard: ground raceways. Optional black oxide finish available on request — not confirmed for this SKU.'
      )
    ),
    compliance: field(
      'RoHS',
      0.7,
      'inferred',
      evidence(
        'Compliance_Pack_Bearings.pdf',
        2,
        'RoHS statement',
        '62xx-2RS series materials declared RoHS compliant. REACH SVHC statement available separately.'
      )
    ),
    relatedProducts: field(
      'BB-6204-2RS, BB-6206-2RS, HSG-6205',
      0.83,
      'inferred',
      evidence(
        'Catalog_Bearings_Q2.pdf',
        22,
        'Cross-sell matrix',
        'Adjacent sizes: 6204-2RS, 6206-2RS\nHousing: HSG-6205 pillow block compatible'
      )
    ),
    mediaTags: field(
      'product, bearing, deep-groove, sealed, metric',
      0.9,
      'inferred',
      evidence(
        'bearing_6205_hero.jpg',
        1,
        'Vision classification',
        'Detected: sealed ball bearing, metric deep groove profile, industrial component'
      )
    ),
  },
  validationIssues: [
    {
      id: 'bb-finish-low',
      severity: 'warning',
      field: 'finish',
      message: 'Finish attribute: 58% confidence — optional coating not confirmed',
      suggestion: 'Confirm standard ground finish or remove optional black oxide from record.',
    },
    {
      id: 'bb-compliance',
      severity: 'warning',
      field: 'compliance',
      message: 'REACH declaration missing; only RoHS inferred',
      suggestion: 'Request REACH SVHC statement from supplier pack.',
    },
    {
      id: 'bb-load-missing',
      severity: 'info',
      field: 'longDescription',
      message: 'Dynamic/static load ratings present in datasheet but not mapped to structured fields',
      suggestion: 'Consider extending schema with C and C0 load attributes for PIM.',
    },
  ],
  reviewFields: ['finish', 'compliance'],
};

/** Gate Valve 150mm Class 150 */
const gateValve = {
  id: 'gate-valve',
  matchKeys: ['iv-gate-150', 'gate valve', 'valve 150', 'class 150'],
  displayName: 'Gate Valve 150 mm Class 150',
  pipelineMeta: {
    pagesParsed: 22,
    docsIndexed: 3,
    ocrComplete: true,
  },
  fields: {
    sku: field(
      'IV-GATE-150',
      0.97,
      'extracted',
      evidence(
        'SpecSheet_GateValve_150_CL150.pdf',
        1,
        'Identification',
        'Model: IV-GATE-150\nSize: DN150 / 6″\nPressure class: ASME Class 150'
      )
    ),
    brand: field(
      'FlowCore Valves',
      0.93,
      'extracted',
      evidence(
        'SpecSheet_GateValve_150_CL150.pdf',
        1,
        'Manufacturer',
        'FlowCore Valves Ltd. — Industrial Gate Series IV-GATE'
      )
    ),
    category: field(
      'Industrial Valves',
      0.95,
      'extracted',
      evidence(
        'SpecSheet_GateValve_150_CL150.pdf',
        2,
        'Product classification',
        'Category: Industrial Valves > Gate Valves > Flanged'
      )
    ),
    productFamily: field(
      'Rising Stem Gate Valves',
      0.88,
      'extracted',
      evidence(
        'SpecSheet_GateValve_150_CL150.pdf',
        2,
        'Family',
        'Product family: Rising stem OS&Y gate valves, Class 150–300'
      )
    ),
    title: field(
      'DN150 Class 150 Flanged Gate Valve, WCB Body',
      0.96,
      'extracted',
      evidence(
        'SpecSheet_GateValve_150_CL150.pdf',
        1,
        'Title block',
        'DN150 / 6″ ASME Class 150 Flanged Gate Valve — ASTM A216 WCB body'
      )
    ),
    shortDescription: field(
      'Flanged rising-stem gate valve, DN150, ASME Class 150, WCB body, API 600.',
      0.94,
      'extracted',
      evidence(
        'SpecSheet_GateValve_150_CL150.pdf',
        1,
        'Summary',
        'Flanged rising-stem gate valve, DN150, ASME Class 150, WCB body, designed to API 600.'
      )
    ),
    longDescription: field(
      'Outside screw and yoke (OS&Y) rising stem gate valve for isolation service in water, steam, and hydrocarbon lines. Cast carbon steel body (ASTM A216 WCB) with flanged ends per ASME B16.5 Class 150. Flexible wedge disc, graphite packing, and handwheel operation as standard.',
      0.92,
      'extracted',
      evidence(
        'SpecSheet_GateValve_150_CL150.pdf',
        3,
        'Section 2 — Design',
        'OS&Y rising stem gate valve for isolation service. Cast carbon steel body (ASTM A216 WCB) with flanged ends per ASME B16.5 Class 150.'
      )
    ),
    material: field(
      'Body ASTM A216 WCB; trim 13Cr / SS316 optional',
      0.9,
      'extracted',
      evidence(
        'SpecSheet_GateValve_150_CL150.pdf',
        5,
        'Section 4 — Materials',
        'Body/bonnet: ASTM A216 Grade WCB\nStandard trim: 13% Cr\nOptional trim: Stainless steel 316'
      )
    ),
    dimensions: field(
      'DN150 (6″); face-to-face ASME B16.10; Class 150 flanges',
      0.87,
      'extracted',
      evidence(
        'SpecSheet_GateValve_150_CL150.pdf',
        4,
        'Section 3 — Dimensions',
        'Nominal size: DN150 / 6″\nFace-to-face: ASME B16.10\nEnd flanges: ASME B16.5 Class 150 RF'
      )
    ),
    standards: field(
      'API 600, ASME B16.5, ASME B16.10, ASME B16.34',
      0.96,
      'extracted',
      evidence(
        'SpecSheet_GateValve_150_CL150.pdf',
        6,
        'Section 5 — Standards',
        'Design: API 600\nFlanges: ASME B16.5\nF-F: ASME B16.10\nPressure-temperature: ASME B16.34'
      )
    ),
    finish: field(
      'Exterior enamel (RAL 5010); internal as-cast',
      0.65,
      'inferred',
      evidence(
        'Painting_Spec_FlowCore.pdf',
        1,
        'Standard coating',
        'Default exterior: enamel RAL 5010. Internal surfaces typically as-cast unless lined — confirm for IV-GATE-150.'
      )
    ),
    compliance: field(
      'PED 2014/68/EU Category II; ATEX on request',
      0.55,
      'inferred',
      evidence(
        'CE_Declaration_IV-GATE.pdf',
        1,
        'PED declaration',
        'IV-GATE DN100–DN200 Class 150 declared under PED 2014/68/EU Cat. II. ATEX variants require separate configuration.'
      )
    ),
    relatedProducts: field(
      'IV-GATE-100, IV-GATE-200, IV-ACT-HW-150',
      0.81,
      'inferred',
      evidence(
        'Catalog_Valves_2025.pdf',
        34,
        'Gate series matrix',
        'Related: IV-GATE-100, IV-GATE-200\nHandwheel assembly: IV-ACT-HW-150'
      )
    ),
    mediaTags: field(
      'product, valve, gate-valve, flanged, class-150',
      0.88,
      'inferred',
      evidence(
        'valve_gate_150_iso.jpg',
        1,
        'Vision tags',
        'Detected: industrial gate valve, flanged ends, handwheel operator'
      )
    ),
  },
  validationIssues: [
    {
      id: 'gv-compliance-low',
      severity: 'error',
      field: 'compliance',
      message: 'Compliance field: 55% confidence — ATEX applicability unclear',
      suggestion: 'Confirm PED category and whether ATEX is required for this SKU.',
    },
    {
      id: 'gv-finish',
      severity: 'warning',
      field: 'finish',
      message: 'Finish inferred from painting spec, not product datasheet',
      suggestion: 'Validate RAL 5010 enamel against order configuration.',
    },
    {
      id: 'gv-trim-conflict',
      severity: 'warning',
      field: 'material',
      message: 'Trim listed as 13Cr with SS316 optional — conflicting default',
      suggestion: 'Lock default trim to 13Cr unless option code specifies SS316.',
    },
    {
      id: 'gv-category',
      severity: 'info',
      field: 'category',
      message: 'Category matches family hierarchy — no action required',
      suggestion: 'Keep Industrial Valves > Rising Stem Gate Valves mapping.',
    },
  ],
  reviewFields: ['compliance', 'finish', 'material'],
};

/** Generic fallback for unknown SKUs */
const genericFastener = {
  id: 'generic-fastener',
  matchKeys: [],
  displayName: 'Generic Fastener (unenriched)',
  pipelineMeta: {
    pagesParsed: 3,
    docsIndexed: 1,
    ocrComplete: true,
  },
  fields: {
    sku: field(
      'UNK-FASTENER',
      0.5,
      'inferred',
      evidence('uploaded_document.pdf', 1, 'Detected identifier', 'No exact SKU match in catalog index. Placeholder assigned.')
    ),
    brand: field(
      '',
      0.3,
      'inferred',
      evidence('uploaded_document.pdf', 1, 'Manufacturer', 'Manufacturer string not confidently extracted.')
    ),
    category: field(
      'Fasteners',
      0.55,
      'inferred',
      evidence('uploaded_document.pdf', 1, 'Classification', 'Vision/text cues suggest fastener category.')
    ),
    productFamily: field(
      'Unclassified Hardware',
      0.4,
      'inferred',
      evidence('uploaded_document.pdf', 1, 'Family', 'Insufficient signal for product family.')
    ),
    title: field(
      'Industrial Fastener — Pending Enrichment',
      0.45,
      'inferred',
      evidence('uploaded_document.pdf', 1, 'Title', 'Title synthesized from limited input; requires human review.')
    ),
    shortDescription: field(
      'Limited source data. Structured attributes require enrichment.',
      0.4,
      'inferred',
      evidence('uploaded_document.pdf', 1, 'Summary', 'Short description generated from sparse input.')
    ),
    longDescription: field(
      '',
      0.2,
      'inferred',
      evidence('uploaded_document.pdf', 1, 'Description', 'Long description unavailable from provided sources.')
    ),
    material: field(
      '',
      0.25,
      'inferred',
      evidence('uploaded_document.pdf', 1, 'Material', 'Material not detected.')
    ),
    dimensions: field(
      '',
      0.2,
      'inferred',
      evidence('uploaded_document.pdf', 1, 'Dimensions', 'Dimensional data missing.')
    ),
    standards: field(
      '',
      0.2,
      'inferred',
      evidence('uploaded_document.pdf', 1, 'Standards', 'No standards references found.')
    ),
    finish: field(
      '',
      0.2,
      'inferred',
      evidence('uploaded_document.pdf', 1, 'Finish', 'Finish not specified.')
    ),
    compliance: field(
      '',
      0.2,
      'inferred',
      evidence('uploaded_document.pdf', 1, 'Compliance', 'Compliance declarations not found.')
    ),
    relatedProducts: field(
      '',
      0.2,
      'inferred',
      evidence('uploaded_document.pdf', 1, 'Related', 'Related products unavailable.')
    ),
    mediaTags: field(
      'product, fastener, unenriched',
      0.6,
      'inferred',
      evidence('uploaded_image.jpg', 1, 'Vision tags', 'Generic fastener tags from image classification.')
    ),
  },
  validationIssues: [
    {
      id: 'gen-missing-sku',
      severity: 'error',
      field: 'sku',
      message: 'SKU could not be matched to known catalog entries',
      suggestion: 'Enter a known demo SKU (HEX-M12-50, BB-6205-2RS, IV-GATE-150) or supply richer source docs.',
    },
    {
      id: 'gen-missing-material',
      severity: 'error',
      field: 'material',
      message: 'Required field Material is missing',
      suggestion: 'Provide technical sheet or manually enter material.',
    },
    {
      id: 'gen-low-title',
      severity: 'warning',
      field: 'title',
      message: 'Title confidence below review threshold (45%)',
      suggestion: 'Edit title to commerce-ready wording.',
    },
  ],
  reviewFields: ['sku', 'title', 'material', 'brand'],
};

import { DATASET_PRODUCTS } from './sampleDataset.js';

export const PRODUCTS = [hexBolt, ballBearing, gateValve, ...DATASET_PRODUCTS];

export function matchProduct(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return genericFastener;

  for (const product of PRODUCTS) {
    if (product.fields.sku.value.toLowerCase() === q) {
      return product;
    }
    if (product.matchKeys.some((key) => key && (q === key || q.includes(key) || key.includes(q)))) {
      return product;
    }
  }

  return genericFastener;
}

export function cloneProduct(product) {
  return structuredClone(product);
}
