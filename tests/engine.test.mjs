import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('../src/engine.js');

test('every generated level 1–80 exists and has a multiple of 3 birds', () => {
  for (let L = 1; L <= 80; L++) {
    const lv = E.generate(L);
    assert.ok(lv, `level ${L} failed to generate`);
    assert.equal(lv.birds.length % 3, 0, `level ${L}`);
    assert.equal(lv.queue.length * 3, lv.birds.length, `level ${L}: nests must hold every bird`);
  }
});

test('generation is deterministic', () => {
  for (const L of [1, 7, 23, 50]) assert.deepEqual(E.generate(L), E.generate(L));
});

test('each colour appears exactly as often as its nests need', () => {
  for (let L = 1; L <= 40; L++) {
    const lv = E.generate(L), count = {};
    lv.birds.forEach(b => { count[b.color] = (count[b.color] || 0) + 1; });
    lv.queue.forEach(c => { count[c] -= 3; });
    assert.ok(Object.values(count).every(v => v === 0), `level ${L}`);
  }
});

test('no two birds share a cell', () => {
  for (let L = 1; L <= 40; L++) {
    const lv = E.generate(L), seen = new Set();
    for (const b of lv.birds) { const k = b.r * lv.C + b.c; assert.ok(!seen.has(k), `level ${L}`); seen.add(k); }
  }
});

test('the solver finds a winning order for every level', () => {
  for (let L = 1; L <= 60; L++) {
    const lv = E.generate(L);
    const path = E.solve(lv, E.initLite(lv), 60000);
    assert.ok(path, `level ${L} unsolved`);
    let s = E.initLite(lv);
    for (const m of path) {
      assert.ok(E.freeMoves(lv, s).includes(m), `level ${L}: solver used a blocked bird`);
      s = E.applyLite(lv, s, m);
      assert.ok(!E.isLost(lv, s), `level ${L}: solver path overflows the wire`);
    }
    assert.ok(E.isWon(s), `level ${L}: solver path does not finish`);
  }
});

test('a bird is blocked by the first bird in the direction it faces', () => {
  const lv = { R: 3, C: 3, cap: 5, queue: [0, 1], birds: [
    { r: 1, c: 0, d: 1, color: 0 }, // faces right, blocked by the bird at (1,2)
    { r: 1, c: 2, d: 0, color: 1 }, // faces up, free
  ] };
  const s = E.initLite(lv);
  assert.deepEqual(E.freeMoves(lv, s), [1]);
  assert.deepEqual(E.freeMoves(lv, E.applyLite(lv, s, 1)), [0]);
});

test('waiting birds hop into a newly arrived nest', () => {
  // Nests: colour 0 then colour 1 (only two nests, so both are open at once) — use three nests
  // so colour 2 has to wait on the wire until the first nest fills.
  const birds = [];
  const colors = [2, 0, 0, 0, 1, 1, 1, 2, 2];
  colors.forEach((color, i) => birds.push({ r: 0, c: i, d: 0, color }));
  const lv = { R: 1, C: 9, cap: 5, queue: [0, 1, 2], birds };
  let s = E.initLite(lv);
  s = E.applyLite(lv, s, 0); // colour 2 → wire
  assert.deepEqual(s.wire, [2]);
  for (const i of [1, 2, 3]) s = E.applyLite(lv, s, i); // fills nest 0 → colour 2 nest arrives
  assert.deepEqual(s.wire, [], 'the waiting bird should have hopped in');
  assert.equal(s.nests[0].c, 2);
  assert.equal(s.nests[0].n, 1);
});

test('the level is lost when the wire is full', () => {
  const birds = [0, 0, 0, 1, 1, 1, 2, 2, 2].map((color, i) => ({ r: 0, c: i, d: 0, color }));
  const lv = { R: 1, C: 9, cap: 2, queue: [0, 1, 2], birds };
  let s = E.initLite(lv);
  s = E.applyLite(lv, s, 6); s = E.applyLite(lv, s, 7);
  assert.ok(E.isLost(lv, s));
});

// ---------- curated level pack (ADR 0005) ----------
const { LEVEL_PACK } = require('../src/levels.js');

test('the level pack has at least 100 levels', () => {
  assert.ok(LEVEL_PACK.length >= 100);
});

test('every pack level decodes, is consistent, and has a verified winning order', () => {
  LEVEL_PACK.forEach((e, i) => {
    const L = i + 1, lv = E.levelFor(L, LEVEL_PACK);
    assert.equal(E.encodeLevel(lv), e.s, `level ${L}: encode/decode round trip`);
    assert.equal(lv.queue.length * 3, lv.birds.length, `level ${L}`);
    const path = E.solve(lv, E.initLite(lv), 200000);
    assert.ok(path, `level ${L}: no winning order found`);
    let s = E.initLite(lv);
    for (const m of path) { assert.ok(E.freeMoves(lv, s).includes(m)); s = E.applyLite(lv, s, m); assert.ok(!E.isLost(lv, s)); }
    assert.ok(E.isWon(s), `level ${L}`);
  });
});

test('the wire matters: from level 3 on every pack level needs at least one waiting bird', () => {
  LEVEL_PACK.slice(2).forEach((e, i) => assert.ok(e.f >= 1, `level ${i + 3} never needs the wire`));
});

test('no pack level is near-impossible for the greedy bot', () => {
  LEVEL_PACK.forEach((e, i) => assert.ok(e.g >= 12, `level ${i + 1}: greedy win ${e.g}%`));
});

test('levels beyond the pack are mirrored, recoloured copies that stay solvable and deterministic', () => {
  for (const L of [LEVEL_PACK.length + 1, LEVEL_PACK.length + 7, LEVEL_PACK.length + 55]) {
    const a = E.levelFor(L, LEVEL_PACK), b = E.levelFor(L, LEVEL_PACK);
    assert.deepEqual(a, b);
    assert.ok(E.solve(a, E.initLite(a), 200000), `level ${L}`);
  }
});

test('mirroring a level keeps every bird path the same length', () => {
  const lv = E.levelFor(30, LEVEL_PACK);
  const t = E.transformLevel(lv, true, true, [5, 4, 3, 2, 1, 0]);
  assert.deepEqual(E.freeMoves(lv, E.initLite(lv)), E.freeMoves(t, E.initLite(t)));
});

// ---------- daily puzzle ----------
test('the daily puzzle is the same all day, changes day to day, and is always solvable', () => {
  const day = 20380; // 18 Oct 2025
  assert.deepEqual(E.dailyLevel(day, LEVEL_PACK), E.dailyLevel(day, LEVEL_PACK));
  const seen = new Set();
  for (let d = day; d < day + 30; d++) {
    const lv = E.dailyLevel(d, LEVEL_PACK);
    seen.add(E.encodeLevel(lv));
    assert.ok(E.solve(lv, E.initLite(lv), 200000), `day ${d} unsolvable`);
  }
  assert.ok(seen.size >= 25, `only ${seen.size} distinct puzzles in 30 days`);
});

test('the daily puzzle never repeats a base level within one cycle of the pool', () => {
  const first = E.dailyLevel(0, LEVEL_PACK);
  const pool = LEVEL_PACK.slice(14, 80).filter(e => !e.boss).length;
  const start = Math.ceil(20380 / pool) * pool; // first day of a cycle
  const bases = new Set();
  for (let d = start; d < start + pool; d++) bases.add(E.dailyLevel(d, LEVEL_PACK).base);
  assert.equal(bases.size, pool);
  assert.ok(first.base >= 15 && first.base <= 80 && !LEVEL_PACK[first.base - 1].boss);
});

// ---------- hint solver status ----------
test('solveStatus tells a proven dead end from a search that ran out of budget', () => {
  const lv = E.levelFor(40, LEVEL_PACK);
  assert.equal(E.solveStatus(lv, E.initLite(lv), 200000).status, 'solved');
  assert.equal(E.solveStatus(lv, E.initLite(lv), 3).status, 'budget');
  // dead end: one perch, and both free birds are the wrong colour for the open nest
  const dead = { R: 1, C: 2, cap: 1, open: 1, queue: [0, 1], birds: [
    { r: 0, c: 0, d: 3, color: 1 }, { r: 0, c: 1, d: 1, color: 1 }] };
  const st = E.solveStatus(dead, E.initLite(dead), 1000);
  assert.equal(st.status, 'unsolvable');
  assert.equal(E.solve(dead, E.initLite(dead), 1000), null);
});

// ---------- daily streak ----------
test('daily streak credits the puzzle day, survives midnight, and is idempotent', () => {
  const D = 20744; // 18 Oct 2026
  let d = E.creditDaily({}, D);
  assert.deepEqual([d.last, d.streak, d.top], [D, 1, 1]);
  assert.deepEqual(E.creditDaily(d, D), d, 'solving the same day again changes nothing');
  d = E.creditDaily(d, D + 1);
  assert.deepEqual([d.last, d.streak], [D + 1, 2]);
  // yesterday's puzzle finished after midnight: credited to yesterday, not today
  const late = E.creditDaily({ last: D - 1, streak: 3, top: 3 }, D);
  assert.equal(late.last, D); assert.equal(late.streak, 4);
  assert.deepEqual(E.creditDaily(late, D - 1), late, 'an older puzzle never moves the streak back');
  // a missed day starts over
  d = E.creditDaily({ last: D - 2, streak: 5, top: 5 }, D);
  assert.deepEqual([d.streak, d.top], [1, 5]);
  // shown streak: alive today and tomorrow, gone after a missed day
  assert.equal(E.liveStreakOn({ last: D, streak: 4 }, D), 4);
  assert.equal(E.liveStreakOn({ last: D, streak: 4 }, D + 1), 4);
  assert.equal(E.liveStreakOn({ last: D, streak: 4 }, D + 2), 0);
});

// ---------- difficulty claims, re-measured from the encoded levels (not the stored numbers) ----------
test('re-measured: every pack level stays above the greedy floor and every Storm is harder than the level before', () => {
  const g = LEVEL_PACK.map((e, i) => E.botWinRate(E.levelFor(i + 1, LEVEL_PACK), 1, 800, 271828));
  g.forEach((v, i) => assert.ok(v >= 12, `level ${i + 1}: greedy ${v}% on an independent sample`));
  LEVEL_PACK.forEach((e, i) => {
    if (!e.boss || i === 0) return;
    assert.ok(g[i] < g[i - 1], `Storm ${i + 1} (${g[i]}%) is not harder than level ${i} (${g[i - 1]}%)`);
    assert.ok(e.f >= 2, `Storm ${i + 1} needs only ${e.f} waiting bird(s)`);
  });
});

// ---------- eggs (ADR 0006) ----------
test('an egg blocks like a bird and hatches when a nest of its colour is completed', () => {
  // row 0: three colour-0 birds facing up (free); row 1: a colour-1 bird facing up, under an egg of colour 0
  const lv = { R: 3, C: 3, cap: 5, open: 1, queue: [0, 1], birds: [
    { r: 2, c: 0, d: 2, color: 0 }, { r: 2, c: 1, d: 2, color: 0 }, { r: 2, c: 2, d: 2, color: 0 },
    { r: 1, c: 0, d: 0, color: 1 }, { r: 1, c: 1, d: 0, color: 1 }, { r: 1, c: 2, d: 0, color: 1 },
  ], eggs: [{ r: 0, c: 1, color: 0 }] };
  let s = E.initLite(lv);
  assert.ok(!E.freeMoves(lv, s).includes(4), 'the bird under the egg is blocked');
  assert.equal(E.rayBlocker(s.occ, 3, 3, 1, 1, 0), 6, 'the egg is the blocker (id = birds.length + k)');
  s = E.applyLite(lv, s, 0); s = E.applyLite(lv, s, 1);
  assert.ok(!E.freeMoves(lv, s).includes(4), 'still blocked before the colour-0 nest is full');
  s = E.applyLite(lv, s, 2);
  assert.ok(E.freeMoves(lv, s).includes(4), 'free once the colour-0 nest is completed');
  for (const i of [3, 4, 5]) s = E.applyLite(lv, s, i);
  assert.ok(E.isWon(s));
});

test('eggs survive encode/decode and mirroring', () => {
  const lv = { R: 4, C: 5, cap: 5, open: 1, queue: [2, 3], birds: [{ r: 0, c: 0, d: 1, color: 2 }], eggs: [{ r: 3, c: 4, color: 3 }] };
  const back = E.decodeLevel(E.encodeLevel(lv));
  assert.deepEqual(back.eggs, lv.eggs);
  assert.equal(E.decodeLevel(E.encodeLevel({ ...lv, eggs: undefined })).eggs, undefined, 'no eggs field when there are none');
  const t = E.transformLevel(lv, true, true, [0, 1, 4, 5, 2, 3]);
  assert.deepEqual(t.eggs, [{ r: 0, c: 0, color: 5 }]);
});

test('egg placement keeps the construction order winning and every egg blocks someone', () => {
  let made = 0;
  for (let seed = 1; made < 25 && seed < 400; seed++) {
    const rand = E.rng(seed * 7717);
    const lv = E.buildCandidate({ R: 7, C: 6, birds: 24, colors: 4, d: 2, block: 0.4, maxWire: 3, open: 1, eggs: 2 }, rand);
    if (!lv) continue;
    made++;
    assert.ok(lv.eggs.length >= 1 && lv.eggs.length <= 2);
    const onPath = (b, e) => { const [dr, dc] = E.DIRS[b.d];
      for (let r = b.r + dr, c = b.c + dc; r >= 0 && r < lv.R && c >= 0 && c < lv.C; r += dr, c += dc) if (r === e.r && c === e.c) return true;
      return false; };
    for (const e of lv.eggs) {
      assert.ok(lv.birds.some(b => onPath(b, e)), `seed ${seed}: an egg blocks nobody`);
      assert.ok(lv.queue.includes(e.color));
    }
    assert.equal(new Set(lv.eggs.map(e => e.color)).size, lv.eggs.length, 'one egg per colour');
    const path = E.solve(lv, E.initLite(lv), 200000);
    assert.ok(path, `seed ${seed}: no winning order with eggs`);
  }
  assert.ok(made >= 25, `only ${made} candidates with eggs`);
});
