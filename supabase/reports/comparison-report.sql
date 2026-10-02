-- PROVIDER COMPARISON REPORT
--
-- Read-only. Run in the Supabase SQL editor against the project comparison mode is enabled
-- on. Three queries: a side-by-side summary, the full candidate detail, and a tally.
--
-- WHAT JOINS THEM. `identify-plant` mints one `observation_id` per request and writes one
-- `identification_comparisons` row per provider under it; the client carries that same id
-- onto its own `scans` row as `identification_observation_id`. So the providers' answers and
-- what the player actually confirmed line up without any mutable column — which matters,
-- because neither table has an update policy and neither should.
--
-- A SCAN ROW ONLY EXISTS IF THE PLAYER WAS SIGNED IN AND THE CLIENT RECORDED ONE, so the
-- joins are LEFT: a comparison with no scan beside it is a real result (the identification
-- happened, nothing was confirmed), not a row to hide.


-- ── 1. SIDE BY SIDE ─────────────────────────────────────────────────────────
-- One row per observation: what each provider led with, whether they agreed, and what the
-- player confirmed. This is the query to read first.
select
  c.observation_id,
  min(c.created_at)                                              as at,
  max(c.top_scientific_name) filter (where c.provider = 'plantnet') as plantnet_top,
  max(c.top_probability)     filter (where c.provider = 'plantnet') as plantnet_p,
  max(c.top_rank)            filter (where c.provider = 'plantnet') as plantnet_rank,
  max(c.failure)             filter (where c.provider = 'plantnet') as plantnet_error,
  max(c.top_scientific_name) filter (where c.provider = 'plantid')  as plantid_top,
  max(c.top_probability)     filter (where c.provider = 'plantid')  as plantid_p,
  max(c.top_rank)            filter (where c.provider = 'plantid')  as plantid_rank,
  max(c.failure)             filter (where c.provider = 'plantid')  as plantid_error,
  -- Do the two leading answers name the same taxon at all?
  (max(c.top_scientific_name) filter (where c.provider = 'plantnet')
     = max(c.top_scientific_name) filter (where c.provider = 'plantid'))  as tops_agree,
  -- What Plantdex did with it. `outcome` is the matcher's own verdict; the confirmed
  -- columns are the candidate the player chose, which is not always the leading one.
  max(s.outcome)                       as scan_outcome,
  max(s.top_herb_id)                   as matched_card,
  max(s.confirmed_herb_id)             as confirmed_card,
  max(s.confirmed_scientific_name)     as confirmed_taxon,
  max(s.confirmed_probability)         as confirmed_p,
  max(s.confirmed_eligibility)         as confirmed_why,
  max(s.confirmed_species_confidence)  as confirmed_species_confidence
from public.identification_comparisons c
left join public.scans s
  on s.identification_observation_id = c.observation_id
group by c.observation_id
order by at desc;


-- ── 2. EVERY CANDIDATE, BOTH PROVIDERS ──────────────────────────────────────
-- The top five each provider returned, expanded one per row, with rank and probability.
-- `ordinality` is the provider's own ranking: 1 is what it led with.
select
  c.observation_id,
  c.created_at,
  c.provider,
  candidate.ordinality                        as position,
  candidate.value ->> 'scientificName'        as scientific_name,
  candidate.value ->> 'rank'                  as taxon_rank,
  (candidate.value ->> 'probability')::numeric as probability,
  c.failure
from public.identification_comparisons c
left join lateral jsonb_array_elements(c.candidates) with ordinality as candidate(value, ordinality)
  on true
order by c.observation_id, c.provider, candidate.ordinality;


-- ── 3. TALLY ────────────────────────────────────────────────────────────────
-- Enough to see whether a difference is real or one photograph. Read `observations` first:
-- a mean over three scans is not a finding.
select
  provider,
  count(*)                                             as observations,
  count(*) filter (where failure is not null)          as failures,
  count(*) filter (where top_scientific_name is null
                     and failure is null)              as answered_nothing,
  round(avg(top_probability) filter (where top_probability is not null), 3) as mean_top_probability,
  round(max(top_probability), 3)                       as best_top_probability,
  count(*) filter (where top_rank = 'species')         as top_was_species,
  count(*) filter (where top_rank is not null
                     and top_rank <> 'species')        as top_was_supra_specific
from public.identification_comparisons
group by provider
order by provider;
