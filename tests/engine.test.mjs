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
