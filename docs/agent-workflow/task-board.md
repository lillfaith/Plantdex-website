# PlantDex task board

Maintained by the coordinator. Updated 2026-11-24. "Cost" is only what session metadata reports; otherwise not reported.
Rules in force: no production deploy, no flag on, no enforcement, UI stays with the owner, nothing from research is imported.

## Merged into `integration` (all flags OFF)
#41, #44, #45, #46, #47, #48, #49, #40, #50, #53, #51, #52, #54, #55, #56, #59 (live confirm_scan workflow and the Scan/Quests/Discoveries work).

## Live scan RPC test (TEST project only)
Run 45686940150: **14 of 14 passed** (authorization, idempotency, refusal, parallel confirmations, missing-function code, eight parallel callers x five rounds).
Remaining: merge #60 (removes the temporary push trigger and adds the TEST account cleanup SQL); owner restores "Confirm email" ON in TEST and runs the cleanup SQL.
`NEXT_PUBLIC_CONFIRM_SCAN_RPC` stays OFF; migration 0014 is applied to TEST only.

## Open PRs
| PR | What | State | Next action |
|---|---|---|---|
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
