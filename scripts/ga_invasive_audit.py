#!/usr/bin/env python3
"""Cross-reference the whole Plantdex catalogue against Georgia's CURRENT invasive-plant list.

WHY THIS RUNS IN CI. The sandbox this repo is developed in cannot reach
gainvasivespeciescouncil.org, se-eppc.org, bugwoodcloud.org, invasive.org or georgiawildlife.com
— the egress proxy refuses the tunnel — so the authoritative lists are not readable from a
session. Same reason `resolve_taxa.py` exists for GBIF. A search engine's SUMMARY of a list is
not the list, and a badge that tells a forager a plant is invasive in their state needs the
primary document.

TWO VOCABULARIES ARE LIVE AT ONCE, AND THAT IS THE POINT OF THIS SCRIPT.
GISC has adopted the RIPSA protocol — Priority 1 / Priority 2 / Watchlist — but its published
plant list is mid-transition, and its own page says most species still carry the categories
they were given under the older GA-EPPC system (Category 1 / 1 Alert / 2 / 3 / 4). So a given
species may be described in EITHER vocabulary, and which one is not predictable from the
species. This script therefore does not normalise: it captures whichever status token sits
nearest each match, in the authority's own words, and says which vocabulary that token came
from. Translating RIPSA back into category numbers — or forward — would be inventing a
classification the authority did not publish.

WHAT IT DOES NOT DO. It does not write the badge data. It prints what the sources say, and a
human reads that and curates `src/lib/invasive-status.ts` by hand. A scraper feeding the UI
would put whatever a page re-layout produced in front of a forager.

IT SEARCHES FOR EVERY CATALOGUE NAME, not a shortlist, because "which of our plants are on this
list" is the one question guessing cannot answer. Genus cards are expanded: the card says
`Rosa spp.`, so what matters is whether ANY Rosa on the list is one a player could be holding
that card for.
"""

from __future__ import annotations

import io
import json
import re
import sys
import urllib.error
import urllib.request

# Several candidate URLs per source: a list that has moved is a fact this run should REPORT
# rather than something that makes it silently find nothing. Every one is fetched and its
# outcome printed.
SOURCES: list[tuple[str, str]] = [
    ("GISC — invasive plants (current list page)",
     "https://gainvasivespeciescouncil.org/list/invasive-plants/"),
    ("GISC — species list index",
     "https://gainvasivespeciescouncil.org/list/"),
    ("GISC — site root (in case the list moved)",
     "https://gainvasivespeciescouncil.org/"),
    ("GA-EPPC categorised list (Bugwood curriculum copy)",
     "https://bugwoodcloud.org/gaeppc/assets/File/Curriculum/gaeppclist.pdf"),
    ("GA-EPPC list (Wildland Weeds, Fall 2006)",
     "https://www.se-eppc.org/wildlandweeds/pdf/fall2006-gaexoticslist-pp15-18.pdf"),
    ("Georgia DNR — Georgia Invasive Species Strategy",
     "https://georgiawildlife.com/sites/default/files/wrd/pdf/management/GeorgiaInvasiveSpeciesStrategy.pdf"),
]

AGENT = {"User-Agent": "plantdex-invasive-audit (one-off audit; contact via repo)"}

# Both vocabularies, each labelled with which protocol it belongs to. Order matters only for
# reporting; a line may legitimately carry one, both or neither.
STATUS_TOKENS: list[tuple[str, str]] = [
    ("RIPSA", r"Priority\s*1\b"),
    ("RIPSA", r"Priority\s*2\b"),
    ("RIPSA", r"Watch\s*-?\s*list\b"),
    ("GA-EPPC", r"Category\s*1\s*Alert\b"),
    ("GA-EPPC", r"Category\s*1\b"),
    ("GA-EPPC", r"Category\s*2\b"),
    ("GA-EPPC", r"Category\s*3\b"),
    ("GA-EPPC", r"Category\s*4\b"),
]


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
    # Keep block boundaries as newlines so "the line around a match" stays meaningful on HTML.
    text = re.sub(r"</(p|div|li|tr|h[1-6]|td|th)>", "\n", text, flags=re.I)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = text.replace("&nbsp;", " ").replace("&amp;", "&")
    return text


def catalogue() -> list[tuple[str, str, str]]:
    """(card id, scientific name, common name) for all 54 cards, genus cards included."""
    deck = json.load(open("src/data/herbs.json"))["herbs"]
    rows = [(h["id"], h["scientificName"], h["commonName"]) for h in deck]
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


def status_headings(text: str) -> list[tuple[int, str]]:
    """Every status token in a document, with its offset, in document order.

    THESE LISTS ARE SECTIONED, NOT LABELLED PER ROW, and the first version of this script got
    that wrong. The GA-EPPC PDF carries only five "Category 1" tokens across 10,638 characters
    — one heading, then the forty-odd species that fall under it. So looking for a status token
    NEAR a species finds one only when the species happens to sit next to a heading, and
    reports "none" for everything in the middle of a section. That is how the draft ended up
    with no category for `Lonicera japonica` while asserting one for it from a search summary.
    """
    found: list[tuple[int, str]] = []
    for protocol, pattern in STATUS_TOKENS:
        for match in re.finditer(pattern, text, re.I):
            found.append((match.start(), f"{protocol}: {' '.join(match.group(0).split())}"))
    return sorted(found)


def governing_status(headings: list[tuple[int, str]], position: int) -> str:
    """The status heading a species falls under: the last one BEFORE it.

    `Category 1 Alert` and `Category 1` both match at the same offset, so the longer, more
    specific token wins at equal position — otherwise every Alert species reads as Category 1.
    """
    candidates = [(offset, label) for offset, label in headings if offset <= position]
    if not candidates:
        return "NO HEADING BEFORE THIS POINT"
    last = max(offset for offset, _ in candidates)
    at_last = [label for offset, label in candidates if offset == last]
    return max(at_last, key=len)


def main() -> int:
    rows = catalogue()
    print("=" * 78)
    print(f"GEORGIA INVASIVE-STATUS AUDIT — {len(rows)} catalogue cards")
    print("Captures BOTH vocabularies: RIPSA (Priority 1/2, Watchlist) and the older")
    print("GA-EPPC categories. Nothing is translated between them.")
    print("=" * 78)

    documents: list[tuple[str, str]] = []
    for label, url in SOURCES:
        print(f"\nFetching: {label}\n  {url}")
        try:
            text = to_text(url, fetch(url))
        except urllib.error.HTTPError as error:
            print(f"  ::warning::HTTP {error.code} — source unreachable, not used")
            continue
        except Exception as error:  # noqa: BLE001 — an unreachable source is a reportable fact
            print(f"  ::warning::{type(error).__name__}: {error}")
            continue
        counts = {
            f"{protocol} {pattern}": len(re.findall(pattern, text, re.I))
            for protocol, pattern in STATUS_TOKENS
        }
        live = {k: v for k, v in counts.items() if v}
        print(f"  {len(text):,} characters of text")
        print(f"  status tokens present: {live or 'NONE'}")
        if not live and len(text) < 20000:
            # A JS-rendered page returns a shell. Saying so is the useful output; pretending
            # the species are absent would be the dangerous one.
            print("  ::warning::no status vocabulary and very little text — this may be a "
                  "client-rendered shell rather than the list itself")
        if text.strip():
            documents.append((label, text))

    if not documents:
        print("\n::error::No source was readable. Nothing can be concluded.")
        return 1

    # THE CURRENT LIST, PRINTED IN FULL, because every structural inference made about these
    # documents so far has been wrong and the only way to stop guessing at the shape is to read
    # it. Proximity failed (categories are section headings, not row labels); sections failed
    # too (a multi-column PDF extracts out of reading order, and a 318k-character narrative
    # strategy has no sections at all). Presence of a binomial in clean HTML is the one signal
    # that survives both, so what the authority's own page actually says is worth the lines.
    for label, text in documents:
        if "GISC" in label and "invasive plants" in label:
            print("\n" + "=" * 78)
            print(f"VERBATIM: {label}")
            print("=" * 78)
            print(" ".join(text.split())[:6000])

    # Indexed once rather than per match: a document is scanned 54 times below.
    headings_by_doc = {label: status_headings(text) for label, text in documents}
    for label, headings in headings_by_doc.items():
        print(f"\n  {label}: {len(headings)} status heading(s) in document order")
        for offset, heading in headings:
            print(f"     @{offset:>7}  {heading}")

    print("\n" + "=" * 78)
    print("PER-CARD HITS — status is the SECTION HEADING the species falls under")
    print("=" * 78)

    hits = 0
    for card_id, science, common in rows:
        genus = science.split()[0]
        is_genus_card = science.endswith("spp.")
        pattern = (re.compile(rf"\b{re.escape(genus)}\s+[a-z][a-z-]+\b")
                   if is_genus_card else re.compile(rf"\b{re.escape(science)}\b", re.I))
        found: dict[str, set[str]] = {}
        for label, text in documents:
            for match in pattern.finditer(text):
                start = text.rfind("\n", 0, match.start()) + 1
                end = text.find("\n", match.end())
                line = " ".join(text[start:end if end != -1 else len(text)].split())[:160]
                status = governing_status(headings_by_doc[label], match.start())
                entry = f"{label}\n         status: {status}\n         line:   {line}"
                found.setdefault(match.group(0), set()).add(entry)
        if not found:
            continue
        hits += 1
        print(f"\n── {card_id}  ({science} — {common})"
              f"{'   [GENUS CARD — scope is wider than any one listed species]' if is_genus_card else ''}")
        for name in sorted(found):
            print(f"   • {name}")
            for entry in sorted(found[name]):
                print(f"       {entry}")

    print("\n" + "=" * 78)
    print(f"{hits} of {len(rows)} cards produced a hit. Cards absent from the printout above")
    print("have no evidence in any readable source, which is the intended reading: no badge.")
    print("=" * 78)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
