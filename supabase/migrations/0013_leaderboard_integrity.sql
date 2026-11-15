-- 0013_leaderboard_integrity.sql
--
-- WHY: every progress table accepted any text id from a signed-in client, and two of them
-- (mastered, research_completions) accepted rows the server is supposed to derive. A player
-- could insert invented species or invented challenges straight through the API and the
-- Field Board paid 50 or 100 points for each, without limit.
--
-- WHAT THIS DOES, AND WHAT IT DELIBERATELY DOES NOT:
--   * New rows must name a real card, a real research task or a real achievement.
--   * mastered and research_completions lose their client insert policy. Only the
--     herbdex-action function writes them, with the service role, after recomputing.
--   * A sighting's created_at is the server's clock, and its photo path must be the
--     caller's own folder.
--   * leaderboard_standings() counts only valid ids, and counts a photograph only when the
--     file exists in the caller's own folder.
--   * Display names reject invisible characters and names posing as staff.
--   * NOTHING IS DELETED OR REWRITTEN. Every constraint is NOT VALID: it applies to new rows
--     and leaves existing rows alone. Existing invalid rows simply stop scoring.
--
-- The id lists are generated from src/lib (CATALOGUE, STANDING_TASKS, ACHIEVEMENTS) and
-- src/lib/leaderboard-integrity.test.ts fails when either side changes without the other.
-- Adding a card, a standing task or an achievement therefore needs a new migration.

create or replace function public.is_catalogue_herb(p text)
returns boolean language sql immutable set search_path = '' as $$
  select p = any (array[
    'taraxacum-officinale',
    'rumex-obtusifolius',
    'solidago-canadensis',
    'ambrosia-artemisiifolia',
    'chenopodium-album',
    'portulaca-oleracea',
    'alliaria-petiolata',
    'urtica-dioica',
    'oxalis-stricta',
    'trifolium-pratense',
    'lamium-purpureum',
    'viola-sororia',
    'stellaria-media',
    'plantago-major',
    'galium-aparine',
    'glechoma-hederacea',
    'acer-spp',
    'rubus-spp',
    'rumex-acetosella',
    'rhus-spp',
    'cichorium-intybus',
    'arctium-lappa',
    'mentha-canadensis',
    'nepeta-cataria',
    'capsella-bursa-pastoris',
    'prunella-vulgaris',
    'verbascum-thapsus',
    'equisetum-arvense',
    'allium-vineale',
    'fragaria-virginiana',
    'sambucus-spp',
    'hypericum-perforatum',
    'achillea-millefolium',
    'impatiens-capensis',
    'melissa-officinalis',
    'monarda-fistulosa',
    'rosa-spp',
    'salix-spp',
    'geranium-maculatum',
    'lonicera-japonica',
    'pinus-spp',
    'morus-spp',
    'passiflora-incarnata',
    'lactuca-serriola',
    'quercus-spp',
    'echinacea-purpurea',
    'typha-latifolia',
    'oenothera-biennis',
    'lindera-benzoin',
    'hamamelis-virginiana',
    'malva-neglecta',
    'silybum-marianum',
    'verbena-hastata',
    'callicarpa-americana'
  ]::text[])
$$;

create or replace function public.is_scoring_task(p text)
returns boolean language sql immutable set search_path = '' as $$
  select p = any (array[
    'seasonal:spring',
    'seasonal:summer',
    'seasonal:autumn',
    'seasonal:winter',
    'collection:backyard',
    'collection:hard-to-find',
    'collection:habitat-woodland',
    'collection:habitat-meadow',
    'collection:habitat-wetland',
    'collection:habitat-wayside',
    'collection:habitat-garden'
  ]::text[])
$$;

create or replace function public.is_research_task(p text)
returns boolean language sql immutable set search_path = '' as $$
  select public.is_scoring_task(p)
      or (p ~ '^daily:(find|learn|revisit|master):[a-z0-9-]+$'
          and public.is_catalogue_herb(pg_catalog.split_part(p, ':', 3)))
$$;

create or replace function public.is_achievement(p text)
returns boolean language sql immutable set search_path = '' as $$
  select p = any (array[
    'first-find',
    'forager-10',
    'explorer-25',
    'rare-finder',
    'epic-finder',
    'complete-collection',
    'first-research',
    'research-10',
    'seasonal-sweep',
    'backyard-collection',
    'habitat-woodland',
    'habitat-meadow',
    'habitat-wetland',
    'habitat-wayside',
    'habitat-garden',
    'habitat-sweep'
  ]::text[])
$$;

-- Invisible, control and unusual-space characters, then names posing as the service.
create or replace function public.is_safe_display_name(p text)
returns boolean language sql immutable set search_path = '' as $$
  select p is null or (
    pg_catalog.char_length(p) between 1 and 24
    and p !~ '[\u0001-\u001F\u007F-\u009F\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180E\u2000-\u200F\u2028-\u202F\u205F-\u206F\u3000\u3164\uFE00-\uFE0F\uFEFF\uFFA0]'
    and pg_catalog.lower(p) !~ '(plantdex|admin|moderator|official|support|staff)'
  )
$$;

alter table public.discoveries drop constraint if exists discoveries_valid_herb;
alter table public.discoveries add constraint discoveries_valid_herb check (public.is_catalogue_herb(herb_id)) not valid;
alter table public.learned drop constraint if exists learned_valid_herb;
alter table public.learned add constraint learned_valid_herb check (public.is_catalogue_herb(herb_id)) not valid;
alter table public.mastered drop constraint if exists mastered_valid_herb;
alter table public.mastered add constraint mastered_valid_herb check (public.is_catalogue_herb(herb_id)) not valid;
alter table public.sightings drop constraint if exists sightings_valid_herb;
alter table public.sightings add constraint sightings_valid_herb check (public.is_catalogue_herb(herb_id)) not valid;
alter table public.research_completions drop constraint if exists research_valid_task;
alter table public.research_completions add constraint research_valid_task check (public.is_research_task(task_id)) not valid;
alter table public.unlocked_achievements drop constraint if exists achievements_valid_id;
alter table public.unlocked_achievements add constraint achievements_valid_id check (public.is_achievement(achievement_id)) not valid;
alter table public.profiles drop constraint if exists profiles_safe_display_name;
alter table public.profiles add constraint profiles_safe_display_name check (public.is_safe_display_name(display_name)) not valid;
alter table public.sightings drop constraint if exists sightings_own_photo_path;
alter table public.sightings add constraint sightings_own_photo_path check (photo_path is null or photo_path like user_id::text || '/%') not valid;

-- Derived records: no client may insert them. The service role bypasses row level security.
drop policy if exists "own mastered insert" on public.mastered;
drop policy if exists "own research completions insert" on public.research_completions;

-- The daily journal cap is keyed on created_at, so it must be the server's clock.
create or replace function public.sightings_server_clock()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.created_at := pg_catalog.now();
  return new;
end $$;
drop trigger if exists sightings_server_clock on public.sightings;
create trigger sightings_server_clock
  before insert on public.sightings
  for each row execute function public.sightings_server_clock();

-- A photograph counts only when the file is really there, in the owner's own folder.
create or replace function public.sighting_photo_exists(p_user uuid, p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_path is not null
     and p_path like p_user::text || '/%'
     and exists (
       select 1 from storage.objects o
        where o.bucket_id = 'sighting-photos' and o.name = p_path
     )
$$;
revoke all on function public.sighting_photo_exists(uuid, text) from public;
revoke all on function public.sighting_photo_exists(uuid, text) from anon;
revoke all on function public.sighting_photo_exists(uuid, text) from authenticated;

update storage.buckets
   set file_size_limit = 8388608,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'sighting-photos';

-- The standings function, as in 0011, counting only valid records. Same signature.
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
    where public.is_catalogue_herb(s.herb_id)
      and (public.sighting_photo_exists(s.user_id, s.photo_path)
       or char_length(btrim(coalesce(s.notes, ''))) >= 24)  -- MIN_QUALIFYING_NOTE
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
    where public.is_catalogue_herb(s.herb_id)
      and public.sighting_photo_exists(s.user_id, s.photo_path)
    group by s.user_id
  ),
  finds as (
    select user_id, count(*)::int as n from public.discoveries
    where public.is_catalogue_herb(herb_id)
    group by user_id
  ),
  -- Collection challenges and seasonal ladders only. `daily:%` is excluded deliberately —
  -- see LEADERBOARD_POINTS.challenge.
  challenges as (
    select user_id, count(*)::int as n
    from public.research_completions
    where public.is_scoring_task(task_id)
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
    case when public.is_safe_display_name(pr.display_name) then pr.display_name end,
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
