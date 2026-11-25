# PlantDex task board

Maintained by the coordinator. Updated 2026-11-24. "Cost" is only what session metadata reports; otherwise not reported.
Rules in force: no production deploy, no flag on, no enforcement, UI stays with the owner, nothing from research is imported.

## Merged into `integration` (all flags OFF)
#41, #44, #45, #46, #47, #48, #49, #40, #50, #53, #51, #52, #54, #55, #56, #59 (live confirm_scan workflow and the Scan/Quests/Discoveries work).

## Live scan RPC test (TEST project only)
Run 45686940150: **14 of 14 passed** (authorization, idempotency, refusal, parallel confirmations, missing-function code, eight parallel callers x five rounds).
Remaining: merge #60 (removes the temporary push trigger and adds the TEST account cleanup SQL); owner restores "Confirm email" ON in TEST and runs the cleanup SQL.
`NEXT_PUBLIC_CONFIRM_SCAN_RPC` stays OFF; migration 0014 is applied to TEST only.

## Merged since the last update
#57, #58 (expansion audits), #61 (pilot plan, updated for "Herbdex Expansion" and inherit-not-invent progression), #63 (sprite spec, QA checker, report), #64 (sourced research for the five pilot cards).

## Open PRs (2026-11-25)
| PR | What | State | Next action |
|---|---|---|---|
| #62 | Importer, validator, publication gate (flag OFF) | Fixed two CI findings (ownership coverage, a test that forbade the flag line); CI re-running | Merge when green |
| #66 | Pilot flag default OFF + task board | Green earlier; updating | Merge when green |
| #67 | Sprite proposals #57-61 (written, no art) | Updating | Merge as proposal only |
| #68 | Pilot end-to-end readiness + App Store readiness checklist (drafts) | CI pending | Merge docs; owner reads |
| #65 | Region research (draft) | Owner review | Not adopted |
| #43, #33, #34 | Migration 0014 (TEST only), environments, release repo | HELD | Owner |

## Agents (environment, task, branch, PR, status, next)
| Agent | Environment | Branch | PR | Status | Next action |
|---|---|---|---|---|---|
| Scan, Quests, Discoveries lanes | plantdex-website | agent/* | merged | Available | Wire after owner decisions |
| P1 importer, P2 research, P3 sprite QA | website / botanical / website | coord/expansion-pilot-* | #62, #64, #63 | Done | Reuse for the next batch after the pilot is approved |
| P3b sprite proposals | botanical | coord/expansion-sprite-proposals | #67 | Done | Owner approves or edits each proposal before any art |
| E1 progression inheritance + draft migration (TEST only) | website | coord/expansion-progression-design | pending | Running (usage warning on its limit; it pushes early) | Independent review of its migration before any TEST apply |
| Region C | region-research | coord/region-boundaries-research | #65 draft | Done | Owner supplies the ten-region boundary rule for 16 units |
| Region membership phase 2 | region-research | | | Waiting on boundaries | |

## Verified
- **RTK validation: COMPLETE (2026-11-25).** All three agent environments (plantdex-website, plantdex-botanical-research, plantdex-region-research) report RTK 1.2.1 installed, the Bash hook configured, setup script succeeded, no proxy blocks.
  The hook rewrites only commands RTK has a filter for (ls, git, read); node, npm, npx and compound commands pass through unmodified, so test output and exit codes are unaffected.
  Error text and exit codes through the hook were checked in all three. No further RTK agent work; pinning the install to a reviewed release is a low-priority maintenance task.
- Scan RPC: 14 of 14 on TEST; client flag OFF. TEST cleanup SQL reviewed; owner to run it and restore "Confirm email" ON.
- Pilot: not testable end to end yet (see `docs/expansion/pilot/e2e-readiness.md`); all five cards HELD by the gate.

## Owner-held
Visual design, activation of any flag, Stage 4 enforcement, importing the 85 cards, final artwork and sprite approval, location detection, production deploys,
geographic mapping adoption, collection id for the expansion, any progression change for digital-only cards, migration to list new cards in `is_catalogue_herb`,
botanist/safety review of the five pilot cards, ten-region boundary rule.
=======
| #60 | Remove temporary push trigger + cleanup SQL | CI pending | Merge when green |
| #57, #58 | Expansion audits (inventory, profile structure) | Branches updated, CI pending | Merge when green |
| #61 | Expansion pilot plan (plan only) | Open | Owner review |
| #43 | Migration 0014 | HELD draft, TEST only | Owner decision on production, separate |
| #33, #34 | Workflow environments, release repository | ON HOLD | Re-scope later |

## Agents
| Agent | Branch | Task | Status | Next |
|---|---|---|---|---|
| Scan, Quests, Discoveries | agent/* | Q1-3, S1-4, Stage 1-3 contract done | Available | Wire after owner decisions (see below) |
| Region C (taxonomy, EPA review, polygon vs grid) | coord/region-boundaries-research | Recover ten-region model, validate resolver | Running | Report uncertainties |
| Region membership (phase 2) | coord/region-membership-research | Waits on boundaries | Waiting | |
| P1 importer/validator | coord/expansion-pilot-importer | Gated import for five pilot cards, flag OFF | Running | PR |
| P2 botanical research | coord/expansion-pilot-research | Sourced profile content, Rumex analysis | Running | PR |
| P3 sprite QA | coord/expansion-pilot-sprite-qa | Sprite spec and checker; no art generated | Running | PR |

## Owner-held
Visual design, activation of any flag, Stage 4 enforcement, importing the 85 cards, final artwork and sprite approval, location detection, production deploys,
geographic mapping adoption, collection id for the expansion, any progression change for digital-only cards, migration to list new cards in `is_catalogue_herb`.
>>>>>>> origin/integration
