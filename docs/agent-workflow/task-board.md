# PlantDex task board

Maintained by the coordinator. Updated 2026-11-24. "Cost" is only what session metadata reports; otherwise not reported.
Rules in force: no production deploy, no flag on, no enforcement, UI stays with the owner, nothing from research is imported.

## Merged into `integration` (all flags OFF)
#41 confirmScan mitigation, #44 test fixture, #45 region docs, #46 identify hardening (S2), #47 multi-region logic (Q2),
#48 RPC client path (S3), #49 RPC flag wiring, #40 discovery-trust contract + classifier, #50/#53 live-test workflow,
#51 camera capture logic (S4), #52 Habitats view-model (Q3), #54 ownership fix.

## Open PRs
| PR | What | State | Next action |
|---|---|---|---|
| #55 | Live confirm_scan: public key in a repo variable, both key formats | CI green | Owner creates `TEST_SUPABASE_ANON_KEY`; coordinator merges; live run fires |
| #43 | Migration 0014 | HELD draft, applied to TEST only | Owner decision on production, separate |
| #33, #34 | Workflow environments, release repository | ON HOLD | Re-scope later |

## Agents
| Agent | Branch | Task | Status | Depends on | Next |
|---|---|---|---|---|---|
| Scan | agent/scan/* | S1-S4 done | Available | | Wire client to capture + shadow receipt after Discoveries SCRs |
| Quests | agent/quests/* | Q1-Q3 done | Available | Region data validated | Region selection store wiring (flag off) |
| Discoveries | agent/discoveries/trust-design | Stage 1-3 contract merged | Available | Coordinator applies SCRs | Receipt + shadow-mode client code behind flags |
| Region research 1/C | coord/region-boundaries-research | Recover ten-region model, review EPA mapping, polygon vs grid | Running | | Report uncertainties |
| Region research 2 | coord/region-membership-research | 45-card taxonomy and evidence done | Done | Boundaries (phase 2) | Membership phase 2 |
| B1 | coord/expansion-audit-inventory | READ-ONLY inventory of the 85 cards | Running | | Inventory PR |
| B2 | coord/expansion-audit-profiles | Audit of the 45 profiles and field matrix | Running | | Audit PR |
| Coordinator | coord/* | Reviews, wiring, task board | Active | | Pilot plan after B1/B2 |

R1 usage (reported): about $2.48 for the boundary-research session.

## Owner-held
Visual design (lavender Habitats, ScanPanel wording, navigation, animations), activation of any flag, Stage 4 enforcement,
importing the 85 cards, final artwork, location detection activation, production deploys, geographic mapping adoption.
