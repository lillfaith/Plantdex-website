# PlantDex task board

Maintained by the coordinator. Updated 2026-11-24. "Cost" is only what session metadata reports; otherwise not reported.
Rules in force: no production deploy, no flag on, no enforcement, UI stays with the owner, nothing from research is imported.

## Merged into `integration` (all flags OFF)
#41 confirmScan mitigation, #44 test fixture, #45 region docs, #46 identify hardening (S2), #47 multi-region logic (Q2),
#48 RPC client path (S3), #49 RPC flag wiring, #40 discovery-trust contract + classifier, #50/#53 live-test workflow,
#51 camera capture logic (S4), #52 Habitats view-model (Q3), #54 ownership fix.

## Open PRs and results (2026-11-25)
| PR | What | State | Next action |
|---|---|---|---|
| #58 | Profile-structure audit | Updating, CI pending | Merge when green |
| #61 | Expansion pilot plan (plan only) | Updating | Merge docs when green; owner approval of the plan still needed |
| #64 | Pilot botanical research (5 cards) | Open, docs | Merge docs; five safety/botanist questions go to the owner |
| #63 | Sprite spec, QA checker, QA report | Open | Merge; no sprite is treated as approved |
| #62 | Importer, validator, publication gate (flag OFF) | Open | Merge after update; all five pilot cards are HELD by the gate |
| #65 | Region research: taxonomy, mapping review, resolver validation | Draft | Owner review of the mapping; not adopted |
| #43, #33, #34 | Migration 0014 (TEST only), environments, release repo | HELD | Owner |

## Agents
| Agent | Task | Status | Next |
|---|---|---|---|
| Scan, Quests, Discoveries | S1-4, Q1-3, Stage 1-3 contract | Available | Wire after owner decisions |
| P1 importer | Done (#62) | Waiting | Applied: flag line default OFF; generated file stays in `docs/expansion/pilot/` until the owner approves an import |
| P2 botanical research | Done (#64) | Waiting | Revisit after the botanist reviews the five open safety questions |
| P3 sprite QA | Done (#63) | Waiting | Run the checker on any new sprite set |
| Region C | Done (#65) | Waiting | Owner supplies the ten-region boundary rule for 16 uncertain units |
| Region membership phase 2 | Waiting on boundaries | Waiting | |

Findings: all five pilot cards are HELD by the publication gate (unreviewed caution, AI-derived image, unverified taxon, search links only, unapproved assets).
RTK: installed and hooked in the coordinator session; setup scripts now saved on the three agent environments (effect not yet confirmed in an agent session).

## Owner-held
Visual design, activation of any flag, Stage 4 enforcement, importing the 85 cards, final artwork and sprite approval, location detection, production deploys,
geographic mapping adoption, collection id for the expansion, any progression change for digital-only cards, migration to list new cards in `is_catalogue_herb`,
botanist/safety review of the five pilot cards, ten-region boundary rule.
