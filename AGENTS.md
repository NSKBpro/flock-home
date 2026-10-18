# AGENTS.md — working on Flock Home

Instructions for any AI coding agent (Claude Code, GitHub Copilot, Codex) working in this repo. Humans are welcome too.

## What this project is

A single-file HTML5 puzzle game aimed at web game portals, CrazyGames first. The business goal and decision points are in [docs/ROADMAP.md](docs/ROADMAP.md); the rules and design intent are in [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md). Read both before proposing gameplay changes.

## Commands

```bash
npm test           # must pass before every commit
npm run build      # must succeed before every commit; output goes to dist/ (not committed)
npm run sim 1 40   # bot win rates per level; run after any change to generation or rules
npm run covers     # re-render cover images (needs `npm install` + Python Playwright)
```

## Architecture rules

1. **`src/engine.js` is pure.** No DOM, no `window`, no timers, no `Math.random()`. Randomness only through `rng(seed)`. It must run unchanged in Node (tests, tools) and in the browser (inlined by the build).
2. **Levels are deterministic.** The same level number always produces the same level. Tests check this; never break it, because players compare levels and bug reports cite level numbers.
3. **Every level must be solvable.** Generation builds levels so that a known winning order exists (see [ADR 0003](docs/adr/0003-solvable-by-construction.md)). Any change to generation must keep the solver test green for levels 1–60.
4. **One shipped file.** The game ships as a single HTML file with no runtime network requests except Google Fonts and, later, the CrazyGames SDK ([ADR 0002](docs/adr/0002-single-file-vanilla-js.md)). Do not add frameworks, bundlers or npm runtime dependencies.
5. **`src/game.html` owns presentation only.** Game rules live in the engine. The page keeps its own richer state for animation, but the outcome of a move must match `applyLite` in the engine.
6. **Ads only at natural breaks.** Rewarded ads are opt-in (boosters, continue after a full wire). Interstitials only between levels. Never interrupt active play. These are CrazyGames requirements, not preferences ([ADR 0004](docs/adr/0004-monetization-model.md)).

## Conventions

- Plain modern JavaScript, no TypeScript, no build-time transforms.
- Engine code: small pure functions, typed arrays for hot paths (the solver copies state a lot).
- UI copy: short, plain, active voice. Name things the way a player would.
- Colours are never the only signal: every bird colour also has a symbol (accessibility).
- Respect `prefers-reduced-motion`.

## Verifying a change

1. `npm test` and `npm run build` pass.
2. For generation or rule changes: `npm run sim` and compare win rates with the targets in [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md#difficulty-curve).
3. For UI changes: open `dist/index.html` at phone width (≈390×844) and desktop; play a level to the win screen and one to the "wire is full" screen.

## Documentation duties

- A decision that is expensive to reverse (platform, file format, monetization, level format) gets an ADR in `docs/adr/` using the existing numbering and format.
- Update `docs/ROADMAP.md` checkboxes when a milestone item is done.
- Keep README's layout table current when adding top-level folders.

## Git workflow

- `main` is always releasable.
- Work on a branch (`feat/…`, `fix/…`, `docs/…`) and open a pull request; the owner reviews and merges.
- Commit messages: imperative mood, one-line summary under 72 characters, details in the body.

## Do not

- Do not commit `dist/` or `node_modules/`.
- Do not copy art, names or levels from other games. CrazyGames rejects clones and reskins.
- Do not add tracking, accounts or personal data collection.
- Do not change the bird palette without checking contrast on the dark background in both bright and dim screens.
