import { escapeHtml } from './shared/Badge.js';

/**
 * Real-World User Authentication Modal (Login & PBKDF2 Registration)
 */
export function AuthModal({ isOpen, mode = 'login', error = null, loading = false, user = null }) {
  if (!isOpen) return '';

  const closeIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  const isLogin = mode === 'login';

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div class="modal-card" style="max-width:440px">
        <div class="modal-header">
          <div>
            <h3 id="auth-modal-title" style="display:flex;align-items:center;gap:8px">
              <span>🔐</span> ${isLogin ? 'Sign In to Product Intelligence' : 'Register Enterprise User'}
            </h3>
            <p class="hint" style="margin-top:2px">
              ${isLogin ? 'Enter credentials to acquire HMAC JWT session token.' : 'PBKDF2 encrypted registration with role-based access control.'}
            </p>
          </div>
          <button type="button" class="btn btn--ghost btn--icon" data-action="close-auth-modal" title="Close" aria-label="Close">
            ${closeIcon}
          </button>
        </div>
        <div class="modal-body">
          ${error ? `<div class="phase-banner phase-banner--error">${escapeHtml(error)}</div>` : ''}

          <form id="auth-form" class="form-grid" novalidate>
            <div class="field">
              <label for="auth-username">Username or Email</label>
              <input
                id="auth-username"
                name="username"
                type="text"
                placeholder="e.g. admin_user"
                required
                autocomplete="username"
              />
            </div>

            ${
              !isLogin
                ? `
              <div class="field">
                <label for="auth-email">Work Email</label>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  placeholder="e.g. user@industrial.com"
                  required
                  autocomplete="email"
                />
              </div>
              <div class="field">
                <label for="auth-role">Assign Role</label>
                <select id="auth-role" name="role" class="custom-select select-animated">
                  <option value="admin">Admin (Full Access)</option>
                  <option value="reviewer" selected>Reviewer (Edit & Approve)</option>
                  <option value="viewer">Viewer (Read-Only)</option>
                </select>
              </div>
            `
                : ''
            }

            <div class="field">
              <label for="auth-password">Password</label>
              <input
                id="auth-password"
                name="password"
                type="password"
                placeholder="${isLogin ? 'Enter password' : 'Min 8 chars with uppercase, number & symbol'}"
                required
                autocomplete="${isLogin ? 'current-password' : 'new-password'}"
              />
              ${!isLogin ? '<span class="hint">PBKDF2 SHA-512 + 16-byte random salt encryption</span>' : ''}
            </div>

            <div class="btn-group" style="margin-top:var(--space-3)">
              <button type="submit" class="btn btn--primary" style="width:100%" ${loading ? 'disabled' : ''}>
                ${loading ? 'Authenticating…' : isLogin ? 'Sign In & Verify JWT' : 'Create Encrypted User'}
              </button>
            </div>
          </form>

          <div style="margin-top:var(--space-4);text-align:center;font-size:var(--text-xs);color:var(--text-muted)">
            ${
              isLogin
                ? `Need an account? <button type="button" class="btn-link" data-action="switch-auth-mode" data-mode="register">Register user</button>`
                : `Already have an account? <button type="button" class="btn-link" data-action="switch-auth-mode" data-mode="login">Sign in</button>`
            }
          </div>
        </div>
      </div>
    </div>
  `;
}
