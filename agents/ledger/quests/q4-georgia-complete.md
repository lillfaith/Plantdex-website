# Task: Georgia Habitat Trail, one complete quest (Q4)

- Lane / role: quests
- Branch: `agent/quests/q4-georgia-complete` (from `integration`)
- Status: review

## What it is
`/quests/habitats`, a supervised preview behind `NEXT_PUBLIC_GEORGIA_QUEST_PREVIEW=on` (exact string; unset = off = 404, screen not bundled).
Objective: collect at least one plant from each of Georgia's habitat groups (5, built from confirmed Georgia records over the original 45 cards).
Progress is derived from `discoveries` through `habitatsViewModel`; completion is recorded once, never revoked, per account scope.

## WORKING / MOCKED / DISABLED
| Piece | Status | Notes |
|---|---|---|
| Choose Georgia (button, no detection) | WORKING | Writes the existing region key; no location call (sandbox traps `navigator.geolocation`: 0 calls) |
| Habitat groups, eligible plants, objective in words | WORKING | Via the existing view-model; source note reused from `RECORDED_COPY` |
| Progress from real finds | WORKING | Finds are made on the card page / scanner (existing paths); the quest only reads |
| Completion shown, date recorded once, survives reload | WORKING (signed out, verified in browser) | Device-local record keyed by scope |
| Signed-in persistence | MOCKED | Same code with scope = user id; unit-tested per scope, not run live (no Supabase project in this sandbox). Completion itself is derived from synced discoveries, so it holds on any device; only the date is device-local |
| Server-recorded completion / sync of the date | DISABLED | Needs research-engine change: SCR `quests-q4-georgia-completion-record` |
| Reward | DISABLED | Completion mark only; no XP/badge. Owner decision in the same SCR |
| Camera-required enforcement | DISABLED upstream | Not active in this repo; quest adds no camera-free route and no discovery write, so it inherits whatever gate lands |
| Flag default in next.config | DISABLED | SCR `quests-q4-preview-flag-in-next-config` (safe unset) |
| Nav entry | NOT CHANGED | Question in `agents/requests/quests-q4-nav-question.md` |
| Ten-region model, expansion species, location detection, new XP | NOT BUILT | Out of scope |

## Evidence
Unit: `src/lib/region-quest.test.ts` (24 tests: supply completability, derived/idempotent, no reducer/progression import, no clock, no discover call, flag gating, wording, record ratchet/scope/validation).
Browser: `agents/ledger/quests/q4-sandbox/run.mjs`, 390px, 16/16 checks, screenshots in `docs/quests-q4/`.
`npm run verify`: exit 0, 142 files / 2286 tests.

## Notes
`docs/release/v1-launch-gap-audit.md` does not exist on `integration`; it could not be read.
`docs/quests-q4/` and `e2e/` are coordinator-owned; the screenshots were written where the task asked, and the runner lives under the ledger (any-agent).
