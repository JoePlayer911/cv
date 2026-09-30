/* ==========================================================================
   shared.js — Centralized utilities for Jonathan Ie's project pages

   Sections:
     1. Curriculum registry  — built-in HSK sheets + any Google Sheet link a
                               visitor pastes (saved in their browser).
     2. Vocabulary fetching  — keyless gviz CSV export, cached, validated.
     3. Level <select> + "Add a sheet link" dialog, shared by every game.
     4. Learning progress    — per-word Leitner boxes shared across games.
     5. Pinyin & tone tools  — syllable splitting, tone detection, colouring.
     6. Speech               — browser text-to-speech for Mandarin.
     7. Misc helpers         — shuffle, escapeHtml.
   ========================================================================== */

/* ==========================================================================
   1. Curriculum registry
   ========================================================================== */

/**
 * Vocabulary sheets are fetched via Google's public "gviz" CSV export.
 * This requires ZERO API key — the source spreadsheet just needs to be
 * shared as "Anyone with the link can view" (Share -> General access).
 *
 * Sheet layout (any tab):  A = Chinese word · B = pinyin · C = meaning.
 * A header row is optional and detected automatically.
 */
const VOCAB_SHEET_NAME = 'vocabs';
const VOCAB_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const VOCAB_CACHE_PREFIX = 'vocabCache2:';
const CUSTOM_SHEETS_KEY = 'customVocabSheets';
const ACTIVE_SHEET_KEY = 'activeVocabSheet';
const ADD_SHEET_OPTION = '__add_sheet__';

/** Built-in curricula (their vocab lives on a tab named "vocabs"). */
const BUILTIN_LEVELS = [
  { id: '1wOdT3XP0XFnD4OHEjOwvMhk4pKqRAU3TZ9sHzKuJFkU', label: 'HSK 1' },
  { id: '1F4-cr9gya_fc8N-MlcwngH9oAwXLVbq-Cqcljww522k', label: 'HSK 2' },
  { id: '18qSMMc3F8NXKWOEFAflddZYYP-swUkqgziX0RRtioYk', label: 'HSK 3' },
  { id: '1xSrE6yfKhaOhhKn1uoy8M0oi1rdvsqlLlLLLccuiTTQ', label: 'HSK 4' },
  { id: '1tL5c0P0iNlx-lBSuI3P_4Nwr5R39pD505G4P6ekMR58', label: 'HSK 5' },
  { id: '1w_nu8tAJ6Gqts7gHyeL79e6LYPfQaVfUkMkY2MbeOdI', label: "Jojo's Level" },
];

/**
 * Every selectable curriculum: built-ins followed by the visitor's own
 * saved sheet links. Entries: { id, label, custom? }. `id` is the value
 * every game passes to fetchVocabularyFromSheet() — for custom sheets it
 * is "<spreadsheetId>~<gid>".
 */
const VOCAB_LEVELS = BUILTIN_LEVELS.map(l => ({ ...l }));

function readCustomSheets() {
  try {
    const list = JSON.parse(localStorage.getItem(CUSTOM_SHEETS_KEY) || '[]');
    return Array.isArray(list) ? list.filter(s => s && s.id && s.label) : [];
  } catch {
    return [];
  }
}

function writeCustomSheets(list) {
  try { localStorage.setItem(CUSTOM_SHEETS_KEY, JSON.stringify(list)); } catch { /* not persisted */ }
}

function syncCustomLevels() {
  for (let i = VOCAB_LEVELS.length - 1; i >= 0; i--) {
    if (VOCAB_LEVELS[i].custom) VOCAB_LEVELS.splice(i, 1);
  }
  readCustomSheets().forEach(s => VOCAB_LEVELS.push({ id: s.id, label: s.label, custom: true }));
}

/**
 * Accepts a full Google Sheets URL (…/spreadsheets/d/<ID>/edit#gid=<GID>)
 * or a bare spreadsheet ID. Returns { sheetId, gid } or null.
 */
function parseSheetLink(input) {
  const text = String(input || '').trim();
  if (!text) return null;
  const idMatch = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/);
  const sheetId = idMatch ? idMatch[1] : (/^[a-zA-Z0-9_-]{20,}$/.test(text) ? text : null);
  if (!sheetId) return null;
  const gidMatch = text.match(/[#&?]gid=(\d+)/);
  return { sheetId, gid: gidMatch ? gidMatch[1] : '0' };
}

function levelKeyFor(sheetId, gid) {
  return `${sheetId}~${gid || '0'}`;
}

/** Resolve a level key to what the fetcher needs. */
function resolveLevelKey(key) {
  const builtin = BUILTIN_LEVELS.find(l => l.id === key);
  if (builtin) return { sheetId: key, gid: null, builtin: true };
  const [sheetId, gid] = String(key).split('~');
  return { sheetId, gid: gid || '0', builtin: false };
}

/** Save a custom sheet link. Returns its level key. */
function addCustomSheet(link, label) {
  const parsed = parseSheetLink(link);
  if (!parsed) throw new Error('That does not look like a Google Sheets link.');
  const id = levelKeyFor(parsed.sheetId, parsed.gid);
  const list = readCustomSheets().filter(s => s.id !== id);
  const cleanLabel = String(label || '').trim().slice(0, 40) || `My sheet ${list.length + 1}`;
  list.push({ id, label: cleanLabel, addedAt: Date.now() });
  writeCustomSheets(list);
  syncCustomLevels();
  return id;
}

function removeCustomSheet(key) {
  writeCustomSheets(readCustomSheets().filter(s => s.id !== key));
  syncCustomLevels();
  if (getActiveLevel() === key) setActiveLevel(BUILTIN_LEVELS[0].id);
}

function getLevelLabel(key) {
  const found = VOCAB_LEVELS.find(l => l.id === key);
  return found ? found.label : 'Custom sheet';
}

/** The curriculum the visitor last picked (shared by every game). */
function getActiveLevel() {
  try {
    const key = localStorage.getItem(ACTIVE_SHEET_KEY);
    if (key && VOCAB_LEVELS.some(l => l.id === key)) return key;
  } catch { /* ignore */ }
  return VOCAB_LEVELS[0].id;
}

function setActiveLevel(key) {
  try { localStorage.setItem(ACTIVE_SHEET_KEY, key); } catch { /* ignore */ }
}

/** A link that opens `page` with this curriculum pre-loaded. */
function curriculumShareLink(key, page = '') {
  const { sheetId, gid, builtin } = resolveLevelKey(key);
  const base = new URL(page || location.pathname, location.href);
  base.search = '';
  base.hash = '';
  if (!builtin) {
    base.searchParams.set('sheet', `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${gid}`);
    base.searchParams.set('name', getLevelLabel(key));
  } else {
    base.searchParams.set('level', getLevelLabel(key));
  }
  return base.toString();
}

/**
 * ?sheet=<google sheets link or id>&name=<label>  → adds + activates it.
 * ?level=HSK 2                                     → activates a built-in.
 * Lets a teacher share one link that sets every game to their word list.
 */
function applyCurriculumFromUrl() {
  try {
    const params = new URLSearchParams(location.search);
    const sheet = params.get('sheet');
    if (sheet && parseSheetLink(sheet)) {
      setActiveLevel(addCustomSheet(sheet, params.get('name') || 'Shared sheet'));
      return;
    }
    const level = params.get('level');
    if (level) {
      const found = VOCAB_LEVELS.find(l => l.label.toLowerCase() === level.toLowerCase());
      if (found) setActiveLevel(found.id);
    }
  } catch { /* ignore malformed params */ }
}

syncCustomLevels();
applyCurriculumFromUrl();

/* ==========================================================================
   2. Vocabulary fetching
   ========================================================================== */

/**
 * Small offline sample so a game never hard-fails if a sheet is
 * unreachable (network hiccup, sharing misconfigured, wrong ID, etc).
 */
const FALLBACK_VOCAB = [
  { vocab: '你好', pinyin: 'nǐ hǎo', meaning: 'hello', pass: 0 },
  { vocab: '谢谢', pinyin: 'xiè xie', meaning: 'thank you', pass: 0 },
  { vocab: '再见', pinyin: 'zài jiàn', meaning: 'goodbye', pass: 0 },
  { vocab: '朋友', pinyin: 'péng yǒu', meaning: 'friend', pass: 0 },
  { vocab: '学习', pinyin: 'xué xí', meaning: 'to study', pass: 0 },
  { vocab: '水', pinyin: 'shuǐ', meaning: 'water', pass: 0 },
  { vocab: '老师', pinyin: 'lǎo shī', meaning: 'teacher', pass: 0 },
  { vocab: '书', pinyin: 'shū', meaning: 'book', pass: 0 },
  { vocab: '吃饭', pinyin: 'chī fàn', meaning: 'to eat a meal', pass: 0 },
  { vocab: '喝茶', pinyin: 'hē chá', meaning: 'to drink tea', pass: 0 },
  { vocab: '中国', pinyin: 'zhōng guó', meaning: 'China', pass: 0 },
  { vocab: '学生', pinyin: 'xué sheng', meaning: 'student', pass: 0 },
  { vocab: '妈妈', pinyin: 'mā ma', meaning: 'mom', pass: 0 },
  { vocab: '猫', pinyin: 'māo', meaning: 'cat', pass: 0 },
  { vocab: '狗', pinyin: 'gǒu', meaning: 'dog', pass: 0 },
  { vocab: '大', pinyin: 'dà', meaning: 'big', pass: 0 },
  { vocab: '小', pinyin: 'xiǎo', meaning: 'small', pass: 0 },
  { vocab: '天气', pinyin: 'tiān qì', meaning: 'weather', pass: 0 },
  { vocab: '电脑', pinyin: 'diàn nǎo', meaning: 'computer', pass: 0 },
  { vocab: '手机', pinyin: 'shǒu jī', meaning: 'mobile phone', pass: 0 },
];

/** Last fetch error per level key (null when the last fetch succeeded). */
const vocabFetchErrors = {};

/**
 * Minimal RFC4180-ish CSV parser (handles quoted fields, embedded commas
 * and escaped quotes) — enough for Google's gviz CSV export.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length && r.some(cell => cell !== ''));
}

function vocabCacheGet(key) {
  try {
    const raw = localStorage.getItem(VOCAB_CACHE_PREFIX + key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > VOCAB_CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function vocabCacheSet(key, data) {
  try {
    localStorage.setItem(VOCAB_CACHE_PREFIX + key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* storage full/unavailable — caching is a nice-to-have, not required */
  }
}

const HAN_RE = /\p{Script=Han}/u;

function looksLikeHeaderRow(row) {
  const a = (row[0] || '').trim();
  const b = (row[1] || '').trim();
  if (/^(vocab|word|chinese|hanzi|character|term|汉字|漢字|词|詞|中文|生词|生詞)/i.test(a)) return true;
  if (/^pinyin$|^拼音$/i.test(b)) return true;
  return false;
}

/** Turn raw CSV rows (A word, B pinyin, C meaning, D pass) into vocab items. */
function rowsToVocab(rows) {
  if (rows.length && looksLikeHeaderRow(rows[0])) rows = rows.slice(1);
  const seen = new Set();
  const data = [];
  rows.forEach(r => {
    const item = {
      vocab: (r[0] || '').trim(),
      pinyin: (r[1] || '').trim().normalize('NFC'),
      meaning: (r[2] || '').trim(),
      pass: parseInt(r[3], 10) || 0,
    };
    if (!item.vocab || (!item.pinyin && !item.meaning)) return;
    if (seen.has(item.vocab)) return;
    seen.add(item.vocab);
    data.push(item);
  });
  return data;
}

async function fetchSheetCsv(sheetId, { sheetName, gid }) {
  const tab = sheetName ? `sheet=${encodeURIComponent(sheetName)}` : `gid=${encodeURIComponent(gid || '0')}`;
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:csv&headers=0&range=A1:D&${tab}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} — is the sheet shared as "Anyone with the link"?`);
  const text = await res.text();
  if (/^\s*</.test(text)) throw new Error('Google returned a sign-in page — share the sheet as "Anyone with the link can view".');
  return text;
}

/**
 * Load a curriculum. Never throws; reports problems via the result.
 * @returns {Promise<{words: Array, error: string|null, fallback: boolean}>}
 */
async function loadVocabulary(levelKey, opts = {}) {
  const { forceRefresh = false } = opts;
  const key = levelKey || getActiveLevel();

  if (!forceRefresh) {
    const cached = vocabCacheGet(key);
    if (cached && cached.length) {
      vocabFetchErrors[key] = null;
      return { words: cached, error: null, fallback: false };
    }
  }

  const { sheetId, gid, builtin } = resolveLevelKey(key);
  try {
    let text;
    if (builtin) {
      try {
        text = await fetchSheetCsv(sheetId, { sheetName: VOCAB_SHEET_NAME });
      } catch {
        text = await fetchSheetCsv(sheetId, { gid: '0' });
      }
    } else {
      text = await fetchSheetCsv(sheetId, { gid });
    }
    const data = rowsToVocab(parseCsv(text));
    if (!data.length) throw new Error('No words found. Put Chinese in column A, pinyin in B and the meaning in C.');
    vocabCacheSet(key, data);
    vocabFetchErrors[key] = null;
    return { words: data, error: null, fallback: false };
  } catch (err) {
    console.error('[shared.js] Vocabulary fetch failed, using offline sample list:', err);
    vocabFetchErrors[key] = err.message || String(err);
    return { words: FALLBACK_VOCAB, error: vocabFetchErrors[key], fallback: true };
  }
}

/**
 * Backwards-compatible fetcher used by the older games: resolves to the word
 * array (or the offline sample, with a small on-page notice, on failure).
 */
async function fetchVocabularyFromSheet(levelKey, opts = {}) {
  const result = await loadVocabulary(levelKey, opts);
  if (result.fallback && typeof document !== 'undefined') {
    showVocabNotice(`Couldn't load "${getLevelLabel(levelKey)}" (${result.error}) — playing with a small sample list instead.`);
  }
  return result.words;
}

/* ==========================================================================
   3. Level <select> + "Add a sheet link" dialog
   ========================================================================== */

let sharedUiStylesInjected = false;

function injectSharedUiStyles() {
  if (sharedUiStylesInjected || typeof document === 'undefined') return;
  sharedUiStylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .tone-1{color:#ff5d5d}.tone-2{color:#f7a531}.tone-3{color:#35c46a}.tone-4{color:#4c95ff}.tone-5{color:#9aa4b2}
    .cv-notice{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9000;max-width:min(92vw,560px);
      background:rgba(60,22,10,.94);color:#ffe3cf;border:1px solid #f97316;border-radius:14px;padding:10px 40px 10px 14px;
      font:500 .85rem/1.45 Inter,system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.4)}
    .cv-notice button{position:absolute;top:6px;right:8px;background:none;border:0;color:inherit;font-size:1.1rem;cursor:pointer}
    .cv-dialog-overlay{position:fixed;inset:0;z-index:9500;background:rgba(2,6,16,.72);backdrop-filter:blur(4px);
      display:flex;align-items:center;justify-content:center;padding:16px}
    .cv-dialog{width:min(94vw,500px);max-height:88vh;overflow:auto;background:#101d3f;color:#e8edf5;border:1px solid rgba(255,255,255,.12);
      border-radius:20px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.5);font:400 .95rem/1.5 Inter,system-ui,sans-serif}
    .cv-dialog h2{font:700 1.25rem Outfit,Inter,sans-serif;margin:0 0 6px}
    .cv-dialog p{margin:0 0 12px;color:#8fa4c4;font-size:.85rem}
    .cv-dialog label{display:block;font-size:.8rem;color:#8fa4c4;margin:10px 0 4px}
    .cv-dialog input{width:100%;box-sizing:border-box;min-height:42px;padding:9px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.14);
      background:rgba(255,255,255,.05);color:inherit;font:inherit}
    .cv-dialog__row{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap}
    .cv-dialog button{min-height:40px;padding:8px 18px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:transparent;
      color:inherit;font:600 .9rem Inter,system-ui,sans-serif;cursor:pointer}
    .cv-dialog button.cv-primary{background:linear-gradient(135deg,#3b8bff,#245ecf);border-color:transparent}
    .cv-dialog button:disabled{opacity:.5;cursor:wait}
    .cv-dialog__status{margin-top:12px;font-size:.85rem;min-height:1.2em}
    .cv-dialog__status.is-error{color:#ff8a8a}.cv-dialog__status.is-ok{color:#6ee7a0}
    .cv-dialog__preview{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
    .cv-dialog__preview span{padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.07);font-size:.85rem}
    .cv-dialog__saved{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
    .cv-dialog__saved li{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:10px;background:rgba(255,255,255,.04)}
    .cv-dialog__saved li span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .cv-dialog__saved li button{min-height:30px;padding:2px 10px;font-size:.8rem}
    .cv-dialog code{background:rgba(255,255,255,.08);padding:1px 6px;border-radius:6px}
  `;
  document.head.appendChild(style);
}

function showVocabNotice(message) {
  if (typeof document === 'undefined') return;
  injectSharedUiStyles();
  document.querySelectorAll('.cv-notice').forEach(n => n.remove());
  const el = document.createElement('div');
  el.className = 'cv-notice';
  el.setAttribute('role', 'status');
  el.innerHTML = `${escapeHtml(message)}<button type="button" aria-label="Dismiss">×</button>`;
  el.querySelector('button').addEventListener('click', () => el.remove());
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 12000);
}

/**
 * Modal for pasting a Google Sheets link. Validates the sheet (fetches it and
 * previews a few words) before saving. Resolves to the new level key, or null
 * if the visitor cancelled.
 */
function openSheetLinkDialog() {
  injectSharedUiStyles();
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'cv-dialog-overlay';
    overlay.innerHTML = `
      <div class="cv-dialog" role="dialog" aria-modal="true" aria-labelledby="cv-dialog-title">
        <h2 id="cv-dialog-title">Use your own word list</h2>
        <p>Paste a Google Sheets link. Column <code>A</code> = Chinese, <code>B</code> = pinyin, <code>C</code> = meaning.
           Share it as <b>Anyone with the link → Viewer</b>. It's saved in this browser and every game can use it.</p>
        <label for="cv-sheet-link">Google Sheets link</label>
        <input id="cv-sheet-link" type="url" placeholder="https://docs.google.com/spreadsheets/d/…" autocomplete="off" spellcheck="false" />
        <label for="cv-sheet-name">Name (optional)</label>
        <input id="cv-sheet-name" type="text" maxlength="40" placeholder="e.g. Chapter 3 words" />
        <div class="cv-dialog__status" id="cv-sheet-status" aria-live="polite"></div>
        <div class="cv-dialog__preview" id="cv-sheet-preview"></div>
        <div id="cv-sheet-saved-wrap"></div>
        <div class="cv-dialog__row">
          <button type="button" id="cv-sheet-cancel">Cancel</button>
          <button type="button" class="cv-primary" id="cv-sheet-add">Load &amp; use</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const linkInput = overlay.querySelector('#cv-sheet-link');
    const nameInput = overlay.querySelector('#cv-sheet-name');
    const status = overlay.querySelector('#cv-sheet-status');
    const preview = overlay.querySelector('#cv-sheet-preview');
    const addBtn = overlay.querySelector('#cv-sheet-add');
    const savedWrap = overlay.querySelector('#cv-sheet-saved-wrap');

    function renderSaved() {
      const saved = readCustomSheets();
      savedWrap.innerHTML = saved.length
        ? `<label>Your saved sheets</label><ul class="cv-dialog__saved">${saved.map(s =>
            `<li><span>${escapeHtml(s.label)}</span><button type="button" data-remove="${escapeHtml(s.id)}">Remove</button></li>`).join('')}</ul>`
        : '';
    }
    renderSaved();
    savedWrap.addEventListener('click', e => {
      const id = e.target.getAttribute && e.target.getAttribute('data-remove');
      if (id) { removeCustomSheet(id); renderSaved(); }
    });

    function close(result) {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      resolve(result);
    }
    function onKey(e) { if (e.key === 'Escape') close(null); }
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(null); });
    overlay.querySelector('#cv-sheet-cancel').addEventListener('click', () => close(null));

    async function submit() {
      const parsed = parseSheetLink(linkInput.value);
      preview.innerHTML = '';
      if (!parsed) {
        status.className = 'cv-dialog__status is-error';
        status.textContent = 'Paste the full link from your browser address bar (it contains /spreadsheets/d/…).';
        return;
      }
      addBtn.disabled = true;
      status.className = 'cv-dialog__status';
      status.textContent = 'Checking your sheet…';
      const key = levelKeyFor(parsed.sheetId, parsed.gid);
      const result = await loadVocabulary(key, { forceRefresh: true });
      addBtn.disabled = false;
      if (result.fallback) {
        status.className = 'cv-dialog__status is-error';
        status.textContent = `Couldn't read that sheet: ${result.error}`;
        return;
      }
      const words = result.words;
      status.className = 'cv-dialog__status is-ok';
      status.textContent = `✓ Found ${words.length} words.`;
      preview.innerHTML = words.slice(0, 5)
        .map(w => `<span>${escapeHtml(w.vocab)} · ${pinyinHtml(w.pinyin)} · ${escapeHtml(w.meaning)}</span>`).join('');
      const savedKey = addCustomSheet(linkInput.value, nameInput.value);
      setActiveLevel(savedKey);
      setTimeout(() => close(savedKey), 900);
    }
    addBtn.addEventListener('click', submit);
    linkInput.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    linkInput.focus();
  });
}

function fillLevelOptions(selectEl, selected) {
  const builtins = VOCAB_LEVELS.filter(l => !l.custom);
  const customs = VOCAB_LEVELS.filter(l => l.custom);
  const opt = l => `<option value="${escapeHtml(l.id)}">${escapeHtml(l.label)}</option>`;
  selectEl.innerHTML =
    `<optgroup label="Built-in">${builtins.map(opt).join('')}</optgroup>` +
    (customs.length ? `<optgroup label="My sheets">${customs.map(opt).join('')}</optgroup>` : '') +
    `<option value="${ADD_SHEET_OPTION}">➕ Use my own Google Sheet link…</option>`;
  selectEl.value = VOCAB_LEVELS.some(l => l.id === selected) ? selected : VOCAB_LEVELS[0].id;
}

/**
 * Fill a <select> with every curriculum (built-in + saved sheet links) and an
 * "add a sheet link" entry that opens the paste dialog. The choice is
 * remembered and shared across all games. Returns the element for chaining.
 */
function populateLevelSelect(selectEl) {
  injectSharedUiStyles();
  fillLevelOptions(selectEl, getActiveLevel());
  if (selectEl.dataset.cvWired) return selectEl;
  selectEl.dataset.cvWired = '1';
  let previous = selectEl.value;
  // Capture phase so the game's own change handlers never see the sentinel value.
  selectEl.addEventListener('change', async e => {
    if (selectEl.value !== ADD_SHEET_OPTION) {
      previous = selectEl.value;
      setActiveLevel(previous);
      return;
    }
    e.stopImmediatePropagation();
    const key = await openSheetLinkDialog();
    document.querySelectorAll('select[data-cv-wired]').forEach(s => {
      fillLevelOptions(s, s === selectEl ? (key || previous) : s.value);
    });
    previous = selectEl.value;
    if (key) selectEl.dispatchEvent(new Event('change'));
  }, true);
  return selectEl;
}

/* ==========================================================================
   4. Learning progress (shared across every game, per curriculum)

   Each word sits in a Leitner box 0–5. Correct answers move it up a box,
   mistakes drop it back to box 1. Box ≥ 4 counts as "mastered". Games use
   pickStudyWords() so shaky and unseen words come up more often.
   ========================================================================== */

const PROGRESS_PREFIX = 'vocabProgress:';

function getProgress(levelKey) {
  try { return JSON.parse(localStorage.getItem(PROGRESS_PREFIX + levelKey) || '{}') || {}; } catch { return {}; }
}

function saveProgress(levelKey, progress) {
  try { localStorage.setItem(PROGRESS_PREFIX + levelKey, JSON.stringify(progress)); } catch { /* ignore */ }
}

/** Record one answer for a word. Returns the word's new box (0–5). */
function recordAnswer(levelKey, vocab, correct) {
  if (!levelKey || !vocab) return 0;
  const progress = getProgress(levelKey);
  const s = progress[vocab] || { box: 0, seen: 0, right: 0, last: 0 };
  s.seen++;
  if (correct) { s.right++; s.box = Math.min(5, s.box + 1); }
  else s.box = 1;
  s.last = Date.now();
  progress[vocab] = s;
  saveProgress(levelKey, progress);
  return s.box;
}

function wordBox(levelKey, vocab) {
  const s = getProgress(levelKey)[vocab];
  return s ? s.box : 0;
}

/**
 * Weighted random pick of `n` distinct words: unseen and low-box words are
 * much more likely, mastered words still appear occasionally for review.
 */
function pickStudyWords(words, n, levelKey) {
  const progress = levelKey ? getProgress(levelKey) : {};
  const now = Date.now();
  const pool = words.map(w => {
    const s = progress[w.vocab];
    let weight;
    if (!s) weight = 4;
    else {
      const daysAgo = (now - s.last) / 86400000;
      weight = (6 - s.box) * (1 + Math.min(daysAgo, 7) / 2);
    }
    return { w, key: Math.pow(Math.random(), 1 / weight) };
  });
  pool.sort((a, b) => b.key - a.key);
  return pool.slice(0, Math.min(n, pool.length)).map(p => p.w);
}

function progressSummary(levelKey, words) {
  const progress = getProgress(levelKey);
  let seen = 0; let mastered = 0;
  words.forEach(w => {
    const s = progress[w.vocab];
    if (s) { seen++; if (s.box >= 4) mastered++; }
  });
  return { total: words.length, seen, mastered };
}

/* ==========================================================================
   5. Pinyin & tone tools
   ========================================================================== */

const TONE_MARK_MAP = {
  ā: ['a', 1], á: ['a', 2], ǎ: ['a', 3], à: ['a', 4],
  ē: ['e', 1], é: ['e', 2], ě: ['e', 3], è: ['e', 4],
  ī: ['i', 1], í: ['i', 2], ǐ: ['i', 3], ì: ['i', 4],
  ō: ['o', 1], ó: ['o', 2], ǒ: ['o', 3], ò: ['o', 4],
  ū: ['u', 1], ú: ['u', 2], ǔ: ['u', 3], ù: ['u', 4],
  ǖ: ['ü', 1], ǘ: ['ü', 2], ǚ: ['ü', 3], ǜ: ['ü', 4],
  ḿ: ['m', 2], ń: ['n', 2], ň: ['n', 3], ǹ: ['n', 4],
};

const TONE_COLORS = { 1: '#ff5d5d', 2: '#f7a531', 3: '#35c46a', 4: '#4c95ff', 5: '#9aa4b2' };
const TONE_NAMES = { 1: 'flat ˉ', 2: 'rising ˊ', 3: 'dipping ˇ', 4: 'falling ˋ', 5: 'neutral ·' };

const PINYIN_SYLLABLE_RE = /^(?:(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?(?:iang|iong|uang|ueng|ang|eng|ing|ong|uai|uan|üan|van|ian|iao|ai|ei|ao|ou|an|en|er|in|un|ün|vn|ia|ie|iu|ua|uo|ue|üe|ve|ui|a|o|e|i|u|ü|v)|ng|n|m|r)$/;

/** Base letters (no tone marks, lower-case, ü kept). Length-preserving. */
function stripToneMarks(s) {
  return Array.from(String(s).normalize('NFC').toLowerCase())
    .map(c => (TONE_MARK_MAP[c] ? TONE_MARK_MAP[c][0] : c)).join('');
}

/** Tone number (1–5) of a single syllable: marks or trailing digit. */
function syllableTone(syl) {
  const s = String(syl).normalize('NFC').toLowerCase();
  const digit = s.match(/([1-5])$/);
  if (digit) return +digit[1];
  for (const c of s) if (TONE_MARK_MAP[c]) return TONE_MARK_MAP[c][1];
  return 5;
}

/** Split a run of letters (e.g. "nǐhǎo") into exactly/at best pinyin syllables. */
function segmentPinyinRun(run, targetCount) {
  const base = stripToneMarks(run).replace(/[1-5]/g, m => m); // keep digits in place
  const chars = Array.from(run);
  const baseChars = Array.from(base);
  const n = baseChars.length;
  // memo[i] = best list of syllables for suffix starting at i
  const memo = new Map();
  function solve(i, remaining) {
    if (i === n) return remaining === 0 || remaining == null ? [] : null;
    if (remaining === 0) return null;
    const k = `${i}|${remaining}`;
    if (memo.has(k)) return memo.get(k);
    let best = null;
    for (let len = Math.min(7, n - i); len >= 1; len--) {
      let piece = baseChars.slice(i, i + len).join('');
      let end = i + len;
      if (/[1-5]/.test(baseChars[end] || '')) end++; // swallow numeric tone
      if (!PINYIN_SYLLABLE_RE.test(piece)) continue;
      const rest = solve(end, remaining == null ? null : remaining - 1);
      if (rest) {
        const candidate = [chars.slice(i, end).join(''), ...rest];
        if (!best || candidate.length < best.length) best = candidate;
        if (remaining != null) break;
      }
    }
    memo.set(k, best);
    return best;
  }
  return solve(0, targetCount == null ? null : targetCount) || [run];
}

/**
 * Split a pinyin string into syllables. When `targetCount` is given (the
 * number of Chinese characters) it tries hard to return exactly that many.
 */
function splitPinyin(pinyin, targetCount) {
  const tokens = String(pinyin || '').normalize('NFC').trim()
    .split(/[\s'’\-·,，.。/;；]+/).filter(Boolean);
  if (targetCount == null || tokens.length === targetCount) {
    return tokens.length === 1 && targetCount == null ? segmentPinyinRun(tokens[0]) : tokens;
  }
  if (tokens.length > targetCount) return tokens;
  // Too few tokens: some are glued together ("nǐhǎo"). Split the longest ones.
  let result = tokens.slice();
  for (let guard = 0; guard < 8 && result.length < targetCount; guard++) {
    let bestIdx = -1; let bestSplit = null;
    result.forEach((t, idx) => {
      if (bestSplit) return;
      const parts = segmentPinyinRun(t);
      if (parts.length > 1) { bestIdx = idx; bestSplit = parts; }
    });
    if (!bestSplit) break;
    result.splice(bestIdx, 1, ...bestSplit);
  }
  if (result.length !== targetCount && tokens.length === 1) {
    const exact = segmentPinyinRun(tokens[0], targetCount);
    if (exact.length === targetCount) return exact;
  }
  return result;
}

/** Array of the Chinese characters in a word (drops punctuation/latin). */
function hanziChars(word) {
  return Array.from(String(word || '')).filter(c => HAN_RE.test(c));
}

/**
 * Pair each Chinese character with its pinyin syllable and tone.
 * Returns [{ char, syl, tone }] or null if they can't be aligned.
 */
function alignPinyin(word, pinyin) {
  const chars = hanziChars(word);
  if (!chars.length) return null;
  const syls = splitPinyin(pinyin, chars.length);
  if (syls.length !== chars.length) return null;
  return chars.map((char, i) => ({ char, syl: syls[i], tone: syllableTone(syls[i]) }));
}

/** Pinyin as HTML with each syllable coloured by tone (.tone-1 … .tone-5). */
function pinyinHtml(pinyin) {
  injectSharedUiStyles();
  return String(pinyin || '').normalize('NFC').split(/(\s+)/).map(part => {
    if (!part.trim()) return part;
    const syls = segmentPinyinRun(part);
    return syls.map(s => `<span class="tone-${syllableTone(s)}">${escapeHtml(s)}</span>`).join('');
  }).join('');
}

/* ==========================================================================
   6. Speech (browser TTS — free, no key; quality depends on the device)
   ========================================================================== */

let zhVoice = null;
let zhVoiceChecked = false;

function findChineseVoice() {
  if (typeof speechSynthesis === 'undefined') return null;
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;
  zhVoiceChecked = true;
  const score = v => {
    const lang = (v.lang || '').toLowerCase().replace('_', '-');
    if (!/^(zh|cmn)/.test(lang)) return -1;
    let s = 0;
    if (/zh-cn|cmn-hans/.test(lang)) s += 4;
    if (/google|natural|neural|online/i.test(v.name)) s += 2;
    if (/zh-tw|zh-hk|yue/.test(lang)) s -= 1;
    return s;
  };
  zhVoice = voices.filter(v => score(v) >= 0).sort((a, b) => score(b) - score(a))[0] || null;
  return zhVoice;
}

if (typeof speechSynthesis !== 'undefined') {
  findChineseVoice();
  speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', findChineseVoice);
}

/** Resolves true when a Mandarin voice is available on this device. */
function hasChineseVoice(timeoutMs = 1500) {
  if (typeof speechSynthesis === 'undefined') return Promise.resolve(false);
  if (zhVoice || findChineseVoice()) return Promise.resolve(true);
  return new Promise(resolve => {
    const start = Date.now();
    const poll = setInterval(() => {
      if (findChineseVoice() || Date.now() - start > timeoutMs) {
        clearInterval(poll);
        resolve(!!zhVoice);
      }
    }, 150);
  });
}

/** Speak Chinese text. Returns false if speech isn't possible here. */
function speakChinese(text, { rate = 0.85, interrupt = true } = {}) {
  if (typeof speechSynthesis === 'undefined' || !text) return false;
  const voice = zhVoice || findChineseVoice();
  if (!voice && zhVoiceChecked) return false;
  try {
    if (interrupt) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice ? voice.lang : 'zh-CN';
    if (voice) u.voice = voice;
    u.rate = rate;
    speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

/* ==========================================================================
   7. Misc helpers
   ========================================================================== */

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
