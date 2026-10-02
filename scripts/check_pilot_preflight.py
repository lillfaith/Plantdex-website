#!/usr/bin/env python3
"""Assert a project is in the exact state the accuracy pilot requires — before it spends.

WHY THIS IS SEPARATE FROM `check_function_secrets.py`. That script REPORTS: it prints what
is set and warns about combinations that record nothing. This one ASSERTS, against the
specific configuration one experiment was approved to run under, and exits non-zero the
moment anything differs. A report is for a human reading a log; an assertion is what stands
between a misconfiguration and six paid credits.

IT PRINTS NO VALUE, EVER — same rule as the script it borrows from, and here it matters more
because this one is handed an account id. The Management API returns each secret as a
SHA-256 DIGEST, so every check below is "hash what we expect and look for THAT". Nothing
compared is ever echoed; the output is a name and a verdict.

TWO ROLES, AND THEY ASSERT OPPOSITE THINGS.

  test        IDENTIFY_MIN_IMAGES must be exactly `1`, comparison must be on, the
              allow-list must hold EXACTLY the one comparison account, and BOTH provider
              keys must be set — without the alternate key, comparison mode simply makes no
              second call and records one side of every comparison, which is not a
              comparison and says nothing about being one.

  production  IDENTIFY_MIN_IMAGES must be ABSENT, comparison must be off, and the
              allow-list must be empty. The floor is the one that matters: production
              accepting a single image would be accepting requests its own UI never makes.

Usage:  curl .../secrets | check_pilot_preflight.py <project_ref> <test|production>
        (test role additionally reads EXPECTED_COMPARISON_USER_ID from the environment)
"""

from __future__ import annotations

import json
import os
import sys

from check_function_secrets import stored_is

TEST_REF = "vgjehmwcpavflbfhbbrp"
PRODUCTION_REF = "vygiamigomwlvnwkryyl"


def main() -> int:
    project = sys.argv[1] if len(sys.argv) > 1 else ""
    role = sys.argv[2] if len(sys.argv) > 2 else ""

    if role == "test" and project != TEST_REF:
        print("::error::role 'test' but project is not the test project.")
        return 1
    if role == "production" and project != PRODUCTION_REF:
        print("::error::role 'production' but project is not the production project.")
        return 1
    if role not in {"test", "production"}:
        print("::error::role must be 'test' or 'production'.")
        return 1

    payload = json.load(sys.stdin)
    if not isinstance(payload, list):
        print("::error::Unexpected response shape from the secrets endpoint.")
        return 1
    values = {
        str(entry.get("name")): str(entry.get("value") or "")
        for entry in payload
        if isinstance(entry, dict)
    }
    present = set(values)

    failures: list[str] = []

    def check(label: str, ok: bool, detail: str) -> None:
        print(f"  [{'PASS' if ok else 'FAIL'}] {label}")
        if not ok:
            failures.append(f"{label} — {detail}")

    print(f"preflight: {project} ({role})")

    if role == "test":
        expected_id = os.environ.get("EXPECTED_COMPARISON_USER_ID", "").strip()
        if not expected_id:
            print("::error::EXPECTED_COMPARISON_USER_ID is not set.")
            return 1

        floor = values.get("IDENTIFY_MIN_IMAGES", "")
        check(
            "IDENTIFY_MIN_IMAGES is exactly 1",
            bool(floor) and stored_is(floor, "1"),
            "the 1-photograph arm needs it; without it every p1 request is a 400",
        )
        check(
            "IDENTIFICATION_COMPARISON is on",
            stored_is(values.get("IDENTIFICATION_COMPARISON", ""), "on"),
            "off means no second provider is ever asked and no comparison row is written",
        )
        # EXACTLY THE ONE ACCOUNT, WHICH IS STRONGER THAN "IS SET".
        #
        # The stored value is a digest of the WHOLE list, so hashing the single expected id
        # and finding a match proves the list is that id AND NOTHING ELSE. A second account
        # — or a trailing comma, or a stray space — changes the digest and fails here. That
        # is the only way to assert "comparison has not been enabled for anybody else" from
        # a value the API will not hand back.
        check(
            "the allow-list holds exactly the one comparison account",
            stored_is(values.get("IDENTIFICATION_COMPARISON_USER_IDS", ""), expected_id),
            "a different or longer list would enrol an account this run did not approve, "
            "and each extra enrolled account doubles a request's cost",
        )
        check(
            "PLANTNET_API_KEY is set",
            "PLANTNET_API_KEY" in present,
            "the selected provider cannot answer",
        )
        check(
            "PLANT_ID_API_KEY is set",
            "PLANT_ID_API_KEY" in present,
            "comparison mode would make no second call and silently record one side only",
        )
    else:
        check(
            "IDENTIFY_MIN_IMAGES is ABSENT",
            "IDENTIFY_MIN_IMAGES" not in present,
            "production must keep the two-photograph minimum; an endpoint accepting one "
            "would accept requests its own UI never makes",
        )
        check(
            "IDENTIFICATION_COMPARISON is not on",
            not stored_is(values.get("IDENTIFICATION_COMPARISON", ""), "on"),
            "real players must never be enrolled in a paid experiment",
        )
        check(
            "the comparison allow-list is empty",
            not values.get("IDENTIFICATION_COMPARISON_USER_IDS", "").strip(),
            "an allow-listed production account would spend paid credits on real scans",
        )

    if failures:
        for line in failures:
            print(f"::error::{project}: {line}")
        print(f"::error::{project}: preflight FAILED. Nothing has been spent.")
        return 1

    print(f"  {project} is in the required state.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
