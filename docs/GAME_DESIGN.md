# Game design

## One-line pitch

Free the birds in the right order, fill the nests, and don't let the wire fill up.

## Rules

1. The roost is a grid. Each bird faces up, right, down or left.
2. Tap a bird. It flies off only if no other bird sits anywhere in the direction it faces. A blocked bird shakes and the blocking bird is highlighted.
3. Two nests are open at a time. A bird that flies off goes to an open nest of its colour. Each nest holds three birds.
4. When a nest fills, it flies away and the next nest in the queue moves in. Players can see the next six nests.
5. If no open nest matches the bird, it waits on the wire. Waiting birds hop into a matching nest as soon as one arrives.
6. The wire has five perches. When all five are taken the level is lost.
7. The level is won when every bird is home.

## Why this design

Two proven mechanics, combined ([MARKET_RESEARCH.md](MARKET_RESEARCH.md)):

- **Arrow-escape logic** (tap a piece, it leaves if the path is clear). The biggest puzzle wave of 2025–26 but saturated, and on its own every level is solvable with enough patience, which leaves few moments to monetize.
- **Order-matching with a visible holding area** (the Bus Jam / Pixel Flow pattern). The holding area makes failure feel like the player's own mistake. "I messed up, I'd rather continue than replay" is the moment where a rewarded ad feels fair.

The wire must be **part of active planning**, not a hidden penalty. The player should always see how full it is and what is coming next, so a full wire feels like a fair loss.

## Core loop

Look at the open nests and the queue → find birds that can leave now → choose which to free first → watch the wire → nest fills, new nest arrives, waiting birds hop in → repeat.

A level takes 1–3 minutes. Sessions on web portals are typically 11–20 minutes, so a session is about 5–10 levels.

## Boosters and the failure moment

| Booster | Free per level | When it runs out |
|---|---|---|
| Undo (last move) | 3 | Rewarded ad for +1 |
| Hint (highlights a safe bird, computed by the solver) | 2 | Rewarded ad for +1 |
| +1 Perch (wire gets longer, max 9) | 1 | Rewarded ad for +1 |
| Continue after a full wire (+2 perches) | — | Rewarded ad, at most twice per level |

Interstitial ads appear only between levels, from level 5 on, every third level.

## Difficulty curve

Levels follow a **sawtooth**: difficulty climbs over a few levels, then a hard "Storm" level, then an easier breather. A flat or steadily rising curve tires players out.

| Levels | Intent |
|---|---|
| 1–2 | Tutorial. Teach tapping and blocking. The wire is not needed. |
| 3–4 | Teach the wire: at least one bird must wait. |
| 5–9 | Real decisions: two or more birds must wait at some point. |
| 10, 20, 30… | Storm level: more birds, the wire gets close to full. |
| 11, 21, 31… | Breather after each Storm. |
| 12+ | Mostly "must wait 2", some "must wait 3". |

How difficulty is measured (see `tools/sim.mjs` and the level analyzer):

- **Forced wait:** the fewest perches the best possible play needs. 0 means the wire is never needed, which makes the wire meaningless.
- **Bot win rates:** a "greedy" bot always frees a bird whose nest is open, otherwise a random one. If it wins almost every time, the level has no real decisions.

## Art direction

Night sky over a quiet field: deep blue-teal backdrop, warm moon, six bird colours that each carry a white symbol (dot, triangle, square, diamond, plus, bar) so colour is never the only cue. Rounded display type (Sniglet) for the title and numbers, Figtree for UI text. Everything is drawn in code as SVG, so the game has no image files and loads instantly.

## Sound

Short synthesized chirps per colour, a soft bonk when blocked, a three-note chime when a nest fills, and win and fail jingles. Sound starts only after the first tap and can be muted.

## Content ideas

New mechanics to introduce one at a time, roughly every 10 levels after launch:

- **Sleeping bird:** cannot move until a neighbour leaves
- **Egg:** an obstacle that blocks paths and disappears when its nest colour fills
- **Pairs:** two birds tied together leave together
- **Wind:** one row is pushed one cell sideways after every move
- **Owl:** sits still all level; birds have to route around it
- **Daily puzzle:** one fixed level per day with a shareable emoji result
