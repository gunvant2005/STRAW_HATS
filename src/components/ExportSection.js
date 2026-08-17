import { EmptyState } from './shared/EmptyState.js';
import { Badge, escapeHtml } from './shared/Badge.js';

const copyIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;

const jsonIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/><path d="M10 12h4"/><path d="M10 16h4"/><rect x="8" y="1" width="8" height="4" rx="1"/></svg>`;
const csvIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>`;
const pimIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`;

export function ExportSection(state) {
  const enabled = state.exportEnabled && state.productRecord;
  const pending = state.reviewQueue.filter((q) => q.status === 'pending').length;

  return `
    <section class="card" aria-labelledby="export-heading">
      <div class="card__header">
        <div>
          <h3 id="export-heading">Export commerce-ready output</h3>
          <p style="margin-top:4px;color:var(--text-muted);font-size:var(--text-sm)">
            Download structured product intelligence for PIM, ERP, or e-commerce ingestion.
          </p>
        </div>
        ${
          enabled
            ? Badge({ label: 'Ready', variant: 'complete' })
            : Badge({ label: 'Locked', variant: 'idle' })
        }
      </div>
      <div class="card__body">
        ${
          !enabled
            ? EmptyState({
                title: 'Export not available yet',
                text: 'Complete the intelligence pipeline to unlock JSON, CSV, and PIM-ready downloads.',
                compact: true,
                icon: '⇩',
              })
            : `
          ${
            pending > 0
              ? `<div class="phase-banner phase-banner--review" role="status">
                  <strong>${pending} field${pending === 1 ? '' : 's'} still pending review.</strong>
                  You can export now; unresolved items remain flagged in the payload metadata.
                </div>`
              : `<div class="phase-banner phase-banner--success" role="status">
                  <strong>Record ready for handoff.</strong> Validation and review metadata included.
                </div>`
          }
          <div class="export-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))">
            <div class="export-card">
              <div style="color:var(--accent)">${jsonIcon}</div>
              <h3>Full JSON</h3>
              <p>Complete product record with evidence traces, validation summary, and review metadata.</p>
              <div class="btn-group">
                <button type="button" class="btn btn--primary btn--sm" data-action="export-json">Download</button>
                <button type="button" class="btn btn--ghost btn--sm" data-action="copy-export" data-format="json" title="Copy JSON to clipboard">${copyIcon} Copy</button>
              </div>
            </div>
            <div class="export-card">
              <div style="color:var(--success)">${csvIcon}</div>
              <h3>CSV flat file</h3>
              <p>Tabular field / value / confidence / status / source columns for spreadsheet review.</p>
              <div class="btn-group">
                <button type="button" class="btn btn--secondary btn--sm" data-action="export-csv">Download</button>
                <button type="button" class="btn btn--ghost btn--sm" data-action="copy-export" data-format="csv" title="Copy CSV to clipboard">${copyIcon} Copy</button>
              </div>
            </div>
            <div class="export-card">
              <div style="color:var(--warning)">${csvIcon}</div>
              <h3>Enterprise 252-Header CSV</h3>
              <p>100% compliant export matching the Expected Output Sheet (252 static headers).</p>
              <div class="btn-group">
                <button type="button" class="btn btn--primary btn--sm" data-action="export-expected-csv">Download</button>
                <button type="button" class="btn btn--ghost btn--sm" data-action="copy-export" data-format="expected" title="Copy Expected CSV to clipboard">${copyIcon} Copy</button>
              </div>
            </div>
            <div class="export-card">
              <div style="color:var(--review)">${pimIcon}</div>
              <h3>PIM-ready JSON</h3>
              <p>Normalized attribute schema with compliance arrays and media tags for PIM ingestion.</p>
              <div class="btn-group">
                <button type="button" class="btn btn--secondary btn--sm" data-action="export-pim">Download</button>
                <button type="button" class="btn btn--ghost btn--sm" data-action="copy-export" data-format="pim" title="Copy PIM JSON to clipboard">${copyIcon} Copy</button>
              </div>
            </div>
          </div>
        `
        }
      </div>
    </section>
  `;
}
