#!/usr/bin/env python3
"""Cross-reference the whole Plantdex catalogue against Georgia's own invasive-plant lists.

WHY THIS RUNS IN CI. The sandbox this repo is developed in cannot reach se-eppc.org,
bugwoodcloud.org, invasive.org or gainvasivespeciescouncil.org — the egress proxy refuses the
tunnel — so the authoritative lists are not readable from a session. Same reason
`resolve_taxa.py` exists for GBIF. A search engine's SUMMARY of a list is not the list, and a
badge that tells somebody a plant is invasive in their state needs the primary document.

WHAT IT DOES NOT DO. It does not write the badge data. It prints what the sources say, and a
human reads that and curates `src/lib/invasive-status.ts` by hand, with the category and the
source recorded per entry — the same discipline as `taxon-placements.ts`. A scraper that fed
the UI directly would put whatever a PDF layout change produced in front of a forager.

IT SEARCHES FOR EVERY CATALOGUE NAME, not a shortlist, because "which of our plants are on
this list" is the only question that cannot be answered by guessing which ones to check. Genus
cards are expanded: the card says `Rosa spp.`, and what matters is whether ANY Rosa on the
list is one a player could be holding the card for.
"""

from __future__ import annotations

import io
import json
import re
import sys
import urllib.error
import urllib.request

# The published Georgia lists, newest first. GA-EPPC transitioned into the Georgia Invasive
# Species Council (GISC), so GISC is the current body and the 2006 GA-EPPC list is the
# canonical categorised document it inherited. Both are read; disagreement is reported rather
# than resolved here.
SOURCES: list[tuple[str, str]] = [
    ("GISC — Georgia Invasive Species Council, invasive plants",
     "https://gainvasivespeciescouncil.org/list/invasive-plants/"),
    ("GA-EPPC list (Wildland Weeds, Fall 2006)",
     "https://www.se-eppc.org/wildlandweeds/pdf/fall2006-gaexoticslist-pp15-18.pdf"),
    ("GA-EPPC list (Bugwood curriculum copy)",
     "https://bugwoodcloud.org/gaeppc/assets/File/Curriculum/gaeppclist.pdf"),
    ("Georgia DNR — Georgia Invasive Species Strategy",
     "https://georgiawildlife.com/sites/default/files/wrd/pdf/management/GeorgiaInvasiveSpeciesStrategy.pdf"),
]

AGENT = {"User-Agent": "plantdex-invasive-audit (one-off audit; contact via repo)"}


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers=AGENT)
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def to_text(url: str, raw: bytes) -> str:
    if url.lower().endswith(".pdf") or raw[:4] == b"%PDF":
        try:
            from pypdf import PdfReader
        except ImportError:
            print("    pypdf missing; cannot read PDF", file=sys.stderr)
            return ""
        reader = PdfReader(io.BytesIO(raw))
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    text = raw.decode("utf-8", "replace")
    text = re.sub(r"<script.*?</script>|<style.*?</style>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    return text


def catalogue() -> list[tuple[str, str, str]]:
    """(card id, scientific name, common name) for all 54 cards, genus cards included."""
    deck = json.load(open("src/data/herbs.json"))["herbs"]
    rows = [(h["id"], h["scientificName"], h["commonName"]) for h in deck]
    # The nine Field Cards live in TypeScript, so they are read out of the source rather than
    # imported. Three regexes over one file beats a build step for a one-off audit.
    src = open("src/lib/field-cards.ts").read()
    ids = re.findall(r"^\s*id: '([a-z-]+)',", src, re.M)
    commons = re.findall(r"^\s*commonName: '([^']+)',", src, re.M)
    sciences = re.findall(r"^\s*scientificName: '([^']+)',", src, re.M)
    if len(ids) == len(commons) == len(sciences):
        rows += list(zip(ids, sciences, commons))
    else:
        print(f"::warning::field-cards parse mismatch "
              f"({len(ids)} ids / {len(sciences)} names / {len(commons)} commons)")
    return rows


def main() -> int:
    rows = catalogue()
    print("=" * 78)
    print(f"GEORGIA INVASIVE-STATUS AUDIT — {len(rows)} catalogue cards")
    print("=" * 78)

    documents: list[tuple[str, str]] = []
    for label, url in SOURCES:
        print(f"\nFetching: {label}\n  {url}")
        try:
            text = to_text(url, fetch(url))
        except urllib.error.HTTPError as error:
            print(f"  ::warning::HTTP {error.code}")
            continue
        except Exception as error:  # noqa: BLE001 — an unreachable source is a reportable fact
            print(f"  ::warning::{type(error).__name__}: {error}")
            continue
        print(f"  {len(text):,} characters of text")
        if text.strip():
            documents.append((label, text))

    if not documents:
        print("\n::error::No source was readable. Nothing can be concluded.")
        return 1

    print("\n" + "=" * 78)
    print("PER-CARD HITS. A hit is the binomial appearing in a source, with the surrounding")
    print("line printed so the CATEGORY can be read rather than inferred.")
    print("=" * 78)

    for card_id, science, common in rows:
        genus = science.split()[0]
        is_genus_card = science.endswith("spp.")
        # A species card looks for its own binomial. A genus card looks for every binomial of
        # that genus in the document, because the card's scope is the genus.
        pattern = (re.compile(rf"\b{re.escape(genus)}\s+[a-z][a-z-]+\b")
                   if is_genus_card else re.compile(rf"\b{re.escape(science)}\b", re.I))
        found: dict[str, set[str]] = {}
        for label, text in documents:
            for match in pattern.finditer(text):
                start = text.rfind("\n", 0, match.start()) + 1
                end = text.find("\n", match.end())
                line = " ".join(text[start:end if end != -1 else len(text)].split())[:150]
                found.setdefault(match.group(0), set()).add(f"{label}: {line}")
        if not found:
            continue
        print(f"\n── {card_id}  ({science} — {common}){'   [GENUS CARD]' if is_genus_card else ''}")
        for name in sorted(found):
            print(f"   • {name}")
            for line in sorted(found[name]):
                print(f"       {line}")

    print("\n" + "=" * 78)
    print("Cards with NO hit in any source are absent from the printout above, which is the")
    print("intended reading: no evidence found, therefore no badge.")
    print("=" * 78)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
