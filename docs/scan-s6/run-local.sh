#!/usr/bin/env bash
# Scan S6 LOCAL end-to-end: the real identify-plant handler (faked provider) against the real migration
# 0016, on a throw-away LOCAL PostgreSQL 16. It never touches Supabase and never turns enforcement on.
#   docs/scan-s6/run-local.sh
# Needs: a PostgreSQL server you may create a database in (as root it uses `su postgres`), and `npm ci`.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SQL="$ROOT/docs/discoveries/sql"
DB="${S6_LOCAL_DB:-s6test}"
M14="$ROOT/supabase/migrations/0014_confirm_scan.sql"
# 0014 is on the coordinator's branch, not on integration, until it lands; the discoveries harness does the same.
if [ ! -f "$M14" ]; then M14="$(mktemp)"; git -C "$ROOT" show origin/coord/confirm-scan-rpc:supabase/migrations/0014_confirm_scan.sql > "$M14"; fi

if [ "$(id -u)" = 0 ]; then
  run() { su postgres -c "psql -v ON_ERROR_STOP=1 -q -d $DB -f -" < "$1"; }
  rootsql() { su postgres -c "psql -v ON_ERROR_STOP=1 -q -d postgres -c \"$1\""; }
  export S6_LOCAL_AS_POSTGRES=1
else
  run() { psql -v ON_ERROR_STOP=1 -q -d "$DB" -f - < "$1"; }
  rootsql() { psql -v ON_ERROR_STOP=1 -q -d postgres -c "$1"; }
fi

echo "== 1. fresh database: stub + 0001..0014 + 0016 (enforcement stays OFF)"
rootsql "drop database if exists $DB" >/dev/null 2>&1
rootsql "create database $DB" >/dev/null
run "$SQL/local-supabase-stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do case "$f" in *0016_*) continue;; esac; run "$f" >/dev/null 2>&1 || { echo "baseline FAILED at $f"; exit 1; }; done
case "$(ls "$ROOT/supabase/migrations" | tr '\n' ' ')" in *0014_confirm_scan*) ;; *) run "$M14" >/dev/null ;; esac
run "$ROOT/supabase/migrations/0016_discovery_capture_enforcement.sql" >/dev/null

echo "== 2. the handler, end to end, against it"
cd "$ROOT"
S6_LOCAL_DB="$DB" npx vitest run src/lib/scan-edge-receipts.local.test.ts
echo "ALL S6 LOCAL STEPS PASSED"
