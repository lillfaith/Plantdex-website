#!/usr/bin/env bash
# Runs 0016 against a throw-away local PostgreSQL, end to end. LOCAL HARNESS: it never touches Supabase.
#   docs/discoveries/sql/run-local.sh            # full run
#   docs/discoveries/sql/run-local.sh --mutate   # also proves the verification FAILS when a protection is removed
# Needs a PostgreSQL server you may create a database in. As root it uses `su postgres`.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
DB="${D5_DB:-d5test}"
# 0014 is on the coordinator's PR branch, not on integration; use the migration dir copy when it exists.
M14="$ROOT/supabase/migrations/0014_confirm_scan.sql"
if [ ! -f "$M14" ]; then M14="$(mktemp)"; git -C "$ROOT" show origin/coord/confirm-scan-rpc:supabase/migrations/0014_confirm_scan.sql > "$M14"; fi
if [ "$(id -u)" = 0 ]; then PSQL=(su postgres -c); run() { su postgres -c "psql -v ON_ERROR_STOP=1 -q -d $DB -f -" < "$1"; }; rootsql() { su postgres -c "psql -v ON_ERROR_STOP=1 -q -d postgres -c \"$1\""; };
else run() { psql -v ON_ERROR_STOP=1 -q -d "$DB" -f - < "$1"; }; rootsql() { psql -v ON_ERROR_STOP=1 -q -d postgres -c "$1"; }; fi
q() { if [ "$(id -u)" = 0 ]; then su postgres -c "psql -At -d $DB -c \"$1\""; else psql -At -d "$DB" -c "$1"; fi; }

fresh() {
  rootsql "drop database if exists $DB" >/dev/null 2>&1; rootsql "create database $DB" >/dev/null
  run "$HERE/local-supabase-stub.sql"
  for f in "$ROOT"/supabase/migrations/*.sql; do case "$f" in *0016_*) continue;; *0014_*) [ -n "${NO_0014:-}" ] && continue;; esac; run "$f" >/dev/null 2>&1 || { echo "baseline FAILED at $f"; exit 1; }; done
  [ -n "${NO_0014:-}" ] || case "$(ls "$ROOT/supabase/migrations" | tr '\n' ' ')" in *0014_confirm_scan*) ;; *) run "$M14" >/dev/null ;; esac
}

echo "== 1. baseline (0001..0014) with PRE-EXISTING player data"
fresh
q "insert into auth.users (id,email) values ('00000000-0000-0000-0000-00000000d001','legacy1@example.invalid'),('00000000-0000-0000-0000-00000000d002','legacy2@example.invalid')" >/dev/null
q "insert into public.discoveries (user_id,herb_id,discovered_at) values ('00000000-0000-0000-0000-00000000d001','taraxacum-officinale','2025-05-01'),('00000000-0000-0000-0000-00000000d001','plantago-major','2025-05-02'),('00000000-0000-0000-0000-00000000d002','urtica-dioica','2025-06-01')" >/dev/null
q "insert into public.learned (user_id,herb_id) values ('00000000-0000-0000-0000-00000000d001','taraxacum-officinale')" >/dev/null
q "insert into public.mastered (user_id,herb_id) values ('00000000-0000-0000-0000-00000000d001','taraxacum-officinale')" >/dev/null
BEFORE=$(q "select (select count(*) from public.discoveries)||','||(select count(*) from public.learned)||','||(select count(*) from public.mastered)||','||(select count(*) from auth.users)")

echo "== 2. apply 0016, twice (must be re-runnable)"
run "$ROOT/supabase/migrations/0016_discovery_capture_enforcement.sql" >/dev/null 2>&1
run "$ROOT/supabase/migrations/0016_discovery_capture_enforcement.sql" >/dev/null 2>&1
AFTER=$(q "select (select count(*) from public.discoveries)||','||(select count(*) from public.learned)||','||(select count(*) from public.mastered)||','||(select count(*) from auth.users)")
[ "$BEFORE" = "$AFTER" ] || { echo "FAIL: 0016 changed player row counts: $BEFORE -> $AFTER"; exit 1; }
echo "ok - player rows untouched ($AFTER)"
[ "$(q "select enforce from public.discovery_enforcement")" = "f" ] || { echo "FAIL: switch is not OFF"; exit 1; }
echo "ok - switch is OFF after migration"
[ "$(q "select count(*) from public.discovery_grandfathered where source='migration_0016'")" = "3" ] || { echo "FAIL: backfill"; exit 1; }
echo "ok - every pre-existing discoveries row (3) was grandfathered"

echo "== 3. existing players are unaffected while OFF (legacy user inserts and deletes as before)"
q "set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000d001',false); insert into public.discoveries (user_id,herb_id) values ('00000000-0000-0000-0000-00000000d001','rumex-obtusifolius'); delete from public.discoveries where herb_id='rumex-obtusifolius'" >/dev/null
echo "ok - OFF behaviour unchanged"

echo "== 4. verification suite (self-rolling-back)"
run "$HERE/0016_verify.sql" 2>&1 | grep -E "NOTICE|ERROR|FAIL|CHECKS PASSED" | sed 's/^psql:<stdin>:[0-9]*: NOTICE:  //' | tee /tmp/d5-verify.out | tail -n 4
grep -q "FAIL\|ERROR" /tmp/d5-verify.out && { echo "VERIFICATION FAILED"; exit 1; }
PASSED=$(grep -c '^ok - ' /tmp/d5-verify.out); echo "verification: $PASSED checks passed"
[ "$(q "select count(*) from auth.users where email like '%d5@example.invalid'")" = "0" ] || { echo "FAIL: verify left users behind"; exit 1; }
[ "$(q "select count(*) from public.capture_sessions")" = "0" ] || { echo "FAIL: verify left sessions behind"; exit 1; }
echo "ok - the suite rolled itself back (no fixture survived)"
[ "$(q "select enforce from public.discovery_enforcement")" = "f" ] || { echo "FAIL: switch not OFF afterwards"; exit 1; }

echo "== 5. rollback never deletes player records"
run "$HERE/0016_rollback.sql" >/dev/null 2>&1
ROLLED=$(q "select (select count(*) from public.discoveries)||','||(select count(*) from public.learned)||','||(select count(*) from public.mastered)||','||(select count(*) from auth.users)")
[ "$BEFORE" = "$ROLLED" ] || { echo "FAIL: rollback changed player rows: $BEFORE -> $ROLLED"; exit 1; }
for t in capture_sessions capture_image_digests capture_receipts discovery_grandfathered discovery_enforcement; do
  [ "$(q "select to_regclass('public.$t') is not null")" = "t" ] || { echo "FAIL: rollback dropped table $t"; exit 1; }
done
[ "$(q "select count(*) from pg_proc where proname in ('claim_discovery','open_capture_session','discoveries_capture_gate')")" = "0" ] || { echo "FAIL: functions remain"; exit 1; }
echo "ok - rollback kept every record and table, dropped only triggers and functions"
run "$ROOT/supabase/migrations/0016_discovery_capture_enforcement.sql" >/dev/null 2>&1
run "$HERE/0016_verify.sql" 2>&1 | grep -q "ALL 0016 CHECKS PASSED" || { echo "FAIL: re-apply after rollback"; exit 1; }
echo "ok - 0016 re-applies cleanly after a rollback and the suite passes again"

if [ "${1:-}" = "--mutate" ]; then
  echo "== 6. mutation: the suite must FAIL when a protection is removed"
  mutate() { # name, sql
    run "$ROOT/supabase/migrations/0016_discovery_capture_enforcement.sql" >/dev/null 2>&1
    q "$2" >/dev/null
    if run "$HERE/0016_verify.sql" >/dev/null 2>&1; then echo "FAIL: suite still passes after: $1"; exit 1; else echo "ok - suite fails when: $1"; fi
  }
  mutate "the discoveries gate is dropped" "drop trigger discoveries_capture_gate_trg on public.discoveries"
  mutate "the learned gate is dropped" "drop trigger learned_requires_discovery_trg on public.learned"
  mutate "anon is granted the switch" "grant execute on function public.set_discovery_enforcement(boolean, timestamptz, text) to anon"
  mutate "clients get an update grant on receipts" "grant update on public.capture_receipts to authenticated"
  mutate "the switch is found ON (guard bypassed)" "alter table public.discovery_enforcement disable trigger discovery_enforcement_guard_trg; update public.discovery_enforcement set enforce = true; alter table public.discovery_enforcement enable trigger discovery_enforcement_guard_trg"
fi
echo "ALL LOCAL ACCEPTANCE STEPS PASSED"
