#!/usr/bin/env python3
"""Which number does a generated card get? The next one, and only once it has earned it.

THE SEQUENCE IS READ FROM THE DATABASE, NEVER TYPED IN:
    01-45  the printed species cards            src/data/herbs.json
    46     the Icon Cheat Sheet                 printed, not a species
    47     the Disclaimer                       printed, not a species
    48-56  the nine XP Field Cards              src/lib/field-cards.ts
    57     the first generated card             <- this module

A NUMBER IS ASSIGNED AT APPROVAL, NOT AT GENERATION, and that is the whole reason this is a
module rather than a counter. A run that fails -- bad photograph, refused segmentation,
rejected art -- must leave no hole in the sequence, and the only way to guarantee that is
to hand out the number when the card is finished rather than when the attempt starts. So
`assign()` refuses any species that does not already carry a `card_approved` verdict.

NOTHING HERE CAN RENUMBER ANYTHING. The printed cards and the Field Cards are read as
TAKEN and are never written; a buyer's card number is on an object in their hands, and the
Field Card numbers are on their artwork. The only file this writes is its own ledger.

    python3 scripts/card_numbers.py --status
    python3 scripts/card_numbers.py --assign matricaria_chamomilla
"""
from __future__ import annotations

import argparse, datetime as dt, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import decisions                                      # noqa: E402

LEDGER = ROOT / "evidence" / "card-numbers.json"
HERBS = ROOT / "src" / "data" / "herbs.json"
FIELD = ROOT / "src" / "lib" / "field-cards.ts"
# 46 and 47 are printed cards that are not species -- the Icon Cheat Sheet and the
# Disclaimer. They hold numbers and appear in neither source above, so they are named here
# rather than left as a gap something could later be assigned into.
NON_SPECIES_PRINTED = {46: "Icon Cheat Sheet", 47: "Disclaimer"}


def existing() -> dict[int, str]:
    """Every number already spoken for, and what holds it."""
    taken: dict[int, str] = dict(NON_SPECIES_PRINTED)
    for h in json.loads(HERBS.read_text())["herbs"]:
        m = re.search(r"\d+", str(h.get("cardNumber", "")))
        if m:
            taken[int(m.group())] = h["id"]
    src = FIELD.read_text()
    for num, ident in zip(re.findall(r"cardNumber: (\d+)", src),
                          re.findall(r"id: '([a-z0-9-]+)'", src)):
        taken[int(num)] = ident
    return taken


def ledger() -> dict:
    if LEDGER.exists():
        return json.loads(LEDGER.read_text())
    return {"_what": "Card numbers assigned to GENERATED cards. Printed cards and Field "
                     "Cards are read from the catalogue and are never written here.",
            "version": 1, "assigned": {}}


def assigned_numbers(doc: dict) -> dict[int, str]:
    return {int(v["card_number"]): k for k, v in doc["assigned"].items()}


def next_available() -> int:
    doc = ledger()
    taken = set(existing()) | set(assigned_numbers(doc))
    return max(taken) + 1


def assign(species: str, force_reason: str | None = None) -> tuple[bool, str]:
    doc = ledger()
    if species in doc["assigned"]:
        n = doc["assigned"][species]["card_number"]
        return False, f"{species}: already #{n}; a number is never reassigned"

    approved = [pid for pid, v in decisions.current().items()
                if v.get("species") == species
                and v.get("decision") in decisions.CARD_APPROVALS]
    if not approved and not force_reason:
        return False, (f"{species}: no card_approved verdict, so no number is issued. "
                       f"Numbers are handed out at APPROVAL so a failed run leaves no gap.")

    n = next_available()
    doc["assigned"][species] = {
        "card_number": n,
        "photo_id": approved[0] if approved else None,
        "assigned_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "basis": force_reason or "card_approved verdict in the decision ledger",
    }
    LEDGER.write_text(json.dumps(doc, indent=2, sort_keys=True) + "\n")
    return True, f"{species}: assigned #{n}"


def status() -> int:
    taken = existing()
    doc = ledger()
    mine = assigned_numbers(doc)
    lo, hi = min(taken), max(taken)
    print(f"catalogue holds {len(taken)} numbers, {lo}-{hi}")
    print(f"   01-45  printed species      ({sum(1 for n in taken if n <= 45)} found)")
    for n, what in sorted(NON_SPECIES_PRINTED.items()):
        print(f"   {n}     {what}")
    xp = sorted(n for n in taken if n >= 48)
    print(f"   {xp[0]}-{xp[-1]}  XP Field Cards       ({len(xp)} found)")
    gaps = sorted(set(range(lo, hi + 1)) - set(taken))
    print(f"   gaps in the existing sequence: {gaps or 'none'}")
    print(f"\ngenerated cards assigned: {len(mine) or 'none'}")
    for n, sp in sorted(mine.items()):
        print(f"   #{n}  {sp}")
    print(f"\nNEXT AVAILABLE: #{next_available()}")
    return 0


def self_test() -> int:
    taken = existing()
    doc = ledger()
    mine = assigned_numbers(doc)
    checks = [
        (len(taken) >= 56, "the catalogue's numbers are read, not assumed"),
        (max(taken) >= 56, "the XP Field Cards are included in the high-water mark"),
        (not (set(taken) & set(mine)),
         "CONTROL: no generated card collides with a printed or XP card"),
        (next_available() > max(taken),
         "the next number is above everything already taken"),
        (46 in taken and 47 in taken,
         "CONTROL: the Icon Sheet and Disclaimer hold their numbers and cannot be reused"),
        (len(mine) == len(doc["assigned"]),
         "CONTROL: no two generated cards share a number"),
    ]
    # CONTROL: a species with no card_approved verdict gets nothing, because a number
    # issued at generation time becomes a gap the moment a run fails.
    ok, msg = assign("plantago_major")
    checks.append((not ok and "no card_approved" in msg,
                   "CONTROL: an unapproved species is refused a number"))
    good = True
    for c, label in checks:
        print(("PASS  " if c else "FAIL  ") + label)
        good &= bool(c)
    print("\n" + ("ALL SELF-TESTS PASSED" if good else "SELF-TESTS FAILED"))
    return 0 if good else 1


def main() -> int:
    a = argparse.ArgumentParser(description=__doc__)
    a.add_argument("--status", action="store_true")
    a.add_argument("--assign", metavar="SPECIES")
    a.add_argument("--self-test", action="store_true")
    args = a.parse_args()
    if args.self_test:
        return self_test()
    if args.assign:
        ok, msg = assign(args.assign)
        print(msg)
        return 0 if ok else 1
    return status()


if __name__ == "__main__":
    sys.exit(main())
