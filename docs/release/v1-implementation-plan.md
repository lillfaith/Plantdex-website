# V1 implementation plan (2026-11-26, coordinator)

Settled: see `docs/agent-workflow/decisions.md` (camera-required collection, FINAL). Goal of the next milestone: a protected TEST preview of the
complete original-card loop (Scan, Review, Confirm, Reveal, Collect, Profile, Progress, Garden, plus one Georgia quest). Nothing below deploys,
enables production enforcement, or migrates production.

| Blocker | Owner | Exists | Remaining | Depends on | Tests required | Visual approval | Acceptance |
|---|---|---|---|---|---|---|---|
| A1 Live in-app camera mounted | Scan lane S5 (`agent/scan/s5-camera-flow`) | `scan-capture*.ts`, flag off | Capture screen in ScanPanel, permission/denied/in-use fallbacks, no EXIF path | Receipt contract (D5) | Unit, fake-camera Playwright 390px | Yes (functional UI only) | Capture to identify works in a flagged TEST preview; failures leave progress intact |
| A2 Server-authoritative eligibility | Discoveries lane D5 (`agent/discoveries/d5-server-eligibility`) | 0014 `confirm_scan` on TEST, design D0-D7 | Receipt contract, draft 0016 (TEST), switch default OFF, grandfathering, anti-cheat | 0014 on TEST (done) | SQL verification, direct-API bypass tests | No | With enforcement ON, imported/manual/direct inserts cannot unlock new cards; OFF changes nothing |
| A3 Scan to collect end to end | S5 + D5, coordinator integrates | Flow exists | Receipts wired to confirm and reveal | A1, A2 | Playwright full loop | Yes | Whole loop passes in the preview with receipts |
| A4 Third-party photo consent | S5 | Privacy page copy only | Blocking notice before first send, versioned acknowledgement | None | Unit, legal tests | Copy approval | No upload before acceptance; re-prompt on version change |
| B1 Persistence of XP, mastery, First Find, Amber Ring, achievements | V1-QA (`coord/v1-qa`) | Reducer, 60-test server suite | Fresh run + regression tests | Owner dispatches live run | Unit, live suite | No | Reload and sign-in preserve all |
| B2 Garden save and reload | V1-QA | `/garden` | Reload/sign-in verification | None | Playwright | No | Same stages after reload and account sync |
| B3 Georgia quest complete | Quests lane Q4 (`agent/quests/q4-georgia-complete`) | `/quests`, board, view-model unmounted | Mount habitats in a preview, finish a completable quest | A2 rule respected | Unit, Playwright | Yes (lavender, no redesign) | Select Georgia, see plants, earn, complete, persists |
| B4 Onboarding vs real loop | Coordinator after A3 | Intro + walkthrough | Re-script to camera collecting, playtest | A3 | Walkthrough tests, 3 players | Yes | Stranger completes first find unaided |
| C1 Security/RLS/bypass audit | V1-QA | Guards, RLS design | Findings table + pinned tests | None | SQL/unit | No | No unreviewed bypass |
| C2 Cost, rate limits, privacy, botanical safety | V1-QA | Quota functions | Review + report | None | Review | No | Written findings |
| C3 Production inventory + promotion plan | V1-QA | 37 commits behind; 1 prod-only commit | Read-only checks for owner, reconcile commit, plan | Owner runs checks | Review | No | Plan reviewed, NOT executed |
| D1 iOS | A1 (`coord/ios-feasibility`) | Audit running | Recommendation, limited on-device PoC | A1, then Apple account decision | PoC build | No | Decision memo; no native conversion |
| Parallel | E1 (#69), P4 | Running | Per their briefs | None | | | Not a V1 prerequisite |

## Sequence
1. Now (running in parallel): D5 contract first, then S5 and Q4 build against it; V1-QA verifies and audits.
2. As each PR lands: coordinator reviews against the decisions, merges when `guard` and `verify` pass.
3. Coordinator assembles the integrated TEST preview and runs the full loop; you review screenshots.
4. Then onboarding rework and playtest, the reviewed promotion plan, and the iOS decision.

## Approvals needed from the owner
- Dispatch live verification (supabase.e2e and live-site check) when V1-QA asks, using the same manual process as before.
- TEST apply of 0015, and later 0016, by the manual Actions process; production never without separate approval.
- Visual and copy approval for the capture screen, consent notice, Habitats mount and Georgia quest.
- Anti-cheat thresholds and the library-photo policy wording once D5 reports.
- Run the read-only production checks V1-QA will specify.
