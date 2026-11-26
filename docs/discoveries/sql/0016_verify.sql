-- 0016_verify.sql   SELF-ROLLING-BACK VERIFICATION. SQL EDITOR COMPATIBLE.
--
-- HOW TO RUN. Paste this WHOLE file into the Supabase SQL Editor of the TEST project and press Run ONCE. It is also valid for
--   psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "$(cat docs/discoveries/sql/0016_verify.sql)"
-- (the same single request). It contains no psql meta-command and no psql variable.
--
-- WHAT YOU SEE.
--   * PASS: the editor shows ONE row: status = 'ALL 0016 CHECKS PASSED (rolled back)', checks_passed = 111 (109 if migration 0014 is absent),
--           matches_expected = true. (The editor does not display RAISE NOTICE output, so the result is a row, not a notice.)
--   * FAIL: the editor shows an ERROR whose message begins 'FAIL - <the check that failed>'. The first failure stops everything.
--
-- WHY NOTHING PERSISTS. All 111 checks run inside ONE inner block of ONE function that always ends by raising a private sentinel error
-- that the function catches itself. Raising it rolls back every change the checks made (their users, receipts, sessions, quota rows, the
-- enforcement switch, SET LOCAL roles). Only the passing-check COUNT (a temporary sequence, which is not transactional) survives. A real
-- failure is not caught, so it aborts the whole request: a single multi-statement request is one implicit transaction, so that aborts and
-- rolls back everything as well. The helper functions and the sequence live in this session's private pg_temp schema and disappear when
-- the session ends; they are never in `public`.
--
-- SAFETY. It refuses to run if enforcement is already ON, and every change it makes to the switch is rolled back with the rest.
-- It creates its own users (example.invalid) and ATTACKS the database as anon / authenticated / service_role the way a signed-in player
-- with a public API key would.

drop sequence if exists pg_temp.vk_seq;
create temp sequence vk_seq;
grant usage, select on sequence pg_temp.vk_seq to public;



create or replace function pg_temp.ok(p_name text, p_cond boolean) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'FAIL - %', p_name; end if;
  perform nextval('pg_temp.vk_seq');
  raise notice 'ok - %', p_name;
end $$;


-- Run p_sql as the CURRENT role; pass only if it raises the given SQLSTATE and message fragment.
create or replace function pg_temp.refuses(p_name text, p_sql text, p_state text, p_frag text) returns void language plpgsql as $$
declare v_state text; v_msg text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
    if v_state = p_state and v_msg like '%' || p_frag || '%' then
      perform nextval('pg_temp.vk_seq');
      raise notice 'ok - %', p_name; return;
    end if;
    raise exception 'FAIL - % (wrong error: % %)', p_name, v_state, v_msg;
  end;
  raise exception 'FAIL - % (nothing was refused)', p_name;
end $$;


-- Run p_sql as the CURRENT role; pass only if it succeeds.
create or replace function pg_temp.allows(p_name text, p_sql text) returns void language plpgsql as $$
begin
  execute p_sql;
  perform nextval('pg_temp.vk_seq');
  raise notice 'ok - %', p_name;
exception when others then
  raise exception 'FAIL - % (refused: %)', p_name, sqlerrm;
end $$;


create or replace function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user::text, 'role', 'authenticated')::text, true);
end $$;

create or replace function pg_temp.vk_run() returns jsonb language plpgsql as $vk$
declare
  v_has_confirm boolean := false;
  v_before_off bigint;
begin
  begin   -- the inner block is a subtransaction: raising the sentinel below rolls back everything inside it


-- ─── 0. Preconditions ────────────────────────────────────────────────────────
perform pg_temp.ok('enforcement is OFF on entry (the migration never enables it)',
  not (select enforce from public.discovery_enforcement where singleton));

perform pg_temp.ok('the switch row exists exactly once',
  (select count(*) from public.discovery_enforcement) = 1);


insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'alice-d5@example.invalid'),
  ('00000000-0000-0000-0000-0000000000b2', 'bob-d5@example.invalid'),
  ('00000000-0000-0000-0000-0000000000c3', 'carol-d5@example.invalid');


-- ─── A. Enforcement OFF: nothing existing changes ────────────────────────────
set local role authenticated;

perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');


perform pg_temp.allows('OFF: direct insert of a new card is unchanged (manual Discover path)',
  $q$insert into public.discoveries (user_id, herb_id) values (auth.uid(), 'taraxacum-officinale')$q$);

perform pg_temp.allows('OFF: a back-dated discovered_at is unchanged (import / Seed Shelf path)',
  $q$insert into public.discoveries (user_id, herb_id, discovered_at) values (auth.uid(), 'rumex-obtusifolius', '2020-01-01')$q$);

perform pg_temp.allows('OFF: learned for a card is unchanged',
  $q$insert into public.learned (user_id, herb_id) values (auth.uid(), 'taraxacum-officinale')$q$);

perform pg_temp.allows('OFF: learned for an undiscovered card is unchanged (gate is dormant)',
  $q$insert into public.learned (user_id, herb_id) values (auth.uid(), 'urtica-dioica')$q$);

perform pg_temp.ok('recorded_at is the server clock even when discovered_at is back-dated',
  (select recorded_at > now() - interval '1 minute' and discovered_at < '2021-01-01'
     from public.discoveries where user_id = auth.uid() and herb_id = 'rumex-obtusifolius'));


perform pg_temp.ok('discovery_rules reports enforcing = false',
  (public.discovery_rules() ->> 'enforcing')::boolean = false);


reset role;

set local role service_role;

perform pg_temp.allows('OFF: service-role insert into mastered is unchanged (herbdex-action path)',
  $q$insert into public.mastered (user_id, herb_id) values ('00000000-0000-0000-0000-0000000000a1', 'urtica-dioica')$q$);

reset role;


-- Callers that must never reach the new surface.
set local role anon;

perform pg_temp.refuses('anon cannot open a capture session', $q$select public.open_capture_session()$q$, '42501', 'permission denied');

perform pg_temp.refuses('anon cannot claim', $q$select public.claim_discovery('rcpt_00000000000000000000000000000000')$q$, '42501', 'permission denied');

perform pg_temp.refuses('anon cannot flip the switch', $q$select public.set_discovery_enforcement(true, now(), 'ENFORCE NEW DISCOVERIES')$q$, '42501', 'permission denied');

reset role;


set local role authenticated;

perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');

perform pg_temp.refuses('a signed-in player cannot flip the switch',
  $q$select public.set_discovery_enforcement(true, now(), 'ENFORCE NEW DISCOVERIES')$q$, '42501', 'permission denied');

perform pg_temp.refuses('a signed-in player cannot consume a capture session (service role only)',
  $q$select public.consume_capture_session(auth.uid(), gen_random_uuid(), 'x', 'obs', array[repeat('a',64), repeat('b',64)])$q$, '42501', 'permission denied');

perform pg_temp.refuses('a signed-in player cannot issue a receipt (service role only)',
  $q$select public.issue_capture_receipts(auth.uid(), gen_random_uuid(), '[]'::jsonb)$q$, '42501', 'permission denied');

perform pg_temp.refuses('a signed-in player cannot write a receipt directly',
  $q$insert into public.capture_receipts (id, user_id, session_id, observation_id, herb_id, observed_taxon_key, observed_taxon_rank, eligibility, rank_position, species_confidence, expires_at)
     values ('rcpt_00000000000000000000000000000001', auth.uid(), gen_random_uuid(), 'o', 'plantago-major', 'k', 'species', 'exact', 'top', 'high', now() + interval '1 day')$q$,
  '42501', 'permission denied');

perform pg_temp.refuses('a signed-in player cannot write a capture session directly',
  $q$insert into public.capture_sessions (user_id, nonce_digest, expires_at) values (auth.uid(), '\x00', now() + interval '1 day')$q$, '42501', 'permission denied');

perform pg_temp.refuses('a signed-in player cannot write a grandfather row',
  $q$insert into public.discovery_grandfathered (user_id, herb_id, source) values (auth.uid(), 'plantago-major', 'enable_cutoff')$q$, '42501', 'permission denied');

perform pg_temp.refuses('a signed-in player cannot read the switch table',
  $q$select * from public.discovery_enforcement$q$, '42501', 'permission denied');

reset role;


-- ─── B. The capture flow, with enforcement still OFF ─────────────────────────
-- (the Scan lane can build against this today; claiming is additive)
set local role authenticated;

perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');

perform set_config('d5.open', public.open_capture_session()::text, true);

perform pg_temp.ok('open_capture_session returns a session and a 64-hex nonce',
  (current_setting('d5.open')::jsonb ->> 'ok')::boolean
  and (current_setting('d5.open')::jsonb ->> 'nonce') ~ '^[0-9a-f]{64}$');

perform pg_temp.ok('the session and the plaintext nonce are not readable by the player (no policy, no grant)',
  not has_table_privilege('authenticated', 'public.capture_sessions', 'select'));

reset role;

perform pg_temp.ok('only a digest of the nonce is stored',
  not exists (select 1 from public.capture_sessions
               where encode(nonce_digest, 'hex') = current_setting('d5.open')::jsonb ->> 'nonce')
  and (select count(*) from public.capture_sessions
        where id = (current_setting('d5.open')::jsonb ->> 'session_id')::uuid
          and nonce_digest = sha256(convert_to(current_setting('d5.open')::jsonb ->> 'nonce', 'UTF8'))) = 1);


-- identify-plant (service role), in the order the contract states.
set local role service_role;

perform set_config('d5.sid', current_setting('d5.open')::jsonb ->> 'session_id', true);

perform set_config('d5.nonce', current_setting('d5.open')::jsonb ->> 'nonce', true);

perform set_config('d5.d1', repeat('1', 64), true);

perform set_config('d5.d2', repeat('2', 64), true);

perform set_config('d5.d3', repeat('3', 64), true);


perform pg_temp.ok('no mandatory capture delay: min_capture_ms is 0 and min_images is 1 (owner decision)',
  (public.capture_config() ->> 'min_capture_ms')::int = 0 and (public.capture_config() ->> 'min_images')::int = 1);

reset role;

-- Fixture only: age the session, because now() is frozen for the length of this transaction.
update public.capture_sessions set issued_at = issued_at - interval '10 seconds', expires_at = expires_at - interval '10 seconds'
 where id = current_setting('d5.sid')::uuid;

set local role service_role;


perform pg_temp.ok('unknown session', (public.consume_capture_session('00000000-0000-0000-0000-0000000000b2', gen_random_uuid(),
  current_setting('d5.nonce'), 'obs_1', array[current_setting('d5.d1'), current_setting('d5.d2')])) ->> 'code' = 'capture_session_unknown');

perform pg_temp.ok('another account cannot use this session', (public.consume_capture_session('00000000-0000-0000-0000-0000000000a1', current_setting('d5.sid')::uuid,
  current_setting('d5.nonce'), 'obs_1', array[current_setting('d5.d1'), current_setting('d5.d2')])) ->> 'code' = 'capture_session_unknown');

perform pg_temp.ok('wrong nonce', (public.consume_capture_session('00000000-0000-0000-0000-0000000000b2', current_setting('d5.sid')::uuid,
  repeat('0', 64), 'obs_1', array[current_setting('d5.d1'), current_setting('d5.d2')])) ->> 'code' = 'capture_session_nonce');

perform pg_temp.ok('zero images is not enough', (public.consume_capture_session('00000000-0000-0000-0000-0000000000b2', current_setting('d5.sid')::uuid,
  current_setting('d5.nonce'), 'obs_1', array[]::text[])) ->> 'code' = 'capture_images_invalid');

perform pg_temp.ok('four images are too many', (public.consume_capture_session('00000000-0000-0000-0000-0000000000b2', current_setting('d5.sid')::uuid,
  current_setting('d5.nonce'), 'obs_1', array[repeat('1',64), repeat('2',64), repeat('3',64), repeat('4',64)])) ->> 'code' = 'capture_images_invalid');

perform pg_temp.ok('a malformed digest is refused', (public.consume_capture_session('00000000-0000-0000-0000-0000000000b2', current_setting('d5.sid')::uuid,
  current_setting('d5.nonce'), 'obs_1', array[current_setting('d5.d1'), 'not-hex'])) ->> 'code' = 'capture_images_invalid');

perform pg_temp.ok('the same image twice in one request is refused', (public.consume_capture_session('00000000-0000-0000-0000-0000000000b2', current_setting('d5.sid')::uuid,
  current_setting('d5.nonce'), 'obs_1', array[current_setting('d5.d1'), current_setting('d5.d1')])) ->> 'code' = 'capture_images_invalid');


perform set_config('d5.consume', public.consume_capture_session('00000000-0000-0000-0000-0000000000b2', current_setting('d5.sid')::uuid,
  current_setting('d5.nonce'), 'obs_1', array[current_setting('d5.d1'), current_setting('d5.d2')])::text, true);

perform pg_temp.ok('a well-formed, aged session is consumed', (current_setting('d5.consume')::jsonb ->> 'ok')::boolean
  and not (current_setting('d5.consume')::jsonb ->> 'replay')::boolean);

perform pg_temp.ok('REPLAY: the identical request after a lost response is accepted as a replay, not a second use',
  (public.consume_capture_session('00000000-0000-0000-0000-0000000000b2', current_setting('d5.sid')::uuid,
    current_setting('d5.nonce'), 'obs_1', array[current_setting('d5.d1'), current_setting('d5.d2')])) ->> 'replay' = 'true');

perform pg_temp.ok('REPLAY: a different request on a used session is refused',
  (public.consume_capture_session('00000000-0000-0000-0000-0000000000b2', current_setting('d5.sid')::uuid,
    current_setting('d5.nonce'), 'obs_1', array[current_setting('d5.d1'), current_setting('d5.d3')])) ->> 'code' = 'capture_session_used');


-- Receipts: one eligible, one ineligible (legacyGenus), one not a catalogue card.
perform set_config('d5.issued', public.issue_capture_receipts('00000000-0000-0000-0000-0000000000b2', current_setting('d5.sid')::uuid,
  '[{"herb_id":"plantago-major","observed_taxon_key":"plantago major","observed_taxon_rank":"species","eligibility":"exact","rank_position":"top","species_confidence":"high"},
    {"herb_id":"trifolium-pratense","observed_taxon_key":"trifolium pratense","observed_taxon_rank":"species","eligibility":"legacyGenus","rank_position":"top","species_confidence":"high"},
    {"herb_id":"not-a-card","observed_taxon_key":"x","observed_taxon_rank":"species","eligibility":"exact","rank_position":"top","species_confidence":"high"}]'::jsonb)::text, true);

perform pg_temp.ok('only the eligible catalogue candidate got a receipt (legacyGenus and an unknown card are skipped, not fatal)',
  jsonb_array_length(current_setting('d5.issued')::jsonb) = 1
  and current_setting('d5.issued')::jsonb -> 0 ->> 'herb_id' = 'plantago-major');

perform set_config('d5.rid', current_setting('d5.issued')::jsonb -> 0 ->> 'id', true);

perform pg_temp.ok('a receipt id has the contract shape', current_setting('d5.rid') ~ '^rcpt_[0-9a-f]{32}$');

perform pg_temp.ok('issuing twice for the same candidate is idempotent (same id, no second row)',
  (public.issue_capture_receipts('00000000-0000-0000-0000-0000000000b2', current_setting('d5.sid')::uuid,
    '[{"herb_id":"plantago-major","observed_taxon_key":"plantago major","observed_taxon_rank":"species","eligibility":"exact","rank_position":"top","species_confidence":"high"}]'::jsonb)) -> 0 ->> 'id' = current_setting('d5.rid'));

reset role;

perform pg_temp.ok('exactly one receipt row exists', (select count(*) from public.capture_receipts where observation_id = 'obs_1') = 1);


-- ONE mandatory photograph (owner decision): a session submitted with exactly one image is consumed.
reset role;

set local role authenticated;

perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');

perform set_config('d5.open_one', public.open_capture_session()::text, true);

reset role;

set local role service_role;

perform pg_temp.ok('ONE IMAGE is a valid capture (additional angles are optional), and an immediate submit is accepted',
  (public.consume_capture_session('00000000-0000-0000-0000-0000000000b2', (current_setting('d5.open_one')::jsonb ->> 'session_id')::uuid,
    current_setting('d5.open_one')::jsonb ->> 'nonce', 'obs_one', array[repeat('7', 64)])) ->> 'ok' = 'true');

perform pg_temp.ok('the SAME account re-using an image is accepted and is not flagged (a retake is harmless)',
  (select not suspect_duplicate from public.capture_sessions where id = (current_setting('d5.open_one')::jsonb ->> 'session_id')::uuid));

-- PROVIDER FAILURE: the function hands the session back so the same photographs can be retried as a FIRST use.
perform pg_temp.ok('release: a consumed session with NO receipt is handed back',
  public.release_capture_session('00000000-0000-0000-0000-0000000000b2', (current_setting('d5.open_one')::jsonb ->> 'session_id')::uuid));

perform pg_temp.ok('release: the retry with the same photograph is a first use again, not a replay',
  (public.consume_capture_session('00000000-0000-0000-0000-0000000000b2', (current_setting('d5.open_one')::jsonb ->> 'session_id')::uuid,
    current_setting('d5.open_one')::jsonb ->> 'nonce', 'obs_one_retry', array[repeat('7', 64)])) ->> 'replay' = 'false');

perform pg_temp.ok('release: another account cannot release this session',
  not public.release_capture_session('00000000-0000-0000-0000-0000000000a1', (current_setting('d5.open_one')::jsonb ->> 'session_id')::uuid));

perform pg_temp.ok('release: a session whose result was already issued can NEVER be handed back (no re-rolling a seen answer)',
  not public.release_capture_session('00000000-0000-0000-0000-0000000000b2', current_setting('d5.sid')::uuid));

reset role;

set local role authenticated;

perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');

reset role;

-- ALLOWANCE REFUND: idempotent per request, capped per day, scoped to the caller's own bucket, never below zero.
insert into public.scan_quota (bucket, day, count) values ('user:refund-test', current_date, 5), ('global', current_date, 10)
  on conflict (bucket, day) do update set count = excluded.count;

set local role service_role;

perform pg_temp.ok('refund: the per-caller unit is given back', public.refund_scan_claim('user:refund-test', current_date, '11111111-1111-4111-8111-111111111111'));

perform pg_temp.ok('refund: the per-caller count went 5 -> 4',
  (select count from public.scan_quota where bucket = 'user:refund-test' and day = current_date) = 4);

perform pg_temp.ok('refund: IDEMPOTENT - the same request id again refunds nothing and changes nothing',
  not public.refund_scan_claim('user:refund-test', current_date, '11111111-1111-4111-8111-111111111111')
  and (select count from public.scan_quota where bucket = 'user:refund-test' and day = current_date) = 4);

perform pg_temp.ok('refund: the GLOBAL bucket is never refunded', not public.refund_scan_claim('global', current_date, '22222222-2222-4222-8222-222222222222')
  and (select count from public.scan_quota where bucket = 'global' and day = current_date) = 10);

perform pg_temp.ok('refund: a malformed request id is refused', not public.refund_scan_claim('user:refund-test', current_date, 'not-a-uuid'));

perform pg_temp.ok('refund: a day far from today is refused (no refunding old buckets)', not public.refund_scan_claim('user:refund-test', current_date - 5, '33333333-3333-4333-8333-333333333333'));

perform pg_temp.ok('refund: a bucket with no claim that day is refused', not public.refund_scan_claim('user:never-claimed', current_date, '44444444-4444-4444-8444-444444444444'));

perform pg_temp.ok('refund: 2nd and 3rd distinct requests refund', public.refund_scan_claim('user:refund-test', current_date, '55555555-5555-4555-8555-555555555555')
  and public.refund_scan_claim('user:refund-test', current_date, '66666666-6666-4666-8666-666666666666'));

perform pg_temp.ok('refund: the DAILY CAP (3) holds - a 4th distinct request is refused and the count stays at 2',
  not public.refund_scan_claim('user:refund-test', current_date, '77777777-7777-4777-8777-777777777777')
  and (select count from public.scan_quota where bucket = 'user:refund-test' and day = current_date) = 2);

reset role;

perform pg_temp.ok('refund: the ledger holds a bucket DIGEST and a request id, not a user id',
  (select count(*) from public.scan_refunds where observation_id = '11111111-1111-4111-8111-111111111111') = 1
  and (select pg_catalog.octet_length(bucket_digest) from public.scan_refunds limit 1) = 32);

update public.scan_quota set count = 0 where bucket = 'user:refund-test' and day = current_date;

delete from public.scan_refunds;

set local role service_role;

perform pg_temp.ok('refund: never below zero', not public.refund_scan_claim('user:refund-test', current_date, '88888888-8888-4888-8888-888888888888')
  and (select count from public.scan_quota where bucket = 'user:refund-test' and day = current_date) = 0);

reset role;

delete from public.scan_quota where bucket = 'user:refund-test';

delete from public.scan_refunds;

set local role authenticated;

perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');

perform pg_temp.refuses('refund: a signed-in player cannot call it (service role only)',
  $q$select public.refund_scan_claim('user:anyone', current_date, gen_random_uuid()::text)$q$, '42501', 'permission denied');

perform pg_temp.refuses('release: a signed-in player cannot call it (service role only)',
  $q$select public.release_capture_session(auth.uid(), gen_random_uuid())$q$, '42501', 'permission denied');

reset role;


-- Duplicate image across accounts: a second account, a second session, one reused image.
set local role authenticated;

perform pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');

perform set_config('d5.open_c', public.open_capture_session()::text, true);

reset role;

update public.capture_sessions set issued_at = issued_at - interval '10 seconds', expires_at = expires_at - interval '10 seconds'
 where id = (current_setting('d5.open_c')::jsonb ->> 'session_id')::uuid;

set local role service_role;

perform set_config('d5.dup_c', public.consume_capture_session('00000000-0000-0000-0000-0000000000c3', (current_setting('d5.open_c')::jsonb ->> 'session_id')::uuid,
  current_setting('d5.open_c')::jsonb ->> 'nonce', 'obs_c', array[current_setting('d5.d1'), repeat('9', 64)])::text, true);

perform pg_temp.ok('DUPLICATE IMAGE (cross-account) is ACCEPTED, not refused',
  (current_setting('d5.dup_c')::jsonb ->> 'ok')::boolean);

perform pg_temp.ok('...and nothing in the response reveals the duplicate (no flag, no code, only ok/replay/session_id/observation_id)',
  (select array_agg(k order by k) from jsonb_object_keys(current_setting('d5.dup_c')::jsonb) k) = array['observation_id','ok','replay','session_id']
  and current_setting('d5.dup_c') !~* 'dup|suspect|flag');

reset role;

perform pg_temp.ok('...and the session is FLAGGED for review',
  (select suspect_duplicate from public.capture_sessions where id = (current_setting('d5.open_c')::jsonb ->> 'session_id')::uuid));

set local role service_role;

perform pg_temp.ok('a session with no cross-account duplicate is NOT flagged',
  not (select suspect_duplicate from public.capture_sessions where id = current_setting('d5.sid')::uuid));

reset role;


-- Session limits.
set local role authenticated;

perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');

perform public.open_capture_session();

 perform public.open_capture_session();

 perform public.open_capture_session();

perform pg_temp.ok('a fourth concurrent session is refused',
  public.open_capture_session() ->> 'code' = 'too_many_open_sessions');

reset role;

-- Fixture only: expire alice's open sessions, then exhaust the daily limit with consumed ones.
update public.capture_sessions set consumed_at = now() where user_id = '00000000-0000-0000-0000-0000000000a1';

insert into public.capture_sessions (user_id, nonce_digest, expires_at, consumed_at)
  select '00000000-0000-0000-0000-0000000000a1', '\x00', now() + interval '1 hour', now() from generate_series(1, 57);

set local role authenticated;

perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');

perform pg_temp.ok('the 61st session in a UTC day is refused',
  public.open_capture_session() ->> 'code' = 'daily_session_limit');

reset role;


-- ─── C. Claiming, with enforcement still OFF ─────────────────────────────────
set local role authenticated;

perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');

perform pg_temp.ok('bob can read his own receipt', (select count(*) from public.capture_receipts where id = current_setting('d5.rid')) = 1);

perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');

perform pg_temp.ok('alice cannot read bob''s receipt', (select count(*) from public.capture_receipts) = 0);

perform pg_temp.ok('FORGED receipt id is refused', public.claim_discovery('rcpt_ffffffffffffffffffffffffffffffff') ->> 'code' = 'receipt_unknown');

perform pg_temp.ok('malformed receipt id is refused', public.claim_discovery('nonsense') ->> 'code' = 'receipt_unknown');

perform pg_temp.ok('ANOTHER ACCOUNT''S receipt is refused, indistinguishable from a forged one',
  public.claim_discovery(current_setting('d5.rid')) ->> 'code' = 'receipt_unknown');

perform pg_temp.refuses('a signed-in player cannot mark a receipt claimed himself',
  format($q$update public.capture_receipts set claimed_at = now() where id = %L$q$, current_setting('d5.rid')), '42501', 'permission denied');

reset role;


-- ─── D. TURN ENFORCEMENT ON (service role, with the confirmation phrase) ─────
set local role service_role;

perform pg_temp.refuses('the switch needs the confirmation phrase',
  $q$select public.set_discovery_enforcement(true, now(), 'yes')$q$, '22023', 'confirmation_phrase_required');

perform pg_temp.refuses('the switch needs a cutoff',
  $q$select public.set_discovery_enforcement(true, null, 'ENFORCE NEW DISCOVERIES')$q$, '22023', 'cutoff_required');

perform pg_temp.refuses('the cutoff may not be in the future',
  $q$select public.set_discovery_enforcement(true, now() + interval '1 day', 'ENFORCE NEW DISCOVERIES')$q$, '22023', 'cutoff_required');

reset role;

perform pg_temp.refuses('the switch row cannot be edited directly, even by its owner',
  $q$update public.discovery_enforcement set enforce = true$q$, '42501', 'only_through_function');

perform pg_temp.refuses('the switch row cannot be deleted',
  $q$delete from public.discovery_enforcement$q$, '42501', 'permanent');


-- Alice's two pre-existing rows are grandfathered by the cutoff; a row recorded AFTER it is not.
update public.discoveries set recorded_at = now() - interval '1 hour' where user_id = '00000000-0000-0000-0000-0000000000a1';

set local role service_role;

perform set_config('d5.enable', public.set_discovery_enforcement(true, now() - interval '30 minutes', 'ENFORCE NEW DISCOVERIES')::text, true);

reset role;

perform pg_temp.ok('enforcement is now ON', (select enforce from public.discovery_enforcement where singleton));

perform pg_temp.ok('existing rows were grandfathered at the cutoff', (current_setting('d5.enable')::jsonb ->> 'newly_grandfathered')::int = 2);


-- ─── E. ON: the bypasses ─────────────────────────────────────────────────────
set local role authenticated;

perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');

perform pg_temp.ok('discovery_rules reports enforcing = true', (public.discovery_rules() ->> 'enforcing')::boolean);


perform pg_temp.refuses('ON: DIRECT INSERT of a new card is refused (the public-API bypass)',
  $q$insert into public.discoveries (user_id, herb_id) values (auth.uid(), 'urtica-dioica')$q$, '42501', 'discovery_requires_capture_receipt');

perform pg_temp.refuses('ON: a BACK-DATED direct insert is refused (import / Seed Shelf shape)',
  $q$insert into public.discoveries (user_id, herb_id, discovered_at) values (auth.uid(), 'urtica-dioica', '2020-01-01')$q$, '42501', 'discovery_requires_capture_receipt');

perform pg_temp.refuses('ON: an upsert-with-ignore-duplicates insert is refused too (what the adapter sends)',
  $q$insert into public.discoveries (user_id, herb_id) values (auth.uid(), 'urtica-dioica') on conflict do nothing$q$, '42501', 'discovery_requires_capture_receipt');

-- BEFORE triggers run ahead of the RLS WITH CHECK, so the refusal may come from either; both are 42501.
perform pg_temp.refuses('ON: a player cannot insert for ANOTHER user either',
  $q$insert into public.discoveries (user_id, herb_id) values ('00000000-0000-0000-0000-0000000000a1', 'urtica-dioica')$q$, '42501', '');

perform pg_temp.refuses('ON: learned for an undiscovered card is refused',
  $q$insert into public.learned (user_id, herb_id) values (auth.uid(), 'urtica-dioica')$q$, '42501', 'discovery_required_first');

reset role;

set local role service_role;

perform pg_temp.refuses('ON: even the SERVICE ROLE cannot insert a discovery without a receipt',
  $q$insert into public.discoveries (user_id, herb_id) values ('00000000-0000-0000-0000-0000000000b2', 'urtica-dioica')$q$, '42501', 'discovery_requires_capture_receipt');

perform pg_temp.refuses('ON: mastered for an undiscovered card is refused (herbdex-action cannot mint)',
  $q$insert into public.mastered (user_id, herb_id) values ('00000000-0000-0000-0000-0000000000b2', 'urtica-dioica')$q$, '42501', 'discovery_required_first');

reset role;

perform pg_temp.ok('nothing leaked through: bob still holds no discovery',
  (select count(*) from public.discoveries where user_id = '00000000-0000-0000-0000-0000000000b2') = 0);


-- 0016 does not depend on 0014: this check runs only where confirm_scan exists.
v_has_confirm := to_regprocedure('public.confirm_scan(text,text,text,numeric,text,text,text)') is not null;

if v_has_confirm then null;

-- confirm_scan (0014) with a forged receipt: it has no receipt parameter and writes scans.confirmed_* only.
set local role authenticated;

perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');

insert into public.scans (id, user_id, outcome) values ('scan_d5_1', auth.uid(), 'matched');

perform pg_temp.ok('confirm_scan (with a card id and a fabricated "receipt" in the name field) succeeds as a SCAN confirmation',
  public.confirm_scan('scan_d5_1', 'urtica-dioica', 'rcpt_ffffffffffffffffffffffffffffffff', 0.9, 'species', 'exact', 'high'));

reset role;

perform pg_temp.ok('...and it created NO discovery and NO receipt',
  (select count(*) from public.discoveries where user_id = '00000000-0000-0000-0000-0000000000b2') = 0
  and (select count(*) from public.capture_receipts where user_id = '00000000-0000-0000-0000-0000000000b2' and herb_id = 'urtica-dioica') = 0);


end if;


-- The legitimate route: claim the receipt the server issued.
set local role authenticated;

perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');

perform set_config('d5.claim', public.claim_discovery(current_setting('d5.rid'))::text, true);

perform pg_temp.ok('CLAIM: the real receipt is claimed', current_setting('d5.claim')::jsonb ->> 'status' = 'claimed'
  and current_setting('d5.claim')::jsonb ->> 'herb_id' = 'plantago-major');

perform pg_temp.ok('CLAIM: the discovery carries the SERVER clock',
  (select discovered_at > now() - interval '1 minute' from public.discoveries
    where user_id = auth.uid() and herb_id = 'plantago-major'));

perform pg_temp.ok('CLAIM: idempotent. A second claim writes nothing new',
  public.claim_discovery(current_setting('d5.rid')) ->> 'status' = 'already_claimed'
  and (select count(*) from public.discoveries where user_id = auth.uid()) = 1);

perform pg_temp.allows('learned for the claimed card is now allowed', $q$insert into public.learned (user_id, herb_id) values (auth.uid(), 'plantago-major')$q$);

perform pg_temp.refuses('a claimed receipt does not unlock a DIFFERENT card',
  $q$insert into public.discoveries (user_id, herb_id) values (auth.uid(), 'urtica-dioica')$q$, '42501', 'discovery_requires_capture_receipt');

perform pg_temp.allows('delete-and-reinsert of an earned card is allowed (no revocation, no loop-hole)',
  $q$delete from public.discoveries where user_id = auth.uid() and herb_id = 'plantago-major'$q$);

perform pg_temp.allows('...re-insert after that delete is allowed because the receipt was claimed',
  $q$insert into public.discoveries (user_id, herb_id) values (auth.uid(), 'plantago-major')$q$);

reset role;

set local role service_role;

perform pg_temp.allows('mastered for a discovered card is allowed (the herbdex-action path)',
  $q$insert into public.mastered (user_id, herb_id) values ('00000000-0000-0000-0000-0000000000b2', 'plantago-major')$q$);

reset role;


-- Expired and ineligible receipts, fixture-built, then claimed as the owner.
insert into public.capture_receipts (id, user_id, session_id, observation_id, herb_id, observed_taxon_key,
    observed_taxon_rank, eligibility, rank_position, species_confidence, issued_at, expires_at)
  values ('rcpt_eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', '00000000-0000-0000-0000-0000000000b2',
    current_setting('d5.sid')::uuid, 'obs_old', 'urtica-dioica', 'urtica dioica', 'species', 'exact', 'top', 'high',
    now() - interval '40 days', now() - interval '10 days');

set local role authenticated;

perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');

perform pg_temp.ok('EXPIRED receipt is refused', public.claim_discovery('rcpt_eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') ->> 'code' = 'receipt_expired');

perform pg_temp.ok('the expired claim wrote nothing',
  (select count(*) from public.discoveries where user_id = auth.uid() and herb_id = 'urtica-dioica') = 0);

reset role;


-- A receipt for a card the account already holds: marks claimed, writes no second row.
set local role authenticated;

perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');

reset role;

insert into public.capture_receipts (id, user_id, session_id, observation_id, herb_id, observed_taxon_key,
    observed_taxon_rank, eligibility, rank_position, species_confidence, expires_at)
  values ('rcpt_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '00000000-0000-0000-0000-0000000000a1',
    (select id from public.capture_sessions where user_id = '00000000-0000-0000-0000-0000000000a1' limit 1),
    'obs_a', 'taraxacum-officinale', 'taraxacum officinale', 'species', 'exact', 'top', 'high', now() + interval '30 days');

set local role authenticated;

perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');

perform pg_temp.ok('a receipt for an already-held card is reported as already_held and adds no row',
  public.claim_discovery('rcpt_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa') ->> 'status' = 'already_held'
  and (select count(*) from public.discoveries where user_id = auth.uid()) = 2);


-- GRANDFATHERING: alice's pre-existing rows survive a delete and re-insert, new cards stay refused.
perform pg_temp.allows('GRANDFATHERED: delete of a pre-existing discovery', $q$delete from public.discoveries where user_id = auth.uid() and herb_id = 'rumex-obtusifolius'$q$);

perform pg_temp.allows('GRANDFATHERED: re-insert of the same pre-existing card is allowed',
  $q$insert into public.discoveries (user_id, herb_id, discovered_at) values (auth.uid(), 'rumex-obtusifolius', '2020-01-01')$q$);

perform pg_temp.refuses('GRANDFATHERED: a card she never held is still refused',
  $q$insert into public.discoveries (user_id, herb_id) values (auth.uid(), 'plantago-major')$q$, '42501', 'discovery_requires_capture_receipt');

perform pg_temp.allows('GRANDFATHERED: her learned rows for held cards are unaffected',
  $q$insert into public.learned (user_id, herb_id) values (auth.uid(), 'rumex-obtusifolius')$q$);

reset role;


-- A row recorded after the cutoff is NOT grandfathered (the pre-stuffing defence).
set local role service_role;

perform pg_temp.ok('a second enable with a later cutoff grandfathers only rows recorded by then',
  (public.set_discovery_enforcement(true, now(), 'ENFORCE NEW DISCOVERIES') ->> 'enforcing')::boolean);

reset role;


-- RLS and grants on every new table: no client write path exists at all.
perform pg_temp.ok('no new table grants INSERT, UPDATE or DELETE to anon or authenticated',
  not exists (
    select 1 from information_schema.role_table_grants g
     where g.table_schema = 'public'
       and g.table_name in ('capture_sessions','capture_image_digests','capture_receipts','discovery_enforcement','discovery_grandfathered')
       and g.grantee in ('anon','authenticated','PUBLIC')
       and g.privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')));

perform pg_temp.ok('no policy on a new table permits anything but select',
  not exists (
    select 1 from pg_policies p
     where p.schemaname = 'public'
       and p.tablename in ('capture_sessions','capture_image_digests','capture_receipts','discovery_enforcement','discovery_grandfathered')
       and p.cmd <> 'SELECT'));

perform pg_temp.ok('every new table has row level security enabled',
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relrowsecurity
      and c.relname in ('capture_sessions','capture_image_digests','capture_receipts','discovery_enforcement','discovery_grandfathered')) = 5);

perform pg_temp.ok('a claimed receipt is immutable even to the table owner',
  (select claimed_at is not null from public.capture_receipts where id = current_setting('d5.rid')));

perform pg_temp.refuses('...so editing any column of it fails',
  format($q$update public.capture_receipts set herb_id = 'urtica-dioica' where id = %L$q$, current_setting('d5.rid')), '42501', 'immutable');


-- ─── F. Switch OFF again: nothing is revoked, everything is allowed as before ──
v_before_off := (select count(*) from public.discoveries);

set local role service_role;

perform pg_temp.ok('the switch can be turned off', not (public.set_discovery_enforcement(false, null, null) ->> 'enforcing')::boolean);

reset role;

perform pg_temp.ok('OFF again: no discovery was deleted by switching', (select count(*) from public.discoveries) = v_before_off);

perform pg_temp.ok('OFF again: receipts and grandfather rows are untouched',
  (select count(*) from public.capture_receipts) >= 3 and (select count(*) from public.discovery_grandfathered) >= 2);

set local role authenticated;

perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');

perform pg_temp.allows('OFF again: direct insert of a new card works exactly as before',
  $q$insert into public.discoveries (user_id, herb_id) values (auth.uid(), 'urtica-dioica')$q$);

reset role;
    raise exception 'verification complete - rolling back' using errcode = 'VK001';
  exception when sqlstate 'VK001' then
    null;   -- the sentinel, and only the sentinel, is swallowed
  end;
  return jsonb_build_object(
    'checks_passed', (select last_value from pg_temp.vk_seq),
    'confirm_scan_checks_included', v_has_confirm);
end $vk$;

select case when (r ->> 'checks_passed')::int = case when (r ->> 'confirm_scan_checks_included')::boolean then 111 else 109 end
            then 'ALL 0016 CHECKS PASSED (rolled back)'
            else 'CHECK COUNT MISMATCH - TREAT AS FAILED (rolled back)' end           as status,
       (r ->> 'checks_passed')::int                                                  as checks_passed,
       case when (r ->> 'confirm_scan_checks_included')::boolean then 111 else 109 end as expected_checks,
       (r ->> 'checks_passed')::int = case when (r ->> 'confirm_scan_checks_included')::boolean then 111 else 109 end as matches_expected,
       (r ->> 'confirm_scan_checks_included')::boolean                               as confirm_scan_present
from (select pg_temp.vk_run() as r) x;
