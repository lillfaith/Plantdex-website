#!/usr/bin/env python3
"""Autonomous prerequisites, disposable accounts and cleanup for the LIVE camera-to-collection run. TEST PROJECT ONLY.

    live_run.py preflight    read-only: is this really TEST, is 0016 there, is enforcement OFF, is identify-plant live, are the
                             provider and attestation secrets present, and CAN the admin credential be obtained?
    live_run.py provision    create two already-confirmed disposable accounts through the Auth admin API, plus one aged
                             (expired) receipt for the second one, and hand the credentials to the suite through masked env vars
    live_run.py cleanup      delete ONLY the accounts this run created, by exact id and exact email, then prove nothing is left
    live_run.py selftest     offline checks of the guards in this file (no network)

WHY THE ADMIN API AND NOT THE "CONFIRM EMAIL" SETTING. The project's authentication settings are shared by everything on TEST.
An admin-created user with `email_confirm: true` is already confirmed, so the setting is never touched.

THE ONLY CREDENTIAL IS THE REPOSITORY'S EXISTING `SUPABASE_ACCESS_TOKEN`. The project's service-role key is obtained from the
Management API at run time, masked at once, held in this process only and never written to a file, an environment file, the step
summary or a log. The vitest process never sees it: it receives two ordinary player email/password pairs and nothing else.

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
import urllib.error
import urllib.parse
import urllib.request

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
def project_keys() -> tuple[str | None, str | None, str]:
    """(anon, service_role, note). The service-role key is masked the moment it exists."""
    status, body = mgmt("GET", f"/v1/projects/{TEST_REF}/api-keys?reveal=true")
    if status != 200 or not isinstance(body, list):
        return None, None, f"api-keys answered HTTP {status}, {shape(body)}"
    anon = service = None
    for k in body:
        if not isinstance(k, dict):
            continue
        name = str(k.get("name", ""))
        key = k.get("api_key")
        if isinstance(key, str) and key:
            mask(key)
            if name == "anon":
                anon = key
            elif name == "service_role":
                service = key
    return anon, service, "ok"


def jwt_claims(key: str) -> dict | None:
    try:
        seg = key.split(".")[1]
        return json.loads(base64.urlsafe_b64decode(seg + "=" * (-len(seg) % 4)))
    except Exception:
        return None


def admin_headers(service: str) -> dict[str, str]:
    return {"apikey": service, "Authorization": f"Bearer {service}"}


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
    status, body = mgmt("GET", f"/v1/projects/{TEST_REF}")
    if status != 200 or not isinstance(body, dict):
        bad(f"project lookup: HTTP {status}, {shape(body)}")
        return
    ref = body.get("id") or body.get("ref")
    if ref == TEST_REF:
        ok(f"target project is exactly the TEST project ({TEST_REF}); status {body.get('status')}")
    else:
        bad("the project the token resolves for the TEST ref is not the TEST ref")
    if str(body.get("status", "")).upper() not in ("ACTIVE_HEALTHY", "ACTIVE"):
        bad(f"project is not active (status {body.get('status')})")


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


def check_secrets() -> None:
    """Names always; a value only through its digest, and only for the few values that decide behaviour."""
    status, body = mgmt("GET", f"/v1/projects/{TEST_REF}/secrets")
    if status != 200 or not isinstance(body, list):
        bad(f"project secrets could not be read: HTTP {status}, {shape(body)}. Credentials are therefore UNVERIFIED, which is a failure.")
        return
    by_name: dict[str, str] = {}
    for item in body:
        if isinstance(item, dict) and isinstance(item.get("name"), str):
            by_name[item["name"]] = str(item.get("value", ""))
    if "SPECIES_ATTESTATION_SECRET" in by_name:
        ok("SPECIES_ATTESTATION_SECRET is set")
    else:
        bad("SPECIES_ATTESTATION_SECRET is NOT set")
    provider = "plantnet"
    if "PLANT_IDENTIFICATION_PROVIDER" in by_name:
        digest = by_name["PLANT_IDENTIFICATION_PROVIDER"]
        if digest == sha("plantid"):
            provider = "plantid"
        elif digest == sha("plantnet"):
            provider = "plantnet"
        else:
            bad("PLANT_IDENTIFICATION_PROVIDER is set to a value this repository does not implement")
            return
    key = {"plantnet": "PLANTNET_API_KEY", "plantid": "PLANT_ID_API_KEY"}[provider]
    if key in by_name:
        ok(f"identification provider is {provider} and {key} is set")
    else:
        bad(f"identification provider is {provider} but {key} is NOT set")
    if "IDENTIFY_MIN_IMAGES" in by_name and by_name["IDENTIFY_MIN_IMAGES"] != sha("1"):
        bad("IDENTIFY_MIN_IMAGES is set to something other than 1: a one-photograph capture would be refused")
    else:
        ok("IDENTIFY_MIN_IMAGES is unset or 1 (a one-photograph capture is accepted)")
    for name in ("IDENTIFICATION_COMPARISON", "IDENTIFICATION_COMPARISON_USER_IDS"):
        if name in by_name:
            print(f"NOTE  {name} is set (allow-listed accounts only; the disposable accounts are not on it)")


def check_admin_credential() -> None:
    anon, service, note = project_keys()
    if note != "ok":
        bad(f"project API keys could not be obtained: {note}")
        return
    if not anon or not service:
        bad("the Management API did not return both an anon key and a service-role key for TEST")
        return
    claims = jwt_claims(service)
    if claims is not None and (claims.get("role") != "service_role" or claims.get("ref") not in (None, TEST_REF)):
        bad("the service key obtained does not claim role service_role for the TEST project")
        return
    status, body = http("GET", f"{URL}/auth/v1/admin/users?page=1&per_page=1", admin_headers(service))
    if status == 200:
        ok("admin credential for TEST obtained and accepted by the TEST Auth admin API (not used yet, never printed)")
    else:
        bad(f"the TEST Auth admin API refused the credential: HTTP {status}")
    status, _ = http("GET", f"{URL}/auth/v1/settings", {"apikey": anon})
    ok("the TEST project accepts its anon key") if status == 200 else bad(f"the anon key was not accepted: HTTP {status}")


def cmd_preflight() -> None:
    require_test_only()
    check_project()
    check_database()
    check_function()
    check_secrets()
    check_admin_credential()
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


def cmd_provision() -> None:
    require_test_only()
    stamp = run_stamp()
    anon, service, note = project_keys()
    if note != "ok" or not anon or not service:
        die(f"could not obtain the TEST project keys ({note}).")
    append_env("E2E_ANON_KEY", anon)  # public by design; masked anyway
    state: dict = {"stamp": stamp, "accounts": {}}
    save_state(state)
    for role, email in emails(stamp).items():
        password = "Pw-" + secrets.token_urlsafe(24)
        mask(password)
        status, body = http("POST", f"{URL}/auth/v1/admin/users", admin_headers(service), {
            "email": email, "password": password, "email_confirm": True,
            "user_metadata": {"plantdex_e2e": stamp},
        })
        uid = body.get("id") if isinstance(body, dict) else None
        if status not in (200, 201) or not isinstance(uid, str):
            msg = body.get("msg") or body.get("message") if isinstance(body, dict) else ""
            die(f"creating the {role} account failed: HTTP {status} {str(msg)[:120]}")
        if body.get("email") != email or not body.get("email_confirmed_at"):
            die(f"the {role} account came back unconfirmed or with a different email.")
        state["accounts"][role] = {"id": uid, "email": email}
        save_state(state)
        append_env(f"E2E_{role.upper()}_EMAIL", email)
        append_env(f"E2E_{role.upper()}_PASSWORD", password)
        ok(f"created confirmed disposable account {role}: {email} ({uid})")
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
        quoted = ",".join("'" + e + "'" for e in expect.values())
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
    anon, service, note = project_keys()
    if not service:
        die(f"cannot clean up: the admin credential could not be obtained ({note}).")
    leftovers = 0
    for role, uid in ids.items():
        if not re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", uid):
            print(f"::warning::skipping {role}: id has an unexpected shape")
            continue
        status, body = http("GET", f"{URL}/auth/v1/admin/users/{uid}", admin_headers(service))
        if status == 404:
            print(f"already gone: {role}")
            continue
        if status != 200 or not isinstance(body, dict) or body.get("email") != expect[role]:
            print(f"::error::refusing to delete {role}: the account at that id is not the one this run created")
            leftovers += 1
            continue
        status, _ = http("DELETE", f"{URL}/auth/v1/admin/users/{uid}", admin_headers(service))
        if status in (200, 204):
            print(f"deleted {role}: {expect[role]} ({uid})")
        else:
            print(f"::error::deleting {role} failed: HTTP {status}")
            leftovers += 1
    # Quota rows are keyed by text, not by a foreign key, so they do not cascade. Exact ids only.
    good = [u for u in ids.values() if re.fullmatch(r"[0-9a-f-]{36}", u)]
    if good:
        buckets = ",".join(f"'user:{u}'" for u in good)
        sql(f"delete from public.scan_quota where bucket in ({buckets}) returning bucket")
        uids = ",".join(f"'{u}'" for u in good)
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
    cmds = {"preflight": cmd_preflight, "provision": cmd_provision, "cleanup": cmd_cleanup, "summary": cmd_summary, "selftest": cmd_selftest}
    if len(sys.argv) != 2 or sys.argv[1] not in cmds:
        die("usage: live_run.py preflight|provision|cleanup|summary|selftest")
    cmds[sys.argv[1]]()
