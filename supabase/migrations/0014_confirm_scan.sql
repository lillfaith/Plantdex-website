-- 0014_confirm_scan.sql
--
-- WHY: confirming a scan used to be DELETE then INSERT from the client, because `scans` has no
-- update policy by design (0002: "a scan is a record of something that happened"). Two calls with no
-- transaction leave a window in which a dropped connection loses the player's scan-history row, and
-- a second confirmation racing the first can overwrite it. A client cannot close that window; the
-- database can.
--
-- WHAT THIS DOES: one function that sets the `confirmed_*` columns of ONE scan, exactly once, as the
-- caller. It is the only write path that changes a scan row after insertion. It does NOT add an
-- update policy: the table still grants no UPDATE to any client, which is what keeps history
-- write-once (profile-schema.test.ts pins that no other migration grants one).
--
--   * Ownership: the row must belong to auth.uid(). A foreign or unknown scan id changes nothing.
--   * Write-once: only a row whose confirmed_herb_id is still null is updated, so a late or repeated
--     confirmation cannot overwrite an earlier one. Confirming the SAME card again returns true
--     (a retry after a lost response must succeed), a DIFFERENT card returns false.
--   * Nothing else on the row can change: top_scientific_name, confidence, created_at, photo_path,
--     outcome and the identification columns are not parameters.
--   * The table's existing CHECK constraints still apply to the updated values.
--   * Execute is granted to `authenticated` only; anon and public cannot call it.
--
-- NOT ACTIVE BY MERGING. The client keeps its current path until a separate, owner-approved change
-- calls this function (with a fallback for databases that have not run this migration).

create or replace function public.confirm_scan(
  p_scan_id text,
  p_herb_id text,
  p_scientific_name text,
  p_probability numeric,
  p_taxon_rank text,
  p_eligibility text,
  p_species_confidence text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  if auth.uid() is null then
    return false;
  end if;

  -- A missing or blank card id must never "confirm" a scan: with a null herb id the update below
  -- would match (confirmed_herb_id is null), blank the evidence columns and report success while
  -- the row stayed unconfirmed. An out-of-range probability is refused here rather than surfacing
  -- as a constraint error or being rounded.
  if p_scan_id is null
     or p_herb_id is null
     or pg_catalog.btrim(p_herb_id) = ''
     or (p_probability is not null and (p_probability < 0 or p_probability > 1)) then
    return false;
  end if;

  update public.scans
     set confirmed_herb_id = p_herb_id,
         confirmed_scientific_name = p_scientific_name,
         confirmed_probability = p_probability,
         confirmed_taxon_rank = p_taxon_rank,
         confirmed_eligibility = p_eligibility,
         confirmed_species_confidence = p_species_confidence
   where id = p_scan_id
     and user_id = auth.uid()
     and confirmed_herb_id is null;

  get diagnostics changed = row_count;
  if changed = 1 then
    return true;
  end if;

  -- Already confirmed: success only if it was this same card (idempotent retry).
  return exists (
    select 1 from public.scans
     where id = p_scan_id
       and user_id = auth.uid()
       and confirmed_herb_id = p_herb_id
  );
end;
$$;

revoke all on function public.confirm_scan(text, text, text, numeric, text, text, text)
  from public, anon;
grant execute on function public.confirm_scan(text, text, text, numeric, text, text, text)
  to authenticated;
