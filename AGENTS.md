# AGENTS.md — working on Flock Home

Instructions for any AI coding agent (Claude Code, GitHub Copilot, Codex) working in this repo. Humans are welcome too.

## What this project is

A single-file HTML5 puzzle game aimed at web game portals, CrazyGames first. The business goal and decision points are in [docs/ROADMAP.md](docs/ROADMAP.md); the rules and design intent are in [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md). Read both before proposing gameplay changes.

## Commands

```bash
npm test           # must pass before every commit
npm run build      # must succeed before every commit; output goes to dist/ (not committed)
npm run sim 1 40   # forced wire use and bot win rates per level; run after any change to rules or levels
npm run levels     # regenerate src/levels.js after changing rules or the difficulty targets
npm run covers     # re-render cover images (needs Python Playwright)
npm run video      # re-record the preview videos (needs a build, Python Playwright and ffmpeg)
npm run ui         # browser regression checks on dist/index.html (needs a build and Python Playwright)
```

## Architecture rules

1. **`src/engine.js` is pure.** No DOM, no `window`, no timers, no `Math.random()`. Randomness only through `rng(seed)`. It must run unchanged in Node (tests, tools) and in the browser (inlined by the build).
2. **Levels are deterministic.** The same level number always produces the same level. Tests check this; never break it, because players compare levels and bug reports cite level numbers.
3. **Every level must be solvable.** Generation builds levels so that a known winning order exists (see [ADR 0003](docs/adr/0003-solvable-by-construction.md)). The shipped levels are the curated pack in `src/levels.js` ([ADR 0005](docs/adr/0005-one-open-nest-and-curated-pack.md)); tests verify a winning order for every pack level. Never hand-edit `src/levels.js`; change the targets in `tools/gen-levels.mjs` and regenerate.
4. **One shipped file.** The game ships as a single HTML file with no runtime network requests (fonts are inlined from `assets/fonts/`); the only future exception is the CrazyGames SDK ([ADR 0002](docs/adr/0002-single-file-vanilla-js.md)). Do not add frameworks, bundlers or npm dependencies.
5. **`src/game.html` owns presentation only.** Game rules live in the engine. The page keeps its own richer state for animation, but the outcome of a move must match `applyLite` in the engine.
6. **Ads only at natural breaks, and only through `Ads`.** Rewarded ads are opt-in (boosters, continue after a full wire). Interstitials only between levels. Never interrupt active play. Every ad call goes through the `Ads` object in `src/game.html`; it is disabled until Full Launch, and nothing may imitate an ad while it is ([ADR 0004](docs/adr/0004-monetization-model.md)).

## Conventions

- Plain modern JavaScript, no TypeScript, no build-time transforms.
- Engine code: small pure functions, typed arrays for hot paths (the solver copies state a lot).
- UI copy: short, plain, active voice. Name things the way a player would.
- Colours are never the only signal: every bird colour also has a symbol (accessibility).
- Respect `prefers-reduced-motion`.

## Verifying a change

1. `npm test` and `npm run build` pass.
2. For generation or rule changes: `npm run sim` and compare win rates with the targets in [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md#difficulty-curve).
3. For UI changes: `npm run build && npm run ui` must pass (layout at portal and phone sizes including late levels, dialogs, daily puzzle, undo, fail and continue, page-vs-engine parity). Then open `dist/index.html` at phone width (≈390×844) and desktop and play a level to the win screen and one to the "wire is full" screen.

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
