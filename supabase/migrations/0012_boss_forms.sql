-- ═══════════════════════════════════════════════════════════════════════════════
-- 0012 — BOSS FORM RECORDS (PILOT)   *** WRITTEN, NOT APPLIED ***
--
-- Not to be applied to ANY project without explicit owner approval, test project first.
-- Independent of 0011 (the Field Board), which stays separate and untouched.
--
-- THE DESIGN IS "NO CLIENT WRITE PATH AT ALL".
--
-- An insert policy that checks "a mastered row and three completion rows exist" is circular:
-- the completion rows are as client-writable as the Boss Form row, so anybody could POST them
-- in order. So neither table has an insert, update or delete policy for ANY client role. The
-- only writer is `public.award_challenge`, callable by the service role alone, which the
-- `challenge-submit` edge function calls after it has verified the caller's JWT, rebuilt the
-- question set itself and scored the answers itself.
--
-- THE FUNCTION IS ATOMIC AND IDEMPOTENT. Both inserts happen in one transaction, each
-- `on conflict do nothing`, so a repeated or concurrent submission cannot double-record and a
-- failure cannot leave a Boss Form without its prerequisites. It RE-CHECKS mastery and the
-- three prerequisites from rows in this database, inside the same transaction, so a bug in the
-- calling function still cannot mint a Boss Form out of order.
--
-- COSMETIC ONLY. Nothing here is read by `progression.ts`, the reducer or the Field Board, so
-- no XP, mastery stage, achievement or threshold can move. A row says "this player passed the
-- scored activities", never that they can identify a plant outdoors. Mastery itself is derived
-- from client-written sightings, so this is a record of the rules having been followed, not
-- proof that a person studied.
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.challenge_completions (
  user_id uuid not null references auth.users (id) on delete cascade,
  herb_id text not null check (herb_id <> ''),
  activity_id text not null
    check (activity_id in ('part-spotter', 'compare', 'habitat-season', 'boss-trial')),
  completed_at timestamptz not null default now(),
  primary key (user_id, herb_id, activity_id)
);

create table if not exists public.boss_forms (
  user_id uuid not null references auth.users (id) on delete cascade,
  herb_id text not null check (herb_id <> ''),
  earned_at timestamptz not null default now(),
  primary key (user_id, herb_id)
);

alter table public.challenge_completions enable row level security;
alter table public.boss_forms enable row level security;

-- Read-only for the owner. Deliberately no insert / update / delete policy.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'challenge_completions'
      and policyname = 'own challenge completions read'
  ) then
    create policy "own challenge completions read" on public.challenge_completions
      for select using (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'boss_forms'
      and policyname = 'own boss forms read'
  ) then
    create policy "own boss forms read" on public.boss_forms
      for select using (user_id = auth.uid());
  end if;
end
$$;

-- Defence in depth: a role-level revoke as well as the absence of a policy.
revoke insert, update, delete on public.challenge_completions from anon, authenticated;
revoke insert, update, delete on public.boss_forms from anon, authenticated;

create or replace function public.award_challenge(
  p_user uuid,
  p_herb text,
  p_activity text,
  p_boss boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null or p_herb is null or p_herb = '' then
    raise exception 'bad arguments';
  end if;

  -- Re-check from this database's own rows, in this transaction.
  if not exists (
    select 1 from public.mastered m where m.user_id = p_user and m.herb_id = p_herb
  ) then
    raise exception 'not mastered';
  end if;

  insert into public.challenge_completions (user_id, herb_id, activity_id)
  values (p_user, p_herb, p_activity)
  on conflict do nothing;

  if p_boss then
    if p_activity <> 'boss-trial' then
      raise exception 'only the boss trial awards a boss form';
    end if;
    if (
      select count(*) from public.challenge_completions c
      where c.user_id = p_user and c.herb_id = p_herb
        and c.activity_id in ('part-spotter', 'compare', 'habitat-season')
    ) < 3 then
      raise exception 'prerequisites missing';
    end if;
    insert into public.boss_forms (user_id, herb_id)
    values (p_user, p_herb)
    on conflict do nothing;
  end if;
end;
$$;

-- A definer function is executable by `public` the moment it exists.
revoke all on function public.award_challenge(uuid, text, text, boolean) from public;
revoke all on function public.award_challenge(uuid, text, text, boolean) from anon, authenticated;
grant execute on function public.award_challenge(uuid, text, text, boolean) to service_role;
