# Shared Change Request: identify-plant issues scan receipts - DRAFT, NOT APPLIED

- From lane: discoveries      Task: agents/ledger/discoveries/trust-design.md
- Needs: contract (edge function and client carry)
- **To: scan lane** (`supabase/functions/identify-plant/**`, `src/lib/scans*`, `src/components/scan/**`). Stage 2 (b). Depends on `discoveries-receipt-contract.md`. **Off by default; with no flag and no `purpose` the response is byte-identical.**

## Why
Only `identify-plant` has seen the provider's answer for a request, so only it can honestly sign "this account's Collect
scan named this taxon for this card". It already signs species attestations (`species-attestation.ts`) and mints a random
`observationId`; this is the same pattern applied to a find.

## Exact proposal
1. **Request field** `purpose?: 'collect' | 'lookup'`, validated and defaulting to `lookup`. Existing clients send nothing.
2. **When `SCAN_RECEIPTS_ISSUE` is on, the caller is authenticated (E1), `purpose === 'collect'`, the call succeeded and was
   not `notAPlant`/`providerFoundNothing` (E3)**: for each candidate whose server-side match is `confirmable` with an
   eligibility in the owner-approved set (design D2, default: not `legacyGenus`, never `ambiguous`/`sameGenus`), add a
   `receipt` string beside the existing `attestation`. Matching is re-derived server-side; nothing from the client is trusted.
3. **Never** issue to an anonymous caller, to a `lookup`, or when `SCAN_RECEIPT_SECRET` is unset. Unset must **not** reject
   the scan (unlike the mint attestation): identification returns as today.
4. **Receipt body** exactly as in the contract SCR. Records `rank_position` (`top`/`listed`), `eligibility`, a confidence
   band (never the raw score). It follows the candidate, not the card alone.
5. **Client** (`scans.ts`): send `purpose`, hold the opaque `receipt` of the **chosen** candidate beside the pending confirm,
   pass it to the claim call. No UI change in Stage 2. Collect and Lookup become two labelled entry points only when the
   owner authorises the UI (design section 9; UI-owned for any new look).
6. **Quota unchanged:** the receipt rides inside the existing call; `claim_scan` accounting and the 450/10/5 limits are untouched.
7. **`image-prepare*`, the 2-3 photograph rule and the `IDENTIFY_PROFILE` are not changed.** No rule depends on the photograph count.
8. Tests: with the flag off the JSON equals today's for a fixed input; `edge-shared.test.ts`; `npm run check:edge`.

## Who else depends on it
`herbdex-action` (claim), the board label. Mirrored modules follow `agents/ownership.json`'s scan mirror list.

## Risk and rollback
A receipt bug must never turn into an identification failure (design P16): signing is wrapped so a failure omits the
`receipt` field and returns the identification. Rollback: flag off, or redeploy the previous function.

## Does this need the owner? (coordinator fills in)
Deploy is the coordinator's, TEST project only. The meaning of "eligible" (D1, D2) is the owner's.
