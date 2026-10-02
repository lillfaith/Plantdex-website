# Pre-release logical backup — step 0

**This is a LOGICAL backup, not PITR.** It is a point-in-time *dump*, taken by hand, that
restores a database to the state it had when the dump ran. It is not continuous, it cannot
recover to an arbitrary moment, and it covers the **application database only** — not Storage
objects. Migrations 0006 and 0007 touch the database and not Storage, so it is the appropriate
recovery point for this release and for nothing else.

PITR is **not** being enabled for this release, by decision.

---

## Why this cannot be run from CI, and must be run by you

Two blockers, both of which it would be wrong to work around.

**1 · The repository is PUBLIC.** On a public repository, Actions artifacts are downloadable by
anyone with the run URL. A logical dump of this database contains real user rows — `profiles`,
`discoveries`, `sightings`, `seed_shelf`, each carrying a `user_id`. Uploading it as an
artifact would publish those. Encrypting it first only moves the problem to where the
passphrase lives.

**2 · There is no production database password in the repository secrets**, and there should
not be one. The secrets available are `SUPABASE_ACCESS_TOKEN`, `TEST_ACCOUNT_PASSWORD` and
`CLAUDE_CODE_OAUTH_TOKEN`; `supabase db dump` needs a direct Postgres connection string, which
is a different and far more powerful credential. Adding it to a public repository's secrets to
take one backup is a permanent cost for a one-time task.

This sandbox also cannot reach the production database at all — outbound access to it is
blocked — so there is no third path.

**So: run the commands below on your own machine.** Keep the output off this repository.

---

## The commands

The connection string is on the Supabase dashboard under **Project Settings → Database →
Connection string → URI**. It contains the database password: do not paste it into a terminal
that is being recorded, into this repository, or into a chat.

```bash
mkdir -p ~/plantdex-backup-$(date -u +%Y%m%dT%H%M%SZ) && cd $_
DB_URL='...'   # paste, do not commit

supabase db dump --db-url "$DB_URL" -f roles.sql  --role-only
supabase db dump --db-url "$DB_URL" -f schema.sql
supabase db dump --db-url "$DB_URL" -f data.sql   --data-only --use-copy
```

Three files because they restore in that order: roles must exist before the schema that grants
to them, and the schema before the data that fills it.

**Migration history.** Migrations here are applied through the Management API rather than the
CLI, so a `supabase_migrations.schema_migrations` table may not exist. Capture it if it does,
and record "absent" if it does not — either answer is information:

```bash
psql "$DB_URL" -c "\copy (select * from supabase_migrations.schema_migrations order by version) to 'migration_history.csv' csv header" \
  || echo "no supabase_migrations.schema_migrations table — migrations are applied via the Management API" > migration_history.txt
```

**Nothing above mutates the database.** `pg_dump` takes a read lock and writes only to your
local disk.

---

## Verify, without restoring

```bash
python3 scripts/verify_backup.py ~/plantdex-backup-<timestamp>
```

It is offline and read-only: it checks each file exists, is non-empty and carries the
structure its kind of dump must carry (roles declare roles, the schema declares objects, the
data dump has `COPY` blocks), flags a `pg_dump: error` line hiding inside a file that exited 0,
and prints the size and SHA-256 of every artifact.

**What it proves:** the dump ran and produced something of the right shape.
**What it does not prove:** completeness. Only a restore into a *scratch* database shows that,
and a destructive restore against production is forbidden here.

---

## The record

Fill this in and keep it with the release notes. `verify_backup.py` prints the last three
columns for you.

```
pre-release logical backup
  taken at (UTC)      ____________________   # date -u +%Y-%m-%dT%H:%M:%SZ
  project ref         vygiamigomwlvnwkryyl   (PRODUCTION)
  postgres version    17.6.1.155             # from the step-0 checkpoint
  supabase CLI        ____________________   # supabase --version
  stored at           ____________________   # off-repo location
  kind                LOGICAL DUMP — not PITR, database only, no Storage objects

  file                 exit   bytes          sha256
  roles.sql            ____   ____________   ________________________________________________
  schema.sql           ____   ____________   ________________________________________________
  data.sql             ____   ____________   ________________________________________________
  migration_history.*  ____   ____________   ________________________________________________

  verify_backup.py     PASS / FAIL
```

Row counts at checkpoint time, as a sanity check against the restored dump:
`sightings 3 · discoveries 27 · profiles 2 · seed_shelf 16 · species_packets 16`.
