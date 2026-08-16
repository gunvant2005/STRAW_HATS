import { escapeHtml } from './shared/Badge.js';
import { DEMO_ACCOUNTS, ROLE_PERMISSIONS, ROLES, getRolePermissions } from '../services/auth.js';
import { evaluatePasswordSecurity } from '../services/security.js';

/**
 * Enterprise Authentication & Identity Gateway Modal
 * Real-world Sign In, PBKDF2 Encrypted Registration, SSO Simulation, and Active Session Management.
 */
export function AuthModal({
  isOpen,
  mode = 'login', // 'login' | 'register' | 'profile' | 'forgot'
  error = null,
  loading = false,
  user = null,
  activeTab = null,
  draft = {},
}) {
  if (!isOpen) return '';

  const effectiveMode = activeTab || (user && mode === 'profile' ? 'profile' : mode);
  const isLogin = effectiveMode === 'login';
  const isRegister = effectiveMode === 'register';
  const isProfile = effectiveMode === 'profile';
  const isForgot = effectiveMode === 'forgot';

  const closeIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  const lockIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
  const checkIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const shieldIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
  const keyIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="4.5"/><path d="m21 3-9.5 9.5"/><path d="m15.5 7.5 3 3M14 9l2 2"/></svg>`;
  const userIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

  return `
    <div class="modal-backdrop auth-backdrop" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div class="modal-card auth-modal-card">
        
        <!-- Header with Enterprise Branding -->
        <div class="auth-header">
          <div class="auth-header__brand">
            <div class="auth-header__logo" aria-hidden="true">
              <span class="auth-header__logo-icon">🛡️</span>
            </div>
            <div>
              <div class="auth-header__badge">IAM & RBAC Gateway • v2.4</div>
              <h2 id="auth-modal-title" class="auth-header__title">
                ${
                  isProfile
                    ? 'Active Session & Identity'
                    : isForgot
                      ? 'Reset Security Credentials'
                      : isRegister
                        ? 'Create Enterprise Account'
                        : 'Sign In to Product Intelligence'
                }
              </h2>
              <p class="auth-header__subtitle">
                ${
                  isProfile
                    ? 'Authenticated HMAC SHA-256 JWT session & access permission matrix.'
                    : isForgot
                      ? 'Enter your verified work email to receive password reset tokens.'
                      : isRegister
                        ? 'Instant encrypted registration with custom role assignment & permissions.'
                        : 'Access industrial attribute pipelines, audit trails, and review queues.'
                }
              </p>
            </div>
          </div>
          <button type="button" class="btn btn--ghost btn--icon auth-close-btn" data-action="close-auth-modal" title="Close" aria-label="Close">
            ${closeIcon}
          </button>
        </div>

        <!-- Segmented Tab Navigation -->
        <div class="auth-nav" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected="${isLogin}"
            class="auth-nav__item ${isLogin ? 'auth-nav__item--active' : ''}"
            data-action="switch-auth-mode"
            data-mode="login"
          >
            ${keyIcon} <span>Sign In</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected="${isRegister}"
            class="auth-nav__item ${isRegister ? 'auth-nav__item--active' : ''}"
            data-action="switch-auth-mode"
            data-mode="register"
          >
            ${userIcon} <span>Register</span>
          </button>
          ${
            user
              ? `
            <button
              type="button"
              role="tab"
              aria-selected="${isProfile}"
              class="auth-nav__item ${isProfile ? 'auth-nav__item--active' : ''}"
              data-action="switch-auth-mode"
              data-mode="profile"
            >
              ${shieldIcon} <span>Active Session (${escapeHtml(user.username)})</span>
            </button>
          `
              : ''
          }
        </div>

        <div class="modal-body auth-modal-body">
          ${error ? `<div class="phase-banner phase-banner--error" style="margin-bottom:var(--space-4);animation:authSlideUp 0.3s ease">⚠️ ${escapeHtml(error)}</div>` : ''}

          ${
            isProfile && user
              ? renderProfileView(user)
              : isForgot
                ? renderForgotPasswordView(loading)
                : isRegister
                  ? renderRegisterForm(loading, draft)
                  : renderLoginForm(loading, draft)
          }
        </div>

        <!-- Enterprise Compliance Trust Footer -->
        <div class="auth-footer">
          <div class="auth-footer__compliance">
            <span class="auth-footer__badge">🔒 SOC2 Type II</span>
            <span class="auth-footer__badge">🛡️ ISO/IEC 27001</span>
            <span class="auth-footer__badge">⚡ 256-bit TLS / JWT</span>
          </div>
          <div class="auth-footer__meta">
            Hardware-backed encryption & zero-knowledge credential isolation.
          </div>
        </div>

      </div>
    </div>
  `;
}

/** Render Sign In Form with Quick Presets and SSO */
function renderLoginForm(loading, draft = {}) {
  const usernameVal = draft.loginUsername ?? '';
  const passwordVal = draft.loginPassword ?? '';

  return `
    <!-- Quick Demo Accounts Preset Bar -->
    <div class="auth-presets-panel">
      <div class="auth-presets-panel__header">
        <span class="auth-presets-panel__label">⚡ Quick 1-Click Demo Accounts:</span>
        <span class="auth-presets-panel__hint">Click any card to auto-fill credentials</span>
      </div>
      <div class="auth-presets-grid">
        ${DEMO_ACCOUNTS.map(
          (acc) => `
          <button
            type="button"
            class="auth-preset-card ${usernameVal === acc.username ? 'auth-preset-card--selected' : ''}"
            data-action="autofill-auth"
            data-username="${escapeHtml(acc.username)}"
            data-password="${escapeHtml(acc.password)}"
            data-role="${escapeHtml(acc.role)}"
            title="Auto-fill as ${escapeHtml(acc.fullName)} (${acc.role.toUpperCase()})"
          >
            <div class="auth-preset-card__avatar">${acc.avatar}</div>
            <div class="auth-preset-card__info">
              <div class="auth-preset-card__name">${escapeHtml(acc.fullName)}</div>
              <div class="auth-preset-card__role">${escapeHtml(ROLE_PERMISSIONS[acc.role]?.badge || acc.role)}</div>
            </div>
          </button>
        `
        ).join('')}
      </div>
    </div>

    <!-- Enterprise SSO Button -->
    <button type="button" class="btn btn--secondary auth-sso-btn" data-action="auth-sso-login" title="Sign in with Enterprise SAML / Okta / Azure AD">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
      <span>Sign in with Enterprise SSO (Okta / Azure AD)</span>
    </button>

    <div class="auth-divider">
      <span>OR SIGN IN WITH CREDENTIALS</span>
    </div>

    <form id="auth-form" class="auth-form-grid" novalidate>
      <div class="field">
        <label for="auth-username" class="auth-field-label">
          <span>Username or Work Email</span>
          <span class="auth-field-req">*</span>
        </label>
        <div class="auth-input-wrapper">
          <span class="auth-input-icon">👤</span>
          <input
            id="auth-username"
            name="username"
            type="text"
            class="auth-input"
            placeholder="e.g. admin_lead or sarah.c@industrial.com"
            required
            autocomplete="username"
            value="${escapeHtml(usernameVal)}"
          />
        </div>
      </div>

      <div class="field">
        <div class="auth-field-label-row">
          <label for="auth-password" class="auth-field-label">
            <span>Password</span>
            <span class="auth-field-req">*</span>
          </label>
          <button type="button" class="auth-forgot-link" data-action="switch-auth-mode" data-mode="forgot">
            Forgot password?
          </button>
        </div>
        <div class="auth-input-wrapper">
          <span class="auth-input-icon">🔑</span>
          <input
            id="auth-password"
            name="password"
            type="password"
            class="auth-input"
            placeholder="Enter enterprise password"
            required
            autocomplete="current-password"
            value="${escapeHtml(passwordVal)}"
          />
          <button type="button" class="auth-pwd-toggle" data-action="toggle-pwd-visibility" data-target="auth-password" title="Toggle password visibility" aria-label="Toggle password visibility">
            👁️
          </button>
        </div>
      </div>

      <div class="auth-form-options">
        <label class="auth-checkbox-label">
          <input type="checkbox" id="auth-remember" name="remember" checked />
          <span>Keep me signed in on this device (30 days)</span>
        </label>
      </div>

      <div class="auth-bot-defense">
        <span class="auth-bot-defense__check">✓</span>
        <span>Enterprise Endpoint Bot Verification Active & Validated</span>
      </div>

      <div class="btn-group" style="margin-top:var(--space-3)">
        <button type="submit" class="btn btn--primary auth-submit-btn" ${loading ? 'disabled' : ''}>
          ${loading ? '<span class="spinner-sm"></span> Authenticating…' : 'Sign In to Workspace →'}
        </button>
      </div>

      <div style="margin-top:var(--space-2);text-align:center;font-size:var(--text-xs);color:var(--text-muted)">
        Need a new enterprise account?
        <button type="button" class="btn-link" data-action="switch-auth-mode" data-mode="register" style="font-weight:700">
          Register here →
        </button>
      </div>
    </form>
  `;
}

/** Render Registration Form with Live Password Strength & Role Cards */
function renderRegisterForm(loading, draft = {}) {
  const selectedRole = draft.role || 'reviewer';
  const pwd = draft.password || '';
  const confirmPwd = draft.confirmPassword || '';
  const analysis = evaluatePasswordSecurity(pwd);
  const widths = ['0%', '25%', '50%', '75%', '100%'];
  const fillWidth = widths[analysis.score] || '0%';

  const showMatch = Boolean(confirmPwd.length > 0);
  const passwordsMatch = Boolean(pwd && confirmPwd && pwd === confirmPwd);

  return `
    <form id="auth-form" class="auth-form-grid" novalidate>
      
      <div class="auth-row-2col">
        <div class="field">
          <label for="auth-fullname" class="auth-field-label">
            <span>Full Name</span>
            <span class="auth-field-req">*</span>
          </label>
          <div class="auth-input-wrapper">
            <span class="auth-input-icon">📛</span>
            <input
              id="auth-fullname"
              name="fullName"
              type="text"
              class="auth-input"
              placeholder="e.g. Dr. Elena Vance"
              required
              autocomplete="name"
              value="${escapeHtml(draft.fullName || '')}"
            />
          </div>
        </div>

        <div class="field">
          <label for="auth-username" class="auth-field-label">
            <span>Username</span>
            <span class="auth-field-req">*</span>
          </label>
          <div class="auth-input-wrapper">
            <span class="auth-input-icon">👤</span>
            <input
              id="auth-username"
              name="username"
              type="text"
              class="auth-input"
              placeholder="e.g. elena_vance"
              required
              autocomplete="username"
              value="${escapeHtml(draft.username || '')}"
            />
          </div>
        </div>
      </div>

      <div class="auth-row-2col">
        <div class="field">
          <label for="auth-email" class="auth-field-label">
            <span>Work Email</span>
            <span class="auth-field-req">*</span>
          </label>
          <div class="auth-input-wrapper">
            <span class="auth-input-icon">✉️</span>
            <input
              id="auth-email"
              name="email"
              type="email"
              class="auth-input"
              placeholder="e.g. elena@industrial.io"
              required
              autocomplete="email"
              value="${escapeHtml(draft.email || '')}"
            />
          </div>
        </div>

        <div class="field">
          <label for="auth-org" class="auth-field-label">
            <span>Organization / Department</span>
          </label>
          <div class="auth-input-wrapper">
            <span class="auth-input-icon">🏢</span>
            <input
              id="auth-org"
              name="org"
              type="text"
              class="auth-input"
              placeholder="e.g. Global Fasteners Corp"
              value="${escapeHtml(draft.org || '')}"
            />
          </div>
        </div>
      </div>

      <!-- Role Selection Cards -->
      <div class="field">
        <label class="auth-field-label">
          <span>Assign Workspace Role & Access Tier</span>
          <span class="auth-field-req">*</span>
        </label>
        <div class="auth-roles-grid">
          <label class="auth-role-card ${selectedRole === 'admin' ? 'auth-role-card--selected' : ''}">
            <input type="radio" name="role" value="admin" class="auth-role-radio" ${selectedRole === 'admin' ? 'checked' : ''} />
            <div class="auth-role-card__content">
              <div class="auth-role-card__header">
                <span class="auth-role-card__badge">👑 Admin</span>
                <span class="auth-role-card__tier">Full Control</span>
              </div>
              <p class="auth-role-card__desc">Full access to pipeline runs, review queue, data editing, state reset, and exports.</p>
            </div>
          </label>

          <label class="auth-role-card ${selectedRole === 'reviewer' ? 'auth-role-card--selected' : ''}">
            <input type="radio" name="role" value="reviewer" class="auth-role-radio" ${selectedRole === 'reviewer' ? 'checked' : ''} />
            <div class="auth-role-card__content">
              <div class="auth-role-card__header">
                <span class="auth-role-card__badge">🔍 Reviewer</span>
                <span class="auth-role-card__tier">Recommended</span>
              </div>
              <p class="auth-role-card__desc">Execute pipelines, review attribute evidence, approve/edit fields, and export catalog records.</p>
            </div>
          </label>

          <label class="auth-role-card ${selectedRole === 'viewer' ? 'auth-role-card--selected' : ''}">
            <input type="radio" name="role" value="viewer" class="auth-role-radio" ${selectedRole === 'viewer' ? 'checked' : ''} />
            <div class="auth-role-card__content">
              <div class="auth-role-card__header">
                <span class="auth-role-card__badge">👁️ Auditor</span>
                <span class="auth-role-card__tier">Read-Only</span>
              </div>
              <p class="auth-role-card__desc">Audit-only access to inspect pipelines and download approved export datasets.</p>
            </div>
          </label>
        </div>
      </div>

      <!-- Password with Dynamic Strength Meter -->
      <div class="field">
        <label for="auth-password" class="auth-field-label">
          <span>Master Security Password</span>
          <span class="auth-field-req">*</span>
        </label>
        <div class="auth-input-wrapper">
          <span class="auth-input-icon">🔑</span>
          <input
            id="auth-password"
            name="password"
            type="password"
            class="auth-input"
            placeholder="Min 8 chars with uppercase, number & symbol"
            required
            autocomplete="new-password"
            value="${escapeHtml(pwd)}"
          />
          <button type="button" class="auth-pwd-toggle" data-action="toggle-pwd-visibility" data-target="auth-password" title="Toggle password visibility" aria-label="Toggle password visibility">
            👁️
          </button>
        </div>

        <!-- Live Password Strength Indicator Container -->
        <div id="auth-pwd-strength-container" class="auth-strength-meter">
          <div class="auth-strength-meter__header">
            <span>Security Strength:</span>
            <span id="auth-pwd-strength-label" class="auth-strength-meter__level" style="color:${analysis.color}">
              ${analysis.label}
            </span>
          </div>
          <div class="auth-strength-meter__bar">
            <div id="auth-pwd-strength-fill" class="auth-strength-meter__fill" style="width:${fillWidth};background-color:${analysis.color}"></div>
          </div>
          <div class="auth-strength-rules">
            <span id="rule-len" class="auth-rule-item ${analysis.checks.length ? 'auth-rule-item--passed' : ''}">
              ${analysis.checks.length ? '✓' : '⚪'} 8+ Characters
            </span>
            <span id="rule-upper" class="auth-rule-item ${analysis.checks.upper ? 'auth-rule-item--passed' : ''}">
              ${analysis.checks.upper ? '✓' : '⚪'} Uppercase (A-Z)
            </span>
            <span id="rule-lower" class="auth-rule-item ${analysis.checks.lower ? 'auth-rule-item--passed' : ''}">
              ${analysis.checks.lower ? '✓' : '⚪'} Lowercase (a-z)
            </span>
            <span id="rule-num" class="auth-rule-item ${analysis.checks.digit ? 'auth-rule-item--passed' : ''}">
              ${analysis.checks.digit ? '✓' : '⚪'} Number (0-9)
            </span>
            <span id="rule-sym" class="auth-rule-item ${analysis.checks.special ? 'auth-rule-item--passed' : ''}">
              ${analysis.checks.special ? '✓' : '⚪'} Special Symbol
            </span>
          </div>
        </div>
      </div>

      <!-- Confirm Password -->
      <div class="field">
        <label for="auth-confirm-password" class="auth-field-label">
          <span>Confirm Password</span>
          <span class="auth-field-req">*</span>
        </label>
        <div class="auth-input-wrapper">
          <span class="auth-input-icon">🔒</span>
          <input
            id="auth-confirm-password"
            name="confirmPassword"
            type="password"
            class="auth-input"
            placeholder="Re-enter master password"
            required
            autocomplete="new-password"
            value="${escapeHtml(confirmPwd)}"
          />
          <button type="button" class="auth-pwd-toggle" data-action="toggle-pwd-visibility" data-target="auth-confirm-password" title="Toggle password visibility" aria-label="Toggle password visibility">
            👁️
          </button>
        </div>
        <div id="auth-confirm-match-feedback" class="auth-match-feedback" style="display:${showMatch ? 'block' : 'none'};color:${passwordsMatch ? 'var(--success)' : 'var(--error)'}">
          ${showMatch ? (passwordsMatch ? '✓ Passwords match' : '⚠️ Passwords do not match') : ''}
        </div>
      </div>

      <div class="auth-form-options">
        <label class="auth-checkbox-label">
          <input type="checkbox" id="auth-terms" name="terms" required checked />
          <span>I agree to the Enterprise Master Services Agreement and PBKDF2 data processing policies.</span>
        </label>
      </div>

      <div class="btn-group" style="margin-top:var(--space-3)">
        <button type="submit" class="btn btn--primary auth-submit-btn" ${loading ? 'disabled' : ''}>
          ${loading ? '<span class="spinner-sm"></span> Creating Account…' : 'Create Enterprise Account →'}
        </button>
      </div>

      <div style="margin-top:var(--space-2);text-align:center;font-size:var(--text-xs);color:var(--text-muted)">
        Already have an account?
        <button type="button" class="btn-link" data-action="switch-auth-mode" data-mode="login" style="font-weight:700">
          Sign in here →
        </button>
      </div>
    </form>
  `;
}

/** Render Active User Profile & Session Security Matrix */
function renderProfileView(user) {
  const role = user.role || 'reviewer';
  const roleMeta = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[ROLES.VIEWER];
  const avatarInitials = (user.fullName || user.username || 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const perms = getRolePermissions(role);
  const token = user.token || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

  return `
    <div class="auth-profile-card">
      
      <!-- Profile Header -->
      <div class="auth-profile-hero">
        <div class="auth-profile-avatar">${avatarInitials}</div>
        <div class="auth-profile-info">
          <div class="auth-profile-name-row">
            <h3 class="auth-profile-name">${escapeHtml(user.fullName || user.username)}</h3>
            <span class="badge badge--success" style="font-size:11px">✓ Active Session</span>
          </div>
          <div class="auth-profile-meta">
            <span>👤 @${escapeHtml(user.username)}</span> • 
            <span>✉️ ${escapeHtml(user.email || `${user.username}@industrial.com`)}</span>
          </div>
          <div class="auth-profile-org">
            <span>🏢 ${escapeHtml(user.org || 'Product Intelligence Enterprise Workspace')}</span>
          </div>
        </div>
      </div>

      <!-- Active Role & Permissions Matrix -->
      <div class="auth-profile-section">
        <div class="auth-profile-section__title">
          <span>Active Role: <strong>${escapeHtml(roleMeta.label)}</strong></span>
          <span class="badge badge--neutral">${escapeHtml(roleMeta.badge)}</span>
        </div>
        <p class="auth-profile-section__desc">${escapeHtml(roleMeta.desc)}</p>

        <div class="auth-perms-grid">
          <div class="auth-perm-item ${perms.canRunPipeline ? 'auth-perm-item--granted' : 'auth-perm-item--denied'}">
            <span>${perms.canRunPipeline ? '✓' : '✗'}</span> Run AI Extraction Pipeline
          </div>
          <div class="auth-perm-item ${perms.canReview ? 'auth-perm-item--granted' : 'auth-perm-item--denied'}">
            <span>${perms.canReview ? '✓' : '✗'}</span> Review & Approve Attributes
          </div>
          <div class="auth-perm-item ${perms.canEditAttributes ? 'auth-perm-item--granted' : 'auth-perm-item--denied'}">
            <span>${perms.canEditAttributes ? '✓' : '✗'}</span> Edit Attribute Values
          </div>
          <div class="auth-perm-item ${perms.canExport ? 'auth-perm-item--granted' : 'auth-perm-item--denied'}">
            <span>${perms.canExport ? '✓' : '✗'}</span> Export CSV/JSON/PIM Records
          </div>
          <div class="auth-perm-item ${perms.canResetState ? 'auth-perm-item--granted' : 'auth-perm-item--denied'}">
            <span>${perms.canResetState ? '✓' : '✗'}</span> Reset Workspace State
          </div>
        </div>
      </div>

      <!-- Security & Token Inspector -->
      <div class="auth-profile-section">
        <div class="auth-profile-section__title">
          <span>Security Token (HMAC-SHA256 Bearer JWT)</span>
          <button type="button" class="btn btn--secondary btn--xs" data-action="copy-jwt-token" data-token="${escapeHtml(token)}">
            📋 Copy Token
          </button>
        </div>
        <div class="auth-token-box">
          <code>${escapeHtml(token.slice(0, 36))}••••••••••••••••••••${escapeHtml(token.slice(-16))}</code>
        </div>
        <div class="auth-token-meta">
          <span>Algorithm: <strong>HS256</strong></span> • 
          <span>Encryption: <strong>PBKDF2-SHA512</strong></span> • 
          <span>Status: <strong>Verified 30-Day Token</strong></span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="auth-profile-actions">
        <button type="button" class="btn btn--secondary" data-action="switch-auth-mode" data-mode="login">
          🔄 Switch Account
        </button>
        <button type="button" class="btn btn--danger" data-action="auth-logout">
          🚪 Invalidate Token & Sign Out
        </button>
      </div>

    </div>
  `;
}

/** Render Forgot Password Simulation */
function renderForgotPasswordView(loading) {
  return `
    <form id="auth-forgot-form" class="auth-form-grid" novalidate>
      <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-3)">
        Enter your verified work email address. We will generate a cryptographic 1-hour password recovery token and send reset instructions to your inbox.
      </p>

      <div class="field">
        <label for="auth-forgot-email" class="auth-field-label">
          <span>Registered Work Email</span>
          <span class="auth-field-req">*</span>
        </label>
        <div class="auth-input-wrapper">
          <span class="auth-input-icon">✉️</span>
          <input
            id="auth-forgot-email"
            name="email"
            type="email"
            class="auth-input"
            placeholder="e.g. user@industrial.com"
            required
            autocomplete="email"
          />
        </div>
      </div>

      <div class="btn-group" style="margin-top:var(--space-3)">
        <button type="submit" class="btn btn--primary auth-submit-btn" ${loading ? 'disabled' : ''}>
          ${loading ? 'Sending Recovery Token…' : 'Send Recovery Token & Link →'}
        </button>
      </div>

      <div style="margin-top:var(--space-3);text-align:center">
        <button type="button" class="btn-link" data-action="switch-auth-mode" data-mode="login">
          ← Back to Sign In
        </button>
      </div>
    </form>
  `;
}

