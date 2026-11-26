# Scan S6: the edge half of the capture receipt contract

Branch `agent/scan/s6-edge-receipts`. Contract: `docs/discoveries/discovery-receipt-contract.md` (3.2, 3.3). Database:
`docs/discoveries/sql/0016_discovery_capture_enforcement.sql` (a draft, TEST only, switch OFF). Client: S5
(`scan-capture-session.ts`, `scan-receipt.ts`, `scans.ts`).

**Nothing here is switched on.** No flag, no enforcement switch, no deploy, no workflow, no credential. Production is not
authorised. A receipt means the account **captured in the app**; it does not prove where the plant was, and nothing in this
change says it does.

## What changed

`supabase/functions/identify-plant/`: `capture.ts` (new) and `index.ts` (wiring). In order, only for a signed-in request with
`purpose=collect`:

1. read `purpose`, `capture_session_id`, `capture_nonce`; SHA-256 each image part (bytes only, nothing decoded);
2. **replay check, before the quota claim**: an identical re-send of an already-consumed session returns its receipts
   (`capture.replay`, no candidates) and spends no quota and no provider call;
3. quota claim (`claim_scan_pair`, unchanged);
4. `consume_capture_session` (service role) against a pre-minted observation id;
5. the provider call and the matcher, unchanged;
6. `issue_capture_receipts` for each candidate this server's own match calls `confirmable` with an allowed basis;
7. response gains `capture {accepted, code?, replay?}` and `captureReceipt` on eligible candidates.

A capture failure of any kind (not signed in, unknown/foreign session, wrong nonce, expired, used, too fast, duplicate image,
database missing or erroring) becomes `capture.code` and the identification is served as an education lookup. A request with no
`purpose` (or `purpose=lookup`) skips all of it and is byte-identical to before.

## WORKING (verified)

| Claim | Evidence |
|---|---|
| No-purpose and lookup requests are byte-identical to the pre-capture handler | `scan-edge-handler.test.ts`: golden strings captured from the old handler through the same harness (anonymous, signed in, lookup + session fields, session fields without purpose, nothing found, provider down) |
| Digests are SHA-256 of each part, in order; the receipt names the card from the **server's** match, never a client field | same file; `scan-edge-receipts.test.ts` |
| Every capture failure still serves the identification | handler tests for each code, a throwing/absent database, a throwing issue |
| Local copy of `receiptItemsFor` equals `src/lib/observation-capture-receipt.ts` on all 54 catalogue names plus awkward ones, at both rank positions and every confidence band | `scan-edge-receipts.test.ts` |
| No EXIF/GPS/device read; no credential in `capture.ts`; capture RPCs only through the service-role port | source guards in `scan-edge-receipts.test.ts` |
| Real SQL, real roles: open -> identify -> receipt -> `claim_discovery` -> discovery row; replay (no provider, no quota); foreign receipt and foreign session; expired; wrong nonce (session not spent); lookup/import-only; duplicate image across requests and accounts; too fast; reused session; anonymous; no card species | `docs/scan-s6/run-local.sh` (PostgreSQL 16, 0001..0014 + 0016): 14 tests |
| Bypass with the function present: a client cannot call `consume_capture_session` / `issue_capture_receipts`, cannot insert/update/delete receipts, sessions or digests, reads only its own receipts, cannot set the switch | same run. Mutation-checked: granting `consume_capture_session` to `authenticated` makes it fail |
| `deno check` of all six functions | `npm run check:edge` |

## MOCKED

- The identifier (PlantNet) is scripted in the local and handler tests; no credit is spent and no provider key is read.
- supabase-js to PostgREST is replaced by `psql` in the local run. The SQL, grants and roles are real; the HTTP hop is not.
- `receiptItemsFor` in the function is a local **copy** (see `agents/requests/scan-s6-sync-capture-modules.md`), held equal to the original by test.

## DISABLED / NOT DONE

- Enforcement switch: OFF everywhere; the local suite asserts it is `false` before and after and never calls the setter.
- Not deployed anywhere. Not run against any Supabase project. The live suite exists but has **never been run**.
- `e2e/capture-receipts.e2e.test.ts` and its workflow are not in the repo: `e2e/**` and `.github/**` are the coordinator's
  (`agents/requests/scan-s6-capture-receipts-e2e.md`, file attached as `scan-s6-capture-receipts.e2e.test.ts.txt`).
- Known limitation: the session is consumed before the provider call (contract order). A provider failure afterwards strands the
  retry as a zero-receipt replay, served as an ordinary identification with `capture_session_used`; the player must take new photographs
  (`agents/requests/scan-s6-consume-before-provider.md`).
- A replay returns receipts and **no candidates**, as the contract says; S5 renders that as an empty answer today. Presenting it
  (list or claim from `capture.receipts`) is a client change.
- Perceptual-hash duplicate detection, platform attestation: out of scope (contract 7).

## What the owner must do to try it on TEST (in this order; each is the owner's or the coordinator's to run)

1. Coordinator lands the SCRs it accepts; merge this PR into `integration`.
2. Apply migration 0016 to the TEST project through the existing `run-migration` workflow. Then `0016_verify.sql` on TEST.
3. Deploy `identify-plant` to **TEST** through the existing `deploy-function` workflow. Needs no new secret. `PLANTNET_API_KEY` (or the
   selected provider's key) must already be set there.
4. Copy the attached e2e into `e2e/`, add its dispatch job (SCR), dispatch it against TEST. Without the optional photographs it
   runs the refusal and bypass cases; with `E2E_CAPTURE_PHOTO_A/B` (two JPEGs of one deck species) it also runs the receipt, claim and replay case.
5. Only after the owner has reviewed the design is the enforcement switch even considered; nothing in this task does it.

## Exact verification steps

```bash
npm ci
npx vitest run src/lib/scan-edge-handler.test.ts src/lib/scan-edge-receipts.test.ts   # 54 tests, no database
npm run check:edge                                                                      # deno check, all functions
bash docs/scan-s6/run-local.sh                                                          # needs local PostgreSQL 16; 14 tests
npm run verify                                                                          # lint, typecheck, check:edge, test, build
```

`run-local.sh` builds a throw-away database `s6test` (override with `S6_LOCAL_DB`), applies the repo migrations and 0016, and runs
`src/lib/scan-edge-receipts.local.test.ts` against it. It is skipped by `npm test` (no `S6_LOCAL_DB`). If `supabase/migrations/0014_confirm_scan.sql`
is not on the branch it reads it from `origin/coord/confirm-scan-rpc`, as the discoveries harness does.
