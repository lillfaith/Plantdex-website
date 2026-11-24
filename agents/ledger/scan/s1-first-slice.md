# Task: s1-first-slice — confirmScan can no longer lose a scan row

- Lane / role: scan
- Branch: `agent/scan/s1-first-slice` (from `integration`)
- Priority: A
- Status: `review`

## Choice and why
`confirmScan` (src/lib/scans.ts) replaces the history row with DELETE then INSERT, because `scans` has no
update policy. It ignored the delete's error and, if the insert failed (dropped connection, RLS), returned
false having already deleted the row: the player's identification disappeared from their account. Evidence is
in the code itself; the fix is local, needs no schema, flag, XP or UI change. The doc-listed open items
(deploying the function, the 450 global-quota accounting defect) need owner action or a migration, so are out of lane.

## Change
- Delete error: return false, do not insert.
- Insert error: re-insert the row that was read, then return false.
- New test `src/lib/scans-confirm.test.ts` (success, insert failure restores row, delete failure inserts nothing).

## Authorised paths
`src/lib/scans*` (scan). No shared pure module changed, so no sync:edge-shared.

## Prohibited / untouched
XP, reducer, types, schema, migrations, packages, workflows, prepareImage (no original-bytes path added).

## Verify output
See below.

`npm run verify`: **exit 0** (lint, typecheck, check:edge, test, build).
```
 Test Files  132 passed (132)
      Tests  2080 passed | 1 skipped (2081)
```
agent-guard diff --role scan: "changed only files it may change."

## Review round 1 (reviewer: acceptable temporary mitigation, changes required) — status `review`
Changes in `src/lib/scans.ts` (mitigation only; the proper fix is the atomic server-side `confirm_scan`
function, coordinator-owned, because `scans` has no update policy by design):
- Restore result is checked: on failure `console.error("confirmScan: restore failed for scan <id>")` (id only), return false, no retry loop.
- Delete is conditional (`.is('confirmed_herb_id', null)` + `.select('id')`); nothing removed => return false, no insert.
- Select error is logged and returns false (no longer read as "no row").
- Row already confirmed: same card => true, different card => false, nothing written.
- Caller (ScanPanel `void confirmScan`) untouched; no user-facing message built. If one is wanted (history may be incomplete) it is a UI/coordinator request.

Tests (`src/lib/scans-confirm.test.ts`, 8): the 3 originals plus restore-also-fails, select error, already confirmed
(same / different card) and the A-confirms-before-B-deletes race. The table mock now honours `eq`/`is` filters.
Run against origin/integration's `scans.ts` (temporarily swapped, then restored): 1 passed (success),
7 failed (insert-failure restore, delete failure, restore-also-fails, select error, same-card, different-card, race).
Caveat: the first two of those fail on the original partly because the stricter mock models the filtered delete
(`.is`/`.select`) the original never calls; the other five exercise genuinely new behaviour. The success test
passes on both, as the reviewer said, and proves nothing alone.
Not done (out of lane): migration/RPC, supabase/**.

### STATUS: BLOCKED (one red test outside the scan lane)
`npm run verify`: 1 failed | 2084 passed. The failure is `src/lib/observation-persistence.test.ts:220`
(discoveries lane): its Supabase fake has no `.is`/`.select` on `delete()`, which the reviewer-required
conditional delete needs. Not editable by this lane; request filed at
`agents/requests/scan-s1-observation-persistence-fake.md`. All scans-confirm tests (8) pass; agent-guard clean.
Stopped here rather than weaken the guard to suit the fake.
