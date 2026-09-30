/* ==========================================================================
   keyvault.js — Tiny reusable "bring your own API key" UI + localStorage
   vault, used by gemini.html (ElevenLabs) and any game offering an
   optional LLM7 key for higher rate limits.

   Keys typed here are stored ONLY in the visitor's own browser and sent
   directly from their browser to the third-party API. This site's owner
   never sees, stores, or proxies them — there is nothing to leak.
   ========================================================================== */

function getStoredKey(storageKey) {
  try { return localStorage.getItem(storageKey) || ''; } catch { return ''; }
}

function setStoredKey(storageKey, value) {
  try {
    if (value) localStorage.setItem(storageKey, value);
    else localStorage.removeItem(storageKey);
  } catch {
    /* storage unavailable — key just won't persist across reloads */
  }
}

/**
 * Renders a small inline "API key" control (label + password input + clear
 * button) into `container`. Calls onChange(key) whenever the stored value
 * changes (debounced while typing, immediate on clear).
 */
function renderKeyField(container, { storageKey, label, placeholder = 'Optional — paste your own key', helpText = '' }, onChange) {
  const existing = getStoredKey(storageKey);
  container.innerHTML = `
    <div class="key-field">
      <label class="key-field__label">${escapeHtml(label)}</label>
      <div class="key-field__row">
        <input type="password" class="key-field__input" value="${escapeHtml(existing)}" placeholder="${escapeHtml(placeholder)}" autocomplete="off" spellcheck="false" />
        <button type="button" class="btn btn--ghost btn--sm key-field__clear">Clear</button>
      </div>
      ${helpText ? `<p class="key-field__help">${helpText}</p>` : ''}
    </div>
  `;
  const input = container.querySelector('.key-field__input');
  const clearBtn = container.querySelector('.key-field__clear');
  let saveTimer = null;

  input.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const val = input.value.trim();
      setStoredKey(storageKey, val);
      if (onChange) onChange(val);
    }, 400);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    setStoredKey(storageKey, '');
    if (onChange) onChange('');
  });
}
