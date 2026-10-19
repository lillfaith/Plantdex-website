-- Collection entitlements: the free-collection cap, and the deck claim that lifts it.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THIS MIGRATION CHANGES NO BEHAVIOUR WHEN APPLIED. `collection_paywall_enabled`
-- defaults to FALSE, and the trigger returns on its first branch while it is. Applying
-- 0008 is therefore safe on a live project with real players: it creates three tables,
-- one trigger and two functions, reads `auth.users` once, and alters not a single
-- discovery, sighting, achievement or profile row.
--
-- Enabling it is a separate, deliberate `update` (see "ROLLBACK" at the foot).
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY A TRIGGER AND NOT APPLICATION CODE. `discoveries` is written by plain RLS-scoped
-- upserts straight from the browser (`src/lib/remote-herbdex-storage.ts`,
-- `src/lib/import-local-progress.ts`) — there is no server in that path, and no edge
-- function writes the table at all (`herbdex-action` only READS it). So an app-side check
-- would be advice, not a limit: anybody can call PostgREST with the public anon key. The
-- database is the only place the cap can actually live.
--
-- WHAT THE CAP DOES NOT TOUCH, by construction. It is a trigger on ONE table, so
-- sightings, scans, the Seed Shelf, Field Research, achievements, XP, the garden and
-- plant identification are all unaffected at the cap. A player who has filled the free
-- collection keeps identifying plants and keeps a complete journal; what stops is adding
-- a 10th card to the permanent collection. That separation is the product decision, and
-- making it a trigger on `discoveries` is what makes it structural rather than stated.

-- ─── 1. app_settings ─────────────────────────────────────────────────────────
--
-- The flag has to live in Postgres because the TRIGGER reads it, and a trigger cannot see
-- a repo variable or an edge-function secret. That is also what makes rollback a single
-- `update` with no deploy: the flag and the enforcement are in the same database.
--
-- ONE ROW, ENFORCED BY THE PRIMARY KEY. `id boolean primary key check (id)` admits exactly
-- the value `true`, so a second settings row is not a thing that can exist. A table that
-- is meant to hold one row and merely happens to is a table that eventually holds two, and
-- then the trigger reads whichever one it finds first.
create table if not exists public.app_settings (
  id                          boolean primary key default true check (id),
  collection_paywall_enabled  boolean not null default false,
  free_discovery_limit        integer not null default 10
                                check (free_discovery_limit > 0),
  -- Recorded for audit: every account created before this is grandfathered, and that
  -- claim should be checkable later without reading a migration file.
  grandfather_cutoff          timestamptz,
  updated_at                  timestamptz not null default now()
);

insert into public.app_settings (id) values (true) on conflict (id) do nothing;

alter table public.app_settings enable row level security;

-- PUBLIC READ, NO WRITE FOR ANYBODY. The UI prints the limit, so it has to be readable;
-- nothing here is about a person. The flag is changed by the operator holding service-role
-- credentials, which bypasses RLS — the same posture `species_packets` takes.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'app_settings'
      and policyname = 'settings are public to read'
  ) then
    create policy "settings are public to read" on public.app_settings
      for select using (true);
  end if;
end $$;

-- ─── 2. deck_claims ──────────────────────────────────────────────────────────
--
-- One row per physical deck, holding the HASH OF THE CODE AND NEVER THE CODE. A database
-- leak therefore hands nobody a working code: the plaintext exists only on the printed
-- card and in the operator's offline fulfilment file.
--
-- Plain SHA-256 rather than an HMAC under a new secret, deliberately. The code carries 80
-- bits of entropy, which already makes the stored hash useless to an offline attacker —
-- and a pepper would have to fail closed, so losing that one secret would brick every code
-- ever printed. For this operator the operational risk of a secret that must never be lost
-- exceeds the cryptographic gain over 2^80.
create table if not exists public.deck_claims (
  token_hash  text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  print_run   text not null,
  -- NULLED BY ACCOUNT DELETION, which is why it is not the single-use guard. `auth.users`
  -- rows really are deleted (`delete-account`), and a code must stay spent afterwards.
  claimed_by  uuid references auth.users on delete set null,
  claimed_at  timestamptz
);

-- RLS ON, WITH NO POLICY OF ANY KIND — and the order of those two facts is the whole point.
-- Supabase grants `anon` and `authenticated` table privileges by default, so a table with
-- RLS *disabled* and no policies is WIDE OPEN rather than closed. Enabling RLS is what
-- makes "no policy" mean "nobody". The revoke below is the belt to that braces.
alter table public.deck_claims enable row level security;
revoke all on public.deck_claims from anon, authenticated;

-- ─── 3. entitlements ─────────────────────────────────────────────────────────
--
-- What the app reads to answer "is the cap lifted for this account". Deliberately NOT a
-- column on `profiles`: that table is client-updatable (the one deliberate exception in
-- this schema), and an entitlement a client could write is not an entitlement.
create table if not exists public.entitlements (
  user_id     uuid primary key references auth.users on delete cascade,
  tier        text not null check (tier in ('collector')),
  granted_at  timestamptz not null default now(),
  granted_by  text not null
                check (granted_by in ('deck_claim', 'grandfather', 'manual'))
);

alter table public.entitlements enable row level security;

-- OWN ROW READABLE; NO INSERT, UPDATE OR DELETE FOR ANY CLIENT ROLE. The reasoning is
-- 0001's, unchanged: `for all` silently includes update, and every policy on a record
-- table here is split for exactly that reason. The sole writer is `redeem_deck_code`,
-- which runs as its definer. `profile-schema.test.ts` keeps `profiles` the only table in
-- this schema that grants a client update, and this table must not become the second.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'entitlements'
      and policyname = 'own entitlement read'
  ) then
    create policy "own entitlement read" on public.entitlements
      for select using (auth.uid() = user_id);
  end if;
end $$;

-- ─── 4. The cap ──────────────────────────────────────────────────────────────
--
-- AN `AFTER ... FOR EACH STATEMENT` TRIGGER WITH A TRANSITION TABLE, AND THE TWO HOLES
-- THAT RULED OUT THE OBVIOUS `BEFORE INSERT ... FOR EACH ROW` VERSION.
--
-- FIRST, DUPLICATES. `BEFORE INSERT` fires for every row BEFORE conflict detection, so a
-- row that `ON CONFLICT DO NOTHING` is about to skip still runs the trigger. Every upsert
-- in this app passes `ignoreDuplicates: true`, which is exactly that clause — so a player
-- at the cap re-sending a discovery they already hold would be REFUSED, and the refusal
-- would be of a row that was never going to be written. A transition table contains only
-- rows that were actually INSERTED, so the duplicate simply is not there to count.
--
-- SECOND, AND WORSE: BATCH INSERTS BYPASSED THE CAP COMPLETELY. Under READ COMMITTED each
-- row's `count(*)` reads the snapshot from before the statement began, so fifteen new
-- discoveries sent in ONE upsert all read the same count and ALL PASS. The advisory lock
-- does not help, because it serializes transactions and the fifteen rows are one
-- transaction. An AFTER-statement trigger runs once the command is complete, with the
-- command counter advanced, so its `count(*)` INCLUDES the statement's own rows. The
-- comparison is against the absolute total, which is correct for every shape at once: one
-- row, fifteen rows, a re-sync of rows already held, or any mixture.
--
-- The cost is that the whole statement rolls back rather than inserting part of it. That
-- is the right semantics for a limit — and the one caller that could legitimately send
-- more than the headroom, the local-progress import, slices to the headroom first so it
-- never trips.
create or replace function public.enforce_discovery_limit()
returns trigger
language plpgsql
security definer
-- `search_path = ''` with every object fully qualified, which is stronger than the
-- `search_path = public` the older functions here use: a definer function whose path
-- includes a writable schema can have its unqualified lookups shadowed. Supabase denies
-- `anon` and `authenticated` CREATE on `public`, so the existing functions are not
-- exploitable today — this one simply does not rely on that default.
set search_path = ''
as $$
declare
  v_enabled boolean;
  v_limit   integer;
  v_user    uuid;
  v_count   integer;
begin
  select s.collection_paywall_enabled, s.free_discovery_limit
    into v_enabled, v_limit
    from public.app_settings s
   where s.id;

  -- THE ROLLBACK PATH, and the first thing the function does. While the flag is off this
  -- trigger is one cheap read and a return, which is what makes disabling it a complete
  -- rollback rather than a partial one.
  if not coalesce(v_enabled, false) then
    return null;
  end if;

  -- One statement may insert for more than one user when it is made by the service role,
  -- so the cap is applied per user rather than to the statement as a whole.
  --
  -- `ORDER BY` MAKES THE LOCK ORDER DETERMINISTIC, and the honest status of that is: a
  -- cheap guarantee against a hazard nobody here has reproduced.
  --
  -- The hazard is real in principle. The loop takes one advisory lock per user, and `select
  -- distinct` guarantees no order whatsoever — Postgres may answer it from a HashAggregate
  -- in whatever order suits it. Two concurrent multi-user batches touching the same
  -- accounts could then take the locks in opposite orders and each wait on what the other
  -- held, which is a textbook deadlock; Postgres would detect and abort one side, so a
  -- spurious failure rather than a hang.
  --
  -- IT WAS TESTED FOR AND DID NOT HAPPEN. Twenty-four concurrent two-account batches, run
  -- against a build with this `order by` REMOVED, produced zero deadlocks: with two users
  -- and a tiny transition table the planner returns the same order every time, so both
  -- sides happened to lock in the same sequence anyway. That is a property of this test's
  -- scale, not a guarantee of the query — which is exactly why the clause stays. Compare
  -- the advisory lock itself, where the same control experiment DID fail (11 discoveries
  -- instead of 10): that one is load-bearing on measured evidence, this one on reasoning,
  -- and the difference is worth writing down rather than flattening into one claim.
  --
  -- No client can reach the multi-user case at all: RLS pins every client insert to
  -- `auth.uid()`, so a client batch is always single-user, and only the service role can
  -- write for several accounts at once. This is therefore a defence for a future backfill
  -- or admin script rather than for anything shipping.
  for v_user in select distinct i.user_id from inserted i order by 1 loop
    if exists (select 1 from public.entitlements e where e.user_id = v_user) then
      continue;
    end if;

    -- CONCURRENCY. Two transactions each inserting their 10th row would both read 9 and
    -- both commit. A transaction-scoped advisory lock keyed on the user serializes them;
    -- it is released at commit, and it never blocks a different player. Under READ
    -- COMMITTED — what PostgREST uses — the `count(*)` after the lock reads a fresh
    -- snapshot and therefore sees the other transaction's committed rows. (Under
    -- REPEATABLE READ the count would come from the transaction's older snapshot and
    -- could be stale; nothing in this app opens one, and this comment is here so that
    -- the guarantee is read as conditional rather than universal.)
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(v_user::text, 0)
    );

    select pg_catalog.count(*) into v_count
      from public.discoveries d
     where d.user_id = v_user;

    if v_count > v_limit then
      raise exception 'collection_limit_reached'
        using errcode = 'check_violation',
              detail  = pg_catalog.format(
                'account holds %s of %s free collection slots', v_count - 1, v_limit
              ),
              hint    = 'Collector access lifts the free collection limit.';
    end if;
  end loop;

  return null;
end $$;

drop trigger if exists discoveries_enforce_limit on public.discoveries;

create trigger discoveries_enforce_limit
  after insert on public.discoveries
  referencing new table as inserted
  for each statement
  execute function public.enforce_discovery_limit();

-- ─── 5. Redemption ───────────────────────────────────────────────────────────
--
-- ONE ATOMIC STATEMENT IS THE ENTIRE SINGLE-USE GUARANTEE. The conditional update is the
-- same shape `claim_scan` uses for the scan quota: under READ COMMITTED a second
-- transaction presenting the same code blocks on the row lock, re-evaluates the predicate
-- against the now-committed row, matches nothing, and reports `invalid`. There is no nonce
-- table, no expiry and no extra state, for the reason the species registry already states:
-- the second presentation of a spent token changes nothing, so replay is a no-op rather
-- than something to defend against.
--
-- THE CLAIM AND THE ENTITLEMENT ARE ONE TRANSACTION. A function body is a single
-- transaction, so if the entitlement insert threw, the claim would roll back with it and
-- the code would still be redeemable. There is no window in which a deck is spent and its
-- owner has nothing.
--
-- `p_user` IS A PARAMETER RATHER THAN `auth.uid()`, because the caller is an edge function
-- holding the service role, where `auth.uid()` is null. Identity is resolved there from the
-- CALLER'S OWN token via `auth.getUser()`, and the request body is never read for a user
-- id — the posture `delete-account` already takes, and for the same reason: the service
-- role bypasses RLS, so RLS is not the boundary here and a forged id must have nothing to
-- attach to.
create or replace function public.redeem_deck_code(p_user uuid, p_hash text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claimed  boolean;
  v_existing boolean;
begin
  update public.deck_claims c
     set claimed_by = p_user,
         claimed_at = pg_catalog.now()
   where c.token_hash = p_hash
     and c.claimed_at is null
  returning true into v_claimed;

  -- UNKNOWN AND ALREADY-CLAIMED ARE REPORTED IDENTICALLY, on purpose. Distinguishing them
  -- would turn this endpoint into an oracle for which codes exist, which is a far more
  -- useful thing to an attacker than either answer alone.
  if v_claimed is not true then
    return 'invalid';
  end if;

  select exists (select 1 from public.entitlements e where e.user_id = p_user)
    into v_existing;

  insert into public.entitlements (user_id, tier, granted_by)
  values (p_user, 'collector', 'deck_claim')
  on conflict (user_id) do nothing;

  -- The code is SPENT even when the account already had access — through grandfathering,
  -- or by redeeming a second deck. Leaving it unspent would let somebody who already has
  -- Collector access redeem and then resell a working code.
  return case when v_existing then 'already_entitled' else 'redeemed' end;
end $$;

-- Reachable only from the service role, exactly as `claim_scan` is (0002). Without this,
-- `authenticated` could call it directly with any `p_user` it liked.
revoke all on function public.enforce_discovery_limit() from public, anon, authenticated;
revoke all on function public.redeem_deck_code(uuid, text) from public, anon, authenticated;

-- ─── 6. Grandfathering ───────────────────────────────────────────────────────
--
-- EVERY ACCOUNT THAT EXISTS WHEN THIS MIGRATION RUNS GETS PERMANENT COLLECTOR ACCESS.
--
-- The cutoff is this migration's own execution time. `now()` is the TRANSACTION
-- timestamp, and a migration runs in one transaction, so the cutoff recorded in
-- `app_settings` and the cutoff used by the insert are the same instant by construction —
-- there is no window in which an account created mid-migration is on the wrong side of a
-- boundary, and no hand-typed timestamp to get wrong.
--
-- Additive and re-runnable: it reads `auth.users`, writes only `entitlements`, and takes
-- no discovery, sighting, achievement or profile row with it. Nobody loses anything they
-- earned before the rules changed, which is the only acceptable way to introduce a limit
-- to a product people are already using.
-- IT RUNS EXACTLY ONCE, AND THAT GUARD IS NOT DEFENSIVE TIDINESS — IT IS A BUG FIX.
-- Every file in this directory has to survive being applied twice, and an unguarded
-- version of this block does not merely repeat itself: `now()` is a NEW instant on the
-- second run, so it would grandfather every account created between the two applications
-- and hand free Collector access to people who signed up after the cutoff was announced.
-- Found by applying 0008 twice against a real Postgres and watching the second run grant
-- entitlements to accounts the first had correctly excluded. `grandfather_cutoff` being
-- already set is the record that the pass has happened, so it is also the guard.
do $$
declare v_cutoff timestamptz;
begin
  select grandfather_cutoff into v_cutoff from public.app_settings where id;
  if v_cutoff is not null then
    raise notice 'grandfather pass already ran at %; skipping', v_cutoff;
    return;
  end if;

  -- The stamp and the comparison are the SAME `now()`: it is the transaction timestamp
  -- and a migration is one transaction, so there is no window in which an account created
  -- mid-migration lands on the wrong side of the boundary.
  update public.app_settings
     set grandfather_cutoff = now(), updated_at = now()
   where id;

  insert into public.entitlements (user_id, tier, granted_by)
  select u.id, 'collector', 'grandfather'
    from auth.users u
   where u.created_at < now()
  on conflict (user_id) do nothing;
end $$;

-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
--
-- THE PRIMARY ROLLBACK IS ONE STATEMENT AND TOUCHES NO DATA:
--
--   update public.app_settings set collection_paywall_enabled = false, updated_at = now()
--    where id;
--
-- The trigger then returns on its first branch and the cap is gone, with no deploy and no
-- row rewritten. It is the tested path, not a theory.
--
-- THERE IS DELIBERATELY NO DOWN-MIGRATION THAT DROPS THESE TABLES. `deck_claims` records
-- which physical decks have been sold and spent, and `entitlements` records what people
-- bought; dropping either to "undo" a feature would destroy the record of real purchases
-- and make every spent code redeemable again. If the mechanism itself ever has to go, a
-- later migration drops the TRIGGER and leaves every claim and entitlement where it is.
