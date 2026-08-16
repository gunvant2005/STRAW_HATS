import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveStateSnapshot,
  loadStateSnapshot,
  clearStateSnapshot,
} from '../services/storage.js';

// ── localStorage mock ──────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Storage Service (auto-save & recovery)', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should save a state snapshot to localStorage', () => {
    const state = {
      input: { sku: 'HEX-M12-50', description: 'Bolt', notes: '' },
      activeStage: 'review',
      phase: 'review',
      productRecord: { sku: { value: 'HEX-M12-50' } },
      reviewQueue: [],
      theme: 'dark',
    };

    const result = saveStateSnapshot(state);
    expect(result).toBe(true);

    // Allow debounce to settle
    vi.useFakeTimers();
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('should load a previously saved state snapshot', () => {
    const fakeSnapshot = {
      version: 1,
      savedAt: new Date().toISOString(),
      data: {
        input: { sku: 'BOLT-999', description: 'Test', notes: '' },
        activeStage: 'export',
        phase: 'complete',
        productRecord: { sku: { value: 'BOLT-999' } },
        reviewQueue: [],
        theme: 'light',
      },
    };

    localStorageMock.setItem(
      'product_intelligence_workspace_v1',
      JSON.stringify(fakeSnapshot)
    );

    const loaded = loadStateSnapshot();
    expect(loaded).not.toBeNull();
    expect(loaded.data.input.sku).toBe('BOLT-999');
    expect(loaded.data.activeStage).toBe('export');
    expect(loaded.data.theme).toBe('light');
  });

  it('should return null when no snapshot exists', () => {
    expect(loadStateSnapshot()).toBeNull();
  });

  it('should return null for a corrupted snapshot', () => {
    localStorageMock.setItem('product_intelligence_workspace_v1', '{ broken json :::');
    expect(loadStateSnapshot()).toBeNull();
  });

  it('should clear the snapshot from localStorage', () => {
    localStorageMock.setItem('product_intelligence_workspace_v1', '{"version":1,"data":{}}');
    const cleared = clearStateSnapshot();
    expect(cleared).toBe(true);
    expect(localStorageMock.getItem('product_intelligence_workspace_v1')).toBeNull();
  });
});
