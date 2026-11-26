# PlantDex task board

Maintained by the coordinator. Updated 2026-11-26. Costs are only what session metadata reports (boundary-research session about $2.48).
Rules in force: no production deploy, no flag on, no enforcement, UI stays with the owner, nothing from research is imported.

## Merged into `integration` (all flags OFF)
#41, #44, #45, #46, #47, #48, #49, #40, #50, #53, #51, #52, #54, #55, #56, #59, #60 (the Scan, Quests and Discoveries work and the live confirm_scan workflow, now manual-dispatch only).

## Live scan RPC test (TEST project only)
Run 45686940150: **14 of 14 passed** (authorization, idempotency, refusal, parallel confirmations, missing-function code, eight parallel callers x five rounds).
`NEXT_PUBLIC_CONFIRM_SCAN_RPC` stays OFF; migration 0014 is applied to TEST only. Owner: run `docs/agent-workflow/test-account-cleanup.sql` in TEST and restore "Confirm email" ON.

## Merged since the last update
#57, #58 (expansion audits), #61 (pilot plan), #63 (sprite spec, QA checker, report), #64 (sourced research for the five pilot cards),
#62 (importer, validator, publication gate; nothing imported), #66 (`NEXT_PUBLIC_EXPANSION_PILOT` default off), #67 (sprite proposals, proposal only; no art),
#68 (five-card readiness + App Store readiness checklist, drafts).

## Open PRs (2026-11-26)
| PR | What | State | Next action |
|---|---|---|---|
| #69 | E1 progression inheritance + draft migration (TEST only) | website | coord/expansion-progression-design | #69 | Design delivered; follow-up session running | Independent re-review of 0015, then owner TEST apply |
| P4 protected five-card preview | website | coord/pilot-preview | pending | Running (new) | Status table: working / mocked / disabled / missing / awaiting approval |
| A1 iOS feasibility audit + isolated proof of concept | website | coord/ios-feasibility | pending | Running (new) | Recommendation, risks, costs; no native conversion |
| Region C | region-research | coord/region-boundaries-research | #65 draft | Done | Owner supplies the ten-region boundary rule for 16 units |
| Region membership phase 2 | region-research | | | Waiting on boundaries | |

## Verified
- **RTK validation: COMPLETE (2026-11-25).** All three agent environments (plantdex-website, plantdex-botanical-research, plantdex-region-research) report RTK 1.2.1 installed, the Bash hook configured, setup script succeeded, no proxy blocks.
  The hook rewrites only commands RTK has a filter for (ls, git, read); node, npm, npx and compound commands pass through unmodified, so test output and exit codes are unaffected.
  Error text and exit codes through the hook were checked in all three. No further RTK agent work; pinning the install to a reviewed release is a low-priority maintenance task.
- Scan RPC: 14 of 14 on TEST; client flag OFF. TEST cleanup SQL reviewed; owner to run it and restore "Confirm email" ON.
- Pilot: not testable end to end yet until P4 reports (see `docs/expansion/pilot/e2e-readiness.md`); all five cards HELD by the gate.

## Owner-held
Visual design, activation of any flag, Stage 4 enforcement, importing the 85 cards, final artwork and sprite approval, location detection, production deploys,
geographic mapping adoption, collection id for the expansion, any progression change for digital-only cards, migration to list new cards in `is_catalogue_herb`,
botanist/safety review of the five pilot cards, ten-region boundary rule.
