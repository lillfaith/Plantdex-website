#!/usr/bin/env bash
# S6 LOCAL END-TO-END. Never touches Supabase. Builds a throw-away PostgreSQL database with 0001..0014 + 0016
# (the draft, enforcement switch OFF as shipped), then drives the REAL identify-plant handler (a faked
# Supabase client whose service-role calls go to that database, and a stubbed provider) through
#   open_capture_session -> identify-plant -> receipt -> claim_discovery -> discoveries row
# plus replay, foreign receipt, expired session, wrong nonce, import-only, duplicate image and the bypass checks.
#   docs/scan-s6/run-local-e2e.sh
# Needs a local PostgreSQL 16 you may create a database in (as root it uses `su postgres`) and `npm ci` done.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SQL="$ROOT/docs/discoveries/sql"
DB="${S6_DB:-s6test}"
M14="$ROOT/supabase/migrations/0014_confirm_scan.sql"
if [ ! -f "$M14" ]; then M14="$(mktemp)"; git -C "$ROOT" show origin/coord/confirm-scan-rpc:supabase/migrations/0014_confirm_scan.sql > "$M14"; fi
if [ "$(id -u)" = 0 ]; then
  run() { su postgres -c "psql -v ON_ERROR_STOP=1 -q -d $DB -f -" < "$1"; }
  rootsql() { su postgres -c "psql -v ON_ERROR_STOP=1 -q -d postgres -c \"$1\""; }
else
  run() { psql -v ON_ERROR_STOP=1 -q -d "$DB" -f - < "$1"; }
  rootsql() { psql -v ON_ERROR_STOP=1 -q -d postgres -c "$1"; }
fi
echo "== building $DB: stub + 0001..0014 + 0016 (switch OFF)"
rootsql "drop database if exists $DB" >/dev/null 2>&1
rootsql "create database $DB" >/dev/null
run "$SQL/local-supabase-stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do run "$f" >/dev/null 2>&1 || { echo "baseline FAILED at $f"; exit 1; }; done
case "$(ls "$ROOT/supabase/migrations" | tr '\n' ' ')" in *0014_confirm_scan*) ;; *) run "$M14" >/dev/null ;; esac
run "$SQL/0016_discovery_capture_enforcement.sql" >/dev/null
echo "== running the live-handler suite against $DB"
cd "$ROOT"
S6_LOCAL_PG=1 S6_DB="$DB" npx vitest run src/lib/scan-capture-local-pg.test.ts
