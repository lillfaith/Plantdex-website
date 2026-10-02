#!/usr/bin/env python3
"""Verify a pre-release logical backup, and emit the record block for the runbook.

OFFLINE AND READ-ONLY. It opens local files, hashes them and reads their first lines. It
makes no network call, touches no database, and performs NO RESTORE — a destructive restore
test against production is exactly what the release instructions forbid, and a restore into a
scratch database is a separate exercise this script deliberately does not pretend to be.

WHAT "VERIFIED" MEANS HERE, AND WHAT IT DOES NOT. It establishes that each file exists, is
non-empty, and carries the structure its kind of dump must carry — roles declare roles, a
schema dump declares schema objects, a data dump carries COPY blocks. That is enough to show
the dump RAN and produced something of the right shape. It cannot show the dump is COMPLETE:
only a restore into a scratch database can, and that is a decision for a human with somewhere
safe to restore into.

Usage:  python3 scripts/verify_backup.py <directory>
"""

from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path

# What each dump must contain to be structurally plausible. One pattern per kind, chosen to
# be something pg_dump cannot omit for a non-empty result of that kind.
EXPECTED: dict[str, tuple[re.Pattern[str], str]] = {
    "roles.sql": (re.compile(r"^\s*CREATE ROLE\b", re.I | re.M), "at least one CREATE ROLE"),
    "schema.sql": (
        re.compile(r"^\s*(CREATE (TABLE|SCHEMA|TYPE|FUNCTION)|ALTER TABLE)\b", re.I | re.M),
        "at least one CREATE/ALTER object",
    ),
    "data.sql": (re.compile(r"^\s*COPY\b", re.I | re.M), "at least one COPY block"),
}


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: verify_backup.py <directory containing roles.sql schema.sql data.sql>")
        return 2
    root = Path(sys.argv[1])
    if not root.is_dir():
        print(f"::error::{root} is not a directory")
        return 2

    print(f"Verifying logical backup in {root.resolve()}\n")
    rows: list[tuple[str, int, str]] = []
    problems: list[str] = []

    for name, (pattern, description) in EXPECTED.items():
        path = root / name
        if not path.is_file():
            problems.append(f"{name}: MISSING")
            continue
        blob = path.read_bytes()
        size = len(blob)
        digest = hashlib.sha256(blob).hexdigest()
        rows.append((name, size, digest))

        if size == 0:
            problems.append(f"{name}: EMPTY")
            continue
        try:
            text = blob.decode("utf-8", errors="replace")
        except Exception as error:  # noqa: BLE001
            problems.append(f"{name}: not readable as text ({error})")
            continue
        if not pattern.search(text):
            problems.append(f"{name}: no {description} — the dump may have failed silently")
        # A dump that errored can still exit 0 with the error text inside the file.
        if re.search(r"^pg_dump: error|^pg_dumpall: error", text, re.I | re.M):
            problems.append(f"{name}: contains a pg_dump error line")

    # Anything else in the directory is reported but not judged — a migration-history dump or
    # a notes file is legitimate and this script has no opinion about its shape.
    extra = sorted(
        p for p in root.iterdir() if p.is_file() and p.name not in EXPECTED
    )
    for path in extra:
        blob = path.read_bytes()
        rows.append((path.name, len(blob), hashlib.sha256(blob).hexdigest()))
        if len(blob) == 0:
            problems.append(f"{path.name}: EMPTY")

    print(f"{'file':<28} {'bytes':>12}  sha256")
    for name, size, digest in rows:
        print(f"{name:<28} {size:>12}  {digest}")

    print()
    if problems:
        for problem in problems:
            print(f"::error::{problem}")
        print(f"\n{len(problems)} problem(s). The backup is NOT verified.")
        return 1

    print("Every artifact is present, non-empty and structurally plausible.")
    print("NOT PROVEN: completeness. Only a restore into a scratch database shows that.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
