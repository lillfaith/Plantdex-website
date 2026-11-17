#!/usr/bin/env python3
"""Import the expansion cards' supplied TEXT into src/data/expansion-cards.json.

    python3 scripts/import_expansion_cards.py              # (re)generate
    python3 scripts/import_expansion_cards.py --check      # fail if the committed file is stale
    python3 scripts/import_expansion_cards.py --exclude "Genus species" [--exclude 130]

WHAT IT DOES AND DOES NOT DO.

* Text is imported EXACTLY as supplied. Each back field is kept as the supplied string
  (`supplied`) and as the array the card format uses (`back`), and a validation step proves
  the two say the same thing. Nothing is reworded, corrected, completed or sourced here.
* Review/safety/evidence columns are kept verbatim under `review`, NOT promoted to anything
  a player could see. `cardSafetyWarning` is an editorial note awaiting review; it is not
  `Herb.warning`, which is reserved for a warning a printed card actually carries.
* Research links keep the supplier's own classification. A "Research search - NOT A CITATION"
  link is recorded with `isCitation: false` and is never treated as evidence.
* Front-of-card fields the supplied files do not contain (rarity, XP, season, use icons,
  the three stat bars) are `null`. They are not guessed; the completeness report lists them.
* Cards are matched across the files by SCIENTIFIC NAME, not by card number: the supplied
  numbering moved when a card was removed, and a name is what is stable.
* Nothing in src/data/herbs.json, the catalogue, progression or any live feature is touched.
  This output is imported by no live module (src/lib/expansion-cards.test.ts enforces that).

Needs openpyxl. The supplied inputs are kept byte-identical under expansion/source/.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import pathlib
import re
import sys

import openpyxl

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / "expansion" / "source"
LINKS_CSV = SRC / "PlantDex_139_Three_Research_Links_Per_Plant.csv"
TRACKER = SRC / "PlantDex_139_Three_Links_Per_Plant_Source_Tracker.xlsx"
TEXT_XLSX = SRC / "PlantDex_86_Healing_Traits_Reviewed_Safety_Updated.xlsx"
OUT = ROOT / "src" / "data" / "expansion-cards.json"
HERBS = ROOT / "src" / "data" / "herbs.json"
FIELD = ROOT / "src" / "lib" / "field-cards.ts"

SET_NAME = "Expansion"
NON_SPECIES_PRINTED = {46: "Icon Guide", 47: "Disclaimer"}

BACK_COLUMNS = {   # back field -> (sheet, column)
    "healingTraits": ("Usable Parts - UPDATED", "HEALING TRAITS — 3–6 SHORT PHRASES"),
    "compounds": ("Usable Parts - UPDATED", "SIGNATURE COMPOUNDS — CARD TEXT"),
    "taste": ("Taste Profiles", "Taste profile — 3-descriptor proposal"),
    "aromatic": ("Aromatic Profiles", "Aromatic profile"),
    "preparations": ("Usable Parts - UPDATED", "PREPARATIONS — CARD FIT"),
    "usableParts": ("Usable Parts - UPDATED", "USABLE PARTS"),
}
REVIEW_COLUMNS = {
    "preparationSafety": "Preparation safety / review",
    "guideCaution": "Guide caution",
    "evidenceBasis": "Evidence basis",
    "originalPdfPartNames": "Original PDF part names",
    "healingTraitsReview": "HEALING TRAITS — EVIDENCE / SAFETY REVIEW",
    "compoundsSource": "COMPOUNDS — SPECIES SOURCE",
    "compoundsStatus": "COMPOUNDS — STATUS",
    "compoundsNotes": "COMPOUNDS — EVIDENCE / SAFETY NOTES",
    "cardSafetyWarning": "CARD SAFETY WARNING — EDITORIAL REVIEW",
}


def slugify(name: str) -> str:
    """Identical to scripts/build_deck.py: ids come from the scientific name, never the common name."""
    out = []
    for ch in name.lower():
        if ch.isalnum():
            out.append(ch)
        elif ch in " -":
            out.append("-")
    slug = "".join(out)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")


def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def split_tokens(raw: str) -> list[str]:
    """Split on commas that are not inside parentheses. Tokens are otherwise untouched."""
    return [t.strip() for t in re.split(r",\s*(?![^()]*\))", raw or "") if t.strip()]


def clean(v):
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def sheet(wb, name):
    ws = wb[name]
    hdr = [c.value for c in ws[1]]
    return [dict(zip(hdr, r)) for r in ws.iter_rows(min_row=2, values_only=True) if any(r)]


def existing_identity() -> tuple[set, set, set]:
    ids, nums, sci = set(), set(NON_SPECIES_PRINTED), set()
    for h in json.loads(HERBS.read_text())["herbs"]:
        ids.add(h["id"]); nums.add(int(re.search(r"\d+", str(h["cardNumber"])).group())); sci.add(h["scientificName"].lower())
    src = FIELD.read_text()
    ids |= set(re.findall(r"id: '([a-z0-9-]+)'", src))
    nums |= {int(n) for n in re.findall(r"cardNumber: (\d+)", src)}
    sci |= {s.lower() for s in re.findall(r"scientificName: '([^']+)'", src)}
    return ids, nums, sci


def build(exclude: list[str]) -> dict:
    errors: list[str] = []
    csv_rows = list(csv.DictReader(open(LINKS_CSV, encoding="utf-8-sig")))
    expansion = [r for r in csv_rows if r["Set"] == SET_NAME]
    ex_keys = {e.lower() for e in exclude}
    excluded = [r for r in expansion if r["Scientific name"].lower() in ex_keys or r["Card #"] in ex_keys]
    for e in exclude:
        if not any(r["Scientific name"].lower() == e.lower() or r["Card #"] == e for r in expansion):
            errors.append(f"--exclude {e!r} matches no expansion card")
    expansion = [r for r in expansion if r not in excluded]

    tracker = {int(r["Card #"]): r for r in sheet(openpyxl.load_workbook(TRACKER), "All 139 Source Links")}
    wb = openpyxl.load_workbook(TEXT_XLSX)
    tabs = {n: {r["Scientific name"]: r for r in sheet(wb, n)} for n in ("Usable Parts - UPDATED", "Taste Profiles", "Aromatic Profiles")}
    ids_have, nums_have, sci_have = existing_identity()

    cards, seen_ids, seen_nums = [], set(), set()
    for r in expansion:
        sci, num = r["Scientific name"].strip(), int(r["Card #"])
        cid = slugify(sci)
        # --- cross-file agreement ---------------------------------------------------------
        t = tracker.get(num)
        if t is None or t["Scientific name"] != sci or t["Plant"] != r["Plant"]:
            errors.append(f"#{num} {sci}: the CSV and the source tracker disagree")
        elif any(str(t[k] or "") != str(r[k] or "") for k in ("Link 1", "Link 2", "Link 3", "Link 1 type", "Link 2 type", "Link 3 type")):
            errors.append(f"#{num} {sci}: CSV and tracker links differ")
        # --- collisions ---------------------------------------------------------------------
        if cid in ids_have or sci.lower() in sci_have:
            errors.append(f"#{num} {sci}: already an existing card (id {cid}); refusing to duplicate")
        if num in nums_have:
            errors.append(f"#{num} {sci}: card number already used by an existing card")
        if cid in seen_ids or num in seen_nums:
            errors.append(f"#{num} {sci}: duplicate id or number within the import")
        seen_ids.add(cid); seen_nums.add(num)
        # --- text ---------------------------------------------------------------------------
        rows = {n: tabs[n].get(sci) for n in tabs}
        if any(v is None for v in rows.values()):
            errors.append(f"#{num} {sci}: no text row in " + ", ".join(n for n, v in rows.items() if v is None))
            continue
        if rows["Usable Parts - UPDATED"]["Plant"] != r["Plant"]:
            errors.append(f"#{num}: common name differs ({rows['Usable Parts - UPDATED']['Plant']!r} vs {r['Plant']!r})")
        supplied, back = {}, {}
        for field, (sh, col) in BACK_COLUMNS.items():
            raw = clean(rows[sh][col])
            if not raw:
                errors.append(f"#{num} {sci}: {field} is blank in the supplied file")
                raw = ""
            supplied[field] = raw
            back[field] = split_tokens(raw)
            if ", ".join(back[field]) != re.sub(r",\s*", ", ", raw):
                errors.append(f"#{num} {sci}: {field} does not round-trip to the supplied text")
        review = {k: clean(rows["Usable Parts - UPDATED"][c]) for k, c in REVIEW_COLUMNS.items()}
        tr, ar = rows["Taste Profiles"], rows["Aromatic Profiles"]
        review["taste"] = {"context": clean(tr["Plant part / context"]), "evidenceStatus": clean(tr["Evidence status"]),
                           "referenceUrl": clean(tr["Reference URL"]), "originalDraft": clean(tr["Original research draft"])}
        review["aromatic"] = {"context": clean(ar["Plant part / context"]), "evidenceStatus": clean(ar["Evidence status"]),
                              "sourceUrl": clean(ar["Source URL"]), "researchNote": clean(ar["Research note"])}
        links = []
        for i in (1, 2, 3):
            url, kind = clean(r[f"Link {i}"]), clean(r[f"Link {i} type"])
            if url:
                links.append({"url": url, "type": kind, "isCitation": kind == "Direct reference"})
        cards.append({
            "id": cid, "cardNumber": num, "commonName": r["Plant"].strip(), "scientificName": sci,
            "status": "draft",
            "front": {"rarity": None, "xp": None, "season": None, "uses": None, "stats": None},
            "back": back, "supplied": supplied, "review": review,
            "researchLinks": {"directReferencesLocated": int(r["Direct references located"] or 0), "links": links,
                              "verificationStatus": clean(r["Verification status"]), "notes": clean(r["Notes"])},
        })
    cards.sort(key=lambda c: c["cardNumber"])
    if errors:
        raise SystemExit("IMPORT REFUSED:\n  - " + "\n  - ".join(errors))
    return {
        "_what": "GENERATED by scripts/import_expansion_cards.py. Never hand-edit. DRAFT cards: not part of the catalogue, "
                 "the deck, the collection, the scanner, quests, the leaderboard or any other live feature.",
        "version": 1,
        "source": {"set": SET_NAME,
                   "files": [{"file": str(p.relative_to(ROOT)), "sha256": sha256(p)} for p in (LINKS_CSV, TRACKER, TEXT_XLSX)],
                   "csvExpansionRows": len([r for r in csv.DictReader(open(LINKS_CSV, encoding="utf-8-sig")) if r["Set"] == SET_NAME]),
                   "excluded": [{"cardNumber": int(r["Card #"]), "scientificName": r["Scientific name"]} for r in excluded]},
        "count": len(cards),
        "cards": cards,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--exclude", action="append", default=[])
    a = ap.parse_args()
    data = build(a.exclude)
    text = json.dumps(data, indent=1, ensure_ascii=False) + "\n"
    if a.check:
        if not OUT.exists() or OUT.read_text() != text:
            print("STALE: src/data/expansion-cards.json does not match a fresh import", file=sys.stderr)
            return 1
        print(f"up to date ({data['count']} cards)")
        return 0
    OUT.write_text(text)
    print(f"wrote {OUT.relative_to(ROOT)}: {data['count']} cards, #{data['cards'][0]['cardNumber']}-#{data['cards'][-1]['cardNumber']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
