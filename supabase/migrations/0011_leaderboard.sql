-- ═══════════════════════════════════════════════════════════════════════════════
-- 0011 — THE FIELD BOARD
--
-- A competitive standing computed from records this schema already holds. Read
-- `src/lib/leaderboard.ts` first: it carries the whole design argument, and the numbers in
-- this file are a MIRROR of the constants there, held equal by
-- `src/lib/leaderboard-schema.test.ts`.
--
-- ───────────────────────────────────────────────────────────────────────────────
-- THERE IS NO POINTS COLUMN ANYWHERE IN THIS FILE, AND THAT IS THE SECURITY MODEL.
--
-- A score a client can write is a score a client can claim. This migration adds exactly one
-- table, and the only thing in it is the fact that somebody asked to be listed. Every number
-- the board publishes is computed, at read time, by `leaderboard_standings()` from
-- `discoveries`, `sightings` and `research_completions` — tables that already have no update
-- policy, already enforce one row per (user, species) by primary key, and are already the
-- tables `herbdex-action` re-derives mastery and research from.
--
-- So the anti-cheat here is not a check somebody could forget to run. There is no statement
-- in this schema, callable by anybody, that raises a score.
-- ───────────────────────────────────────────────────────────────────────────────
--
-- WHY IT IS OPT-IN, WHEN NOTHING ELSE IN PLANTDEX IS.
--
-- Until this migration there was no public surface in this product at all: `/profile` is
-- owner-only, there are no followers, no feed and no public profiles, and `/privacy` said so
-- in those words. A board changes that for whoever is on it, so being on it is a decision
-- somebody makes rather than a consequence of signing up. A row in
-- `leaderboard_participants` IS that decision; no row, no listing, and nothing about the
-- account is readable through the function below.
--
-- IT HAS NO UPDATE POLICY, LIKE EVERY TABLE HERE BUT `profiles`. Changing the region you are
-- listed in is a delete and an insert, which the client does in that order. That is slightly
-- awkward and it keeps the single-exception rule intact — see the argument in 0001, and
-- `profile-schema.test.ts`, which fails if a second table grants an update.
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.leaderboard_participants (
  -- One row per player, so the primary key IS the owner: there is no separate participant id
  -- a client could pass, which is what scopes every statement below by construction.
  user_id uuid primary key references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),

  -- The coarse region this player is ranked in, or null for the global board only.
  --
  -- A LAUNCHED REGION ID, NEVER A LOCATION. These are ids from `src/lib/regions.ts` — today
  -- that is country and state scale ('us', 'us-ga') and nothing finer. The journal's own
  -- `region` column is free text a player types and is deliberately NOT used here: it can
  -- say anything, including the exact spot a plant is growing, and the brief for this board
  -- was explicit that no location detail may be published. The check constrains the SHAPE so
  -- a hand-written request cannot store a sentence; which ids are real is resolved in the
  -- client against `regionById`, the same way profile selections are validated on read.
  region_id text check (region_id is null or region_id ~ '^[a-z]{2}(-[a-z0-9]{1,16})?$')
);

alter table public.leaderboard_participants enable row level security;

-- Guarded for the same reason as every policy block since 0004: Postgres has no
-- `create policy if not exists`, and `run-migration.yml` assumes somebody will run this twice.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'leaderboard_participants'
      and policyname = 'own leaderboard listing read'
  ) then
    create policy "own leaderboard listing read" on public.leaderboard_participants
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'leaderboard_participants'
      and policyname = 'own leaderboard listing insert'
  ) then
    create policy "own leaderboard listing insert" on public.leaderboard_participants
      for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'leaderboard_participants'
      and policyname = 'own leaderboard listing delete'
  ) then
    create policy "own leaderboard listing delete" on public.leaderboard_participants
      for delete using (auth.uid() = user_id);
  end if;
end
$$;

create index if not exists leaderboard_participants_region_idx
  on public.leaderboard_participants (region_id);

-- ───────────────────────────────────────────────────────────────────────────────
-- THE STANDINGS.
--
-- `security definer` because this is the one query in the schema that legitimately reads
-- across accounts, and RLS on those tables correctly refuses it. What makes that safe is not
-- the policies it bypasses but WHAT IT RETURNS: a display name somebody chose, a region id
-- they chose, and counts. No user id, no email, no herb ids, no dates, no journal notes, no
-- photographs, no `sightings.region` free text, no scans. There is nothing in the result a
-- player could use to work out where another player was standing.
--
-- `set search_path = public` is not decoration on a definer function: without it, a caller
-- who can create objects in an earlier schema on the search path can shadow `discoveries`
-- and have this run against their own table with the owner's rights.
--
-- `stable`, not `volatile`: it writes nothing, and it reads `auth.uid()` which is fixed for
-- the statement.
-- ───────────────────────────────────────────────────────────────────────────────
create or replace function public.leaderboard_standings(
  p_region text default null,
  p_limit integer default 50
)
returns table (
  standing bigint,
  display_name text,
  region_id text,
  points integer,
  discovery_points integer,
  journal_points integer,
  challenge_points integer,
  discoveries integer,
  journal_entries integer,
  challenges integer,
  photo_backed_entries integer,
  is_self boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with
  -- A journal entry counts when it is a RETURN to a species already in the collection and it
  -- carries an observation: a photograph, or a note of real length. See
  -- `isQualifyingEntry` — this join and this `char_length` are the two halves of it.
  qualifying as (
    select s.user_id, s.herb_id, min(s.created_at) as first_at
    from public.sightings s
    join public.discoveries d
      on d.user_id = s.user_id and d.herb_id = s.herb_id
    where s.photo_path is not null
       or char_length(btrim(coalesce(s.notes, ''))) >= 24   -- MIN_QUALIFYING_NOTE
    group by s.user_id, s.herb_id
  ),
  -- The daily cap. Ordered by `(first_at, herb_id)` so that two entries written in the same
  -- instant rank identically here and in the client mirror.
  capped as (
    select
      user_id,
      row_number() over (
        partition by user_id, (first_at at time zone 'UTC')::date
        order by first_at, herb_id
      ) as rank_in_day
    from qualifying
  ),
  paid as (
    select user_id, count(*)::int as entries
    from capped
    where rank_in_day <= 4                                   -- DAILY_JOURNAL_POINT_CAP
    group by user_id
  ),
  -- Reported beside the score and never folded into it: a photograph is better evidence than
  -- a tap, and still not proof that anybody went outside.
  photo_backed as (
    select s.user_id, count(distinct s.herb_id)::int as backed
    from public.sightings s
    join public.discoveries d
      on d.user_id = s.user_id and d.herb_id = s.herb_id
    where s.photo_path is not null
    group by s.user_id
  ),
  finds as (
    select user_id, count(*)::int as n from public.discoveries group by user_id
  ),
  -- Collection challenges and seasonal ladders only. `daily:%` is excluded deliberately —
  -- see LEADERBOARD_POINTS.challenge.
  challenges as (
    select user_id, count(*)::int as n
    from public.research_completions
    where task_id like 'collection:%' or task_id like 'seasonal:%'
    group by user_id
  ),
  totals as (
    select
      lp.user_id,
      lp.region_id as region,
      (coalesce(f.n, 0) * 50)::int as d_points,              -- LEADERBOARD_POINTS.discovery
      (coalesce(pd.entries, 0) * 15)::int as j_points,       -- LEADERBOARD_POINTS.journalEntry
      (coalesce(c.n, 0) * 100)::int as c_points,             -- LEADERBOARD_POINTS.challenge
      coalesce(f.n, 0)::int as n_finds,
      coalesce(pd.entries, 0)::int as n_entries,
      coalesce(c.n, 0)::int as n_challenges,
      coalesce(pb.backed, 0)::int as n_backed
    from public.leaderboard_participants lp
    left join finds f on f.user_id = lp.user_id
    left join paid pd on pd.user_id = lp.user_id
    left join photo_backed pb on pb.user_id = lp.user_id
    left join challenges c on c.user_id = lp.user_id
    where p_region is null or lp.region_id = p_region
  )
  select
    -- `rank()`, not `row_number()`: equal scores are equal standings, and two players who
    -- have done exactly the same amount of work must not be told one of them is ahead. The
    -- user_id tiebreak decides only the ORDER rows come back in, never the number shown.
    rank() over (order by (t.d_points + t.j_points + t.c_points) desc)::bigint,
    pr.display_name,
    t.region,
    (t.d_points + t.j_points + t.c_points)::int,
    t.d_points,
    t.j_points,
    t.c_points,
    t.n_finds,
    t.n_entries,
    t.n_challenges,
    t.n_backed,
    (t.user_id = auth.uid()) as is_self
  from totals t
  left join public.profiles pr on pr.user_id = t.user_id
  order by (t.d_points + t.j_points + t.c_points) desc, t.user_id
  limit least(coalesce(p_limit, 50), 200);
$$;

-- A definer function is executable by `public` the moment it exists, so the grant has to be
-- narrowed explicitly. Signing in is the gate: the board is for players, and an anonymous
-- reader has no business enumerating the names people chose.
revoke all on function public.leaderboard_standings(text, integer) from public;
-- Supabase also grants EXECUTE on every new public function to `anon` directly, through its
-- default privileges, and `from public` does not touch a grant made to a named role. The live
-- test caught exactly this: a signed-out client could call the function. Revoke it by name.
revoke all on function public.leaderboard_standings(text, integer) from anon;
grant execute on function public.leaderboard_standings(text, integer) to authenticated;
