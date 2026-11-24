# Task: Discovery trust design (docs only), revision 2

- Lane / role: discoveries
- Branch: `agent/discoveries/trust-design` (PR #40 into `integration`)
- Priority: A
- Token/time budget: one session per revision
- **Status: `review`** (revision 2 written; awaiting the owner's review of the design and its seven decisions)

## Goal
Revision 1 (2026-11-20): a design for competitive discoveries requiring in-app capture, board points only.
**Revision 2 (2026-11-24), after the owner's product decision:** earning a NEW collectible card should eventually require
an ELIGIBLE IN-APP PLANT SCAN. Not enforced yet; staged; flags default OFF; Stage 4 (enforcement) needs separate approval.
Docs only. Nothing here activates any rule.

## Acceptance criteria (revision 2)
- [x] `docs/discovery-trust-design.md` distinguishes the six things (educational identification, eligible scan-based
      discovery, card ownership, competitive credit, journal sightings, mastery), each with a definition, who writes it,
      what record holds it and what reads it, plus a "may exist without" table (section 2).
- [x] Defines exactly what makes a scan eligible (section 3) and says plainly that an in-app scan is evidence of taking
      part in the capture process, not proof of presence, and never uses "verified" for it.
- [x] Traces the current server-authoritative progression path from the code, and says where a scan-required rule could
      be enforced and why client-only enforcement is not enforcement (section 4).
- [x] Lists every shared change by owner and drafts each as a Shared Change Request in `agents/requests/` (section 7).
- [x] Migration requirements: tables, RLS, write-once, existing rows, one-way cutover and grandfathering, rollback (section 8).
- [x] Accessibility section, including what the camera-less path gets and does not (section 9).
- [x] Stage 2, 3 and 4 plan; Stage 2's smallest first slice and first reviewable PR (section 10).
- [x] Ends with "Decisions the owner must make", product-level only, each with options, recommended default, tradeoff
      and what it changes (section 13).
- [x] Only docs, `agents/ledger/**` and `agents/requests/**` changed. No code, test, scoring, schema, migration, workflow,
      flag, package or data change.
- [x] `node scripts/agent-guard.mjs diff --role discoveries --base origin/integration` is clean (output below).

## Files changed in revision 2
- `docs/discovery-trust-design.md` (rewritten)
- `agents/ledger/discoveries/trust-design.md` (this file)
- `agents/requests/discoveries-receipt-contract.md` (coordinator, Stage 2a; draft, not applied)
- `agents/requests/discoveries-receipt-accept.md` (coordinator, Stage 2c / 3; draft, not applied)
- `agents/requests/discoveries-receipt-issue.md` (scan, Stage 2b; draft, not applied)
- `agents/requests/discoveries-presentation.md` (discoveries-owned work plus the copy and UI requests it needs; draft)
- `agents/requests/discoveries-write-gate.md` (coordinator, **Stage 4 stub, not for action**)

## Prohibited, and not touched
Everything outside the paths above. No credential was read or used. No workflow was run or dispatched. No PR into the
production branch. No flag exists in code; every flag named in the design is a proposal that defaults OFF.

## Contracts read but not changed
`herbdex-reducer.ts`, `progression.ts`, `mastery.ts`, `types.ts`, `supabase/**` (migrations 0001, 0002, 0006, 0011, 0013;
`herbdex-action`, `identify-plant`), `species-attestation.ts`, `scans.ts`, `plant-match.ts`, `ownership.json`.

## Verification

**Authoritative verification is the pull request's `verify` check on GitHub's runner. It passed on this PR for
revision 1.** Revision 2 changes only markdown, so no source, test or build input differs.

**Environment note, superseding the earlier "blocked" entry.** In revision 1 this lane's container could not complete the
`build` stage of `npm run verify`: `npm ci` installed the musl `lightningcss` native binary in a glibc container
(`Cannot find module '../lightningcss.linux-x64-gnu.node'`). That was a problem **only in this container**, not in the
repository, the lockfile or CI, which is why the check passes on GitHub. It was not worked around, no further attempt was
made, and CI was not touched. This container cannot run the production build locally; that is recorded, not repaired.
The previous `blocked` status is cleared: nothing blocks this task.

Guard, run before commit:

```
$ node scripts/agent-guard.mjs diff --role discoveries --base origin/integration
agent-guard: role 'discoveries' changed only files it may change.
```

## Report
**What changed:** the design now treats the owner's scan-required-card direction as the goal, separates six facts,
traces who writes what today, and lays out a four-stage, flag-gated, one-way-grandfathered plan with five draft SCRs.

**Headline findings from the trace (all from reading the named files on 2026-11-24):**
1. `discoveries` is written directly by the client under RLS with only an id check; `discovered_at` is client-suppliable.
2. XP, levels, Field Cards, garden and achievements are all derived in the browser from those rows. Mastery and research
   completion are server-derived (`herbdex-action`) but from client-written inputs. So a board-only gate cannot satisfy
   the owner's decision; only the write to `discoveries` can (Stage 4, owner-gated).
3. `identify-plant` already signs a server fact (the species attestation) that nothing consumes for discoveries, and
   `scans.identification_observation_id` is a client-written value, so a `scans` row is not evidence.
4. The server cannot tell a live camera frame from an uploaded file. `purpose: collect` is a client declaration. The design
   states this and does not claim more.

**Smallest first slice (Stage 2):** a coordinator contract PR of about 350 lines: an inert `scan_receipts` table and
`discovery_rules` config, one shared pure predicate and its tests, sync/export/delete pins, flags defaulting off. Scan
issues receipts next; `herbdex-action` accepts them third. No existing table, XP, leaderboard or Garden path is touched.

**Decisions the owner must make:** D0 to D7 in section 13 (scan definition; uncertain and genus-level eligibility;
what is a collectible discovery; signed-out; grandfathering; camera-less path; copy and privacy; order of enforcement).

**Could not verify:** nothing in the design was executed. The build could not be run in this container (above).
**PR:** #40, updated by the push.
