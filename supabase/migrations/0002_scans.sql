-- PLANT ID V1 — scan history and rate limiting.
--
-- Two tables with very different lifetimes:
--
--   scans        A player's own record of what they photographed and what came back. User
--                data: readable by them, exportable, deleted with their account.
--   scan_quota   A counter. Not user data in the same sense — it exists only to stop one
--                device exhausting a shared daily API allowance, and it is unreadable by
--                anyone but the service role.
--
-- RLS FOLLOWS THE SAME RULE AS 0001: select / insert / delete are separate policies and
-- there is NO UPDATE POLICY ON EITHER TABLE HERE. `for all` silently includes update, which
-- would let a player rewrite what a scan said after the fact — the same hole 0001 was split
-- to close. A scan is a record of something that happened, not a mutable row. (0003's
-- `profiles` is the deliberate exception: preferences, editable by design, with nothing
-- derived from them. A history table is never that exception.)

create table if not exists public.scans (
  -- text, not uuid: the client generates its own id in the same format as sightings
  -- (`scan_<timestamp>_<random>`) so a scan keeps its identity across storage backends. A
  -- uuid column would reject every one of those — this bit once already with sightings.
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),

  -- Path in the private sighting-photos bucket, scoped to {user_id}/... exactly like a
  -- sighting photo. Null when the player chose not to keep the image.
  photo_path text,

  -- What the provider said, after matching. Nullable because a no-match scan is a real
  -- scan and worth keeping — it is how we learn the deck is missing something.
  top_scientific_name text,
  top_herb_id text,
  confidence numeric(4, 3) check (confidence is null or (confidence >= 0 and confidence <= 1)),

  -- What the PLAYER decided. Never written by the identification itself: confirmation is
  -- always an explicit tap, so this stays null until they make one.
  confirmed_herb_id text,

  outcome text not null check (outcome in ('matched', 'uncertain', 'noMatch'))
);

create index if not exists scans_user_created_idx on public.scans (user_id, created_at desc);

alter table public.scans enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'scans' and policyname = 'own scans read'
  ) then
    create policy "own scans read" on public.scans
      for select using (auth.uid() = user_id);
  end if;
end $$;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'scans' and policyname = 'own scans insert'
  ) then
    create policy "own scans insert" on public.scans
      for insert with check (auth.uid() = user_id);
  end if;
end $$;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'scans' and policyname = 'own scans delete'
  ) then
    create policy "own scans delete" on public.scans
      for delete using (auth.uid() = user_id);
  end if;
end $$;
-- Deliberately no update policy. See the header.

-- ─────────────────────────────────────────────────────────────────────────────
-- RATE LIMITING
--
-- The provider's daily allowance is shared by everyone, so one enthusiastic device can
-- spend it for the whole site. The counter therefore lives server-side and is written ONLY
-- by the edge function under the service role.
--
-- Anonymous scanning is allowed — trying Plant ID must not require an account — which means
-- anonymous callers need an identifier they never chose to give. `bucket` holds a SALTED
-- DAILY HASH of the caller's IP, never the IP: the salt is a function secret plus the date,
-- so the value cannot be reversed, cannot be joined to yesterday's, and stops meaning
-- anything at midnight. Rows older than two days are deleted by the function as it goes.
--
-- RLS is enabled with NO POLICIES AT ALL. That is not an oversight: it means no client, anon
-- or signed-in, can read or write this table. Only the service role reaches it.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.scan_quota (
  bucket text not null,
  day date not null,
  count integer not null default 0,
  primary key (bucket, day)
);

alter table public.scan_quota enable row level security;

-- Increment and report, atomically. A read-then-write from the function would race two
-- concurrent scans and let both through on the last allowed slot.
create or replace function public.claim_scan(p_bucket text, p_day date, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into public.scan_quota (bucket, day, count)
    values (p_bucket, p_day, 1)
  on conflict (bucket, day) do update
    set count = public.scan_quota.count + 1
    where public.scan_quota.count < p_limit
  returning count into new_count;

  -- Null means the conflict target existed and the guard refused the update: over quota.
  return new_count;
end;
$$;

revoke all on function public.claim_scan(text, date, integer) from public, anon, authenticated;
