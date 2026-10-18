// Difficulty report for the levels the game actually plays (curated pack, then its variations).
// Usage: node tools/sim.mjs [from=1] [to=30]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('../src/engine.js');
const { LEVEL_PACK } = require('../src/levels.js');

const from = +(process.argv[2] || 1), to = +(process.argv[3] || 30);
console.log('level  grid  birds  nests  forced  greedy%  casual%');
for (let L = from; L <= to; L++) {
  const lv = E.levelFor(L, LEVEL_PACK);
  const f = E.forcedWait(lv, 15000), g = E.botWinRate(lv, 1, 120, 11), c = E.botWinRate(lv, 0.5, 120, 13);
  console.log(String(L).padStart(5), `${lv.R}x${lv.C}`.padStart(5), String(lv.birds.length).padStart(6),
    String(lv.queue.length).padStart(6), String(f).padStart(7), String(g).padStart(8), String(c).padStart(8), lv.boss ? ' storm' : '');
}
