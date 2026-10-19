#!/usr/bin/env python3
"""Assert the collection-cap posture of a live Supabase project. READ ONLY.

    SUPABASE_ACCESS_TOKEN=... python3 scripts/check_collection_entitlements.py <project_ref>

WHY THIS EXISTS SEPARATELY FROM THE MIGRATION TESTS. `scripts/test_migration.sh` proves the
SQL behaves, against a throwaway Postgres where this script's checks would be trivially
true. What it cannot prove is that the posture SURVIVED reaching a real project: Supabase
grants `anon` and `authenticated` table privileges by default, a dashboard edit can drop a
policy, and a `create table if not exists` against a half-applied database returns success
having done nothing. The only honest evidence is to ask the live catalogue.

It is also the pre- and post-activation check. Every assertion is about CONFIGURATION — RLS
flags, policy counts, function ACLs, the paywall flag — and none of it reads a player's row,
so the output is safe to put in a workflow log.

THE MOST IMPORTANT ASSERTION IS THE ONE THAT LOOKS REDUNDANT: `deck_claims` must have RLS
ENABLED and ZERO policies. A table with RLS *disabled* and no policies is WIDE OPEN here,
because of those default grants — so "no policies" alone is the signature of both the most
locked-down table in the schema and the most exposed one, and only the RLS flag tells them
apart.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

API = "https://api.supabase.com/v1/projects/{ref}/database/query"

failures: list[str] = []


def check(ok: bool, label: str, detail: str = "") -> None:
    print(("PASS  " if ok else "FAIL  ") + label + (f"\n      {detail}" if detail and not ok else ""))
    if not ok:
        failures.append(label)


def query(ref: str, token: str, sql: str) -> list[dict]:
    request = urllib.request.Request(
        API.format(ref=ref),
        data=json.dumps({"query": sql}).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", "replace")
        print(f"::error::query failed (HTTP {error.code}): {body}")
        sys.exit(2)


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: check_collection_entitlements.py <project_ref>", file=sys.stderr)
        return 2
    ref = sys.argv[1]
    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
    if not token:
        print("::error::SUPABASE_ACCESS_TOKEN is not set")
        return 2

    print(f"Checking collection entitlements on {ref}\n")

    # ── Tables, RLS and policy counts ────────────────────────────────────────
    rows = query(ref, token, """
        select c.relname as table_name,
               c.relrowsecurity as rls_enabled,
               (select count(*) from pg_policies p
                 where p.schemaname = 'public' and p.tablename = c.relname) as policies,
               (select count(*) from pg_policies p
                 where p.schemaname = 'public' and p.tablename = c.relname
                   and p.cmd in ('INSERT','UPDATE','DELETE','ALL')) as write_policies
          from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public'
           and c.relname in ('app_settings','deck_claims','entitlements')
         order by c.relname
    """)
    by_name = {r["table_name"]: r for r in rows}

    for name in ("app_settings", "deck_claims", "entitlements"):
        check(name in by_name, f"{name} exists")

    for name, expected_policies in (("app_settings", 1), ("deck_claims", 0), ("entitlements", 1)):
        row = by_name.get(name)
        if not row:
            continue
        # RLS FIRST, and separately from the policy count. See the module docstring: zero
        # policies means "nobody" only while RLS is on, and "everybody" the moment it is off.
        check(bool(row["rls_enabled"]), f"{name} has row level security ENABLED",
              "with RLS off, the default grants make this table readable and writable")
        check(row["policies"] == expected_policies,
              f"{name} has exactly {expected_policies} polic(y/ies)",
              f"found {row['policies']}")
        check(row["write_policies"] == 0,
              f"{name} grants NO insert, update or delete to any client role",
              f"found {row['write_policies']} write polic(y/ies)")

    # ── The two functions ────────────────────────────────────────────────────
    rows = query(ref, token, """
        select p.proname,
               p.prosecdef as security_definer,
               coalesce(array_to_string(p.proconfig, ','), '') as config,
               coalesce(array_to_string(array(
                 select unnest(p.proacl)::text), ' '), '') as acl
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and p.proname in ('enforce_discovery_limit', 'redeem_deck_code')
         order by p.proname
    """)
    functions = {r["proname"]: r for r in rows}

    for name in ("enforce_discovery_limit", "redeem_deck_code"):
        fn = functions.get(name)
        check(fn is not None, f"{name} exists")
        if not fn:
            continue
        check(bool(fn["security_definer"]), f"{name} is SECURITY DEFINER")
        check("search_path=" in fn["config"].replace(" ", ""),
              f"{name} pins its search_path", f"config is {fn['config']!r}")
        acl = fn["acl"]
        # An EMPTY acl means the default, which for a function is EXECUTE to PUBLIC — so an
        # empty string here is a FAILURE, not an absence of grants.
        check(acl != "", f"{name} has an explicit ACL (an empty one means EXECUTE to PUBLIC)")
        for role in ("anon", "authenticated"):
            check(f"{role}=X" not in acl, f"{name} is NOT executable by {role}", f"acl: {acl}")

    # ── The trigger ──────────────────────────────────────────────────────────
    rows = query(ref, token, """
        select t.tgname, c.relname as table_name, t.tgenabled,
               pg_get_triggerdef(t.oid) as definition
          from pg_trigger t join pg_class c on c.oid = t.tgrelid
         where not t.tgisinternal and t.tgname = 'discoveries_enforce_limit'
    """)
    check(len(rows) == 1, "the discoveries_enforce_limit trigger exists")
    if rows:
        definition = rows[0]["definition"]
        check(rows[0]["table_name"] == "discoveries", "it is on public.discoveries")
        check("AFTER INSERT" in definition.upper(), "it fires AFTER INSERT",
              "a BEFORE INSERT row trigger refuses ON CONFLICT rows and misses batches")
        check("STATEMENT" in definition.upper(), "it is FOR EACH STATEMENT")
        check("REFERENCING NEW TABLE" in definition.upper(), "it uses a transition table")
        check(rows[0]["tgenabled"] == "O", "it is enabled",
              f"tgenabled is {rows[0]['tgenabled']!r}")

    # ── The flag and the cutoff ──────────────────────────────────────────────
    rows = query(ref, token, """
        select collection_paywall_enabled, free_discovery_limit,
               grandfather_cutoff is not null as cutoff_recorded,
               grandfather_cutoff::text as cutoff
          from public.app_settings where id
    """)
    check(len(rows) == 1, "app_settings holds exactly one row",
          f"found {len(rows)} — the single-row primary key should make this impossible")
    if rows:
        settings = rows[0]
        paywall = settings["collection_paywall_enabled"]
        check(bool(settings["cutoff_recorded"]),
              "the grandfather cutoff is recorded", "the grandfather pass has not run")
        print(f"      cutoff: {settings['cutoff']}")
        print(f"      free_discovery_limit: {settings['free_discovery_limit']}")
        # NOT ASSERTED AS FALSE. Activation is a deliberate decision, so this script reports
        # the flag rather than failing on it — a check that failed once the paywall was
        # legitimately switched on would be a check somebody deletes.
        print(f"\n{'>>> PAYWALL IS ON' if paywall else '    paywall is OFF (shipped state)'}")

    # ── Grandfathering, counted rather than trusted ──────────────────────────
    rows = query(ref, token, """
        select (select count(*) from auth.users) as users,
               (select count(*) from public.entitlements) as entitlements,
               (select count(*) from public.entitlements
                 where granted_by = 'grandfather') as grandfathered,
               (select count(*) from public.entitlements
                 where granted_by = 'deck_claim') as redeemed,
               (select count(*) from public.deck_claims) as claims,
               (select count(*) from public.deck_claims
                 where claimed_at is not null) as claims_spent
    """)
    if rows:
        counts = rows[0]
        print()
        for label, key in (
            ("accounts", "users"),
            ("entitlements total", "entitlements"),
            ("  grandfathered", "grandfathered"),
            ("  redeemed a deck", "redeemed"),
            ("deck codes registered", "claims"),
            ("  spent", "claims_spent"),
        ):
            print(f"    {label:<24} {counts[key]}")
        check(int(counts["grandfathered"]) <= int(counts["users"]),
              "no more grandfathered entitlements than accounts")
        check(int(counts["claims_spent"]) <= int(counts["claims"]),
              "no more spent codes than registered codes")

    print()
    if failures:
        print(f"{len(failures)} failure(s): " + "; ".join(failures))
        return 1
    print("Collection entitlement posture is correct.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
