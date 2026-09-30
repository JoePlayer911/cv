/* ==========================================================================
   firebase-client.js — Shared Firebase access for leaderboards & duel rooms.

   Loaded as an ES module: <script type="module" src="firebase-client.js"></script>
   Exposes a plain-object API on window.FirebaseClient so regular
   (non-module) game scripts can call it just like any other shared helper.

   SECURITY MODEL: the config object below is NOT a secret. Firebase web
   apps are protected by Firestore/Auth *security rules* (see
   firestore.rules), not by hiding this config — it is safe to commit to a
   public repo, exactly like it appears in every Firebase quickstart.
   Every visitor signs in anonymously (no email/password) purely to get a
   stable uid that the security rules use to stop one player from editing
   or deleting another player's score/duel data.
   ========================================================================== */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import {
  getAuth, signInAnonymously, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import {
  getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs,
  query, orderBy, limit, onSnapshot, serverTimestamp, updateDoc,
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

/**
 * ── Fill this in with YOUR Firebase project's public web config ──
 * Firebase console → Project settings → General → "Your apps" →
 * Web app (</>) → SDK setup and configuration → Config.
 */
const firebaseConfig = {
  apiKey: 'REPLACE_ME',
  authDomain: 'REPLACE_ME.firebaseapp.com',
  projectId: 'REPLACE_ME',
  storageBucket: 'REPLACE_ME.appspot.com',
  messagingSenderId: 'REPLACE_ME',
  appId: 'REPLACE_ME',
};

const isConfigured = Object.values(firebaseConfig).every(v => typeof v === 'string' && !v.startsWith('REPLACE_ME'));

let db = null;
let readyPromise = Promise.resolve(null);

if (isConfigured) {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  db = getFirestore(app);
  readyPromise = new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) resolve(user);
      else signInAnonymously(auth).catch((err) => {
        console.error('[firebase-client] anonymous sign-in failed:', err);
        resolve(null);
      });
    });
  });
} else {
  console.warn('[firebase-client] Firebase config not set — leaderboards & duel rooms are disabled. Fill in firebaseConfig in firebase-client.js.');
}

async function ready() {
  return readyPromise;
}

async function currentUid() {
  const user = await ready();
  return user ? user.uid : null;
}

/* ---------- Display name (local, per-browser) ---------- */

function getDisplayName() {
  try { return localStorage.getItem('playerDisplayName') || ''; } catch { return ''; }
}

function setDisplayName(name) {
  try { localStorage.setItem('playerDisplayName', name); } catch { /* ignore */ }
}

/* ---------- Leaderboards: /leaderboards/{gameId}/{period}/{scoreId} ---------- */

/**
 * @param {string} gameId   e.g. 'hanzidle'
 * @param {object} opts
 * @param {number} opts.score
 * @param {object} [opts.meta]    small extra fields (guesses, timeMs, ...)
 * @param {string} [opts.period]  'alltime' or a daily key like '2026-08-25'
 */
async function submitScore(gameId, { score, meta = {}, period = 'alltime' } = {}) {
  const user = await ready();
  if (!user || !db) return { ok: false, reason: 'offline' };
  try {
    await addDoc(collection(db, 'leaderboards', gameId, period), {
      uid: user.uid,
      name: (getDisplayName() || 'Anonymous').slice(0, 40),
      score,
      meta,
      createdAt: serverTimestamp(),
    });
    return { ok: true };
  } catch (err) {
    console.error('[firebase-client] submitScore failed:', err);
    return { ok: false, reason: err.message };
  }
}

async function getLeaderboard(gameId, { period = 'alltime', top = 10 } = {}) {
  const user = await ready();
  if (!user || !db) return [];
  try {
    const q = query(collection(db, 'leaderboards', gameId, period), orderBy('score', 'desc'), limit(top));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('[firebase-client] getLeaderboard failed:', err);
    return [];
  }
}

/* ---------- Duel rooms: /duels/{gameId_CODE} ---------- */

function randomRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function createDuelRoom(gameId, initialState = {}) {
  const user = await ready();
  if (!user || !db) return null;
  const code = randomRoomCode();
  const ref = doc(db, 'duels', `${gameId}_${code}`);
  await setDoc(ref, {
    gameId,
    code,
    status: 'waiting',
    hostUid: user.uid,
    players: { [user.uid]: { name: (getDisplayName() || 'Host').slice(0, 40), ready: false } },
    state: initialState,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return code;
}

async function joinDuelRoom(gameId, code) {
  const user = await ready();
  if (!user || !db) return false;
  const ref = doc(db, 'duels', `${gameId}_${code.toUpperCase()}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  await updateDoc(ref, {
    [`players.${user.uid}`]: { name: (getDisplayName() || 'Guest').slice(0, 40), ready: false },
    updatedAt: serverTimestamp(),
  });
  return true;
}

function watchDuelRoom(gameId, code, callback) {
  if (!db) return () => {};
  const ref = doc(db, 'duels', `${gameId}_${code.toUpperCase()}`);
  return onSnapshot(ref, (snap) => callback(snap.exists() ? snap.data() : null));
}

async function updateDuelRoom(gameId, code, patch) {
  if (!db) return;
  const ref = doc(db, 'duels', `${gameId}_${code.toUpperCase()}`);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
}

window.FirebaseClient = {
  isConfigured,
  ready,
  currentUid,
  getDisplayName,
  setDisplayName,
  submitScore,
  getLeaderboard,
  createDuelRoom,
  joinDuelRoom,
  watchDuelRoom,
  updateDuelRoom,
};

window.dispatchEvent(new CustomEvent('firebase-client-ready'));
