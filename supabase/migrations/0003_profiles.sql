-- PLAYER PROFILE — the one mutable preference table in this schema.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS TABLE HAS AN UPDATE POLICY WHEN NOTHING ELSE DOES.
--
-- 0001 and 0002 split every policy into select / insert / delete and deliberately grant no
-- update, because `for all` silently includes update and every table they define is a RECORD
-- OF SOMETHING THAT HAPPENED: a discovery, a mastery, a completed research task, a sighting,
-- a scan. Letting a player rewrite `mastered_at` or a sighting's `herb_id` after the fact
-- would let them rewrite the very rows `herbdex-action` re-derives mastery and research from.
-- That reasoning is about progression and history. It is not a blanket rule about updates.
--
-- This table is the opposite kind of thing. It holds SEVEN CHOICES — a name and six ids —
-- that are meant to be changed as often as somebody likes, and nothing anywhere is derived
-- from it. Modelling an editable settings row as append-only would buy no safety and cost
-- atomicity, so it gets an ordinary owner-scoped update.
--
-- THE `with check` HALF IS THE SECURITY-CRITICAL ONE. `using` alone decides which rows you
-- may update; without `with check` the NEW row is unconstrained, so an owner could update
-- their own row and set `user_id` to somebody else's — handing their profile to another
-- account, or overwriting that account's. Both halves are pinned to auth.uid().
--
-- IT HOLDS NO NUMBERS. No xp, no level, no counts, no completion. Every one of those is
-- derived from the discovery/learned/mastered records on read (`src/lib/profile-stats.ts`),
-- exactly as XP always has been. A cached progression column here would be a number a client
-- could assert; there is deliberately none to assert. `src/lib/profile-schema.test.ts` reads
-- this file's column list and fails if one appears.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  -- One row per player, so the primary key IS the owner. There is no separate profile id a
  -- client could pass, which is what keeps every statement below scoped by construction.
  user_id uuid primary key references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now(),

  -- A label, not a biography. The length cap is enforced in the client too
  -- (`MAX_DISPLAY_NAME`); it is here as well because a check constraint is the only one of
  -- the two that a hand-written request cannot skip.
  display_name text check (display_name is null or char_length(display_name) <= 24),

  -- Chosen cosmetics and plants, all by id. Deliberately NOT foreign keys: herb ids and
  -- cosmetic ids live in the deck data and in `field-frames.ts` / `field-titles.ts`, not in
  -- Postgres, and a card id is not a row here. Whether a selection has actually been EARNED
  -- is resolved on read against the player's own collection (`resolveProfile`), which is
  -- also what makes a stale id from an older build degrade quietly instead of erroring.
  avatar_herb_id text,
  avatar_frame_id text,
  title_id text,
  sidekick_herb_id text,
  featured_herb_id text,

  -- At most three, matching MAX_PINNED. The cap is a constraint rather than a comment
  -- because it is the one field whose size a client controls.
  pinned_achievement_ids text[] not null default '{}'
    check (array_length(pinned_achievement_ids, 1) is null or array_length(pinned_achievement_ids, 1) <= 3)
);

alter table public.profiles enable row level security;

-- Dropped first so this file is genuinely safe to run twice: Postgres has no
-- `create policy if not exists`, and `run-migration.yml` is a manually dispatched workflow —
-- the only honest assumption about one of those is that somebody will eventually run it
-- again. Re-applying then restates the same four policies rather than failing halfway
-- through, which would leave the table with some policies and not others.
drop policy if exists "own profile read" on public.profiles;
drop policy if exists "own profile insert" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
drop policy if exists "own profile delete" on public.profiles;

create policy "own profile read" on public.profiles
  for select using (auth.uid() = user_id);
create policy "own profile insert" on public.profiles
  for insert with check (auth.uid() = user_id);
-- The exception, argued in the header. BOTH halves are required.
create policy "own profile update" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own profile delete" on public.profiles
  for delete using (auth.uid() = user_id);
