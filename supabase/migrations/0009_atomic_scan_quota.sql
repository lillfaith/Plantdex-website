-- Claim the per-caller and global scan allowances as ONE decision.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE BUG THIS CLOSES IS A DENIAL OF SERVICE, NOT AN ACCOUNTING DEFECT.
--
-- `identify-plant` claimed the shared `global` bucket and the per-caller bucket as two
-- separate `claim_scan` calls, global first, and the per-caller refusal was checked only
-- afterwards. A comment in that function called the resulting mismatch "a small accounting
-- defect" and deliberately left it.
--
-- It is not small. A caller who has exhausted their OWN allowance still spent a unit of the
-- shared 450 on every subsequent request, and still does on the request after that. So one
-- machine, with no valid image and no account, could issue 450 requests and take plant
-- identification down for every user of the product for the rest of the day — repeatable
-- daily, at the cost of a loop. The per-caller limit was doing nothing to protect the
-- shared pool it sits in front of.
--
-- Two separate statements cannot express "spend a shared unit only if this caller may have
-- one", because the decision spans both buckets. One function can: a function body is a
-- single transaction, so the refund below cannot be interrupted or observed half-done.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY THE PER-CALLER CLAIM GOES FIRST. It is the cheap, selfish limit — the one whose
-- refusal must cost the shared pool nothing. Checking global first means an over-quota
-- caller has already taken from everybody before anyone asks whether they were entitled to,
-- which is precisely the defect above.
--
-- `claim_scan` IS LEFT IN PLACE, unchanged. `redeem-deck-code` uses it for a single bucket
-- with no shared backstop, which is exactly what it is for, and rewriting a working
-- primitive that another function depends on is not part of fixing this one.

create or replace function public.claim_scan_pair(
  p_bucket       text,
  p_day          date,
  p_limit        integer,
  p_global_limit integer,
  p_global_bucket text default 'global'
)
returns integer
language plpgsql
security definer
-- `search_path = ''` with every object fully qualified. Stronger than the `search_path =
-- public` the original `claim_scan` carries: a definer function whose path includes a
-- writable schema can have its unqualified lookups shadowed.
set search_path = ''
as $$
declare
  v_own    integer;
  v_global integer;
begin
  -- ── 0. A limit of zero means ZERO, which the insert alone does not deliver ─
  --
  -- INHERITED BUG, FOUND BY TESTING THIS FUNCTION AT THE BOUNDARY. The `where count <
  -- p_limit` guard below belongs to the `on conflict do update` branch only — the FIRST
  -- insert of a day has nothing to conflict with, so it writes `count = 1` whatever the
  -- limit says. For any limit of 1 or more that is exactly right. At 0 it silently means
  -- "one", so the obvious way to switch identification off for a day — set the limit to
  -- zero — would instead have granted every caller a single request, and the shared pool
  -- one per caller.
  --
  -- Guarded explicitly rather than by reshaping the insert, because the insert's behaviour
  -- is correct for every limit that is actually used and the original `claim_scan` shares
  -- it. This makes a zero limit a usable kill switch instead of a trap.
  if p_limit <= 0 then
    return -1;
  end if;
  if p_global_limit <= 0 then
    return -2;
  end if;

  -- ── 1. The caller's own allowance ──────────────────────────────────────────
  insert into public.scan_quota (bucket, day, count)
    values (p_bucket, p_day, 1)
  on conflict (bucket, day) do update
    set count = public.scan_quota.count + 1
    where public.scan_quota.count < p_limit
  returning count into v_own;

  -- OVER THEIR OWN LIMIT, AND THE SHARED POOL IS UNTOUCHED. This single line is the fix.
  if v_own is null then
    return -1;
  end if;

  -- ── 2. The shared backstop ────────────────────────────────────────────────
  insert into public.scan_quota (bucket, day, count)
    values (p_global_bucket, p_day, 1)
  on conflict (bucket, day) do update
    set count = public.scan_quota.count + 1
    where public.scan_quota.count < p_global_limit
  returning count into v_global;

  if v_global is null then
    -- REFUND THE UNIT WE JUST TOOK. The request is about to be refused for a reason that is
    -- nothing to do with this caller, so charging them for it would let a global outage
    -- quietly consume everybody's personal allowance too — and tomorrow they would start
    -- the day already short. Same transaction as the claim, so there is no window in which
    -- the unit is spent and the refusal has not happened.
    update public.scan_quota
       set count = public.scan_quota.count - 1
     where public.scan_quota.bucket = p_bucket
       and public.scan_quota.day = p_day
       and public.scan_quota.count > 0;
    return -2;
  end if;

  return v_own;
end $$;

-- Reachable only from the service role, exactly as `claim_scan` is (0002). Without this,
-- `authenticated` could call it directly and spend or probe anybody's bucket.
revoke all on function public.claim_scan_pair(text, date, integer, integer, text)
  from public, anon, authenticated;
