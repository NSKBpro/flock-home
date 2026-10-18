# 0003 — Levels are solvable by construction

**Status:** Accepted, 18 Oct 2026. Extended by [ADR 0005](0005-one-open-nest-and-curated-pack.md): the shipped levels come from a curated pack built with this same method.

## Context

An unsolvable level is the fastest way to lose a player's trust, and the "watch an ad to continue" offer only feels fair if the loss was the player's own doing. Searching random layouts for solvability is slow and gives no guarantee within a time budget.

## Decision

Build each level backwards so a winning order is known:

1. Place birds one at a time. Each new bird faces a direction that is clear of all birds placed before it. Removing birds in reverse placement order is therefore always legal.
2. Deal colours along that removal order (with controlled shuffling) and simulate it, rejecting candidates whose known order would overflow the wire.
3. Levels are seeded by level number, so they are deterministic.

The DFS solver in the engine (`solve`) is used for hints and in tests, not to prove solvability at generation time.

## Consequences

- Every level has at least one winning order, by construction. Tests check levels 1–60 with the solver as a second line of defence.
- Difficulty must be measured separately (bot win rates, forced wire use), because "solvable" says nothing about how interesting a level is.
- Generation is fast enough to run in the browser for endless levels.
