# V1 real-device test checklist (iPhone, TEST project only)

Backend camera-to-collection is verified live (run 2). **Everything below is untested on a device.** Use a TEST build pointed at
`vgjehmwcpavflbfhbbrp`, a throwaway account, and enforcement OFF unless a line says otherwise. Record PASS/FAIL and a screenshot per line.
Never use production credentials or data.

## Setup
- [ ] Fresh install (or cleared site data), iPhone, Safari and, later, the Capacitor/TestFlight build. iOS version noted.
- [ ] A real dandelion (or a printed deck card as the stand-in the app's own wording allows), a non-plant object, a plant with no card.
- [ ] Signed out first, then a new account (email confirmation on TEST may be required; use a real inbox you control).

## Onboarding and consent
- [ ] First launch shows the welcome intro once; skipping and finishing both work; the guided walkthrough is offered, not forced.
- [ ] Consent screen appears before **any** upload: "Send your photo to identify?" with Send photo(s) / Not now; "Not now" uploads nothing (check Network).
- [ ] Privacy details link opens; wording matches the approved v2 text.

## Camera
- [ ] First capture asks for camera permission with a clear reason; **Deny** leaves a usable screen and a way to re-enable (Settings link/instructions).
- [ ] **Allow** opens the in-app camera; one photograph is enough to continue (extra angles optional, max 3).
- [ ] Photo-library import is clearly an identification lookup, not a collection route, with enforcement ON (see plan).
- [ ] No location or EXIF reaches the server (inspect the request; the app re-encodes).

## Identify and collect
- [ ] Status shows two honest stages; the photo is on screen before the wait; result arrives (typically 2-5 s).
- [ ] Dandelion: candidates listed, receipt-backed candidate offers **Collect**; the confirm sentence about what is being recorded is shown.
- [ ] Collect -> celebration, "+XP" matches the card's value, Level line correct, first-find achievement on the very first card.
- [ ] Repeat the same photo: no second reward, no second allowance spent (compare the remaining-count line).
- [ ] Non-plant object: no collect offer; no XP; no stuck session; retry works.
- [ ] A species with no card: Seed Shelf offer, no XP.
- [ ] Airplane mode mid-identify: honest message, session retry works (the four provider-failure messages).

## Progress surfaces
- [ ] Herbdex card is now unlocked with the receipt's species shown honestly (synonym/related wording); mastery stages unaffected.
- [ ] XP bar and Field Card markers consistent between /herbdex and /profile.
- [ ] Garden: the plant appears at the right growth stage, no timers, no watering.
- [ ] Quests / Field Research: the matching task advances by exactly one find; Georgia Quest card reflects it.
- [ ] Leaderboard: opt-in only; listing shows display name + counts; opting out removes the row; the provisional label is visible.

## Persistence
- [ ] Force-quit and reopen: collection, XP, Garden unchanged.
- [ ] Sign out, sign in again (same device): everything restored from the server.
- [ ] Sign in on a second device/browser: same collection.
- [ ] Sign out, then use the app signed out: legacy local progress still visible on-device, **not** imported or counted (Option A).
- [ ] Delete account: data export first, deletion confirmed, nothing left (TEST).

## Accessibility and polish
- [ ] Dynamic Type large, VoiceOver reads the collect button and result, reduced-motion respected, 320px width has no clipping, bottom nav not covered.
