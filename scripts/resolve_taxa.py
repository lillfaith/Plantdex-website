#!/usr/bin/env python3
"""Resolve plant names against GBIF's backbone and say what each one CURRENTLY is.

WHY THIS EXISTS BESIDE `check_synonyms.py`. That script answers a yes/no question — "is A a
synonym of B" — and is the right tool when you already have the pair. The genus-card safety
audit asks the OPEN question: given a historical combination somebody's identifier might
return, what is this name today, and WHICH GENUS does its accepted name sit in? That last
part is what decides everything, because `genusOf()` is what sends a name to a `Genus spp.`
card. `Rhus vernix` is the model case: if its accepted name is a *Toxicodendron*, then the
Sumac card is reachable by a name for poison sumac.

IT RUNS IN CI FOR THE SAME REASON `check_synonyms.py` DOES. api.gbif.org is blocked from the
sandbox this repo is edited in — measured, not assumed: `CONNECT tunnel failed, response 403`.
A search engine's summary of a POWO page is a small model paraphrasing one, not a source.

IT DECIDES NOTHING. It prints GBIF's answer and a human reads it. In particular it cannot
say whether a card's medicinal, edibility or safety content generalises to a species — no
taxonomic backbone can, and that half of the evidence bar is literature work.

Usage:  NAMES="Rhus vernix; Rhus radicans" python3 scripts/resolve_taxa.py
        python3 scripts/resolve_taxa.py "Rhus vernix" "Pinus abies"
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.parse
import urllib.request

MATCH = "https://api.gbif.org/v1/species/match"
USAGE = "https://api.gbif.org/v1/species"
UA = "plantdex-nomenclature-check (https://github.com/lillfaith/Plantdex-website)"


def resolve(name: str) -> dict:
    url = f"{MATCH}?{urllib.parse.urlencode({'name': name, 'strict': 'false'})}"
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=45) as response:
        return json.load(response)


def accepted_for(answer: dict) -> str:
    """The ACCEPTED name behind a synonym match, fetched rather than assumed.

    THE BUG THIS FIXES. `/species/match` returns `scientificName` as the name it matched,
    which for a `status: SYNONYM` row is the SYNONYM — so the table printed the queried name
    straight back under a column headed ACCEPTED NAME. For `Stellaria pallida` and
    `Oxalis europaea` that is the one cell the whole question turns on: a synonym of the
    card's anchor is an `unlockBasis: 'synonym'` and needs no equivalence argument at all,
    while a synonym of some THIRD species is a different plant entirely. Printing the input
    back as though it were the output is worse than printing nothing.
    """
    key = answer.get("acceptedUsageKey") or answer.get("acceptedKey")
    if not key:
        return ""
    try:
        request = urllib.request.Request(f"{USAGE}/{key}", headers={"User-Agent": UA})
        with urllib.request.urlopen(request, timeout=45) as response:
            usage = json.load(response)
    except Exception:  # noqa: BLE001
        return ""
    return usage.get("scientificName") or usage.get("canonicalName") or ""


def read_names() -> list[str]:
    raw = sys.argv[1:]
    if not raw:
        raw = re.split(r"[;\n]", os.environ.get("NAMES", ""))
    return [one.strip() for one in raw if one.strip()]


def main() -> int:
    names = read_names()
    if not names:
        print('usage: NAMES="Rhus vernix; Pinus abies" python3 scripts/resolve_taxa.py')
        return 2

    print(f"{len(names)} name(s) against the GBIF backbone\n")
    print(
        f"{'QUERIED':<30} {'STATUS':<10} {'SYN':<4} {'RANK':<9} "
        f"{'ACCEPTED NAME':<36} {'GENUS':<18} {'FAMILY':<16} MATCH/CONF"
    )
    print("-" * 150)

    moved = []
    for name in names:
        try:
            answer = resolve(name)
        except Exception as error:  # noqa: BLE001
            print(f"{name:<30} ERROR {error}")
            continue

        status = answer.get("status", "?")
        synonym = answer.get("synonym", False)
        rank = (answer.get("rank") or "?").lower()
        accepted = answer.get("scientificName") or answer.get("canonicalName") or "?"
        genus = answer.get("genus") or "?"
        family = answer.get("family") or "?"
        match_type = answer.get("matchType", "?")
        confidence = answer.get("confidence", "?")
        if status == "SYNONYM":
            real = accepted_for(answer)
            accepted = f"-> {real}" if real else f"{accepted} (accepted name NOT RESOLVED)"
        print(
            f"{name:<30} {status:<10} {'yes' if synonym else 'no':<4} {rank:<9} "
            f"{accepted:<36} {genus:<18} {family:<16} {match_type}/{confidence}"
        )

        # THE LINE THAT MATTERS FOR A GENUS CARD. `genusOf()` keys a `Genus spp.` card off the
        # FIRST WORD OF THE NAME AS RETURNED — so a name whose accepted placement has moved to
        # another genus still reaches the old genus's card. Flagged separately because it is
        # invisible in a table somebody is skimming.
        queried_genus = name.split()[0].lower()
        if genus != "?" and genus.lower() != queried_genus:
            moved.append((name, genus, accepted))

    if moved:
        print(
            "\nNAMES WHOSE ACCEPTED PLACEMENT IS IN A DIFFERENT GENUS FROM THE ONE QUERIED.\n"
            "A `Genus spp.` card is keyed off the name AS RETURNED, so each of these still\n"
            "reaches the card of the genus it was queried under:"
        )
        for name, genus, accepted in moved:
            print(f"  {name}  ->  {accepted}   (genus {genus})")
    else:
        print("\nNo queried name resolves into a different genus.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
