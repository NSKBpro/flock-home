# 0005 — One open nest, and a curated level pack with measured difficulty

**Status:** Accepted, 18 Oct 2026

## Context

Playtesting the prototype with bots showed the wire rarely mattered. With two nests open at a time and many birds free at once, there was almost always a bird that matched an open nest:

- A "greedy" bot (always free a matching bird if one exists, otherwise a random bird) won 90–100% of most levels.
- On many levels the best play never needed the wire at all. In one test, level 12 finished with the wire empty the whole time.

That removes the core tension and the main monetization moment ([ADR 0004](0004-monetization-model.md)).

We measured 2,000+ candidate levels across grid sizes, colour counts and generator settings. Tuning the generator alone (blocking density, colour shuffling) barely moved the numbers with two open nests. With **one** open nest, the same generator produced levels where the wire is needed and the greedy bot wins 15–80%, depending on size.

## Decision

1. **One nest is open at a time** (`open: 1` in level data). The queue still shows the next six nests. This matches the proven Bus Jam pattern: one target at a time plus a visible holding area. The engine supports any number of open nests, so this stays a data decision.
2. **Ship a curated pack of 100 levels** (`src/levels.js`), generated offline by `tools/gen-levels.mjs`. For each level number it builds many solvable candidates and keeps the one closest to a target on the difficulty curve.
3. **Difficulty is measured, not guessed**, with three numbers stored per level:
   - `f`: forced wait, the fewest perches the best play needs
   - `g`: greedy-bot win rate
   - `c`: casual-bot win rate (looks for a matching bird only half the time)
4. **Sawtooth curve:** difficulty climbs within each block of ten, peaks at a Storm level (x0), and drops for a breather (x1). "Too hard" is penalized twice as much as "too easy" when choosing candidates, and no level ships with a greedy win rate under 12%.
5. **Beyond level 100:** the game cycles through the last 40 pack levels, mirrored and recoloured. Mirroring keeps every path length and recolouring keeps every decision, so difficulty is identical and solvability is preserved. The procedural `generate(L)` remains only as a fallback when no pack is present.

## Consequences

- From level 3 on, every level needs at least one waiting bird (tested). The wire is part of every plan.
- Levels are fixed data: the same for every player, comparable, and easy to re-tune by regenerating with new targets. Tests check that every pack level has a verified winning order.
- The build grows from about 42 KB to about 66 KB. Still instant.
- Bots are only a proxy for people. The targets in `gen-levels.mjs` must be re-tuned after human playtesting (Milestone 1).
- Changing the rules (open nests, wire size, booster counts) requires regenerating the pack and re-checking the curve with `npm run sim`.
