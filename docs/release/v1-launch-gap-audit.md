# V1 launch-gap audit (2026-11-26, coordinator)

Method: read the code on `integration` at `9a7c48c` (grep and file reads). I ran no new tests and could not see the live production
site, so "deployed" and "real player" are marked UNVERIFIED unless a check exists. Vocabulary, strictest last:
**Implemented** = code exists. **Integrated** = mounted in a real route a player reaches. **Enabled** = on by default in a build.
**Verified** = exercised end to end (real browser or real project), not just unit tests. **Production-ready** = all of that, deployed, reviewed.

Deployment fact: `deploy.yml` deploys the branch `claude/planning-session-61zwro`. `integration` has **37 commits not in it** and it has 1 commit
not in `integration` (to be reconciled before any promotion). Migrations in the repo stop at 0013; 0014 (`confirm_scan`) is a held draft PR #43 applied to TEST only.

## Summary

Nothing in the list is production-ready on today's evidence. Items 4, 5, 6, 8 are implemented, integrated and enabled; their real-player verification is thin.
Items 1 and 2 are the largest gap: the "reliable in-app camera" and "camera-required, server-authoritative discovery" that define the product direction exist
only as disabled logic or as a TEST-only database function. Item 10 has a probable consent gap. Item 12 does not exist yet.

| # | Feature | Implemented | Integrated | Enabled | Verified | Prod-ready | V1 blocker? |
|---|---|---|---|---|---|---|---|
| 1 | Reliable in-app camera | Partly | **No** | No | No | No | **Yes** |
| 2 | Camera-required, server-authoritative discoveries | Partly (TEST only) | No | No | TEST RPC 14/14 only | No | **Yes** (owner may redefine) |
| 3 | Scan, review, confirm, reveal, collect | Yes | Yes | Yes | Partly | Unverified | **Yes** (needs real-device pass) |
| 4 | Botanical profiles and collection | Yes | Yes | Yes | Yes (unit tests, live site check) | Likely | No (defer only expansion) |
| 5 | XP, mastery, achievements, First Find, Amber Ring | Yes | Yes | Yes | Server suite exists, last run not confirmed | Unverified | **Yes** (confirm persistence live) |
| 6 | Garden placement and progression | Yes | Yes | Yes | Unit tests; no real-player run | Unverified | Yes (verify) |
| 7 | One complete regional Quest/Habitats experience | Partly | Partly | Partly | No | No | **Yes** (define "complete") |
| 8 | First-run onboarding | Yes | Yes | Yes | No player test | Unverified | Yes (playtest) |
| 9 | Approved UI direction, mobile navigation | Nav yes; "approved direction" unknown | Nav yes | Yes | No | Unverified | **Owner to confirm** |
| 10 | Identification safety, third-party photo consent | Safety yes; consent partly | Partly | Yes | No | No | **Yes** (consent) |
| 11 | Account security, RLS, privacy, errors | Yes | Yes | Yes | Server suite + guards exist | Unverified | Yes (re-run live) |
| 12 | Native iOS, TestFlight, App Store | No | No | No | No | No | Yes for App Store |

## Per feature

**1. In-app camera.** Exists: `src/lib/scan-capture.ts` and `scan-capture-camera.ts` (getUserMedia state machine, permission errors, 31 tests), flag
`NEXT_PUBLIC_CAMERA_CAPTURE` default off. Neither file is imported by any component. What players get today is `<input capture="environment">` in
`src/components/scan/ObservationPhotos.tsx`, which hands off to the OS camera app, may let a player pick from the library, and is not "live in-app capture".
Missing: a mounted live-capture screen (UI decision), iOS WKWebView behaviour, a real-device test, the library-photo policy. Blocker: yes.

**2. Camera-required, server-authoritative discoveries.** Exists: owner decisions D0-D7; migration 0014 `confirm_scan` (write-once, idempotent) applied to TEST,
14/14 live cases pass; client path in `scans.ts` behind `NEXT_PUBLIC_CONFIRM_SCAN_RPC` (off). Today a find is still recordable from two taps with no camera
(`DiscoverPanel`), and nothing server-side requires a scan. Stage 4 enforcement is not authorised. Missing: 0014 in production (owner approval), flag on after a TEST
soak, a rule tying a collectible discovery to a server-recorded scan, the eligibility design for the cheating cases, a migration path that keeps existing players.
Dependencies: item 1 (camera) and owner approval of enforcement. Blocker: yes unless you redefine V1 as "scan-recorded, not enforced".

**3. Scan to collect flow.** Exists and is mounted: `ScanPanel`, `ScanOutcome`, `DiscoveryCelebration`, onward link, research feedback. Verified only by unit tests and
the identification workflows (`live-scan-browser.yml`, `check_live_scan.py`, which are manual). Missing: a recorded 390px real-device walkthrough of the whole loop against
the current build, and the same on the deployed site. Blocker: yes (cheap to close).

**4. Profiles and collection.** 45 printed cards, Field Cards, collection percentages, safety notices; `check-live-site` runs after each deploy. Expansion (85 cards) is not
needed for V1 by your own scope. Not a blocker.

**5. XP, mastery, achievements, First Find, Amber Ring.** Reducer-derived XP (never stored), mastery, `first-find` achievement, `Amber Ring` frame in `field-frames.ts`.
Persistence for signed-in players is covered by `e2e/supabase.e2e.test.ts` (60 tests) but I did not run it and cannot confirm its last result on the deployed project. Missing:
a fresh run against the project that production uses and a manual new-player check. Blocker: confirm only.

**6. Garden.** `/garden`, mastery-driven stages, no timers (your 2026-11-19 decision). Unit-tested. No real-player run recorded. Verify only.

**7. Regional Quest/Habitats.** `/quests` exists with `RegionPicker` and `QuestBoardPanel`; only Georgia is launched (`regions.ts`); multi-region is behind
`NEXT_PUBLIC_MULTI_REGION` (off). `NearbyByHabitat` exists; the Q3 `habitat-view-model` has **no importing component** (unmounted, UI-owned). `/quests` is reached from the Herbdex,
not the nav. Missing: a decision on what "one complete experience" means (suggest: Georgia board plus habitat grouping, mounted, with a completable quest), the UI mount, a player test.
Location detection is not activated. Blocker: yes, scope to be set.

**8. Onboarding.** `WelcomeIntro` and `AppWalkthrough` are mounted in `layout.tsx`; `FirstQuestCard` and first-find celebration exist. Structure tests pin steps to real selectors.
Whether it teaches the real loop (scan, confirm, reveal) to a stranger is untested with a person. Playtest needed. After item 1/2 change the loop, the script must be revisited.

**9. UI direction and navigation.** Bottom nav has six links (Home, Scan, Collection, Garden, Journal, Learn); profile via avatar; seven is the measured ceiling. I cannot find a recorded
"approved UI direction" document and no UI lane has run since the multi-agent split, so I cannot say the current UI matches what you approved. Owner to confirm what is approved;
pending UI work (camera screen, habitats mount, expansion tiles) waits on you.

**10. Safety and photo consent.** `SafetyNotice` on herb and list pages, `/safety`, privacy section "If you identify a plant from a photo" naming PlantNet and plant.id.
I found no consent or "your photos go to a third party" line at the point of sending in `ScanPanel`/`ObservationPhotos` (search only; the panel is ~1,200 lines, so a human check is warranted).
Missing: an explicit in-flow notice and acknowledgement before the first upload, identification-safety wording review (never edibility), counsel/owner review of the copy.
Blocker: yes, and App Store review will ask.

**11. Security, RLS, privacy, errors.** Write-once RLS design, account export and deletion, guards pinning those, leaderboard integrity (0013). Open items: re-run the live suite against the
production-bound project, confirm 0013 is applied there, error states on a failed scan (unit-tested, not recorded on device). New work (0014/0015) must keep server-side authorization separate
from frontend flags (recorded 2026-11-26).

**12. iOS.** No wrapper, no `ios/`, no Capacitor, no manifest, no Apple account decision. A1 (feasibility audit, PR pending) will recommend a path. TestFlight and App Store review need items 1, 2, 10
settled first (camera permission strings, privacy answers, account deletion already exists).

## Prioritised remaining work (dependencies in brackets)

| Order | Work | Lane/agent | Needs from you |
|---|---|---|---|
| 0 | Decide V1 meaning of "camera-required": enforced now, or scan-recorded with enforcement later | you | Decision (blocks 2, 8, 12) |
| 1 | Reconcile prod branch with `integration`; list the 37 commits; promotion checklist | coordinator | Later approval to promote |
| 2 | Real-device 390px walkthrough of the whole loop on the current build, then on the deployed site (item 3) | coordinator + a scan-lane follow-up | None |
| 3 | Fresh live run of `supabase.e2e` and `check_live_site` against the production-bound project; confirm 0013 applied (items 5, 11) | coordinator | You dispatch workflows |
| 4 | Mount live camera capture behind the flag, TEST preview (item 1) [needs 0] | scan lane + UI (you) | Visual approval |
| 5 | In-flow third-party photo consent (item 10) | scan lane | Copy approval |
| 6 | 0014 to production, flag soak, then the eligibility rule (item 2) [needs 0, 4] | scan + discoveries lanes | Explicit production approval |
| 7 | Mount habitats view, define and build one complete Georgia quest (item 7) | quests lane + UI (you) | Scope + visual approval |
| 8 | Onboarding rewrite and a playtest with 3 strangers (item 8) [after 4, 6] | UI (you) + coordinator | Playtest participants |
| 9 | iOS recommendation, then a TestFlight proof of concept (item 12) [A1; after 0, 5] | A1 | Packaging decision, Apple account |
| Deferred | 85-card expansion, ten regions, location detection, boss forms, leaderboard showcase | | |

The smallest honest path to "complete, enjoyable, safe core loop" is items 0, 2, 3, 5, then 4 and 7, with 6 depending on your answer to 0.
