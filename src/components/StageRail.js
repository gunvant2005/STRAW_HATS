import { STAGES, getReviewedCount } from '../state/appState.js';
import { escapeHtml, cssClass } from './shared/Badge.js';

function stageIndicator(stageId, state) {
  if (stageId === 'input') {
    if (state.phase === 'empty') return '';
    return 'complete';
  }
  if (stageId === 'process') {
    if (state.phase === 'processing') return 'running';
    if (['review', 'complete'].includes(state.phase)) return 'complete';
    if (state.phase === 'error') return 'error';
    return '';
  }
  if (stageId === 'review') {
    const pending = state.reviewQueue.filter((q) => q.status === 'pending').length;
    if (pending > 0) return 'review';
    if (state.reviewQueue.length && getReviewedCount(state) === state.reviewQueue.length) return 'complete';
    return '';
  }
  if (stageId === 'export') {
    if (state.exportEnabled) return 'complete';
    return '';
  }
  return '';
}

function stageStatusText(stageId, state) {
  if (stageId === 'input') return state.input.sku ? 'Configured' : 'Awaiting input';
  if (stageId === 'process') {
    if (state.phase === 'processing') return 'Running';
    if (state.productRecord) return 'Complete';
    return 'Idle';
  }
  if (stageId === 'review') {
    const pending = state.reviewQueue.filter((q) => q.status === 'pending').length;
    if (!state.reviewQueue.length) return state.productRecord ? 'None queued' : 'Idle';
    return pending ? `${pending} pending` : 'All reviewed';
  }
  if (stageId === 'export') return state.exportEnabled ? 'Ready' : 'Locked';
  return '';
}

export function StageRail(state) {
  return `
    <nav class="stage-rail" aria-label="Workflow stages">
      <div class="stage-rail__label">Stages</div>
      <div role="tablist" aria-orientation="vertical" style="display:flex;flex-direction:column;gap:var(--space-1)">
        ${STAGES.map((stage, i) => {
          const active = state.activeStage === stage.id;
          const indicator = stageIndicator(stage.id, state);
          const indicatorClass = indicator ? cssClass(`stage-btn__indicator--${indicator}`) : '';
          return `
            <button
              type="button"
              id="tab-${escapeHtml(stage.id)}"
              role="tab"
              class="stage-btn ${active ? 'is-active' : ''}"
              data-action="set-stage"
              data-stage="${escapeHtml(stage.id)}"
              aria-selected="${active ? 'true' : 'false'}"
              aria-controls="main-workspace"
              tabindex="${active ? '0' : '-1'}"
            >
              <span class="stage-btn__icon" aria-hidden="true">${i + 1}</span>
              <span class="stage-btn__text">
                <span class="stage-btn__label">${escapeHtml(stage.label)}</span>
                <span class="stage-btn__status">${escapeHtml(stageStatusText(stage.id, state))}</span>
              </span>
              <span class="stage-btn__indicator ${indicatorClass}" aria-hidden="true"></span>
            </button>
          `;
        }).join('')}
      </div>
    </nav>
  `;
}
