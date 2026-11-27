# Isolated enforcement-ON test (TEST project only, nothing deployed, production untouched)

PREREQUISITE: the owner decides the minimum-confidence question in `v1-pre-enforcement-findings.md` section 2. Do not switch
enforcement ON for anyone while a blank-image guess can earn a receipt. Nothing below runs without the owner's explicit approval.

## What "isolated" means here
TEST has one global switch (`discovery_enforcement`). Turning it on affects every account on TEST for the window, and only TEST.
Production is a different project; no step names it, and the workflow keeps `PROJECT_REF` as a TEST literal.

## Sequence (one workflow run, one request commit, at most 2 provider calls)
1. **Preflight** (unchanged): TEST ref, 0016 objects, enforcement `false`.
2. **Snapshot**: record `discoveries` count, `discovery_grandfathered` count, `enforce`.
3. **ON**: `select public.set_discovery_enforcement(true, now() - interval '1 second', 'ENFORCE NEW DISCOVERIES');`
   Side effect (additive, permanent, harmless on TEST): every existing TEST discovery row gets a `discovery_grandfathered` row.
4. **Suite with `E2E_ENFORCEMENT=on`**: steps 1-5 must still pass (the claim path is the one legal writer), the ON test runs and a direct
   insert with no receipt is **refused**, forged/expired/cross-account unchanged. Add: a direct `discoveries` insert as a service-role
   statement is also refused (the trigger binds every role).
5. **OFF, always**: an `if: always()` step runs `select public.set_discovery_enforcement(false, null, 'x');`, then reads back
   `discovery_rules()->>'enforcing'` and `enforce`, and **fails the run** unless both are `false`.
6. **Cleanup** of the two disposable accounts (exact id + email), as in run 2.

## Rollback and stop conditions
- Instant rollback, any time, TEST SQL editor or the same step: `select public.set_discovery_enforcement(false, null, 'x');` Nothing is revoked:
  receipts, sessions, grandfather rows and player records are untouched.
- Structural rollback if a defect is in the migration itself: `docs/discoveries/sql/0016_rollback.sql` (drops triggers and functions only; tables and data stay).
- Stop and report if: the OFF read-back is not `false`; the count of `discoveries` rows changed other than by the test's own claim; any
  existing account lost a discovery; preflight finds enforcement already `true`.
- Production: not touched. Enabling it there stays a separate owner decision with its own plan (`production-promotion-plan.md`).

## Evidence to collect (LIVE)
Before/after counts; the refused-insert error code; the claim result under ON; `enforce` read-back after OFF; residue counts after cleanup.

## Emergency manual OFF (if the CI run is interrupted, cancelled or its cleanup step cannot run)
TEST only. Production has its own switch and is never touched by these steps. OFF revokes nothing.
1. **Supabase dashboard (fastest):** project `vgjehmwcpavflbfhbbrp` -> SQL Editor -> run
   `select public.set_discovery_enforcement(false, null, 'x');` then `select enforce from public.discovery_enforcement where singleton;` -> must show `false`.
   Check the project name/ref in the dashboard URL before running; the ref must be `vgjehmwcpavflbfhbbrp`.
2. **From any machine with the Management API token (no dashboard):**
   `curl -s -X POST "https://api.supabase.com/v1/projects/vgjehmwcpavflbfhbbrp/database/query" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" -d '{"query":"select public.set_discovery_enforcement(false, null, '"'"'x'"'"')"}'`
   then read the switch back as above.
3. **Confirm:** the next run's preflight prints `PASS discovery enforcement is OFF`; the read-only `docs/release/v1-test-preflight.sql` shows `enforcing = false`.
4. If a disposable account was left behind by the interrupted run: `docs/release/v1-test-deployment.md` steps J1 (preview) and J2 (bounded delete; matches only
   `plantdex-e2e-capture-(alice|bob)-r<digits>@mailinator.com`).
Why interruption cannot silently leave it ON for long: the switch is TEST-only, ON is entered only by the run's own step after reading OFF, and the always-run
`Prove TEST enforcement is OFF` step switches it back and fails the run unless the database reads `false`. A cancelled workflow still executes `if: always()` steps; a
runner crash is the case the manual procedure above exists for.
