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

  PLANT_ID_API_KEY            unset on a deployment that SELECTED plant.id -> every scan is
                              refused as `unconfigured`, blaming a provider nobody chose.
                              Unset while PlantNet is selected -> comparison mode records
                              only one side, and nothing says so.
  IDENTIFICATION_COMPARISON   on with an empty allow-list, or an allow-list with the switch
                              off -> a deployment that looks configured and records nothing.

WHICH PROVIDER KEY IS REQUIRED DEPENDS ON WHICH PROVIDER IS SELECTED, so this script reads
the VALUE of `PLANT_IDENTIFICATION_PROVIDER` to decide. That mirrors `identify-plant`'s own
gate, which used to read `PLANTNET_API_KEY` unconditionally and would have refused every
scan on a plant.id deployment while naming the wrong secret. A checker that hard-required
PlantNet's key would reproduce exactly that mistake one layer up.

IT PRINTS NAMES AND A YES/NO, AND NEVER A VALUE. `GET /v1/projects/{ref}/secrets` returns
each secret's value alongside its name, and a workflow log is readable by anyone with repo
access — so only names, a provider CHOICE and a COUNT of allow-listed accounts reach stdout.
The three values it reads are used for decisions and never interpolated into output. That is
the same rule `check_auth_config.py` follows for the same reason, and it is what keeps a
read-only check from becoming a credential leak.

Secrets the platform injects itself (SUPABASE_URL, the two keys, the DB URL) are always
present and are not reported; only the ones this repository's own functions read.
"""

from __future__ import annotations

import json
import sys

DEFAULT_PROVIDER = "plantnet"
PROVIDER_KEYS = {"plantnet": "PLANTNET_API_KEY", "plantid": "PLANT_ID_API_KEY"}


def expected_secrets(provider: str) -> list[tuple[str, bool, str]]:
    """(name, whether a deploy is unsafe without it, what breaks). Ordered by consequence.

    `provider` decides which identification key is REQUIRED and which is merely useful. The
    unselected one is never required: a deployment answering from PlantNet does not need
    plant.id's key to serve a single scan — it needs it only to compare.
    """
    selected = PROVIDER_KEYS.get(provider, PROVIDER_KEYS[DEFAULT_PROVIDER])
    alternate = next(name for name in PROVIDER_KEYS.values() if name != selected)
    return [
        (
            "SPECIES_ATTESTATION_SECRET",
            True,
            "no species can ever be minted into the canonical registry; every shelf shows a "
            "local preview instead, and nothing errors",
        ),
        (
            selected,
            True,
            "this deployment selected that provider, so every scan is refused as "
            "`unconfigured` and identification is down for everybody",
        ),
        (
            alternate,
            False,
            "the other provider cannot answer — which matters only for comparison mode, "
            "where it means one side of every comparison is silently missing",
        ),
        (
            "SCAN_QUOTA_SALT",
            False,
            "the anonymous rate-limit bucket falls back to a key-derived salt — same "
            "behaviour, but it cannot then be rotated without rotating database access",
        ),
    ]


def comparison_report(present: set[str], values: dict[str, str], provider: str) -> list[str]:
    """Problems with comparison mode that are invisible from outside.

    Comparison mode needs BOTH switches and an allow-list with something in it. Each half
    alone is a deployment that looks configured and records nothing — which is the same
    failure shape as every other secret in this file: the product does something different
    without saying anything different.
    """
    on = values.get("IDENTIFICATION_COMPARISON", "").strip() == "on"
    listed = [one for one in values.get("IDENTIFICATION_COMPARISON_USER_IDS", "").split(",") if one.strip()]
    notes: list[str] = []

    # A count, never the ids. The allow-list names accounts.
    print(f"  {'IDENTIFICATION_COMPARISON':<28} {'on' if on else 'off'}")
    print(f"  {'IDENTIFICATION_COMPARISON_USER_IDS':<28} {len(listed)} account(s)")

    if on and not listed:
        notes.append(
            "::warning::comparison is on but the allow-list is empty — it enrols nobody "
            "and will record nothing."
        )
    if listed and not on:
        notes.append(
            "::warning::accounts are allow-listed but IDENTIFICATION_COMPARISON is not "
            "'on' — comparison is off and will record nothing."
        )
    if on and listed:
        alternate = next(name for key, name in PROVIDER_KEYS.items() if key != provider)
        if alternate not in present:
            notes.append(
                f"::warning::comparison is on, but {alternate} is not set — only the "
                "selected provider's answer will be recorded, which is not a comparison."
            )
    return notes


def main() -> int:
    payload = json.load(sys.stdin)
    project = sys.argv[1] if len(sys.argv) > 1 else "(unknown)"

    # The endpoint answers a list of {name, value}. Names are printed; values are read for
    # exactly two decisions below and never reach stdout.
    if not isinstance(payload, list):
        print("::error::Unexpected response shape from the secrets endpoint.")
        return 1
    entries = [entry for entry in payload if isinstance(entry, dict)]
    present = {entry.get("name") for entry in entries}
    values = {
        str(entry.get("name")): str(entry.get("value") or "")
        for entry in entries
        if entry.get("name") in {"PLANT_IDENTIFICATION_PROVIDER", "IDENTIFICATION_COMPARISON", "IDENTIFICATION_COMPARISON_USER_IDS"}
    }

    raw_provider = values.get("PLANT_IDENTIFICATION_PROVIDER", "").strip()
    provider = raw_provider or DEFAULT_PROVIDER
    known = provider in PROVIDER_KEYS
    expected = expected_secrets(provider)

    print(f"project: {project}")
    # The provider is reported as a validated CHOICE, never echoed. `raw_provider` is the
    # untrusted string off the wire and is resolved to one of these words BEFORE any print
    # touches it — a guard in `identification-schema.test.ts` fails if it appears inside one,
    # because a value that is merely tested in a print is one edit from being printed.
    choice = provider if known else "UNRECOGNISED"
    if not raw_provider:
        choice += " (default, unset)"
    print(f"  {'PLANT_IDENTIFICATION_PROVIDER':<28} {choice}")

    missing_required = []
    for name, required, _ in expected:
        mark = "set" if name in present else "NOT SET"
        print(f"  {name:<28} {mark}")
        if name not in present and required:
            missing_required.append(name)

    notes = comparison_report(present, values, provider)

    for name, required, breaks in expected:
        if name not in present:
            level = "error" if required else "warning"
            print(f"::{level}::{project}: {name} is not set — {breaks}.")
    for note in notes:
        print(note)

    if not known:
        # Same rule the function follows: an unknown value is a configuration error, never a
        # silent fall back to the default.
        print(
            f"::error::{project}: PLANT_IDENTIFICATION_PROVIDER is set to something this "
            f"repository does not implement. identify-plant refuses every scan in that "
            f"state. Valid values: {', '.join(sorted(PROVIDER_KEYS))}."
        )
        return 1

    if missing_required:
        print(
            "::error::Set them with: supabase secrets set "
            f"{' '.join(f'{n}=...' for n in missing_required)} --project-ref {project}"
        )
        return 1

    print("Every secret this deployment's selected provider needs is set.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
