# Shared Change Request: live TEST cases for `confirm_scan` (e2e/** is coordinator-owned)

- From lane: scan      Task: agents/ledger/scan/s3-confirm-rpc-disabled.md
- Needs: other (new file under `e2e/`)

## Why
The task asks for TEST-only live cases for migration 0014. `e2e/**` belongs to the coordinator, so the file is
attached unchanged instead of added there.

## Exact proposal
Copy `agents/requests/scan-s3-scans-confirm.e2e.test.ts.txt` to `e2e/scans-confirm.e2e.test.ts` (drop `.txt`). Nothing else.
Already checked from `e2e/` on this branch: `tsc --noEmit` and eslint clean; `vitest.e2e.config.ts` reports all 12 cases
skipped with no credentials; with the production URL set, `e2e/guard.setup.ts` refuses it. Not run against any project.
Cases: confirm once (six columns set, id/user/created_at/photo_path/top_*/confidence/outcome unchanged), same card again,
different card, another user's scan, unknown id, null/blank card id, probability 1.5 and -0.1, `Promise.all` of two different cards
(exactly one true, one false, row stays confirmed), anon refused. Fresh Alice and Bob per run, stamped ids, `afterAll` deletes their scans.

## Who else depends on it
Nobody. Runs only through `npm run verify:supabase` on TEST, after 0014 is applied there.

## Risk and rollback
Writes real rows to TEST (own scans of disposable users). Delete the file to roll back.

## Does this need the owner? (coordinator fills in)
