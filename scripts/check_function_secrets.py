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
  PLANT_ID_API_KEY            unset on a deployment that SELECTED plant.id -> every scan is
                              refused as `unconfigured`, blaming a provider nobody chose.
                              Unset while PlantNet is selected -> comparison mode records
                              only one side, and nothing says so.
  IDENTIFICATION_COMPARISON   on with an empty allow-list, or an allow-list with the switch
                              off -> a deployment that looks configured and records nothing.

The common shape is that a missing secret changes what the product DOES without changing
what it SAYS, so "is it set on production?" was a question nobody in this repository could
answer — including from a session, since the access token rightly lives only in Actions.

WHICH PROVIDER KEY IS REQUIRED DEPENDS ON WHICH PROVIDER IS SELECTED, so this script has to
know which one is. That mirrors `identify-plant`'s own gate, which used to read
`PLANTNET_API_KEY` unconditionally and would have refused every scan on a plant.id
deployment while naming the wrong secret. A checker that hard-required PlantNet's key would
reproduce exactly that mistake one layer up.

IT CANNOT READ THE VALUE, AND ASSUMING IT COULD PRODUCED A FALSE ALARM. This endpoint does
NOT return plaintext: it returns each secret's value as a SHA-256 DIGEST. The first version
compared that digest against the word `plantid`, found no match, and reported a correctly
set secret as "something this repository does not implement" — sending somebody to re-set a
value that was already right. So the comparison runs the other way round: hash each value
this repository implements and look for THAT. It is exact, it needs no plaintext, and it
cannot leak, because a digest is all it ever holds.

What that costs is anything not drawn from a known-values list. The comparison allow-list is
free-form account ids, so this can say whether it is SET but never how many it names.

IT PRINTS NAMES AND A YES/NO, AND NEVER A VALUE. A workflow log is readable by anyone with
repo access, so only names and resolved CHOICES reach stdout — never a stored value, and
never the digest either. That is the same rule `check_auth_config.py` follows for the same
reason, and it is what keeps a read-only check from becoming a credential leak.

Secrets the platform injects itself (SUPABASE_URL, the two keys, the DB URL) are always
present and are not reported; only the ones this repository's own functions read.
"""

from __future__ import annotations

import hashlib
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


def stored_is(stored: str, candidate: str) -> bool:
    """Does this stored secret hold `candidate`?

    The Management API returns a SHA-256 digest rather than the value, so the only way to
    recognise a known value is to hash it and compare. Plaintext is accepted too, because
    the endpoint's behaviour is not this repository's to guarantee and a checker that broke
    the day it changed would be worse than one that handles both.
    """
    stored = (stored or "").strip()
    return stored == candidate or stored == hashlib.sha256(candidate.encode()).hexdigest()


def resolve_provider(stored: str) -> str | None:
    """Which implemented provider this is, or None when it is neither."""
    for name in PROVIDER_KEYS:
        if stored_is(stored, name):
            return name
    return None


def describe_unrecognised(value: str) -> str:
    """Say enough about an unrecognised provider value to fix it, WITHOUT echoing it.

    The no-value rule is not relaxed here, and the reason is concrete: the commonest way
    this field goes wrong is pasting into the wrong box, and the box next to it holds an API
    key. Printing "what you actually set" would then print the key into a log anyone with
    repo access can read — turning a typo into a credential leak.

    So this reports SHAPE: a length and a handful of booleans, from which the value cannot be
    reconstructed but every likely mistake is obvious. In practice one of these lights up:

      looks like NAME=value   the whole `NAME=value` pair went into the value box
      looks like a command    the entire `supabase secrets set ...` line was pasted
      known after cleanup     right word, wrong case or stray whitespace/quotes
    """
    cleaned = value.strip().strip('"\'').lower()
    notes = [f"length {len(value)}"]
    stripped = value.strip()
    if len(stripped) == 64 and all(ch in "0123456789abcdefABCDEF" for ch in stripped):
        # The shape that cost a round: a SHA-256 digest, which is what this endpoint returns
        # for a value it will not hand back in the clear.
        notes.append(
            "looks like a SHA-256 digest — the API returns values hashed, so this is a "
            "value this script does not know how to recognise rather than a malformed one"
        )
    if "=" in value:
        notes.append("contains '=' — looks like a NAME=value pair went into the value box")
    if value.strip().startswith("supabase "):
        notes.append("starts with 'supabase ' — looks like the whole CLI command was pasted")
    if any(ch.isspace() for ch in value.strip()):
        notes.append("contains internal whitespace")
    if value != value.strip():
        notes.append("has leading or trailing whitespace")
    if cleaned in PROVIDER_KEYS:
        notes.append(f"would be valid after trimming/lowercasing — set it to exactly '{cleaned}'")
    elif cleaned.replace("-", "").replace(".", "").replace("_", "") in PROVIDER_KEYS:
        notes.append("close to a valid value but punctuated — no dash, dot or underscore")
    return "; ".join(notes)


def comparison_report(present: set[str], values: dict[str, str], provider: str) -> list[str]:
    """Problems with comparison mode that are invisible from outside.

    Comparison mode needs BOTH switches and an allow-list with something in it. Each half
    alone is a deployment that looks configured and records nothing — which is the same
    failure shape as every other secret in this file: the product does something different
    without saying anything different.
    """
    on = stored_is(values.get("IDENTIFICATION_COMPARISON", ""), "on")
    # SET OR NOT, NEVER A COUNT. The allow-list is free-form account ids and the API returns
    # it digested, so there is nothing to count. Printing "0 account(s)" for a list that was
    # in fact populated is worse than admitting the limit.
    allow_list_present = bool(values.get("IDENTIFICATION_COMPARISON_USER_IDS", "").strip())
    notes: list[str] = []

    print(f"  {'IDENTIFICATION_COMPARISON':<28} {'on' if on else 'off'}")
    print(f"  {'IDENTIFICATION_COMPARISON_USER_IDS':<28} {'set' if allow_list_present else 'NOT SET'}")

    if on and not allow_list_present:
        notes.append(
            "::warning::comparison is on but the allow-list is empty — it enrols nobody "
            "and will record nothing."
        )
    if allow_list_present and not on:
        notes.append(
            "::warning::accounts are allow-listed but IDENTIFICATION_COMPARISON is not "
            "'on' — comparison is off and will record nothing."
        )
    if on and allow_list_present:
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
    resolved = resolve_provider(raw_provider) if raw_provider else DEFAULT_PROVIDER
    provider = resolved or DEFAULT_PROVIDER
    known = resolved is not None
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
        shape = describe_unrecognised(raw_provider)
        print(
            f"::error::{project}: PLANT_IDENTIFICATION_PROVIDER is set to something this "
            f"repository does not implement. identify-plant refuses every scan in that "
            f"state. Valid values: {', '.join(sorted(PROVIDER_KEYS))}."
        )
        # Shape only — see `describe_unrecognised`. The value is never printed.
        print(f"::error::{project}: what is set, without revealing it — {shape}")
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
