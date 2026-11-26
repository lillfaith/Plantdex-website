-- V1 TEST PREFLIGHT. READ-ONLY. Paste into the TEST project's SQL editor (project ref vgjehmwcpavflbfhbbrp) and run.
-- It changes nothing: every statement is a SELECT against the catalogue. It reports which migrations are already present, so
-- no migration is applied (or re-applied) on a guess. Nothing here is secret; the output may be pasted back.
--
-- READ THE LAST COLUMN (`verdict`). It names the single next action for migration 0016 and stops you if anything below it is missing.
-- A missing 0014 is treated as UNEXPECTED DRIFT (it was applied to TEST on 2026-11-24), never as something to work around.

with probe as (
  select
    -- 0013 (leaderboard integrity): objects it introduces.
    (to_regprocedure('public.sighting_photo_exists(text)') is not null
       or exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'public' and p.proname = 'sighting_photo_exists'))        as has_0013,
    -- 0009 (atomic scan quota): claim_scan_pair.
    exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'claim_scan_pair')                      as has_0009,
    -- 0014 (confirm_scan).
    exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'confirm_scan')                         as has_0014,
    -- 0015 (expansion ids): NOT needed by V1. Reported only so you know.
    exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'is_permitted_herb')                    as has_0015,
    -- 0016 (capture enforcement), piece by piece, so a half-applied state is visible.
    (to_regclass('public.discovery_enforcement') is not null)                                   as t_enforcement,
    (to_regclass('public.capture_sessions') is not null)                                        as t_sessions,
    (to_regclass('public.capture_receipts') is not null)                                        as t_receipts,
    (to_regclass('public.scan_refunds') is not null)                                            as t_refunds,
    (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('open_capture_session','claim_discovery','discovery_rules','consume_capture_session',
                          'issue_capture_receipts','release_capture_session','refund_scan_claim',
                          'prune_capture_artifacts','set_discovery_enforcement','capture_config'))   as fn_0016_count
), sw as (
  -- The switch, read dynamically so the statement still PLANS when 0016's table does not exist yet.
  select case when to_regclass('public.discovery_enforcement') is not null
              then ((xpath('/row/e/text()',
                     query_to_xml('select enforce as e from public.discovery_enforcement where singleton', false, true, '')))[1])::text
         end as enforcing
)
select
  has_0009, has_0013, has_0014, has_0015,
  t_enforcement, t_sessions, t_receipts, t_refunds, fn_0016_count as fn_0016_of_10,
  sw.enforcing,
  case
    when not has_0009 or not has_0013 then
      'STOP: 0009/0013 are missing on this project. Do not apply 0016. Tell the coordinator before anything else.'
    when not has_0014 then
      'STOP - UNEXPECTED DRIFT: 0014 (confirm_scan) is MISSING. It was applied to this project on 2026-11-24 (workflow run 45328820311, success). Something has dropped it, or this is not the TEST project. Do not apply anything. Send this row to the coordinator.'
    when t_enforcement and t_sessions and t_receipts and t_refunds and fn_0016_count = 10 then
      'ALREADY APPLIED: 0016 is fully present. DO NOT re-run it. Go straight to the verification step.'
    when (t_enforcement or t_sessions or t_receipts or t_refunds or fn_0016_count > 0) then
      'STOP: 0016 is PARTLY present. Do not apply or re-apply anything. Send this row to the coordinator.'
    else
      'READY: 0016 is absent and its prerequisites (0009, 0013, 0014) are present. Apply 0016 (step B of the procedure).'
  end as verdict
from probe cross join sw;
