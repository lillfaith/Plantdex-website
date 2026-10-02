#!/usr/bin/env python3
"""Print a test account's user id, and nothing else that came back with it.

The pilot needs both disposable accounts' user ids: one to assert the comparison allow-list
holds EXACTLY that account, the other to assert it does NOT hold the plain one. The only way
to learn an id from outside the database is to sign in — which hands back an access token
and a refresh token in the same response.

SO THE RESPONSE IS NEVER PRINTED, and this exists rather than an inline `curl | jq` for that
one reason. `.user.id` is extracted and written to stdout; every other field, including both
tokens, is dropped on the floor here and never reaches a log, a step output or an artifact.
A failure prints the provider's own code and message, never the body — the body answers a
request that CONTAINED the password, and some error shapes echo what was sent.

The id itself is not a credential. It names a throwaway row on a test project and is exactly
what the allow-list is made of; `comparison-account.yml` prints it deliberately.

Usage:  PROJECT_REF=... ANON_KEY=... EMAIL=... PASSWORD=... test_account_id.py
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request


def main() -> int:
    project = os.environ.get("PROJECT_REF", "").strip()
    key = os.environ.get("ANON_KEY", "").strip()
    email = os.environ.get("EMAIL", "").strip()
    password = os.environ.get("PASSWORD", "")
    if not (project and key and email and password):
        print("::error::set PROJECT_REF, ANON_KEY, EMAIL and PASSWORD", file=sys.stderr)
        return 2

    request = urllib.request.Request(
        f"https://{project}.supabase.co/auth/v1/token?grant_type=password",
        data=json.dumps({"email": email, "password": password}).encode(),
        headers={"Content-Type": "application/json", "apikey": key},
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            body = json.load(response)
    except urllib.error.HTTPError as error:
        try:
            detail = json.loads(error.read().decode("utf-8", "replace"))
            reason = detail.get("error_description") or detail.get("msg") or detail.get("error")
        except Exception:  # noqa: BLE001
            reason = None
        # Status and the provider's own sentence. Never the body.
        print(f"::error::sign-in failed ({error.code}): {reason or 'no readable reason'}",
              file=sys.stderr)
        return 1

    user_id = (body.get("user") or {}).get("id")
    if not user_id:
        print("::error::signed in but no user id came back", file=sys.stderr)
        return 1

    # The ONLY thing that leaves this process.
    print(user_id)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
