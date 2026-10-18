# 0002 — One HTML file, vanilla JavaScript, no engine

**Status:** Accepted, 18 Oct 2026

## Context

The game is a 2D grid puzzle with a few dozen sprites on screen. Portals reward fast loading and penalize slow starts. Engines like Unity, Godot or Phaser add megabytes and a toolchain, and need their own web-export care. The art style is flat vector shapes that can be drawn in SVG.

## Decision

- The game is a single HTML file: markup, CSS, and JavaScript, with all art drawn as inline SVG and sound synthesized with Web Audio.
- Game rules live in `src/engine.js`, a pure module that runs in Node and the browser. `tools/build.mjs` inlines it into `src/game.html`.
- No frameworks, no bundler, no runtime npm dependencies. The only external runtime requests are Google Fonts and, at Full Launch, the CrazyGames SDK.

## Consequences

- The build is well under 100 KB and loads instantly.
- Tests and tools (`npm test`, `npm run sim`) run the same engine code as the game.
- Wrapping the same file for mobile later (WebView / Capacitor) stays possible.
- Richer visual effects would need hand-written canvas or SVG work rather than an engine's tools. Acceptable for this art style.
- If Google Fonts is unreachable, text falls back to system fonts; the game still works.
