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
