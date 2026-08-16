import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pipelineRateLimiter } from '../services/security.js';
import { cancelPipeline, runPipeline } from '../services/pipeline.js';
import { initAnalytics, trackEvent, getEventLog } from '../services/analytics.js';

// ── localStorage + sessionStorage mock for analytics & auth ────────────────
const storeMock = (() => {
  let store = {};
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: storeMock, writable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: storeMock, writable: true });

// ── Rate Limiter Tests ─────────────────────────────────────────────────────
describe('Rate Limiter (security.js)', () => {
  beforeEach(() => {
    pipelineRateLimiter.reset();
  });

  it('should allow executions up to the max attempts limit', () => {
    for (let i = 0; i < 5; i++) {
      expect(pipelineRateLimiter.canExecute()).toBe(true);
    }
  });

  it('should deny execution after exceeding the rate limit', () => {
    for (let i = 0; i < 5; i++) {
      pipelineRateLimiter.canExecute();
    }
    expect(pipelineRateLimiter.canExecute()).toBe(false);
  });

  it('should reset the rate limit counter', () => {
    for (let i = 0; i < 5; i++) {
      pipelineRateLimiter.canExecute();
    }
    pipelineRateLimiter.reset();
    expect(pipelineRateLimiter.canExecute()).toBe(true);
  });

  it('should slide the window to allow executions after time passes', () => {
    vi.useFakeTimers();
    pipelineRateLimiter.reset();
    for (let i = 0; i < 5; i++) pipelineRateLimiter.canExecute();
    expect(pipelineRateLimiter.canExecute()).toBe(false);
    // Advance time beyond the 10s window
    vi.advanceTimersByTime(11000);
    expect(pipelineRateLimiter.canExecute()).toBe(true);
    vi.useRealTimers();
  });
});

// ── Pipeline Cancellation Tests ────────────────────────────────────────────
describe('Pipeline Cancellation (pipeline.js)', () => {
  it('should cancel a running pipeline without throwing', async () => {
    // Start a pipeline (with animations) but cancel it immediately
    const pipelinePromise = runPipeline(
      { sku: 'HEX-M12-50', description: '', notes: '' },
      () => {},
      { skipAnimation: false }
    );
    cancelPipeline();
    // After cancellation, the promise should resolve (not throw)
    const result = await pipelinePromise;
    // Cancelled pipelines return undefined
    expect(result).toBeUndefined();
  });

  it('should return undefined for an empty SKU without running', async () => {
    const result = await runPipeline(
      { sku: '', description: '', notes: '' },
      () => {},
      { skipAnimation: true }
    );
    expect(result).toBeUndefined();
  });
});

// ── Analytics Service Tests ────────────────────────────────────────────────
describe('Analytics Service (analytics.js)', () => {
  it('should initialize without errors when analytics is disabled', () => {
    expect(() => initAnalytics()).not.toThrow();
  });

  it('should track events and maintain a capped event log', () => {
    trackEvent('Test', 'test_action', 'label_value', 42);
    const log = getEventLog();
    expect(log.length).toBeGreaterThan(0);
    const latest = log[0];
    expect(latest.category).toBe('Test');
    expect(latest.action).toBe('test_action');
    expect(latest.label).toBe('label_value');
    expect(latest.value).toBe(42);
    expect(latest.timestamp).toBeDefined();
  });

  it('should cap event log at 100 entries', () => {
    for (let i = 0; i < 110; i++) {
      trackEvent('Stress', `action_${i}`);
    }
    const log = getEventLog();
    expect(log.length).toBeLessThanOrEqual(100);
  });

  it('should return a copy of the event log, not the internal reference', () => {
    const log1 = getEventLog();
    const log2 = getEventLog();
    expect(log1).not.toBe(log2); // different array references
    expect(log1).toEqual(log2); // same content
  });
});
