/* ==========================================================================
   daily.js — Deterministic "daily challenge" helpers.

   Every player who opens a game on the same UTC day, for the same salt
   (e.g. a vocab level's sheet ID), gets the exact same puzzle. That makes
   a fair shared daily leaderboard possible with zero server-side puzzle
   generation — the "puzzle of the day" is just math on today's date.
   ========================================================================== */

/** Today's UTC date key, e.g. '2026-08-25'. */
function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

// Mulberry32 — small, fast, deterministic PRNG from a 32-bit seed.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic RNG seeded by (today's date + salt) — same inputs always
 * produce the same sequence, so every visitor gets today's same puzzle.
 */
function dailyRandom(salt, date = new Date()) {
  return mulberry32(hashString(todayKey(date) + '::' + String(salt)));
}

/** Deterministically pick one item from an array for today's challenge. */
function dailyPick(arr, salt, date = new Date()) {
  const rnd = dailyRandom(salt, date);
  return arr[Math.floor(rnd() * arr.length)];
}

/** Deterministically shuffle an array for today's challenge. */
function dailyShuffle(arr, salt, date = new Date()) {
  const rnd = dailyRandom(salt, date);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
