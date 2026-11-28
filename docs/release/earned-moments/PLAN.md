# Earned Moments milestone: implementation plan and test plan

Status: PROPOSAL for owner review. Nothing here is implemented. No game rule, XP value, reward, collection eligibility, security rule or database structure changes. Motion philosophy: **quiet while browsing, lively when interacting, special when earning something.** Species sprite animations stay. Nothing that is not a real recorded event may look like an earned one.

## 0. Owner decisions recorded
1. Ambient motion: keep species sprites; remove or pause every other perpetual loop (list in section 4). Reduced motion preserved.
2. Pick & Eat: requires a formal botanical and safety review before any specification. Not built. Camera identification is never evidence that a plant is safe to eat, harvest or use medicinally.
3. No 85 expansion cards, new regions or new collection systems in this milestone.

## 1. Lanes and who edits what (agent-guard verified)
| Work | Lane / owner | Paths |
|---|---|---|
| Earned-moment event derivation (pure, testable) and its one hook in the provider | **coordinator** (Shared Change Request: `HerbdexProvider` and reducer are shared contracts) | new `src/lib/earned-moments.ts`, small addition to `src/state/HerbdexProvider.tsx` |
| Earned-moment UI, sprite pausing, ambient loop removal, CSS | **ui** (animation is ui-owned) | `src/components/**` shared, `PlantSprite.tsx`, `sprite-visibility.ts`, `AchievementShelf.tsx`, `CardShowcase.tsx`*, `globals.css` |
| Shutter, identification waiting state, failure/retry | **scan** | `ScanPanel.tsx`, `CameraCapturePanel.tsx`, `ScanScout.tsx`, `CollectFlow.tsx` |
| Field Board podium | **discoveries** | `BoardScreen.tsx`, new `Podium.tsx` (branch `agent/discoveries/board-podium`, built, awaiting choice) |

\* `CardShowcase` is Priority B; prototype branch only until promoted.

Each lane works on its own review branch; nothing merges without owner approval; no production, no deployment.

## 2. A. Shared earned moments

**Authoritative only.** A moment is derived from a *transition between two authoritative snapshots*, never from a tap:

| Moment | Source of truth | Fires when |
|---|---|---|
| XP level-up | `progressFromState()` (before/after) | `after.level > before.level`, both snapshots from state the store has loaded or reconciled |
| Mastery completed | `state.mastered` | a herb id appears that was absent in the previous snapshot |
| Field Research completed | `lastResearch.completedResearchIds` (already published by `HerbdexProvider` from reconcile; signed in, the server's answer) | ids not yet shown this session |
| Discovery | unchanged: existing `DiscoveryCelebration` | unchanged |

**Rules that make a fake reward structurally impossible**
1. Baseline, not replay: the first snapshot after hydration for an account is the baseline and fires nothing. A reload, a sign-in on a second device, or Safari reloading a killed tab therefore shows the new stage as simply held. Same call as `garden-moments.ts` and `unlocked-field-cards.ts`, and nothing is persisted, so no per-account storage scoping is needed.
2. Forward only and de-duplicated by a session ledger keyed `kind:id`; signing out clears it.
3. Reuse, don't duplicate: `DiscoveryCelebration` already shows level-up and achievements for a discovery. Those keys are written to the ledger when it shows them, so the shared moment never repeats what the celebration already played.
4. Display only after `ready`; mutations that fail or are refused by the server produce no snapshot change and so no moment.
5. The moment component renders data (names, XP numbers) from the same functions the screens use (`progressFromXp`, `MASTERY_STAGE_LABEL`, research task titles). It owns no threshold literal and awards nothing.

**Component (ui lane).** One queue-of-one dialog/toast built from existing parts (`CountUp`, bar fill, `toast-in`, `haptic()` no-op on iOS web, `Skip`). Short (about 1.2 s), Skip and Escape land on the end state, reduced motion starts at the end state, coalesces several events into one stack, never blocks a primary action, `role="status"`.

## 3. B. Sprite performance
- Today only `GardenView` uses `useSpriteVisibility`. Home, Profile, species hero and the showcase run sprites unconditionally.
- Plan: move the observer into `PlantSprite` (one shared `IntersectionObserver` for the whole page, not one per sprite), so every non-`frozen` sprite pauses offscreen via `animation-play-state` (position is kept, no restart, no re-render, no extra fetch).
- Hidden tab / backgrounded Safari: one `visibilitychange` listener sets a root attribute; one CSS rule pauses `.plant-sprite` while hidden. Resuming continues mid-gesture.
- No new dependency. No change to sheets, frames, stills or `build_sprites.py`; the 45 species and 9 Field Card sprite assets are untouched. Reduced motion stays owned by the existing stylesheet rule (`animation: none`, frame 0).

## 4. Ambient loops (all 18 `infinite` declarations, with the decision)
| Loop | Where | Decision |
|---|---|---|
| `plant-sprite` (`.plant-sprite`) | every species portrait | **Keep** (identity); add offscreen/hidden pausing |
| `growth-stem`, `growth-leaf` | `GrowthLoader` while loading | Keep (a loading state is real work); stops when loaded |
| `scan-scout-look` | ScanScout on `/scan` idle | Plays during identification only; idle holds frame 0 |
| `achievement-rail` (60 s marquee) | `AchievementShelf` | **Remove**; stationary, manually scrollable (`overflow-x-auto`, snap) |
| `showcase-drift`, `showcase-halo` | `CardShowcase` | **Remove** the loops; one-shot settle on mount |
| `node-pulse` | `MasteryTrack` | **Remove** the loop; one-shot `node-earned` stays |
| `sparkle-drift` | no user in `src` | Delete dead CSS |
| `welcome-drift`, `welcome-scan` | welcome scenes | Finite (2 to 3 passes), then rest |
| `cf-lit`, `cf-flash`, `cf-brackets`, `cf-reveal`, `cf-drop`, `cf-pop`, `cf-arrow` (8 s loop) | `/scan` CollectFlow explainer | Play once as the introduction on first view; end state held; **Replay** button; reduced motion shows the end state |

A new source test fails the build if an `infinite` animation appears outside the allow-list (sprites, loader). `evo-twinkle` and `foil-in` are also unused: removed in the same pass.

## 5. C. Camera and identification feedback (scan lane)
- **Shutter:** a short pixel-step response (about 240 ms): corner brackets snap in and a 3-frame `steps()` flash, fired by the real capture event only. Reduced motion: a static one-frame outline, no flash.
- **Waiting:** ScanScout plays in the existing busy panel. The visible state is driven only by the two stages the code can observe (`prepareImage` finished, then request in flight). The existing determinate `path-fill` bar stays. No simulated percentage, no "analysing" steps, no confidence animation before an answer exists.
- **Success:** unchanged hand-off to the candidate list. **Failure / retry:** the scout holds frame 0 (resting), the existing plain-language message and a Retry button; no new sprite art (a dedicated failure pose would be a separate art request).
- Unchanged and re-tested: consent, capture sessions, receipts, enforcement flags, quota, no original bytes retained, no EXIF/GPS.

## 6. Field Board podium (discoveries)
Two real-component layouts are built on `agent/discoveries/board-podium`, selected by `NEXT_PUBLIC_PODIUM_VARIANT` (`cards` default, `trio`). After the owner chooses, the other is deleted. Presentation only: standings, ties, opt-in and privacy are unchanged. Each card is labelled with its own standing, so 1st/1st/3rd never shows a second place; tied rows say "Tied" (screen readers: "Tied for 1st"); the art slot is the player's own avatar only if the standings function publishes it (it does not today), otherwise a decorative sprite chosen by place.

## 7. Test plan: what is automated and what needs a phone
### Automated (Chromium, vitest, TEST via RLS fixtures; no paid provider calls)
| Area | Check |
|---|---|
| Earned moments | pure tests: no event on hydration baseline; exactly one level-up per real crossing; one mastery per new mastered id; research ids once; ledger dedupe; sign-out clears; discovery celebration keys suppress duplicates; refused/failed write fires nothing |
| Duplicate reward prevention (TEST) | throwaway accounts: repeat the same reconcile/confirm and assert no second moment and no second XP; sign out/in and reload assert no replay |
| Reduced motion | emulated `prefers-reduced-motion`: `document.getAnimations()` returns none for earned moments, shutter, explainer; sprites on frame 0 |
| Sprite pausing | Chromium: count running vs paused sprite animations on Home, Profile, Garden, species page with offscreen items; hidden-tab emulation pauses all; resume continues without frame reset |
| Ambient policy | source test: `infinite` only for allow-listed names; achievement shelf has no animation |
| Layout | 320/375/390/desktop overflow, touch targets, fixed-nav clearance, text-size floor |
| Regression | full `npm run verify`, `check:edge`, agent-guard per branch, scan lane receipt/consent suites |
| Podium | tie fixtures: 1/1/1, 1/1/3, 1/2/2, one row, two rows, unnamed, duplicate names, own row |

### Physical iPhone Safari (REQUIRED; nothing is called Safari-verified before this)
Private TEST-connected preview. Mark PASS/FAIL per item:
1. Capture shutter looks like a shutter and is not janky; reduced-motion setting on: no flash.
2. Identification wait: scout animates smoothly, bar moves only when stages change, airplane-mode failure shows the failure state and Retry works.
3. First discovery celebration plus earned moments: smooth, Skip works, no double reward.
4. Level-up, mastery completion and research completion each show once; leave and return: no replay.
5. Background the page for 30 s and 5 min, return: sprites resume mid-gesture, no reward replays, session still valid (ties to the required Safari reload/session fix).
6. Force-quit Safari and reopen: no stale moment; baseline holds.
7. Garden/Profile scrolling stays smooth; device does not get warm over 2 minutes; low-power mode on.
8. Achievement shelf scrolls by hand; nothing drifts.
9. Dynamic Type large and 320 px-class widths; fixed nav never covers a ranking card.
10. Podium looks right with real standings, including ties.
Record device, iOS version and a screen recording for each failure.

## 8. Order of work
1. Coordinator: `earned-moments.ts` + provider hook + tests (smallest, unblocks UI).
2. UI: sprite visibility (B) and ambient loop removal (independent, low risk).
3. UI: earned-moment component; Scan: shutter and waiting state (parallel).
4. Podium: after the owner picks a layout.
5. One rebuilt TEST-only preview for the iPhone pass.
