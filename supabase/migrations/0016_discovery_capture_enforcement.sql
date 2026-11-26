-- 0016_discovery_capture_enforcement.sql        *** DRAFT. TEST PROJECT ONLY. NOT APPLIED. ***
--
-- Depends only on migrations 0001-0013 (is_catalogue_herb, discoveries, learned, mastered). It needs neither 0014 (confirm_scan) nor 0015 (expansion ids), and creates no object either defines.
--
-- WHY: owner decision (final, 2026-11-26): V1 requires an eligible IN-APP CAMERA capture to earn a NEW
-- collectible card. Until now `discoveries` has been written by the browser under its own JWT, so a
-- signed-in player can insert any card through the public API and every system built on that table
-- (XP, levels, Field Cards, garden, achievements, the Field Board) pays for it. A UI change cannot fix
-- that: the Supabase URL and anon key are public by design. Only the database can.
--
-- WHAT THIS DOES (every rule is behind ONE database switch that DEFAULTS OFF):
--   1. `discovery_enforcement`: the switch. One row, `enforce = false`. RLS with no policy; changed only
--      through `set_discovery_enforcement()`, which only the service role may call. THIS MIGRATION NEVER
--      TURNS IT ON, and a frontend flag is not authorisation: the database decides.
--   2. `capture_sessions`: a server-issued, single-use, 10-minute capture session. Opened by the in-app
--      camera screen (`open_capture_session`, authenticated), consumed once by `identify-plant`
--      (`consume_capture_session`, service role). Stores a SHA-256 of the nonce, never the nonce.
--   3. `capture_image_digests`: SHA-256 of each received (already re-encoded) image, single use across
--      accounts. No decode, no EXIF, no coordinates, no perceptual hash (see the measurements doc).
--   4. `capture_receipts`: one row per ELIGIBLE candidate of an accepted capture, written only by the
--      service role (`issue_capture_receipts`). Claimed once by the player (`claim_discovery`), which is
--      the ONLY way to create a new card's discovery once enforcement is on.
--   5. `discovery_grandfathered`: every discoveries row that exists now (and, at enable time, every row
--      recorded up to an owner-chosen cutoff) may always be re-inserted. No revocation, no rescoring.
--   6. Triggers: `discoveries` refuses an insert with no claimed receipt and no grandfather row;
--      `learned` and `mastered` refuse a row for a card with no discoveries row. ALL of them do nothing
--      while the switch is OFF, except that `discoveries.recorded_at` is stamped with the server clock.
--
-- WHAT IT DELIBERATELY DOES NOT DO:
--   * No update policy on any new or existing table (profile-schema.test.ts pins that `profiles` is the
--     one exception). The only post-insert change anywhere is `capture_receipts.claimed_at` null -> time,
--     written by `claim_discovery` and guarded by a trigger.
--   * Read, store or require EXIF, GPS, coordinates, a device identifier or a photograph.
--   * Claim that a capture proves anything about the plant. A receipt records "went through the app's
--     capture flow"; the product's word is "captured in the app", never "verified outdoors".
--   * Change `confirm_scan`, `scans`, `sightings`, `mastered` writers, XP, or any existing policy.
--   * Delete or rewrite any row. The rollback (0016_rollback.sql) never deletes player records either.
--
-- ROLLOUT ORDER (owner): apply to TEST -> run 0016_verify.sql -> Scan lane integrates behind its flag ->
-- shadow period -> owner decides -> `select public.set_discovery_enforcement(true, <cutoff>, 'ENFORCE NEW DISCOVERIES')`.
-- Production is NOT authorised by this file.

-- ─── 1. Server stamp on discoveries (additive) ───────────────────────────────
-- Existing rows get the migration's own time. A BEFORE INSERT trigger (section 7) forces the server
-- clock on every new row, so `recorded_at` cannot be back-dated even though `discovered_at` can.
alter table public.discoveries
  add column if not exists recorded_at timestamptz not null default now();

-- ─── 2. The switch ───────────────────────────────────────────────────────────
create table if not exists public.discovery_enforcement (
  singleton boolean primary key default true check (singleton),
  enforce boolean not null default false,
  enforce_since timestamptz,
  grandfather_cutoff timestamptz,
  changed_at timestamptz not null default now()
);
insert into public.discovery_enforcement (singleton) values (true) on conflict do nothing;
alter table public.discovery_enforcement enable row level security;
revoke all on table public.discovery_enforcement from public, anon, authenticated;

create or replace function public.discovery_enforcement_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'discovery_enforcement_is_permanent' using errcode = '42501';
  end if;
  if pg_catalog.current_setting('plantdex.enforcement_via_fn', true) is distinct from 'on' then
    raise exception 'discovery_enforcement_changes_only_through_function' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists discovery_enforcement_guard_trg on public.discovery_enforcement;
create trigger discovery_enforcement_guard_trg
  before update or delete on public.discovery_enforcement
  for each row execute function public.discovery_enforcement_guard();

-- ─── 3. Grandfathering ───────────────────────────────────────────────────────
create table if not exists public.discovery_grandfathered (
  user_id uuid not null references auth.users (id) on delete cascade,
  herb_id text not null,
  source text not null check (source in ('migration_0016', 'enable_cutoff')),
  recorded_at timestamptz not null default now(),
  primary key (user_id, herb_id)
);
alter table public.discovery_grandfathered enable row level security;
revoke all on table public.discovery_grandfathered from public, anon, authenticated;
grant select on table public.discovery_grandfathered to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public'
      and tablename = 'discovery_grandfathered' and policyname = 'own grandfathered read') then
    create policy "own grandfathered read" on public.discovery_grandfathered
      for select using (auth.uid() = user_id);
  end if;
end $$;

-- EVERY existing discoveries row, at the moment of this migration. Idempotent.
-- Guarded so that RE-RUNNING this file after the switch has been turned on can never grandfather
-- rows that were refused the grandfather by the cutoff.
insert into public.discovery_grandfathered (user_id, herb_id, source)
  select user_id, herb_id, 'migration_0016' from public.discoveries
   where not coalesce((select e.enforce from public.discovery_enforcement e where e.singleton), false)
  on conflict do nothing;

-- ─── 4. Capture sessions, image digests, receipts ────────────────────────────
create table if not exists public.capture_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nonce_digest bytea not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  request_digest bytea,
  observation_id text,
  check (expires_at > issued_at)
);
create index if not exists capture_sessions_user_issued_idx
  on public.capture_sessions (user_id, issued_at desc);
alter table public.capture_sessions add column if not exists suspect_duplicate boolean not null default false;
alter table public.capture_sessions enable row level security;
revoke all on table public.capture_sessions from public, anon, authenticated;

-- Keyed per ACCOUNT, not globally: an identical image from the same account is a retry or a re-take and is
-- harmless; an identical image seen under ANOTHER account is recorded and FLAGGED for review
-- (`capture_sessions.suspect_duplicate`), never refused automatically, because legitimate cases exist
-- (a shared photograph, a household, a classroom, a re-sent file) and a refusal would deny a real find.
create table if not exists public.capture_image_digests (
  digest bytea not null check (pg_catalog.octet_length(digest) = 32),
  user_id uuid not null references auth.users (id) on delete cascade,
  first_seen timestamptz not null default now(),
  primary key (user_id, digest)
);
create index if not exists capture_image_digests_digest_idx on public.capture_image_digests (digest);
alter table public.capture_image_digests enable row level security;
revoke all on table public.capture_image_digests from public, anon, authenticated;

create table if not exists public.capture_receipts (
  id text primary key check (id ~ '^rcpt_[0-9a-f]{32}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.capture_sessions (id),
  observation_id text not null,
  herb_id text not null,
  observed_taxon_key text not null check (pg_catalog.length(observed_taxon_key) between 1 and 200),
  -- EXACTLY `TaxonRank` / `SPECIES_CONFIDENCES`; observation-capture-sql.test.ts holds them equal.
  observed_taxon_rank text not null check (observed_taxon_rank in (
    'genus', 'subgenus', 'section', 'subsection', 'series',
    'species', 'subspecies', 'variety', 'form', 'unknown')),
  -- D2: `legacyGenus` is never eligible; `ambiguous`, `related`, `sameGenus`, `none` never are either.
  eligibility text not null check (eligibility in (
    'exact', 'synonym', 'acceptedGroup', 'curatedEquivalent', 'genusCard')),
  rank_position text not null check (rank_position in ('top', 'listed')),
  species_confidence text not null check (species_confidence in ('high', 'moderate', 'low', 'unresolved')),
  receipt_version integer not null default 1 check (receipt_version = 1),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  claimed_at timestamptz,
  constraint capture_receipts_valid_herb check (public.is_catalogue_herb(herb_id)),
  constraint capture_receipts_one_per_candidate unique (observation_id, herb_id),
  check (expires_at > issued_at)
);
create index if not exists capture_receipts_user_herb_idx on public.capture_receipts (user_id, herb_id);
alter table public.capture_receipts enable row level security;
revoke all on table public.capture_receipts from public, anon, authenticated;
grant select on table public.capture_receipts to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public'
      and tablename = 'capture_receipts' and policyname = 'own receipts read') then
    create policy "own receipts read" on public.capture_receipts
      for select using (auth.uid() = user_id);
  end if;
end $$;
-- Deliberately NO insert, update or delete policy on any capture_* table, and no grant of one.

-- A receipt is evidence. The one allowed change is claimed_at going from null to a time.
create or replace function public.capture_receipts_immutable()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.claimed_at is not null
     or (pg_catalog.to_jsonb(new) - 'claimed_at') is distinct from (pg_catalog.to_jsonb(old) - 'claimed_at') then
    raise exception 'capture_receipt_immutable' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists capture_receipts_immutable_trg on public.capture_receipts;
create trigger capture_receipts_immutable_trg
  before update on public.capture_receipts
  for each row execute function public.capture_receipts_immutable();

-- ─── 5. Configuration (one place; the TypeScript mirror is src/lib/observation-capture-receipt.ts) ─
create or replace function public.capture_config()
returns jsonb language sql immutable set search_path = '' as $$
  select pg_catalog.jsonb_build_object(
    'ttl_s', 600,
    -- OWNER DECISION 2026-11-26: no mandatory capture delay. 0 = not enforced (the key and the check stay so
    -- a later owner decision needs no migration).
    'min_capture_ms', 0,
    'receipt_ttl_days', 30,
    'max_open_sessions', 3,
    'max_sessions_per_day', 60,
    -- OWNER DECISION 2026-11-26: ONE mandatory in-app photograph; further angles are optional (up to max_images).
    'min_images', 1,
    'max_images', 3
  )
$$;

-- ─── 6. The calls ────────────────────────────────────────────────────────────

-- 6a. The in-app camera screen opens a session. Authenticated callers only.
create or replace function public.open_capture_session()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_cfg jsonb := public.capture_config();
  v_now timestamptz := pg_catalog.now();
  v_nonce text;
  v_id uuid;
  v_expires timestamptz;
begin
  if v_user is null then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'not_signed_in');
  end if;
  -- One account's opens are serialised so the limits are exact, never off by a race.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('capture_open:' || v_user::text, 0));
  if (select pg_catalog.count(*) from public.capture_sessions s
       where s.user_id = v_user and s.consumed_at is null and s.expires_at > v_now)
     >= (v_cfg ->> 'max_open_sessions')::int then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'too_many_open_sessions');
  end if;
  if (select pg_catalog.count(*) from public.capture_sessions s
       where s.user_id = v_user and s.issued_at >= pg_catalog.date_trunc('day', v_now, 'UTC'))
     >= (v_cfg ->> 'max_sessions_per_day')::int then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'daily_session_limit');
  end if;
  v_nonce := pg_catalog.replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  v_expires := v_now + pg_catalog.make_interval(secs => (v_cfg ->> 'ttl_s')::int);
  insert into public.capture_sessions (user_id, nonce_digest, issued_at, expires_at)
    values (v_user, pg_catalog.sha256(pg_catalog.convert_to(v_nonce, 'UTF8')), v_now, v_expires)
    returning id into v_id;
  return pg_catalog.jsonb_build_object(
    'ok', true, 'session_id', v_id, 'nonce', v_nonce,
    'issued_at', v_now, 'expires_at', v_expires,
    'ttl_s', (v_cfg ->> 'ttl_s')::int, 'min_capture_ms', (v_cfg ->> 'min_capture_ms')::int);
end $$;

-- 6b. identify-plant (service role) consumes the session when it receives the images.
--     p_image_digests: lower-case hex SHA-256 of each received image part, in request order.
create or replace function public.consume_capture_session(
  p_user uuid, p_session uuid, p_nonce text, p_observation_id text, p_image_digests text[]
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_cfg jsonb := public.capture_config();
  v_now timestamptz := pg_catalog.now();
  s public.capture_sessions%rowtype;
  v_req bytea;
  v_n int := coalesce(pg_catalog.cardinality(p_image_digests), 0);
  v_bytes bytea[];
  v_cross boolean;
begin
  if p_user is null or p_session is null then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'capture_session_unknown');
  end if;
  select * into s from public.capture_sessions where id = p_session and user_id = p_user for update;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'capture_session_unknown');
  end if;
  if s.nonce_digest is distinct from pg_catalog.sha256(pg_catalog.convert_to(coalesce(p_nonce, ''), 'UTF8')) then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'capture_session_nonce');
  end if;
  if v_n < (v_cfg ->> 'min_images')::int or v_n > (v_cfg ->> 'max_images')::int
     or exists (select 1 from pg_catalog.unnest(p_image_digests) d where d is null or d !~ '^[0-9a-f]{64}$')
     or (select pg_catalog.count(distinct d) from pg_catalog.unnest(p_image_digests) d) <> v_n then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'capture_images_invalid');
  end if;
  v_req := pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.array_to_string(p_image_digests, ','), 'UTF8'));

  if s.consumed_at is not null then
    -- A retry after a lost response: the SAME request replays; anything else is a second use.
    if s.request_digest is not distinct from v_req then
      return pg_catalog.jsonb_build_object('ok', true, 'replay', true,
        'session_id', s.id, 'observation_id', s.observation_id);
    end if;
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'capture_session_used');
  end if;
  if v_now > s.expires_at then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'capture_session_expired');
  end if;
  -- Refused WITHOUT consuming: a legitimate player who somehow submitted early can wait and resubmit.
  if v_now - s.issued_at < pg_catalog.make_interval(secs => ((v_cfg ->> 'min_capture_ms')::int) / 1000.0) then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'capture_too_fast');
  end if;

  select pg_catalog.array_agg(pg_catalog.decode(d, 'hex')) into v_bytes from pg_catalog.unnest(p_image_digests) d;
  -- An image seen under ANOTHER account is flagged for review, never refused (see the table comment).
  select exists (select 1 from public.capture_image_digests x
                  where x.digest = any (v_bytes) and x.user_id <> p_user) into v_cross;
  insert into public.capture_image_digests (digest, user_id)
    select b, p_user from pg_catalog.unnest(v_bytes) b
  on conflict do nothing;
  update public.capture_sessions
     set consumed_at = v_now, request_digest = v_req, observation_id = p_observation_id,
         suspect_duplicate = v_cross
   where id = s.id;
  return pg_catalog.jsonb_build_object('ok', true, 'replay', false,
    'session_id', s.id, 'observation_id', p_observation_id);
end $$;

-- 6b2. identify-plant (service role) hands a session BACK when the identification provider failed after the
--      session was consumed and nothing was issued, so the player's retry with the same photographs is a first
--      use rather than a replay with zero receipts. It refuses (returns false) when any receipt exists for the
--      session, so it can never be used to re-roll a result the player has already seen. Image digests are left in
--      place on purpose: they only flag cross-account reuse, and the same account re-sending them is harmless.
create or replace function public.release_capture_session(p_user uuid, p_session uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if p_user is null or p_session is null then return false; end if;
  if exists (select 1 from public.capture_receipts r where r.session_id = p_session) then return false; end if;
  update public.capture_sessions
     set consumed_at = null, request_digest = null, observation_id = null, suspect_duplicate = false
   where id = p_session and user_id = p_user and consumed_at is not null;
  get diagnostics v_n = row_count;
  return v_n = 1;
end $$;

-- 6b3. identify-plant (service role) gives back the CALLER'S OWN daily unit when the identification PROVIDER failed
--      (an outage on their side, never an invalid or rejected photograph). It touches only the per-caller bucket the
--      request itself claimed: the shared `global` bucket is the upstream-cost backstop and is never refunded, so a
--      forced failure cannot widen what the whole product may spend in a day. Never goes below zero.
create or replace function public.refund_scan_claim(p_bucket text, p_day date)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if p_bucket is null or p_day is null or p_bucket = 'global' then return false; end if;
  update public.scan_quota set count = count - 1
   where bucket = p_bucket and day = p_day and count > 0;
  get diagnostics v_n = row_count;
  return v_n = 1;
end $$;

-- 6c. identify-plant (service role) records one receipt per eligible candidate.
--     p_items: [{herb_id, observed_taxon_key, observed_taxon_rank, eligibility, rank_position, species_confidence}]
--     An item the CHECKs refuse is skipped, never fatal: a receipt bug must not become an identification failure.
create or replace function public.issue_capture_receipts(p_user uuid, p_session uuid, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_cfg jsonb := public.capture_config();
  v_now timestamptz := pg_catalog.now();
  s public.capture_sessions%rowtype;
  it jsonb;
  v_id text;
  v_out jsonb := '[]'::jsonb;
begin
  select * into s from public.capture_sessions
   where id = p_session and user_id = p_user and consumed_at is not null;
  if not found or s.observation_id is null or pg_catalog.jsonb_typeof(p_items) is distinct from 'array' then
    return v_out;
  end if;
  for it in select * from pg_catalog.jsonb_array_elements(p_items) loop
    begin
      v_id := 'rcpt_' || pg_catalog.replace(gen_random_uuid()::text, '-', '');
      insert into public.capture_receipts (
        id, user_id, session_id, observation_id, herb_id, observed_taxon_key, observed_taxon_rank,
        eligibility, rank_position, species_confidence, issued_at, expires_at)
      values (
        v_id, p_user, p_session, s.observation_id, it ->> 'herb_id', it ->> 'observed_taxon_key',
        it ->> 'observed_taxon_rank', it ->> 'eligibility', it ->> 'rank_position',
        it ->> 'species_confidence', v_now,
        v_now + pg_catalog.make_interval(days => (v_cfg ->> 'receipt_ttl_days')::int))
      on conflict (observation_id, herb_id) do nothing;
    exception when check_violation or not_null_violation then
      continue;
    end;
    select r.id into v_id from public.capture_receipts r
     where r.observation_id = s.observation_id and r.herb_id = it ->> 'herb_id' and r.user_id = p_user;
    if v_id is not null then
      v_out := v_out || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'id', v_id, 'herb_id', it ->> 'herb_id', 'rank_position', it ->> 'rank_position'));
    end if;
  end loop;
  return v_out;
end $$;

-- 6d. The player claims ONE receipt: the only route to a new card once enforcement is on.
create or replace function public.claim_discovery(p_receipt_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := pg_catalog.now();
  r public.capture_receipts%rowtype;
  v_already boolean;
  v_held boolean;
  v_at timestamptz;
begin
  if v_user is null then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'not_signed_in');
  end if;
  -- A forged id and another account's id look identical, so nothing is learned about other accounts.
  select * into r from public.capture_receipts where id = p_receipt_id and user_id = v_user for update;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'receipt_unknown');
  end if;
  if r.eligibility not in ('exact', 'synonym', 'acceptedGroup', 'curatedEquivalent', 'genusCard') then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'receipt_ineligible');
  end if;
  v_already := r.claimed_at is not null;
  -- Expiry stops a NEW claim. A receipt already claimed stays valid evidence for ever.
  if not v_already and v_now > r.expires_at then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'receipt_expired');
  end if;
  select exists (select 1 from public.discoveries d where d.user_id = v_user and d.herb_id = r.herb_id)
    into v_held;
  begin
    if not v_already then
      update public.capture_receipts set claimed_at = v_now where id = r.id and claimed_at is null;
    end if;
    if not v_held then
      insert into public.discoveries (user_id, herb_id, discovered_at)
        values (v_user, r.herb_id, v_now)
        on conflict do nothing;
    end if;
  exception when check_violation then
    -- 0008's free-tier limit. The whole claim rolls back (the receipt stays claimable) and says why.
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'collection_limit_reached');
  end;
  select d.discovered_at into v_at from public.discoveries d
   where d.user_id = v_user and d.herb_id = r.herb_id;
  return pg_catalog.jsonb_build_object('ok', true,
    'status', case when v_already then 'already_claimed' when v_held then 'already_held' else 'claimed' end,
    'herb_id', r.herb_id, 'discovered_at', v_at);
end $$;

-- 6e. Wording and routing only. NEVER authorisation: the triggers below decide.
create or replace function public.discovery_rules()
returns jsonb language sql stable security definer set search_path = '' as $$
  select pg_catalog.jsonb_build_object(
    'enforcing', coalesce((select e.enforce from public.discovery_enforcement e where e.singleton), false),
    'ttl_s', (public.capture_config() ->> 'ttl_s')::int,
    'min_capture_ms', (public.capture_config() ->> 'min_capture_ms')::int,
    'receipt_ttl_days', (public.capture_config() ->> 'receipt_ttl_days')::int)
$$;

-- 6f. Housekeeping. Never touches a consumed session, a receipt or a grandfather row.
create or replace function public.prune_capture_artifacts()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_digests bigint; v_sessions bigint;
begin
  delete from public.capture_image_digests where first_seen < pg_catalog.now() - interval '90 days';
  get diagnostics v_digests = row_count;
  delete from public.capture_sessions
   where consumed_at is null and expires_at < pg_catalog.now() - interval '2 days';
  get diagnostics v_sessions = row_count;
  return pg_catalog.jsonb_build_object('digests', v_digests, 'sessions', v_sessions);
end $$;

-- 6g. THE SWITCH. Service role / database owner only. Never called by this migration.
create or replace function public.set_discovery_enforcement(p_on boolean, p_cutoff timestamptz, p_confirm text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_n bigint := 0;
begin
  perform pg_catalog.set_config('plantdex.enforcement_via_fn', 'on', true);
  if p_on then
    if p_confirm is distinct from 'ENFORCE NEW DISCOVERIES' then
      raise exception 'confirmation_phrase_required' using errcode = '22023';
    end if;
    if p_cutoff is null or p_cutoff > pg_catalog.now() then
      raise exception 'cutoff_required_and_not_in_the_future' using errcode = '22023';
    end if;
    -- Rows recorded up to the cutoff are grandfathered; rows after it are NOT, which is what stops a
    -- player pre-stuffing their collection between an announcement and the switch.
    insert into public.discovery_grandfathered (user_id, herb_id, source)
      select d.user_id, d.herb_id, 'enable_cutoff' from public.discoveries d where d.recorded_at <= p_cutoff
      on conflict do nothing;
    get diagnostics v_n = row_count;
    update public.discovery_enforcement
       set enforce = true, enforce_since = pg_catalog.now(), grandfather_cutoff = p_cutoff,
           changed_at = pg_catalog.now() where singleton;
  else
    -- Off again. Receipts, sessions and grandfather rows are untouched: nothing is revoked.
    update public.discovery_enforcement
       set enforce = false, changed_at = pg_catalog.now() where singleton;
  end if;
  return pg_catalog.jsonb_build_object('enforcing', p_on, 'newly_grandfathered', v_n);
end $$;

-- ─── 7. The gates ────────────────────────────────────────────────────────────
-- A security-definer function reads the switch, which no client role can. They bind EVERY role,
-- the service role included: a trigger is not row security, and there is no legitimate service-role
-- writer of `discoveries`.

create or replace function public.discoveries_capture_gate()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.recorded_at := pg_catalog.now();   -- server clock, always, OFF included
  if not coalesce((select e.enforce from public.discovery_enforcement e where e.singleton), false) then
    return new;
  end if;
  if exists (select 1 from public.discovery_grandfathered g
              where g.user_id = new.user_id and g.herb_id = new.herb_id)
     or exists (select 1 from public.capture_receipts r
                 where r.user_id = new.user_id and r.herb_id = new.herb_id and r.claimed_at is not null) then
    return new;
  end if;
  raise exception 'discovery_requires_capture_receipt' using errcode = '42501',
    hint = 'A new card is unlocked by an in-app capture. Claim a capture receipt (claim_discovery).';
end $$;

drop trigger if exists discoveries_capture_gate_trg on public.discoveries;
create trigger discoveries_capture_gate_trg
  before insert on public.discoveries
  for each row execute function public.discoveries_capture_gate();

create or replace function public.progress_requires_discovery()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce((select e.enforce from public.discovery_enforcement e where e.singleton), false) then
    return new;
  end if;
  if exists (select 1 from public.discoveries d where d.user_id = new.user_id and d.herb_id = new.herb_id) then
    return new;
  end if;
  raise exception 'discovery_required_first' using errcode = '42501';
end $$;

drop trigger if exists learned_requires_discovery_trg on public.learned;
create trigger learned_requires_discovery_trg
  before insert on public.learned
  for each row execute function public.progress_requires_discovery();
drop trigger if exists mastered_requires_discovery_trg on public.mastered;
create trigger mastered_requires_discovery_trg
  before insert on public.mastered
  for each row execute function public.progress_requires_discovery();

-- ─── 8. Grants (a definer function is executable by `public` and, on Supabase, by `anon` by default) ─
revoke all on function public.capture_config() from public, anon, authenticated;
-- Trigger functions cannot be called as RPC, but they are definers: no role needs EXECUTE on them.
revoke all on function public.discoveries_capture_gate() from public, anon, authenticated;
revoke all on function public.progress_requires_discovery() from public, anon, authenticated;
revoke all on function public.open_capture_session() from public, anon;
revoke all on function public.claim_discovery(text) from public, anon;
revoke all on function public.discovery_rules() from public, anon;
grant execute on function public.open_capture_session() to authenticated;
grant execute on function public.claim_discovery(text) to authenticated;
grant execute on function public.discovery_rules() to authenticated;

revoke all on function public.consume_capture_session(uuid, uuid, text, text, text[]) from public, anon, authenticated;
revoke all on function public.issue_capture_receipts(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.prune_capture_artifacts() from public, anon, authenticated;
revoke all on function public.release_capture_session(uuid, uuid) from public, anon, authenticated;
revoke all on function public.refund_scan_claim(text, date) from public, anon, authenticated;
revoke all on function public.set_discovery_enforcement(boolean, timestamptz, text) from public, anon, authenticated;
grant execute on function public.consume_capture_session(uuid, uuid, text, text, text[]) to service_role;
grant execute on function public.issue_capture_receipts(uuid, uuid, jsonb) to service_role;
grant execute on function public.prune_capture_artifacts() to service_role;
grant execute on function public.release_capture_session(uuid, uuid) to service_role;
grant execute on function public.refund_scan_claim(text, date) to service_role;
grant execute on function public.set_discovery_enforcement(boolean, timestamptz, text) to service_role;
