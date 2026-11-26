# Initial App Store release: readiness checklist (DRAFT, 2026-11-25)

Based on what the repository contains today plus general knowledge of Apple's review process. **Apple's current App Review Guidelines must be re-read before submission; items marked CHECK depend on them.**
The mushroom collection and other new categories are reserved for a later update and are out of scope here.

## What exists today
A static-export Next.js web app (`output: 'export'`, GitHub Pages, custom domain plantdex.online), Supabase accounts with Row Level Security, scanning through an identification provider, 45 printed + 9 Field Cards, garden, research, Seed Shelf, Field Board (opt-in), account export and deletion, privacy and terms pages, a shop link (physical deck via a Stripe Payment Link).
**There is no native wrapper, no `ios/` project, no PWA manifest or service worker, and no native build tooling in the repo.**

## A. Essential features for the first release (gameplay)
| Item | State |
|---|---|
| Scan, identify, confirm, collect, card profile | Works for 54 cards |
| Mastery, XP, levels, Field Research, Garden, Seed Shelf, profile | Works |
| In-app live camera capture | Logic merged, flag OFF, no UI (owner supervises UI) |
| Scan-recorded discoveries (Stage 4 enforcement) | Designed; NOT authorised |
| Herbdex Expansion (85 cards) | Pilot not testable yet; not required for a first release unless the owner decides |
| Ecological regions / habitats | Georgia only; ten-region work is research, not adopted |
| Atomic scan confirmation | Migration 0014 proven on TEST only; mitigation shipped |

## B. Technical and submission requirements (none done)
1. **Native shell decision (owner).** Apple generally rejects apps that are only a repackaged website (CHECK guideline 4.2). Options: a Capacitor-style wrapper with real native features (camera capture, push optional, offline cache), or a PWA only (not an App Store app). New cost and new tooling: owner approval.
2. Apple Developer Program account (annual fee) and a macOS build path (local Mac or a cloud build service): new expense, owner approval.
3. App icons, launch screens and store screenshots at Apple sizes; app name, subtitle, description, keywords, support URL, marketing URL.
4. Camera usage purpose string (and photo-library string if import stays); location string only if region detection ships (it is OFF).
5. Privacy: App Privacy "nutrition label" answers, privacy policy URL (exists, must match behaviour and the shipped version), and tracking disclosure (analytics are cookieless and send an event name only; CHECK whether ATT applies, expected no).
6. Account requirements: in-app account deletion exists (required); Sign in with Apple is required only if a third-party social login is added (none today: email and password only).
7. Review access: a demo account and notes for App Review (scanning needs a plant; provide sample guidance).
8. Purchases: the shop sells a physical deck through an external link. CHECK that this is allowed as physical goods, and that no digital collectible is sold or unlocked by payment outside in-app purchase. Do not add any paid digital feature without a purchase-rules review.
9. Age rating questionnaire, export compliance (encryption declaration), content rights for card art and photographs (provenance records exist for the 85; confirm licences for the live 54).
10. Release engineering: a release branch and signing that keep production credentials out of agent sessions (the release repository design in #34 is the starting point; owner-held).

## C. Quality and safety blockers
1. Plants people may eat or use medicinally: every page carries the safety notice, traditional use is never a medical claim (CHECK guideline 1.4.1, medical information). The 85 expansion cards fail this today (all held), so they cannot ship unreviewed.
2. Identification is uncertain: confidence and "not confirmed" wording must survive the native UI. ScanPanel wording requests are with the owner's UI session.
3. Reliability: scan failures must be errors, never silent empty results (fixed in S2); network failure paths on mobile; offline behaviour (unknown, not tested on a device).
4. Real-device performance and accessibility testing (390px measured in a browser only; no iPhone test run yet): contrast, touch targets, reduced motion, small screens.
5. Data integrity: scan-confirmation window (mitigation merged, atomic fix pending production approval), database refuses new card ids until the catalogue migration.
6. Security review of anything native (keychain use for session, no secrets in the bundle).
7. The first deploy of everything merged to `integration` has not happened; promotion to production needs the owner's explicit approval.

## D. Optional or later
Mushroom collection, expansion cards beyond the pilot, automatic region detection, Boss Forms, QR ownership claims, scan-recorded enforcement, leaderboard showcase, trading, push notifications.

## Next concrete milestone
Decide the native-shell approach (owner) and have the coordinator produce a short technical spike plan: what the wrapper needs from the existing static export (camera capture, safe areas, back navigation, deep links, offline fallback), a cost estimate, and what must be added to the release repository. No code or purchase before that decision.
