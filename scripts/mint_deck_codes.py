#!/usr/bin/env python3
"""Mint activation codes for a print run, and emit the SQL that registers their hashes.

    python3 scripts/mint_deck_codes.py --count 50 --print-run 2026-01-initial

Writes two files next to each other and prints nothing secret to the terminal:

    <run>-codes.csv   THE PLAINTEXT CODES. This is the fulfilment file. It is the only
                      copy that exists besides the printed cards, it must never be
                      committed, and it is what gets emailed to a buyer.
    <run>-claims.sql  Hashes only, ready to apply to the database.

WHY THE DATABASE NEVER SEES A CODE. `deck_claims` stores `sha256(normalised code)`, so a
database leak hands nobody a working code. The reverse is also deliberate: there is no way
to recover a code from the database, which is why the CSV matters and why a lost CSV means
re-minting that run rather than looking the codes up.

ENTROPY. Ten random bytes is eighty bits, and eighty bits is exactly sixteen base32
characters with nothing left over. That is the whole reason for the number: an earlier
draft drew sixteen bytes and printed twelve characters, which silently discarded 68 of the
128 bits it had generated and hashed a truncation of a secret rather than the secret. Here
the code IS the entropy. 2^80 is 1.2e24; combined with the rate limit on the redemption
endpoint, enumeration is a load concern rather than a security one.

CROCKFORD BASE32, because a buyer types this off a card by hand. It omits I, L, O and U, so
the two pairs that get misread - 1/I/L and 0/O - cannot both appear, and `normalise()`
folds them on the way in so somebody who types the letter O still redeems successfully. U
is omitted so the alphabet cannot spell an unfortunate word by accident.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import secrets
import sys
from pathlib import Path

ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"  # Crockford: no I, L, O, U
CODE_BYTES = 10       # 80 bits
CODE_CHARS = 16       # 80 / 5, exactly
GROUP = 4             # PLNT-XXXX-XXXX-XXXX-XXXX
PREFIX = "PLNT"


def mint() -> str:
    """One code: 80 random bits rendered as exactly 16 Crockford characters."""
    value = int.from_bytes(secrets.token_bytes(CODE_BYTES), "big")
    chars = [""] * CODE_CHARS
    for i in range(CODE_CHARS - 1, -1, -1):
        chars[i] = ALPHABET[value & 0x1F]
        value >>= 5
    body = "".join(chars)
    groups = [body[i : i + GROUP] for i in range(0, CODE_CHARS, GROUP)]
    return "-".join([PREFIX, *groups])


def normalise(code: str) -> str:
    """The exact string that gets hashed, on both minting and redemption.

    MUST MATCH `normaliseCode` IN `supabase/functions/redeem-deck-code` CHARACTER FOR
    CHARACTER, or a perfectly valid code hashes to something the database has never seen
    and the buyer is told their code is invalid. The folds are what let somebody type the
    letter O for a zero, which they will.
    """
    cleaned = code.strip().upper()
    cleaned = cleaned.replace("-", "").replace(" ", "")
    if cleaned.startswith(PREFIX):
        cleaned = cleaned[len(PREFIX) :]
    return cleaned.replace("I", "1").replace("L", "1").replace("O", "0")


def digest(code: str) -> str:
    return hashlib.sha256(normalise(code).encode("ascii")).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--count", type=int, help="how many decks")
    parser.add_argument("--print-run", help="label, e.g. 2026-01-initial")
    parser.add_argument("--out", default=".", help="directory for the two files")
    parser.add_argument(
        "--verify",
        action="store_true",
        help="self-test the alphabet, length, normalisation and hashing, then exit",
    )
    args = parser.parse_args()

    if args.verify:
        return verify()

    if args.count is None or args.print_run is None:
        print("--count and --print-run are required (or pass --verify)", file=sys.stderr)
        return 2
    if args.count < 1:
        print("--count must be at least 1", file=sys.stderr)
        return 2

    # A collision at 2^80 is not a practical concern, but minting is cheap and a duplicate
    # would mean two decks sharing one activation - a support problem nobody could diagnose.
    codes: list[str] = []
    seen: set[str] = set()
    while len(codes) < args.count:
        code = mint()
        if code in seen:
            continue
        seen.add(code)
        codes.append(code)

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    csv_path = out / f"{args.print_run}-codes.csv"
    sql_path = out / f"{args.print_run}-claims.sql"

    with csv_path.open("w", newline="", encoding="ascii") as handle:
        writer = csv.writer(handle)
        writer.writerow(["code", "print_run", "token_hash"])
        for code in codes:
            writer.writerow([code, args.print_run, digest(code)])

    with sql_path.open("w", encoding="ascii") as handle:
        handle.write(
            f"-- {len(codes)} activation codes for print run {args.print_run}.\n"
            "-- Hashes only: the plaintext lives in the CSV beside this file and on the\n"
            "-- printed cards, and nowhere else. Apply with the service role.\n"
            "insert into public.deck_claims (token_hash, print_run) values\n"
        )
        rows = ",\n".join(f"  ('{digest(c)}', '{args.print_run}')" for c in codes)
        handle.write(rows + "\non conflict (token_hash) do nothing;\n")

    print(f"{len(codes)} codes minted for run {args.print_run}")
    print(f"  fulfilment CSV (SECRET, never commit):  {csv_path}")
    print(f"  hashes to apply:                        {sql_path}")
    print()
    print("Next: apply the SQL with the service role, then keep the CSV somewhere you")
    print("will not lose it. There is no way to recover a code from the database.")
    return 0


def verify() -> int:
    """Self-test, so the generator's own invariants are checkable without minting a run."""
    failures = 0

    def check(condition: bool, label: str) -> None:
        nonlocal failures
        print(("PASS  " if condition else "FAIL  ") + label)
        if not condition:
            failures += 1

    sample = [mint() for _ in range(2000)]

    check(all(len(c) == len(PREFIX) + 1 + CODE_CHARS + 3 for c in sample),
          "every code is PLNT- plus four groups of four")
    check(all(ch in ALPHABET for c in sample for ch in c.replace("-", "")[len(PREFIX):]),
          "every character is in the Crockford alphabet")
    check(not any(ch in "ILOU" for c in sample for ch in c.replace("-", "")[len(PREFIX):]),
          "no I, L, O or U appears in any code")
    check(len(set(sample)) == len(sample), "2000 codes, no duplicate")
    check(len({ch for c in sample for ch in c.replace("-", "")[len(PREFIX):]}) == len(ALPHABET),
          "all 32 symbols occur, so no bit of the draw is being dropped")

    one = sample[0]
    check(len(normalise(one)) == CODE_CHARS, "normalisation yields exactly 16 characters")
    variants = [
        one,
        one.lower(),
        one.replace("-", ""),
        f"  {one}  ",
        normalise(one),
    ]
    check(len({digest(v) for v in variants}) == 1,
          "case, hyphens and surrounding space do not change the hash")

    # The folds, tested on a code that really contains the ambiguous characters.
    check(digest("PLNT-0123-4567-89AB-CDEF") == digest("plnt o123 4567 89ab cdef"),
          "a typed letter O hashes the same as a zero")
    check(digest("1111-1111-1111-1111") == digest("ILIL-1111-1111-1111"),
          "typed I and L fold onto 1")
    check(digest(one) != digest(sample[1]), "different codes hash differently")
    check(len(digest(one)) == 64 and all(c in "0123456789abcdef" for c in digest(one)),
          "the hash matches the CHECK constraint in migration 0008")

    print()
    print("ok" if not failures else f"{failures} failure(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
