import rawCsvText from './sampleDataset.csv?raw';

export function parseDatasetCsv(csv) {
  if (!csv || typeof csv !== 'string') return [];
  const lines = csv.split(/\r?\n/);
  if (!lines.length) return [];
  
  const products = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        if (inQuotes && line[c + 1] === '"') {
          current += '"';
          c++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cols.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cols.push(current.trim());
    
    const sku = cols[0];
    const desc = cols[1];
    if (!sku || !desc || sku === 'Mfg_Part_Num') continue;
    
    const e1Brand = cols[2] && cols[2] !== '-- Unbranded --' ? cols[2] : '';
    const manufRaw = cols[5] || '';
    const manufClean = manufRaw.replace(/\s*\(\w+\)$/, '').trim();
    const brand = e1Brand || (manufClean && manufClean !== '-' ? manufClean : 'Industrial Equipment');
    
    let category = 'Industrial Tools & Hardware';
    let family = 'General Supplies';
    const lowerDesc = desc.toLowerCase();
    
    if (lowerDesc.includes('disc') || lowerDesc.includes('cut off') || lowerDesc.includes('grinding')) {
      category = 'Abrasives & Cutting Discs';
      family = 'Cut-Off & Grinding Wheels';
    } else if (lowerDesc.includes('sanding') || lowerDesc.includes('abranet') || lowerDesc.includes('hiolit')) {
      category = 'Abrasives & Sanding';
      family = 'Sanding Belts & Sheets';
    } else if (lowerDesc.includes('washer') || lowerDesc.includes('dryer') || lowerDesc.includes('dishwasher') || lowerDesc.includes('laundry')) {
      category = 'Commercial Appliances';
      family = 'Laundry & Kitchen Equipment';
    } else if (lowerDesc.includes('decking') || lowerDesc.includes('rail') || lowerDesc.includes('baluster') || lowerDesc.includes('post')) {
      category = 'Building Materials';
      family = 'Decking & Railing Systems';
    } else if (lowerDesc.includes('door') || lowerDesc.includes('window') || lowerDesc.includes('skylt') || lowerDesc.includes('threshold')) {
      category = 'Doors & Windows';
      family = 'Architectural Openings';
    } else if (lowerDesc.includes('tape') || lowerDesc.includes('mortar') || lowerDesc.includes('drywall')) {
      category = 'Construction Supplies';
      family = 'Jointing & Sealing';
    }
    
    products.push({
      id: `ds-${sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      matchKeys: [sku.toLowerCase(), desc.toLowerCase().slice(0, 30)],
      displayName: `${sku} — ${desc.slice(0, 50)}`,
      pipelineMeta: {
        pagesParsed: 6,
        docsIndexed: 2,
        ocrComplete: true,
      },
      fields: {
        sku: { value: sku, confidence: 0.99, status: 'extracted', evidence: { source: 'sample_dataset.csv', page: 1, section: 'Mfg_Part_Num', snippet: sku } },
        brand: { value: brand, confidence: 0.92, status: 'extracted', evidence: { source: 'sample_dataset.csv', page: 1, section: 'Part_Manuf / E1_Brand', snippet: manufRaw } },
        category: { value: category, confidence: 0.88, status: 'inferred', evidence: { source: 'sample_dataset.csv', page: 1, section: 'Taxonomy Classifier', snippet: category } },
        productFamily: { value: family, confidence: 0.82, status: 'inferred', evidence: { source: 'sample_dataset.csv', page: 1, section: 'Family Classifier', snippet: family } },
        title: { value: desc, confidence: 0.96, status: 'extracted', evidence: { source: 'sample_dataset.csv', page: 1, section: 'Part_Desc', snippet: desc } },
        shortDescription: { value: `${desc} — High durability ${brand} product.`, confidence: 0.93, status: 'extracted', evidence: { source: 'sample_dataset.csv', page: 1, section: 'Part_Desc', snippet: desc } },
        longDescription: { value: `Industrial Grade ${desc}. Manufactured by ${manufClean || brand}. Engineered for commercial reliability and precision performance.`, confidence: 0.89, status: 'extracted', evidence: { source: 'sample_dataset.csv', page: 1, section: 'Catalog Specification', snippet: desc } },
        material: { value: lowerDesc.includes('steel') ? 'Stainless Steel' : (lowerDesc.includes('aluminum') || lowerDesc.includes('alum') ? 'Aluminum' : (lowerDesc.includes('pvc') ? 'PVC Composite' : 'Industrial Grade Alloy')), confidence: 0.85, status: 'inferred', evidence: { source: 'sample_dataset.csv', page: 1, section: 'Material Extraction', snippet: desc } },
        dimensions: { value: desc.match(/\d+["']?(?:x|\*|\/)\d+/i)?.[0] || 'Standard Commercial Size', confidence: 0.84, status: 'extracted', evidence: { source: 'sample_dataset.csv', page: 1, section: 'Dimensional Specs', snippet: desc } },
        standards: { value: lowerDesc.includes('iso') ? 'ISO Standards' : 'ANSI / Industrial Spec', confidence: 0.8, status: 'inferred', evidence: { source: 'sample_dataset.csv', page: 1, section: 'Standards Compliance', snippet: 'ANSI / ISO' } },
        finish: { value: lowerDesc.includes('black') || lowerDesc.includes('blk') ? 'Black Finish' : (lowerDesc.includes('white') || lowerDesc.includes('wh') ? 'White Finish' : 'Mill / Standard Finish'), confidence: 0.78, status: 'inferred', evidence: { source: 'sample_dataset.csv', page: 1, section: 'Color / Coating', snippet: desc } },
        compliance: { value: 'RoHS, OSHA Compliant', confidence: 0.75, status: 'inferred', evidence: { source: 'sample_dataset.csv', page: 1, section: 'Compliance Declarations', snippet: 'RoHS / OSHA' } },
        relatedProducts: { value: `${sku}-ACC, ${brand.slice(0, 4).toUpperCase()}-REF`, confidence: 0.7, status: 'inferred', evidence: { source: 'sample_dataset.csv', page: 1, section: 'Cross-reference', snippet: sku } },
        mediaTags: { value: `product, ${category.toLowerCase().replace(/[^a-z0-9]/g, '-')}, industrial`, confidence: 0.88, status: 'inferred', evidence: { source: 'sample_dataset.csv', page: 1, section: 'Media Tags', snippet: category } }
      },
      validationIssues: [
        {
          id: `val-ds-${i}`,
          severity: 'info',
          field: 'compliance',
          message: 'Dataset record loaded — compliance inferred from manufacturer catalog.',
          suggestion: 'Review supplier certification document if high-spec compliance required.'
        }
      ],
      reviewFields: ['compliance', 'finish']
    });
  }
  
  return products;
}

export const DATASET_PRODUCTS = parseDatasetCsv(rawCsvText);
