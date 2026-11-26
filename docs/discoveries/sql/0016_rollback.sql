-- 0016_rollback.sql   (TEST project only; run by the owner)
--
-- Puts the database back to "0016 never mattered" WITHOUT deleting a single player record:
--   * enforcement is switched OFF first, so every direct write works as it did before 0016;
--   * the gate triggers and the new callable functions are dropped;
--   * every TABLE and COLUMN 0016 added is KEPT, with its rows: capture_sessions, capture_image_digests,
--     capture_receipts, discovery_grandfathered, discovery_enforcement, discoveries.recorded_at.
--     They are inert (no trigger, no function reads them, no client has a policy to write them), and
--     re-applying 0016 later finds them and carries on, with the player's receipts intact.
--   * deleting those tables is a SEPARATE, explicit owner decision, to be taken only after an export.
-- Idempotent. Safe to run when 0016 was never applied (every statement is guarded).

begin;

select pg_catalog.set_config('plantdex.enforcement_via_fn', 'on', true);
do $$
begin
  if to_regclass('public.discovery_enforcement') is not null then
    update public.discovery_enforcement set enforce = false, changed_at = pg_catalog.now() where singleton;
  end if;
end $$;

drop trigger if exists discoveries_capture_gate_trg on public.discoveries;
drop trigger if exists learned_requires_discovery_trg on public.learned;
drop trigger if exists mastered_requires_discovery_trg on public.mastered;

drop function if exists public.discoveries_capture_gate();
drop function if exists public.progress_requires_discovery();
drop function if exists public.set_discovery_enforcement(boolean, timestamptz, text);
drop function if exists public.claim_discovery(text);
drop function if exists public.open_capture_session();
drop function if exists public.consume_capture_session(uuid, uuid, text, text, text[]);
drop function if exists public.issue_capture_receipts(uuid, uuid, jsonb);
drop function if exists public.prune_capture_artifacts();
drop function if exists public.release_capture_session(uuid, uuid);
drop function if exists public.refund_scan_claim(text, date);
drop function if exists public.discovery_rules();
drop function if exists public.capture_config();

commit;
