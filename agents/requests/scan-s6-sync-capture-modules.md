# Shared Change Request: mirror the receipt modules into `_shared` (retire the local copy in identify-plant)

- From lane: scan      Task: agents/ledger/scan/s6-edge-receipts.md
- Needs: other (`scripts/sync-edge-shared.mjs` is coordinator-owned)

## Why
Contract 3.2 step 4 says the edge function issues receipts with `receiptItemsFor(...)` from
`src/lib/observation-capture-receipt.ts`. That module is not in `PURE_MODULES`, so it cannot be imported from Deno.
Until it is, `supabase/functions/identify-plant/capture.ts` carries a local copy of `receiptItemsFor` and the five-value
eligibility list, and `src/lib/scan-edge-receipts.test.ts` runs the copy and the real function over every catalogue name
and fails on any difference. That keeps it honest but it is still a copy.

## Exact proposal
In `scripts/sync-edge-shared.mjs`, add to `PURE_MODULES`:
`'observation-qualification.ts'` (imports only `plant-match`, already synced; exports `QUALIFYING_ELIGIBILITIES`, `RankPosition`)
and `'observation-capture-receipt.ts'` (imports `plant-match` and `observation-qualification`), then run
`npm run sync:edge-shared`. Both are pure (no clock, no randomness, no reducer/progression import), which is what
`observation-capture-receipt.test.ts` already pins. Then, in a follow-up scan-lane change, `capture.ts` imports
`receiptItemsFor` and `isReceiptEligibility` from `../_shared/herbdex/observation-capture-receipt.ts` and the local copy
and its equivalence test are deleted. Note the real module has no `Deno` incompatibility: the sync script already rewrites
the relative imports to carry `.ts`.

## Who else depends on it
`edge-shared.test.ts` (walks the graph; the new modules must be reachable from an entrypoint or it fails on an unused copy,
so land this together with the follow-up import). Redeploy of `identify-plant` only; no other function imports them.

## Risk and rollback
Revert the two list entries and the regenerated files. Behaviour does not change: the copy and the original are test-equal.

## Does this need the owner? (coordinator fills in)
No expected: pure modules, no schema, no production change.
