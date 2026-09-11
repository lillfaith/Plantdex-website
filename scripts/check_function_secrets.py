#!/usr/bin/env python3
"""Report WHICH function secrets a Supabase project has set — never what they are.

WHY THIS EXISTS. Three of the four edge functions read a project secret, and every one of
them fails SILENTLY and DIFFERENTLY when it is missing:

  PLANTNET_API_KEY            unset -> identification returns nothing for everybody, which
                              looks like the provider being down.
  SPECIES_ATTESTATION_SECRET  unset -> `identify-plant` signs nothing and `seed-packet`
                              refuses every mint, so scanning still works and NO SPECIES IS
                              EVER ADDED TO THE CANONICAL REGISTRY. Every shelf quietly
                              falls back to a locally derived preview. Nothing errors.
  SCAN_QUOTA_SALT             unset -> the function derives a fallback from the service-role
                              key and behaves identically, so the omission is undetectable
                              from outside by design.

The common shape is that a missing secret changes what the product DOES without changing
what it SAYS, so "is it set on production?" was a question nobody in this repository could
answer — including from a session, since the access token rightly lives only in Actions.

IT PRINTS NAMES AND A YES/NO, AND NEVER A VALUE. `GET /v1/projects/{ref}/secrets` returns
each secret's value alongside its name, and a workflow log is readable by anyone with repo
access — so the response is parsed for names only and nothing else reaches stdout. That is
the same rule `check_auth_config.py` follows for the same reason, and it is what keeps a
read-only check from becoming a credential leak.

Secrets the platform injects itself (SUPABASE_URL, the two keys, the DB URL) are always
present and are not reported; only the three this repository's own functions read.
"""

from __future__ import annotations

import json
import sys

# (name, whether a deploy is unsafe without it, what breaks). Ordered by consequence.
EXPECTED: list[tuple[str, bool, str]] = [
    (
        "SPECIES_ATTESTATION_SECRET",
        True,
        "no species can ever be minted into the canonical registry; every shelf shows a "
        "local preview instead, and nothing errors",
    ),
    (
        "PLANTNET_API_KEY",
        True,
        "identification returns nothing, which reads as a provider outage",
    ),
    (
        "SCAN_QUOTA_SALT",
        False,
        "the anonymous rate-limit bucket falls back to a key-derived salt — same behaviour, "
        "but it cannot then be rotated without rotating database access",
    ),
]


def main() -> int:
    payload = json.load(sys.stdin)
    project = sys.argv[1] if len(sys.argv) > 1 else "(unknown)"

    # The endpoint answers a list of {name, value}. Only names are ever touched.
    if not isinstance(payload, list):
        print("::error::Unexpected response shape from the secrets endpoint.")
        return 1
    present = {entry.get("name") for entry in payload if isinstance(entry, dict)}

    print(f"project: {project}")
    missing_required = []
    for name, required in ((n, r) for n, r, _ in EXPECTED):
        mark = "set" if name in present else "NOT SET"
        print(f"  {name:<28} {mark}")
        if name not in present and required:
            missing_required.append(name)

    for name, required, breaks in EXPECTED:
        if name not in present:
            level = "error" if required else "warning"
            print(f"::{level}::{project}: {name} is not set — {breaks}.")

    if missing_required:
        print(
            "::error::Set them with: supabase secrets set "
            f"{' '.join(f'{n}=...' for n in missing_required)} --project-ref {project}"
        )
        return 1

    print("Every secret this repository's functions read is set.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
