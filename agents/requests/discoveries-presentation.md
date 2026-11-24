# Shared Change Request: discoveries-lane presentation and the copy it needs - DRAFT, NOT APPLIED

- From lane: discoveries      Task: agents/ledger/discoveries/trust-design.md
- Needs: contract (copy and ownership clarifications) | UI design
- **Owner of the change: discoveries** (its own files, no SCR needed for those), **plus requests to Tier 0 (human) and UI** for files this lane cannot edit. Stage 2 and 3. Depends on `discoveries-receipt-contract.md`. **Revised 2026-11-24 (D0-D7).**

## Why
The Field Board must say, in words, what counts and that earlier finds still count; a sighting or an import must be able to
carry a receipt token across a sign-in; and the player-visible wording for each outcome (design 9.3) must exist before a
rule is on. A rule change the page does not state is the `/terms`-denies-the-shop failure this repo has shipped before.

## Exact proposal
**This lane builds, after the contract lands, and only behind a build flag defaulting `off`** (client flags are baked at
build time, `NEXT_PUBLIC_*`, like `NEXT_PUBLIC_BOSS_FORMS`, so dead code is dropped):
- `src/lib/board-view*`, `src/components/leaderboard/**`, `src/lib/leaderboard.ts`: the self-reported / scan-recorded split
  as plain markup with existing tokens (`data-ui-placeholder`), above the table when a rule is on. `PROVISIONAL` stays the
  only `verification` value. `photoBackedEntries` keeps its meaning and is not reinterpreted.
- `src/lib/sightings*`, `src/lib/remote-sightings*`: optionally carry a receipt reference with a sighting (nullable, additive,
  `isSighting` still does not require it), so a stored receipt survives a later sign-in.
- `src/lib/import-local-progress*`: implement D5 as in design 14.5: offered only while the server says the window is open and no
  `legacy_imports` marker exists; a failed import does not spend it; no client timestamp decides grandfathering. Additive, one
  time per account. No standing self-reported import route may exist after the window.
- `src/lib/observation-qualification*` (**built**, this PR): the pure shadow classifier. Wiring it into the scan flow is
  `discoveries-shadow-wiring.md` (Scan lane).
- Tests: board mirrors the SQL when the SQL changes; no string says "verified" for a receipt; no accusation words.

**Requests this lane makes of others (not edited here):**
- **Copy queue (UI, human-directed; this lane writes no player-facing prose):** (1) the D4 explanation, that signed-out use keeps
  educational identification and private local progress and that competitive, server-backed discoveries need an account; (2) D6, that
  once enforced a camera scan is the only way to earn a NEW card and that browsing and learning need no camera; (3) D3, that a scan
  is not proof the plant was found outdoors and that photographs of screens cannot be reliably detected; (4) the D5 import dialog,
  one time and closing; (5) "scan-recorded" and "self-reported" labels, never "verified" (D7).
- **Owner (Tier 0):** `/privacy` must name the stored scan receipt, its purpose and retention (design D7), and `legal.test.ts`
  must be extended by the coordinator in step. Final player-facing strings for 9.3.
- **UI (human-directed):** the Collect / Lookup entry points and any capture screen; permission-denied and no-camera states;
  design for the uncertain/relatedOnly/no-match explanation. Accessibility requirements are design section 9.
- **Scan:** `ScanPanel` / `ScanOutcome` wording hooks (see `discoveries-receipt-issue.md`).

## Who else depends on it
Coordinator: `leaderboard-schema.test.ts` hand mirror, `analytics` goals. UI and Scan: the entry points.

## Risk and rollback
All client-side, flag-off by default, no stored value changes. Rollback: leave the flag off.

## Does this need the owner? (coordinator fills in)
Yes for the wording and the privacy disclosure (Tier 0, safety/trust-sensitive). UI owns the look.
