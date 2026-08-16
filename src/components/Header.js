import { Badge, statusLabel, escapeHtml } from './shared/Badge.js';
import { getReviewedCount } from '../state/appState.js';
import { getCurrentRole } from '../services/auth.js';

function phaseBadge(state) {
  const map = {
    empty: { label: 'Ready', variant: 'idle' },
    loading: { label: 'Loading', variant: 'running', dot: true },
    processing: { label: 'Processing', variant: 'running', dot: true },
    review: { label: 'Review needed', variant: 'needs_review', dot: true },
    complete: { label: 'Complete', variant: 'complete' },
    error: { label: 'Error', variant: 'error' },
  };
  const cfg = map[state.phase] || map.empty;
  return Badge({ label: cfg.label, variant: cfg.variant, showDot: !!cfg.dot });
}

function formatTime(iso) {
  if (!iso) return 'Not run';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

const sunIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`;
const moonIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

export function Header(state) {
  const title = state.productTitle || 'No product loaded';
  const pending = state.reviewQueue.filter((q) => q.status === 'pending').length;
  const reviewed = getReviewedCount(state);
  const isDark = state.theme === 'dark';
  const role = getCurrentRole();

  return `
    <header class="app-header" role="banner">
      <div class="app-header__brand">
        <div class="app-header__logo" aria-hidden="true">PI</div>
        <div class="app-header__titles">
          <div class="app-header__name">Product Intelligence</div>
          <div class="app-header__sub">${escapeHtml(title)}${
            pending > 0 ? ` · ${reviewed}/${state.reviewQueue.length} reviewed` : ''
          }</div>
        </div>
      </div>
      <div class="app-header__meta">
        ${
          state.productRecord
            ? `<button type="button" class="btn btn--primary btn--sm" data-action="export-json" title="Download Product Record JSON (Ctrl+S)">⬇ Export JSON</button>`
            : ''
        }
        <button type="button" class="btn btn--secondary btn--sm" data-action="open-db-explorer" title="Open Saved Product Database Explorer">
          🗄️ DB Explorer
        </button>
        ${
          state.user
            ? `
          <button type="button" class="btn btn--secondary btn--sm app-header__user-btn" data-action="open-auth-modal" data-mode="profile" title="Signed in as ${escapeHtml(state.user.fullName || state.user.username)} (${(state.user.role || role).toUpperCase()}) · Click to view active session">
            <span class="app-header__user-avatar">${escapeHtml(((state.user.fullName || state.user.username || 'U').split(' ').map(n=>n[0]).join('').slice(0, 2)).toUpperCase())}</span>
            <span class="app-header__user-name">${escapeHtml(state.user.username)}</span>
            <span class="badge badge--accent" style="font-size:10px;padding:1px 5px">${(state.user.role || role).toUpperCase()}</span>
          </button>
        `
            : `
          <button type="button" class="btn btn--secondary btn--sm" data-action="open-auth-modal" data-mode="login" title="User Sign In / Registration">
            🔐 Sign In
          </button>
        `
        }
        <span class="badge badge--success" style="font-size:11px" title="Auto-saved state snapshot enabled">✓ Auto-saved</span>
        
        <div class="role-selector" title="Switch User Role to test RBAC permissions">
          <select id="role-select" aria-label="Select User Role" class="custom-select select-animated select--sm">
            <option value="admin" ${role === 'admin' ? 'selected' : ''}>Role: Admin</option>
            <option value="reviewer" ${role === 'reviewer' ? 'selected' : ''}>Role: Reviewer</option>
            <option value="viewer" ${role === 'viewer' ? 'selected' : ''}>Role: Viewer</option>
          </select>
        </div>

        <label class="toggle">
          <input type="checkbox" id="skip-animation" ${state.skipAnimation ? 'checked' : ''} />
          <span class="toggle-label">Skip animation</span>
        </label>

        <button type="button" class="btn btn--ghost btn--icon" data-action="toggle-theme" title="Toggle ${isDark ? 'light' : 'dark'} theme" aria-label="Toggle theme">
          ${isDark ? sunIcon : moonIcon}
        </button>

        ${phaseBadge(state)}
        <span class="badge badge--neutral" title="Last pipeline run">Last run: ${formatTime(state.lastRunAt)}</span>
      </div>
    </header>
  `;
}

export { statusLabel };
