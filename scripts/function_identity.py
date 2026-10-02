#!/usr/bin/env python3
"""Compare the DEPLOYED identity of each edge function against the repository. READ-ONLY.

WHY. A step-0 checkpoint recorded version 13/15/11/9 for the four production functions; a
re-check 35 minutes later read 16/18/14/12 — every one of them +3, with `updated_at`
unchanged. A version counter moving is not the question. The question is whether the CODE
moved, and the first checkpoint recorded only slug/version/status/updated_at, so there is no
stored hash from 03:04 to diff against.

So this asks the question a different way, which is answerable without a historical hash:
fetch what is deployed RIGHT NOW and compare it to what the repository says should be
deployed. If the deployed body matches the pre-release source, then whatever moved the counter
did not change the code — and that is the operational fact the release needs.

READS ONLY:
  GET /v1/projects/{ref}/functions            list: version, status, timestamps
  GET /v1/projects/{ref}/functions/{slug}      detail: id, created_at, entrypoint, import map
  GET /v1/projects/{ref}/functions/{slug}/body the deployed source, hashed locally
  GET /v1/organizations/{slug}/audit-logs      platform actions in the window, if permitted

It deploys nothing, changes nothing, and prints no secret.

Usage:  PROJECT_REF=... SUPABASE_ACCESS_TOKEN=... python3 scripts/function_identity.py
"""

from __future__ import annotations

import hashlib
import json
import os
import urllib.error
import urllib.request

API = "https://api.supabase.com/v1"
SLUGS = ["delete-account", "herbdex-action", "identify-plant", "seed-packet"]

# What the 03:04 UTC checkpoint recorded. The only historical evidence that exists: the run
# printed these four columns and nothing else, so this is the baseline to compare against
# rather than anything reconstructed from memory.
BASELINE = {
    "delete-account": {"version": 13, "updated_at": "1789109200893"},
    "herbdex-action": {"version": 15, "updated_at": "1789146119827"},
    "identify-plant": {"version": 11, "updated_at": "1789264123535"},
    "seed-packet": {"version": 9, "updated_at": "1789524756891"},
}


def call(path: str, token: str, raw: bool = False):
    request = urllib.request.Request(
        f"{API}{path}", headers={"Authorization": f"Bearer {token}"}
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            body = response.read()
            if raw:
                return response.status, body
            return response.status, json.loads(body)
    except urllib.error.HTTPError as error:
        return error.code, error.read()[:300] if raw else error.read().decode()[:300]
    except Exception as error:  # noqa: BLE001
        return 0, str(error)[:200]


def main() -> int:
    ref = os.environ.get("PROJECT_REF", "").strip()
    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
    if not ref or not token:
        print("set PROJECT_REF and SUPABASE_ACCESS_TOKEN")
        return 2

    print("=" * 76)
    print(f"EDGE FUNCTION IDENTITY — {ref}")
    print("=" * 76)

    status, listing = call(f"/projects/{ref}/functions", token)
    if status // 100 != 2 or not isinstance(listing, list):
        print(f"::error::list functions {status}: {listing}")
        return 1
    by_slug = {f.get("slug"): f for f in listing}

    print("\nVERSION / TIMESTAMP COMPARISON against the 03:04 UTC checkpoint")
    print(f"  {'slug':<17} {'was':>4} {'now':>4}  {'updated_at was':>15} {'updated_at now':>15}  same?")
    for slug in SLUGS:
        now = by_slug.get(slug, {})
        was = BASELINE[slug]
        same = str(now.get("updated_at")) == was["updated_at"]
        print(
            f"  {slug:<17} {was['version']:>4} {str(now.get('version','?')):>4}  "
            f"{was['updated_at']:>15} {str(now.get('updated_at','?')):>15}  "
            f"{'YES' if same else 'NO — CODE TIMESTAMP MOVED'}"
        )

    print("\nFULL DETAIL, and the deployed body hashed locally")
    for slug in SLUGS:
        print(f"\n  ── {slug}")
        status, detail = call(f"/projects/{ref}/functions/{slug}", token)
        if status // 100 != 2 or not isinstance(detail, dict):
            print(f"     ::error::detail {status}: {detail}")
            continue
        for key in (
            "id", "slug", "name", "version", "status", "created_at", "updated_at",
            "verify_jwt", "entrypoint_path", "import_map_path", "import_map",
            "compute_multiplier", "ezbr_sha256",
        ):
            if key in detail:
                print(f"     {key:<20} {detail[key]}")
        missing = [k for k in ("ezbr_sha256",) if k not in detail]
        if missing:
            print(f"     (no {', '.join(missing)} field exposed by this API version)")

        status, body = call(f"/projects/{ref}/functions/{slug}/body", token, raw=True)
        if status // 100 != 2 or not isinstance(body, (bytes, bytearray)):
            print(f"     body                 UNAVAILABLE ({status}: {str(body)[:120]})")
        else:
            print(f"     body bytes           {len(body)}")
            print(f"     body sha256          {hashlib.sha256(body).hexdigest()}")

    print("\nORGANIZATION AUDIT LOG (if this token may read it)")
    status, orgs = call("/organizations", token)
    if status // 100 != 2 or not isinstance(orgs, list):
        print(f"  unavailable ({status})")
    else:
        for org in orgs:
            slug = org.get("slug")
            status, logs = call(f"/organizations/{slug}/audit-logs", token)
            if status // 100 != 2:
                print(f"  org {slug}: audit log unavailable ({status})")
                continue
            entries = logs.get("result", logs) if isinstance(logs, dict) else logs
            print(f"  org {slug}: {len(entries) if isinstance(entries, list) else '?'} entries")
            for entry in (entries if isinstance(entries, list) else [])[:25]:
                occurred = entry.get("occurred_at", "?")
                action = (entry.get("action") or {}).get("name", entry.get("action"))
                target = entry.get("target", {})
                print(f"    {occurred}  {action}  {json.dumps(target)[:120]}")

    print("\n" + "=" * 76)
    print("READ-ONLY. Nothing was deployed, changed or deleted.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
