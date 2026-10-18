# Roadmap

**Goal:** Flock Home live on CrazyGames, through Basic Launch and invited to Full Launch, within about 4–6 weeks of starting (started 18 Oct 2026). After that, the numbers decide what happens next.

The success measure for the first phase is **an invitation to Full Launch**, not revenue. It means CrazyGames' own data says players stay and come back.

## Milestone 1 — The game is fun

- [x] Playable prototype: grid, nests, wire, win and fail states
- [x] Endless levels that are always solvable
- [x] Boosters: Undo, Hint, +1 Perch
- [x] Ad placeholders: rewarded boosters, continue after a full wire, interstitial every 3 levels
- [x] Make the wire matter: one open nest, 100 curated levels with measured difficulty and a sawtooth curve ([ADR 0005](adr/0005-one-open-nest-and-curated-pack.md))
- [x] Stars per level, tutorial hand on level 1, vibration feedback
- [ ] Owner plays 10–15 levels and writes down what feels boring or unfair
- [ ] 3–5 friends play on their phones; note where they stop
- **Done when:** testers ask for "one more level" without being prompted

## Milestone 2 — Ready to submit

- [x] Three cover images (landscape, portrait, square)
- [x] Two preview videos, about 17 s, landscape 16:9 and portrait 2:3, no sound, cover as first frame (`npm run video`)
- [x] Game description and controls text for the CrazyGames page ([STORE_PAGE.md](STORE_PAGE.md))
- [x] Local technical checks: wide 16:9 layout, no overflow from 360×640 to 1920×1080, keyboard play, no console errors, no external requests, time-based animation
- [ ] Pass the CrazyGames QA tool (needs the developer account)
- [x] Remove placeholder ads and the "Remove ads" toggle (no ads or purchases at Basic Launch)
- **Done when:** everything in [CRAZYGAMES.md](CRAZYGAMES.md) is ticked

## Milestone 3 — Basic Launch

- [ ] Owner creates the CrazyGames developer account and payout details (Tipalti)
- [ ] Upload `dist/index.html` with covers and videos
- [ ] Address QA feedback
- [ ] Two-week trial runs; collect playtime, play-to-visit conversion, retention from the portal
- **Done when:** CrazyGames decides on Full Launch

## Decision point

| Result | Next step |
|---|---|
| Invited to Full Launch | Milestone 4 |
| Not invited, but players who start play a long time | Fix the first-minute experience, resubmit once |
| Not invited, short sessions | Stop. Keep the engine and tooling for the next idea. |

## Milestone 4 — Full Launch (only if invited)

- [ ] Integrate the CrazyGames SDK: rewarded ads for boosters and continue, midgame ads between levels, gameplay start/stop events, cloud save
- [ ] Mute and pause during ads
- [ ] New mechanic every ~10 levels to keep it fresh (ideas in [GAME_DESIGN.md](GAME_DESIGN.md#content-ideas))
- [ ] Daily puzzle with a shareable result
- [ ] Monthly check of revenue; release payouts about once a quarter

## Later — only if the web numbers are strong

- Mobile build (wrap the same HTML), rewarded ads + one-time "Remove ads"
- Or pitch to a mobile publisher (Voodoo, Homa, Kwalee and similar take games from small developers and fund marketing)

## Time and money budget

- Owner time: about 10–20 hours over Milestones 1–3
- Cash: €0 to launch; optional €30–50 accountant consultation before the first payout
- Stop rule: if Milestone 3 ends without a Full Launch invitation and without long sessions, stop
