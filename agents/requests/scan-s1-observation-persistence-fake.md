# Shared Change Request: update the Supabase fake in observation-persistence.test.ts

- From lane: scan      Task: agents/ledger/scan/s1-first-slice.md
- Needs: other (test fixture owned by the discoveries lane)

## Why
Review of PR #41 required `confirmScan` to delete conditionally (`.is('confirmed_herb_id', null)`) and to
learn whether a row was really removed (`.select('id')`). The `fakeSupabase` in
`src/lib/observation-persistence.test.ts` (discoveries lane) models `delete()` as a thenable with only
`eq`, so test "writes the chosen candidate onto the scan row without touching the top one" (line ~220) now
fails: `confirmScan` returns false. That is the only red test in `npm run verify`.

## Exact proposal
In `fakeSupabase`, make the delete chain support the new calls, e.g.
`delete: () => ({ eq: () => thenableDelete })` where the terminal supports `.eq`, `.is` and
`.select()` and resolves `{ data: [{ id: 'scan_1' }], error: null }`
(`thenable` gains `is: () => thenable(value)` and `select: () => Promise.resolve({ data: [{ id: 'scan_1' }], error: null })`
for the delete case). No assertion changes.

## Who else depends on it
Only that test file. No server mirror.

## Risk and rollback
Test-only. Revert the fixture edit.

## Does this need the owner? (coordinator fills in)
No expected (test fixture only).
