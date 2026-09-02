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
  photo_path text,

  -- The generated packet artwork, pinned at the moment of saving.
  --
  -- Derivable from `species_key` alone — that determinism is what makes two players' shelves
  -- agree about a species without a shared registry — but stored so a later change to the
  -- generator cannot redraw a packet somebody has already been looking at.
  packet jsonb
);

create index if not exists seed_shelf_user_species_idx
  on public.seed_shelf (user_id, species_key);

alter table public.seed_shelf enable row level security;

-- Split policies, never `for all`: `for all` silently includes update, and an update here
-- would let a client move its own first-found date or rewrite which species a find named.
create policy "own seed shelf read" on public.seed_shelf
  for select using (auth.uid() = user_id);
create policy "own seed shelf insert" on public.seed_shelf
  for insert with check (auth.uid() = user_id);
create policy "own seed shelf delete" on public.seed_shelf
  for delete using (auth.uid() = user_id);
-- Deliberately no update policy. See the header.
