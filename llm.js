/* ==========================================================================
   llm.js — Centralized LLM access for game pages.

   Uses the free, keyless LLM7 proxy (https://llm7.io) by default — no
   secret required to ship this site. Players may optionally paste their
   OWN LLM7 key (stored only in their browser's localStorage) for higher
   rate limits; it is sent straight from their browser to LLM7 and never
   touches this site's server (there isn't one).
   ========================================================================== */

const LLM7_ENDPOINT = 'https://api.llm7.io/v1/chat/completions';
const LLM7_MODEL = 'gpt-4o-mini-2024-07-18';
const LLM_KEY_STORAGE = 'llm7ApiKey';

function getLlmKey() {
  try { return localStorage.getItem(LLM_KEY_STORAGE) || 'unused'; } catch { return 'unused'; }
}

function setLlmKey(key) {
  try {
    if (key) localStorage.setItem(LLM_KEY_STORAGE, key);
    else localStorage.removeItem(LLM_KEY_STORAGE);
  } catch {
    /* storage unavailable — key just won't persist across reloads */
  }
}

/**
 * Call the LLM with a list of chat messages.
 * @param {Array<{role:string, content:string}>} messages
 * @param {object} [opts]
 * @param {number} [opts.temperature]
 * @param {number} [opts.timeoutMs]
 * @returns {Promise<string>} assistant reply text
 */
async function callLlm(messages, opts = {}) {
  const { temperature = 0.85, timeoutMs = 20000 } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(LLM7_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getLlmKey()}`,
      },
      body: JSON.stringify({ model: LLM7_MODEL, messages, temperature }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`LLM request failed: HTTP ${res.status}`);
    const data = await res.json();
    const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text) throw new Error('LLM returned an empty response');
    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Convenience helper: ask the LLM for strict JSON and parse it.
 * Wraps the prompt with an instruction to reply with JSON only, and
 * strips ```json fences if the model adds them anyway.
 */
async function callLlmJson(messages, opts = {}) {
  const jsonMessages = [
    ...messages,
    { role: 'system', content: 'Respond with ONLY valid JSON. No prose, no markdown fences.' },
  ];
  const raw = await callLlm(jsonMessages, opts);
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}
