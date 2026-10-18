# CrazyGames submission checklist

Requirements as of October 2026, from the [CrazyGames developer docs](https://docs.crazygames.com/). Re-check the docs before submitting; rules change.

## Build

- [ ] Upload `dist/index.html` (HTML5). Initial download ≤ 50 MB, total ≤ 250 MB, ≤ 1,500 files. We are at about 66 KB.
- [ ] Works in a responsive 16:9 iframe and is legible at devicePixelRatio 1 (desktop) as well as on phones.
- [ ] Movement uses time, not frame count, so it behaves the same at 60, 144 and 165 Hz.
- [ ] No console errors. No failed network requests.
- [ ] Content suitable for PEGI 12 / age 13+.
- [ ] Tested in the CrazyGames QA tool before submitting.

## Covers (all three required)

- [x] Landscape 16:9, 1920×1080 — `assets/covers/flock-home-landscape-1920x1080.png`
- [x] Portrait 2:3, 800×1200 — `assets/covers/flock-home-portrait-800x1200.png`
- [x] Square 1:1, 800×800 — `assets/covers/flock-home-square-800x800.png`

Rules: no borders, no text except the title, no icons or store logos, nothing copyrighted, not blurry. Re-render with `npm run covers`.

## Preview videos (both required)

- [ ] Landscape 1080p 16:9 and portrait 1080p 2:3
- [ ] 15–20 seconds (longer gets cut), ≤ 50 MB, **no sound**
- [ ] First frame is the static cover
- [ ] Real gameplay at normal speed; no black screens, logo intros, black bars, default mouse cursor, "Play Now" text or social icons

Make these after Milestone 1, so they show the finished gameplay.

## Store page text

- [ ] Description (what it is, what makes it different, 2–4 short paragraphs)
- [ ] Controls: "Tap or click a bird to make it fly. Keyboard: Tab to a bird, Enter to fly."

## Launch stages

1. **Basic Launch:** no SDK needed, no ads, no revenue. About two weeks of measuring playtime, play-to-visit conversion and retention.
2. **Full Launch** (by invitation): integrate the SDK. Only SDK ads are allowed. Ads must never interrupt active play; pause the game, block input and mute audio while an ad runs.

## Payouts

- Paid through Tipalti: bank wire, ACH, eCheck or PayPal depending on country. For Serbia, a EUR wire to a foreign-currency account is the safe choice.
- Minimum €100 per payout; smaller amounts carry over. Aim: paid by the 10th of the following month (formal terms NET 60).
- Self-billing invoices are generated monthly under Account → Billing.
- "Hold Payments" (Account → Billing → Info) keeps earnings at CrazyGames and pays everything in one transfer later. No documented expiry.
- Tax note for the owner: under the Serbian freelancer model the standard deduction applies per quarter, so release payouts about once a quarter rather than once a year. Confirm the income category (ad revenue share vs. copyright income) with an accountant before the first payout.
