# V1 TEST procedure: capture enforcement (0016), the receipt-issuing functions, and the live camera-to-collection run

**This is the one authoritative procedure.** TEST project only (`vgjehmwcpavflbfhbbrp`). Nothing here touches production
(`vygiamigomwlvnwkryyl`), enables enforcement for real players, or turns on a public feature. Nothing needs a secret pasted into chat.
Merging this document deploys and applies nothing.

## 1. What is known about migration state, and how it is known

| Migration | State on TEST | Evidence | Action |
|---|---|---|---|
| 0009 (atomic quota) and 0013 (leaderboard integrity) | Believed present (the live suites have run against TEST on them) | Not provable from here: the workflow history does not show the project ref of every TEST run | **Preflight (step A) proves it. Stop if absent.** |
| **0014** `confirm_scan` | **Applied 2026-11-24, success** | `run-migration.yml` run #37 (id 45328820311), `PROJECT_REF: vgjehmwcpavflbfhbbrp`, file from commit `780d1b26`; the file merged to `integration` (#43) is byte-identical to that commit; live suite passed 14/14 | **Do NOT re-apply.** |
| **0016** capture enforcement | **Unknown until step A.** Never dispatched by any run in the history | No `run-migration` run names it | Step A decides: apply only on `READY`. |
| 0015 (expansion ids) | Not required. Separate expansion track, TEST-only, not part of V1 | 0016 depends only on 0001-0013 (`is_catalogue_herb`); it does not reference `is_permitted_herb` or any 0015 object | **Do not apply for V1.** |
| Production | Has at least 0012 (run #33, 2026-11-14, `PROJECT_REF: vygiamigomwlvnwkryyl`). 0013, 0014, 0016: not applied | | **Untouched. Nothing here is for production.** |

Compatibility, proven locally on PostgreSQL 16 (not on TEST): 0001-0013 + **0014** + **0016** passes **111** checks, including that `confirm_scan` with a forged
receipt confirms only a scan and creates no discovery or receipt. 0016 **without** 0014 passes **109**. The end-to-end handler suite (real `identify-plant` code against
0001-0014 + 0016) passes 14/14. 0016 is idempotent (`if not exists` / `create or replace`) but is still applied **once**, on a `READY` preflight.

## 2. Ordered actions (owner), with what to expect

| # | Action | Run where | Expected | Stop and tell me if |
|---|---|---|---|---|
| **A** | **Preflight (read-only).** Paste `docs/release/v1-test-preflight.sql` | TEST SQL editor | one row; `verdict` starts `READY` | verdict starts `STOP` (including **UNEXPECTED DRIFT: 0014 missing**, which is investigated, never worked around: it was applied on 2026-11-24); or `PARTLY present`; or `ALREADY APPLIED` (then skip to step C, never re-run B) |
| **B** | **Apply 0016.** Actions > "Run a Supabase migration": **Use workflow from: `integration`** (the migration file exists only there), `project_ref` = `vgjehmwcpavflbfhbbrp`, `migration` = `0016_discovery_capture_enforcement.sql` | GitHub | green run, "Confirm the objects exist" lists the new tables | red run; any refusal from the token/project checks |
| **C** | **Verify 0016 (self-rolling-back).** Paste `docs/discoveries/sql/0016_verify.sql` | TEST SQL editor | last line `ALL 0016 CHECKS PASSED (rolling back)`; **111** checks if 0014 is present (it is), 109 if not | any line containing `FAIL`/`ERROR`; a count other than 111 |
| **D** | **Re-run the preflight.** | TEST SQL editor | `verdict` = `ALREADY APPLIED`, `enforcing` = `false`, `fn_0016_of_10` = 10 | `enforcing` is not `false` |
| **E** | **Deploy exactly ONE edge function: `identify-plant`.** Actions > "Deploy a Supabase function": **Use workflow from: `integration`**, `project_ref` = test, `function` = `identify-plant`. **Do NOT choose `all`, `delete-account` or `challenge-submit`.** What changes is listed under "Step E precisely" below | GitHub | one green run | a red run; or anyone selects `all`, `delete-account` or `challenge-submit` |
| **F0** | **Temporary TEST auth change** (only if needed; see "Temporary TEST authentication change" below): record the current "Confirm email" state, turn it OFF | TEST dashboard | recorded state noted; setting OFF | cannot read the current state |
| **F** | **Run the live suite, enforcement OFF.** See "Running the live suite" below | owner machine or Actions | **12 passed, 1 skipped** (the enforcement-ON test) | any failure, **or** a skip other than that one. A failure that says the provider answered with a different species is "not a pass": try another photograph |
| **G** | **(Optional, TEST only) switch enforcement ON.** `select public.set_discovery_enforcement(true, now(), 'ENFORCE NEW DISCOVERIES');` | TEST SQL editor | `{"enforcing": true, "newly_grandfathered": N}` (every existing TEST discovery is grandfathered) | an exception |
| **H** | **Run the live suite, enforcement ON** (`enforcement` = `on`) | as F | the ON test runs and passes: a direct insert with no receipt is **refused** | a direct insert succeeds |
| **I** | **Switch it back OFF, then PROVE it.** `select public.set_discovery_enforcement(false, null, 'x');` then `select public.discovery_rules()->>'enforcing' as enforcing, (select enforce from public.discovery_enforcement where singleton) as stored;` | TEST SQL editor | **both** columns `false` (also re-run the preflight: `enforcing` = `false`); receipts and grandfather rows untouched | either column is `true` (retry once; if still true, stop and tell me) |
| **J** | **Clean up in two parts: PREVIEW first, then delete** (SQL under "Step J cleanup"), then **restore the auth setting** (F0 in reverse) | TEST SQL editor and dashboard | preview lists only accounts matching the strict pattern and created during this run; delete count equals preview count; Confirm email restored | the preview shows any account you do not recognise, more than 6 accounts, or any row count that looks like real use |

Safe activation order, stated once: **migration (B) -> verify (C) -> functions (E) -> live suite with the switch OFF (F) -> switch ON (G) -> live suite ON (H) -> switch OFF (I).**
The functions are deployed **after** the migration, never before: the new `identify-plant` calls RPCs that exist only after 0016. Enforcement is never ON while a suite is not
running against it, and it is returned to OFF in the same sitting. Enforcement on production is not authorised and is not part of this procedure.

### Configuration and flags

- **TEST edge-function secrets:** nothing new. 0016 adds no secret. The provider key, `SPECIES_ATTESTATION_SECRET` and the quota salt already used by `identify-plant` must be set on TEST (they are, if `verify-plant-id` has ever passed there; step F fails loudly on a missing provider key, not silently).
- **Repository variable** `TEST_SUPABASE_ANON_KEY`: the TEST project's *public* anon/publishable key (a variable, not a secret). "Confirm email" must be **OFF** on TEST **only for the duration of the live suite** (see "Temporary TEST authentication change").
- **App feature flags** are build-time and stay `'off'` on every deployed build (`NEXT_PUBLIC_CAMERA_CAPTURE`, `NEXT_PUBLIC_SCAN_CONSENT`, `NEXT_PUBLIC_CONFIRM_SCAN_RPC`, `NEXT_PUBLIC_MULTI_REGION`, `NEXT_PUBLIC_EXPANSION_PILOT`, `NEXT_PUBLIC_BOSS_FORMS`). They are turned on only in a **local** build for a browser demonstration (below); nothing in this procedure changes the deployed site.
- **Database switch:** `discovery_enforcement.enforce` defaults `false` and the migration never turns it on.

### Step E precisely: what is deployed and what is deliberately not

The last deploys I can see on the TEST path are run #44/#45 (2026-11-16, commits `b1a44b1e` / `fa20d294`, branch `claude/plantdex-v0-3-supabase-verify-iic8pz`); the workflow history does not show each run's project or function input, so **this is an assumption: it is the code believed to be on TEST now.** Compared with that commit, the sources under `supabase/functions` on `integration` differ as follows (tracked as issue #97):

| Function | Differs from TEST's believed current code? | Deploy? |
|---|---|---|
| `identify-plant` | **Yes, intentionally:** one-photo floor for `purpose=collect` only (non-collect keeps two); capture session consume, receipt issue; session release and the caller's own daily-unit refund on a provider-side failure; honest `allowance`/`capture.retryable` fields. Everything it drops from TEST's version is the old two-photo floor for collect. Uses `_shared/.../observation-capture-receipt.ts` and `observation-qualification.ts` (new files) | **Yes** (step E, first) |
| `delete-account` | Yes in source (it also deletes `capture_receipts` and `discovery_grandfathered`, and keeps the rule that errors are logged and never shown to the caller). **Not needed for this validation, so not deployed:** nothing in the run calls it (cleanup is SQL, step J); the version on TEST is the more hardened one; and deleting a user already removes every 0016 row through `ON DELETE CASCADE` (proved locally on PostgreSQL 16: after deleting a user holding a session, a claimed receipt, an image digest, a grandfather row and a discovery, all five tables read 0 with no foreign-key error). The explicit deletion is belt-and-braces and export/delete parity for production, and ships with that release | **No** (deferred to the production release) |
| `challenge-submit` | **Yes, and it is a downgrade:** integration lacks three protections that TEST's version has (a 400 for a non-object body, a 400 for a non-slug plant id, and the separate Boss Trial daily limit), plus the Boss Form question-bank changes. Boss Forms are an off-by-default pilot, not part of V1 | **No.** Do not deploy it. See "Finding" below |
| `herbdex-action`, `seed-packet`, `redeem-deck-code` | **No change** to their source or the modules they import | **No** |

Why one function and not `function = all`: `all` would redeploy `challenge-submit` and replace TEST's more-protected version with integration's, a regression on a function V1 does not use, and would also replace `delete-account` with a version this validation does not need. Deploying only `identify-plant` changes exactly what the camera-to-collection flow needs and nothing else.

**Finding for the owner (not blocking this procedure):** hardening that exists on the branch TEST was deployed from (`claude/plantdex-v0-3-supabase-verify-iic8pz`) is **missing from `integration` and from the production branch** for `challenge-submit` (the three protections above) and was missing for `delete-account` (restored on `integration` in #96). Tracked as issue #97: before any production function deploy, that lineage difference needs one reconciliation pass; it is out of scope for V1 TEST validation.

**Rollback for `identify-plant`:** run the same workflow with **Use workflow from: `claude/plantdex-v0-3-supabase-verify-iic8pz`** and `function` = `identify-plant`, which redeploys the previous source. The previous `identify-plant` ignores the new RPCs and receipts, so rolling back the function while 0016 stays applied is safe.

### Temporary TEST authentication change (step F0, and its restoration)

The live suite signs up disposable accounts and signs them in at once, which needs **Authentication > Sign In / Providers > Email > Confirm email = OFF** on TEST. That is a TEST-only change and it widens sign-up on that project while it is in force, so it is temporary and always reversed.

1. **Record the current state first**, either from the dashboard toggle or read-only from the public settings endpoint (the anon key is public; keep it in your shell, never in chat): `curl -s -H "apikey: $TEST_ANON" https://vgjehmwcpavflbfhbbrp.supabase.co/auth/v1/settings` and read `"mailer_autoconfirm"`. **`true` means Confirm email is OFF.** Note it.
2. If it is already OFF, something left it that way earlier: still **restore it ON at the end** (this was already on the owner's reminders list).
3. If it is ON, turn it OFF just before step F. Do the suite runs (F, H) back to back, so the window is minutes, not days.
4. **Restore it** immediately after step J's delete: toggle Confirm email ON and re-read `mailer_autoconfirm`; it must be `false`.
5. Nothing else about auth changes: no provider, redirect-URL, rate-limit or password setting is touched, and no service-role key is needed.

### Step J cleanup: preview first, then a bounded delete

Disposable accounts are created with the exact email shape `plantdex-e2e-capture-<alice|bob>-<stamp>@mailinator.com`. The pattern below is **strict** (anchored, only those two tags, a base-36 stamp), is limited to accounts **created in the last 24 hours**, and the delete is refused unless the count matches what you previewed. It never matches a real address.

**J1: preview (read-only). Run this and read it before anything else.**

```sql
with t as (
  select id, email, created_at
  from auth.users
  where email ~ '^plantdex-e2e-capture-(alice|bob)-[0-9a-z]+@mailinator\.com$'
    and created_at > now() - interval '24 hours'
)
select (select count(*) from t)                                                        as accounts_that_would_be_deleted,
       (select count(*) from auth.users)                                               as all_accounts_for_scale,
       (select count(*) from public.discoveries d join t on t.id = d.user_id)          as their_discoveries,
       (select count(*) from public.capture_receipts r join t on t.id = r.user_id)     as their_receipts,
       (select count(*) from public.sightings s join t on t.id = s.user_id)            as their_sightings,
       (select count(*) from public.scans c join t on t.id = c.user_id)                as their_scans,
       (select string_agg(email, ', ' order by created_at) from t)                     as the_emails;
```

Expected: `accounts_that_would_be_deleted` is **2 per suite run** (Alice and Bob; 4 if you ran F and H), every address in `the_emails` is one you recognise, `their_sightings` and `their_scans` are 0 (the suite writes neither). **Stop if** the count is above 6, any email is unfamiliar, or `their_sightings`/`their_scans` is non-zero.

**J2: delete, only after J1 looks right.** Replace `4` with the exact `accounts_that_would_be_deleted` you read:

```sql
do $$
declare expected int := 4;   -- <- the number from J1
        n int;
begin
  select count(*) into n from auth.users
   where email ~ '^plantdex-e2e-capture-(alice|bob)-[0-9a-z]+@mailinator\.com$'
     and created_at > now() - interval '24 hours';
  if n <> expected then raise exception 'preview said %, now matches % - nothing deleted', expected, n; end if;
  delete from auth.users
   where email ~ '^plantdex-e2e-capture-(alice|bob)-[0-9a-z]+@mailinator\.com$'
     and created_at > now() - interval '24 hours';
end $$;
```

Their rows in every user-owned table go with them through `ON DELETE CASCADE`; no other account or record is touched. **J3: confirm** by re-running J1 (all counts 0) and the orphan check at the end of this document (0, 0, 0).

### End-state checklist (all must hold before the run is called finished)

- [ ] `select public.discovery_rules()->>'enforcing'` is **`false`**, and so is `select enforce from public.discovery_enforcement where singleton`.
- [ ] Preflight verdict is `ALREADY APPLIED` with `enforcing` = `false`.
- [ ] J1 now returns 0 accounts; the orphan check returns `0, 0, 0`.
- [ ] `mailer_autoconfirm` is back to the value recorded in F0 (normally `false`, i.e. Confirm email ON).
- [ ] Only `identify-plant` was deployed; no `all`, no `delete-account`, no `challenge-submit`.
- [ ] Nothing ran against `vygiamigomwlvnwkryyl` (production).

### Running the live suite (steps F and H)

The Actions tab lists a workflow only once its file is on the default branch, and that is the production branch, which this work must not touch. So, in order of preference:
1. **From your own computer.** In a shell (not in chat) with the TEST URL and public anon key in `.env.local`:
   `python3 -c "import os;from PIL import Image;im=Image.open('public/cards/taraxacum-officinale.webp').convert('RGB');w,h=im.size;im.crop((int(w*.12),int(h*.11),int(w*.88),int(h*.50))).resize((900,int(900*(h*.39)/(w*.76)))).save('photo.jpg',quality=88)"`
   then `E2E_PHOTO=$PWD/photo.jpg E2E_HERB_ID=taraxacum-officinale npx vitest run --config vitest.e2e.config.ts e2e/capture-flow.e2e.test.ts --reporter=verbose` (add `E2E_ENFORCEMENT=on` for step H). The guard refuses any URL that is not the TEST project.
2. **Ask me for a narrow, temporary `push` trigger** limited to `.github/workflows/live-capture-flow.yml` on `integration`, as was done once for `live-confirm-scan.yml`. I will not add it unless you ask.
3. Wait for the workflow file to reach the default branch in a normal release.

The suite spends **one** provider identification per run and uses disposable accounts. It uses the real project, the real deployed function, the real provider and the real policies; the only stand-in is the camera (one real species photograph cropped from the deck's own card art, sent down the same request path the app uses).

## 3. Rollback and stop conditions

- **Migration 0016:** `docs/discoveries/sql/0016_rollback.sql` drops triggers and functions only. It **never deletes a player row, a receipt, a session or a grandfather row**, and it can be re-applied. Run it only if the verification fails or the owner decides to back out. Tables stay (harmless).
- **Switch:** `select public.set_discovery_enforcement(false, null, 'x');` is always safe and instant.
- **Migration 0014:** `drop function if exists public.confirm_scan(text, text, text, numeric, text, text, text);` Not needed for V1 rollback; nothing calls it while `NEXT_PUBLIC_CONFIRM_SCAN_RPC` is off.
- **Edge functions:** redeploy the previous commit with the same workflow (`function` = `identify-plant`, from the commit before this one). The old function ignores the new RPCs.
- **Stop immediately and report** if: any preflight row says `STOP`; step C reports a count other than 111; step F has any failure; enforcement reads `true` after step I; or anything touches the production ref. Do not retry a failing step; send me the output.

## 4. Provider failure: what the player is told, and why refunds cannot be farmed

`release_capture_session(user, session)` hands a consumed session back so the retry with the same photographs is a first use; it refuses once any receipt exists for that session.
`refund_scan_claim(bucket, day, observation_id)` gives the **caller's own** daily unit back and is enforced in the database: **idempotent** per request id; **capped** at 3 per caller bucket per UTC day;
refuses the `global` bucket (the upstream-cost backstop, spent whether or not the provider charged); refuses a day more than one day from today and a bucket with no claim; never below zero.
Checked under concurrency: 12 simultaneous calls with one id refund once; 12 distinct ids refund exactly three. The edge function reports what the backend **confirmed**: session released, and
allowance refunded or **not** refunded, and the player-facing text states only what was confirmed (PR #92). The shared provider budget is never said to be refunded.
A retry cannot create a second discovery or extra XP: receipts are unique per (observation, card), `claim_discovery` is idempotent (`already_claimed`), `discoveries` is keyed by (user, card), and XP is derived from `discoveries`.

## 5. The full signed-in player run: evidence by step

Your eleven steps, and what proves each. **A step is not "complete" if it is marked MOCKED, DISABLED or ASSUMED.**

| # | Step | Automated TEST evidence (`capture-flow.e2e.test.ts`) | Needs a person / device |
|---|---|---|---|
| 1 | Open as a new player | disposable sign-up and sign-in against TEST auth | the first-run screens and onboarding in a browser |
| 2 | Onboarding and photo consent | **not covered**: consent is client-side (unit-tested, screenshot-checked at 320/375/390) | **manual**: build with `SCAN_CONSENT=on`; decline sends nothing; accept stores wording version 2 |
| 3 | Capture one photograph in-app | **camera replaced by a photograph file**; the capture session, one-image rule and request shape are real | **manual on a real camera**: desktop Chrome on `localhost` with a webcam works; a phone needs HTTPS, i.e. TestFlight or a tunnel, so the iPhone camera is a Capacitor-stage test |
| 4 | Identify with the real provider | **real**: deployed `identify-plant` and the real provider answer | none |
| 5 | Review and confirm | candidates and server-issued receipt asserted; the review screen itself is UI | manual: reading the result screen |
| 6 | Server receipt and claim | **real**: receipt shape, claim, `already_claimed`, wrong-account and forged-receipt refusal | none |
| 7 | Unlock, XP, achievements | **persisted record proven** (`discoveries` row); XP, level and achievements are derived on the client from it by tested pure code | manual: see the reveal, XP and achievement in the UI |
| 8 | Appears in Collection | the row exists and is read back by a fresh sign-in | manual: see the card in the grid |
| 9 | Georgia Habitat Quest progress | **not covered by the live suite**: the regional quest board is a seeded client-side lens with no completion record by design | manual |
| 10 | Garden progression | **not covered live**: derived on the client from mastery by `garden.ts` | manual |
| 11 | Reload, sign out, sign in: persistence | **real**: a second client signs in fresh and reads the discovery and claimed receipt back from the server | manual: the reload in the UI |
| + | Rejected imports | not covered; existing import unit tests (imports never create a server discovery under enforcement) | manual |
| + | Expired receipt | not covered live (a 30-day clock); proven in SQL verify | none |
| + | Forged receipt, duplicate submission, repeat discovery | **real** (replay, reuse with a different image, cross-account, direct-API forgery, repeat claim) | none |
| + | Denied camera permission | not covered | **manual** |
| + | Provider outage | **not induced on TEST**; release/refund logic is SQL-real locally and unit-tested with fakes | none possible without breaking the provider key |

After you approve this procedure I will prepare the browser run (a local build against TEST with the flags on and a scripted fake camera), which can automate steps 1-3, 5, 7-8 and 10-11 in a real browser against the real backend. Steps 9 and the physical iPhone camera stay manual.

## 6. Known limits, stated wherever this is demonstrated

- 0016 stops casual direct-API insertion of cards. It does not stop a determined person feeding arbitrary images through the capture path. A receipt records "went through the app's capture flow", not that anybody was outdoors.
- Goldenrod (`legacyGenus` only, `pendingCuration`) earns no receipt under the five-value rule, so with enforcement ON it could not be newly unlocked by capture until its curation is done. Existing finds are grandfathered. **Decide before enforcement is ever enabled beyond TEST.**

## Orphan check (used by step J3 and the end-state checklist)

```sql
select (select count(*) from public.capture_receipts r where not exists (select 1 from auth.users u where u.id = r.user_id)),
       (select count(*) from public.capture_sessions s where not exists (select 1 from auth.users u where u.id = s.user_id)),
       (select count(*) from public.discoveries d where not exists (select 1 from auth.users u where u.id = d.user_id));
```
Expected `0, 0, 0`.
