# S6: `identify-plant` issues capture receipts (the edge half)

Branch `agent/scan/s6-edge-receipts`. Lane: scan. **Nothing is enabled, nothing is deployed, production is not authorised.**
Contract: `docs/discoveries/discovery-receipt-contract.md` sections 3.2 and 3.3. Migration: `docs/discoveries/sql/0016_*` (draft, TEST only, switch OFF).

Before this change `identify-plant` ignored `purpose`, `capture_session_id` and `capture_nonce`, so no receipt could ever be issued and switching
enforcement ON would have blocked all collecting. Now a `collect` request through an open session earns a receipt per eligible candidate; every
other request is served by the code it was served by before.

Wording: a receipt means **"captured in the app"**. It does not prove the plant was outdoors, alive, present or photographed by this person,
and nothing here says it does.

## WORKING (executed, with evidence below)

| Behaviour | Where it is proved |
|---|---|
| `purpose`, `capture_session_id`, `capture_nonce` accepted; SHA-256 of each image part (bytes only, no decode, no EXIF) | `scan-capture-edge.test.ts`, local PG run |
| `consume_capture_session` runs **before** the provider call; `issue_capture_receipts(receiptItems)` **after** the unchanged provider call and matcher | order asserted in `scan-capture-edge.test.ts` |
| Eligibility comes only from the **server's own** `matchScientificName` (five allowed bases, never `legacyGenus`); `top` for the leading answer, `listed` otherwise | unit + parity test against `receiptItemsFor` + local PG (`Plantago major` listed; `Solidago altissima` none) |
| `captureReceipt` on each eligible candidate, `capture{accepted, code}`; `expiresAt` is the stored `expires_at` | local PG happy path |
| A capture failure **never** fails the identification (every refusal, a missing function, a throw, an issue failure) | unit + handler + local PG |
| **A request with no purpose, `lookup`, or stray session fields is unchanged**: same keys, no `capture`, no capture RPC, no hashing | handler test; also checked once byte-for-byte against `origin/integration`'s `index.ts` (success and provider-failure bodies, signed in and anonymous) |
| Replay (same session, same ordered bytes): no provider call, receipts returned, no candidates | handler + local PG |
| Replay, expired, wrong nonce, foreign session, duplicate image, duplicate within a request, too fast, import-only, anonymous, forged and foreign receipt | local PG (18 cases) |
| Direct-API bypass still closed with the function present: a client cannot call `consume_capture_session`, `issue_capture_receipts` or `set_discovery_enforcement`, cannot write or edit receipts/sessions/digests, and cannot read others' receipts | local PG |
| With enforcement ON (local database only) the capture path is the thing that unlocks a card; a direct insert is refused | local PG happy path |
| `deno check` of all six edge entrypoints | `npm run check:edge` |
| Service role is used only through the one `admin` client already in `index.ts`; `capture.ts` has no imports, no env and no credential | source-rule tests |

## MOCKED (in the tests only, and labelled so)

- **The Supabase client.** Under vitest the handler gets a fake `createClient`; in the local PG run its service-role calls are forwarded to a real
  PostgreSQL 16 as `service_role` through `psql`. It is not PostgREST, so HTTP status mapping of Postgres errors is not exercised.
- **The provider.** A canned PlantNet body. No provider credit is spent anywhere in the repository suite.
- **The scan quota.** `claim_scan_pair` is stubbed to "granted" in the local run so the 10-a-day limit cannot interfere.
- **The 2 s minimum.** Local sessions are back-dated 5 s so the suite does not sleep; the too-fast case is run un-back-dated.
- **JWT verification.** A bearer of `A`..`I` is that user.

## DISABLED / NOT DONE

- Not deployed anywhere. 0016 is not applied to any Supabase project. The enforcement switch is **OFF** everywhere; the local run turns it ON only inside a throw-away database.
- No flag or workflow is touched. `NEXT_PUBLIC_CAMERA_CAPTURE` and `NEXT_PUBLIC_SCAN_CONSENT` stay as they were.
- **The live suite (`e2e/capture-receipts.e2e.test.ts`) is not in `e2e/`** (coordinator-owned): it is attached as `agents/requests/scan-s6-capture-receipts.e2e.test.ts.txt`. It has never been run against any project.
- Two server gaps need a migration or a contract decision (`agents/requests/scan-s6-quota-refund-and-burned-session.md`):
  a **replay still spends one daily scan unit** (no refund function exists), and a **provider failure after the session is consumed burns the session and its photographs**
  (the response says `capture_unavailable`; the player must open a new session and take new photographs).
- The receipt rule is duplicated in `capture.ts` (pinned equal to `src/lib/observation-capture-receipt.ts` by a test) because `sync-edge-shared` is coordinator-owned
  (`agents/requests/scan-s6-sync-receipt-mirror.md`).

## What the owner must deploy to TEST (in this order)

Nothing here touches production, and none of it turns enforcement on.

1. **Merge this PR into `integration`** (coordinator), then have 0016 placed where `run-migration` can apply it. 0016 currently lives in `docs/discoveries/sql/` and depends on 0014 (`confirm_scan`).
2. **Apply 0016 to the TEST project** with the existing `run-migration` workflow (TEST ref `vgjehmwcpavflbfhbbrp`). The switch stays OFF; existing players are grandfathered; nothing changes for any flow.
3. **Deploy the edge function to TEST** with the existing `deploy-function` workflow: function `identify-plant`, project TEST. It bundles `capture.ts` with `index.ts`; no new secret is needed
   (the provider key and `SPECIES_ATTESTATION_SECRET` are unchanged). Until step 2 is done a `collect` request simply answers `capture_unavailable` and identifies normally.
4. **Only then**, and only if the owner wants the live proof: add the live workflow and the e2e file (the two SCRs) and dispatch it. It reads the public TEST anon key from `vars.TEST_SUPABASE_ANON_KEY` and no secret.

## Exact verification steps

```bash
# 1. repository gate (lint, typecheck, deno check of all edge entrypoints, tests, build)
npm ci && npm run verify

# 2. the edge logic and the real handler (included in npm test)
npx vitest run src/lib/scan-capture-edge.test.ts

# 3. the real handler + the real 0016 on a throw-away local PostgreSQL 16 (never Supabase)
#    needs: a local postgres you may create a database in (as root it uses `su postgres`), and git access to
#    origin/coord/confirm-scan-rpc if 0014 is not yet in supabase/migrations/
docs/scan-s6/run-local-e2e.sh
#    expect: "Tests 18 passed (18)"

# 4. the 0016 SQL suite itself (90 checks) is unchanged and still passes
docs/discoveries/sql/run-local.sh

# 5. AFTER steps 2-3 of the deploy list, optional, owner-dispatched: the live suite against TEST
#    (workflow from the SCR) -> e2e/capture-receipts.e2e.test.ts
```

What a person should see on TEST once deployed: opening the camera screen yields a session; a scan of a card species through it returns `capture.accepted: true` and a
`captureReceipt` on that candidate; `claim_discovery` on the confirm tap writes the discovery; the same request sent twice returns `capture.replay: true` with no candidates;
a library photo (`purpose=lookup` or none) returns the identification with no `capture` field at all.
