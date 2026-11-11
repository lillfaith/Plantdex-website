#!/usr/bin/env python3
"""Find retrievable literature for a species, as CANDIDATES for a human to check.

WHAT THIS IS AND IS NOT. It queries Europe PMC — free, keyless, covering PubMed, PMC,
preprints and agricola — and prints real, resolvable references: title, journal, year, and
an identifier somebody can paste into a browser. That is the whole job.

────────────────────────────────────────────────────────────────────────────────
IT PRODUCES CANDIDATES. IT CANNOT PRODUCE A SOURCE.

`src/data/sources.json` renders only entries with `verified: true`, and verified means A
HUMAN OPENED IT and confirmed it supports the claim it is attached to. Nothing this script
emits is verified, and it writes to neither that file nor the database. Its output belongs
in `docs/source-candidates.md`, which exists precisely so found-but-unchecked references
have somewhere to live that is not a citation.

A SEARCH HIT IS NOT EVIDENCE OF ANYTHING. A paper can match "Lamium purpureum" by naming it
once in a species list, or be about a different genus entirely, or be a study that found no
effect — the title alone cannot tell you which. The counts this prints measure what is
RETRIEVABLE, not what is supported, and reading them as support is the exact failure the
`verified` flag exists to prevent.
────────────────────────────────────────────────────────────────────────────────

WHY MEDICINAL RELEVANCE IS A LOWER BAR THAN EFFICACY, and why that matters here. Eligibility
asks only whether a species has documented medicinal USE — traditional, historical or
studied. An ethnobotanical survey recording that people used a plant is sufficient for that
and says nothing about whether it worked. The two query groups below are kept separate so a
reviewer can see which kind of hit they are looking at.

api.ebi.ac.uk is blocked from the sandbox this repo is edited in, so this runs in Actions
like `ga_occurrence.py` and `resolve_taxa.py`. Free, keyless, spends nothing.

    python3 scripts/literature_candidates.py "Lamium purpureum"
    python3 scripts/literature_candidates.py --self-test
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

SEARCH = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
UA = "plantdex-literature-candidates (https://github.com/lillfaith/Plantdex-website)"

# Two groups, deliberately not merged. The first establishes DOCUMENTED USE, which is what
# eligibility needs; the second is pharmacology, which is a different and stronger claim.
USE_TERMS = ["ethnobotan*", "traditional medicine", "folk medicine", "medicinal plant",
             "medicinal use", "herbal remedy"]
STUDY_TERMS = ["phytochemical", "antioxidant", "antimicrobial", "anti-inflammatory",
               "extract", "essential oil", "bioactiv*"]


def query(expression: str, page_size: int = 25) -> list[dict]:
    params = {"query": expression, "format": "json", "pageSize": page_size,
              "resultType": "core"}
    url = f"{SEARCH}?{urllib.parse.urlencode(params)}"
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.load(response).get("resultList", {}).get("result", [])
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            if attempt == 2:
                raise RuntimeError(f"Europe PMC unreachable: {error}") from error
            time.sleep(2 ** attempt)
    return []


def identifier(row: dict) -> str:
    if row.get("pmcid"):
        return f"https://europepmc.org/article/PMC/{row['pmcid']}"
    if row.get("pmid"):
        return f"https://pubmed.ncbi.nlm.nih.gov/{row['pmid']}/"
    if row.get("doi"):
        return f"https://doi.org/{row['doi']}"
    return "(no resolvable identifier)"


def suggested_id(row: dict) -> str:
    """The id this would take in `catalog_sources`, if a human verifies it."""
    if row.get("pmcid"):
        return f"pmc-{str(row['pmcid']).lower().removeprefix('pmc')}"
    if row.get("pmid"):
        return f"pmid-{row['pmid']}"
    return "(assign by hand)"


def survey(species: str) -> dict:
    groups = {}
    for label, terms in (("documented use", USE_TERMS), ("laboratory study", STUDY_TERMS)):
        joined = " OR ".join(f'"{t}"' if " " in t else t for t in terms)
        rows = query(f'"{species}" AND ({joined})')
        seen, kept = set(), []
        for row in rows:
            key = row.get("pmcid") or row.get("pmid") or row.get("doi") or row.get("title")
            if key in seen:
                continue
            seen.add(key)
            kept.append(row)
        groups[label] = kept
        time.sleep(0.5)
    return groups


def report(species: str, groups: dict) -> None:
    print(f"\n{'=' * 78}\n{species}\n{'=' * 78}")
    for label, rows in groups.items():
        print(f"\n--- {label}: {len(rows)} retrievable hit(s) ---")
        if not rows:
            print("    (none)")
        for row in rows[:12]:
            year = row.get("pubYear", "?")
            journal = (row.get("journalInfo", {}) or {}).get("journal", {}).get("title", "")
            oa = "open access" if row.get("isOpenAccess") == "Y" else "paywalled"
            print(f"  [{suggested_id(row)}] {year}  {oa}")
            print(f"      {str(row.get('title',''))[:150]}")
            print(f"      {journal[:70]}")
            print(f"      {identifier(row)}")
    print("\n  NONE OF THESE IS A SOURCE YET. Open each one, confirm it is about THIS")
    print("  species and that it documents medicinal use, then add it to sources.json")
    print("  with verified: true and your name. A hit is retrievability, not support.")


def self_test() -> int:
    checks = [
        (suggested_id({"pmcid": "PMC1234567"}) == "pmc-1234567", "pmcid -> source id"),
        (suggested_id({"pmid": "999"}) == "pmid-999", "pmid -> source id"),
        (identifier({"doi": "10.1/x"}).startswith("https://doi.org/"), "doi -> url"),
        (identifier({}) == "(no resolvable identifier)", "no identifier is said plainly"),
        (len(USE_TERMS) >= 4 and len(STUDY_TERMS) >= 4, "both query groups are populated"),
    ]
    bad = sum(1 for ok, _ in checks if not ok)
    for ok, label in checks:
        print(f"{'PASS' if ok else 'FAIL'}  {label}")
    print("\nALL SELF-TESTS PASSED" if not bad else f"\n{bad} FAILURE(S)")
    return 1 if bad else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("species", nargs="*")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    names = args.species or []
    if not names:
        print("name at least one species", file=sys.stderr)
        return 2
    for name in names:
        report(name, survey(name))
    return 0


if __name__ == "__main__":
    sys.exit(main())
