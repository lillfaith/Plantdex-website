#!/usr/bin/env bash
# Apply a migration to a throwaway PostgreSQL and run its test suite against it.
#
# WHY THIS EXISTS. `npm test` cannot run SQL and `npm run check:edge` cannot either, so
# until this script the only way to find out whether a migration worked was to apply it to
# the live project. Three real defects in 0008 were found here instead: a per-row trigger
# refusing `ON CONFLICT DO NOTHING` rows it was never going to write, batch inserts
# bypassing the cap entirely under READ COMMITTED, and the grandfather pass re-running on a
# second application and granting free Collector access to everybody who had signed up in
# between. None of the three is visible by reading.
#
# It needs a local `initdb`/`pg_ctl` (Debian/Ubuntu: postgresql-16) and nothing else. It
# NEVER touches a Supabase project, and it drops its cluster on exit.
set -euo pipefail

MIGRATION="${1:-supabase/migrations/0008_collection_entitlements.sql}"
TESTS="${2:-supabase/tests/0008_collection_entitlements.test.sql}"
PORT="${PGTESTPORT:-5433}"
DATA="${PGTESTDATA:-/tmp/plantdex-pgtest-$$}"

PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
[ -n "$PGBIN" ] && export PATH="$PGBIN:$PATH"
command -v initdb >/dev/null || { echo "initdb not found - install postgresql"; exit 2; }

# initdb refuses to run as root, which it is inside CI containers and this agent's sandbox.
AS=""
if [ "$(id -u)" = "0" ]; then
  id postgres >/dev/null 2>&1 || useradd -r postgres
  AS="postgres"
fi
run() { if [ -n "$AS" ]; then su "$AS" -s /bin/bash -c "PATH=$PATH $1"; else bash -c "$1"; fi; }

cleanup() {
  run "pg_ctl -D $DATA -m immediate stop" >/dev/null 2>&1 || true
  rm -rf "$DATA"
}
trap cleanup EXIT

rm -rf "$DATA"; mkdir -p "$DATA"
[ -n "$AS" ] && chown "$AS" "$DATA"
chmod 700 "$DATA"

run "initdb -D $DATA -A trust -U postgres" >/dev/null
# fsync off: the cluster is thrown away, so durability buys nothing and costs seconds.
run "pg_ctl -D $DATA -o '-p $PORT -k /tmp -c fsync=off' -l $DATA/log start" >/dev/null
for _ in $(seq 1 20); do
  psql -h /tmp -p "$PORT" -U postgres -tAc 'select 1' >/dev/null 2>&1 && break
  sleep 0.5
done

DB=plantdex_migration_test
psql -h /tmp -p "$PORT" -U postgres -q -c "create database $DB"
PSQL=(psql -h /tmp -p "$PORT" -U postgres -d "$DB" -q -v ON_ERROR_STOP=1)

echo "── harness ──"
"${PSQL[@]}" -f supabase/tests/harness.sql

echo "── $MIGRATION ──"
"${PSQL[@]}" -f "$MIGRATION" 2>&1 | grep -vE "NOTICE:  (relation|trigger)" || true

# APPLYING IT TWICE IS PART OF THE TEST, not tidiness. Every file in supabase/migrations
# has to survive a second application, and the re-grandfathering bug was invisible until a
# second run granted entitlements the first had correctly withheld.
echo "── $MIGRATION (second application: must be a no-op) ──"
"${PSQL[@]}" -f "$MIGRATION" 2>&1 | grep -iE "already ran" || true

echo "── tests ──"
"${PSQL[@]}" -f "$TESTS" 2>&1 | sed -e 's/^psql.*NOTICE:  //' -e '/^$/d'

# ── Concurrency, which needs genuinely parallel sessions ─────────────────────
# A `do $$ ... $$` block cannot race itself, so the boundary test lives here. A user one
# slot below the cap; two overlapping transactions each claiming it. Exactly one may win.
echo "── concurrency ──"
"${PSQL[@]}" -c "update public.app_settings set collection_paywall_enabled = true where id"
U=$(psql -h /tmp -p "$PORT" -U postgres -d "$DB" -tAc "select t_user();" | tr -d ' ')
"${PSQL[@]}" -c "insert into public.discoveries (user_id, herb_id)
                 select '$U', 'r'||i from generate_series(1,9) i"
for H in raceA raceB; do
  ( psql -h /tmp -p "$PORT" -U postgres -d "$DB" -tA -c "
      begin; select pg_sleep(0.3);
      insert into public.discoveries (user_id, herb_id) values ('$U', '$H');
      select pg_sleep(0.7); commit;" >/dev/null 2>&1 ) &
done
wait
N=$(psql -h /tmp -p "$PORT" -U postgres -d "$DB" -tAc \
      "select count(*) from public.discoveries where user_id='$U';" | tr -d ' ')
if [ "$N" = "10" ]; then
  echo "PASS  two concurrent transactions race for the last slot; exactly one wins"
else
  echo "FAIL  concurrent race left $N discoveries, expected 10"; exit 1
fi

# The same race on one code. Only one account may end up entitled.
A=$(psql -h /tmp -p "$PORT" -U postgres -d "$DB" -tAc "select t_user();" | tr -d ' ')
B=$(psql -h /tmp -p "$PORT" -U postgres -d "$DB" -tAc "select t_user();" | tr -d ' ')
HASH=$(psql -h /tmp -p "$PORT" -U postgres -d "$DB" -tAc \
        "select encode(sha256('PLNTRACE'::bytea),'hex');" | tr -d ' ')
"${PSQL[@]}" -c "insert into public.deck_claims (token_hash, print_run)
                 values ('$HASH', 'race-run')"
for WHO in "$A" "$B"; do
  ( psql -h /tmp -p "$PORT" -U postgres -d "$DB" -tA -c "
      begin; select pg_sleep(0.3);
      select public.redeem_deck_code('$WHO', '$HASH');
      select pg_sleep(0.7); commit;" >/dev/null 2>&1 ) &
done
wait
E=$(psql -h /tmp -p "$PORT" -U postgres -d "$DB" -tAc \
     "select count(*) from public.entitlements where granted_by='deck_claim'
       and user_id in ('$A','$B');" | tr -d ' ')
if [ "$E" = "1" ]; then
  echo "PASS  two accounts race for one code; exactly one is entitled"
else
  echo "FAIL  concurrent redemption entitled $E accounts, expected 1"; exit 1
fi

# MULTI-USER BATCH DEADLOCK. Two concurrent statements, each inserting for the SAME two
# accounts, are the case that deadlocks when the per-user lock order is not deterministic:
# `select distinct` may answer from a HashAggregate in any order, so one side can take A
# then B while the other takes B then A. `order by 1` imposes one global order. Run
# repeatedly, because a deadlock that depends on timing will not show up once.
echo "── multi-user batch deadlock ──"
X=$(psql -h /tmp -p "$PORT" -U postgres -d "$DB" -tAc "select t_user();" | tr -d ' ')
Y=$(psql -h /tmp -p "$PORT" -U postgres -d "$DB" -tAc "select t_user();" | tr -d ' ')
DEADLOCKS=0
for round in $(seq 1 12); do
  for side in 1 2; do
    ( psql -h /tmp -p "$PORT" -U postgres -d "$DB" -tA -c "
        begin;
        insert into public.discoveries (user_id, herb_id)
        select '$X', 'dl${round}_${side}' union all select '$Y', 'dl${round}_${side}';
        select pg_sleep(0.05);
        commit;" 2>&1 | grep -c "deadlock detected" > "/tmp/dl-$round-$side.n" || true ) &
  done
  wait
  for side in 1 2; do
    DEADLOCKS=$(( DEADLOCKS + $(cat "/tmp/dl-$round-$side.n" 2>/dev/null || echo 0) ))
    rm -f "/tmp/dl-$round-$side.n"
  done
done
if [ "$DEADLOCKS" = "0" ]; then
  # Note what this does and does not establish: a build with the `order by` REMOVED also
  # passes it, because at two users the planner returns a stable order anyway. It is a
  # regression guard, not the evidence that the clause is necessary.
  echo "PASS  24 concurrent multi-user batches over the same two accounts, no deadlock"
else
  echo "FAIL  $DEADLOCKS deadlock(s) across 24 concurrent multi-user batches"; exit 1
fi

echo
echo "All migration tests passed."
