# Shared Change Request: live TEST suite for capture receipts + the workflow to run it (e2e/** and .github/** are coordinator-owned)

- From lane: scan      Task: agents/ledger/scan/s6-edge-receipts.md
- Needs: other (new file under `e2e/`; a workflow change)

## Why
The task asks for `e2e/capture-receipts.e2e.test.ts`, TEST only, run by the owner. `e2e/**` and `.github/**` are not the scan
lane's, so the file is attached unchanged (the `scan-s3-scans-confirm.e2e.test.ts.txt` precedent) and no workflow is touched.

## Exact proposal
1. Copy `agents/requests/scan-s6-capture-receipts.e2e.test.ts.txt` to `e2e/capture-receipts.e2e.test.ts` (drop `.txt`). Nothing else.
   Checked from `e2e/` on this branch: `tsc --noEmit` clean; `vitest.e2e.config.ts` reports the file skipped with no credentials
   (10 tests); with the PRODUCTION url set, `e2e/guard.setup.ts` refuses it.
2. Workflow (the owner dispatches it): a `workflow_dispatch` job like the existing live-confirm one, TEST secrets only, that runs
   `vitest --config vitest.e2e.config.ts e2e/capture-receipts.e2e.test.ts`. Optional inputs: two photographs of ONE deck species
   (paths via `E2E_CAPTURE_PHOTO_A` / `E2E_CAPTURE_PHOTO_B`, e.g. checked out of an artifact) so the receipt cases run; without them the
   refusal and bypass cases still run (they send a 1x1 JPEG, which costs one provider call each on the shared TEST key).
3. Order on TEST, by the owner: run-migration 0016, then deploy-function identify-plant, then this suite. The suite fails loudly if 0016 is
   absent and refuses if enforcement is found ON.

## Who else depends on it
Nobody. Writes disposable accounts' own sessions, receipts and (receipt cases only) one discovery row on TEST. Costs provider credits
(quota: 10 per account per day; the suite makes about 12 calls across two accounts).

## Risk and rollback
Delete the file and the job. Accounts are stamped `plantdex-e2e-capture-*` and can be removed by the existing test-account cleanup.

## Does this need the owner? (coordinator fills in)
Dispatching it is the owner's. Production is not touched.
