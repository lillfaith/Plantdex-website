#!/usr/bin/env python3
"""
Resolve plant names against GBIF's backbone taxonomy, from somewhere with internet.

WHY IT IS A WORKFLOW AND NOT A LOCAL SCRIPT. `ACCEPTED_NAME_SYNONYMS` in plant-match.ts
carries claims of the form "these two names denote the same plant". That is exactly the kind
of statement AGENTS.md forbids inventing, so each entry needs a checked source — and
powo.science.kew.org, api.gbif.org and every other nomenclatural authority are blocked from
the sandbox this repo is usually edited in. A search engine's summary of a POWO page is not
a primary source; it is a small model paraphrasing one.

A runner can reach GBIF directly, so the question gets answered by the authority's own API
with the answer in the log, rather than from anybody's recollection.

WHAT COUNTS AS A PASS. GBIF must report the queried name as a SYNONYM whose accepted name is
the species the deck card prints. Anything else — ACCEPTED (a distinct species), DOUBTFUL,
a fuzzy match, or a different accepted name — is a refusal, and the mapping does not get
added. `Viola riviniana` and `Mentha arvensis` are the cases that must keep failing: they
are real species of their own, and turning them into synonyms to make a scan feel better
would write something untrue into a player's collection.

Pairs come from argv, or from the PAIRS environment variable separated by semicolons or
newlines. The env form exists so a workflow never has to quote a binomial through YAML and
then through a shell, which is where this sort of tool usually breaks.

Usage:  python3 scripts/check_synonyms.py "Viola papilionacea=Viola sororia" ...
        PAIRS="A=B; C=D" python3 scripts/check_synonyms.py
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.parse
import urllib.request

API = "https://api.gbif.org/v1/species/match"


def resolve(name: str) -> dict:
    url = f"{API}?{urllib.parse.urlencode({'name': name, 'strict': 'false'})}"
    request = urllib.request.Request(url, headers={"User-Agent": "plantdex-nomenclature-check"})
    with urllib.request.urlopen(request, timeout=45) as response:
        return json.load(response)


def read_pairs() -> list[list[str]]:
    raw = sys.argv[1:]
    if not raw:
        env = os.environ.get("PAIRS", "")
        raw = [part for part in re.split(r"[;\n]", env) if part.strip()]
    return [item.split("=", 1) for item in raw if "=" in item]


def main() -> int:
    pairs = read_pairs()
    if not pairs:
        print('usage: check_synonyms.py "Queried name=Expected accepted name" ...')
        return 2

    verdicts = []
    for queried, expected in pairs:
        queried, expected = queried.strip(), expected.strip()
        try:
            data = resolve(queried)
        except Exception as error:  # noqa: BLE001 — an unreachable authority is a refusal
            print(f"UNRESOLVED  {queried}: could not reach GBIF ({error})")
            verdicts.append(False)
            continue

        status = data.get("status", "?")
        match_type = data.get("matchType", "?")
        # For a synonym GBIF returns the queried name in `scientificName` and the accepted
        # one in `species` / `acceptedUsageKey`; canonicalName is the parsed binomial.
        accepted = data.get("species") or data.get("canonicalName") or ""
        confidence = data.get("confidence", 0)

        agrees = (
            status == "SYNONYM"
            and match_type == "EXACT"
            and accepted.strip().lower() == expected.lower()
        )
        verdicts.append(agrees)

        print(
            f"{'SYNONYM OK ' if agrees else 'REFUSED    '} {queried}\n"
            f"            status={status} matchType={match_type} confidence={confidence}\n"
            f"            GBIF accepted name: {accepted or '(none)'}\n"
            f"            deck card prints:   {expected}"
        )
        if not agrees and status == "ACCEPTED":
            print("            -> GBIF treats this as a species in its own right. Do NOT map it.")
        print()

    ok = sum(verdicts)
    print(f"{ok} of {len(verdicts)} names verified as synonyms of the deck's own species.")
    # Not a failure: a refusal is a real answer and the useful half of this tool.
    return 0


if __name__ == "__main__":
    sys.exit(main())
