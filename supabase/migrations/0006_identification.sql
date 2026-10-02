-- IDENTIFICATION V2 — what the plant was identified AS, and which provider said so.
--
-- Three additive changes, no rewrite of anything that already exists. Nothing here
-- backfills a value, and nothing here is required by any existing code path: every column
-- added is nullable, and every row already stored stays exactly as it is. A sighting with
-- no observed taxon means Plantdex never knew one, and inventing one retroactively would be
-- fabricating a botanical record.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY A CARD ID IS NOT A TAXON, which is the whole reason this migration exists.
--
-- `sightings.herb_id` is a CARD. A Plantdex card may legitimately accept more than one
-- taxon — Goldenrod accepts the genus while its accepted species are curated, the Dandelion
-- card accepts `Taraxacum sect. Taraxacum` under either of that section's two published
-- names — so `herb_id` answers "which card did this qualify for" and cannot answer "what was
-- this plant". Before these columns, an observation of *Solidago altissima* that qualified
-- for the Goldenrod card was stored as `solidago-canadensis` and the real taxon survived
-- nowhere the player could see: the card had silently become the record of the plant.
--
-- So the observed taxon is stored BESIDE the card, never instead of it, and the provider's
-- own string is stored beside the cleaned one. `normalizeName` in `src/lib/plant-match.ts`
-- is a LOOKUP key — it drops authorship, folds synonymous section names together, and its
-- rules are free to change — so a column derived from it would silently rewrite history the
-- next time those rules moved. `observed_taxon_provider_name` is the historical record;
-- everything else is derived from it and may be recomputed.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- RLS FOLLOWS 0001 AND 0002 UNCHANGED: select / insert / delete as separate policies, and
-- NO UPDATE POLICY on the new table. `for all` silently includes update. A record of what an
-- identifier said on a given day is history, not a preference; `profiles` (0003) remains the
-- one deliberately mutable table in this project.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. THE OBSERVED TAXON, ON A SIGHTING
--
-- Four nullable columns. They are absent from every sighting logged by hand from a card
-- page, because that path involves no identifier at all and there is nothing to record —
-- which is also why `isSighting` in `src/lib/sightings.ts` deliberately does not require
-- them. Guard what you dereference unconditionally; never guard what is legitimately
-- absent.
-- ─────────────────────────────────────────────────────────────────────────────

-- The provider's string EXACTLY as returned, authorship and all. The historical record.
alter table public.sightings add column if not exists observed_taxon_provider_name text;
-- The tidied identity at the time of recording: authorship dropped, and EVERYTHING that
-- narrows the name kept — the infraspecific rank and the hybrid sign both. Derived, and safe
-- to recompute, which the key below is not a substitute for: `Mentha × piperita` and
-- `Plantago major subsp. intermedia` both key to something that is a different taxon.
alter table public.sightings add column if not exists observed_taxon_name text;
/*
 * THE MATCHING KEY, STORED BECAUSE IT IS A DIFFERENT FACT FROM EITHER NAME ABOVE.
 *
 * It is what `normalizeName` produced for this observation, which is how the card was found.
 * Kept so a row can answer "why did this reach that card" years later, after the normaliser's
 * rules have moved — recomputing it from the provider name would answer with TODAY's rules
 * and quietly rewrite the reason. It is never the identity: it has no hybrid sign, no
 * authorship and no infraspecific rank.
 */
alter table public.sightings add column if not exists observed_taxon_key text;
/*
 * WHY the observation qualified for `herb_id`: `exact`, `acceptedGroup`, `genusCard`,
 * `legacyGenus`. Without it a row cannot distinguish "this IS the card's species" from "the
 * card was declared broad enough to accept it", which is the whole difference between a
 * Solidago canadensis find and a Solidago altissima one on the Goldenrod card.
 */
alter table public.sightings add column if not exists eligibility text
  check (
    eligibility is null
    or eligibility in ('exact', 'acceptedGroup', 'genusCard', 'legacyGenus', 'ambiguous', 'related', 'none')
  );
-- Which service named it. A deployment setting, not a fact about the person.
alter table public.sightings add column if not exists identification_provider text;
-- `species`, `section`, `genus`, … — so a section stays a section. A supra-specific taxon
-- must never be readable back as an exact species identification.
-- The list is EXACTLY `TaxonRank` in `src/lib/card-coverage.ts`, and
-- `identification-schema.test.ts` fails if the two drift. A constraint that omits a real
-- rank does not degrade gracefully: it REFUSES the insert, so a subsection observation would
-- be rejected outright and the sighting lost — the opposite of what a check is for here.
alter table public.sightings add column if not exists observed_taxon_rank text
  check (
    observed_taxon_rank is null
    or observed_taxon_rank in (
      -- Above the species: none of these says WHICH species.
      'genus', 'subgenus', 'section', 'subsection', 'series',
      'species',
      -- Below the species: each resolves the species and narrows it further.
      'subspecies', 'variety', 'form',
      -- The conservative failure. An unhandled qualifier is never promoted to `species`.
      'unknown'
    )
  );
-- Strength of the SPECIES-level identification, which is not the provider's score: a
-- section named with 0.99 confidence is still `unresolved` at species rank.
alter table public.sightings add column if not exists species_confidence text
  check (
    species_confidence is null
    or species_confidence in ('high', 'moderate', 'low', 'unresolved')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. WHICH OBSERVATION A SCAN BELONGED TO
--
-- One nullable column, and it is what makes the comparison table below joinable without any
-- mutable state. `identify-plant` mints an observation id per request and returns it; the
-- client stores it on its own scan row when it writes one. The card the player later
-- confirms is already on `scans.confirmed_herb_id`, so "did this provider's top answer match
-- what the player actually confirmed?" is a join rather than a column somebody has to go
-- back and update — which matters, because there is no update policy to do it with.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.scans add column if not exists identification_observation_id uuid;
alter table public.scans add column if not exists provider text;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2b. THE CANDIDATE THE PLAYER CHOSE IS NOT THE CANDIDATE THE PROVIDER LED WITH
--
-- `top_scientific_name` and `confidence` describe the provider's FIRST candidate.
-- `confirmed_herb_id` describes the card the player tapped. Those were the only two facts
-- the row held, and a player who scrolls past the leading answer and confirms the fourth one
-- produced a row that reads as though the leading answer were what they confirmed:
--
--     top_scientific_name = Oxalis dillenii      (0.41, the provider's best guess)
--     confirmed_herb_id   = oxalis-stricta       (Wood Sorrel, from a 0.09 candidate)
--
-- Nothing in that row says `Oxalis dillenii` was rejected. Read back — by the journal, by an
-- export, by anyone evaluating the identifier — it attributes a taxon to the player that they
-- explicitly did not choose. The selection is its own set of facts and is stored as such.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.scans add column if not exists confirmed_scientific_name text;
alter table public.scans add column if not exists confirmed_probability numeric(4, 3)
  check (
    confirmed_probability is null
    or (confirmed_probability >= 0 and confirmed_probability <= 1)
  );
alter table public.scans add column if not exists confirmed_taxon_rank text;
alter table public.scans add column if not exists confirmed_eligibility text;
alter table public.scans add column if not exists confirmed_species_confidence text;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PROVIDER COMPARISON — telemetry, off by default, allow-listed by user id.
--
-- Plantdex can be pointed at PlantNet or at plant.id (Kindwise). Choosing between them on
-- anything but anecdote needs both answers to the SAME photographs, so comparison mode asks
-- both and records what each said. It is off unless `IDENTIFICATION_COMPARISON=on` AND the
-- caller's id appears in `IDENTIFICATION_COMPARISON_USER_IDS` — an explicit allow-list of
-- accounts belonging to whoever is running the evaluation, never a sample of the public.
--
-- WHAT IS DELIBERATELY NOT HERE. No photograph, no photo path, no IP, no quota bucket, no
-- location, and no candidate field beyond the name, its rank and its score. The images are
-- transmitted once and dropped, exactly as an ordinary scan's are; this table holds the
-- ANSWERS, which is all a comparison needs.
--
-- It is user-scoped, so it is user data: it is in the export, it is in `USER_TABLES`, and it
-- goes with the account. Telemetry somebody cannot download or delete is not telemetry, it
-- is a record kept about them.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.identification_comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),

  -- Shared by every row from one request, so the providers' answers to one set of
  -- photographs line up. Also what `scans.identification_observation_id` points at.
  observation_id uuid not null,

  provider text not null check (provider in ('plantnet', 'plantid')),

  -- The provider's own top answer, untouched. Null when it returned nothing, which is a
  -- real and interesting result rather than a failed row.
  top_scientific_name text,
  top_rank text,
  top_probability numeric(4, 3)
    check (top_probability is null or (top_probability >= 0 and top_probability <= 1)),

  -- The ranked list, as `[{ "scientificName": ..., "rank": ..., "probability": ... }]`.
  -- Capped by the function, not by the column: a jsonb with no ceiling is an unbounded
  -- write surface on a table a client can insert into.
  candidates jsonb not null default '[]'::jsonb,

  -- Set when the provider answered but could not be used: `auth`, `rateLimited`, `schema`,
  -- `network`. A comparison in which one side failed is the most useful kind to keep.
  failure text
);

create index if not exists identification_comparisons_user_created_idx
  on public.identification_comparisons (user_id, created_at desc);
create index if not exists identification_comparisons_observation_idx
  on public.identification_comparisons (observation_id);

alter table public.identification_comparisons enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'identification_comparisons'
      and policyname = 'own comparisons read'
  ) then
    create policy "own comparisons read" on public.identification_comparisons
      for select using (auth.uid() = user_id);
  end if;
end $$;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'identification_comparisons'
      and policyname = 'own comparisons insert'
  ) then
    create policy "own comparisons insert" on public.identification_comparisons
      for insert with check (auth.uid() = user_id);
  end if;
end $$;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'identification_comparisons'
      and policyname = 'own comparisons delete'
  ) then
    create policy "own comparisons delete" on public.identification_comparisons
      for delete using (auth.uid() = user_id);
  end if;
end $$;
-- Deliberately no update policy. See the header.
