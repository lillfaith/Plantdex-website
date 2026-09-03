-- SEED SHELF — species a player found that the deck does not have a card for.
--
-- ONE ROW PER SAVE, NOT ONE ROW PER SPECIES, and that is the whole design.
--
-- The shelf a player sees is these rows grouped by `species_key` (see `mergeFinds` in
-- src/lib/seed-shelf.ts): the earliest row's date is the first-found date, the count is the
-- encounter count, the highest score is the best confidence. Nothing is stored that a later
-- write would have to change, so this table needs NO UPDATE POLICY — which keeps 0003's
-- `profiles` the single, deliberate exception to the no-update rule, exactly as
-- `profile-schema.test.ts` requires.
--
-- The same shape is what makes promotion free. There is no `promoted` column: an entry has
-- grown into a card when the deck has a card for its species AND that card is in the
-- player's `discoveries`. Both facts already exist, so claiming a sprouted seed writes a
-- discovery through the ordinary idempotent reducer and touches this table not at all.
--
-- A SHELF ENTRY IS NOT A DISCOVERY. Nothing here is read by anything that awards XP, and no
-- progression value is stored on it. It is a record of something somebody photographed.

create table if not exists public.seed_shelf (
  -- text, not uuid: the client generates its own id in the same format as sightings and
  -- scans, so a find keeps its identity when a device's shelf is imported into an account.
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,

  -- IDENTITY IS TAXONOMIC. `species_key` is the normalised binomial ("bellis perennis") that
  -- `plant-match.ts` produces, so authorship, ranks and hybrid markers all collapse onto one
  -- key — and a common name, which can mean a dozen unrelated plants, is never a key at all.
  species_key text not null check (species_key <> '' and species_key like '% %'),
  scientific_name text not null,
  common_name text,

  -- Provider taxonomy identifiers, when the identification carried them. Kept so an entry
  -- can be recognised later against a source of truth rather than by string comparison.
  gbif_id text,
  powo_id text,

  found_at timestamptz not null default now(),
  confidence numeric(4, 3) check (confidence is null or (confidence >= 0 and confidence <= 1)),

  -- The scan this came from, and the photograph it kept, both scoped to this user exactly as
  -- a scan row is. Null when the scan was anonymous or no photo was stored.
  scan_id text,
  photo_path text

  -- NO PACKET COLUMN. The artwork is a property of the SPECIES, not of one player's find:
  -- it lives once in `public.species_packets` (0005), which every shelf reads. Storing a
  -- copy per row is what made two users able to hold different packets for one plant after
  -- a generator change — the first to save it kept version 1 while the next was handed a
  -- freshly generated version 2.
);

create index if not exists seed_shelf_user_species_idx
  on public.seed_shelf (user_id, species_key);

alter table public.seed_shelf enable row level security;

-- Split policies, never `for all`: `for all` silently includes update, and an update here
-- would let a client move its own first-found date or rewrite which species a find named.
--
-- GUARDED, BECAUSE THIS FILE MUST BE SAFE TO RUN TWICE. Postgres has no
-- `create policy if not exists`, so a second run used to abort with 42710 at the first
-- policy — which is exactly what happened when this migration was applied by hand and then
-- repeated. `run-migration.yml` states the re-runnable rule in its own header and the file
-- was quietly breaking it, because `create table if not exists` made it LOOK idempotent.
--
-- Guarded rather than `drop policy if exists` then `create`: dropping first leaves a window,
-- however brief, in which a table holding real rows has no policy on it at all.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'seed_shelf' and policyname = 'own seed shelf read'
  ) then
    create policy "own seed shelf read" on public.seed_shelf
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'seed_shelf' and policyname = 'own seed shelf insert'
  ) then
    create policy "own seed shelf insert" on public.seed_shelf
      for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'seed_shelf' and policyname = 'own seed shelf delete'
  ) then
    create policy "own seed shelf delete" on public.seed_shelf
      for delete using (auth.uid() = user_id);
  end if;
end $$;
-- Deliberately no update policy. See the header.
