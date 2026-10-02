#!/usr/bin/env python3
"""Record the pre-deployment state of a Supabase project. READ-ONLY.

STEP 0 OF `docs/release-runbook.md`, and the only step that cannot be done afterwards: once a
migration has run, "what did this look like before" is no longer a question anybody can
answer. So this gathers the answers first and prints them into a log that outlives the run.

WHAT IT READS, AND NOTHING ELSE:
  GET  /v1/projects                       the project exists and is the one we think
  GET  /v1/projects/{ref}/functions       deployed edge functions, with version and slug
  GET  /v1/projects/{ref}/database/backups PITR / backup posture
  POST /v1/projects/{ref}/database/query   SELECTs only — see QUERIES below

THE QUERY ENDPOINT IS A POST AND THAT IS NOT A WRITE. It is how the Management API accepts
SQL at all; every statement this script sends is a `select`, and they are listed in one place
below so a reviewer can read them as a set rather than hunt them through the file. If a
future edit puts anything but a `select` in that list, it stops being this script.

IT PRINTS NO SECRET VALUE. The only credential it touches is SUPABASE_ACCESS_TOKEN, which is
sent in a header and never echoed. Function secrets are covered separately by
`check_function_secrets.py`, which prints names and a yes/no.

Usage:  PROJECT_REF=... SUPABASE_ACCESS_TOKEN=... python3 scripts/release_checkpoint.py
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

API = "https://api.supabase.com/v1"

KNOWN = {
    "vygiamigomwlvnwkryyl": "PRODUCTION — real players",
    "vgjehmwcpavflbfhbbrp": "test",
}

# Every statement this script sends. SELECTs only, by construction and by review.
QUERIES: dict[str, str] = {
    "0006 — observed-taxon columns on public.sightings": """
        select column_name
          from information_schema.columns
         where table_schema = 'public' and table_name = 'sightings'
           and column_name in ('observed_taxon_provider_name','observed_taxon_name',
                               'observed_taxon_key','observed_taxon_rank','eligibility',
                               'species_confidence','identification_provider')
         order by column_name
    """,
    "0006 — identification_comparisons table": """
        select table_name from information_schema.tables
         where table_schema = 'public' and table_name = 'identification_comparisons'
    """,
    "0007 — eligibility CHECK constraint, as the database has it": """
        select pg_get_constraintdef(oid) as definition
          from pg_constraint
         where conrelid = 'public.sightings'::regclass
           and conname = 'sightings_eligibility_check'
    """,
    # 0007 VERIFICATION. The three questions below are deliberately answered from the
    # DATABASE'S OWN rendering of the constraint rather than from a list typed here: a check
    # that compares my transcription against my transcription proves nothing. `regexp_matches`
    # pulls every quoted value out of `pg_get_constraintdef`, so the set reported is the set
    # Postgres will actually enforce — which is what makes "no value was accidentally removed"
    # and "legacyGenus is still accepted" measurements rather than readings of a diff.
    "0007 — accepted eligibility values, extracted from the live constraint": """
        with def as (
          select pg_get_constraintdef(oid) as d
            from pg_constraint
           where conrelid = 'public.sightings'::regclass
             and conname = 'sightings_eligibility_check'
        ), vals as (
          select (regexp_matches(d, $re$'([A-Za-z]+)'::text$re$, 'g'))[1] as v from def
        )
        select count(*) as value_count,
               array_agg(v order by v) as accepted_values,
               bool_or(v = 'exact') as has_exact,
               bool_or(v = 'synonym') as has_synonym,
               bool_or(v = 'acceptedGroup') as has_accepted_group,
               bool_or(v = 'curatedEquivalent') as has_curated_equivalent,
               bool_or(v = 'genusCard') as has_genus_card,
               bool_or(v = 'legacyGenus') as has_legacy_genus,
               bool_or(v = 'ambiguous') as has_ambiguous,
               bool_or(v = 'related') as has_related,
               bool_or(v = 'none') as has_none
          from vals
    """,
    # READABILITY, not just row counts. A count can be answered from an index; this reads the
    # columns themselves, including the ones 0006 added, and aggregates so a public workflow
    # log carries no player's record. A null `eligibility` is the ordinary case for every
    # sighting logged by hand from a card page and is reported as such rather than hidden.
    "readable — eligibility distribution across existing sightings": """
        select coalesce(eligibility, '(null)') as eligibility, count(*) as rows
          from public.sightings group by 1 order by 1
    """,
    "readable — sightings aggregate": """
        select count(*) as rows, count(herb_id) as with_herb_id,
               count(observed_taxon_name) as with_observed_taxon,
               min(created_at) as earliest, max(created_at) as latest
          from public.sightings
    """,
    "readable — discoveries aggregate": """
        select count(*) as rows, count(distinct herb_id) as distinct_cards,
               min(discovered_at) as earliest, max(discovered_at) as latest
          from public.discoveries
    """,
    "data at risk — row counts": """
        select
          (select count(*) from public.sightings) as sightings,
          (select count(*) from public.discoveries) as discoveries,
          (select count(*) from public.profiles) as profiles,
          (select count(*) from public.seed_shelf) as seed_shelf,
          (select count(*) from public.species_packets) as species_packets
    """,
}


def get(path: str, token: str) -> tuple[int, object]:
    request = urllib.request.Request(
        f"{API}{path}", headers={"Authorization": f"Bearer {token}"}
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode()[:300]


def ok(status: int) -> bool:
    """Any 2xx. The query endpoint answers 201, not 200.

    Checking `== 200` made every SUCCESSFUL query look like a failure: the rows came back and
    were printed under `::error::`, and the run exited 1 while nothing was wrong. A checkpoint
    that cries wolf is worse than none, because the next person to read it will not know which
    half to believe.
    """
    return 200 <= status < 300


def query(ref: str, token: str, sql: str) -> tuple[int, object]:
    body = json.dumps({"query": " ".join(sql.split())}).encode()
    request = urllib.request.Request(
        f"{API}/projects/{ref}/database/query",
        data=body,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode()[:300]


def main() -> int:
    ref = os.environ.get("PROJECT_REF", "").strip()
    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
    if not ref or not token:
        print("set PROJECT_REF and SUPABASE_ACCESS_TOKEN")
        return 2
    if ref not in KNOWN:
        print(f"::error::{ref} is not a known project ref. Refusing.")
        return 2

    print("=" * 72)
    print(f"RELEASE CHECKPOINT — {ref}  ({KNOWN[ref]})")
    print("=" * 72)

    status, projects = get("/projects", token)
    if not ok(status) or not isinstance(projects, list):
        print(f"::error::GET /projects returned {status}: {projects}")
        return 1
    mine = next((p for p in projects if p.get("id") == ref), None)
    if not mine:
        print(f"::error::{ref} is not visible to this token.")
        return 1
    print("\nPROJECT")
    for key in ("name", "region", "created_at", "status", "database"):
        value = mine.get(key)
        if isinstance(value, dict):
            value = {k: v for k, v in value.items() if k in ("version", "host_type")}
        print(f"  {key:<14} {value}")

    print("\nDEPLOYED EDGE FUNCTIONS")
    status, functions = get(f"/projects/{ref}/functions", token)
    if not ok(status) or not isinstance(functions, list):
        print(f"  ::error::GET functions returned {status}: {functions}")
    elif not functions:
        print("  (none deployed)")
    else:
        print(f"  {'slug':<22} {'version':>7}  {'status':<10} updated_at")
        for fn in sorted(functions, key=lambda f: f.get("slug", "")):
            print(
                f"  {fn.get('slug',''):<22} {str(fn.get('version','?')):>7}  "
                f"{str(fn.get('status','?')):<10} {fn.get('updated_at','?')}"
            )

    print("\nBACKUP / PITR POSTURE")
    status, backups = get(f"/projects/{ref}/database/backups", token)
    if not ok(status) or not isinstance(backups, dict):
        print(f"  ::error::GET backups returned {status}: {backups}")
    else:
        print(f"  pitr_enabled   {backups.get('pitr_enabled')}")
        print(f"  region         {backups.get('region')}")
        walg = backups.get("physical_backup_data") or {}
        print(f"  earliest_wal   {walg.get('earliest_physical_backup_date_unix')}")
        print(f"  latest_wal     {walg.get('latest_physical_backup_date_unix')}")
        listed = backups.get("backups") or []
        print(f"  logical backups listed: {len(listed)}")
        for b in listed[:3]:
            print(f"    {b.get('inserted_at')}  status={b.get('status')}")

    print("\nSCHEMA STATE")
    failed = False
    for label, sql in QUERIES.items():
        status, rows = query(ref, token, sql)
        print(f"\n  {label}")
        if not ok(status):
            print(f"    ::error::{status}: {rows}")
            failed = True
            continue
        if not rows:
            print("    (no rows — NOT APPLIED / absent)")
        else:
            for row in rows if isinstance(rows, list) else [rows]:
                print(f"    {row}")

    print("\n" + "=" * 72)
    print("READ-ONLY. Nothing was created, altered or deleted.")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
