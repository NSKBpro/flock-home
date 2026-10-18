// Flock Home — pure game engine (no DOM). Shared by level generator, hint solver and the live game.
const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // 0 up, 1 right, 2 down, 3 left
const PALN = 6;

function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffle(a, rand) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function levelParams(L) {
  if (L === 1) return { R: 4, C: 4, colors: 2, birds: 6, d: 0 };
  if (L === 2) return { R: 5, C: 4, colors: 2, birds: 9, d: 1 };
  if (L === 3) return { R: 5, C: 5, colors: 3, birds: 12, d: 2 };
  if (L === 4) return { R: 6, C: 5, colors: 3, birds: 15, d: 3 };
  const boss = L % 10 === 0;
  const C = Math.min(7, 5 + Math.floor((L - 4) / 4));
  const R = Math.min(9, 6 + Math.floor((L - 4) / 3));
  const colors = Math.min(6, 3 + Math.floor((L - 4) / 3));
  const fill = Math.min(0.7, 0.56 + (L - 4) * 0.008) + (boss ? 0.04 : 0);
  const birds = Math.floor(R * C * Math.min(fill, 0.8) / 3) * 3;
  const d = Math.min(10, 3 + Math.floor((L - 4) / 2)) + (boss ? 2 : 0);
  return { R, C, colors, birds, d, boss };
}

function rayBlocker(occ, R, C, r, c, d) {
  const [dr, dc] = DIRS[d];
  let rr = r + dr, cc = c + dc;
  while (rr >= 0 && rr < R && cc >= 0 && cc < C) {
    const o = occ[rr * C + cc];
    if (o >= 0) return o;
    rr += dr; cc += dc;
  }
  return -1;
}
function rayLen(R, C, r, c, d) { return d === 0 ? r : d === 2 ? R - 1 - r : d === 3 ? c : C - 1 - c; }

// ---- lite state: what the solver and generator simulate ----
function initLite(lv) {
  const occ = new Int16Array(lv.R * lv.C).fill(-1);
  lv.birds.forEach((b, i) => { occ[b.r * lv.C + b.c] = i; });
  return {
    occ, alive: new Uint8Array(lv.birds.length).fill(1), rem: lv.birds.length, wire: [],
    nests: Array.from({ length: lv.open || 2 }, (_, i) => i < lv.queue.length ? { c: lv.queue[i], n: 0 } : null),
    qi: Math.min(lv.open || 2, lv.queue.length),
  };
}
function freeMoves(lv, s) {
  const out = [];
  for (let i = 0; i < lv.birds.length; i++) {
    if (!s.alive[i]) continue;
    const b = lv.birds[i];
    if (rayBlocker(s.occ, lv.R, lv.C, b.r, b.c, b.d) < 0) out.push(i);
  }
  return out;
}
function resolveLite(lv, s, ni) {
  while (s.nests[ni] && s.nests[ni].n === 3) {
    s.nests[ni] = s.qi < lv.queue.length ? { c: lv.queue[s.qi++], n: 0 } : null;
    const n = s.nests[ni];
    if (!n) break;
    for (let k = 0; k < s.wire.length && n.n < 3;) {
      if (s.wire[k] === n.c) { s.wire.splice(k, 1); n.n++; } else k++;
    }
  }
}
function applyLite(lv, s, i) {
  const b = lv.birds[i];
  const s2 = {
    occ: Int16Array.from(s.occ), alive: Uint8Array.from(s.alive), rem: s.rem - 1,
    wire: s.wire.slice(), nests: s.nests.map(n => n ? { c: n.c, n: n.n } : null), qi: s.qi,
  };
  s2.occ[b.r * lv.C + b.c] = -1; s2.alive[i] = 0;
  const ni = s2.nests.findIndex(n => n && n.c === b.color && n.n < 3);
  if (ni >= 0) { s2.nests[ni].n++; resolveLite(lv, s2, ni); }
  else s2.wire.push(b.color);
  return s2;
}
const isWon = s => s.rem === 0 && s.wire.length === 0;
const isLost = (lv, s) => s.wire.length >= lv.cap;

// Depth-first solver used for hints. Tries nest-matching moves first.
function solve(lv, s0, budget = 30000) {
  const seen = new Set(); let nodes = 0;
  const key = s => s.alive.join('') + '|' + s.wire.join(',') + '|' + s.nests.map(n => n ? n.c + ':' + n.n : 'x').join(',') + '|' + s.qi;
  function score(s, i) {
    const c = lv.birds[i].color;
    if (s.nests.some(n => n && n.c === c && n.n < 3)) return 0;
    const ahead = lv.queue.slice(s.qi, s.qi + 2).indexOf(c);
    return ahead < 0 ? 3 : 1 + ahead;
  }
  function dfs(s) {
    if (isWon(s)) return [];
    if (isLost(lv, s)) return null;
    if (++nodes > budget) return null;
    const k = key(s); if (seen.has(k)) return null; seen.add(k);
    const moves = freeMoves(lv, s).sort((a, b) => score(s, a) - score(s, b));
    for (const m of moves) { const r = dfs(applyLite(lv, s, m)); if (r) { r.unshift(m); return r; } }
    return null;
  }
  return dfs(s0);
}

function nestOrder(n, colors, rand) {
  const pal = shuffle([...Array(PALN).keys()], rand).slice(0, colors);
  let pool = [];
  for (let t = 0; t < 60; t++) {
    pool = []; for (let i = 0; i < n; i++) pool.push(pal[i % colors]);
    shuffle(pool, rand);
    let ok = true; for (let i = 1; i < n; i++) if (pool[i] === pool[i - 1]) { ok = false; break; }
    if (ok) return pool;
  }
  return pool;
}

// Build one candidate level that is guaranteed solvable: birds are placed one by one, each facing a
// direction that is clear of birds placed before it, so removing them in reverse order always works.
// Colours are then dealt along that order with controlled shuffling (radius d), and the order is
// simulated to make sure it never needs more than maxWire perches.
//   p: { R, C, birds, colors, d, block, maxWire }
//   block (0..1): how strongly new birds are placed in the flight path of free birds, which makes
//                 longer chains of blocked birds and fewer choices at any moment.
// Returns the level, or null if this attempt failed.
function buildCandidate(p, rand, cap = 5) {
  const { R, C } = p;
  const occ = new Int16Array(R * C).fill(-1);
  const placed = [];
  const free = new Set(); // indices of placed birds whose path is currently clear
  let cells = shuffle([...Array(R * C).keys()], rand);
  while (placed.length < p.birds && cells.length) {
    let pickAt = 0;
    if (p.block > 0 && free.size && rand() < p.block) {
      // prefer an empty cell that sits in the flight path of a currently free bird
      const want = [];
      for (const i of free) {
        const b = placed[i], [dr, dc] = DIRS[b.d];
        for (let rr = b.r + dr, cc = b.c + dc; rr >= 0 && rr < R && cc >= 0 && cc < C; rr += dr, cc += dc) want.push(rr * C + cc);
      }
      if (want.length) {
        const target = want[Math.floor(rand() * want.length)];
        const at = cells.indexOf(target);
        if (at >= 0) pickAt = at;
      }
    }
    const idx = cells[pickAt]; cells.splice(pickAt, 1);
    const r = Math.floor(idx / C), c = idx % C;
    const dirs = [0, 1, 2, 3].filter(d => rayBlocker(occ, R, C, r, c, d) < 0);
    if (!dirs.length) continue;
    dirs.sort((a, b) => rayLen(R, C, r, c, b) - rayLen(R, C, r, c, a));
    const d = rand() < 0.6 ? dirs[0] : dirs[Math.floor(rand() * dirs.length)];
    const id = placed.length;
    occ[idx] = id; placed.push({ r, c, d });
    for (const i of [...free]) { const b = placed[i]; if (rayBlocker(occ, R, C, b.r, b.c, b.d) >= 0) free.delete(i); }
    free.add(id);
  }
  const n = Math.floor(placed.length / 3) * 3;
  if (n < 6) return null;
  // drop the last-placed birds (they are the first to leave, so this keeps the guarantee)
  placed.length = n;
  const queue = nestOrder(n / 3, Math.min(p.colors, n / 3 + 1), rand);
  const seq = []; queue.forEach(c => seq.push(c, c, c));
  for (let i = 0; i < n; i++) { const j = i + Math.floor(rand() * (p.d + 1)); if (j < n) [seq[i], seq[j]] = [seq[j], seq[i]]; }
  for (let k = 0; k < n; k++) placed[n - 1 - k].color = seq[k];
  const lv = { R, C, cap, birds: placed, queue };
  if (p.open) lv.open = p.open;
  let s = initLite(lv), maxWire = 0;
  for (let k = 0; k < n; k++) {
    const i = n - 1 - k;
    if (rayBlocker(s.occ, R, C, placed[i].r, placed[i].c, placed[i].d) >= 0) return null;
    s = applyLite(lv, s, i); maxWire = Math.max(maxWire, s.wire.length);
    if (isLost(lv, s)) return null;
  }
  if (!isWon(s) || maxWire > (p.maxWire ?? cap - 2)) return null;
  lv.knownWire = maxWire; // perches used by the construction order: an upper bound on what is needed
  return lv;
}

// Procedural level for any number. Used for quick generation and as a fallback;
// the shipped game prefers the curated pack (see levelFor).
function generate(L) {
  const p = levelParams(L), cap = 5;
  const rand = rng(L * 7919 + 13);
  for (let attempt = 0; attempt < 160; attempt++) {
    const trim = attempt >= 50 ? 3 * Math.floor((attempt - 40) / 10) : 0;
    const q = { R: p.R, C: p.C, colors: p.colors, birds: Math.max(6, p.birds - trim), d: Math.max(0, p.d - Math.floor(attempt / 12)), block: 0, maxWire: attempt < 120 ? cap - 2 : cap - 1 };
    const lv = buildCandidate(q, rand, cap);
    if (lv) { lv.L = L; lv.boss = !!p.boss; delete lv.knownWire; return lv; }
  }
  return null;
}

// ---------- difficulty measurement ----------

// Fewest perches that best play needs. 0 = the wire is never needed.
// Unknown (search budget ran out) counts as "needs more", so the result can over-estimate.
function forcedWait(lv, budget = 20000) {
  const upper = lv.knownWire ?? lv.cap - 1;
  for (let c = 0; c < upper; c++) {
    if (solve({ ...lv, cap: c + 1 }, initLite(lv), budget)) return c;
  }
  return upper;
}

// Bot that frees a bird whose nest is open with probability `pref`, otherwise a random free bird.
// pref = 1 is "greedy": it never plans ahead. If it wins nearly always, the level has no real decisions.
function botWinRate(lv, pref, runs = 120, seed = 1) {
  let wins = 0;
  for (let k = 0; k < runs; k++) {
    const r = rng(seed * 100003 + k);
    let s = initLite(lv);
    while (!isWon(s) && !isLost(lv, s)) {
      const m = freeMoves(lv, s);
      if (!m.length) break;
      const good = m.filter(i => s.nests.some(n => n && n.c === lv.birds[i].color && n.n < 3));
      const pick = good.length && r() < pref ? good[Math.floor(r() * good.length)] : m[Math.floor(r() * m.length)];
      s = applyLite(lv, s, pick);
    }
    if (isWon(s)) wins++;
  }
  return Math.round(100 * wins / runs);
}

// ---------- level pack encoding ----------
// Compact string per level: "R,C,queue,birds,open" where queue is one digit per nest colour and
// birds is 4 chars per bird: row, column (base 36), direction, colour; open = nests open at once.
function encodeLevel(lv) {
  const b = lv.birds.map(x => x.r.toString(36) + x.c.toString(36) + x.d + x.color).join('');
  return `${lv.R},${lv.C},${lv.queue.join('')},${b},${lv.open || 2}`;
}
function decodeLevel(str, cap = 5) {
  const [R, C, q, b, open] = str.split(',');
  const birds = [];
  for (let i = 0; i < b.length; i += 4) birds.push({ r: parseInt(b[i], 36), c: parseInt(b[i + 1], 36), d: +b[i + 2], color: +b[i + 3] });
  return { R: +R, C: +C, cap, open: +(open || 2), queue: [...q].map(Number), birds };
}

// Mirror and recolour a level. Keeps it solvable and keeps its difficulty identical,
// which is how levels beyond the pack stay interesting.
function transformLevel(lv, flipH, flipV, perm) {
  const dmap = d => (flipV && (d === 0 || d === 2)) ? 2 - d : (flipH && (d === 1 || d === 3)) ? 4 - d : d;
  return {
    ...lv,
    queue: lv.queue.map(c => perm[c]),
    birds: lv.birds.map(b => ({ r: flipV ? lv.R - 1 - b.r : b.r, c: flipH ? lv.C - 1 - b.c : b.c, d: dmap(b.d), color: perm[b.color] })),
  };
}

// The level the game plays for number L: the curated pack first, then endless variations of its
// later levels (mirrored and recoloured), and the procedural generator only if there is no pack.
// pack: array of { s: encoded string, boss?: bool }
function levelFor(L, pack) {
  if (pack && pack.length) {
    if (L <= pack.length) {
      const e = pack[L - 1];
      return { ...decodeLevel(e.s), L, boss: !!e.boss };
    }
    const tail = Math.min(40, pack.length);
    const k = L - pack.length - 1;
    const e = pack[pack.length - tail + (k % tail)];
    const rand = rng(L * 104729 + 7);
    const perm = shuffle([...Array(PALN).keys()], rand);
    const lv = transformLevel(decodeLevel(e.s), rand() < 0.5, rand() < 0.5 || k % 2 === 0, perm);
    return { ...lv, L, boss: !!e.boss };
  }
  return generate(L);
}

if (typeof module !== 'undefined') module.exports = {
  DIRS, PALN, levelParams, rayBlocker, initLite, freeMoves, applyLite, isWon, isLost, solve,
  buildCandidate, generate, forcedWait, botWinRate, encodeLevel, decodeLevel, transformLevel, levelFor, rng, shuffle,
};
