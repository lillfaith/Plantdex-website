# Shared Change Request: herbdex-action accepts scan receipts, and the shadow report - DRAFT, NOT APPLIED

- From lane: discoveries      Task: agents/ledger/discoveries/trust-design.md
- Needs: contract (edge function) | migration (a report function)
- **To: coordinator.** Stage 2 (c) and Stage 3. Depends on `discoveries-receipt-contract.md`. **Inert unless the flag is on; defaults OFF. Revised 2026-11-24 (D0-D7). Records and counts only; it must not gate any `discoveries` write (Stage 4 is not authorised).**

## Why
`herbdex-action` is the existing server-side progression authority: it reads rows under the caller's own session and writes
derived rows with the service role. Validating a receipt there reuses that authority and creates no second reward system.

## Exact proposal
1. **`supabase/functions/herbdex-action/index.ts`**: accept an optional `scanReceipts: string[]` (bounded, like
   `MAX_DAILY_TASK_IDS`) in the request body. Only if `discovery_rules.receipts_accept` is true: verify each with the
   shared `verifyScanReceipt` under the caller's id (read from `auth.getUser()`, never from the body), and insert accepted
   rows into `scan_receipts` with the service role and `ignoreDuplicates`. Failures return a reason code per receipt and
   **never fail the reconcile**: mastery and research derivation is unchanged and runs exactly as today.
2. **No change to** `reconcileMastery`, `reconcileResearch`, XP or the response fields already returned. Add one optional
   response field (`receipts: {accepted: n, rejected: [{reason}]}`) so the client can show the 9.3 wording.
3. **Shadow report (Stage 3)**: a service-role-only SQL function or saved query `discovery_shadow_report(p_cutover timestamptz)`
   returning **counts and distributions only, no user ids or names**: discoveries after the stamp with and without a receipt
   (needs `discoveries.recorded_at`, see `discoveries-write-gate.md` for the stamp, which may be split out and shipped first),
   reason histogram, issue-to-claim lag, and "would-be" standings deltas. Not reachable by `authenticated` or `anon`.
4. **Counters (D7):** when `shadow_report` is on, increment `discovery_shadow_daily` by `(day, reason, match_class)` using the same
   enums as `classifyQualification` (client verdicts are never trusted; the server recomputes `reason` from its own rows).
   Aggregate only: no user id, card or taxon is written. A failed increment is swallowed.
5. **Legacy import marker (D5):** a service-role path writing `legacy_imports` once per account, refusing when
   `legacy_import_open` is false, when a marker exists, or when `cutover_at` has passed. It never writes a receipt.
6. `npm run check:edge` must pass (Deno). Validate with `e2e/supabase.e2e.test.ts` additions on the TEST project only.

## Who else depends on it
Scan lane's client (`scans.ts`) sends the token it was handed. Discoveries lane reads only the response field for copy. Tests:
a live case per scenario in design section 10 (replay, other user, edited, expired, duplicate, secret unset).

## Risk and rollback
Risk: a bug here could break reconciliation for everyone, which is why the receipt work runs in its own try block and its
failure is swallowed into a reason code. Rollback: flags off (the branches are skipped); redeploy previous function. Rows written stay inert.

## Does this need the owner? (coordinator fills in)
Deploying an edge function is coordinator work to the TEST project; production deploys are owner-approved. The shadow
report reads real accounts in aggregate: D7 already permits minimal aggregate diagnostics during shadow testing; the owner still approves enabling `shadow_report` on any real project.
