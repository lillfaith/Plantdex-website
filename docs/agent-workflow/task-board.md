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

## Agents (environment, task, branch, PR, status, next)
| Agent | Environment | Branch | PR | Status | Outstanding review | Next action |
|---|---|---|---|---|---|---|
| Scan, Quests, Discoveries lanes | plantdex-website | agent/* | merged | Available | none | Wire after owner decisions |
| P1 importer/validator | plantdex-website | coord/expansion-pilot-importer | #62 | Done | merge | Reuse for the next batch after the owner approves the pilot |
| P2 botanical research (5 cards) | plantdex-botanical-research | coord/expansion-pilot-research | #64 | Done | botanist/owner: 5 safety questions | Revisit after review |
| P3 sprite QA | plantdex-website | coord/expansion-pilot-sprite-qa | #63 | Done | merge | Run checker on any new set |
| P3b sprite proposals (written only) | plantdex-botanical-research | coord/expansion-sprite-proposals | pending | Running | owner visual review | Owner approves or edits each proposal before any art |
| E1 progression inheritance design + draft migration (TEST only) | plantdex-website | coord/expansion-progression-design | pending | Running | owner decisions it lists | Review; apply to TEST only after review |
| Region C (taxonomy, EPA mapping, resolver) | plantdex-region-research | coord/region-boundaries-research | #65 draft | Done | owner: boundary rule for 16 units | Phase 2 membership after the rule |
| RTK check x3 | one per environment | coord/rtk-check-website / -botanical / -region | none | Running | coordinator reads reports | Report per environment |

Pilot readiness: no pilot card is technically ready; all five are HELD by the publication gate (reasons in PR #62).
Scan RPC: validated 14 of 14 on TEST; the client flag stays OFF.
RTK: installed and hooked in the coordinator session; the agent environments' setup scripts are saved, their effect is being verified by the check sessions above.
Environment note: `plantdex-region-research` shows `allow_mcp_servers: true`; it was created with false. Recommended: restore to false (the region agents use curl to named hosts, not MCP).

## Owner-held
Visual design, activation of any flag, Stage 4 enforcement, importing the 85 cards, final artwork and sprite approval, location detection, production deploys,
geographic mapping adoption, collection id for the expansion, any progression change for digital-only cards, migration to list new cards in `is_catalogue_herb`,
botanist/safety review of the five pilot cards, ten-region boundary rule.
