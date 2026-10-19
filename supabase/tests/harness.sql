-- A stand-in for the Supabase surfaces migration 0008 depends on, so the migration can be
-- exercised against a real PostgreSQL rather than reasoned about.
--
-- WHY THIS EXISTS. `npm test` cannot run SQL and `npm run check:edge` cannot either, so
-- before this file the only evidence a migration worked was applying it to the live
-- project. That is a poor place to discover that a trigger refuses legitimate inserts. The
-- two holes in 0008's first draft — `ON CONFLICT DO NOTHING` tripping the cap, and batch
-- inserts bypassing it entirely — were both found here, and the re-grandfathering bug was
-- found by applying the migration twice in a row, which no amount of reading would catch.
--
-- It mirrors only what 0008 touches: `auth.users`, `auth.uid()`, the two client roles and
-- `discoveries` exactly as 0001 defines it. It is NOT a general Supabase emulator and must
-- not grow into one — anything it cannot express belongs in `e2e/supabase.e2e.test.ts`,
-- which runs against a real project.

create schema if not exists auth;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- Supabase resolves `auth.uid()` from a request-scoped GUC carrying the JWT subject. This
-- is close enough that the RLS policies in 0008 are exercised for real rather than stubbed.
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create role anon;
create role authenticated;
grant usage on schema public to anon, authenticated;

-- THE DEFAULT GRANTS MATTER AND ARE THE POINT OF INCLUDING THEM. Supabase hands the two
-- client roles table privileges and relies on RLS as the gate, which is why a table with
-- RLS *disabled* and no policies is wide open rather than closed. Without these grants the
-- harness would report `deck_claims` as unreachable even if 0008 forgot to enable RLS, and
-- the test that matters most would pass for the wrong reason.
alter default privileges in schema public grant all on tables to anon, authenticated;

-- `discoveries` as 0001 defines it: card-level, write-once, split policies, no update.
create table public.discoveries (
  user_id uuid not null references auth.users on delete cascade,
  herb_id text not null,
  discovered_at timestamptz not null default now(),
  primary key (user_id, herb_id)
);
alter table public.discoveries enable row level security;
create policy "own discoveries read" on public.discoveries
  for select using (auth.uid() = user_id);
create policy "own discoveries insert" on public.discoveries
  for insert with check (auth.uid() = user_id);
create policy "own discoveries delete" on public.discoveries
  for delete using (auth.uid() = user_id);
grant select, insert, delete on public.discoveries to anon, authenticated;

-- ── Assertions ───────────────────────────────────────────────────────────────
-- A failure RAISES rather than printing, so the runner's exit code is the result and a
-- suite that silently prints FAIL cannot be mistaken for a pass.
create or replace function t_pass(label text) returns void language plpgsql as $$
begin raise notice 'PASS  %', label; end $$;

create or replace function t_assert(cond boolean, label text) returns void
language plpgsql as $$
begin
  if cond then perform t_pass(label);
  else raise exception 'FAIL  %', label; end if;
end $$;

-- COUNTS GET THEIR OWN ASSERTION. `count(*)` is `bigint` while a literal is `integer`, so
-- one `anyelement` function forces every call site to carry a cast, and two overloads make
-- `t_assert_eq(int, int, ...)` ambiguous. Widening both sides to `numeric` under a distinct
-- name settles it, and a counting assertion reads as a count at the call site.
create or replace function t_assert_count(actual numeric, expected numeric, label text)
returns void language plpgsql as $$
begin
  if actual is not distinct from expected then perform t_pass(label);
  else raise exception 'FAIL  %  (got %L, expected %L)', label, actual, expected; end if;
end $$;

create or replace function t_assert_eq(actual anyelement, expected anyelement, label text)
returns void language plpgsql as $$
begin
  if actual is not distinct from expected then perform t_pass(label);
  else raise exception 'FAIL  %  (got %L, expected %L)', label, actual, expected; end if;
end $$;

-- ISOLATED TEST ACCOUNTS, NEVER A REAL ONE. Every account this suite touches is created by
-- `t_user()` in a throwaway database that the runner drops afterwards.
create or replace function t_user(p_created timestamptz default now()) returns uuid
language plpgsql as $$
declare u uuid;
begin
  insert into auth.users (created_at) values (p_created) returning id into u;
  return u;
end $$;
