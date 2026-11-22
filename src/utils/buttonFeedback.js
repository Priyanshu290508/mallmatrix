/**
 * MallMatrix Button Feedback Utility
 * Manages loading spinners, success tick animations, and error shakes
 * with minimum durations to prevent flickering and guard against double-submits.
 */

/**
 * Executes an action with button visual feedback (loading -> success or error -> restore).
 *
 * @param {HTMLElement|Event|null} buttonOrEvent - Button element or triggering event
 * @param {Function} actionFn - Async or sync function to execute
 * @param {Object} [options] - Configuration options
 * @param {string} [options.loadingText] - Text to show during loading
 * @param {string} [options.successText] - Text to show upon success
 * @param {number} [options.minLoadingMs=300] - Minimum loading duration
 * @param {number} [options.successMs=700] - Success display duration
 * @returns {Promise<any>} Result of actionFn
 */
export async function withButtonFeedback(buttonOrEvent, actionFn, {
  loadingText,
  successText,
  minLoadingMs = 300,
  successMs = 700
} = {}) {
  let button = null;
  if (buttonOrEvent) {
    if (buttonOrEvent instanceof HTMLElement) {
      button = buttonOrEvent;
    } else if (buttonOrEvent.currentTarget instanceof HTMLElement) {
      button = buttonOrEvent.currentTarget;
    } else if (buttonOrEvent.target && typeof buttonOrEvent.target.closest === 'function') {
      button = buttonOrEvent.target.closest('button');
    }
  }

  // If no button is referenced, execute action directly
  if (!button) {
    return await actionFn();
  }

  // Guard: Ignore extra clicks while already loading (no double submits)
  if (button.classList.contains('is-loading')) {
    return;
  }

  // Capture original state
  const originalHtml = button.innerHTML;
  const originalDisabled = button.disabled;
  const originalAriaBusy = button.getAttribute('aria-busy');
  const originalMinWidth = button.style.minWidth;

  // Lock width to avoid layout shift
  const rect = button.getBoundingClientRect();
  if (rect.width > 0) {
    button.style.minWidth = `${Math.ceil(rect.width)}px`;
  }

  // Set loading state
  button.classList.add('is-loading');
  button.classList.remove('is-success', 'is-error');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');

  const textToDisplay = loadingText !== undefined ? loadingText : null;
  const spinnerSvg = `
    <span class="btn-spinner" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
      </svg>
    </span>
  `;

  if (textToDisplay !== null) {
    button.innerHTML = `${spinnerSvg}<span class="btn-feedback-text">${escapeText(textToDisplay)}</span>`;
  } else {
    button.innerHTML = `${spinnerSvg}<span class="btn-feedback-text">${button.textContent.trim()}</span>`;
  }

  // Safe restoration function
  function restore() {
    if (!button || !button.isConnected) return;
    button.classList.remove('is-loading', 'is-success', 'is-error');
    button.disabled = originalDisabled;
    if (originalAriaBusy !== null) {
      button.setAttribute('aria-busy', originalAriaBusy);
    } else {
      button.removeAttribute('aria-busy');
    }
    button.innerHTML = originalHtml;
    button.style.minWidth = originalMinWidth;
  }

  const startTime = Date.now();
  let actionResult;

  try {
    actionResult = await actionFn();
  } catch (err) {
    // If actionFn throws, hold for minLoadingMs, show is-error, and notify toast
    const elapsed = Date.now() - startTime;
    if (elapsed < minLoadingMs) {
      await new Promise(r => setTimeout(r, minLoadingMs - elapsed));
    }

    if (button && button.isConnected) {
      button.classList.remove('is-loading');
      button.classList.add('is-error');
      button.removeAttribute('aria-busy');

      await new Promise(r => setTimeout(r, 550));
      restore();
    }

    if (typeof window.MallApp?.showToast === 'function') {
      window.MallApp.showToast(err.message || 'Operation failed', 'error');
    }
    throw err;
  }

  // Enforce minimum loading duration to prevent visual flicker
  const elapsed = Date.now() - startTime;
  if (elapsed < minLoadingMs) {
    await new Promise(r => setTimeout(r, minLoadingMs - elapsed));
  }

  // Show success state if button is still present in DOM
  if (button && button.isConnected) {
    if (successText) {
      button.classList.remove('is-loading');
      button.classList.add('is-success');
      button.removeAttribute('aria-busy');
      button.innerHTML = `
        <span class="btn-success-tick" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </span>
        <span class="btn-feedback-text">${escapeText(successText)}</span>
      `;
      await new Promise(r => setTimeout(r, successMs));
      restore();
    } else {
      restore();
    }
  }

  return actionResult;
}

function escapeText(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Global attachment for convenience
if (typeof window !== 'undefined') {
  window.withButtonFeedback = withButtonFeedback;
}
