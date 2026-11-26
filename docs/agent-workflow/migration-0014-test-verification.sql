-- Migration 0014 (confirm_scan): TEST-ONLY verification. READ THE HEADER BEFORE RUNNING.
--
-- RUN ONLY in the Supabase SQL editor of the TEST project (ref vgjehmwcpavflbfhbbrp). NEVER production.
-- Do not edit it to point anywhere else. It is NOT a migration and is not under supabase/migrations/.
--
-- SAFE BY CONSTRUCTION: everything runs inside one DO block that ends by raising an exception, so
-- Postgres rolls back every row it created (two throwaway users and their scans). It leaves no data.
-- The "error" at the end is the report: it starts with RESULT and lists PASS/FAIL per check.
-- Copy that text back to the coordinator. Zero FAIL lines and "ALL PASSED" means success.
--
-- What it covers: catalog (SECURITY DEFINER, empty search_path, grants, no UPDATE policy), anon refused,
-- no-identity refused, ownership, write-once, idempotent retry, bad input, untouched columns.
-- What it CANNOT cover (needs two real sessions): true concurrency. That is the live-suite case.

do $verify$
declare
  ua uuid := gen_random_uuid();
  ub uuid := gen_random_uuid();
  r  boolean;
  n  integer;
  before_row jsonb;
  after_row  jsonb;
  out text := '';
  fails integer := 0;

  procedure_note text;
begin
  -- helper-less on purpose: a small inline pattern keeps this script one self-contained block.

  -- ---- catalog ----
  perform 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace
   where s.nspname = 'public' and p.proname = 'confirm_scan' and p.prosecdef;
  if found then out := out || E'\nPASS function exists and is SECURITY DEFINER';
  else out := out || E'\nFAIL function missing or not SECURITY DEFINER'; fails := fails + 1; end if;

  perform 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace
   where s.nspname = 'public' and p.proname = 'confirm_scan'
     and exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%');
  if found then out := out || E'\nPASS search_path is pinned'; else out := out || E'\nFAIL search_path not pinned'; fails := fails + 1; end if;

  if not has_function_privilege('anon', 'public.confirm_scan(text,text,text,numeric,text,text,text)', 'execute')
     and has_function_privilege('authenticated', 'public.confirm_scan(text,text,text,numeric,text,text,text)', 'execute') then
    out := out || E'\nPASS anon cannot execute, authenticated can';
  else out := out || E'\nFAIL grants wrong'; fails := fails + 1; end if;

  select count(*) into n from pg_policies where schemaname = 'public' and tablename = 'scans' and cmd in ('UPDATE', 'ALL');
  if n = 0 then out := out || E'\nPASS scans has no UPDATE (or ALL) policy';
  else out := out || E'\nFAIL scans has an update-capable policy'; fails := fails + 1; end if;

  -- ---- fixtures (rolled back) ----
  insert into auth.users (id, aud, role, email) values
    (ua, 'authenticated', 'authenticated', 'confirm-scan-a-' || ua || '@example.invalid'),
    (ub, 'authenticated', 'authenticated', 'confirm-scan-b-' || ub || '@example.invalid');
  insert into public.scans (id, user_id, outcome, top_scientific_name, confidence) values
    ('t_s1', ua, 'matched', 'Taraxacum officinale', 0.9),
    ('t_s2', ua, 'matched', 'Plantago major', 0.8),
    ('t_s3', ua, 'uncertain', 'Achillea millefolium', 0.5),
    ('t_s4', ua, 'matched', 'Trifolium repens', 0.7);

  -- ---- anon is refused ----
  begin
    set local role anon;
    perform public.confirm_scan('t_s1', 'x', 'X', 0.5, 'species', 'exact', 'exact');
    reset role;
    out := out || E'\nFAIL anon was able to call the function'; fails := fails + 1;
  exception when insufficient_privilege then
    reset role;
    out := out || E'\nPASS anon refused (permission denied)';
  end;

  -- ---- signed in as A ----
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;

  select to_jsonb(s) - 'confirmed_herb_id' - 'confirmed_scientific_name' - 'confirmed_probability'
         - 'confirmed_taxon_rank' - 'confirmed_eligibility' - 'confirmed_species_confidence'
    into before_row from public.scans s where id = 't_s1';

  r := public.confirm_scan('t_s1', 'taraxacum-officinale', 'Taraxacum officinale', 0.9, 'species', 'exact', 'exact');
  if r is true then out := out || E'\nPASS first confirmation returns true'; else out := out || E'\nFAIL first confirmation'; fails := fails + 1; end if;
  perform 1 from public.scans where id = 't_s1' and confirmed_herb_id = 'taraxacum-officinale' and confirmed_taxon_rank = 'species';
  if found then out := out || E'\nPASS confirmed columns written'; else out := out || E'\nFAIL confirmed columns not written'; fails := fails + 1; end if;

  select to_jsonb(s) - 'confirmed_herb_id' - 'confirmed_scientific_name' - 'confirmed_probability'
         - 'confirmed_taxon_rank' - 'confirmed_eligibility' - 'confirmed_species_confidence'
    into after_row from public.scans s where id = 't_s1';
  if before_row = after_row then out := out || E'\nPASS no non-confirmed column changed (created_at, confidence, outcome, photo_path, top_*)';
  else out := out || E'\nFAIL another column changed'; fails := fails + 1; end if;

  r := public.confirm_scan('t_s1', 'taraxacum-officinale', 'Taraxacum officinale', 0.9, 'species', 'exact', 'exact');
  if r is true then out := out || E'\nPASS same card again returns true (idempotent retry)'; else out := out || E'\nFAIL idempotent retry'; fails := fails + 1; end if;

  r := public.confirm_scan('t_s1', 'plantago-major', 'Plantago major', 0.9, 'species', 'exact', 'exact');
  if r is false then out := out || E'\nPASS different card returns false'; else out := out || E'\nFAIL different card accepted'; fails := fails + 1; end if;
  perform 1 from public.scans where id = 't_s1' and confirmed_herb_id = 'taraxacum-officinale';
  if found then out := out || E'\nPASS write-once: original confirmation unchanged'; else out := out || E'\nFAIL confirmation was overwritten'; fails := fails + 1; end if;

  r := public.confirm_scan('t_nope', 'x', 'X', 0.5, 'species', 'exact', 'exact');
  if r is false then out := out || E'\nPASS unknown scan id returns false'; else out := out || E'\nFAIL unknown id'; fails := fails + 1; end if;

  r := public.confirm_scan('t_s2', null, 'X', 0.5, 'species', 'exact', 'exact');
  if r is false then out := out || E'\nPASS null card id returns false'; else out := out || E'\nFAIL null card id'; fails := fails + 1; end if;
  r := public.confirm_scan('t_s2', '   ', 'X', 0.5, 'species', 'exact', 'exact');
  if r is false then out := out || E'\nPASS blank card id returns false'; else out := out || E'\nFAIL blank card id'; fails := fails + 1; end if;
  r := public.confirm_scan('t_s2', 'plantago-major', 'Plantago major', 1.5, 'species', 'exact', 'exact');
  if r is false then out := out || E'\nPASS probability 1.5 returns false'; else out := out || E'\nFAIL probability 1.5'; fails := fails + 1; end if;
  r := public.confirm_scan('t_s2', 'plantago-major', 'Plantago major', -0.1, 'species', 'exact', 'exact');
  if r is false then out := out || E'\nPASS probability -0.1 returns false'; else out := out || E'\nFAIL probability -0.1'; fails := fails + 1; end if;
  perform 1 from public.scans where id = 't_s2' and confirmed_herb_id is null;
  if found then out := out || E'\nPASS rejected inputs left the row unconfirmed'; else out := out || E'\nFAIL a rejected input changed the row'; fails := fails + 1; end if;

  -- direct UPDATE from a client must still be impossible
  begin
    update public.scans set confirmed_herb_id = 'hacked' where id = 't_s3';
    get diagnostics n = row_count;
    if n = 0 then out := out || E'\nPASS direct UPDATE changed no rows';
    else out := out || E'\nFAIL direct UPDATE changed a row'; fails := fails + 1; end if;
  exception when insufficient_privilege then
    out := out || E'\nPASS direct UPDATE refused';
  end;

  -- ---- signed in as B: cannot touch A's scan ----
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ub::text, true);
  r := public.confirm_scan('t_s3', 'achillea-millefolium', 'Achillea millefolium', 0.5, 'species', 'exact', 'exact');
  reset role;
  if r is false then out := out || E'\nPASS another user cannot confirm this scan (returns false)'; else out := out || E'\nFAIL cross-user confirm returned true'; fails := fails + 1; end if;
  perform 1 from public.scans where id = 't_s3' and confirmed_herb_id is null;
  if found then out := out || E'\nPASS cross-user attempt left the row untouched'; else out := out || E'\nFAIL cross-user attempt changed the row'; fails := fails + 1; end if;

  -- ---- no identity at all ----
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  set local role authenticated;
  r := public.confirm_scan('t_s4', 'trifolium-repens', 'Trifolium repens', 0.7, 'species', 'exact', 'exact');
  reset role;
  if r is false then out := out || E'\nPASS no auth.uid() returns false'; else out := out || E'\nFAIL no-identity call returned true'; fails := fails + 1; end if;

  out := out || E'\n' || case when fails = 0 then 'ALL PASSED' else fails || ' FAILED' end;
  -- Raising here is what rolls everything back. This is the report, not a fault.
  raise exception 'RESULT:%', out;
end
$verify$;
