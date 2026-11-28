-- PRODUCTION DISCOVERY-SECURITY POSTURE CHECK. READ-ONLY.
-- Paste into the Supabase SQL editor of the project you want to inspect (production ref vygiamigomwlvnwkryyl, or TEST ref vgjehmwcpavflbfhbbrp).
-- Every statement is a SELECT against the catalogue or an aggregate count: it creates, alters and deletes nothing, reads no player's record,
-- and prints no secret. The output is safe to paste back.
--
-- It answers, in one table: is migration 0016 present (piece by piece), is enforcement ON, which triggers and policies guard `discoveries`,
-- who may call the claim function, and how many rows exist (aggregate counts only).

with probe as (
  select
    (to_regclass('public.discovery_enforcement') is not null)  as t_enforcement,
    (to_regclass('public.capture_sessions') is not null)       as t_sessions,
    (to_regclass('public.capture_receipts') is not null)       as t_receipts,
    (to_regclass('public.capture_image_digests') is not null)  as t_digests,
    (to_regclass('public.discovery_grandfathered') is not null) as t_grandfathered,
    (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('open_capture_session','claim_discovery','discovery_rules','consume_capture_session',
                          'issue_capture_receipts','release_capture_session','refund_scan_claim',
                          'prune_capture_artifacts','set_discovery_enforcement','capture_config')) as fn_0016_count,
    exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'confirm_scan')                            as has_0014_confirm_scan,
    (to_regclass('public.discoveries') is not null)                                                as t_discoveries
), sw as (
  select case when to_regclass('public.discovery_enforcement') is not null
              then ((xpath('/row/e/text()',
                     query_to_xml('select enforce as e from public.discovery_enforcement where singleton', false, true, '')))[1])::text
         end as enforcing
), trg as (
  select coalesce(string_agg(t.tgname || case when t.tgenabled = 'D' then ' (DISABLED)' else '' end, ', ' order by t.tgname), '(none)') as discoveries_triggers
    from pg_trigger t where t.tgrelid = to_regclass('public.discoveries') and not t.tgisinternal
), pol as (
  select coalesce(string_agg(p.policyname || ' [' || p.cmd || ' → ' || array_to_string(p.roles, ',') || ']', '; ' order by p.policyname), '(none)') as discoveries_policies
    from pg_policies p where p.schemaname = 'public' and p.tablename = 'discoveries'
), priv as (
  select
    case when to_regprocedure('public.claim_discovery(text)') is null then null
         else has_function_privilege('anon', 'public.claim_discovery(text)', 'execute') end          as anon_can_claim,
    case when to_regprocedure('public.claim_discovery(text)') is null then null
         else has_function_privilege('authenticated', 'public.claim_discovery(text)', 'execute') end as authenticated_can_claim,
    case when to_regprocedure('public.set_discovery_enforcement(boolean,timestamp with time zone,text)') is null then null
         else has_function_privilege('authenticated', 'public.set_discovery_enforcement(boolean,timestamp with time zone,text)', 'execute') end as clients_can_flip_switch
), counts as (
  select
    case when to_regclass('public.discoveries') is null then null
         else ((xpath('/row/c/text()', query_to_xml('select count(*) as c from public.discoveries', false, true, '')))[1])::text::int end as discoveries_rows,
    case when to_regclass('public.discovery_grandfathered') is null then null
         else ((xpath('/row/c/text()', query_to_xml('select count(*) as c from public.discovery_grandfathered', false, true, '')))[1])::text::int end as grandfathered_rows,
    case when to_regclass('public.capture_receipts') is null then null
         else ((xpath('/row/c/text()', query_to_xml('select count(*) as c from public.capture_receipts', false, true, '')))[1])::text::int end as receipt_rows
)
select
  probe.*, sw.enforcing, trg.discoveries_triggers, pol.discoveries_policies, priv.*, counts.*,
  case
    when not probe.t_discoveries then 'STOP: public.discoveries does not exist. Wrong project?'
    when probe.t_enforcement and probe.t_receipts and probe.fn_0016_count = 10 and sw.enforcing = 'true'
      then 'ENFORCING: new discoveries need a claimed receipt (or a grandfather row).'
    when probe.t_enforcement and probe.t_receipts and probe.fn_0016_count = 10
      then 'PRESENT BUT OFF: 0016 is installed and the switch is OFF. A signed-in player can still insert any card directly (no receipt needed).'
    when probe.t_enforcement or probe.t_receipts or probe.fn_0016_count > 0
      then 'PARTIAL: some 0016 objects exist and some do not. Do NOT enable anything; report this output.'
    else 'ABSENT: 0016 is not installed. Nothing stops a signed-in player from inserting any card into discoveries.'
  end as verdict
from probe, sw, trg, pol, priv, counts;
