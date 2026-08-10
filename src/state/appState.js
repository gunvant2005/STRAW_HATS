import { FIELD_LABELS, FIELD_ORDER } from '../data/products.js';
import { saveStateSnapshot } from '../services/storage.js';

export const PIPELINE_STEPS = [
  { id: 'ingestion', label: 'Ingestion' },
  { id: 'parsing', label: 'Document parsing' },
  { id: 'extraction', label: 'Attribute extraction' },
  { id: 'enrichment', label: 'Enrichment' },
  { id: 'validation', label: 'Validation' },
  { id: 'review_queue', label: 'Review queue' },
  { id: 'export', label: 'Export' },
];

export const STAGES = [
  { id: 'input', label: 'Input', description: 'Upload & identify' },
  { id: 'process', label: 'Process', description: 'AI pipeline' },
  { id: 'review', label: 'Review', description: 'Human-in-the-loop' },
  { id: 'export', label: 'Export', description: 'Commerce-ready' },
];

function createIdleSteps() {
  return PIPELINE_STEPS.map((s) => ({
    ...s,
    status: 'idle',
    subtext: '',
  }));
}

function detectInitialTheme() {
  try {
    const stored = localStorage.getItem('pi-theme');
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {}
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function createInitialState() {
  return {
    phase: 'empty', // empty | loading | processing | review | complete | error
    activeStage: 'input',
    skipAnimation: false,
    lastRunAt: null,
    productTitle: null,
    selectedProductId: null,
    theme: detectInitialTheme(),

    input: {
      sku: '',
      description: '',
      notes: '',
      pdf: null,
      image: null,
      imagePreviewUrl: null,
    },
    inputErrors: {},

    pipelineSteps: createIdleSteps(),

    productRecord: null, // { [fieldKey]: { value, confidence, status, evidence } }
    visibleFieldKeys: [], // progressive reveal during extraction
    validationIssues: [],
    reviewQueue: [], // { field, status: pending|approved|edited|rejected, notes, originalValue }
    selectedField: null,
    editingField: null,

    exportEnabled: false,
    toasts: [],

    outputFilter: '', // search string for product output
    undoStack: [], // history of review actions for undo

    // Real-world Auth & DB Explorer state
    user: null,
    dbExplorerOpen: false,
    dbExplorerProducts: [],
    dbExplorerLoading: false,
    dbExplorerError: null,

    authModalOpen: false,
    authModalMode: 'login', // login | register
    authModalLoading: false,
    authModalError: null,
  };
}

let state = createInitialState();
const listeners = new Set();

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  saveStateSnapshot(state);
  for (const listener of listeners) listener(state);
}

export function setState(partial) {
  state = typeof partial === 'function' ? { ...state, ...partial(state) } : { ...state, ...partial };
  notify();
  return state;
}

export function patchState(updater) {
  state = updater({ ...state });
  notify();
  return state;
}

export function resetPipelineUi() {
  if (state.input.imagePreviewUrl) {
    URL.revokeObjectURL(state.input.imagePreviewUrl);
  }
  const preservedTheme = state.theme;
  state = createInitialState();
  state.theme = preservedTheme;
  notify();
}

export function updateInput(partial) {
  setState({
    input: { ...state.input, ...partial },
    inputErrors: {},
  });
}

export function setActiveStage(stageId) {
  setState({ activeStage: stageId });
}

export function selectField(fieldKey) {
  setState({ selectedField: fieldKey });
}

export function toggleTheme() {
  const next = state.theme === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem('pi-theme', next);
  } catch {}
  setState({ theme: next });
}

export function setOutputFilter(value) {
  setState({ outputFilter: value });
}

export function buildReviewQueue(product) {
  return (product.reviewFields || []).map((fieldKey) => ({
    field: fieldKey,
    status: 'pending',
    notes: '',
    originalValue: product.fields[fieldKey]?.value ?? '',
  }));
}

function snapshotForUndo(s, fieldKey) {
  const queueItem = s.reviewQueue.find((q) => q.field === fieldKey);
  const fieldRecord = s.productRecord?.[fieldKey];
  return queueItem && fieldRecord
    ? {
        field: fieldKey,
        queueSnapshot: { ...queueItem },
        fieldSnapshot: { ...fieldRecord },
        phaseSnapshot: s.phase,
      }
    : null;
}

function applyUndoSnapshot(s, snap) {
  if (!snap || !s.productRecord) return s;
  const record = { ...s.productRecord, [snap.field]: { ...snap.fieldSnapshot } };
  const queue = s.reviewQueue.map((q) => (q.field === snap.field ? { ...snap.queueSnapshot } : q));
  const pending = queue.filter((q) => q.status === 'pending').length;
  return {
    ...s,
    productRecord: record,
    reviewQueue: queue,
    phase:
      s.exportEnabled && pending === 0
        ? 'complete'
        : pending > 0
          ? 'review'
          : snap.phaseSnapshot,
  };
}

export function undoLastReviewAction() {
  let restored = false;
  patchState((s) => {
    if (!s.undoStack.length) return s;
    const stack = [...s.undoStack];
    const snap = stack.pop();
    const next = applyUndoSnapshot(s, snap);
    restored = true;
    return { ...next, undoStack: stack, editingField: null };
  });
  return restored;
}

export function applyReviewAction(fieldKey, action, payload = {}) {
  let pushUndo = false;
  let undoSnapshot = null;

  patchState((s) => {
    if (!s.productRecord) return s;

    if (action === 'notes') {
      return {
        ...s,
        reviewQueue: s.reviewQueue.map((item) =>
          item.field === fieldKey ? { ...item, notes: payload.notes ?? '' } : item
        ),
      };
    }

    const preSnap = snapshotForUndo(s, fieldKey);
    const record = { ...s.productRecord };
    const existing = record[fieldKey];
    if (!existing) return s;
    const field = { ...existing };
    const queue = s.reviewQueue.map((item) => {
      if (item.field !== fieldKey) return item;
      if (action === 'approve') {
        return { ...item, status: 'approved', notes: payload.notes ?? item.notes };
      }
      if (action === 'edit') {
        return {
          ...item,
          status: 'edited',
          notes: payload.notes ?? item.notes,
        };
      }
      if (action === 'reject') {
        return { ...item, status: 'rejected', notes: payload.notes ?? item.notes };
      }
      return item;
    });

    if (action === 'approve') {
      field.status = 'reviewed';
    } else if (action === 'edit') {
      field.value = payload.value ?? field.value;
      field.status = 'reviewed';
      field.confidence = Math.max(field.confidence, 0.95);
    } else if (action === 'reject') {
      field.value = '';
      field.status = 'rejected';
      field.confidence = 0;
    }

    record[fieldKey] = field;

    const pending = queue.filter((q) => q.status === 'pending').length;
    const newStack = preSnap && action !== 'notes' ? [...s.undoStack, preSnap].slice(-20) : s.undoStack;

    pushUndo = !!preSnap && action !== 'notes';
    undoSnapshot = preSnap;

    return {
      ...s,
      productRecord: record,
      reviewQueue: queue,
      editingField: action === 'edit' ? null : s.editingField,
      undoStack: newStack,
      phase:
        s.exportEnabled && pending === 0
          ? 'complete'
          : pending > 0
            ? 'review'
            : s.phase,
      validationIssues: s.validationIssues.filter((issue) => {
        if (action === 'approve' || action === 'edit') {
          return !(issue.field === fieldKey && issue.severity !== 'info');
        }
        return true;
      }),
    };
  });
}

export function bulkApprovePending() {
  let count = 0;
  const notesLookup = {};
  document?.querySelectorAll?.('[data-review-notes]').forEach((el) => {
    notesLookup[el.getAttribute('data-review-notes')] = el.value;
  });
  patchState((s) => {
    if (!s.productRecord) return s;
    const pendingItems = s.reviewQueue.filter((q) => q.status === 'pending');
    if (!pendingItems.length) return s;
    count = pendingItems.length;
    const record = { ...s.productRecord };
    const newUndo = [...s.undoStack];
    const queue = s.reviewQueue.map((item) => {
      if (item.status !== 'pending') return item;
      const snap = snapshotForUndo(s, item.field);
      if (snap) newUndo.push(snap);
      const f = { ...record[item.field], status: 'reviewed' };
      record[item.field] = f;
      return { ...item, status: 'approved', notes: notesLookup[item.field] ?? item.notes };
    });
    const pending = queue.filter((q) => q.status === 'pending').length;
    return {
      ...s,
      productRecord: record,
      reviewQueue: queue,
      undoStack: newUndo.slice(-20),
      phase:
        s.exportEnabled && pending === 0
          ? 'complete'
          : pending > 0
            ? 'review'
            : s.phase,
      validationIssues: s.validationIssues.filter(
        (issue) =>
          !pendingItems.some((p) => p.field === issue.field) || issue.severity === 'info'
      ),
    };
  });
  return count;
}

export function bulkRejectPending() {
  let count = 0;
  const notesLookup = {};
  document?.querySelectorAll?.('[data-review-notes]').forEach((el) => {
    notesLookup[el.getAttribute('data-review-notes')] = el.value;
  });
  patchState((s) => {
    if (!s.productRecord) return s;
    const pendingItems = s.reviewQueue.filter((q) => q.status === 'pending');
    if (!pendingItems.length) return s;
    count = pendingItems.length;
    const record = { ...s.productRecord };
    const newUndo = [...s.undoStack];
    const queue = s.reviewQueue.map((item) => {
      if (item.status !== 'pending') return item;
      const snap = snapshotForUndo(s, item.field);
      if (snap) newUndo.push(snap);
      const f = { ...record[item.field], value: '', status: 'rejected', confidence: 0 };
      record[item.field] = f;
      return { ...item, status: 'rejected', notes: notesLookup[item.field] ?? item.notes };
    });
    const pending = queue.filter((q) => q.status === 'pending').length;
    return {
      ...s,
      productRecord: record,
      reviewQueue: queue,
      undoStack: newUndo.slice(-20),
      phase:
        s.exportEnabled && pending === 0
          ? 'complete'
          : pending > 0
            ? 'review'
            : s.phase,
    };
  });
  return count;
}

export function setEditingField(fieldKey) {
  setState({ editingField: fieldKey });
}

export function pushToast(message, type = 'success') {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  setState({ toasts: [...state.toasts, { id, message, type }] });
  setTimeout(() => {
    setState({ toasts: getState().toasts.filter((t) => t.id !== id) });
  }, 3200);
}

export function getReviewedCount(s = state) {
  return s.reviewQueue.filter((q) => q.status !== 'pending').length;
}

export function getFieldEntries(s = state) {
  if (!s.productRecord) return [];
  const keys = s.visibleFieldKeys.length ? s.visibleFieldKeys : FIELD_ORDER;
  let entries = keys
    .filter((k) => s.productRecord[k])
    .map((key) => ({ key, ...s.productRecord[key] }));
  const filter = (s.outputFilter || '').trim().toLowerCase();
  if (filter) {
    entries = entries.filter((e) => {
      const label = (FIELD_LABELS[e.key] || '').toLowerCase();
      const value = String(e.value || '').toLowerCase();
      const status = String(e.status || '').toLowerCase();
      return label.includes(filter) || value.includes(filter) || status.includes(filter);
    });
  }
  return entries;
}
