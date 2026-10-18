# Game design

## One-line pitch

Free the birds in the right order, fill the nests, and don't let the wire fill up.

## Rules

1. The roost is a grid. Each bird faces up, right, down or left.
2. Tap a bird. It flies off only if no other bird sits anywhere in the direction it faces. A blocked bird shakes and the blocking bird is highlighted.
3. One nest is open at a time. A bird of its colour flies straight in. Each nest holds three birds.
4. When a nest fills, it flies away and the next nest in the queue moves in. Players can see the next six nests.
5. Any other bird waits on the wire. Waiting birds hop into their nest as soon as it arrives.
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

| Booster | Free per level | When it runs out (Full Launch) | Until Full Launch |
|---|---|---|---|
| Undo (last move) | 3 | Rewarded ad for +1 | Disabled |
| Hint (highlights a safe bird, computed by the solver) | 2 | Rewarded ad for +1 | Disabled |
| +1 Perch (wire gets longer, max 9) | 1 | Rewarded ad for +1 | Disabled |
| Keep going after a full wire (+2 perches, at most twice per level) | — | Rewarded ad | Free |

At Full Launch, interstitial ads appear only between levels, from level 5 on, every third level. Until then there are no ads at all ([ADR 0004](adr/0004-monetization-model.md)).

## Stars

Each win earns 1–3 stars, saved per level on the player's device. The header shows the total.

- Start at 3.
- −1 for using any booster (Undo, Hint, +1 Perch).
- −1 if the wire got down to its last free perch (4 of 5).
- A win after "Keep going" is always 1 star.

The win screen says which star was missed and offers "Play again for 3 stars". Stars give a reason to replay easy levels and a visible sense of progress.

## Onboarding

- Level 1 shows an animated hand on the bird to tap (the hint solver's choice) until the player has freed two birds.
- Levels 1–5 each have one line of coach text introducing one idea: blocking, the open nest, the wire, "Up next", waiting birds hopping in.
- The "How to play" card opens once on first launch and stays in the menu.

## Feel

- Vibration on Android browsers: a light tick per flight, a bump when blocked, a double pulse when a nest fills, a longer buzz on a full wire. Can be turned off in the menu. iOS browsers ignore vibration.
- Respect `prefers-reduced-motion`: no wing flaps, hand bobbing or feathers.

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

How difficulty is measured (`npm run sim`, and stored per level in `src/levels.js`):

- **Forced wait (`f`):** the fewest perches the best possible play needs. 0 means the wire is never needed, which makes the wire meaningless.
- **Greedy win rate (`g`):** a bot that always frees a bird of the open nest's colour when it can, otherwise a random bird. If it wins almost every time, the level has no real decisions.
- **Casual win rate (`c`):** the same bot, but it only looks for a matching bird half the time.

Targets used by `tools/gen-levels.mjs` (re-tune after human playtesting):

| Block | Greedy win % at the start of the block → just before the Storm | Storm | Forced wait |
|---|---|---|---|
| 1–10 | 85 → 64 (levels 1–4 are a gentle tutorial) | ≥ 50 | 0 on levels 1–2, then 1–2; Storm 3 |
| 11–20 | 75 → 54 | ≥ 40 | Breather 1, then 1–2; Storm 3 |
| 21–30 | 65 → 44 | ≥ 30 | same pattern |
| 31–40 | 58 → 37 | ≥ 23 | same pattern |
| 41+ | 52 → 31 | ≥ 20 | same pattern |

No level ships with a greedy win rate under 12%. From level 3 on, every level needs the wire at least once.

The rule change from two open nests to one, and the reasons, are in [ADR 0005](adr/0005-one-open-nest-and-curated-pack.md).

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
