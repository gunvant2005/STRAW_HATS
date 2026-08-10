import { escapeHtml, Badge } from './shared/Badge.js';

/**
 * Real-World Saved Product Catalog & Database Explorer Modal
 */
export function DatabaseExplorerModal({ isOpen, products = [], loading = false, error = null }) {
  if (!isOpen) return '';

  const closeIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  const rows = products.map((p) => {
    const attrCount = p.attributes ? Object.keys(p.attributes).length : 0;
    const confidencePct = Math.round((p.confidenceScore || 0.9) * 100);
    return `
      <tr>
        <td class="field-value--mono"><strong>${escapeHtml(p.sku)}</strong></td>
        <td>${escapeHtml(p.title || 'Untitled Product')}</td>
        <td><span class="badge badge--neutral">${escapeHtml(p.category || 'Hardware')}</span></td>
        <td>${attrCount} attributes</td>
        <td>
          <div class="confidence-cell">
            <span class="confidence-pct">${confidencePct}%</span>
          </div>
        </td>
        <td>${Badge({ label: p.status || 'complete', variant: p.status === 'review' ? 'needs_review' : 'complete' })}</td>
        <td>
          <button
            type="button"
            class="btn btn--primary btn--sm"
            data-action="load-db-product"
            data-sku="${escapeHtml(p.sku)}"
            title="Load product into active workspace"
          >
            ⚡ Load Product
          </button>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="db-explorer-title">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3 id="db-explorer-title" style="display:flex;align-items:center;gap:8px">
              <span>🗄️</span> Saved Product Catalog & Database Explorer
            </h3>
            <p class="hint" style="margin-top:2px">
              Real-time inspection of products stored in the relational database engine.
            </p>
          </div>
          <button type="button" class="btn btn--ghost btn--icon" data-action="close-db-explorer" title="Close modal" aria-label="Close modal">
            ${closeIcon}
          </button>
        </div>
        <div class="modal-body">
          ${loading ? '<div class="phase-banner phase-banner--processing">Loading saved database products…</div>' : ''}
          ${error ? `<div class="phase-banner phase-banner--error">Database Error: ${escapeHtml(error)}</div>` : ''}

          ${
            !loading && !products.length
              ? '<div style="padding:var(--space-6);text-align:center;color:var(--text-muted)">No saved products in database yet. Run the intelligence pipeline to populate records.</div>'
              : `
            <div class="product-table-wrap" style="max-height:360px;overflow:auto">
              <table class="product-table">
                <thead>
                  <tr>
                    <th scope="col">SKU</th>
                    <th scope="col">Title</th>
                    <th scope="col">Category</th>
                    <th scope="col">Attributes</th>
                    <th scope="col">Confidence</th>
                    <th scope="col">Status</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            </div>
          `
          }
        </div>
        <div class="modal-footer">
          <span style="font-size:var(--text-xs);color:var(--text-muted)">
            Total Saved Records: <strong>${products.length}</strong>
          </span>
          <button type="button" class="btn btn--secondary btn--sm" data-action="close-db-explorer">
            Close Explorer
          </button>
        </div>
      </div>
    </div>
  `;
}
