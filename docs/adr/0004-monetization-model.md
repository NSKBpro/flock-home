# 0004 — Rewarded ads first, interstitials only between levels

**Status:** Accepted, 18 Oct 2026

## Context

Web portals pay through ad revenue share. Rewarded video has the highest eCPM and players prefer it to interstitials about 4 to 1; frequent interstitials raise churn. CrazyGames forbids ads that interrupt active play and requires pausing, blocking input and muting during ads.

## Decision

- **Rewarded ads** (player chooses to watch): extra Undo, Hint or Perch when the free ones run out, and "Continue +2 perches" after a full wire (at most twice per level).
- **Interstitial ads:** only between levels, from level 5, every third level.
- **No banners** at launch.
- **No in-app purchases** at launch. A one-time "Remove ads" purchase is considered for mobile or if CrazyGames invites the game to purchases.
- Until Full Launch, ads are placeholders in the UI with the same timing, so the experience and the economy can be tested before the SDK is added.

## Consequences

- The full wire is the main monetization moment, which is why the wire must stay visible and fair (see [GAME_DESIGN.md](../GAME_DESIGN.md)).
- Booster counts per level are part of the economy; changing them changes ad frequency.
- The placeholder "Remove ads" menu toggle must be removed before Basic Launch, since nothing can be purchased there.
