# Production promotion plan — integration to production

**STATUS: PLAN ONLY. NOT EXECUTED. NOTHING IN THIS DOCUMENT HAS BEEN RUN.**
Written 2026-11-26 on `coord/v1-qa` from `integration@9a7c48c`. No credential was used or requested, no workflow was dispatched,
nothing was pushed to `integration` or to the production branch, and there was no Supabase or production access. Every step below
that touches production is an instruction for the owner. Frontend flags being off is **not** authorisation for anything here.

Companion: `docs/release/v1-qa-report.md` (evidence and findings), `docs/release/v1-launch-gap-audit.md` (on `coord/v1-gap-audit`),
`docs/release-runbook.md`, `docs/leaderboard-production-checklist.md`.

## 0. Facts this plan rests on (all from the repo, none from production)

| Fact | Source |
|---|---|
| The site deploys on push to **`claude/planning-session-61zwro`** (the production branch). Merging IS deploying the frontend. | `.github/workflows/deploy.yml` lines 5-8 |
| Production is **37 commits behind** `integration` and holds **1 commit integration lacks**: `e3a5d4ed`, "Promote integration to production" (#38). It is a squash of PRs #26-#37; every path it touches is byte-identical on integration except `agents/ownership.json` (integration's is newer). It carries no unique content. | `git diff e3a5d4ed origin/integration -- <its paths>`; see QA report task 5 |
| Migrations are applied by `run-migration.yml` posting SQL through the Management API. **There is no migration ledger** (`supabase_migrations.schema_migrations` is not written), so "which migrations are applied" can only be answered by probing for the objects each one creates (section 3). | `run-migration.yml` |
| Documented as applied to production: 0001-0005 (baseline), 0006, 0007 (2026-10-02), 0008, 0009. **Documented as NOT applied: 0011** (as of `docs/leaderboard-production-checklist.md`). 0010, 0012, 0013: **no production evidence in the repo.** | `docs/release-runbook.md`; `docs/leaderboard-production-checklist.md` lines 12-26 |
| 0014 (`confirm_scan`) is a held draft, applied to TEST only. 0015 (expansion ids) is a reviewed draft, owner-approved for TEST only. Neither is on `integration`. | `origin/coord/confirm-scan-rpc`, `origin/coord/expansion-progression-design`; `docs/agent-workflow/task-board.md` |
| Flags default OFF in `next.config.ts` (`BOSS_FORMS`, `CONFIRM_SCAN_RPC`, `CAMERA_CAPTURE`, `MULTI_REGION`, `EXPANSION_PILOT`); `deploy.yml` pins `NEXT_PUBLIC_BOSS_FORMS: 'off'`. | `next.config.ts` 60-64; `deploy.yml` 107, 121 |
| Test project `vgjehmwcpavflbfhbbrp`; production project `vygiamigomwlvnwkryyl`. | `docs/release-runbook.md` |

## 1. Scope: what production SHOULD have for V1

The V1 build that `integration` produces reads these server objects. "Required" means a shipped, default-on code path breaks or is
unsafe without it.

| Item | Needed by | Required for V1? | Production evidence |
|---|---|---|---|
| Migrations 0001-0005 | accounts, scans, profiles, seed shelf, species registry | **Required** | documented applied |
| 0006, 0007 | identification columns and unlock bases | **Required** (a sighting carrying a new basis is refused and lost without 0007) | documented applied 2026-10-02 |
| 0008 | collection entitlements, discovery cap trigger | **Required** (client reads `entitlements`/`app_settings`) | documented applied |
| 0009 | `claim_scan_pair` (atomic quota) | **Required** (`identify-plant` calls it) | documented applied |
| 0010 botanical catalogue | no client or function reads `catalog_*` / `collectible_cards` (grep of `src`, `supabase/functions`) | **Not required**. Defer; do not apply "to be safe" | none |
| 0011 leaderboard | `/leaderboard`, `remote-leaderboard.ts` | **Required only if the Field Board ships.** The page says the board "is not switched on for this project yet" without it | documented NOT applied |
| 0012 boss forms | `challenge-submit`, `boss_forms` | **Not required** (flag off, nothing mounted) | none |
| 0013 leaderboard integrity | id/task/achievement CHECKs, derived tables lose client insert, server clock, photo-exists | **Required if 0011 is applied** (0011 alone pays for any invented id). Also tightens `mastered`/`research_completions` regardless of the board | none |
| 0014 confirm_scan | `NEXT_PUBLIC_CONFIRM_SCAN_RPC` (off) | **No.** Held; see QA report F-04 before it goes anywhere | TEST only |
| 0015 expansion ids | `NEXT_PUBLIC_EXPANSION_PILOT` (off) | **No. Never to production in its present form** (its own header: delete every id not live in the build before real players) | TEST only |
| Edge functions: `identify-plant`, `herbdex-action`, `seed-packet`, `delete-account`, `redeem-deck-code` | scan, reconcile, seed shelf, deletion, deck codes | **Required** | unverified |
| Edge function `challenge-submit` | Boss Forms only | **Not required.** It is not in `deploy-function.yml`'s option list, so only `function=all` deploys it | unverified |
| Function secrets: `PLANTNET_API_KEY` (or `PLANT_ID_API_KEY` + `PLANT_IDENTIFICATION_PROVIDER=plantid`), `SPECIES_ATTESTATION_SECRET`, `SCAN_QUOTA_SALT` (optional), `SUPABASE_SERVICE_ROLE_KEY` | scan, shelf mint, quota, reconcile | **Required** (names only; never read values) | `check-function-secrets.yml` |
| `IDENTIFICATION_COMPARISON` | doubles provider spend when `on` | **Must be unset or not `on`** | `check-function-secrets.yml` |
| Supabase redirect allow-list includes `https://plantdex.online` | password reset, signup confirmation | **Required** | dashboard only |
| Auth: "Confirm email" ON; no open sign-up beyond intent | quota farming (QA F-07) | **Required** | `check-auth-config.yml` |

## 2. Gates (every one must be green before the step it guards)

- **G1 Code gate.** `npm run verify` green on the exact commit being promoted (lint, typecheck, `check:edge`, vitest, build). Last run on this branch is recorded in the PR.
- **G2 Evidence gate.** The owner has run every read-only check in section 3 and pasted the output. No step below may start on an assumption about production's state.
- **G3 Backup gate.** A restore point exists. `docs/leaderboard-production-checklist.md` line 32 says production had **no point-in-time recovery** when it was written; re-check `GET /v1/projects/{ref}/database/backups` (the `release-checkpoint.yml` output). If there is none, take a manual dump or accept in writing that migrations here are additive and fix-forward only.
- **G4 Photo-consent gate (V1 blocker).** QA finding F-08: no in-flow notice that photos go to a third party. Copy and placement are a UI/owner decision. Do not promote a build that sends photos without it.
- **G5 Integrity gate (owner decision).** QA finding F-03: any signed-in client can insert any of the 54 catalogue ids into `discoveries` and `learned` by a direct API call, and the Field Board counts those rows at 50 points each with no evidence requirement. The board must not be presented as a competition until this is decided. Either ship the board **labelled provisional (as it is today)** with the owner's written acceptance, or leave 0011/0013 and the board off for V1.
- **G6 Owner approval**, in writing, per step marked **OWNER** below. Agents do not approve their own promotion.

## 3. Read-only checks the owner runs FIRST (G2)

All are reads. Run against **production** (`vygiamigomwlvnwkryyl`) in the Supabase SQL editor unless a workflow is named. Paste the
full output back; do not paraphrase it.

### 3a. Workflows (names exactly as in `.github/workflows/`)

| Workflow name (UI) | File | Inputs | What it answers |
|---|---|---|---|
| **Release checkpoint (read-only)** | `release-checkpoint.yml` | project = production | deployed functions + versions, backups/PITR posture, row counts. **Run this first; it is the record of "before".** |
| **Edge function identity (read-only)** | `function-identity.yml` | project = production | did the deployed code change, or only the platform version counter |
| **Check the function secrets** | `check-function-secrets.yml` | project = production | secret NAMES present/absent, no values |
| **Check Supabase auth config** | `check-auth-config.yml` | project = production | confirm-email, redirect URLs, sign-up settings |
| **Check the collection entitlements** | `check-collection-entitlements.yml` | project = production | 0008 state |
| **Check the Supabase token** | `check-supabase-token.yml` | project = production | the token works and is scoped as expected |
| **Check the live site** | `check-live-site.yml` | blank (derives from `SITE_DOMAIN`) | the deployed bundle points at the production project, not test |

Do **not** dispatch `run-migration.yml`, `deploy-function.yml`, `deploy.yml`, `live-confirm-scan.yml`, `comparison-account.yml` or
`ingest-species.yml` as part of checking.

### 3b. Which migrations are applied (no ledger exists, so probe for each migration's objects)

```sql
-- One row per migration; applied = true only if EVERY probed object exists. Read-only.
with probes(mig, ok) as (values
  ('0001 accounts',        to_regclass('public.discoveries') is not null and to_regclass('public.sightings') is not null
                           and exists (select 1 from storage.buckets where id = 'sighting-photos')),
  ('0002 scans',           to_regclass('public.scans') is not null and to_regclass('public.scan_quota') is not null
                           and to_regprocedure('public.claim_scan(text,date,integer)') is not null),
  ('0003 profiles',        to_regclass('public.profiles') is not null),
  ('0004 seed_shelf',      to_regclass('public.seed_shelf') is not null),
  ('0005 species_packets', to_regclass('public.species_packets') is not null),
  ('0006 identification',  exists (select 1 from information_schema.columns where table_schema='public' and table_name='sightings' and column_name='observed_taxon_provider_name')
                           and to_regclass('public.identification_comparisons') is not null),
  ('0007 unlock_bases',    exists (select 1 from pg_constraint where conname='sightings_eligibility_check'
                                   and pg_get_constraintdef(oid) like '%synonym%')),
  ('0008 entitlements',    to_regclass('public.entitlements') is not null and to_regclass('public.deck_claims') is not null
                           and to_regclass('public.app_settings') is not null
                           and to_regprocedure('public.redeem_deck_code(uuid,text)') is not null),
  ('0009 atomic_quota',    to_regprocedure('public.claim_scan_pair(text,date,integer,integer,text)') is not null),
  ('0010 catalogue',       to_regclass('public.catalog_species') is not null and to_regclass('public.collectible_cards') is not null),
  ('0011 leaderboard',     to_regclass('public.leaderboard_participants') is not null
                           and to_regprocedure('public.leaderboard_standings(text,integer)') is not null),
  ('0012 boss_forms',      to_regclass('public.boss_forms') is not null and to_regclass('public.challenge_completions') is not null),
  ('0013 integrity',       to_regprocedure('public.is_catalogue_herb(text)') is not null
                           and to_regprocedure('public.sighting_photo_exists(uuid,text)') is not null
                           and exists (select 1 from pg_trigger where tgname='sightings_server_clock')),
  ('0014 confirm_scan',    to_regprocedure('public.confirm_scan(text,text,text,numeric,text,text,text)') is not null),
  ('0015 expansion ids',   to_regprocedure('public.is_permitted_herb(text)') is not null)
)
select mig, ok as applied from probes order by mig;
```

Expected for the V1 build: 0001-0009 **true**; 0011 and 0013 **true together or false together** (a state with 0011 true and 0013 false
lets any signed-in client mint scoring rows); 0010, 0012, 0014, 0015 **false**. Anything else: stop and report.

### 3c. State that must be true even where the migration says "applied"

```sql
-- 1. No client can write the derived tables (expect: no 'INSERT' on mastered / research_completions after 0013).
select tablename, policyname, cmd from pg_policies
 where schemaname='public' and tablename in ('mastered','research_completions','entitlements','challenge_completions','boss_forms','species_packets','deck_claims','scan_quota')
 order by tablename, cmd;

-- 2. Only profiles may grant a client UPDATE (expect exactly one row: profiles).
select tablename, policyname from pg_policies where schemaname='public' and cmd in ('UPDATE','ALL');

-- 3. SECURITY DEFINER functions and who can call them (expect anon/PUBLIC never on the list;
--    authenticated only on leaderboard_standings).
select p.proname,
       has_function_privilege('anon',          p.oid, 'execute') as anon_can_call,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_call,
       p.proconfig as fixed_search_path
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname='public' and p.prosecdef order by 1;

-- 4. RLS is on for every public table (expect zero rows).
select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;

-- 5. The paywall flag and cap as they really are (do not assume the default).
select collection_paywall_enabled, free_discovery_limit, grandfather_cutoff from public.app_settings;

-- 6. Sighting photo bucket limits (0013 sets 8 MiB and jpeg/png/webp).
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id='sighting-photos';

-- 7. Row counts, to compare against the checkpoint before and after any change.
select (select count(*) from public.discoveries) discoveries, (select count(*) from public.sightings) sightings,
       (select count(*) from public.profiles) profiles, (select count(*) from public.seed_shelf) seed_shelf,
       (select count(*) from public.species_packets) species_packets, (select count(*) from auth.users) users;

-- 8. Any existing row the 0013 CHECKs would have refused (they are NOT VALID, so old rows stay but stop scoring).
select 'discoveries' t, count(*) from public.discoveries where not public.is_catalogue_herb(herb_id)
union all select 'sightings', count(*) from public.sightings where not public.is_catalogue_herb(herb_id);
-- (run query 8 only if 0013 is applied; it calls a 0013 function)
```

### 3d. Functions: which are deployed and which version

`release-checkpoint.yml` prints `GET /v1/projects/{ref}/functions` (slug, version, status). Expected set for V1: `identify-plant`,
`herbdex-action`, `seed-packet`, `delete-account`, `redeem-deck-code`. `challenge-submit` should be **absent**. Then
`function-identity.yml` answers whether each deployed body matches this checkout. In particular, `docs/leaderboard-production-checklist.md`
says the deployed `identify-plant` still enforced **30 signed-in / 5 signed-out** scans a day while the repo enforces **10 / 5** and
`src/lib/scan-allowance.ts` (the client copy) says 10. If production still says 30, a player is told 10 and the function allows 30;
the global cap (450) still bounds provider spend either way.

## 4. Ordered steps

Each step names who acts. **NOT EXECUTED** applies to every row.

| # | Step | Actor | Gate | Rollback |
|---|---|---|---|---|
| 1 | Run section 3 in full; paste results into the PR/issue | **OWNER** | none | read-only |
| 2 | Decide G4 (photo consent) and G5 (board/integrity). Agree V1 scope in writing | **OWNER** | G2 | n/a |
| 3 | Land G4: a UI-lane change adding the in-flow notice (QA F-08), reviewed by the owner | UI lane + **OWNER** | G1 | revert the PR on `integration` |
| 4 | Merge this QA PR and the gap-audit PR into `integration` | **OWNER merges** | G1, review | revert commit |
| 5 | Reconcile the one production-only commit (QA task 5): create the promotion PR as `integration -> claude/planning-session-61zwro`. If GitHub reports the branches diverged, merge production into `integration` with `git merge -s ours e3a5d4ed` in a PR (records the squash as merged, changes no file). | coordinator, **OWNER merges** | G1 | revert the merge |
| 6 | **Database first, before the frontend.** In order, one at a time, re-running 3b/3c after each: (a) any of 0006-0009 that 3b shows missing; (b) only if the board ships (G5): **0011, then 0013 immediately after** (0013 redefines 0011's function and needs its table), recording the time between them; if 0011 is already applied, apply 0013 alone. Dispatch `run-migration.yml` with `project_ref = vygiamigomwlvnwkryyl`, one file per run, ref = the promoted commit. Never 0010, 0012, 0014 or 0015. | **OWNER** | G2, G3, G6 | additive and fix-forward only (runbook line 141: do not roll back widening constraints). 0013's constraints are `NOT VALID`; `alter table ... drop constraint` is the manual undo, and the two dropped insert policies can be re-created from 0001 if a client genuinely needs them |
| 7 | **Functions second.** Dispatch `deploy-function.yml` for `herbdex-action`, `identify-plant`, `seed-packet`, `delete-account`, `redeem-deck-code` **individually**, not `all` (all would also deploy `challenge-submit`). Run `check-function-secrets.yml` first and `function-identity.yml` after. | **OWNER** | step 6 clean | redeploy the previous commit's function: dispatch the same workflow with `ref` = the old commit (functions are stateless) |
| 8 | **Frontend last.** Merge the promotion PR into `claude/planning-session-61zwro`. This IS the deploy (`deploy.yml` on push). Flags stay off; `deploy.yml` already pins `BOSS_FORMS: 'off'`. | **OWNER** | G1-G6, 6 and 7 verified | revert the merge commit on the production branch (a push, so it redeploys the previous site, ~minutes). A persisted-state rollback hazard is handled by QA finding F-02: an older build now keeps, rather than erases, a save it cannot read |
| 9 | Post-deploy: `check-live-site.yml` (asserts the bundle points at the production ref), then the manual 390px walkthrough in QA report section 1 against **plantdex.online** with a throwaway account the owner creates and deletes through `/profile`. | **OWNER** | step 8 | per step 8 |
| 10 | Record the checkpoint after: re-run `release-checkpoint.yml` and diff row counts against step 1 | **OWNER** | none | read-only |

Stop conditions at any step: a row count that fell, a 3c query that differs from expected, a `check-live-site` ref mismatch, or any
function error rate above the pre-release baseline. Stop, do not "fix forward" blindly; report.

## 5. What needs owner approval (nothing below may be done by an agent)

1. Any dispatch of `run-migration.yml`, `deploy-function.yml`, `deploy.yml` against production.
2. Merging into `claude/planning-session-61zwro` or into `integration`.
3. Applying 0011/0013 (G5 acceptance), and the decision never to apply 0010/0012/0014/0015 for V1.
4. The photo-consent copy and its placement (G4).
5. Setting or changing any function secret, `IDENTIFICATION_COMPARISON`, the auth settings, the redirect allow-list, or the paywall flag.
6. Turning on any `NEXT_PUBLIC_*` feature flag, ever. A flag is a UI switch and not an authorisation boundary; the server-side rule it
   gates must be approved separately (`docs/agent-workflow/decisions.md`: nothing competitive is active until the owner has reviewed the design).

## 6. NOT EXECUTED — declaration

No migration was run. No function was deployed or invoked. No workflow was dispatched. No production or test project was read. No credential was
used, requested or seen. Nothing was pushed to `integration` or `claude/planning-session-61zwro`; this work is a PR from `coord/v1-qa`
into `integration` awaiting the owner. The SQL in section 3 was **not executed anywhere**; it was checked only against the migration files
in this repository, so run it on TEST first if you want to see it parse.
