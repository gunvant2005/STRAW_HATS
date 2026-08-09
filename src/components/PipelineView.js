import { Badge, statusLabel, escapeHtml, cssClass } from './shared/Badge.js';
import { EmptyState } from './shared/EmptyState.js';

export function PipelineView(state) {
  const { pipelineSteps, phase } = state;
  const hasStarted = phase !== 'empty' || pipelineSteps.some((s) => s.status !== 'idle');

  return `
    <section class="card" aria-labelledby="pipeline-heading">
      <div class="card__header">
        <div>
          <h3 id="pipeline-heading">AI processing pipeline</h3>
          <p style="margin-top:4px;color:var(--text-muted);font-size:var(--text-sm)">
            Evidence-linked enrichment from ingestion through commerce-ready export.
          </p>
        </div>
        <div aria-live="polite" aria-atomic="true">
          ${
            phase === 'processing'
              ? Badge({ label: 'Running', variant: 'running', showDot: true })
              : phase === 'review'
                ? Badge({ label: 'Needs review', variant: 'needs_review' })
                : phase === 'complete'
                  ? Badge({ label: 'Complete', variant: 'complete' })
                  : phase === 'error'
                    ? Badge({ label: 'Error', variant: 'error' })
                    : Badge({ label: 'Idle', variant: 'idle' })
          }
        </div>
      </div>
      <div class="card__body">
        ${
          !hasStarted && phase === 'empty'
            ? EmptyState({
                title: 'Pipeline idle',
                text: 'Upload a catalog excerpt or enter a SKU to begin structured enrichment.',
                compact: true,
                icon: '⟳',
              })
            : `
          <ol class="pipeline-list">
            ${pipelineSteps
              .map((step, i) => {
                const checkIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
                return `
                  <li class="pipeline-step is-${cssClass(step.status)}" style="animation-delay:${i * 50}ms">
                    <span class="pipeline-step__num" aria-hidden="true">${
                      step.status === 'complete' ? checkIcon : i + 1
                    }</span>
                    <div>
                      <div class="pipeline-step__label">${escapeHtml(step.label)}</div>
                      ${
                        step.subtext
                          ? `<div class="pipeline-step__sub">${escapeHtml(step.subtext)}</div>`
                          : ''
                      }
                    </div>
                    ${Badge({
                      label: statusLabel(step.status),
                      variant: step.status,
                      showDot: step.status === 'running',
                    })}
                  </li>
                `;
              })
              .join('')}
          </ol>
        `
        }
      </div>
    </section>
  `;
}
