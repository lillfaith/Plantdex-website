-- Migration 0008: the free-collection cap, the deck claim, and the entitlement.
--
-- Run with `scripts/test_migration.sh`. Every assertion raises on failure, so the runner's
-- exit code is the result.
--
-- The cap starts DISABLED, which is the shipped state, so section A is the rollback test
-- and runs first: it is the only section that proves the flag is a complete off switch.

\set ON_ERROR_STOP on

-- ─── A. The flag off is a complete no-op (the rollback path) ─────────────────
do $$
declare u uuid; n integer;
begin
  u := t_user();
  insert into public.discoveries (user_id, herb_id)
  select u, 'a' || i from generate_series(1, 25) i;
  select count(*) into n from public.discoveries where user_id = u;
  perform t_assert_eq(n, 25, 'flag off: 25 discoveries allowed, no behaviour change');
end $$;

update public.app_settings set collection_paywall_enabled = true where id;

-- ─── B. The limit ────────────────────────────────────────────────────────────
do $$
declare u uuid; n integer;
begin
  u := t_user();                                   -- a plain free account
  for i in 1..10 loop
    insert into public.discoveries (user_id, herb_id) values (u, 'b' || i);
  end loop;
  select count(*) into n from public.discoveries where user_id = u;
  perform t_assert_eq(n, 10, 'the 10th discovery is allowed');

  begin
    insert into public.discoveries (user_id, herb_id) values (u, 'b11');
    raise exception 'FAIL  the 11th discovery was accepted';
  exception when check_violation then
    perform t_pass('the 11th discovery is refused');
  end;

  select count(*) into n from public.discoveries where user_id = u;
  perform t_assert_eq(n, 10, 'the refused insert left the collection intact');
end $$;

-- ─── C. A HELD CARD RE-SENT AT THE CAP MUST BE ALLOWED ───────────────────────
--
-- `BEFORE INSERT ... FOR EACH ROW` fires before conflict detection, so it refused rows that
-- `ON CONFLICT DO NOTHING` was about to skip — and `ignoreDuplicates: true`, which every
-- upsert in this app passes, compiles to exactly that clause. A transition table holds only
-- rows actually inserted, so the duplicate is not there to count. This section is why the
-- trigger is `AFTER ... FOR EACH STATEMENT`.
do $$
declare u uuid; n integer;
begin
  select user_id into u from public.discoveries group by user_id having count(*) = 10 limit 1;

  insert into public.discoveries (user_id, herb_id) values (u, 'b5')
  on conflict (user_id, herb_id) do nothing;
  perform t_pass('ON CONFLICT DO NOTHING of a held card is allowed at the cap');

  insert into public.discoveries (user_id, herb_id)
  select u, 'b' || i from generate_series(1, 10) i
  on conflict (user_id, herb_id) do nothing;
  perform t_pass('re-syncing all 10 held cards in one batch is allowed at the cap');

  insert into public.discoveries (user_id, herb_id, discovered_at) values (u, 'b5', now())
  on conflict (user_id, herb_id) do update set discovered_at = excluded.discovered_at;
  perform t_pass('ON CONFLICT DO UPDATE of a held card is allowed at the cap');

  select count(*) into n from public.discoveries where user_id = u;
  perform t_assert_eq(n, 10, 'no re-send changed the count');
end $$;

-- ─── D. A BATCH MUST NOT BYPASS THE CAP ──────────────────────────────────────
--
-- Under READ COMMITTED a per-row trigger's `count(*)` reads the pre-statement snapshot, so
-- fifteen rows in one statement all saw the same count and ALL PASSED. An AFTER-statement
-- trigger runs with the command counter advanced and therefore counts the statement's own
-- rows. Measured: the per-row version let all 15 through.
do $$
declare u uuid; n integer;
begin
  u := t_user();
  begin
    insert into public.discoveries (user_id, herb_id)
    select u, 'd' || i from generate_series(1, 15) i;
    raise exception 'FAIL  a 15-row batch bypassed the cap';
  exception when check_violation then
    perform t_pass('a 15-row batch is refused in one statement');
  end;
  select count(*) into n from public.discoveries where user_id = u;
  perform t_assert_eq(n, 0, 'the refused batch inserted nothing at all');

  insert into public.discoveries (user_id, herb_id)
  select u, 'd' || i from generate_series(1, 10) i;
  select count(*) into n from public.discoveries where user_id = u;
  perform t_assert_eq(n, 10, 'a batch exactly at the headroom is allowed');
end $$;

-- ─── E. Entitlement lifts the cap, with no re-login ──────────────────────────
do $$
declare u uuid; n integer;
begin
  select user_id into u from public.discoveries
   where user_id not in (select user_id from public.entitlements)
   group by user_id having count(*) = 10 limit 1;
  insert into public.entitlements (user_id, tier, granted_by) values (u, 'collector', 'manual');
  insert into public.discoveries (user_id, herb_id)
  select u, 'e' || i from generate_series(1, 40) i;
  select count(*) into n from public.discoveries where user_id = u;
  perform t_assert_eq(n, 50, 'collector entitlement lifts the cap mid-session');
end $$;

-- ─── F. The cap is per account ───────────────────────────────────────────────
do $$
declare alice uuid; bob uuid; n integer;
begin
  alice := t_user(); bob := t_user();
  insert into public.entitlements (user_id, tier, granted_by) values (bob, 'collector', 'manual');
  insert into public.discoveries (user_id, herb_id)
  select bob, 'f' || i from generate_series(1, 45) i;

  begin
    insert into public.discoveries (user_id, herb_id)
    select alice, 'f' || i from generate_series(1, 11) i;
    raise exception 'FAIL  Bob''s entitlement lifted Alice''s cap';
  exception when check_violation then
    perform t_pass('one account''s entitlement does not lift another''s cap');
  end;
  perform t_assert_eq(
    (select count(*) from public.discoveries where user_id = alice), 0::bigint,
    'the other account''s refused batch wrote nothing');
end $$;

-- ─── G. user_id cannot be redirected, and the cap survives the attempt ───────
--
-- RLS is the first wall: `with check (auth.uid() = user_id)` refuses a row addressed to
-- somebody else. The cap is the second: an insert that the SERVICE ROLE makes on another
-- account's behalf is still counted against that account, not the caller's.
do $$
declare alice uuid; bob uuid;
begin
  alice := t_user(); bob := t_user();
  perform set_config('request.jwt.claim.sub', alice::text, true);
  set local role authenticated;

  begin
    insert into public.discoveries (user_id, herb_id) values (bob, 'g1');
    raise exception 'FAIL  a client wrote a discovery for another account';
  exception when insufficient_privilege then
    perform t_pass('RLS refuses a discovery addressed to another account');
  end;
  reset role;

  -- Service role, acting for Bob: allowed, but capped as BOB.
  insert into public.discoveries (user_id, herb_id)
  select bob, 'g' || i from generate_series(1, 10) i;
  begin
    insert into public.discoveries (user_id, herb_id) values (bob, 'g11');
    raise exception 'FAIL  a service-role insert bypassed the target account''s cap';
  exception when check_violation then
    perform t_pass('a service-role insert is capped against the TARGET account');
  end;
end $$;

-- ─── H. Redemption ───────────────────────────────────────────────────────────
do $$
declare u uuid; v uuid; h text; outcome text;
begin
  u := t_user(); v := t_user();
  h := encode(sha256('PLNTTESTCODE0001'::bytea), 'hex');
  insert into public.deck_claims (token_hash, print_run) values (h, 'test-run');

  perform t_assert_eq(public.redeem_deck_code(u, h), 'redeemed', 'a fresh code redeems');
  perform t_assert(
    exists (select 1 from public.entitlements
             where user_id = u and granted_by = 'deck_claim'),
    'redemption granted the entitlement in the same transaction');

  perform t_assert_eq(public.redeem_deck_code(v, h), 'invalid',
    'a spent code is refused for a second account');
  perform t_assert(
    not exists (select 1 from public.entitlements where user_id = v),
    'the refused redemption granted nothing');

  perform t_assert_eq(
    public.redeem_deck_code(u, encode(sha256('NOSUCHCODE'::bytea), 'hex')), 'invalid',
    'an unknown code is refused, and reports identically to a spent one');

  -- A second deck redeemed by somebody who already has access: the code is still SPENT,
  -- or a grandfathered account could redeem and then resell a working code.
  h := encode(sha256('PLNTTESTCODE0002'::bytea), 'hex');
  insert into public.deck_claims (token_hash, print_run) values (h, 'test-run');
  perform t_assert_eq(public.redeem_deck_code(u, h), 'already_entitled',
    'a second code redeemed by an entitled account reports already_entitled');
  perform t_assert(
    (select claimed_at from public.deck_claims where token_hash = h) is not null,
    'and that code is spent rather than left redeemable');
end $$;

-- ─── I. A spent code stays spent after the claimant deletes their account ────
--
-- `claimed_by` is nulled by the FK, which is why `claimed_at` and not `claimed_by` is the
-- single-use guard. Getting this backwards would resurrect a code every time somebody
-- closed their account.
do $$
declare u uuid; v uuid; h text;
begin
  u := t_user(); v := t_user();
  h := encode(sha256('PLNTTESTCODE0003'::bytea), 'hex');
  insert into public.deck_claims (token_hash, print_run) values (h, 'test-run');
  perform t_assert_eq(public.redeem_deck_code(u, h), 'redeemed', 'code redeemed');

  delete from auth.users where id = u;
  perform t_assert(
    (select claimed_by from public.deck_claims where token_hash = h) is null,
    'account deletion nulls claimed_by');
  perform t_assert_eq(public.redeem_deck_code(v, h), 'invalid',
    'but the code stays spent: claimed_at is the guard, not claimed_by');
end $$;

-- ─── J. WHAT A CLIENT CAN ACTUALLY REACH ─────────────────────────────────────
--
-- The three refusals here are three DIFFERENT mechanisms, and the first draft of this
-- section asserted the wrong one for two of them. Worth spelling out, because "the client
-- cannot do it" is not one fact:
--
--   * A REVOKED PRIVILEGE raises `permission denied` (42501). That is `deck_claims`, where
--     the grant itself is withdrawn, and `redeem_deck_code`.
--   * AN INSERT WITH NO RLS POLICY raises `new row violates row-level security policy`,
--     also 42501 — there is no row to hide behind, so it must error.
--   * AN UPDATE WITH NO RLS POLICY RAISES NOTHING AT ALL. RLS filters the rows the
--     statement can see, so the update simply matches zero and reports success. Asserting
--     an exception there would have been a test that passes by accident today and tells
--     you nothing; the honest assertion is that THE VALUE DID NOT CHANGE.
do $$
declare u uuid; n integer; was boolean; now_is boolean; granted text;
begin
  u := t_user();
  insert into public.entitlements (user_id, tier, granted_by) values (u, 'collector', 'manual');
  perform set_config('request.jwt.claim.sub', u::text, true);
  select collection_paywall_enabled into was from public.app_settings where id;

  set local role authenticated;

  -- deck_claims is unreachable: RLS on, no policy, and the grant revoked. This is also the
  -- test that would catch 0008 forgetting `enable row level security`, because the harness
  -- hands the client roles table privileges exactly as Supabase does.
  begin
    select count(*) into n from public.deck_claims;
    raise exception 'FAIL  a client read deck_claims';
  exception when insufficient_privilege then
    perform t_pass('a client cannot read deck_claims at all');
  end;

  begin
    insert into public.deck_claims (token_hash, print_run)
    values (encode(sha256('FORGED'::bytea), 'hex'), 'forged');
    raise exception 'FAIL  a client inserted into deck_claims';
  exception when insufficient_privilege then
    perform t_pass('a client cannot insert into deck_claims');
  end;

  -- entitlements: own row readable, nothing writable.
  select count(*) into n from public.entitlements;
  perform t_assert_eq(n, 1, 'a client reads only its own entitlement');

  begin
    insert into public.entitlements (user_id, tier, granted_by)
    values (t_user(), 'collector', 'manual');
    raise exception 'FAIL  a client granted an entitlement';
  exception when insufficient_privilege then
    perform t_pass('a client cannot grant an entitlement');
  end;

  -- No update policy, so this is a silent no-op rather than an error. The assertion is on
  -- the VALUE, which is the thing that actually matters.
  update public.entitlements set granted_by = 'deck_claim' where user_id = u;
  reset role;
  select granted_by into granted from public.entitlements where user_id = u;
  perform t_assert_eq(granted, 'manual',
    'a client update of an entitlement changes nothing (no update policy)');

  set local role authenticated;
  update public.app_settings set collection_paywall_enabled = not was where id;
  reset role;
  select collection_paywall_enabled into now_is from public.app_settings where id;
  perform t_assert_eq(now_is, was,
    'a client cannot change the paywall flag (no update policy)');

  set local role authenticated;
  begin
    perform public.redeem_deck_code(u, encode(sha256('X'::bytea), 'hex'));
    raise exception 'FAIL  a client called redeem_deck_code directly';
  exception when insufficient_privilege then
    perform t_pass('a client cannot call redeem_deck_code directly');
  end;
  reset role;
end $$;

-- ─── K. Rollback ─────────────────────────────────────────────────────────────
do $$
declare u uuid; n integer;
begin
  u := t_user();
  insert into public.discoveries (user_id, herb_id)
  select u, 'k' || i from generate_series(1, 10) i;

  update public.app_settings set collection_paywall_enabled = false, updated_at = now() where id;

  insert into public.discoveries (user_id, herb_id)
  select u, 'k2_' || i from generate_series(1, 35) i;
  select count(*) into n from public.discoveries where user_id = u;
  perform t_assert_eq(n, 45, 'ROLLBACK: one UPDATE lifts the cap for everybody, no deploy');

  update public.app_settings set collection_paywall_enabled = true where id;
  begin
    insert into public.discoveries (user_id, herb_id) values (u, 'k_final');
    raise exception 'FAIL  re-enabling the flag did not restore the cap';
  exception when check_violation then
    perform t_pass('and re-enabling it restores the cap immediately');
  end;
end $$;

update public.app_settings set collection_paywall_enabled = false where id;
