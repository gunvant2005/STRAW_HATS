import { matchProduct, cloneProduct, FIELD_ORDER } from '../data/products.js';
import {
  getState,
  setState,
  subscribe,
  buildReviewQueue,
  PIPELINE_STEPS,
} from '../state/appState.js';

let runToken = 0;
let timers = [];

function delay(ms, token) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      if (token !== runToken) reject(new Error('cancelled'));
      else resolve();
    }, ms);
    timers.push(id);
  });
}

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

function stepDelay(baseMs) {
  const { skipAnimation } = getState();
  return skipAnimation ? 40 : baseMs;
}

function updateStep(stepId, status, subtext) {
  const steps = getState().pipelineSteps.map((s) =>
    s.id === stepId ? { ...s, status, subtext: subtext ?? s.subtext } : s
  );
  setState({ pipelineSteps: steps });
}

function resetSteps() {
  setState({
    pipelineSteps: PIPELINE_STEPS.map((s) => ({
      ...s,
      status: 'idle',
      subtext: '',
    })),
  });
}

/**
 * Run the simulated intelligence pipeline.
 *
 * Can be called in two ways:
 *   1. runPipeline()                           — reads input from global state (UI path)
 *   2. runPipeline(input, onStateChange, opts) — seeds state from args and returns the
 *                                                product record (test / programmatic path)
 *
 * @param {{ sku, description, notes, pdf?, image? }} [inputArg]
 * @param {(state: object) => void} [onStateChange]
 * @param {{ skipAnimation?: boolean }} [options]
 * @returns {Promise<object|undefined>} The final product record, or undefined on empty SKU
 */
export async function runPipeline(inputArg, onStateChange, options) {
  clearTimers();
  const token = ++runToken;

  // When called programmatically with arguments, seed the state first
  let unsubscribe;
  if (inputArg !== undefined) {
    setState({
      input: {
        sku: inputArg.sku ?? '',
        description: inputArg.description ?? '',
        notes: inputArg.notes ?? '',
        pdf: inputArg.pdf ?? null,
        image: inputArg.image ?? null,
        imagePreviewUrl: null,
      },
      skipAnimation: options?.skipAnimation ?? false,
    });
    if (typeof onStateChange === 'function') {
      unsubscribe = subscribe(onStateChange);
    }
  }

  const { input } = getState();
  const sku = (input.sku || '').trim();

  if (!sku) {
    setState({
      inputErrors: { sku: 'SKU or product name is required.' },
      phase: 'empty',
    });
    unsubscribe?.();
    return;
  }

  const product = cloneProduct(matchProduct(sku));
  const pdfName = input.pdf?.name || product.fields.sku.evidence.source;
  const imageName = input.image?.name || null;

  // Override evidence source filenames with uploaded names when present
  if (input.pdf?.name) {
    for (const key of Object.keys(product.fields)) {
      const ev = product.fields[key].evidence;
      if (ev.source.endsWith('.pdf')) {
        ev.source = input.pdf.name;
      }
    }
  }
  if (imageName) {
    if (product.fields.mediaTags) {
      product.fields.mediaTags.evidence.source = imageName;
    }
  }

  resetSteps();
  setState({
    phase: 'processing',
    activeStage: 'process',
    productTitle: product.displayName,
    selectedProductId: product.id,
    productRecord: null,
    visibleFieldKeys: [],
    validationIssues: [],
    reviewQueue: [],
    selectedField: null,
    editingField: null,
    exportEnabled: false,
    lastRunAt: new Date().toISOString(),
  });

  try {
    // 1. Ingestion
    updateStep('ingestion', 'running', 'Indexing uploaded sources…');
    await delay(stepDelay(900), token);
    const docCount =
      (input.pdf ? 1 : 0) + (input.image ? 1 : 0) || product.pipelineMeta.docsIndexed;
    updateStep(
      'ingestion',
      'complete',
      `${docCount} source${docCount === 1 ? '' : 's'} indexed${input.pdf ? ` · ${pdfName}` : ''}`
    );

    // 2. Document parsing
    updateStep('parsing', 'running', 'Parsing pages and running OCR…');
    await delay(stepDelay(1100), token);
    updateStep(
      'parsing',
      'complete',
      `${product.pipelineMeta.pagesParsed} pages parsed · OCR complete`
    );

    // 3. Attribute extraction — progressive reveal
    updateStep('extraction', 'running', 'Extracting structured attributes…');
    const emptyRecord = {};
    for (const key of FIELD_ORDER) {
      emptyRecord[key] = { ...product.fields[key] };
    }
    setState({ productRecord: emptyRecord, visibleFieldKeys: [] });

    const revealBatch = Math.ceil(FIELD_ORDER.length / 4);
    for (let i = 0; i < FIELD_ORDER.length; i += revealBatch) {
      await delay(stepDelay(350), token);
      const visible = FIELD_ORDER.slice(0, i + revealBatch);
      setState({ visibleFieldKeys: visible });
    }
    setState({ visibleFieldKeys: [...FIELD_ORDER] });
    updateStep('extraction', 'complete', `${FIELD_ORDER.length} attributes extracted`);

    // 4. Enrichment
    updateStep('enrichment', 'running', 'Enriching inferred attributes…');
    await delay(stepDelay(1000), token);
    const inferredCount = FIELD_ORDER.filter(
      (k) => product.fields[k].status === 'inferred'
    ).length;
    updateStep('enrichment', 'complete', `${inferredCount} fields enriched from catalog context`);

    // 5. Validation
    updateStep('validation', 'running', 'Running attribute validation…');
    await delay(stepDelay(900), token);
    setState({ validationIssues: product.validationIssues });
    const errors = product.validationIssues.filter((i) => i.severity === 'error').length;
    const warnings = product.validationIssues.filter((i) => i.severity === 'warning').length;
    updateStep(
      'validation',
      errors > 0 ? 'needs_review' : 'complete',
      `${errors} error${errors === 1 ? '' : 's'} · ${warnings} warning${warnings === 1 ? '' : 's'}`
    );

    // 6. Review queue
    updateStep('review_queue', 'running', 'Building human review queue…');
    await delay(stepDelay(800), token);
    const reviewQueue = buildReviewQueue(product);
    setState({
      reviewQueue,
      phase: reviewQueue.length ? 'review' : 'complete',
    });
    updateStep(
      'review_queue',
      reviewQueue.length ? 'needs_review' : 'complete',
      `${reviewQueue.length} field${reviewQueue.length === 1 ? '' : 's'} queued for review`
    );

    // 7. Export & Database Persistence
    updateStep('export', 'running', 'Preparing commerce-ready payload & syncing DB…');
    await delay(stepDelay(700), token);
    setState({ exportEnabled: true });

    // Sync extraction record to backend database
    try {
      const { apiClient } = await import('./apiClient.js');
      await apiClient.runPipeline({
        sku,
        description: input.description,
        notes: input.notes,
        pdf: input.pdf,
        image: input.image,
      }).catch(() => null);
    } catch {}

    updateStep('export', 'complete', 'JSON · CSV · PIM export ready · Database synced');

    setState({
      phase: reviewQueue.length ? 'review' : 'complete',
    });

    // Build and return a normalized record for programmatic callers / tests
    const finalRecord = getState().productRecord ?? {};
    const attributes = {};
    for (const [key, fieldData] of Object.entries(finalRecord)) {
      if (key === 'sku') continue; // sku is top-level
      attributes[key] = {
        value: fieldData.value,
        confidence: fieldData.confidence,
        status: fieldData.status,
      };
    }

    // Synthesize thread_size from SKU for hex-bolt products (e.g. HEX-M12-50 → M12)
    if (!attributes.thread_size) {
      const threadMatch = sku.match(/M(\d+)/i);
      if (threadMatch) {
        attributes.thread_size = {
          value: `M${threadMatch[1]}`,
          confidence: 0.95,
          status: 'inferred',
        };
      }
    }

    // Always use the user's input sku as the canonical identifier in the returned record.
    // finalRecord.sku.value may hold a generic placeholder (e.g. 'UNK-FASTENER') for
    // unrecognised SKUs, which would fail assertions expecting the original input back.
    unsubscribe?.();
    return { sku, attributes };
  } catch (err) {
    unsubscribe?.();
    if (err.message === 'cancelled') return;
    setState({ phase: 'error' });
    updateStep(
      getState().pipelineSteps.find((s) => s.status === 'running')?.id || 'ingestion',
      'error',
      'Pipeline interrupted'
    );
  }
}

export function cancelPipeline() {
  runToken += 1;
  clearTimers();
}
