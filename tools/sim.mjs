// Difficulty report: generate levels and measure how they play.
// Usage: node tools/sim.mjs [from] [to]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('../src/engine.js');

const from = +(process.argv[2] || 1), to = +(process.argv[3] || 30);

// Two simple bots: "casual" prefers a bird whose nest is open half the time,
// "greedy" always does when it can. Neither plans ahead, so a level they win
// almost always has no real decisions in it.
function botWinRate(lv, pref, runs = 200, seed = 1) {
  let wins = 0;
  for (let k = 0; k < runs; k++) {
    const r = E.rng(seed * 1000 + k);
    let s = E.initLite(lv);
    while (!E.isWon(s) && !E.isLost(lv, s)) {
      const m = E.freeMoves(lv, s);
      if (!m.length) break;
      const good = m.filter(i => s.nests.some(n => n && n.c === lv.birds[i].color && n.n < 3));
      const pick = good.length && r() < pref ? good[Math.floor(r() * good.length)] : m[Math.floor(r() * m.length)];
      s = E.applyLite(lv, s, pick);
    }
    if (E.isWon(s)) wins++;
  }
  return Math.round(100 * wins / runs);
}

console.log('level  grid  birds nests  casual%  greedy%');
for (let L = from; L <= to; L++) {
  const lv = E.generate(L);
  console.log(
    String(L).padStart(5), `${lv.R}x${lv.C}`.padStart(5), String(lv.birds.length).padStart(6),
    String(lv.queue.length).padStart(5), String(botWinRate(lv, 0.5)).padStart(8), String(botWinRate(lv, 1, 200, 2)).padStart(8),
  );
}
