-- V0.3 accounts: one row per (user, fact), never a stored XP/level column.
--
-- XP stays derived exactly as it is today (src/lib/progression.ts's xpForState()) — it is
-- summed by the client from these rows after they are fetched under RLS, so there is never
-- an XP value to trust or distrust from anyone. Every table below is write-once: rows are
-- inserted and deleted, never updated, matching the existing "recorded, never revoked"
-- contract for mastery, discoveries and research completions.
--
-- Herb ids, research task ids and achievement ids are free-text, matching the string ids
-- already used client-side (herb ids are scientific-name slugs; see CLAUDE.md — "Herb ids
-- come from the scientific name, never the common name"). There is no server-side herbs
-- table: card data is static and ships with the app, not stored in Postgres.

create table if not exists public.discoveries (
  user_id uuid not null references auth.users (id) on delete cascade,
  herb_id text not null,
  discovered_at timestamptz not null default now(),
  primary key (user_id, herb_id)
);

create table if not exists public.learned (
  user_id uuid not null references auth.users (id) on delete cascade,
  herb_id text not null,
  learned_at timestamptz not null default now(),
  primary key (user_id, herb_id)
);

create table if not exists public.mastered (
  user_id uuid not null references auth.users (id) on delete cascade,
  herb_id text not null,
  mastered_at timestamptz not null default now(),
  primary key (user_id, herb_id)
);

create table if not exists public.research_completions (
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

create table if not exists public.unlocked_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- Sightings get a synthetic id (not a natural key) because a player can log more than one
-- sighting of the same herb on the same day. `id` is `text`, not `uuid`: the client always
-- supplies its own id, generated as `sighting_<timestamp>_<random>` (src/lib/sightings.ts,
-- src/lib/remote-sightings.ts) so a locally-logged sighting keeps the same id when it's
-- later imported into an account (src/lib/import-local-progress.ts) — forcing a `uuid`
-- column would reject every one of those ids outright.
create table if not exists public.sightings (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  herb_id text not null,
  date date not null,
  region text,
  notes text,
  growth_stage text,
  found_again boolean,
  -- Path within the sighting-photos storage bucket, e.g. "{user_id}/{sighting_id}.jpg".
  -- Null when the sighting has no photo.
  photo_path text,
  created_at timestamptz not null default now()
);

alter table public.discoveries enable row level security;
alter table public.learned enable row level security;
alter table public.mastered enable row level security;
alter table public.research_completions enable row level security;
alter table public.unlocked_achievements enable row level security;
alter table public.sightings enable row level security;

-- Owner-only access, split into select/insert/delete with NO update policy ON ANY OF THESE
-- TABLES: every row here is genuinely write-once. (The rule is about progression and
-- history, not about updates as such — 0003's `profiles` holds editable preferences that
-- nothing is derived from, and does have an owner-scoped update policy. Nothing below may.) This is deliberately three policies per table
-- rather than one `for all`, because `for all` silently INCLUDES update — under it a
-- signed-in player could rewrite their own `mastered_at`/`discovered_at` timestamps, or
-- rewrite a sighting's `herb_id` after the fact to reshape the very rows
-- `supabase/functions/herbdex-action` re-derives mastery and research from. Splitting the
-- policy is what makes the write-once contract real instead of merely stated.
--
-- Every upsert in the app passes `ignoreDuplicates: true`, which PostgREST emits as
-- `insert ... on conflict do nothing` — that needs only the insert policy, never update,
-- so re-recording a fact already stored stays a silent no-op rather than an error. Adding
-- an update policy later would reopen exactly the hole described above; don't.
--
-- A player can delete their own sighting (src/lib/sightings.ts already supports this
-- locally) but that never un-earns mastery, matching the existing "mastery is recorded,
-- not recomputed" rule.

create policy "own discoveries read" on public.discoveries
  for select using (auth.uid() = user_id);
create policy "own discoveries insert" on public.discoveries
  for insert with check (auth.uid() = user_id);
create policy "own discoveries delete" on public.discoveries
  for delete using (auth.uid() = user_id);

create policy "own learned read" on public.learned
  for select using (auth.uid() = user_id);
create policy "own learned insert" on public.learned
  for insert with check (auth.uid() = user_id);
create policy "own learned delete" on public.learned
  for delete using (auth.uid() = user_id);

create policy "own mastered read" on public.mastered
  for select using (auth.uid() = user_id);
create policy "own mastered insert" on public.mastered
  for insert with check (auth.uid() = user_id);
create policy "own mastered delete" on public.mastered
  for delete using (auth.uid() = user_id);

create policy "own research completions read" on public.research_completions
  for select using (auth.uid() = user_id);
create policy "own research completions insert" on public.research_completions
  for insert with check (auth.uid() = user_id);
create policy "own research completions delete" on public.research_completions
  for delete using (auth.uid() = user_id);

create policy "own unlocked achievements read" on public.unlocked_achievements
  for select using (auth.uid() = user_id);
create policy "own unlocked achievements insert" on public.unlocked_achievements
  for insert with check (auth.uid() = user_id);
create policy "own unlocked achievements delete" on public.unlocked_achievements
  for delete using (auth.uid() = user_id);

create policy "own sightings read" on public.sightings
  for select using (auth.uid() = user_id);
create policy "own sightings insert" on public.sightings
  for insert with check (auth.uid() = user_id);
create policy "own sightings delete" on public.sightings
  for delete using (auth.uid() = user_id);

-- Private bucket for sighting photos. Objects are stored at "{user_id}/{filename}"; the
-- policy below restricts access to the folder matching the caller's own uid, mirroring the
-- table policies above.
insert into storage.buckets (id, name, public)
values ('sighting-photos', 'sighting-photos', false)
on conflict (id) do nothing;

create policy "own sighting photos read" on storage.objects
  for select using (
    bucket_id = 'sighting-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "own sighting photos write" on storage.objects
  for insert with check (
    bucket_id = 'sighting-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "own sighting photos delete" on storage.objects
  for delete using (
    bucket_id = 'sighting-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
