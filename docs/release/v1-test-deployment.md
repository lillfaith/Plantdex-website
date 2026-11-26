# V1 TEST deployment: capture enforcement (0016) and the receipt-issuing edge function

**TEST project only (`vgjehmwcpavflbfhbbrp`). Production is not authorised by anything in this document.**
Nothing here enables enforcement for real players: the database switch ships OFF, and the app flags
(`NEXT_PUBLIC_CAMERA_CAPTURE`, `NEXT_PUBLIC_SCAN_CONSENT`, `NEXT_PUBLIC_CONFIRM_SCAN_RPC`) ship `'off'`.

## What changed to make this possible

- `0016_discovery_capture_enforcement.sql` now lives in `supabase/migrations/`, so the existing
  `run-migration.yml` can apply it by name.
- **0016 needs neither 0014 (`confirm_scan`) nor 0015 (expansion ids).** It depends only on 0001-0013
  (`is_catalogue_herb`, `discoveries`, `learned`, `mastered`). Proven locally on PostgreSQL 16 with a
  database that has neither: `NO_0014=1 bash docs/discoveries/sql/run-local.sh` passes 92 checks
  (94 with 0014 present; the two extra check `confirm_scan` ignores a forged receipt).
  The filename gap (0014, 0015 absent from the directory) does not matter to the workflow, which
  applies one named file.
- The receipt rules are one module: `src/lib/observation-capture-receipt.ts` is synced into
  `supabase/functions/_shared/herbdex/` and imported by `identify-plant` (the local copy is gone).
- Account export and deletion include `capture_receipts` and `discovery_grandfathered`.
  `capture_sessions` and `capture_image_digests` are not client-readable and go through
  `ON DELETE CASCADE`. Both paths tolerate the tables not existing, so a project without 0016
  (production today) still exports and deletes normally.
- Trigger functions `discoveries_capture_gate` and `progress_requires_discovery` are now explicitly
  revoked from every role; `v1-security-audit.test.ts` lists the only authenticated-callable functions
  (`open_capture_session`, `claim_discovery`, `discovery_rules`, plus the existing leaderboard one).

## Exact TEST-only actions (owner)

1. Merge the PR that carries this document (after review). Nothing deploys on merge to `integration`.
2. **Apply the migration to TEST.** Actions -> "Run a Supabase migration" -> Run workflow:
   `project_ref = vgjehmwcpavflbfhbbrp` (the default), `migration = 0016_discovery_capture_enforcement.sql`.
   Idempotent; the switch stays OFF.
3. **Verify it on TEST.** Paste `docs/discoveries/sql/0016_verify.sql` into the TEST SQL editor and run it.
   It rolls itself back and prints `ALL 0016 CHECKS PASSED (rolling back)`. Expect 92 checks if
   `confirm_scan` is absent, 94 if present.
4. **Deploy the edge function to TEST.** Actions -> "Deploy a Supabase function":
   `project_ref = vgjehmwcpavflbfhbbrp`, `function = identify-plant`. Also deploy `delete-account`
   (changed to include the two new tables). `npm run sync:edge-shared` output is already committed.
5. **Account export/deletion check on TEST.** Sign in as a throwaway TEST user, download the data file
   (it must contain `captureReceipts` and `grandfatheredDiscoveries`), then delete that account.
6. **Do not** run `set_discovery_enforcement(true, ...)` yet. The shadow run below does not need it.
   Turning it on is a separate owner decision after the demonstration.

Rollback (TEST): `docs/discoveries/sql/0016_rollback.sql` drops triggers and functions only; it never
deletes player rows.

## What is real, what is mocked, what is disabled (as of this PR)

| Step | Status |
|---|---|
| Open capture session, consume, receipts (SQL) | **Real on local PostgreSQL 16** (94 + 92 checks, 14 end-to-end tests with the real handler against it). **Not yet run against TEST Supabase.** |
| Edge `identify-plant` issuing receipts | **Real code, type-checked (`deno check`)**; provider calls are **mocked** in the local suite. Not deployed to TEST until step 4. |
| Direct-API bypass, replay, expiry, grandfathering, RLS | **Real on local PostgreSQL** (as an authenticated role and as anon); not yet attacked over PostgREST on TEST. |
| In-app camera screen, consent notice, one-photo floor | **Scan lane S7 in progress.** Flags off. |
| Claim receipt, Reveal, XP, Georgia Quest, Garden, Saved Progress | Existing app code, signed-out/local verified by QA; **signed-in against TEST is the next milestone and has not been run.** |
| Enforcement itself (the database switch) | **Disabled.** Default OFF on every project. |

## Known limits (state them wherever this is demonstrated)

- 0016 stops casual direct-API insertion of cards. It does not stop a determined person feeding arbitrary
  images through the capture path. A receipt records "went through the app's capture flow", not that
  anybody was outdoors.
- A card whose only match is `legacyGenus` (today: Goldenrod, `pendingCuration`) earns no receipt, by the
  contract's five-value rule, so with enforcement ON it could not be newly unlocked by capture until the
  Goldenrod `acceptedGroup` curation is done. Existing Goldenrod discoveries are grandfathered. This needs an
  owner decision before enforcement is switched on.
- Consume-before-provider: 0016 now has `release_capture_session` (service role only; refuses once any receipt
  exists), and the edge port exposes `release`. The one-line hook in `identify-plant/index.ts` on the provider-failure
  path is lane-owned and requested in `agents/requests/coord-release-capture-session-on-provider-failure.md`.
  Until it lands, a provider failure leaves the player's retry as a replay with no receipts and they must re-shoot.
