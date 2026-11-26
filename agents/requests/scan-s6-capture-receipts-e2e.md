# Shared Change Request: live TEST suite for capture receipts (`e2e/**` is coordinator-owned)

- From lane: scan      Task: agents/ledger/scan/s6-edge-receipts.md
- Needs: other (new file under `e2e/`)

## Why
The task asks for `e2e/capture-receipts.e2e.test.ts`, modelled on `e2e/scans-confirm.e2e.test.ts`. `e2e/**` belongs to the coordinator,
so the file is attached unchanged, as S3 did.

## Exact proposal
Copy `agents/requests/scan-s6-capture-receipts.e2e.test.ts.txt` to `e2e/capture-receipts.e2e.test.ts` (drop `.txt`). Nothing else.
Checked from `e2e/` on this branch with the file in place (then removed): `tsc --noEmit` and eslint clean; `vitest.e2e.config.ts`
reports all 10 cases skipped with no credentials; with the PRODUCTION url set, `e2e/guard.setup.ts` refuses it. Not run against any project.
It holds no service-role key and never flips the enforcement switch. Cases: open session; deployed function answers with a `capture` block
(fails loudly, naming the missing deploy, if it predates S6); receipt owner-readable only; claim once and idempotently; foreign and forged
receipt = `receipt_unknown`; replay returns receipts and no candidates; consumed session refused for other photos; wrong nonce refused
without failing the identification; no purpose = unchanged lookup; anonymous collect; service-only RPCs and direct writes refused to a client.
If the provider names no card species for the fetched photographs the claim steps are skipped with a warning rather than faked.

## Who else depends on it
Nobody. Runs only through the live workflow below, after 0016 and the function are on TEST. Real provider credits: about six per run.

## Risk and rollback
Writes disposable-account rows to TEST. Delete the file to roll back.

## Does this need the owner? (coordinator fills in)
