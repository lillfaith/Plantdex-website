# Production checklist: Field Board release

**Status: prepared, not started. Nothing in this document has been run against production.**
Every step marked **needs approval** requires the owner's explicit go-ahead; the rest is read-only.
It follows the shape of `docs/release-runbook.md` (checkpoint, migration, function, frontend, rollback).

## What is waiting to ship

| Item | Where it is | Production state |
| --- | --- | --- |
| Field Board UI (podium, rank strip, points consistency, tests) | development branch, commits `92cf450`, `29dd3e1`, `36a6507` and the commit after it | **not on the deploy branch** |
| `0011_leaderboard.sql` (table, RLS, `leaderboard_standings()`) | applied to the **test** project (`vgjehmwcpavflbfhbbrp`, run 30) | **not applied** to production (`vygiamigomwlvnwkryyl`) |
| `identify-plant`: 10 scans a day for everyone | source on the development branch | the deployed function still enforces 30 signed in and 5 signed out |
| Boss Forms (`0012`, `challenge-submit`, flags) | development branch | **out of scope here**, flags off, nothing to apply |

The frontend is safe to ship before the migration (the page says the board "is not switched on for
this project yet"), but a signed-in player cannot see standings until step 3 is done.

## Gate A: before anything is touched (owner tasks)

| Check | How | Pass condition |
| --- | --- | --- |
| Test-project credentials in `.env.local` | owner | present, pointing at the **test** ref only |
| Live two-account suite | `npm run verify:supabase` | all tests pass, including the 9 in `e2e/leaderboard.e2e.test.ts` (it refuses a production URL) |
| Shipping commit is green | `npm run verify` on that commit | tests, lint, typecheck, edge check and build all pass |
| Test project is awake | dashboard | status `ACTIVE_HEALTHY` (a paused free-tier project failed runs 27 to 29 before any SQL ran) |
| Showcase decision recorded | owner | "not in this release" unless a separate migration is approved |

## Step 0: checkpoint and rollback tag (read-only)

1. Confirm point-in-time recovery is enabled on production, or take an on-demand backup, and record its timestamp.
2. Tag what production serves today so a frontend rollback needs no archaeology:
   `git tag pre-field-board <deploy-branch-sha>` (the deploy branch is `claude/planning-session-61zwro`; today `8eca58e`).
3. Run `release-checkpoint.yml` (read-only; defaults to production) and keep its output as the "before" record.
4. Record the deployed version of `identify-plant` so step 5 can roll back.

## Step 1: rehearse on the test project (already done once)

`run-migration.yml` with `project_ref = vgjehmwcpavflbfhbbrp`, `migration = 0011_leaderboard.sql`
succeeded on 2026-11-12 (run 30, "Confirm the objects exist" passed). The migration is idempotent
(`if not exists`, guarded policies, `create or replace`), so re-running is safe. Re-run if the file changes.

## Step 2: production migration (**needs approval**)

1. Dispatch `run-migration.yml` with `project_ref = vygiamigomwlvnwkryyl`, `migration = 0011_leaderboard.sql`.
2. The workflow's own checks must pass: token present, token scoped to the ref, project `ACTIVE_HEALTHY`, apply, "Confirm the objects exist".
3. Verify the security shape in the SQL editor (read-only queries):

```sql
select relrowsecurity from pg_class where oid = 'public.leaderboard_participants'::regclass;      -- true
select policyname, cmd from pg_policies where tablename = 'leaderboard_participants' order by 1;   -- select, insert, delete only; no update
select has_function_privilege('anon', 'public.leaderboard_standings(text,integer)', 'execute');     -- false
select has_function_privilege('authenticated', 'public.leaderboard_standings(text,integer)', 'execute'); -- true
```

4. Run `release-checkpoint.yml` again and compare with step 0: the only difference should be the new table and function.

## Step 3: frontend (**needs approval**)

1. Fast-forward the deploy branch to the shipping commit and push (no merge commit).
2. Wait for "Deploy to GitHub Pages" and then "Check the live site". The live check asserts
   "These scores are provisional" on `/leaderboard/`; if it fails the page lost its honesty line.
3. A deploy that fails at `deploy-pages` with "Found 0 artifact(s)" is an artifact-indexing delay,
   not a code failure (see the commit that added the live check); re-run the workflow.
4. Hard-refresh the live site and open `/leaderboard`, `/herbdex` and `/garden` once.

## Step 4: smoke test with a real production account (**needs approval**, owner or a named test account)

| Action | Expected |
| --- | --- |
| Signed out, open `/leaderboard` | "Sign in to see the board"; no standings, no errors |
| Signed in, not joined | "Your points" says "Counted on this device"; join buttons visible |
| Join the board | within a moment your row appears; the rank strip shows your place and "N pts to reach ...". "Your points" now says "Counted by the board" |
| Compare | the points on the page equal the points on `/profile`-derived counts (species x 50, first journal entry per species x 15, collection and seasonal challenges x 100) |
| Leave the board | your row disappears for everybody; "Your points" returns to device counts |
| Second account | cannot see the first's profile, notes, photos or ids; sees only name, region, counts and points |

## Step 5: `identify-plant`, 10 scans a day (**separate approval**)

Independent of the board. `deploy-function.yml`, `project_ref = vygiamigomwlvnwkryyl`, function `identify-plant`.
After it: a signed-out scan reports `limit: 10`, and `GLOBAL_DAILY_LIMIT` (450) is unchanged. At 10 scans per
device, 45 anonymous devices can use the shared day's allowance, so watch the first week of use.
Until this step is done the site shows "of 10" while the server still enforces 5 signed out and 30 signed in.

## Rollback

| Layer | How | Note |
| --- | --- | --- |
| Frontend | reset the deploy branch to the `pre-field-board` tag and push | the board then returns to the previous page |
| Migration | none required: the change is additive and the page degrades to "not switched on" if the function is absent | removing it needs a deliberate approval; the SQL would be `drop function public.leaderboard_standings(text, integer); drop table public.leaderboard_participants;` (data loss: only the opt-in rows) |
| `identify-plant` | redeploy the version recorded in step 0 | limits revert with it |

## Privacy and compliance checks already automated

- Return signature pinned (`leaderboard-schema.test.ts`), and the live suite lists the exact columns.
- `leaderboard_participants` is in the account export and in `USER_TABLES` for deletion (`account-security.test.ts`).
- `/privacy` describes the board, and `legal.test.ts` fails if the denial returns.
- Board scores are labelled provisional on the page and asserted by the live-site check.

## Open items (owner)

1. Test-project credentials (Gate A).
2. Approvals for steps 2, 3, 4 and 5, each separately.
3. Whether a cosmetics showcase is wanted (`docs/leaderboard-showcase-proposal.md`).
4. One launched region (`us-ga`): the regional board will look empty until a second launches.
