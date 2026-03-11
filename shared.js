/* ==========================================================================
   shared.js — Centralized utilities for Jonathan Ie's project pages
   ========================================================================== */

/**
 * Google Sheets API key (public / read-only).
 * Centralized here so it's easy to rotate if needed.
 */
const GSHEETS_API_KEY = atob('QUl6YVN5QkE3S0M2VXZ3enY1SHBObklHQWV0YjdYUndwa1paTURN');

/**
 * Standard vocabulary range for all HSK / language projects.
 */
const VOCAB_RANGE = 'vocabs!A2:D';

/**
 * Fetch vocabulary rows from a Google Sheet.
 * @param {string} spreadsheetId  – The Google Sheet ID (from <select> value).
 * @returns {Promise<Array<{vocab:string, pinyin:string, meaning:string, pass:number}>>}
 */
async function fetchVocabularyFromSheet(spreadsheetId) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(VOCAB_RANGE)}?key=${encodeURIComponent(GSHEETS_API_KEY)}`;
  const res = await axios.get(url);
  const rows = res.data.values || [];
  return rows.map(row => ({
    vocab:   row[0] || '',
    pinyin:  row[1] || '',
    meaning: row[2] || '',
    pass:    parseInt(row[3]) || 0,
  })).filter(v => v.vocab);
}

/**
 * Fisher-Yates shuffle (returns a new array).
 */
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Escape HTML special characters to prevent XSS.
 */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}
