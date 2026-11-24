# Migration 0014 (`confirm_scan`): independent review, TEST-only apply plan, rollback

**Status: DRAFT. NOT APPLIED ANYWHERE. Nothing here is authorised by approval of any UI work.** Applying a migration to any
database needs the owner's explicit approval of THIS change. Production is out of scope of this document: it needs its own
approval, and would run from the release repository.

## What it is
`supabase/migrations/0014_confirm_scan.sql`: one `SECURITY DEFINER` function that sets a scan's six `confirmed_*` columns once, as
`auth.uid()`, only while `confirmed_herb_id is null`; same card again returns true (safe retry), another card false. It adds no
update policy, so scan history stays write-once. It replaces the client's DELETE-then-INSERT, which can lose the row (PR #41 review).

## Independent review (2026-11-24): APPROVE WITH CHANGES, changes applied
A reviewer who did not write the SQL read it and ran it against a throwaway PostgreSQL 16 cluster (minimal `auth` schema, Supabase-style
default grants, 0002 + 0006 applied verbatim, then 0014).
- Held: owner-scoped (foreign and unknown scan ids return false), write-once, idempotent, anonymous callers get "permission denied",
  signed-in callers reach it, no dynamic SQL, rollback (`drop function`) is complete.
- **Defect found and fixed:** a NULL (or blank) card id matched `confirmed_herb_id is null`, wrote junk into the evidence columns and
  returned TRUE. A guard now returns false before any write; the schema test pins that the guard precedes the update.
- Hardening applied: `set search_path = ''` (the 0013 pattern; every reference is qualified), and an out-of-range probability returns
  false instead of raising or being rounded.
- Known and accepted: rank / eligibility / confidence strings have no CHECK in the schema (nothing here changes that); real
  two-session concurrency and PostgREST itself were reasoned about, not executed. The live suite below covers both on TEST.
- Write-once is not a defence against the account owner: the existing delete and insert policies already let a player rewrite their own
  rows. This function fixes atomicity and accidental overwrite, not malice.

## TEST-only apply plan (needs the owner's go-ahead; production untouched)
Preconditions: PR #43 reviewed; owner approval recorded in the PR; the TEST project is `vgjehmwcpavflbfhbbrp`; the app repo's
`SUPABASE_ACCESS_TOKEN` is limited to that project (verified by the production check that failed as intended).
1. Owner dispatches **Run a Supabase migration** (`run-migration.yml`) from branch `coord/confirm-scan-rpc`, project **test**
   (`vgjehmwcpavflbfhbbrp`), migration `0014_confirm_scan.sql`. Coordinators and agents do not dispatch workflows.
2. Verify read-only (SQL editor, TEST project): the function exists, is `SECURITY DEFINER`, `proconfig` shows `search_path=""`, and
   `has_function_privilege` is false for `anon`, true for `authenticated`.
3. Live behaviour on TEST with disposable accounts only (a later scan-lane PR adds these cases to `e2e/supabase.e2e.test.ts`; run through
   the existing live-suite workflow, TEST only):
   confirm once -> true and columns set; same card again -> true, unchanged; different card -> false, unchanged; another user's scan id
   -> false; unknown id -> false; anon -> refused; null and blank card id -> false and the row untouched; probability 1.5 -> false;
   two parallel confirmations of different cards -> exactly one wins and the row is never unconfirmed afterwards; the other columns
   (`top_scientific_name`, `confidence`, `created_at`, `photo_path`, `outcome`) are identical before and after.
4. Only after 1-3 pass: ask the owner whether to prepare the client change (scan lane): call `rpc('confirm_scan')`, fall back to the
   existing mitigation on `PGRST202` / `42883` (function missing), and treat any RPC error as failure, never as "false means already
   confirmed". No client change ships before the function exists on the target database.

## Rollback (TEST)
Nothing depends on the function until the client calls it, so rollback is one statement, run in the TEST project's SQL editor:
```sql
drop function if exists public.confirm_scan(text, text, text, numeric, text, text, text);
```
Then confirm `pg_proc` has no `confirm_scan` and that the app's existing confirm path (PR #41's mitigation) still works. Grants go with
the function; the migration adds no table, column, policy, comment or index, so there is nothing else to undo.

## Production
Not planned here. After TEST passes and the owner approves separately: the same file would be applied by the release repository's
`run-migration` workflow (production environment, owner approval, token limited to production), with the same one-statement rollback.
