#!/usr/bin/env python3
"""Autonomous prerequisites, disposable accounts and cleanup for the LIVE camera-to-collection run. TEST PROJECT ONLY.

    live_run.py preflight    read-only: is this really TEST, is 0016 there, is enforcement OFF, is identify-plant live, are the
                             provider key gate passes, and the public anon key works?
    live_run.py provision    create two already-confirmed disposable accounts, plus one aged (expired) receipt for the second
                             one, and hand the credentials to the suite through masked env vars
    live_run.py cleanup      delete ONLY the accounts this run created, by exact id and exact email, then prove nothing is left
    live_run.py selftest     offline checks of the guards in this file (no network)

WHY NOT THE "CONFIRM EMAIL" SETTING. The project's authentication settings are shared by everything on TEST, so they are never
touched. The accounts are created already confirmed.

WHY THE DATABASE AND NOT THE AUTH ADMIN API. The Auth admin API needs the project's service-role key, and the repository's
`SUPABASE_ACCESS_TOKEN` is refused (HTTP 403) on the project, secrets and API-keys endpoints: it carries the Database and
Edge-Functions scopes only. So the two players are inserted into `auth.users` (+ `auth.identities`) through the one scope it does
have, with a bcrypt password hash computed by the database; they then sign in through the real Auth password endpoint like anyone.
No service-role key is ever obtained, so none can leak. The vitest process receives two ordinary email/password pairs and the
public anon key, nothing else.

PRINTS NAMES, COUNTS AND PASS/FAIL ONLY. A response body is never echoed (several of these endpoints return secret values next to
their names). Anything that cannot be verified is a FAILURE: an unverified prerequisite is never a pass.
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import re
import secrets
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

TEST_REF = "vgjehmwcpavflbfhbbrp"
PRODUCTION_REF = "vygiamigomwlvnwkryyl"
API = "https://api.supabase.com"
URL = f"https://{TEST_REF}.supabase.co"

TABLES_0016 = [
    "discovery_enforcement", "capture_sessions", "capture_image_digests",
    "capture_receipts", "discovery_grandfathered", "scan_refunds",
]
FUNCTIONS_REQUIRED = [
    "open_capture_session", "claim_discovery", "discovery_rules", "consume_capture_session",
    "issue_capture_receipts", "release_capture_session", "refund_scan_claim",
    "prune_capture_artifacts", "set_discovery_enforcement", "capture_config",
    "claim_scan_pair", "confirm_scan",
]
TRIGGERS_REQUIRED = [
    "discoveries_capture_gate_trg", "learned_requires_discovery_trg",
    "mastered_requires_discovery_trg", "capture_receipts_immutable_trg", "discovery_enforcement_guard_trg",
]
# Names only. A digest of a value is compared where the value decides something (see check_secrets).
EXPECTED_EMAIL = re.compile(r"^plantdex-e2e-capture-(alice|bob)-r[0-9]+@mailinator\.com$")
FAILURES: list[str] = []


# ── output helpers: nothing but verdicts ────────────────────────────────────────────────────────────────────────────
def ok(msg: str) -> None:
    print(f"PASS  {msg}")


def bad(msg: str) -> None:
    FAILURES.append(msg)
    print(f"FAIL  {msg}")


def mask(value: str) -> None:
    print(f"::add-mask::{value}")


def die(msg: str) -> None:
    print(f"::error::{msg}")
    sys.exit(1)


def shape(obj: object) -> str:
    """A description of a response that carries no value: its type and, for an object, its key names."""
    if isinstance(obj, list):
        return f"a list of {len(obj)}"
    if isinstance(obj, dict):
        return "an object with keys " + ", ".join(sorted(map(str, obj.keys()))[:12])
    return type(obj).__name__


def http(method: str, url: str, headers: dict[str, str], body: object | None = None, timeout: int = 40):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method=method, headers={"Content-Type": "application/json", **headers})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            status = r.status
    except urllib.error.HTTPError as e:
        raw = e.read()
        status = e.code
    except Exception as e:  # network failure: report the class, never the text (a URL can carry a key)
        return 0, f"network error ({type(e).__name__})"
    try:
        return status, json.loads(raw or b"null")
    except Exception:
        return status, "non-JSON body"


def mgmt(method: str, path: str, body: object | None = None):
    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
    if not token:
        die("SUPABASE_ACCESS_TOKEN is not available to this job.")
    return http(method, f"{API}{path}", {"Authorization": f"Bearer {token}"}, body)


def sql(query: str):
    """One statement through the Management API. Read-only callers pass a SELECT; the guard below enforces it."""
    return mgmt("POST", f"/v1/projects/{TEST_REF}/database/query", {"query": query})


def require_test_only() -> None:
    ref = os.environ.get("PROJECT_REF", TEST_REF)
    if ref != TEST_REF or ref == PRODUCTION_REF:
        die(f"PROJECT_REF is '{ref}'. This script is hard-scoped to the TEST project and refuses anything else.")


# ── keys ────────────────────────────────────────────────────────────────────────────────────────────────────────────
def anon_key() -> tuple[str | None, str]:
    """The TEST project's PUBLIC anon key: the repository variable first, the Management API as a fallback. Validated, not trusted."""
    key = os.environ.get("TEST_ANON_KEY", "").strip()
    source = "repository variable TEST_SUPABASE_ANON_KEY"
    if not key:
        status, body = mgmt("GET", f"/v1/projects/{TEST_REF}/api-keys")
        if status == 200 and isinstance(body, list):
            for k in body:
                if isinstance(k, dict) and k.get("name") == "anon" and isinstance(k.get("api_key"), str):
                    key, source = k["api_key"], "Management API"
        if not key:
            return None, f"no anon key: the repository variable TEST_SUPABASE_ANON_KEY is empty and the Management API answered HTTP {status}"
    if key.startswith("sb_secret_"):
        return None, "the configured key is a SECRET key; only the public anon/publishable key may be used"
    if key.startswith("eyJ"):
        claims = jwt_claims(key)
        if not claims or claims.get("role") != "anon" or claims.get("ref") not in (None, TEST_REF):
            return None, "the configured JWT is not an anon key for the TEST project"
    status, _ = http("GET", f"{URL}/auth/v1/settings", {"apikey": key})
    if status != 200:
        return None, f"the TEST project did not accept the key from the {source} (HTTP {status})"
    mask(key)
    return key, source


def jwt_claims(key: str) -> dict | None:
    try:
        seg = key.split(".")[1]
        return json.loads(base64.urlsafe_b64decode(seg + "=" * (-len(seg) % 4)))
    except Exception:
        return None


# ── preflight ───────────────────────────────────────────────────────────────────────────────────────────────────────
PREFLIGHT_SQL = f"""
select jsonb_build_object(
  'tables', (select jsonb_object_agg(t, to_regclass('public.' || t) is not null)
               from unnest(array[{",".join("'" + t + "'" for t in TABLES_0016)}]) t),
  'functions', (select jsonb_object_agg(f, exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                                                    where n.nspname = 'public' and p.proname = f))
                  from unnest(array[{",".join("'" + f + "'" for f in FUNCTIONS_REQUIRED)}]) f),
  'triggers', (select jsonb_object_agg(g, exists (select 1 from pg_trigger t where t.tgname = g and not t.tgisinternal))
                 from unnest(array[{",".join("'" + g + "'" for g in TRIGGERS_REQUIRED)}]) g),
  'enforcing', case when to_regclass('public.discovery_enforcement') is not null
                    then ((xpath('/row/e/text()', query_to_xml('select enforce as e from public.discovery_enforcement where singleton', false, true, '')))[1])::text
               end,
  'min_capture_ms', case when to_regprocedure('public.capture_config()') is not null
                         then ((xpath('/row/m/text()', query_to_xml('select (public.capture_config() ->> ''min_capture_ms'') as m', false, true, '')))[1])::text
                    end
) as r
"""


def all_true(d: object, names: list[str]) -> list[str]:
    if not isinstance(d, dict):
        return names
    return [n for n in names if d.get(n) is not True]


def check_project() -> None:
    """The ref is a literal in every URL below, so every call is made against TEST and nothing else. This asks the platform to
    confirm it too; the token may not be allowed to (HTTP 403), which is reported, not hidden, and does not by itself fail the run
    because the anon key's own `ref` claim and the project URL are checked independently in check_credentials."""
    status, body = mgmt("GET", f"/v1/projects/{TEST_REF}")
    if status == 200 and isinstance(body, dict):
        ref = body.get("id") or body.get("ref")
        ok(f"platform confirms the target is the TEST project ({TEST_REF})") if ref == TEST_REF else bad("the project at the TEST ref is not the TEST ref")
    else:
        print(f"NOTE  the platform project lookup is not permitted for this token (HTTP {status}); target identity is checked through the database, the function listing and the anon key's project claim instead")


def check_database() -> None:
    assert PREFLIGHT_SQL.strip().lower().startswith("select"), "preflight SQL must be a single read-only SELECT"
    status, body = sql(PREFLIGHT_SQL)
    if status not in (200, 201) or not isinstance(body, list) or not body or not isinstance(body[0], dict):
        bad(f"database inspection: HTTP {status}, {shape(body)}")
        return
    r = body[0].get("r")
    if isinstance(r, str):
        r = json.loads(r)
    if not isinstance(r, dict):
        bad("database inspection returned no report")
        return
    missing = all_true(r.get("tables"), TABLES_0016)
    ok("all 6 migration-0016 tables exist") if not missing else bad(f"0016 tables missing: {', '.join(missing)}")
    missing = all_true(r.get("functions"), FUNCTIONS_REQUIRED)
    ok(f"all {len(FUNCTIONS_REQUIRED)} required database functions exist") if not missing else bad(f"functions missing: {', '.join(missing)}")
    missing = all_true(r.get("triggers"), TRIGGERS_REQUIRED)
    ok("all 5 enforcement/immutability triggers exist") if not missing else bad(f"triggers missing: {', '.join(missing)}")
    enforcing = r.get("enforcing")
    if enforcing in ("false", False):
        ok("discovery enforcement is OFF")
    else:
        bad(f"discovery enforcement is not verifiably OFF (read: {enforcing!r}). This run requires OFF.")
    if str(r.get("min_capture_ms")) == "0":
        ok("no mandatory capture delay (min_capture_ms = 0)")
    else:
        bad(f"min_capture_ms is {r.get('min_capture_ms')!r}, expected 0")


def check_function() -> None:
    status, body = mgmt("GET", f"/v1/projects/{TEST_REF}/functions")
    if status != 200 or not isinstance(body, list):
        bad(f"edge-function listing: HTTP {status}, {shape(body)}")
        return
    mine = [f for f in body if isinstance(f, dict) and f.get("slug") == "identify-plant"]
    if not mine:
        bad("identify-plant is not deployed on TEST")
        return
    f = mine[0]
    if str(f.get("status", "")).upper() == "ACTIVE":
        ok(f"identify-plant is deployed and ACTIVE (version {f.get('version')})")
    else:
        bad(f"identify-plant status is {f.get('status')!r}")


def sha(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()


def check_secrets_if_readable() -> None:
    """NAMES, when the token is allowed to list them. It usually is not (HTTP 403); then this says so and the functional probe in
    check_credentials carries the provider-key question instead. Never a pass by default."""
    status, body = mgmt("GET", f"/v1/projects/{TEST_REF}/secrets")
    if status != 200 or not isinstance(body, list):
        print(f"NOTE  project secrets cannot be listed with this token (HTTP {status}); the provider key is probed functionally below, and SPECIES_ATTESTATION_SECRET stays UNVERIFIED (it is not used by the collect path: an unset one only stops new species being minted)")
        return
    by_name = {i["name"]: str(i.get("value", "")) for i in body if isinstance(i, dict) and isinstance(i.get("name"), str)}
    ok("SPECIES_ATTESTATION_SECRET is set") if "SPECIES_ATTESTATION_SECRET" in by_name else print("NOTE  SPECIES_ATTESTATION_SECRET is not set (new species could not be minted; not used by this run)")
    if "IDENTIFY_MIN_IMAGES" in by_name and by_name["IDENTIFY_MIN_IMAGES"] != sha("1"):
        bad("IDENTIFY_MIN_IMAGES is set to something other than 1: a one-photograph capture would be refused")


def check_credentials() -> None:
    anon, note = anon_key()
    if not anon:
        bad(f"anon key unavailable: {note}. Without it nothing can sign in or call the function, so the run cannot be verified.")
        return
    ok(f"the TEST project accepts its public anon key (from the {note})")
    # THE PROVIDER KEY, PROBED WITHOUT SPENDING A PROVIDER CREDIT. identify-plant refuses with `unconfigured` (503) BEFORE it
    # looks at the request when the selected provider's key is missing, so a body-less POST says whether it is set. Any other
    # answer means the gate passed. (It proves presence, not validity: validity is proven by the real provider call itself.)
    status, body = http("POST", f"{URL}/functions/v1/identify-plant", {"apikey": anon, "Authorization": f"Bearer {anon}"}, {})
    code = body.get("code") if isinstance(body, dict) else None
    if status == 503 and code == "unconfigured":
        bad("identify-plant answers `unconfigured`: the selected provider's API key is NOT set on TEST")
    elif status in (0, 401, 403, 404) or status >= 500:
        bad(f"the provider-key probe was inconclusive (HTTP {status}, code {code}); credentials are UNVERIFIED, which is a failure")
    else:
        ok(f"identify-plant passed its provider-key gate (HTTP {status}); no provider credit was spent")


def cmd_preflight() -> None:
    require_test_only()
    check_project()
    check_database()
    check_function()
    check_secrets_if_readable()
    check_credentials()
    print()
    if FAILURES:
        print(f"PREFLIGHT FAILED: {len(FAILURES)} prerequisite(s) not verified. Nothing was spent and nothing was changed.")
        for f in FAILURES:
            print(f"::error::{f}")
        sys.exit(1)
    print("PREFLIGHT PASSED: every prerequisite was verified. Nothing was changed.")


# ── provisioning ────────────────────────────────────────────────────────────────────────────────────────────────────
def run_stamp() -> str:
    rid = os.environ.get("GITHUB_RUN_ID", "")
    if not re.fullmatch(r"[0-9]{6,20}", rid):
        die("GITHUB_RUN_ID is missing: refusing to create accounts that could not be traced to this run.")
    return f"r{rid}"


def emails(stamp: str) -> dict[str, str]:
    out = {role: f"plantdex-e2e-capture-{role}-{stamp}@mailinator.com" for role in ("alice", "bob")}
    for e in out.values():
        assert EXPECTED_EMAIL.fullmatch(e), e
    return out


def state_path() -> str:
    return os.path.join(os.environ.get("RUNNER_TEMP", "/tmp"), "live-run-accounts.json")


def save_state(state: dict) -> None:
    with open(state_path(), "w") as f:
        json.dump(state, f)  # ids and emails only: no password, no key


def append_env(name: str, value: str) -> None:
    path = os.environ.get("GITHUB_ENV")
    if not path:
        die("GITHUB_ENV is not available.")
    assert "\n" not in value
    with open(path, "a") as f:
        f.write(f"{name}={value}\n")


def sql_literal(v: str) -> str:
    assert "'" not in v and "\\" not in v and "\n" not in v, "unexpected character in a value bound for SQL"
    return "'" + v + "'"


def create_confirmed_user(uid: str, email: str, password: str, stamp: str) -> str:
    """One already-confirmed email/password player, written the way Auth itself writes one. The password is hashed by the database
    (pgcrypto, bcrypt); every token column is '' rather than NULL because Auth cannot scan a NULL there."""
    meta = json.dumps({"plantdex_e2e": stamp})
    return f"""
    with u as (
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
          confirmation_token, recovery_token, email_change_token_new, email_change,
          email_change_token_current, phone_change, phone_change_token, reauthentication_token)
      values ('00000000-0000-0000-0000-000000000000', {sql_literal(uid)}, 'authenticated', 'authenticated', {sql_literal(email)},
          extensions.crypt({sql_literal(password)}, extensions.gen_salt('bf')), now(),
          '{{"provider":"email","providers":["email"]}}'::jsonb, {sql_literal(meta)}::jsonb, now(), now(),
          '', '', '', '', '', '', '', '')
      returning id, email)
    insert into auth.identities (user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    select u.id, u.id::text, 'email',
           jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
           now(), now(), now()
    from u
    returning user_id::text as id
    """


def cmd_provision() -> None:
    require_test_only()
    stamp = run_stamp()
    anon, note = anon_key()
    if not anon:
        die(f"could not obtain the TEST anon key ({note}).")
    append_env("E2E_ANON_KEY", anon)  # public by design; masked anyway
    state: dict = {"stamp": stamp, "accounts": {}}
    save_state(state)
    for role, email in emails(stamp).items():
        password = "Pw-" + secrets.token_urlsafe(24)
        mask(password)
        uid = str(uuid.uuid4())
        status, body = sql(create_confirmed_user(uid, email, password, stamp))
        if status not in (200, 201) or not isinstance(body, list) or not body or body[0].get("id") != uid:
            die(f"creating the {role} account failed: HTTP {status}, {shape(body)}")
        state["accounts"][role] = {"id": uid, "email": email}
        save_state(state)
        # Prove it is a real, confirmed, password-capable account through the real Auth endpoint before anything is spent.
        status, tok = http("POST", f"{URL}/auth/v1/token?grant_type=password", {"apikey": anon}, {"email": email, "password": password})
        if status != 200 or not isinstance(tok, dict) or not tok.get("access_token"):
            die(f"the {role} account could not sign in through the real Auth endpoint (HTTP {status}); nothing was spent.")
        append_env(f"E2E_{role.upper()}_EMAIL", email)
        append_env(f"E2E_{role.upper()}_PASSWORD", password)
        ok(f"created confirmed disposable account {role}: {email} ({uid}); real password sign-in works")
    # One AGED receipt for Bob, so 'expired' can be tested without waiting a month. The row is written by an admin
    # statement and is the ONLY fabricated thing in the run: claim_discovery (the real function) is what judges it.
    bob = state["accounts"]["bob"]["id"]
    if not re.fullmatch(r"[0-9a-f-]{36}", bob):
        die("unexpected account id shape")
    session = secrets.token_hex(16)
    sid = f"{session[:8]}-{session[8:12]}-4{session[13:16]}-8{session[17:20]}-{session[20:32]}"
    rid = "rcpt_" + secrets.token_hex(16)
    obs = f"plantdex-e2e-expired-{stamp}"
    q = f"""
    with s as (
      insert into public.capture_sessions (id, user_id, nonce_digest, issued_at, expires_at, consumed_at, observation_id)
      values ('{sid}', '{bob}', decode('{'00' * 32}', 'hex'), now() - interval '40 days', now() - interval '39 days',
              now() - interval '40 days', '{obs}')
      returning id)
    insert into public.capture_receipts (id, user_id, session_id, observation_id, herb_id, observed_taxon_key,
        observed_taxon_rank, eligibility, rank_position, species_confidence, issued_at, expires_at)
    select '{rid}', '{bob}', s.id, '{obs}', 'urtica-dioica', 'urtica dioica', 'species', 'exact', 'top', 'high',
           now() - interval '40 days', now() - interval '10 days' from s
    returning id
    """
    status, body = sql(q)
    if status not in (200, 201):
        die(f"could not write the aged receipt fixture: HTTP {status}, {shape(body)}")
    append_env("E2E_EXPIRED_RECEIPT_ID", rid)
    state["expired_receipt"] = rid
    save_state(state)
    ok(f"aged (expired) receipt fixture written for bob: {rid}")


# ── cleanup ─────────────────────────────────────────────────────────────────────────────────────────────────────────
def cmd_cleanup() -> None:
    require_test_only()
    stamp = run_stamp()
    expect = emails(stamp)
    try:
        state = json.load(open(state_path()))
    except Exception:
        state = {"accounts": {}}
    ids: dict[str, str] = {r: a["id"] for r, a in state.get("accounts", {}).items() if isinstance(a, dict) and "id" in a}
    # An account created just before the process died is not in the file: look it up by its EXACT email, which only this
    # run's stamp can produce. Never by a pattern, never by age.
    if len(ids) < 2:
        quoted = ",".join(sql_literal(e) for e in expect.values())
        status, body = sql(f"select id::text as id, email from auth.users where email in ({quoted})")
        if status in (200, 201) and isinstance(body, list):
            for row in body:
                for role, e in expect.items():
                    if isinstance(row, dict) and row.get("email") == e and isinstance(row.get("id"), str):
                        ids[role] = row["id"]
        else:
            print(f"::warning::could not look up accounts by exact email (HTTP {status}); only recorded ids will be removed.")
    if not ids:
        print("Nothing to clean up: this run created no accounts.")
        return
    leftovers = 0
    good: list[str] = []
    for role, uid in ids.items():
        if not re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", uid):
            print(f"::warning::skipping {role}: id has an unexpected shape")
            continue
        # Exact id AND exact email, in the statement itself: a row that is not this run's account cannot match.
        status, body = sql(f"delete from auth.users where id = {sql_literal(uid)}::uuid and email = {sql_literal(expect[role])} returning id::text as id")
        if status in (200, 201) and isinstance(body, list):
            print(f"deleted {role}: {expect[role]} ({uid})" if body else f"already gone (or not this run's account): {role}")
            good.append(uid)
        else:
            print(f"::error::deleting {role} failed: HTTP {status}")
            leftovers += 1
    # Quota rows are keyed by text, not by a foreign key, so they do not cascade. Exact ids only.
    if good:
        buckets = ",".join(sql_literal(f"user:{u}") for u in good)
        sql(f"delete from public.scan_quota where bucket in ({buckets}) returning bucket")
        uids = ",".join(sql_literal(u) + "::uuid" for u in good)
        status, body = sql(
            "select (select count(*) from auth.users where id in (" + uids + ")) as users,"
            " (select count(*) from public.capture_sessions where user_id in (" + uids + ")) as sessions,"
            " (select count(*) from public.capture_receipts where user_id in (" + uids + ")) as receipts,"
            " (select count(*) from public.discoveries where user_id in (" + uids + ")) as discoveries,"
            " (select count(*) from public.scan_quota where bucket in (" + buckets + ")) as quota")
        if status in (200, 201) and isinstance(body, list) and body and isinstance(body[0], dict):
            counts = {k: int(v) for k, v in body[0].items()}
            print("residue after cleanup: " + ", ".join(f"{k}={v}" for k, v in counts.items()))
            if any(counts.values()):
                leftovers += 1
        else:
            print(f"::error::could not verify cleanup: HTTP {status}")
            leftovers += 1
    if leftovers:
        die("cleanup did not finish cleanly. Only accounts with this run's exact emails are affected; rerun the cleanup SQL (J1/J2).")
    print("CLEANUP COMPLETE: only this run's accounts were removed.")


# ── checkpoints: let the suite ask for a PRIVILEGED read without holding any credential ───────────────────────────────
def snapshot() -> dict:
    """Counters the suite cannot read for itself (the quota table has no client policy). Ids come from this run's own state file."""
    try:
        acc = json.load(open(state_path())).get("accounts", {})
    except Exception:
        return {"note": "no accounts yet"}
    ids = {r: a.get("id") for r, a in acc.items() if isinstance(a, dict)}
    if not all(isinstance(v, str) and re.fullmatch(r"[0-9a-f-]{36}", v) for v in ids.values()) or not ids:
        return {"note": "accounts incomplete"}
    parts = []
    for role, uid in ids.items():
        parts.append(f"(select coalesce(sum(count), 0) from public.scan_quota where bucket = 'user:{uid}' and day = (now() at time zone 'utc')::date) as {role}_quota")
        parts.append(f"(select count(*) from public.capture_receipts where user_id = '{uid}') as {role}_receipts")
        parts.append(f"(select count(*) from public.capture_sessions where user_id = '{uid}' and consumed_at is not null) as {role}_sessions_consumed")
    parts.append("(select coalesce(sum(count), 0) from public.scan_quota where bucket = 'global' and day = (now() at time zone 'utc')::date) as global_quota")
    status, body = sql("select " + ", ".join(parts))
    if status in (200, 201) and isinstance(body, list) and body and isinstance(body[0], dict):
        return {k: int(v) for k, v in body[0].items()}
    return {"error": f"HTTP {status}"}


def cmd_watch() -> None:
    """Background helper. The suite writes <name>.req into E2E_CHECKPOINT_DIR and waits for <name>.ack; this answers with <name>.json.
    It holds the Database-scope token; the suite does not."""
    require_test_only()
    d = os.environ.get("E2E_CHECKPOINT_DIR", "")
    if not d:
        die("E2E_CHECKPOINT_DIR is not set.")
    os.makedirs(d, exist_ok=True)
    seen: set[str] = set()
    deadline = time.time() + 900
    while time.time() < deadline and not os.path.exists(os.path.join(d, "stop")):
        for f in sorted(os.listdir(d)):
            if f.endswith(".req") and f not in seen and re.fullmatch(r"[a-z0-9-]+\.req", f):
                seen.add(f)
                name = f[:-4]
                with open(os.path.join(d, name + ".json"), "w") as out:
                    json.dump(snapshot(), out)
                open(os.path.join(d, name + ".ack"), "w").close()
        time.sleep(0.2)


# ── the enforcement switch: TEST only, only when the request says so, and always proven OFF afterwards ───────────────
def read_switch() -> bool | None:
    status, body = sql("select enforce from public.discovery_enforcement where singleton")
    if status in (200, 201) and isinstance(body, list) and body and isinstance(body[0], dict) and isinstance(body[0].get("enforce"), bool):
        return body[0]["enforce"]
    return None


def cmd_enforce() -> None:
    require_test_only()
    action = sys.argv[2] if len(sys.argv) > 2 else ""
    requested = os.environ.get("REQUEST_ENFORCEMENT", "off")
    if action == "on":
        if requested != "on":
            die("the request does not ask for enforcement ON; refusing to switch it.")
        if read_switch() is not False:
            die("enforcement is not verifiably OFF before the switch; refusing.")
        status, body = sql("select public.set_discovery_enforcement(true, now() - interval '1 second', 'ENFORCE NEW DISCOVERIES') as r")
        if status not in (200, 201):
            die(f"switching ON failed: HTTP {status}")
        if read_switch() is not True:
            die("enforcement did not read back as ON after the switch.")
        ok("TEST enforcement is ON for this run (it is switched OFF again in an always-run step)")
    elif action == "off":
        if requested == "on":
            status, _ = sql("select public.set_discovery_enforcement(false, null, 'x') as r")
            if status not in (200, 201):
                print(f"::error::switching OFF failed: HTTP {status}")
        state = read_switch()
        if state is False:
            ok("TEST enforcement reads OFF (proved by reading the switch back)")
        else:
            die(f"ENFORCEMENT IS NOT PROVEN OFF (read: {state!r}). Run: select public.set_discovery_enforcement(false, null, 'x');")
    else:
        die("usage: live_run.py enforce on|off")


def cmd_summary() -> None:
    """Markdown for the run summary: one PASS/FAIL line per live test, then the non-secret evidence the suite recorded."""
    tmp = os.environ.get("RUNNER_TEMP", "/tmp")
    out = ["## Live camera-to-collection run (TEST project only)", ""]
    try:
        res = json.load(open(os.path.join(tmp, "results.json")))
    except Exception:
        out.append("The suite produced no result file: it did not run to completion. See the step logs.")
        res = None
    if res:
        out += ["| Result | Test | Time |", "|---|---|---|"]
        for f in res.get("testResults", []):
            for t in f.get("assertionResults", []):
                st = {"passed": "PASS", "failed": "FAIL", "skipped": "SKIPPED", "pending": "SKIPPED"}.get(t.get("status"), str(t.get("status")))
                out.append(f"| {st} | {str(t.get('title', '')).replace('|', '/')} | {int(t.get('duration') or 0)} ms |")
        out.append("")
        for f in res.get("testResults", []):
            for t in f.get("assertionResults", []):
                if t.get("status") == "failed":
                    msg = " ".join(t.get("failureMessages") or [])[:600].replace("\n", " ")
                    out += [f"**FAIL - {t.get('title')}**: `{msg}`", ""]
    try:
        ev = json.load(open(os.path.join(tmp, "evidence.json")))
        out += ["### Evidence recorded by the suite (no passwords, keys or tokens)", "", "```json", json.dumps(ev, indent=2)[:6000], "```"]
    except Exception:
        out.append("No evidence file was written.")
    cp_dir = os.path.join(tmp, "cp")
    try:
        cps = {f[:-5]: json.load(open(os.path.join(cp_dir, f))) for f in sorted(os.listdir(cp_dir)) if f.endswith(".json")}
        if cps:
            out += ["", "### Privileged counters read at each checkpoint (quota is today's UTC bucket)", "", "```json", json.dumps(cps, indent=2)[:4000], "```"]
    except Exception:
        pass
    text = "\n".join(out)
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if path:
        open(path, "a").write(text + "\n")
    print(text)


def cmd_selftest() -> None:
    assert emails("r123456")["alice"] == "plantdex-e2e-capture-alice-r123456@mailinator.com"
    assert not EXPECTED_EMAIL.fullmatch("plantdex-e2e-capture-alice-r1@mailinator.com.evil.test")
    assert not EXPECTED_EMAIL.fullmatch("someone@example.com")
    assert PREFLIGHT_SQL.strip().lower().startswith("select")
    for bad_ref in (PRODUCTION_REF, "anything-else"):
        os.environ["PROJECT_REF"] = bad_ref
        try:
            require_test_only()
        except SystemExit:
            continue
        raise AssertionError("a non-TEST ref was accepted")
    print("selftest ok")


if __name__ == "__main__":
    cmds = {"preflight": cmd_preflight, "provision": cmd_provision, "cleanup": cmd_cleanup, "summary": cmd_summary, "watch": cmd_watch, "enforce": cmd_enforce, "selftest": cmd_selftest}
    if len(sys.argv) not in (2, 3) or sys.argv[1] not in cmds:
        die("usage: live_run.py preflight|provision|cleanup|summary|watch|enforce on|off|selftest")
    cmds[sys.argv[1]]()
