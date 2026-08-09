import { FIELD_LABELS } from '../data/products.js';
import { Badge, escapeHtml } from './shared/Badge.js';
import { EmptyState } from './shared/EmptyState.js';
import { getReviewedCount } from '../state/appState.js';

const undoIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>`;

function ProgressRing(reviewed, total) {
  if (!total) return '';
  const pct = Math.round((reviewed / total) * 100);
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (reviewed / total) * circumference;
  return `
    <div class="progress-ring" title="${pct}% reviewed">
      <svg class="progress-ring__svg" width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
        <circle class="progress-ring__bg" cx="20" cy="20" r="${radius}" />
        <circle class="progress-ring__fill" cx="20" cy="20" r="${radius}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}" />
      </svg>
      <span class="progress-ring__text">${pct}%</span>
    </div>
  `;
}

export function ReviewWorkspace(state) {
  const queue = state.reviewQueue || [];
  const reviewed = getReviewedCount(state);
  const total = queue.length;
  const pending = queue.filter((q) => q.status === 'pending').length;
  const hasUndo = state.undoStack && state.undoStack.length > 0;

  if (!state.productRecord) {
    return `
      <section class="card" aria-labelledby="review-heading">
        <div class="card__header">
          <h3 id="review-heading">Human review queue</h3>
        </div>
        <div class="card__body">
          ${EmptyState({
            title: 'No review items',
            text: 'Low-confidence and conflicted attributes will appear here after validation.',
            compact: true,
            icon: '✎',
          })}
        </div>
      </section>
    `;
  }

  if (!total) {
    return `
      <section class="card" aria-labelledby="review-heading">
        <div class="card__header">
          <h3 id="review-heading">Human review queue</h3>
          ${Badge({ label: 'Clear', variant: 'complete' })}
        </div>
        <div class="card__body">
          <div class="phase-banner phase-banner--success" role="status">
            <strong>No fields require review.</strong> All attributes cleared the confidence threshold.
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="card" aria-labelledby="review-heading">
      <div class="card__header">
        <div>
          <h3 id="review-heading">Human review queue</h3>
          <p class="review-progress" style="margin-top:4px">
            ${reviewed} of ${total} fields reviewed
          </p>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-3)">
          ${ProgressRing(reviewed, total)}
          ${
            reviewed === total
              ? Badge({ label: 'Queue complete', variant: 'complete' })
              : Badge({ label: `${pending} pending`, variant: 'needs_review' })
          }
        </div>
      </div>
      <div class="card__body">
        <div class="bulk-actions" role="toolbar" aria-label="Bulk review actions">
          <div class="bulk-actions__info">
            <strong>${pending}</strong> pending field${pending === 1 ? '' : 's'}
            ${hasUndo ? `<span aria-hidden="true">·</span><span>${state.undoStack.length} action${state.undoStack.length === 1 ? '' : 's'} in history</span>` : ''}
          </div>
          <div class="bulk-actions__actions">
            <button
              type="button"
              class="btn btn--ghost btn--sm"
              data-action="undo-review"
              ${hasUndo ? '' : 'disabled'}
              title="Undo last review action (Ctrl+Z)"
              aria-label="Undo last review action"
            >
              ${undoIcon}
              Undo
            </button>
            <button
              type="button"
              class="btn btn--secondary btn--sm"
              data-action="bulk-reject"
              ${pending > 0 ? '' : 'disabled'}
            >
              Reject all pending
            </button>
            <button
              type="button"
              class="btn btn--success btn--sm"
              data-action="bulk-approve"
              ${pending > 0 ? '' : 'disabled'}
            >
              Approve all pending
            </button>
          </div>
        </div>

        <div class="review-list">
          ${queue
            .map((item, idx) => {
              const field = state.productRecord[item.field];
              const isEditing = state.editingField === item.field;
              const done = item.status !== 'pending';
              return `
                <article class="review-card ${done ? 'is-done' : ''}" data-review-field="${escapeHtml(item.field)}" style="animation-delay:${idx * 60}ms">
                  <div class="review-card__header">
                    <strong>${escapeHtml(FIELD_LABELS[item.field] || item.field)}</strong>
                    <div style="display:flex;gap:6px;align-items:center">
                      <span class="confidence-pct">${Math.round((field?.confidence || 0) * 100)}%</span>
                      ${Badge({
                        label: done ? item.status : 'pending',
                        variant: done
                          ? item.status === 'rejected'
                            ? 'rejected'
                            : 'reviewed'
                          : 'needs_review',
                      })}
                    </div>
                  </div>
                  <div class="review-card__body">
                    ${
                      isEditing
                        ? `
                      <div class="review-edit-row">
                        <label class="sr-only" for="edit-${escapeHtml(item.field)}">Edit value</label>
                        <input
                          id="edit-${escapeHtml(item.field)}"
                          type="text"
                          value="${escapeHtml(field?.value || '')}"
                          data-edit-input="${escapeHtml(item.field)}"
                        />
                        <button type="button" class="btn btn--primary btn--sm" data-action="save-edit" data-field="${escapeHtml(item.field)}">Save</button>
                        <button type="button" class="btn btn--ghost btn--sm" data-action="cancel-edit" data-field="${escapeHtml(item.field)}">Cancel</button>
                      </div>
                    `
                        : `
                      <div class="review-card__value">
                        ${
                          field?.value
                            ? escapeHtml(field.value)
                            : '<span style="color:var(--text-muted);font-style:italic">— empty —</span>'
                        }
                      </div>
                    `
                    }
                    <div class="review-card__snippet">${escapeHtml(field?.evidence?.snippet || 'No evidence snippet.')}</div>
                    <div class="field">
                      <label for="notes-${escapeHtml(item.field)}">Reviewer notes</label>
                      <textarea
                        id="notes-${escapeHtml(item.field)}"
                        data-review-notes="${escapeHtml(item.field)}"
                        rows="2"
                        placeholder="Document rationale for audit trail…"
                      >${escapeHtml(item.notes || '')}</textarea>
                    </div>
                    ${
                      !done
                        ? `
                      <div class="review-card__actions">
                        <button type="button" class="btn btn--success btn--sm" data-action="approve-field" data-field="${escapeHtml(item.field)}" title="Approve [Enter]">Approve</button>
                        <button type="button" class="btn btn--secondary btn--sm" data-action="edit-field" data-field="${escapeHtml(item.field)}" title="Edit value">Edit</button>
                        <button type="button" class="btn btn--danger btn--sm" data-action="reject-field" data-field="${escapeHtml(item.field)}" title="Reject field">Reject</button>
                      </div>
                    `
                        : `
                      <div class="review-card__actions">
                        <span style="font-size:var(--text-xs);color:var(--text-muted)">
                          Original: ${escapeHtml(item.originalValue || '—')}
                        </span>
                      </div>
                    `
                    }
                  </div>
                </article>
              `;
            })
            .join('')}
        </div>

        <div class="shortcuts-bar" aria-label="Keyboard shortcuts">
          <div class="shortcut-chip"><span class="kbd">Ctrl</span>+<span class="kbd">Enter</span> Approve focused notes</div>
          <div class="shortcut-chip"><span class="kbd">Ctrl</span>+<span class="kbd">Z</span> Undo last action</div>
          <div class="shortcut-chip"><span class="kbd">Enter</span> / <span class="kbd">Space</span> Select focused field</div>
        </div>
      </div>
    </section>
  `;
}
