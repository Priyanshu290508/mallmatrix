// src/utils/toast.js
// Toast notification system with ToastProvider and useToast hook
// Supports success, error, info, warning variants, auto-dismiss in 4s, stacked top-right, role="status"

class ToastManagerImpl {
  constructor() {
    this.container = null;
    this.toasts = [];
    this.counter = 0;
  }

  ensureContainer() {
    if (!this.container) {
      let el = document.getElementById('toastContainer');
      if (!el) {
        el = document.createElement('div');
        el.id = 'toastContainer';
        el.className = 'toast-container';
        document.body.appendChild(el);
      }
      this.container = el;
    }
    return this.container;
  }

  show(message, type = 'info', options = {}) {
    const container = this.ensureContainer();
    const id = `toast-${++this.counter}`;
    const duration = options.duration !== undefined ? options.duration : 4000; // 4s auto-dismiss

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
    } else if (type === 'error' || type === 'danger') {
      iconSvg = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      `;
    } else if (type === 'warning') {
      iconSvg = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      `;
    } else {
      // Info
      iconSvg = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      `;
    }

    const toastEl = document.createElement('div');
    toastEl.id = id;
    toastEl.className = `toast toast-${type}`;
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    toastEl.setAttribute('tabindex', '0');

    toastEl.innerHTML = `
      <div class="toast-icon-wrap toast-icon-${type}">
        ${iconSvg}
      </div>
      <div class="toast-body">
        <span class="toast-msg">${this.escapeHTML(message)}</span>
      </div>
      <button type="button" class="toast-close-btn" aria-label="Close notification" onclick="ToastProvider.dismiss('${id}')">
        &times;
      </button>
      <div class="toast-progress-bar" style="animation-duration: ${duration}ms;"></div>
    `;

    container.appendChild(toastEl);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toastEl.classList.add('toast-visible');
    });

    // Auto-dismiss in 4 seconds
    let timer = null;
    if (duration > 0) {
      timer = setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    this.toasts.push({ id, element: toastEl, timer });
    return id;
  }

  dismiss(id) {
    const itemIndex = this.toasts.findIndex(t => t.id === id);
    if (itemIndex === -1) return;

    const { element, timer } = this.toasts[itemIndex];
    if (timer) clearTimeout(timer);
    this.toasts.splice(itemIndex, 1);

    element.classList.remove('toast-visible');
    element.classList.add('toast-leaving');
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }, 280);
  }

  clearAll() {
    [...this.toasts].forEach(t => this.dismiss(t.id));
  }

  escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

const toastManager = new ToastManagerImpl();

// ToastProvider singleton
export const ToastProvider = {
  show: (msg, type = 'info', opts = {}) => toastManager.show(msg, type, opts),
  success: (msg, opts = {}) => toastManager.show(msg, 'success', opts),
  error: (msg, opts = {}) => toastManager.show(msg, 'error', opts),
  info: (msg, opts = {}) => toastManager.show(msg, 'info', opts),
  warning: (msg, opts = {}) => toastManager.show(msg, 'warning', opts),
  dismiss: (id) => toastManager.dismiss(id),
  clear: () => toastManager.clearAll()
};

// React-style hook interface: const toast = useToast()
export function useToast() {
  return {
    show: (msg, type = 'info', opts) => ToastProvider.show(msg, type, opts),
    success: (msg, opts) => ToastProvider.success(msg, opts),
    error: (msg, opts) => ToastProvider.error(msg, opts),
    info: (msg, opts) => ToastProvider.info(msg, opts),
    warning: (msg, opts) => ToastProvider.warning(msg, opts),
    dismiss: (id) => ToastProvider.dismiss(id)
  };
}

// Bind to window for global convenience
if (typeof window !== 'undefined') {
  window.ToastProvider = ToastProvider;
  window.useToast = useToast;
}
