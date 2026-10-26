-- Migration 0009: the per-caller and global scan allowances as one atomic decision.
--
-- Run with `scripts/test_migration.sh supabase/migrations/0009_atomic_scan_quota.sql \
--                                     supabase/tests/0009_atomic_scan_quota.test.sql`
--
-- The test that matters is B: an over-quota caller must cost the shared pool NOTHING. That
-- was the denial of service — one machine could spend the shared 450 and take plant
-- identification down for every user of the product, daily.

\set ON_ERROR_STOP on

-- `scan_quota` belongs to 0002, which this harness does not load, so it is created here with
-- the shape 0002 gives it. Keep the two in step.
create table if not exists public.scan_quota (
  bucket text not null,
  day    date not null,
  count  integer not null default 0,
  primary key (bucket, day)
);
-- RLS ON WITH NO POLICY, exactly as 0002 leaves it. Without this line the harness's default
-- grants make the table readable and the test in F below would pass for the wrong reason —
-- and a readable `scan_quota` is a real weakness: it would let anybody watch the shared pool
-- drain and time an attack for the minute before midnight.
alter table public.scan_quota enable row level security;

create or replace function public.claim_scan(p_bucket text, p_day date, p_limit integer)
returns integer language plpgsql security definer set search_path = public as $$
declare new_count integer;
begin
  insert into public.scan_quota (bucket, day, count) values (p_bucket, p_day, 1)
  on conflict (bucket, day) do update
    set count = public.scan_quota.count + 1
    where public.scan_quota.count < p_limit
  returning count into new_count;
  return new_count;
end $$;

create or replace function q(p_bucket text) returns integer language sql as $$
  select coalesce((select count from public.scan_quota
                    where bucket = p_bucket and day = current_date), 0)
$$;

-- ─── A. The ordinary path ────────────────────────────────────────────────────
do $$
declare r integer;
begin
  r := public.claim_scan_pair('user:a', current_date, 3, 100);
  perform t_assert_count(r, 1, 'first claim returns the caller''s own count');
  perform t_assert_count(q('user:a'), 1, 'the caller''s bucket advanced');
  perform t_assert_count(q('global'), 1, 'and so did the shared bucket');

  r := public.claim_scan_pair('user:a', current_date, 3, 100);
  r := public.claim_scan_pair('user:a', current_date, 3, 100);
  perform t_assert_count(r, 3, 'the third claim is still allowed at a limit of 3');
  perform t_assert_count(q('global'), 3, 'three requests, three shared units');
end $$;

-- ─── B. THE DENIAL OF SERVICE, AND ITS FIX ───────────────────────────────────
--
-- A caller over their OWN limit must not take from the shared pool. Before 0009 this
-- function's caller claimed global first and checked the per-caller refusal afterwards, so
-- every request past a caller's own allowance still spent a shared unit — 450 requests from
-- one machine, no account and no valid image needed, and identification was down for
-- everybody until midnight.
do $$
declare r integer; before integer; i integer;
begin
  before := q('global');
  perform t_assert_count(q('user:a'), 3, 'the caller is at their limit');

  r := public.claim_scan_pair('user:a', current_date, 3, 100);
  perform t_assert_count(r, -1, 'an over-quota caller is refused with -1');
  perform t_assert_count(q('global'), before, 'AND THE SHARED POOL IS UNTOUCHED');
  perform t_assert_count(q('user:a'), 3, 'their own bucket did not grow either');

  -- The attack, in miniature: hammering past your own limit must cost the pool nothing,
  -- however many times you do it.
  for i in 1..50 loop
    r := public.claim_scan_pair('user:a', current_date, 3, 100);
  end loop;
  perform t_assert_count(q('global'), before,
    '50 refused requests spent ZERO shared units (this is the fix)');
end $$;

-- ─── C. A shared exhaustion refunds the caller's unit ────────────────────────
--
-- The request is refused for a reason that has nothing to do with this caller, so charging
-- them would let a global outage quietly eat everybody's personal allowance too — and
-- tomorrow they would start the day already short.
do $$
declare r integer; own_before integer;
begin
  -- Fill a small shared pool exactly.
  perform public.claim_scan_pair('user:b', current_date, 50, 2);
  perform public.claim_scan_pair('user:b', current_date, 50, 2);
  perform t_assert_count(q('global2'), 0, 'control: a different shared bucket is separate');

  own_before := q('user:b');
  r := public.claim_scan_pair('user:b', current_date, 50, 2);
  perform t_assert_count(r, -2, 'shared exhaustion is reported as -2, distinctly from -1');
  perform t_assert_count(q('user:b'), own_before,
    'and the caller''s own unit was refunded, not spent');
end $$;

-- ─── D. The two refusals stay distinguishable ────────────────────────────────
-- One means "come back tomorrow", the other means "this is not your fault". Collapsing them
-- into a single falsy value would make the second unanswerable in support.
do $$
begin
  perform t_assert(
    public.claim_scan_pair('user:c', current_date, 0, 100) = -1,
    'own-limit refusal is -1');
  perform t_assert(
    public.claim_scan_pair('user:d', current_date, 50, 0) = -2,
    'shared-limit refusal is -2');
end $$;

-- ─── E. Buckets do not leak into one another ─────────────────────────────────
do $$
begin
  perform public.claim_scan_pair('user:e', current_date, 1, 100);
  perform t_assert_count(public.claim_scan_pair('user:e', current_date, 1, 100), -1,
    'user e is at their limit');
  perform t_assert(public.claim_scan_pair('user:f', current_date, 1, 100) = 1,
    'user f is unaffected by user e''s exhaustion');
end $$;

-- ─── F. No client role may call it ───────────────────────────────────────────
do $$
begin
  set local role authenticated;
  begin
    perform public.claim_scan_pair('user:attacker', current_date, 999, 999);
    raise exception 'FAIL  authenticated called claim_scan_pair directly';
  exception when insufficient_privilege then
    perform t_pass('authenticated cannot call claim_scan_pair');
  end;
  reset role;

  set local role anon;
  begin
    perform public.claim_scan_pair('user:attacker', current_date, 999, 999);
    raise exception 'FAIL  anon called claim_scan_pair directly';
  exception when insufficient_privilege then
    perform t_pass('anon cannot call claim_scan_pair');
  end;
  reset role;

  -- And the table it writes is not a client read surface either: a readable `scan_quota`
  -- would let anybody watch the shared pool drain and time an attack against midnight.
  set local role authenticated;
  perform t_assert_count(
    (select count(*) from public.scan_quota), 0,
    'authenticated reads ZERO rows from scan_quota, so the shared pool is not observable');
  reset role;
end $$;

-- ─── G. The function is hardened like the rest ───────────────────────────────
do $$
declare cfg text; secdef boolean;
begin
  select coalesce(array_to_string(proconfig, ','), ''), prosecdef
    into cfg, secdef
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'claim_scan_pair';
  perform t_assert(secdef, 'claim_scan_pair is SECURITY DEFINER');
  perform t_assert(cfg like '%search_path=%', 'and pins its search_path');
end $$;
