-- TEST PROJECT ONLY (ref vgjehmwcpavflbfhbbrp). NEVER run this on production.
-- Removes the disposable accounts created by the live suites (e2e/scans-confirm.e2e.test.ts and e2e/supabase.e2e.test.ts).
-- Their scans and other rows go with them (foreign keys cascade). Run STEP 1 first and read the list.

-- REVIEWED 2026-11-25: the pattern below matches exactly the accounts the live suites create (e2e/supabase, scans-confirm, integrity,
-- boss-form, leaderboard all use `plantdex-e2e-<tag>-<stamp>@mailinator.com`) and nothing else: the disposable comparison accounts
-- minted by the "Mint a disposable TEST account" workflow use other addresses and are NOT matched. It still needs the project check
-- and the STEP 1 preview: read the list before deleting.
--
-- STEP 1: preview. Every row must look like a throwaway; nothing here should be a real person.
select id, email, created_at
from auth.users
where email like 'plantdex-e2e-%@mailinator.com'
order by created_at;

-- STEP 2: delete exactly what STEP 1 showed (uncomment, then run).
-- delete from auth.users where email like 'plantdex-e2e-%@mailinator.com';
