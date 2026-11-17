#!/usr/bin/env python3
"""Import the corrected expansion master into src/data/expansion-cards.json.

    python3 scripts/import_expansion_cards.py              # (re)generate
    python3 scripts/import_expansion_cards.py --check      # fail if the committed file is stale

CANONICAL SOURCE: expansion/source/PlantDex_85_All_Requested_Corrections.json. Its own handoff
note says it REPLACES all earlier exports in their entirety, so nothing from the older 86-card
spreadsheet is used, and nothing is merged by row position. The CSV and the spreadsheet's first
tab in the same package are only CROSS-CHECKS: if either disagrees with the JSON on any imported
field, the import refuses.

* Text is imported as supplied. Arrays stay arrays, in the order given. Nothing is reworded,
  corrected, completed or sourced here.
* The ONE mapping: the master says peak season "Fall" and the app's season vocabulary says
  `autumn`. The record carries the mapped value in `front.season` and the master's own words in
  `supplied.peakSeason`, so the mapping is visible.
* `cardSafetyWarning` is editorial copy awaiting review (every card's status says so). It lives
  in `review`, NOT in `Herb.warning`, which is reserved for a warning a printed card carries.
* The three-links-per-plant CSV is supplementary: its links are attached as `researchLinks`,
  matched by scientific name. A search link has `isCitation: false` and is never evidence.
* Nothing in src/data/herbs.json, the catalogue, progression or any live feature is touched.
  The output is imported by no live module (src/lib/expansion-cards.test.ts enforces that).

Needs openpyxl.
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
MASTER = SRC / "PlantDex_85_All_Requested_Corrections.json"
MASTER_CSV = SRC / "PlantDex_85_All_Requested_Corrections.csv"
MASTER_XLSX = SRC / "PlantDex_85_ALL_Corrections_Claude_Master.xlsx"
HANDOFF = SRC / "PlantDex_85_Claude_Safety_Correction_Handoff.md"
QA = SRC / "PlantDex_85_All_Corrections_QA.json"
LINKS_CSV = SRC / "PlantDex_139_Three_Research_Links_Per_Plant.csv"
LINKS_XLSX = SRC / "PlantDex_139_Three_Links_Per_Plant_Source_Tracker.xlsx"
OUT = ROOT / "src" / "data" / "expansion-cards.json"
HERBS = ROOT / "src" / "data" / "herbs.json"
FIELD = ROOT / "src" / "lib" / "field-cards.ts"
TYPES = ROOT / "src" / "lib" / "types.ts"

NON_SPECIES_PRINTED = {46, 47}
SEASON_MAP = {"Spring": "spring", "Summer": "summer", "Fall": "autumn", "Winter": "winter"}
BACK_MAP = {  # record field -> master field
    "healingTraits": "healingTraits", "compounds": "signatureCompounds", "taste": "tasteProfile",
    "aromatic": "aromaticProfile", "preparations": "preparations", "usableParts": "usableParts",
}
# the same six, as the CSV / spreadsheet name them
TABULAR = {"healingTraits": "Healing Traits", "signatureCompounds": "Signature Compounds",
           "preparations": "Preparations", "usableParts": "Usable Parts", "tasteProfile": "Taste",
           "aromaticProfile": "Aroma"}


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


def sha256(p: pathlib.Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def clean(v):
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def existing() -> dict:
    ids, nums, sci = set(), set(NON_SPECIES_PRINTED), set()
    rarity_xp: dict[str, set] = {}
    for h in json.loads(HERBS.read_text())["herbs"]:
        ids.add(h["id"]); sci.add(h["scientificName"].lower())
        nums.add(int(re.search(r"\d+", str(h["cardNumber"])).group()))
        rarity_xp.setdefault(h["rarity"], set()).add(h["xp"])
    f = FIELD.read_text()
    ids |= set(re.findall(r"id: '([a-z0-9-]+)'", f))
    nums |= {int(n) for n in re.findall(r"cardNumber: (\d+)", f)}
    sci |= {s.lower() for s in re.findall(r"scientificName: '([^']+)'", f)}
    use_keys = re.search(r"USE_KEYS = \[(.*?)\] as const", TYPES.read_text(), re.S).group(1)
    return {"ids": ids, "nums": nums, "sci": sci, "rarity_xp": rarity_xp,
            "use_keys": set(re.findall(r"'([a-z]+)'", use_keys)),
            "seasons": set(re.findall(r"'([a-z]+)'", re.search(r"SEASONS = \[(.*?)\] as const", TYPES.read_text(), re.S).group(1)))}


def build() -> dict:
    errors: list[str] = []
    master = json.loads(MASTER.read_text())
    cards_in = master["cards"]
    ex = existing()

    # --- the package's own claims ------------------------------------------------------------
    qa = json.loads(QA.read_text())
    if master["cardCount"] != len(cards_in) or qa["expansionCount"] != len(cards_in):
        errors.append(f"card count: header {master['cardCount']}, QA {qa['expansionCount']}, actual {len(cards_in)}")
    lo, hi = master["cardNumberRange"]
    nums = [c["cardNumber"] for c in cards_in]
    if nums != list(range(lo, hi + 1)):
        errors.append(f"card numbers are not the unbroken run {lo}-{hi}")
    rd = {}
    for c in cards_in:
        rd[c["rarity"]] = rd.get(c["rarity"], 0) + 1
    if rd != master["rarityDistribution"]:
        errors.append(f"rarity distribution {rd} does not match the header {master['rarityDistribution']}")
    if any(c["scientificName"] == "Conoclinium coelestinum" for c in cards_in):
        errors.append("Blue Mistflower is present; the handoff says it was removed")

    # --- cross-check against the same package's CSV and spreadsheet --------------------------
    csvr = {int(r["Card #"]): r for r in csv.DictReader(open(MASTER_CSV, encoding="utf-8-sig"))}
    ws = openpyxl.load_workbook(MASTER_XLSX)["85 Expansion Cards"]
    hdr = [c.value for c in ws[1]]
    xl = {int(r[0]): dict(zip(hdr, r)) for r in ws.iter_rows(min_row=2, values_only=True) if r[0]}
    if set(csvr) != set(nums) or set(xl) != set(nums):
        errors.append("the CSV or spreadsheet cover a different set of cards than the JSON")

    # --- supplementary links, matched by scientific name -----------------------------------------
    links = {r["Scientific name"].strip(): r for r in csv.DictReader(open(LINKS_CSV, encoding="utf-8-sig")) if r["Set"] == "Expansion"}
    tracker_ws = openpyxl.load_workbook(LINKS_XLSX)["All 139 Source Links"]
    th = [c.value for c in tracker_ws[1]]
    tracker = {str(r[3]).strip(): dict(zip(th, r)) for r in tracker_ws.iter_rows(min_row=2, values_only=True) if r[1] == "Expansion"}

    cards, seen_ids = [], set()
    for c in cards_in:
        n, sci = c["cardNumber"], c["scientificName"].strip()
        cid = slugify(sci)
        who = f"#{n} {sci}"
        # collisions
        if cid in ex["ids"] or sci.lower() in ex["sci"]:
            errors.append(f"{who}: already an existing card (id {cid}); refusing to duplicate")
        if n in ex["nums"]:
            errors.append(f"{who}: card number already used by an existing card")
        if cid in seen_ids:
            errors.append(f"{who}: duplicate id within the import")
        seen_ids.add(cid)
        # front-of-card values, validated against the schema's own vocabularies
        rarity = c["rarity"]
        if rarity not in ex["rarity_xp"] or {c["xp"]} != ex["rarity_xp"][rarity]:
            errors.append(f"{who}: rarity {rarity!r} / xp {c['xp']} does not match the deck's rarity->xp table {ex['rarity_xp']}")
        season = SEASON_MAP.get(c["peakSeason"])
        if season is None or season not in ex["seasons"]:
            errors.append(f"{who}: peak season {c['peakSeason']!r} has no mapping onto the app's seasons")
        uses = [i.lower() for i in c["useIcons"]]
        if len(uses) != 2 or len(set(uses)) != 2 or any(u not in ex["use_keys"] for u in uses) or any(i not in master["allowedIcons"] for i in c["useIcons"]):
            errors.append(f"{who}: use icons {c['useIcons']} are not two distinct allowed icons")
        st = c["stats"]
        if any(not isinstance(st.get(k), int) or not 1 <= st[k] <= 5 for k in ("sun", "water", "heat")):
            errors.append(f"{who}: stats {st} must each be 1-5")
        if any(r not in master["regionalModel"]["regionNames"] for r in c["regions"]) or not c["regions"]:
            errors.append(f"{who}: regions {c['regions']} are not in the regional model")
        # arrays: non-empty, trimmed, and EXACTLY what the CSV and spreadsheet say
        back = {}
        for field, mf in BACK_MAP.items():
            arr = c[mf]
            if not arr or any((not isinstance(t, str)) or not t.strip() or t != t.strip() for t in arr):
                errors.append(f"{who}: {field} is empty or has blank/untrimmed entries")
            back[field] = list(arr)
        r, x = csvr.get(n), xl.get(n)
        if r and x:
            for mf, col in TABULAR.items():
                j = ", ".join(c[mf])
                if j != r[col] or j != str(x[col]):
                    errors.append(f"{who}: {col} differs between the JSON, CSV and spreadsheet")
            if (c["rarity"], str(c["xp"]), c["peakSeason"], c["cardSafetyWarning"]) != (r["Rarity"], r["XP"], r["Peak Season"], r["Card Safety Warning"]):
                errors.append(f"{who}: rarity/xp/season/warning differ between the JSON and the CSV")
            if (str(st["sun"]), str(st["water"]), str(st["heat"])) != (r["Sun"], r["Water"], r["Heat"]) or c["useIcons"] != [r["Icon 1"], r["Icon 2"]]:
                errors.append(f"{who}: stats or icons differ between the JSON and the CSV")
            if r["Plant"] != c["name"] or r["Scientific Name"] != sci:
                errors.append(f"{who}: names differ between the JSON and the CSV")
        # supplementary research links
        lk = links.get(sci)
        rl = {"directReferencesLocated": 0, "links": [], "verificationStatus": None, "notes": None}
        if lk is None:
            errors.append(f"{who}: not in the research-links CSV")
        else:
            t = tracker.get(sci)
            if t is None or any(str(t[k] or "") != str(lk[k] or "") for k in ("Link 1", "Link 2", "Link 3")):
                errors.append(f"{who}: the research-links CSV and tracker disagree")
            for i in (1, 2, 3):
                url, kind = clean(lk[f"Link {i}"]), clean(lk[f"Link {i} type"])
                if url:
                    rl["links"].append({"url": url, "type": kind, "isCitation": kind == "Direct reference"})
            rl.update(directReferencesLocated=int(lk["Direct references located"] or 0),
                      verificationStatus=clean(lk["Verification status"]), notes=clean(lk["Notes"]))
        cards.append({
            "id": cid, "cardNumber": n, "commonName": c["name"].strip(), "scientificName": sci, "status": "draft",
            "front": {"rarity": rarity, "xp": c["xp"], "season": season, "uses": uses,
                      "stats": {"water": st["water"], "sun": st["sun"], "temperature": st["heat"]}},
            "supplied": {"peakSeason": c["peakSeason"], "useIcons": c["useIcons"], "stats": st},
            "back": back,
            "review": {"cardSafetyWarning": c["cardSafetyWarning"],
                       "cardSafetyWarningStatus": c["editorial"].get("cardSafetyWarningStatus"),
                       "editorial": c["editorial"], "regions": c["regions"], "regionalConfidence": c["regionalConfidence"],
                       "references": c["references"]},
            "researchLinks": rl,
        })
    if errors:
        raise SystemExit("IMPORT REFUSED:\n  - " + "\n  - ".join(errors))
    files = [MASTER, MASTER_CSV, MASTER_XLSX, HANDOFF, QA, LINKS_CSV, LINKS_XLSX]
    return {
        "_what": "GENERATED by scripts/import_expansion_cards.py. Never hand-edit. DRAFT cards: not part of the catalogue, "
                 "the deck, the collection, the scanner, quests, the leaderboard or any other live feature.",
        "version": 2,
        "master": {"schemaVersion": master["schemaVersion"], "status": master["status"],
                   "safetyReviewNotice": master["safetyReviewNotice"], "cardNumberRange": master["cardNumberRange"],
                   "rarityDistribution": master["rarityDistribution"], "allowedIcons": master["allowedIcons"],
                   "qa": json.loads(QA.read_text())},
        "regionalModel": {k: master["regionalModel"][k] for k in ("modelName", "allowMultipleRegions", "regionNames")},
        "source": {"canonical": str(MASTER.relative_to(ROOT)),
                   "files": [{"file": str(p.relative_to(ROOT)), "sha256": sha256(p)} for p in files]},
        "count": len(cards),
        "cards": cards,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    data = build()
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
