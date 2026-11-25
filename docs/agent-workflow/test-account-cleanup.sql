-- TEST PROJECT ONLY (ref vgjehmwcpavflbfhbbrp). NEVER run this on production.
-- Removes the disposable accounts created by the live suites (e2e/scans-confirm.e2e.test.ts and e2e/supabase.e2e.test.ts).
-- Their scans and other rows go with them (foreign keys cascade). Run STEP 1 first and read the list.

-- STEP 1: preview. Every row must look like a throwaway; nothing here should be a real person.
select id, email, created_at
from auth.users
where email like 'plantdex-e2e-%@mailinator.com'
order by created_at;

-- STEP 2: delete exactly what STEP 1 showed (uncomment, then run).
-- delete from auth.users where email like 'plantdex-e2e-%@mailinator.com';
