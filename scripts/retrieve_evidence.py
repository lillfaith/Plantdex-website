#!/usr/bin/env python3
"""Stage 1 of the card-generation pipeline: RETRIEVE. Fetch bytes, interpret nothing.

────────────────────────────────────────────────────────────────────────────────
WHAT THIS PRODUCES IS `retrieved`, AND THAT IS THE WEAKEST STATE IN THE PIPELINE.

The five states are kept apart on purpose, because collapsing any two of them is how a
search hit becomes a medical claim:

  retrieved         bytes came back from a named endpoint at a recorded time. Nothing has
                    been read, judged, or attributed. THIS SCRIPT'S ONLY OUTPUT.
  ai-extracted      a model proposed claims, each pointing at a passage id below.
  citation-checked  a DETERMINISTIC validator confirmed each claim's quote is a verbatim
                    substring of the passage it cites. A MACHINE did this.
  human-reviewed    a named person read the claim beside its quote and voted.
  approved          human-reviewed `approve` AND the cited source is `verified` in
                    sources.json — which still means A HUMAN OPENED IT.

`citation-checked` is NOT `verified` and must never be rendered as it. It proves a sentence
was copied accurately out of a document; it says nothing about whether the document is
sound, whether it is about this species, or whether the finding held up. Weakening that
distinction would make every unread paper in Europe PMC a citation.
────────────────────────────────────────────────────────────────────────────────

It spends nothing: GBIF and Europe PMC are free and keyless. It writes one JSON bundle per
species and touches no database, no card, and no source registry.

api.gbif.org and www.ebi.ac.uk are both refused by the sandbox proxy (403 to CONNECT), so
this runs in Actions like `ga_occurrence.py` and `literature_candidates.py`.

    python3 scripts/retrieve_evidence.py "Matricaria chamomilla" --out evidence/
    python3 scripts/retrieve_evidence.py --self-test
"""

from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

GBIF = "https://api.gbif.org/v1"
EPMC = "https://www.ebi.ac.uk/europepmc/webservices/rest"
UA = "plantdex-retrieve-evidence (https://github.com/lillfaith/Plantdex-website)"

# Kept identical to `literature_candidates.py`, which already separates documented USE from
# pharmacology. Eligibility needs the first; the second is a stronger and different claim.
USE_TERMS = ["ethnobotan*", "traditional medicine", "folk medicine", "medicinal plant",
             "medicinal use", "herbal remedy"]
STUDY_TERMS = ["phytochemical", "antioxidant", "antimicrobial", "anti-inflammatory",
               "extract", "essential oil", "bioactiv*"]

# A passage shorter than this cannot support a claim and is usually a species list entry.
MIN_PASSAGE_CHARS = 160
MAX_PASSAGE_CHARS = 2400

# IUCN categories that make a species a conservation concern. `promotable` in the output is
# FALSE for any of these: a card may still document the plant, but nothing may send a player
# to go and find it. Absent data is NOT a clear category — see `conservation_note`.
AT_RISK = {"CR", "EN", "VU", "NT", "EW", "EX"}


def get(url: str, *, raw: bool = False, timeout: int = 60):
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                body = response.read()
                return body if raw else json.loads(body)
        except urllib.error.HTTPError as error:
            if error.code == 404:
                return None
            if attempt == 2:
                raise RuntimeError(f"{url} -> HTTP {error.code}") from error
        except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as error:
            if attempt == 2:
                raise RuntimeError(f"{url} unreachable: {error}") from error
        time.sleep(2 ** attempt)
    return None


# ── Identity ───────────────────────────────────────────────────────────────────

def resolve_identity(name: str) -> dict:
    """GBIF backbone match. Reports what the backbone said, never a tidied version of it."""
    matched = get(f"{GBIF}/species/match?{urllib.parse.urlencode({'name': name, 'strict': 'true'})}") or {}
    status = str(matched.get("status") or "").upper()
    key = matched.get("usageKey")
    record = get(f"{GBIF}/species/{key}") if key else None
    synonyms = []
    if key:
        page = get(f"{GBIF}/species/{key}/synonyms?limit=50") or {}
        for row in page.get("results", []):
            label = row.get("scientificName") or row.get("canonicalName")
            if label:
                synonyms.append(label)
    # GBIF's taxonomic status vocabulary, mapped onto the four `catalog_species` allows.
    taxonomy_status = {
        "ACCEPTED": "accepted", "SYNONYM": "synonym",
        "HETEROTYPIC_SYNONYM": "synonym", "HOMOTYPIC_SYNONYM": "synonym",
        "PROPARTE_SYNONYM": "synonym", "DOUBTFUL": "conflicting",
    }.get(status, "unresolved")
    return {
        "queried_name": name,
        "match_type": matched.get("matchType"),
        "match_confidence": matched.get("confidence"),
        "gbif_status": status or None,
        "taxonomy_status": taxonomy_status,
        "gbif_id": str(key) if key else None,
        "accepted_name": matched.get("canonicalName") or matched.get("scientificName"),
        "name_authorship": (record or {}).get("authorship") or None,
        "family": matched.get("family"),
        "genus": matched.get("genus"),
        "rank": str(matched.get("rank") or "").lower() or None,
        "synonyms": sorted(set(synonyms)),
        "endpoint": f"{GBIF}/species/match",
    }


def resolve_conservation(gbif_id: str | None) -> dict:
    """IUCN category via GBIF, plus the honest answer when there is none.

    REQUIREMENT 7, AND THE HALF OF IT THAT IS EASY TO GET WRONG. No record is not a
    reassurance — most plants have never been assessed globally, and a locally depleted
    species (goldenseal, American ginseng) can sit at `LC` or at nothing at all. So
    `promotable` is False whenever the answer is anything but an explicit low-concern
    category, and a human still has to look at state and regional listings, which this
    cannot reach.
    """
    category, source = None, None
    if gbif_id:
        answer = get(f"{GBIF}/species/{gbif_id}/iucnRedListCategory")
        if isinstance(answer, dict):
            category = answer.get("category")
            source = f"{GBIF}/species/{gbif_id}/iucnRedListCategory"
    low_concern = category in {"LC"}
    return {
        "iucn_category": category,
        "endpoint": source,
        "at_risk": category in AT_RISK,
        "promotable": bool(low_concern),
        "conservation_note": (
            "Explicit IUCN Least Concern. Global assessment only — regional and state "
            "listings are not covered here and must be checked by a human."
            if low_concern else
            f"No usable global assessment (category: {category or 'none returned'}). "
            "Treated as NOT promotable: the plant may be documented, but nothing may "
            "present it as something to go and collect until a human checks regional "
            "listings. Missing data is not evidence of abundance."
        ),
    }


# ── Literature ─────────────────────────────────────────────────────────────────

def search(expression: str, page_size: int = 25) -> list[dict]:
    params = {"query": expression, "format": "json", "pageSize": page_size,
              "resultType": "core"}
    answer = get(f"{EPMC}/search?{urllib.parse.urlencode(params)}") or {}
    return answer.get("resultList", {}).get("result", [])


def source_id(row: dict) -> str:
    if row.get("pmcid"):
        return f"pmc-{str(row['pmcid']).lower().removeprefix('pmc')}"
    if row.get("pmid"):
        return f"pmid-{row['pmid']}"
    digest = hashlib.sha256(str(row.get("title", "")).encode()).hexdigest()[:10]
    return f"epmc-{digest}"


def resolvable_url(row: dict) -> str | None:
    if row.get("pmcid"):
        return f"https://europepmc.org/article/PMC/{row['pmcid']}"
    if row.get("pmid"):
        return f"https://pubmed.ncbi.nlm.nih.gov/{row['pmid']}/"
    if row.get("doi"):
        return f"https://doi.org/{row['doi']}"
    return None


def strip_xml(xml: bytes) -> str:
    text = xml.decode("utf-8", "replace")
    text = re.sub(r"<(ref-list|back|table-wrap|fig)\b.*?</\1>", " ", text, flags=re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    text = text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    return re.sub(r"\s+", " ", text).strip()


def split_sentences(text: str) -> list[str]:
    # Deliberately crude. A passage is quoted whole and checked verbatim later, so a
    # mis-split costs a slightly odd window, never a fabricated quote.
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z(])", text)
    return [p.strip() for p in parts if p.strip()]


def passages_for(row: dict, species: str) -> list[dict]:
    """Every retrieved window that NAMES the species, quoted verbatim with an id.

    Only passages mentioning the species are kept. A paper that names a plant once in a
    table and is otherwise about something else cannot support a claim about it, and a
    window with no mention is the easiest way for an extractor to drift onto a neighbour.
    """
    sid = source_id(row)
    genus = species.split()[0]
    abbreviated = f"{genus[0]}. {species.split()[1]}" if len(species.split()) > 1 else species
    needles = [species.lower(), abbreviated.lower()]

    bodies: list[tuple[str, str]] = []
    abstract = (row.get("abstractText") or "").strip()
    if abstract:
        # THE ABSTRACT CARRIES MARKUP TOO, and only the full text was being stripped.
        # Europe PMC returns `<i>Matricaria chamomilla</i>` and `<h4>Conclusions</h4>`
        # inside abstractText, so every quote drawn from an abstract arrived with tags
        # embedded -- and because the citation check requires a VERBATIM substring, the
        # tags would have had to survive into the card to pass it. Caught by reading the
        # retrieved passages rather than by any test.
        bodies.append(("abstract", strip_xml(abstract.encode("utf-8"))))

    if row.get("pmcid") and row.get("isOpenAccess") == "Y":
        xml = get(f"{EPMC}/{row.get('source', 'MED')}/{row['pmcid']}/fullTextXML", raw=True)
        if xml:
            bodies.append(("full-text", strip_xml(xml)))

    out: list[dict] = []
    for where, body in bodies:
        sentences = split_sentences(body)
        for index, sentence in enumerate(sentences):
            if not any(n in sentence.lower() for n in needles):
                continue
            # GROW THE WINDOW UNTIL IT CARRIES ENOUGH CONTEXT TO SUPPORT A CLAIM.
            # A fixed two-sentence window silently dropped real passages whose naming
            # sentence happened to be short — an abstract's opening line is often under
            # eighty characters, and refusing it loses the one passage that names the
            # plant. It grows to at most four sentences and then gives up rather than
            # running on into a neighbouring topic.
            window = ""
            for span in (2, 3, 4):
                window = " ".join(sentences[index:index + span])[:MAX_PASSAGE_CHARS].strip()
                if len(window) >= MIN_PASSAGE_CHARS:
                    break
            if len(window) < MIN_PASSAGE_CHARS:
                continue
            out.append({
                "passage_id": f"{sid}#{where}-{index}",
                "source_id": sid,
                "located_in": where,
                # VERBATIM. The citation checker later asserts a claim's quote is a
                # substring of exactly this string, so it may never be cleaned up again.
                "text": window,
            })
            if len(out) >= 40:
                return out
    return out


def retrieve_literature(species: str) -> dict:
    groups: dict[str, list[dict]] = {}
    passages: list[dict] = []
    seen_sources: dict[str, dict] = {}
    for label, terms in (("documented-use", USE_TERMS), ("laboratory-study", STUDY_TERMS)):
        joined = " OR ".join(f'"{t}"' if " " in t else t for t in terms)
        rows = search(f'"{species}" AND ({joined})')
        kept = []
        for row in rows:
            sid = source_id(row)
            if sid in seen_sources:
                continue
            record = {
                "source_id": sid,
                "title": (row.get("title") or "").strip(),
                "journal": ((row.get("journalInfo") or {}).get("journal") or {}).get("title"),
                "year": row.get("pubYear"),
                "doi": row.get("doi"),
                "open_access": row.get("isOpenAccess") == "Y",
                "url": resolvable_url(row),
                "query_group": label,
                # NOT verified. Nothing this script writes may ever carry verified: true.
                "verified": False,
                "verified_by": None,
                "verified_on": None,
            }
            seen_sources[sid] = record
            kept.append(record)
            passages.extend(passages_for(row, species))
            time.sleep(0.2)
        groups[label] = [r["source_id"] for r in kept]
        time.sleep(0.5)
    return {"groups": groups, "sources": list(seen_sources.values()), "passages": passages}


# ── Bundle ─────────────────────────────────────────────────────────────────────

def species_key(accepted_name: str) -> str:
    """Mirrors `canonical_binomial`/`species-identity.ts`: derived, never supplied."""
    parts = re.findall(r"[A-Za-z-]+", accepted_name)
    if len(parts) < 2:
        raise ValueError(f"not a binomial: {accepted_name!r}")
    return f"{parts[0].lower()} {parts[1].lower()}"


def bundle(name: str) -> dict:
    identity = resolve_identity(name)
    accepted = identity.get("accepted_name") or name
    conservation = resolve_conservation(identity.get("gbif_id"))
    literature = retrieve_literature(accepted)
    return {
        "state": "retrieved",
        "schema_version": 1,
        "species_key": species_key(accepted),
        "retrieved_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "identity": identity,
        "conservation": conservation,
        "literature": literature,
        "counts": {
            "sources": len(literature["sources"]),
            "open_access_sources": sum(1 for s in literature["sources"] if s["open_access"]),
            "passages": len(literature["passages"]),
        },
        "warning": (
            "state=retrieved. Nothing here is a source, a claim, or evidence of anything. "
            "Every passage is a verbatim window from a document nobody has read. Do not "
            "render any of it."
        ),
    }


def self_test() -> int:
    checks = [
        (species_key("Matricaria chamomilla") == "matricaria chamomilla", "species key is derived"),
        (species_key("Capsella bursa-pastoris") == "capsella bursa-pastoris", "hyphen survives"),
        (source_id({"pmcid": "PMC12345"}) == "pmc-12345", "pmcid -> source id"),
        (source_id({"pmid": "77"}) == "pmid-77", "pmid -> source id"),
        (strip_xml(b"<p>a <i>b</i></p>") == "a b", "xml is stripped to text"),
        (strip_xml(b"<ref-list><ref>X</ref></ref-list><p>keep</p>") == "keep",
         "the bibliography is dropped, so a title cannot be quoted as a finding"),
        (len(split_sentences("One. Two things. Three.")) == 3, "sentences split"),
        (resolve_conservation(None)["promotable"] is False,
         "no assessment is NOT promotable (missing data is not abundance)"),
        (resolve_conservation(None)["at_risk"] is False,
         "...and is also not asserted to be at risk"),
    ]
    # Control: a passage that never names the species must be refused.
    row = {"abstractText": "The genus is large. " + "Filler sentence about soil. " * 12}
    checks.append((passages_for(row, "Matricaria chamomilla") == [],
                   "CONTROL: a passage that does not name the species is refused"))
    # CONTROL: an abstract's own markup must not survive into a quotable passage.
    marked = {"abstractText": "<i>Matricaria chamomilla</i> L. is used widely. "
              "<h4>Methods</h4> Its dried flower heads are prepared as an infusion across "
              "European folk traditions, and the practice is recorded in regional surveys."}
    marked_out = passages_for(marked, "Matricaria chamomilla")
    checks.append((bool(marked_out) and "<i>" not in marked_out[0]["text"]
                   and "<h4>" not in marked_out[0]["text"],
                   "CONTROL: markup in an ABSTRACT is stripped, not just in full text"))

    named = ("Matricaria chamomilla is widely used. "
             "Its dried flower heads are prepared as an infusion across European folk "
             "traditions, and the practice is recorded in several regional surveys. "
             "The present review summarises that record.")
    kept = passages_for({"abstractText": named}, "Matricaria chamomilla")
    checks.append((len(kept) == 1, "CONTROL: a passage that does name it is kept"))
    checks.append((bool(kept) and kept[0]["text"] in named,
                   "...and its text is a verbatim substring of what was retrieved"))
    # A short naming sentence must still produce a passage, which a fixed window did not.
    checks.append((len(passages_for({"abstractText": named}, "Matricaria chamomilla")[0]["text"]) >= MIN_PASSAGE_CHARS,
                   "a short naming sentence still reaches the minimum by growing"))
    bad = sum(1 for ok, _ in checks if not ok)
    for ok, label in checks:
        print(f"{'PASS' if ok else 'FAIL'}  {label}")
    print("\nALL SELF-TESTS PASSED" if not bad else f"\n{bad} FAILURE(S)")
    return 1 if bad else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("species", nargs="*")
    parser.add_argument("--out", default="evidence/retrieved")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if not args.species:
        print("name at least one species", file=sys.stderr)
        return 2
    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    for name in args.species:
        data = bundle(name)
        path = out / f"{data['species_key'].replace(' ', '_')}.json"
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
        print(f"{name}: {data['counts']['sources']} sources, "
              f"{data['counts']['open_access_sources']} open access, "
              f"{data['counts']['passages']} passages, "
              f"iucn={data['conservation']['iucn_category']} "
              f"promotable={data['conservation']['promotable']} -> {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
