#!/usr/bin/env python3
"""Report a Supabase project's redirect allow list and Site URL.

Reads the Management API response on stdin and prints the two fields that decide where a
confirmation or password-reset link sends someone.

WHY THIS IS WORTH A SCRIPT. Those settings fail invisibly: signup appears to work, the
email arrives, and the link drops the player on localhost or on a bare domain with no
session. Nothing in the app can detect it, and `/auth/v1/settings` — the only endpoint the
anon key can reach — does not expose either field. The dashboard and the Management API are
the only readers, which is why the check runs in CI where the token already lives.

IT PRINTS TWO FIELDS AND NOTHING ELSE, and that is the whole reason it is a script rather
than a `curl | jq` in a workflow step. The config endpoint returns the entire auth
configuration — SMTP credentials, external provider secrets, the JWT secret — and a
workflow log is readable by anyone with repo access, so echoing the response would turn a
read-only check into a credential leak. Fields are extracted by name; nothing else is ever
written to stdout.
"""

from __future__ import annotations

import json
import sys

# Where the app sends people after signup and after a password reset. If this is not
# reachable, those links fall back to Site URL and land somewhere with no session.
ACCOUNT_URL = "https://lillfaith.github.io/Plantdex-website/account/"


def covered_by(pattern: str, url: str) -> bool:
    """Whether an allow-list entry admits `url`.

    Supabase entries may end in a `**` wildcard, so an exact match is not the only pass.
    """
    if pattern == url:
        return True
    return pattern.endswith("**") and url.startswith(pattern[:-2])


def main() -> int:
    config = json.load(sys.stdin)
    project = sys.argv[1] if len(sys.argv) > 1 else "(unknown)"

    site = config.get("site_url") or ""
    allow = [entry for entry in (config.get("uri_allow_list") or "").split(",") if entry]
    autoconfirm = bool(config.get("mailer_autoconfirm"))

    print(f"project:  {project}")
    print(f"site_url: {site or '(unset)'}")
    print("redirect allow list:")
    for entry in allow:
        print(f"  - {entry}")
    if not allow:
        print("  (empty — every redirect falls back to site_url)")
    print(f"confirm email: {'OFF — signups auto-confirm' if autoconfirm else 'ON'}")

    reachable = any(covered_by(entry, ACCOUNT_URL) for entry in allow)
    print()
    print(f"{ACCOUNT_URL} reachable: {'yes' if reachable else 'NO'}")
    if not reachable:
        print(
            f"::warning::{ACCOUNT_URL} is not in the allow list — confirmation and "
            f"password-reset links will fall back to site_url"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
