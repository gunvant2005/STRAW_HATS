import { FIELD_LABELS, FIELD_ORDER } from '../data/products.js';
import { Badge, statusLabel, escapeHtml } from './shared/Badge.js';
import { SkeletonRows } from './shared/Skeleton.js';
import { EmptyState } from './shared/EmptyState.js';
import { getFieldEntries } from '../state/appState.js';

function confidenceClass(c) {
  if (c < 0.7) return 'is-low';
  if (c < 0.85) return 'is-med';
  return '';
}

const searchIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>`;
const copyIcon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;

export function ProductOutput(state) {
  const entries = getFieldEntries(state);
  const isProcessing = state.phase === 'processing' && !entries.length;
  const isExtracting =
    state.phase === 'processing' &&
    state.pipelineSteps.find((s) => s.id === 'extraction')?.status === 'running';
  const totalFields = state.productRecord ? FIELD_ORDER.length : 0;

  let body;
  if (state.phase === 'empty' && !state.productRecord) {
    body = EmptyState({
      title: 'No product record yet',
      text: 'Structured product intelligence will appear here after the pipeline extracts and enriches attributes.',
      compact: true,
      icon: '▤',
    });
  } else if (isProcessing || (isExtracting && !entries.length)) {
    body = `
      <div class="product-table-wrap" aria-busy="true" aria-label="Loading product attributes">
        ${SkeletonRows(8)}
      </div>
    `;
  } else if (state.productRecord) {
    if (entries.length === 0) {
      body = `
        <div style="padding:var(--space-6)">
          ${EmptyState({
            title: 'No matching fields',
            text: `No attributes match “${escapeHtml(state.outputFilter)}”. Try a different search term.`,
            compact: true,
            icon: '🔍',
          })}
        </div>
      `;
    } else {
      body = `
      <div class="product-table-wrap">
        <table class="product-table">
          <thead>
            <tr>
              <th scope="col">Attribute</th>
              <th scope="col">Value</th>
              <th scope="col">Confidence</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            ${entries
              .map((entry) => {
                const selected = state.selectedField === entry.key;
                const needsReview =
                  entry.confidence < 0.7 ||
                  state.reviewQueue.some((q) => q.field === entry.key && q.status === 'pending');
                const hasValue = entry.value !== '' && entry.value != null;
                const display = hasValue
                  ? `<div class="field-value-wrap"><span>${escapeHtml(entry.value)}</span><button type="button" class="copy-btn" data-action="copy-field" data-field="${escapeHtml(entry.key)}" title="Copy value" aria-label="Copy ${escapeHtml(FIELD_LABELS[entry.key] || entry.key)} value">${copyIcon}</button></div>`
                  : '<span style="color:var(--text-muted);font-style:italic">— missing —</span>';
                return `
                  <tr
                    class="${selected ? 'is-selected' : ''} ${needsReview ? 'is-review' : ''}"
                    data-action="select-field"
                    data-field="${escapeHtml(entry.key)}"
                    tabindex="0"
                    aria-selected="${selected}"
                  >
                    <td class="field-name">${escapeHtml(FIELD_LABELS[entry.key] || entry.key)}</td>
                    <td class="field-value field-value-cell ${entry.key === 'sku' ? 'field-value--mono' : ''}">${display}</td>
                    <td>
                      <div class="confidence-cell">
                        <div class="confidence-bar" aria-hidden="true">
                          <div class="confidence-bar__fill ${confidenceClass(entry.confidence)}" style="width:${Math.round(entry.confidence * 100)}%"></div>
                        </div>
                        <span class="confidence-pct">${Math.round(entry.confidence * 100)}%</span>
                      </div>
                    </td>
                    <td>${Badge({ label: statusLabel(entry.status), variant: entry.status })}</td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;
    }
  } else {
    body = EmptyState({
      title: 'Awaiting extraction',
      text: 'Attribute extraction has not produced a record yet.',
      compact: true,
    });
  }

  const avgConfidence = state.productRecord && entries.length
    ? Math.round((entries.reduce((acc, e) => acc + (e.confidence || 0), 0) / entries.length) * 100)
    : 0;
  const pendingCount = state.reviewQueue.filter((q) => q.status === 'pending').length;
  const validationScore = state.validationIssues ? Math.max(0, 100 - state.validationIssues.length * 5) : 100;

  const kpiBar = state.productRecord
    ? `
      <div class="kpi-summary-bar">
        <div class="kpi-card">
          <span class="kpi-card__label">Total Attributes</span>
          <span class="kpi-card__val">${entries.length} / ${totalFields}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card__label">Avg Confidence</span>
          <span class="kpi-card__val kpi-card__val--success">${avgConfidence}%</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card__label">Validation Score</span>
          <span class="kpi-card__val kpi-card__val--accent">${validationScore}%</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card__label">Pending Review</span>
          <span class="kpi-card__val ${pendingCount > 0 ? 'kpi-card__val--warning' : 'kpi-card__val--success'}">${pendingCount}</span>
        </div>
      </div>
    `
    : '';

  return `
    <section class="card" aria-labelledby="output-heading">
      <div class="card__header">
        <div>
          <h3 id="output-heading">Structured product output</h3>
          <p style="margin-top:4px;color:var(--text-muted);font-size:var(--text-sm)">
            Commerce-ready attributes with confidence scoring. Select a row to inspect evidence.
          </p>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-2)">
          ${
            state.productRecord
              ? `<div class="btn-group" style="margin-right:var(--space-2)">
                  <button type="button" class="btn btn--secondary btn--sm" data-action="export-json" title="Download Full JSON">⬇ JSON</button>
                  <button type="button" class="btn btn--secondary btn--sm" data-action="export-csv" title="Download CSV">⬇ CSV</button>
                  <button type="button" class="btn btn--secondary btn--sm" data-action="export-pim" title="Download PIM JSON">⬇ PIM</button>
                </div>
                <div class="search-field" role="search" style="min-width:180px">
                  ${searchIcon}
                  <input
                    type="search"
                    id="output-filter"
                    placeholder="Search fields…"
                    value="${escapeHtml(state.outputFilter)}"
                    aria-label="Filter product attributes"
                  />
                </div>`
              : ''
          }
          ${
            state.productRecord
              ? `<span class="badge badge--neutral">${entries.length}/${totalFields} fields</span>`
              : ''
          }
        </div>
      </div>
      <div class="card__body" style="padding:0">
        ${kpiBar}
        ${body}
      </div>
    </section>
  `;
}
