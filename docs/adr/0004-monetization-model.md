# 0004 — Rewarded ads first, interstitials only between levels

**Status:** Accepted, 18 Oct 2026

## Context

Web portals pay through ad revenue share. Rewarded video has the highest eCPM and players prefer it to interstitials about 4 to 1; frequent interstitials raise churn. CrazyGames forbids ads that interrupt active play and requires pausing, blocking input and muting during ads.

## Decision

- **Rewarded ads** (player chooses to watch): extra Undo, Hint or Perch when the free ones run out, and "Continue +2 perches" after a full wire (at most twice per level).
- **Interstitial ads:** only between levels, from level 5, every third level.
- **No banners** at launch.
- **No in-app purchases** at launch. A one-time "Remove ads" purchase is considered for mobile or if CrazyGames invites the game to purchases.
- **Until Full Launch, ads are off and nothing pretends to be an ad.** Every ad call goes through one `Ads` object in `src/game.html` (`Ads.enabled = false`, `Ads.rewarded()`, `Ads.midgame()`). While it is off: boosters are disabled when the free ones run out, "Keep going +2 perches" after a full wire is free (still at most twice per level), and breaks between levels are skipped. At Full Launch only that object changes.
- *Amended 18 Oct 2026:* the first prototype showed fake ad screens as placeholders. They were removed before Basic Launch, because a portal reviewer or player would see them as real ads.

## Consequences

- The full wire is the main monetization moment, which is why the wire must stay visible and fair (see [GAME_DESIGN.md](../GAME_DESIGN.md)).
- Booster counts per level are part of the economy; changing them changes ad frequency.
- The placeholder "Remove ads" menu toggle was removed before Basic Launch, since nothing can be purchased there.
- During Basic Launch the economy is more generous than it will be (free continues). Expect slightly longer sessions in the trial than after ads are switched on.
