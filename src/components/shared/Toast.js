import { escapeHtml, cssClass } from './Badge.js';

const toastIcons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

export function renderToasts(toasts = []) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  root.innerHTML = toasts
    .map(
      (t) => {
        const type = t.type || 'success';
        const icon = toastIcons[type] || toastIcons.info;
        return `
      <div class="toast toast--${cssClass(type)}" role="status" data-toast-id="${escapeHtml(t.id)}">
        <span class="toast__icon" aria-hidden="true">${icon}</span>
        <span class="toast__msg">${escapeHtml(t.message)}</span>
      </div>
    `;
      }
    )
    .join('');
}

export function Toast() {
  return '';
}
