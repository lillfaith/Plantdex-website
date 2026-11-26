# V1 TEST integration: capture enforcement (0016) and the real signed-in camera-to-collection flow

**TEST project only (`vgjehmwcpavflbfhbbrp`). Production is not authorised by anything here.** Merging this document deploys
nothing. Enforcement stays OFF unless the owner flips it on TEST in step 7. Every app flag stays `'off'`.

## What the owner is being asked to do, in order

Each step is TEST-only and is run by the owner (agents never dispatch workflows or hold credentials).

| # | Action | Where | Result to report back |
|---|---|---|---|
| 0 | **Approve merging #43** (migration `0014_confirm_scan.sql`, currently HELD) into `integration`. Merging adds a file; it applies nothing. | GitHub | merged |
| 1 | Apply `0014_confirm_scan.sql` to TEST | Actions > "Run a Supabase migration": `project_ref` = `vgjehmwcpavflbfhbbrp`, `migration` = `0014_confirm_scan.sql` | green run |
| 2 | Apply `0016_discovery_capture_enforcement.sql` to TEST | same workflow, `migration` = `0016_discovery_capture_enforcement.sql` | green run |
| 3 | Run the SQL verification | TEST SQL editor: paste `docs/discoveries/sql/0016_verify.sql` | last line `ALL 0016 CHECKS PASSED (rolling back)`; 109 checks (111 if 0014 is present, which it will be after step 1) |
| 4 | Deploy `identify-plant` and `delete-account` to TEST | Actions > "Deploy a Supabase function": `project_ref` = test, `function` = `identify-plant`, then `delete-account` | two green runs |
| 5 | Run the live flow, enforcement OFF | Actions > "Live camera-to-collection flow (TEST project only)": `herb_id` = `taraxacum-officinale`, `enforcement` = `off` | 12 passed, 1 skipped (the enforcement-ON test) |
| 6 | (Optional, same day) switch enforcement ON in TEST | TEST SQL editor: `select public.set_discovery_enforcement(true, now(), 'ENFORCE NEW DISCOVERIES');` | `{"enforcing": true, "newly_grandfathered": N}` (every existing discovery is grandfathered) |
| 7 | Run the live flow again with `enforcement` = `on` | same workflow | the direct-insert-refused test runs and passes |
| 8 | Switch it back OFF | TEST SQL editor: `select public.set_discovery_enforcement(false, null, 'x');` | `{"enforcing": false, ...}`; nothing is revoked, receipts and grandfather rows stay |
| 9 | Clean up the disposable accounts | TEST SQL editor: see "Cleanup SQL" below | counts |

Prerequisites on TEST: "Confirm email" is OFF (the suite signs up disposable accounts); the repository variable
`TEST_SUPABASE_ANON_KEY` is set; the TEST project has its PlantNet (or plant.id) key set as an Edge Function secret
(already true if `verify-plant-id` has ever passed there). The run spends ONE provider identification.

**The workflow only appears in the Actions tab once its file is on the repository's default branch.** That is the
production branch, which this work must not touch. Three ways to run it, in order of preference:
1. Run it from your own computer with a TEST `.env.local`:
   `E2E_PHOTO=photo.jpg E2E_HERB_ID=taraxacum-officinale npx vitest run --config vitest.e2e.config.ts e2e/capture-flow.e2e.test.ts`
   (build `photo.jpg` with the Pillow one-liner in the workflow's first step). Needs only the TEST URL and the public anon key.
2. Ask for a narrow, temporary `push` trigger on `integration` limited to the workflow file itself, as was done once for
   `live-confirm-scan.yml` (its history is in that file's header). I will not add it unless you ask.
3. Wait for the workflow file to reach the default branch in a normal release.

## Do 0014 and 0016 work together? Does V1 need 0015?

- **Together: yes, proven locally.** `bash docs/discoveries/sql/run-local.sh` applies the stub, 0001-0013, **0014** and then
  **0016** on PostgreSQL 16 with pre-existing player data and passes **111 checks**, including that `confirm_scan` with a forged
  receipt in the name field confirms only a scan and creates no discovery and no receipt. `bash docs/scan-s6/run-local.sh`
  (the real `identify-plant` handler against 0001-0014 + 0016) passes **14 of 14**. Step 3 above repeats the SQL half on TEST.
- **0016 does not need 0014.** `NO_0014=1 bash docs/discoveries/sql/run-local.sh` applies 0016 to a database with no 0014: **109 checks**.
  The only 0014 check is guarded by `to_regprocedure`. So 0014 and 0016 can be applied in either order, and 0016 can go alone.
- **V1 collecting does not need 0015.** 0016's only catalogue dependency is `is_catalogue_herb` (0010/0013, 54 ids); it does not
  reference `is_permitted_herb`, `is_expansion_herb` or any 0015 object, and a receipt for an expansion id is refused by its own
  `capture_receipts_valid_herb` check. 0015 stays TEST-only on its own track.

## What changed in the repository to make this possible (merged)

- 0016 lives in `supabase/migrations/` so the existing `run-migration.yml` applies it by name.
- Receipt rules are one module (`observation-capture-receipt.ts`) synced into `_shared` and imported by `identify-plant`.
- `release_capture_session` and `refund_scan_claim` (below), and account export/deletion for the two new user tables, tolerating
  their absence so a project without 0016 (production) still exports and deletes.
- Trigger functions revoked from every role; the authenticated-callable allow-list in `v1-security-audit.test.ts` updated deliberately.

## Provider failure: what the player is and is not charged, and why it cannot be farmed

0016 adds two service-role-only functions. The call sites in `identify-plant/index.ts` are the scan lane's (S8, in review).

- `release_capture_session(user, session)`: hands a consumed session back so the retry with the same photographs is a first
  use. It refuses (false) once ANY receipt exists for that session, so it can never re-roll an answer already seen.
- `refund_scan_claim(bucket, day, observation_id)`: gives the caller's OWN daily unit back. Enforced in the database, not the caller:
  **idempotent** per request id (a repeat refunds nothing); **capped** at 3 per caller bucket per UTC day; refuses the `global`
  bucket (the upstream-cost backstop, spent whether or not the provider charged for the failure); refuses a day more than one day
  from today and a bucket with no claim that day; never below zero. Checked live under concurrency: 12 simultaneous calls with one
  request id refund exactly once, and 12 distinct ids refund exactly three.
- Only the edge function decides which failures qualify, and only provider-side ones (outage, timeout, 5xx, network). Invalid or
  rejected photographs, malformed requests, quota refusals, "nothing found", replays and successes never refund (S8 tests this).
- A retry cannot create a second discovery or extra XP: the receipt is unique per (observation, card), a claim is idempotent
  (`already_claimed`), and `discoveries` is keyed by (user, card). XP is derived from `discoveries`, so it cannot be paid twice.
- The refund ledger stores a one-way digest of the bucket and a request id, and is pruned after 3 days, so it needs no export or
  deletion entry and holds no user id.

## What is real, mocked and not yet exercised

| Step | Status |
|---|---|
| Open capture session, consume, receipts, claim, direct-API refusals, replay, cross-account, grandfathering, release, refund (SQL) | **Real on local PostgreSQL 16** (111 checks, concurrency tested). **Real on TEST once steps 2-3 are run.** |
| `identify-plant` handler issuing receipts | **Real code against a real database locally (14/14), provider mocked there.** Real provider on TEST in step 5. |
| Camera session -> identify -> receipt -> claim -> persisted collection -> fresh sign-in reads it back | **`e2e/capture-flow.e2e.test.ts`: real project, real function, real provider, real policies.** Not yet run: needs steps 1-5. The camera is replaced by one real species photograph sent down the app's own request path. |
| In-app camera screen and consent notice in a browser | Unit-tested and screenshot-checked at 320/375/390 (S7). **Not yet driven against TEST.** Needs a build with the flags on pointing at TEST; not automated yet. |
| Reveal animation, XP, Georgia Quest, Garden | Client-derived from `discoveries` by the existing, tested code. They are **not exercised by the live suite**, which proves the persisted record they derive from. |
| Provider-failure retry (release + refund) | SQL real locally; the edge hook is S8 and is **faked in its unit tests**. No real provider failure is induced on TEST. |
| Enforcement | **Disabled everywhere** until step 6, TEST only. |

## Known limits (state them wherever this is demonstrated)

- 0016 stops casual direct-API insertion of cards. It does not stop a determined person feeding arbitrary images through the capture
  path. A receipt records "went through the app's capture flow", not that anybody was outdoors.
- Goldenrod (`legacyGenus` only, `pendingCuration`) earns no receipt under the five-value rule, so with enforcement ON it could not be
  newly unlocked by capture until its curation is done. Existing finds are grandfathered. **Decide before enforcement is ever enabled
  beyond TEST.**
- Rollback (TEST): `docs/discoveries/sql/0016_rollback.sql` drops triggers and functions only; it never deletes player rows.

## Cleanup SQL (TEST SQL editor)

```sql
-- Disposable accounts created by the live suites; their rows go with them (ON DELETE CASCADE).
delete from auth.users where email like 'plantdex-e2e-capture-%@mailinator.com';
-- Confirms nothing is left (expect 0, 0, 0):
select (select count(*) from public.capture_receipts r where not exists (select 1 from auth.users u where u.id = r.user_id)),
       (select count(*) from public.capture_sessions s where not exists (select 1 from auth.users u where u.id = s.user_id)),
       (select count(*) from public.discoveries d where not exists (select 1 from auth.users u where u.id = d.user_id));
```
