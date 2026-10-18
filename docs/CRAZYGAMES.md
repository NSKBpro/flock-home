# CrazyGames submission checklist

Requirements as of October 2026, from the [CrazyGames developer docs](https://docs.crazygames.com/). Re-check the docs before submitting; rules change.

## Build

- [x] Single file `dist/index.html` (HTML5). Initial download ≤ 50 MB, total ≤ 250 MB, ≤ 1,500 files. We are at about 150 KB, one file.
- [x] Works in a responsive 16:9 iframe (two-column layout on wide screens) and is legible at devicePixelRatio 1 as well as on phones. Checked at 360×640, 390×844, 800×600, 1024×576, 1280×720 and 1920×1080.
- [x] Movement uses time, not frame count (Web Animations and timers only), so it behaves the same at 60, 144 and 165 Hz.
- [x] No console errors. No network requests at all (fonts are inlined).
- [x] Content suitable for PEGI 12 / age 13+ (no violence, no text chat, no user content).
- [ ] Tested in the CrazyGames QA tool before submitting.

## Covers (all three required)

- [x] Landscape 16:9, 1920×1080 — `assets/covers/flock-home-landscape-1920x1080.png`
- [x] Portrait 2:3, 800×1200 — `assets/covers/flock-home-portrait-800x1200.png`
- [x] Square 1:1, 800×800 — `assets/covers/flock-home-square-800x800.png`

Rules: no borders, no text except the title, no icons or store logos, nothing copyrighted, not blurry. Re-render with `npm run covers`.

## Preview videos (both required)

- [x] Landscape 1920×1080 (16:9) — `assets/videos/flock-home-preview-landscape-1920x1080.mp4`
- [x] Portrait 1080×1620 (2:3) — `assets/videos/flock-home-preview-portrait-1080x1620.mp4`
- [x] About 17 seconds, under 1 MB each, H.264 at a steady 30 fps, **no audio track**
- [x] First second is the static cover
- [x] Real gameplay at normal speed (level 6, played by the hint solver, ending on a three-star win), recorded frame by frame on a virtual clock so it never stutters; no black screens, logo intros, black bars, mouse cursor, "Play Now" text or social icons

Re-record with `npm run build && npm run video` after visible gameplay changes.

## Store page text

- [x] Description, controls and tags: [STORE_PAGE.md](STORE_PAGE.md)

## Launch stages

1. **Basic Launch:** no SDK needed, no ads, no revenue. About two weeks of measuring playtime, play-to-visit conversion and retention.
2. **Full Launch** (by invitation): integrate the SDK. Only SDK ads are allowed. Ads must never interrupt active play; pause the game, block input and mute audio while an ad runs.

## Payouts

- Paid through Tipalti: bank wire, ACH, eCheck or PayPal depending on country. For Serbia, a EUR wire to a foreign-currency account is the safe choice.
- Minimum €100 per payout; smaller amounts carry over. Aim: paid by the 10th of the following month (formal terms NET 60).
- Self-billing invoices are generated monthly under Account → Billing.
- "Hold Payments" (Account → Billing → Info) keeps earnings at CrazyGames and pays everything in one transfer later. No documented expiry.
- Tax note for the owner: under the Serbian freelancer model the standard deduction applies per quarter, so release payouts about once a quarter rather than once a year. Confirm the income category (ad revenue share vs. copyright income) with an accountant before the first payout.
