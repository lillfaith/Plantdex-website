#!/usr/bin/env python3
"""
Build the Plantdex web deck data and card art from the print reference package.

This is a DEVELOPMENT-TIME tool. It is not part of the Next.js runtime and adds no
dependency to the shipped bundle. It exists so that regenerating `src/data/herbs.json`
and `public/cards/` from a revised deck is a single reproducible command rather than
hand-editing JSON.

    python3 scripts/build_deck.py --source /path/to/plantdex_claude

Requires Pillow:  pip3 install pillow

------------------------------------------------------------------------------
WHERE THIS DATA COMES FROM
------------------------------------------------------------------------------
The print PDFs have their text converted to outlines (ghostscript -dNoOutputFonts),
so no text can be extracted programmatically. The DECK table below is therefore a
manual transcription of the 45 herb card fronts, read from the rendered previews.

The three numeric stats (water / sun / temperature) are NOT trusted to the
transcription: this script re-counts the icons directly from the card images on every
run and fails loudly if a count disagrees with the table. That keeps the table honest.

NOTHING in this file is invented. Every field is present on the physical card. Fields
that live on the card BACKS (habitat, identification notes, preparation, cautions) are
not in the reference package and are deliberately absent rather than guessed.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover - dev tooling only
    sys.exit("Pillow is required: pip3 install pillow")

REPO = Path(__file__).resolve().parent.parent
OUT_JSON = REPO / "src" / "data" / "herbs.json"
OUT_ART = REPO / "public" / "cards"

# --- Card front geometry (source previews are 356x576) -----------------------
STAT_ROWS = {"water": (345, 366), "sun": (376, 406), "temp": (414, 441)}
SLOT_X0, SLOT_W, SLOT_N = 27, 30, 5
MIN_HITS = 25  # icon-present threshold; measured hit counts are ~70-190 vs 0

# --- Icon vocabulary ---------------------------------------------------------
# Read from the card faces. The deck's own "Icon Guide" card (#46) is blank on the
# front and its back is not in the reference package, so these labels are our reading
# of the symbols and should be confirmed against that card before public launch.
# They are deliberately phrased as traditional-use categories, never medical claims.
USES = {
    "tea": "Traditionally prepared as a tea or infusion",
    "digestive": "Traditionally associated with digestion",
    "respiratory": "Traditionally associated with the lungs and breathing",
    "kidney": "Traditionally associated with the kidneys and urinary system",
    "skin": "Traditionally applied to the skin",
    "wound": "Traditionally used in wound and first-aid care",
    "heart": "Traditionally associated with circulation",
    "immune": "Traditionally associated with immune support",
    "joint": "Traditionally associated with aches and joints",
    "calm": "Traditionally associated with rest and calm",
    "energy": "Traditionally associated with energy and vitality",
    "edible": "Has traditional culinary/edible use",
}
SEASONS = {"spring": "Spring", "summer": "Summer", "autumn": "Autumn", "winter": "Winter"}
RARITIES = ["Common", "Uncommon", "Rare", "Epic"]

# XP is assigned by rarity here and consumed by src/lib/progression.ts.
# Keep this table and XP_BY_RARITY in progression.ts in sync.
XP_BY_RARITY = {"Common": 100, "Uncommon": 175, "Rare": 300, "Epic": 500}

# --- The deck ----------------------------------------------------------------
# (number, commonName, scientificName, rarity, season, [use icons], water, sun, temp)
DECK = [
    (1, "Dandelion", "Taraxacum officinale", "Common", "summer", ["tea", "digestive"], 2, 3, 5),
    (2, "Broadleaf Dock", "Rumex obtusifolius", "Common", "autumn", ["tea", "digestive"], 3, 4, 3),
    (3, "Goldenrod", "Solidago canadensis", "Common", "summer", ["respiratory", "kidney"], 2, 5, 4),
    (4, "Ragweed", "Ambrosia artemisiifolia", "Common", "summer", ["tea", "skin"], 2, 5, 4),
    (5, "Lamb's Quarters", "Chenopodium album", "Common", "spring", ["tea", "digestive"], 3, 4, 3),
    (6, "Purslane", "Portulaca oleracea", "Common", "summer", ["heart", "edible"], 2, 5, 4),
    (7, "Garlic Mustard", "Alliaria petiolata", "Common", "spring", ["respiratory", "wound"], 3, 3, 3),
    (8, "Stinging Nettle", "Urtica dioica", "Common", "spring", ["tea", "digestive"], 4, 3, 3),
    (9, "Wood Sorrel", "Oxalis stricta", "Common", "spring", ["tea", "digestive"], 3, 3, 3),
    (10, "Red Clover", "Trifolium pratense", "Common", "summer", ["tea", "heart"], 3, 4, 3),
    (11, "Purple Dead Nettle", "Lamium purpureum", "Common", "spring", ["tea", "wound"], 3, 3, 3),
    (12, "Wild Violet", "Viola sororia", "Common", "spring", ["skin", "respiratory"], 4, 2, 2),
    (13, "Chickweed", "Stellaria media", "Common", "spring", ["wound", "skin"], 4, 2, 2),
    (14, "Broad Leaf Plantain", "Plantago major", "Common", "spring", ["wound", "skin"], 3, 3, 3),
    (15, "Cleavers", "Galium aparine", "Common", "spring", ["tea", "kidney"], 4, 2, 2),
    (16, "Ground Ivy", "Glechoma hederacea", "Common", "spring", ["respiratory", "digestive"], 3, 3, 2),
    (17, "Maple", "Acer spp.", "Common", "spring", ["energy", "edible"], 3, 4, 3),
    (18, "Blackberry", "Rubus spp.", "Common", "autumn", ["edible", "digestive"], 3, 4, 3),
    (19, "Sheep's Sorrel", "Rumex acetosella", "Uncommon", "spring", ["tea", "digestive"], 2, 4, 5),
    (20, "Sumac", "Rhus spp.", "Uncommon", "autumn", ["edible", "digestive"], 2, 5, 4),
    (21, "Chicory", "Cichorium intybus", "Uncommon", "summer", ["edible", "digestive"], 2, 5, 4),
    (22, "Burdock", "Arctium lappa", "Uncommon", "autumn", ["heart", "digestive"], 3, 4, 3),
    (23, "Wild Mint", "Mentha canadensis", "Uncommon", "summer", ["calm", "digestive"], 4, 3, 3),
    (24, "Catnip", "Nepeta cataria", "Uncommon", "summer", ["calm", "digestive"], 2, 4, 3),
    (25, "Shepherd's Purse", "Capsella bursa-pastoris", "Uncommon", "autumn", ["wound", "heart"], 2, 3, 3),
    (26, "Self-Heal", "Prunella vulgaris", "Uncommon", "summer", ["immune", "wound"], 3, 3, 3),
    (27, "Mullein", "Verbascum thapsus", "Uncommon", "summer", ["tea", "respiratory"], 2, 5, 4),
    (28, "Horsetail", "Equisetum arvense", "Uncommon", "summer", ["joint", "kidney"], 4, 3, 3),
    (29, "Field Garlic", "Allium vineale", "Uncommon", "spring", ["edible", "immune"], 2, 3, 4),
    (30, "Wild Strawberry", "Fragaria virginiana", "Uncommon", "summer", ["edible", "digestive"], 3, 4, 3),
    (31, "Elderberry", "Sambucus spp.", "Uncommon", "autumn", ["edible", "immune"], 4, 3, 3),
    (32, "St. John's Wort", "Hypericum perforatum", "Uncommon", "summer", ["skin", "calm"], 2, 4, 4),
    (33, "Yarrow", "Achillea millefolium", "Rare", "summer", ["immune", "joint"], 2, 5, 4),
    (34, "Jewelweed", "Impatiens capensis", "Rare", "summer", ["skin", "wound"], 4, 3, 3),
    (35, "Lemon Balm", "Melissa officinalis", "Rare", "summer", ["tea", "calm"], 3, 4, 3),
    (36, "Bee Balm", "Monarda fistulosa", "Rare", "summer", ["tea", "respiratory"], 2, 4, 3),
    (37, "Wild Rose", "Rosa spp.", "Rare", "summer", ["skin", "digestive"], 3, 4, 3),
    (38, "Willow", "Salix spp.", "Rare", "spring", ["tea", "joint"], 5, 4, 3),
    (39, "Wild Geranium", "Geranium maculatum", "Rare", "autumn", ["wound", "digestive"], 3, 3, 3),
    (40, "Honeysuckle", "Lonicera japonica", "Rare", "summer", ["immune", "respiratory"], 3, 4, 3),
    (41, "Pine", "Pinus spp.", "Rare", "winter", ["respiratory", "wound"], 2, 5, 3),
    (42, "Mulberry", "Morus spp.", "Rare", "autumn", ["heart", "energy"], 3, 4, 3),
    (43, "Passion Flower", "Passiflora incarnata", "Epic", "summer", ["edible", "calm"], 3, 4, 3),
    (44, "Prickly Lettuce", "Lactuca serriola", "Epic", "summer", ["edible", "calm"], 2, 4, 4),
    (45, "Oak", "Quercus spp.", "Epic", "summer", ["tea", "digestive"], 3, 4, 3),
]

# Card fronts that are not herbs. Their backs carry the deck's own icon legend and
# safety disclaimer; those backs are not in the reference package.
NON_HERB_CARDS = {46: "Icon Guide", 47: "Disclaimer"}


def slugify(scientific_name: str) -> str:
    """Stable id derived from the scientific name.

    AGENTS.md is explicit that the visible common name must never be the primary
    identifier, so ids come from the botanical name and stay stable if a common
    name is ever reworded.
    """
    out = []
    for ch in scientific_name.lower():
        if ch.isalnum():
            out.append(ch)
        elif ch in " -":
            out.append("-")
        # drop apostrophes and periods entirely ("Acer spp." -> "acer-spp")
    slug = "".join(out)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")


def classify(px, kind: str) -> bool:
    r, g, b = px
    if kind == "water":
        return b > 110 and b > r + 40 and r + 10 < g < b + 40
    if kind == "sun":
        return r > 195 and g > 150 and b < 140
    if kind == "temp":
        return r > 150 and g < 100 and b < 100
    return False


def count_stat(img: Image.Image, kind: str) -> int:
    y0, y1 = STAT_ROWS[kind]
    found = 0
    for slot in range(SLOT_N):
        x0 = SLOT_X0 + slot * SLOT_W
        hits = sum(
            1
            for y in range(y0, y1)
            for x in range(x0, x0 + SLOT_W)
            if classify(img.getpixel((x, y)), kind)
        )
        if MIN_HITS > hits > 5:
            raise SystemExit(f"Ambiguous {kind} icon slot {slot} (hits={hits}) — check geometry.")
        if hits >= MIN_HITS:
            found += 1
    return found


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--source",
        required=True,
        type=Path,
        help="Path to the plantdex_claude reference folder (contains card_previews/).",
    )
    ap.add_argument("--skip-art", action="store_true", help="Rebuild JSON only.")
    args = ap.parse_args()

    previews = args.source / "card_previews"
    if not previews.is_dir():
        return print(f"No card_previews/ under {args.source}", file=sys.stderr) or 1

    def preview_path(n: int) -> Path:
        return previews / f"{n}rasterjul28aligned.jpg"

    OUT_ART.mkdir(parents=True, exist_ok=True)
    (OUT_ART / "thumb").mkdir(parents=True, exist_ok=True)
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)

    herbs, seen_ids, problems = [], set(), []

    for (num, common, sci, rarity, season, uses, w, s, t) in DECK:
        src = preview_path(num)
        if not src.exists():
            problems.append(f"#{num} {common}: missing preview {src.name}")
            continue

        img = Image.open(src).convert("RGB")

        # Re-derive the stats from the artwork and hold the table to them.
        for kind, expected in (("water", w), ("sun", s), ("temp", t)):
            actual = count_stat(img, kind)
            if actual != expected:
                problems.append(
                    f"#{num} {common}: {kind} table says {expected}, card shows {actual}"
                )

        if rarity not in RARITIES:
            problems.append(f"#{num} {common}: unknown rarity {rarity!r}")
        if season not in SEASONS:
            problems.append(f"#{num} {common}: unknown season {season!r}")
        for u in uses:
            if u not in USES:
                problems.append(f"#{num} {common}: unknown use icon {u!r}")

        herb_id = slugify(sci)
        if herb_id in seen_ids:
            problems.append(f"#{num} {common}: duplicate id {herb_id!r}")
        seen_ids.add(herb_id)

        if not args.skip_art:
            img.save(OUT_ART / f"{herb_id}.webp", "WEBP", quality=88, method=6)
            img.resize((img.width // 2, img.height // 2), Image.LANCZOS).save(
                OUT_ART / "thumb" / f"{herb_id}.webp", "WEBP", quality=82, method=6
            )

        herbs.append(
            {
                "id": herb_id,
                "cardNumber": num,
                "commonName": common,
                "scientificName": sci,
                "rarity": rarity,
                "xp": XP_BY_RARITY[rarity],
                "season": season,
                "uses": uses,
                "stats": {"water": w, "sun": s, "temperature": t},
                "image": f"/cards/{herb_id}.webp",
                "thumb": f"/cards/thumb/{herb_id}.webp",
            }
        )

    if problems:
        print("Deck build failed:", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        return 1

    payload = {
        "$comment": (
            "GENERATED by scripts/build_deck.py from the Plantdex print reference package. "
            "Do not hand-edit; edit the DECK table in that script and re-run. "
            "Fields printed on the card BACKS (habitat, identification, preparation, "
            "cautions) are not present here because the backs are not in the reference package."
        ),
        "deckName": "Plantdex",
        "deckSize": len(herbs),
        "nonHerbCards": [{"cardNumber": n, "title": t} for n, t in sorted(NON_HERB_CARDS.items())],
        "herbs": herbs,
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    total_xp = sum(h["xp"] for h in herbs)
    print(f"Wrote {OUT_JSON.relative_to(REPO)} — {len(herbs)} herbs, {total_xp} XP total.")
    if not args.skip_art:
        print(f"Wrote card art to {OUT_ART.relative_to(REPO)}/ (full + thumb).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
