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
    nests: [{ c: lv.queue[0], n: 0 }, lv.queue.length > 1 ? { c: lv.queue[1], n: 0 } : null],
    qi: Math.min(2, lv.queue.length),
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

// Build a level that is guaranteed solvable: birds are placed one by one, each facing a
// direction that is clear of birds placed before it, so removing them in reverse order always works.
// Colours are then dealt along that order with a little shuffling, and the order is simulated
// to make sure it never needs more than cap-2 perches.
function generate(L) {
  const p = levelParams(L), cap = 5;
  const rand = rng(L * 7919 + 13);
  let best = null;
  for (let attempt = 0; attempt < 120; attempt++) {
    const { R, C } = p;
    const occ = new Int16Array(R * C).fill(-1);
    const cells = shuffle([...Array(R * C).keys()], rand);
    const placed = [];
    for (const idx of cells) {
      if (placed.length >= p.birds) break;
      const r = Math.floor(idx / C), c = idx % C;
      const dirs = [0, 1, 2, 3].filter(d => rayBlocker(occ, R, C, r, c, d) < 0);
      if (!dirs.length) continue;
      dirs.sort((a, b) => rayLen(R, C, r, c, b) - rayLen(R, C, r, c, a));
      const d = rand() < 0.7 ? dirs[0] : dirs[Math.floor(rand() * dirs.length)];
      occ[idx] = placed.length; placed.push({ r, c, d });
    }
    const trim = attempt >= 50 ? 3 * Math.floor((attempt - 40) / 10) : 0;
    const n = Math.floor(placed.length / 3) * 3 - trim;
    if (n < 6) continue;
    placed.length = n;
    const queue = nestOrder(n / 3, Math.min(p.colors, n / 3 + 1), rand);
    const seq = []; queue.forEach(c => seq.push(c, c, c));
    const dd = Math.max(0, p.d - Math.floor(attempt / 12));
    for (let i = 0; i < n; i++) { const j = i + Math.floor(rand() * (dd + 1)); if (j < n) [seq[i], seq[j]] = [seq[j], seq[i]]; }
    for (let k = 0; k < n; k++) placed[n - 1 - k].color = seq[k];
    const lv = { L, R, C, cap, birds: placed, queue, boss: !!p.boss };
    let s = initLite(lv), maxWire = 0, ok = true;
    for (let k = 0; k < n; k++) {
      const i = n - 1 - k;
      if (rayBlocker(s.occ, R, C, placed[i].r, placed[i].c, placed[i].d) >= 0) { ok = false; break; }
      s = applyLite(lv, s, i); maxWire = Math.max(maxWire, s.wire.length);
      if (isLost(lv, s)) { ok = false; break; }
    }
    if (!ok || !isWon(s)) continue;
    if (maxWire <= cap - 2) return lv;
    if (!best) best = lv;
  }
  return best;
}

if (typeof module !== 'undefined') module.exports = { DIRS, levelParams, rayBlocker, initLite, freeMoves, applyLite, isWon, isLost, solve, generate, rng };
