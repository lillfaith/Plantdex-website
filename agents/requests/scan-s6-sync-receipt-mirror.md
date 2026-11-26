# Shared Change Request: share the receipt rule between client and edge (optional; coordinator files)

- From lane: scan      Task: agents/ledger/scan/s6-edge-receipts.md
- Needs: other (`scripts/sync-edge-shared.mjs`, `src/lib/edge-shared.test.ts`)

## Why
`receiptItemsFor` lives in `src/lib/observation-capture-receipt.ts` (coordinator-owned, with `observation-qualification.ts`). The edge function needs the same rule, but `sync-edge-shared` does not
copy those two modules, and this lane may not edit it. So `supabase/functions/identify-plant/capture.ts` carries its own small `receiptItems`, and
`src/lib/scan-capture-edge.test.ts` fails if its output ever differs from `receiptItemsFor` over a spread of real matcher outputs (exact, synonym, genus, legacyGenus, related, none, hybrid, section).

## Exact proposal (optional)
Add `observation-qualification.ts` and `observation-capture-receipt.ts` to `PURE_MODULES` (both import only `plant-match`, itself synced) and let `capture.ts` import `receiptItemsFor` from `_shared`.
Then delete `receiptItems` and the parity test. `edge-shared.test.ts` walks `identify-plant/index.ts`, so it would pick up the new edge automatically. Nothing needs to ship for S6 to work.

## Who else depends on it
`herbdex-action` is unaffected. Only `identify-plant` would import them.

## Risk and rollback
Pure modules; revert the two lines.

## Does this need the owner? (coordinator fills in)
