#!/usr/bin/env python3
"""
Build the Plantdex web deck data and card art from the per-card print PDFs.

This is a DEVELOPMENT-TIME tool. It is not part of the Next.js runtime and adds no
dependency to the shipped bundle. It exists so that regenerating `src/data/herbs.json`
and `public/cards/` from a revised deck is a single reproducible command rather than
hand-editing JSON.

    pip3 install pillow pymupdf
    python3 scripts/build_deck.py --source /path/to/card-pdfs

`--source` must contain one two-page PDF per card, named so that the card number can be
recovered (e.g. `...aug13linesfixed7.pdf` is card 7). Page 1 is the front, page 2 the back.
Cards 46 (Icon Guide) and 47 (Disclaimer) are not herbs and are skipped.

------------------------------------------------------------------------------
WHERE THIS DATA COMES FROM
------------------------------------------------------------------------------
The print PDFs have their text converted to outlines, so no text can be extracted
programmatically. The DECK and BACKS tables below are therefore a manual transcription
of the 45 cards, read from rendered images of the artwork.

The three numeric stats (water / sun / temperature) are NOT trusted to the
transcription: this script re-counts the icons directly from the rendered card front on
every run and fails loudly if a count disagrees with the table. The front is rendered at
exactly 356x576 for that check, which is the geometry the detector was calibrated on.

NOTHING in this file is invented. Every field is printed on the physical card. Where the
card itself carries an error or a typo, it is transcribed faithfully and noted in
KNOWN_CARD_ISSUES rather than silently corrected.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover - dev tooling only
    sys.exit("Pillow is required: pip3 install pillow")

try:
    import pymupdf
except ImportError:  # pragma: no cover - dev tooling only
    sys.exit("PyMuPDF is required: pip3 install pymupdf")

REPO = Path(__file__).resolve().parent.parent
OUT_JSON = REPO / "src" / "data" / "herbs.json"
OUT_ART = REPO / "public" / "cards"

# --- Render geometry ---------------------------------------------------------
# Source pages are 233x377pt. 1.52789x gives exactly 356x576, the size the stat-icon
# detector below was calibrated against.
CHECK_ZOOM = 356 / 233
FULL_WIDTH = 800   # shipped card image
THUMB_WIDTH = 400  # grid thumbnail

# Each card front carries a pixel-art sprite of the plant in a small panel. My Garden uses
# these rather than placeholder art, so the garden is made of the deck's own illustrations.
# Coordinates are in the calibrated 356x576 space.
SPRITE_BOX = (236, 346, 328, 438)
SPRITE_SCALE = 3  # nearest-neighbour upscale keeps the pixels crisp

STAT_ROWS = {"water": (345, 366), "sun": (376, 406), "temp": (414, 441)}
SLOT_X0, SLOT_W, SLOT_N = 27, 30, 5
MIN_HITS = 25  # icon-present threshold; measured hit counts are ~70-190 vs 0

# --- Icon vocabulary ---------------------------------------------------------
# Labels are taken verbatim from the deck's own "ICON CHEAT SHEET" (card 46).
USE_LABELS = {
    "digestive": "Digestive",
    "edible": "Edible",
    "wound": "Wound",
    "energy": "Energy",
    "tea": "Tea",
    "lungs": "Lungs",
    "topical": "Topical",
    "calm": "Calm",
    "bone": "Bone",
    "heart": "Heart",
    "immune": "Immune",
    "urinary": "Urinary",
}
SEASONS = {"spring": "Spring", "summer": "Summer", "autumn": "Autumn", "winter": "Winter"}
RARITIES = ["Common", "Uncommon", "Rare", "Epic"]

# XP is assigned by rarity here and consumed by src/lib/progression.ts.
# Keep this table and XP_BY_RARITY in progression.ts in sync.
XP_BY_RARITY = {"Common": 100, "Uncommon": 175, "Rare": 300, "Epic": 500}

# --- Card fronts -------------------------------------------------------------
# (number, commonName, scientificName, rarity, season, [use icons], water, sun, temp)
DECK = [
    (1, "Dandelion", "Taraxacum officinale", "Common", "summer", ["tea", "digestive"], 2, 3, 5),
    (2, "Broadleaf Dock", "Rumex obtusifolius", "Common", "autumn", ["tea", "digestive"], 3, 4, 3),
    (3, "Goldenrod", "Solidago canadensis", "Common", "summer", ["lungs", "urinary"], 2, 5, 4),
    (4, "Ragweed", "Ambrosia artemisiifolia", "Common", "summer", ["tea", "topical"], 2, 5, 4),
    (5, "Lamb's Quarters", "Chenopodium album", "Common", "spring", ["tea", "digestive"], 3, 4, 3),
    (6, "Purslane", "Portulaca oleracea", "Common", "summer", ["heart", "edible"], 2, 5, 4),
    (7, "Garlic Mustard", "Alliaria petiolata", "Common", "spring", ["lungs", "wound"], 3, 3, 3),
    (8, "Stinging Nettle", "Urtica dioica", "Common", "spring", ["tea", "digestive"], 4, 3, 3),
    (9, "Wood Sorrel", "Oxalis stricta", "Common", "spring", ["tea", "digestive"], 3, 3, 3),
    (10, "Red Clover", "Trifolium pratense", "Common", "summer", ["tea", "heart"], 3, 4, 3),
    (11, "Purple Dead Nettle", "Lamium purpureum", "Common", "spring", ["tea", "wound"], 3, 3, 3),
    (12, "Wild Violet", "Viola sororia", "Common", "spring", ["topical", "lungs"], 4, 2, 2),
    (13, "Chickweed", "Stellaria media", "Common", "spring", ["wound", "topical"], 4, 2, 2),
    (14, "Broad Leaf Plantain", "Plantago major", "Common", "spring", ["wound", "topical"], 3, 3, 3),
    (15, "Cleavers", "Galium aparine", "Common", "spring", ["tea", "urinary"], 4, 2, 2),
    (16, "Ground Ivy", "Glechoma hederacea", "Common", "spring", ["lungs", "digestive"], 3, 3, 2),
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
    (27, "Mullein", "Verbascum thapsus", "Uncommon", "summer", ["tea", "lungs"], 2, 5, 4),
    (28, "Horsetail", "Equisetum arvense", "Uncommon", "summer", ["bone", "urinary"], 4, 3, 3),
    (29, "Field Garlic", "Allium vineale", "Uncommon", "spring", ["edible", "immune"], 2, 3, 4),
    (30, "Wild Strawberry", "Fragaria virginiana", "Uncommon", "summer", ["edible", "digestive"], 3, 4, 3),
    (31, "Elderberry", "Sambucus spp.", "Uncommon", "autumn", ["edible", "immune"], 4, 3, 3),
    (32, "St. John's Wort", "Hypericum perforatum", "Uncommon", "summer", ["topical", "calm"], 2, 4, 4),
    (33, "Yarrow", "Achillea millefolium", "Rare", "summer", ["immune", "bone"], 2, 5, 4),
    (34, "Jewelweed", "Impatiens capensis", "Rare", "summer", ["topical", "wound"], 4, 3, 3),
    (35, "Lemon Balm", "Melissa officinalis", "Rare", "summer", ["tea", "calm"], 3, 4, 3),
    (36, "Bee Balm", "Monarda fistulosa", "Rare", "summer", ["tea", "lungs"], 2, 4, 3),
    (37, "Wild Rose", "Rosa spp.", "Rare", "summer", ["topical", "digestive"], 3, 4, 3),
    (38, "Willow", "Salix spp.", "Rare", "spring", ["tea", "bone"], 5, 4, 3),
    (39, "Wild Geranium", "Geranium maculatum", "Rare", "autumn", ["wound", "digestive"], 3, 3, 3),
    (40, "Honeysuckle", "Lonicera japonica", "Rare", "summer", ["immune", "lungs"], 3, 4, 3),
    (41, "Pine", "Pinus spp.", "Rare", "winter", ["lungs", "wound"], 2, 5, 3),
    (42, "Mulberry", "Morus spp.", "Rare", "autumn", ["heart", "energy"], 3, 4, 3),
    (43, "Passion Flower", "Passiflora incarnata", "Epic", "summer", ["edible", "calm"], 3, 4, 3),
    (44, "Prickly Lettuce", "Lactuca serriola", "Epic", "summer", ["edible", "calm"], 2, 4, 4),
    (45, "Oak", "Quercus spp.", "Epic", "summer", ["tea", "digestive"], 3, 4, 3),
]

# --- Card backs --------------------------------------------------------------
# Section names as printed: HEALING TRAITS, SIGNATURE COMPOUNDS, TASTE PROFILE,
# AROMATIC PROFILE, PREPARATIONS, USABLE PARTS.
BACKS = {
    1: (["Anti-inflam.", "Liver support", "Digestive support", "Diuretic", "Astringent", "Antimicrob."], ["Kaempferol", "Taraxasterol", "Quercetin", "Inulin"], ["Bitter", "Peppery", "Mildly sweet"], ["Mild", "Earthy", "Green"], ["Tea", "Tincture", "Roasted roots", "Fresh greens"], ["Root", "Leaf", "Flower"]),
    2: (["Digestive support", "Skin care", "Liver support", "Mild laxative", "Blood purification"], ["Anthraquinones", "Tannins", "Emodin", "Iron"], ["Bitter", "Dry", "Earthy"], ["Mild", "Earthy"], ["Decoction", "Tea", "Tincture", "Cooked root"], ["Leaf", "Stock", "Stalk", "Root"]),
    3: (["Urinary support", "Anti-inflam.", "Mild diuretic", "Allergy support"], ["Quercetin", "Flavonoids", "Rutin", "Saponins"], ["Bitter", "Slightly sweet"], ["Light", "Herbal"], ["Tea", "Tincture", "Infusion"], ["Flower", "Leaf", "Stem"]),
    4: (["Astringent", "Skin care", "Fever aid", "Digestive support"], ["Kaempferol", "Chlorogenic acid", "Quercetin", "Lactones"], ["Bitter", "Acrid"], ["Sharp", "Herbal", "Dry"], ["Tea", "Tincture", "Poultice", "Infusion"], ["Seed", "Leaf", "Flower", "Root"]),
    5: (["Nutrient-rich", "Mineral-rich", "Digestive support", "Skin care"], ["Vitamin C", "Oxalic Acid", "Calcium", "Iron"], ["Mild", "Spinach", "Earthy"], ["Green", "Mild", "Light"], ["Cooked", "Fresh", "Tea", "Infusion"], ["Leaf", "Shoot", "Flower", "Seed"]),
    6: (["Wound support", "Nutrient-rich", "Circulatory", "Skin support"], ["Omega-3", "Magnesium", "Betalains", "Vitamin C"], ["Mild", "Slightly sour", "Succulent"], ["Light", "Green", "Clean"], ["Fresh", "Infusion", "Juice"], ["Leaf", "Shoot", "Flower", "Seed"]),
    7: (["Antiseptic", "Diuretic", "Detoxifying", "Digestive support"], ["Glucosinolates", "Isothiocyanates", "Sinigrin", "Omega-3"], ["Bitter", "Sharp", "Peppery"], ["Pungent", "Tangy"], ["Fresh", "Cooked", "Tea", "Infusion"], ["Root", "Leaf", "Flower", "Shoot"]),
    8: (["Anti-inflam.", "Joint support", "Allergy aid", "Circulatory"], ["Chlorophyll", "Histamine", "Iron", "Silica"], ["Green", "Earthy", "Mineral"], ["Green", "Fresh", "Mild"], ["Tea", "Cooked", "Infusion", "Tincture"], ["Leaf", "Stem", "Root", "Shoot"]),
    9: (["Vitamin-rich", "Appetite support", "Digestive support", "Diuretic", "Cooling"], ["Flavonoids", "Oxalic acid", "Vitamin C", "Potassium"], ["Sour", "Citrus", "Bright"], ["Light", "Fresh", "Green"], ["Fresh", "Tea", "Salad", "Infusion"], ["Leaf", "Flower", "Stem", "Root"]),
    10: (["Hormone support", "Circulatory", "Skin care", "Detoxifying"], ["Isoflavones", "Flavonoids", "Coumarins", "Genistein"], ["Mild", "Sweet", "Grassy"], ["Light", "Floral"], ["Tea", "Tincture", "Infusion", "Salve"], ["Leaf", "Flower", "Stem", "Root"]),
    11: (["Wound support", "Liver support", "Digestive support", "Diuretic", "Astringent", "Antimicrob."], ["Kaempferol", "Taraxasterol", "Quercetin", "Inulin"], ["Bitter", "Peppery", "Mildly sweet"], ["Mild", "Earthy", "Green"], ["Tea", "Tincture", "Roasted roots", "Fresh greens"], ["Root", "Leaf", "Flower"]),
    12: (["Anti-inflam.", "Skin-soothing", "Cooling", "Respiratory support", "Lymphatic support"], ["Rutin", "Anthocyanins", "Mucilage", "Vitamin C"], ["Green", "Sweet", "Minty"], ["Light", "Floral", "Fresh"], ["Tea", "Syrup", "Salve", "Infusion"], ["Leaf", "Flower", "Stem"]),
    13: (["Cooling", "Nutrient-rich", "Skin-soothing", "Mild laxative", "Itch relief"], ["Saponins", "Vitamin C", "Flavonoids", "Iron"], ["Mild", "Fresh", "Slightly sweet"], ["Light", "Green"], ["Salve", "Poultice", "Tea", "Fresh"], ["Shoot", "Leaf", "Flower", "Seed"]),
    14: (["Drawing", "Antimicrob.", "Wound support", "Skin-soothing"], ["Aucubin", "Flavonoids", "Mucilage", "Allantoin"], ["Mild", "Slightly bitter"], ["Green", "Earthy"], ["Poultice", "Salve", "Tea", "Fresh"], ["Leaf", "Seed", "Stem", "Root"]),
    15: (["Diuretic", "Detoxifying", "Lymphatic support", "Skin care", "Blood purification"], ["Iridoids", "Coumarins", "Glycosides", "Flavonoids"], ["Mild", "Green"], ["Light", "Fresh"], ["Tea", "Juice", "Fresh", "Infusion"], ["Leaf", "Shoot", "Seed"]),
    16: (["Digestive support", "Circulatory", "Respiratory", "Expectorant"], ["Rosmarinic acid", "Ursolic acid", "Tannins", "Flavonoids"], ["Bitter", "Minty", "Herbal"], ["Fresh", "Minty", "Green"], ["Tea", "Infusion", "Tincture", "Fresh"], ["Leaf", "Stem", "Flower", "Shoot"]),
    17: (["Antioxidant", "Nutrient-rich", "Circulatory", "Glucose regulation"], ["Quebecol", "Gallic acid", "Catechins", "Sucrose"], ["Sweet", "Mild"], ["Sweet", "Woody", "Light"], ["Sap", "Syrup", "Tea", "Infusion"], ["Sap", "Leaf", "Bark"]),
    18: (["Antioxidant", "Gut support", "Digestive support", "Astringent"], ["Anthocyanins", "Ellagic acid", "Vitamin C", "Flavonoids"], ["Sugary", "Tart", "Juicy"], ["Fruity", "Rich", "Sweet"], ["Fresh", "Cooked", "Infusion", "Tea"], ["Fruit", "Leaf", "Root", "Flower"]),
    19: (["Cooling", "Circulatory", "Digestive support", "Diuretic"], ["Oxalic Acid", "Anthraquinones", "Tannins", "Flavonoids"], ["Sour", "Tangy", "Zesty"], ["Light", "Fresh", "Green"], ["Fresh", "Tea", "Infusion"], ["Leaf", "Stem", "Flower", "Seed"]),
    20: (["Antimicrobial", "Anti-inflam.", "Glucose regulation", "Astringent"], ["Phenolic acid", "Anthocyanins", "Gallic acid", "Tannins"], ["Sour", "Lemony", "Tangy"], ["Bright", "Fruity", "Zesty"], ["Tea", "Infusion", "Spice", "Cold soak"], ["Berry", "Bark"]),
    21: (["Digestive support", "Laxative", "Liver support", "Prebiotic"], ["Lactucopicrin", "Sesquiterpene lactones", "Inulin", "Lactucin"], ["Bitter", "Nutty", "Roasted"], ["Toasty", "Coffee", "Earthy"], ["Tea", "Decoction", "Tincture", "Roasted"], ["Root", "Leaf", "Flower"]),
    22: (["Detoxifying", "Liver support", "Skin care", "Anti-inflam.", "Digestive support"], ["Polyphenols", "Lignans", "Arctiin", "Inulin"], ["Bitter", "Earthy", "Slightly sweet"], ["Mild", "Earthy"], ["Decoction", "Tea", "Tincture", "Cooked root"], ["Root", "Leaf", "Seed", "Stem"]),
    23: (["Digestive support", "Nausea aid", "Cooling", "Headache support"], ["Menthol", "Menthone", "Rosmarinic acid", "Limonene"], ["Cool", "Minty", "Sharp"], ["Strong", "Cooling", "Fresh"], ["Tea", "Infusion", "Oil", "Fresh"], ["Leaf", "Stem", "Flower"]),
    24: (["Antimicrobial", "Anti-inflam.", "Glucose regulation", "Astringent"], ["Phenolic acid", "Anthocyanins", "Gallic acid", "Tannins"], ["Sour", "Lemony", "Tangy"], ["Bright", "Fruity", "Zesty"], ["Tea", "Infusion", "Spice", "Cold soak"], ["Leaf", "Flower", "Stem"]),
    25: (["Circulatory", "Menstrual support", "Wound support", "Astringent"], ["Fumaric acid", "Choline", "Flavonoids", "Tyramine"], ["Mild", "Peppery", "Green"], ["Light", "Herbal", "Fresh"], ["Tincture", "Tea", "Infusion", "Fresh"], ["Leaf", "Stem", "Flower", "Root"]),
    26: (["Wound support", "Antimicrobial", "Anti-inflam.", "Immune boost"], ["Rosmarinic acid", "Ursolic acid", "Tannins", "Flavonoids"], ["Mild", "Slightly bitter"], ["Light", "Herbal"], ["Tea", "Infusion", "Salve", "Tincture"], ["Leaf", "Flower", "Stem"]),
    27: (["Anti-inflam.", "Expectorant", "Respiratory support", "Soothing"], ["Mucilage", "Verbascoside", "Saponins", "Iridoids"], ["Mild", "Slightly bitter"], ["Light", "Soft", "Herbal"], ["Tea", "Infusion", "Oil", "Tincture"], ["Leaf", "Flower", "Root"]),
    28: (["Diuretic", "Keratin support", "Bone support", "Urinary support"], ["Silica", "Flavonoids", "Saponins", "Alkaloids"], ["Mild", "Earthy", "Slightly bitter"], ["Light", "Green", "Mineral"], ["Tea", "Decoction", "Infusion"], ["Shoot"]),
    29: (["Antimicrobial", "Immune boost", "Digestive support", "Circulatory"], ["Flavonoids", "Sulfur compounds", "Phenolics", "Allicin"], ["Pungent", "Garlic", "Sharp"], ["Strong", "Sulfurous", "Pungent"], ["Fresh", "Cooked", "Tincture"], ["Bulb", "Leaf", "Flower", "Shoot"]),
    30: (["Digestive support", "Oral health", "Astringent", "Skin care"], ["Vitamin C", "Flavonoids", "Ellagic acid", "Tannins"], ["Sweet", "Mild", "Slightly tart"], ["Light", "Fruity", "Fresh"], ["Tea", "Infusion", "Fresh"], ["Fruit", "Leaf", "Flower"]),
    31: (["Antimicrobial", "Anti-inflam.", "Glucose regulation", "Astringent"], ["Phenolic acid", "Anthocyanins", "Gallic acid", "Tannins"], ["Sour", "Lemony", "Tangy"], ["Bright", "Fruity", "Zesty"], ["Tea", "Infusion", "Spice", "Cold soak"], ["Berry", "Bark"]),
    32: (["Wound aid", "Menopause aid", "Nervous system aid", "Mood aid"], ["Hypericin", "Hyperforin", "Flavonoids", "Quercetin"], ["Bitter", "Slightly astringent"], ["Mild", "Herbal", "Dry"], ["Tea", "Tincture", "Oil", "Infusion"], ["Leaf", "Flower"]),
    33: (["Circulatory", "Fever aid", "Wound support", "Antimicrob.", "Anti-inflam."], ["Flavonoids", "Volatile oils", "Achilleine", "Azulene"], ["Bitter", "Bold", "Licorice"], ["Sharp", "Herbal", "Bitter"], ["Tea", "Tincture", "Salve", "Poultice"], ["Leaf", "Flower", "Stem"]),
    34: (["Skin care", "Itch relief", "Anti-fungal", "Wound support"], ["Flavonoids", "Phenolic acid", "Lawsone", "Saponins"], ["Mild", "Green"], ["Light", "Fresh", "Cool"], ["Cooked", "Poultice", "Salve", "Infusion"], ["Leaf", "Stem", "Flower", "Seed"]),
    35: (["Calming", "Digestive support", "Mood support", "Antiviral"], ["Citral", "Citronellal", "Rosmarinic acid", "Flavonoids"], ["Lemony", "Mild", "Sweet"], ["Citrus", "Bright", "Uplifting"], ["Tea", "Infusion", "Tincture", "Fresh"], ["Leaf", "Flower", "Stem"]),
    36: (["Anti-inflam.", "Digestive support", "Respiratory support", "Skin care"], ["Thymol", "Carvacrol", "Rosmarinic acid", "Flavonoids"], ["Minty", "Spicy", "Herbal"], ["Warm", "Sharp", "Resinous"], ["Tea", "Infusion", "Tincture", "Oil"], ["Leaf", "Flower", "Stem"]),
    37: (["Antioxidant", "Circulatory", "Skin care", "Digestive support"], ["Vitamin C", "Flavonoids", "Tannins", "Carotenoids"], ["Sweet", "Floral", "Slightly tart"], ["Floral", "Sweet", "Rich"], ["Tea", "Syrup", "Infusion", "Fresh"], ["Petal", "Hip", "Leaf", "Shoot"]),
    38: (["Pain-relief", "Fever aid", "Anti-inflam.", "Astringent"], ["Sallicin", "Vitamin C", "Salicortin", "Tremulacin"], ["Very bitter", "Sharp", "Tart"], ["Earthy", "Woody", "Green"], ["Decoction", "Tincture", "Powder", "Extract"], ["Bark", "Twigs"]),
    39: (["Digestive support", "Circulatory", "Astringent", "Wound support"], ["Tannins", "Gallic acid", "Geraniin", "Flavonoids"], ["Bitter", "Dry", "Astringent"], ["Mild", "Earthy", "Herbal"], ["Decoction", "Tea", "Tincture"], ["Root", "Leaf", "Flower"]),
    40: (["Respiratory support", "Antiviral", "Antimicrobial", "Immune boost"], ["Chlorogenic acid", "Saponins", "Quercetin", "Flavonoids"], ["Honey", "Light", "Dewy"], ["Floral", "Sweet", "Nectar"], ["Tea", "Infusion", "Syrup"], ["Flower", "Leaf", "Stem"]),
    41: (["Expectorant", "Immune boost", "Respiratory support", "Drawing"], ["Vitamin C", "Flavonoids", "Pinene", "Terpenes"], ["Citrus", "Fresh", "Resinous"], ["Strong", "Sharp", "Woody"], ["Tea", "Steam", "Syrup", "Infusion"], ["Needle", "Resin", "Cone", "Shoot"]),
    42: (["Antioxidant", "Liver support", "Glucose regulation", "Circulatory"], ["Resveratrol", "Anthocyanins", "Vitamin C", "Flavonoids"], ["Sweet", "Juicy", "Mildly tart"], ["Light", "Fruity", "Fresh"], ["Fresh", "Tea", "Syrup", "Infusion"], ["Fruit", "Leaf", "Bark"]),
    43: (["Calming", "Nervous system", "Sleep support", "Anti-anxiety"], ["Harmine", "Harmaline", "Flavonoids", "Vitexin"], ["Mild", "Slightly bitter", "Herbal"], ["Light", "Floral", "Green"], ["Tea", "Tincture", "Infusion"], ["Leaf", "Flower", "Fruit"]),
    44: (["Pain relief", "Sleep support", "Calming", "Nervous system"], ["Sesquiterpene lactones", "Lactucopicrin", "Lactucin"], ["Bitter", "Sharp"], ["Mild", "Green"], ["Tincture", "Tea", "Infusion"], ["Leaf", "Stem", "Seed"]),
    45: (["Skin care", "Astringent", "Oral health", "Wound support"], ["Ellagic acid", "Quercetin", "Tannins", "Catechins"], ["Astringent", "Bitter", "Dry"], ["Woody", "Earthy", "Dry"], ["Decoction", "Powder", "Infusion"], ["Bark", "Nut", "Leaf"]),
}

# Warnings printed on the card itself. Only card 33 carries one; every other back was
# checked programmatically for footer text and found to have none.
CARD_WARNINGS = {33: "Beware: this plant has a poisonous lookalike."}

# Problems with the printed cards, recorded so they are not mistaken for transcription
# slips and can be fixed in a future print run. The data above matches the cards as
# printed; nothing here is silently corrected.
KNOWN_CARD_ISSUES = {
    2: "Usable parts list both 'Stock' and 'Stalk'; one is likely a typo.",
    11: "Back duplicates Dandelion (card 1): Taraxasterol, Inulin and 'Roasted roots' belong to Taraxacum, not Lamium purpureum.",
    24: "Back duplicates Sumac (card 20); Catnip's own profile (nepetalactone, calming) is absent.",
    31: "Back duplicates Sumac (card 20); Elderberry's own profile is absent.",
    38: "'Sallicin' is likely a typo for 'Salicin'.",
}

# Cards that are not herbs. Their backs carry the deck's icon legend and disclaimer.
NON_HERB_CARDS = {46: "Icon Guide", 47: "Disclaimer"}

# Verbatim from card 47.
DISCLAIMER = {
    "main": (
        "This deck is for educational purposes only and is not intended to diagnose, "
        "treat, cure, or prevent any disease. Always properly identify plants before use "
        "and consult a qualified healthcare professional before using any herbal "
        "remedies, especially if you are pregnant, nursing, taking medication, or have a "
        "medical condition. Some plants may cause allergic reactions or toxicity if "
        "misused."
    ),
    "availability": (
        "Plant availability may vary by region. This deck focuses on species commonly "
        "found across much of the United States."
    ),
    "encounterRate": (
        "Encounter rate reflects how commonly a plant is found in typical environments "
        "such as yards, roadsides, and local habitats. All plants in this deck are "
        "relatively common, but some are encountered more frequently than others."
    ),
}


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


def render(page, width: int) -> Image.Image:
    zoom = width / page.rect.width
    pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom))
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def find_sources(source: Path) -> dict[int, Path]:
    """Map card number -> PDF path. Filenames must end in the card number."""
    found: dict[int, Path] = {}
    for path in sorted(source.glob("*.pdf")):
        match = re.search(r"(\d+)\.pdf$", path.name)
        if not match:
            continue
        number = int(match.group(1))
        if number in found:
            raise SystemExit(f"Two PDFs both look like card {number}: {found[number]}, {path}")
        found[number] = path
    return found


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--source",
        required=True,
        type=Path,
        help="Directory of two-page per-card PDFs (page 1 front, page 2 back).",
    )
    ap.add_argument("--skip-art", action="store_true", help="Rebuild JSON only.")
    args = ap.parse_args()

    if not args.source.is_dir():
        print(f"Not a directory: {args.source}", file=sys.stderr)
        return 1

    sources = find_sources(args.source)
    OUT_ART.mkdir(parents=True, exist_ok=True)
    (OUT_ART / "thumb").mkdir(parents=True, exist_ok=True)
    (OUT_ART / "back").mkdir(parents=True, exist_ok=True)
    (OUT_ART / "sprite").mkdir(parents=True, exist_ok=True)
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)

    herbs, seen_ids, problems = [], set(), []

    for (num, common, sci, rarity, season, uses, w, s, t) in DECK:
        pdf_path = sources.get(num)
        if pdf_path is None:
            problems.append(f"#{num} {common}: no source PDF found")
            continue

        doc = pymupdf.open(pdf_path)
        if doc.page_count < 2:
            problems.append(f"#{num} {common}: expected 2 pages, got {doc.page_count}")
            doc.close()
            continue

        # Re-derive the stats from the artwork and hold the table to them.
        check_img = render(doc[0], 356)
        for kind, expected in (("water", w), ("sun", s), ("temp", t)):
            actual = count_stat(check_img, kind)
            if actual != expected:
                problems.append(
                    f"#{num} {common}: {kind} table says {expected}, card shows {actual}"
                )

        if rarity not in RARITIES:
            problems.append(f"#{num} {common}: unknown rarity {rarity!r}")
        if season not in SEASONS:
            problems.append(f"#{num} {common}: unknown season {season!r}")
        for u in uses:
            if u not in USE_LABELS:
                problems.append(f"#{num} {common}: unknown use icon {u!r}")
        if num not in BACKS:
            problems.append(f"#{num} {common}: no back-of-card data")

        herb_id = slugify(sci)
        if herb_id in seen_ids:
            problems.append(f"#{num} {common}: duplicate id {herb_id!r}")
        seen_ids.add(herb_id)

        if not args.skip_art:
            render(doc[0], FULL_WIDTH).save(OUT_ART / f"{herb_id}.webp", "WEBP", quality=84, method=6)
            render(doc[0], THUMB_WIDTH).save(OUT_ART / "thumb" / f"{herb_id}.webp", "WEBP", quality=80, method=6)
            render(doc[1], FULL_WIDTH).save(OUT_ART / "back" / f"{herb_id}.webp", "WEBP", quality=84, method=6)
            sprite = check_img.crop(SPRITE_BOX)
            sprite = sprite.resize(
                (sprite.width * SPRITE_SCALE, sprite.height * SPRITE_SCALE), Image.NEAREST
            )
            sprite.save(OUT_ART / "sprite" / f"{herb_id}.webp", "WEBP", quality=90, method=6)
        doc.close()

        traits, compounds, taste, aromatic, preparations, parts = BACKS.get(
            num, ([], [], [], [], [], [])
        )

        entry = {
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
            "backImage": f"/cards/back/{herb_id}.webp",
            "sprite": f"/cards/sprite/{herb_id}.webp",
            # Provenance for everything above: it is transcribed from this physical card.
            # Curated references are added to src/data/sources.json by hand and attached
            # per section; nothing here is generated or guessed.
            "sources": [
                {"sourceId": "plantdex-deck", "detail": f"Card #{num:02d}, front and back"}
            ],
            "back": {
                "healingTraits": traits,
                "compounds": compounds,
                "taste": taste,
                "aromatic": aromatic,
                "preparations": preparations,
                "usableParts": parts,
            },
        }
        if num in CARD_WARNINGS:
            entry["warning"] = CARD_WARNINGS[num]
        herbs.append(entry)

    if problems:
        print("Deck build failed:", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        return 1

    payload = {
        "$comment": (
            "GENERATED by scripts/build_deck.py from the Plantdex per-card print PDFs. "
            "Do not hand-edit; edit the DECK/BACKS tables in that script and re-run. "
            "All content is transcribed from the physical cards, including their errors "
            "(see knownCardIssues)."
        ),
        "deckName": "Plantdex",
        # The printed deck is Plantdex Collection 01. Emitted so a future second deck can
        # be generated with its own id rather than the app assuming there is only ever one.
        # src/lib/collection.ts falls back to Collection 01 when this is absent, so decks
        # generated before this existed keep working unchanged.
        "collectionId": "collection-01",
        "collectionName": "Plantdex Collection 01",
        "deckSize": len(herbs),
        "nonHerbCards": [{"cardNumber": n, "title": t} for n, t in sorted(NON_HERB_CARDS.items())],
        "useLabels": USE_LABELS,
        "seasonLabels": SEASONS,
        "disclaimer": DISCLAIMER,
        "knownCardIssues": {str(k): v for k, v in sorted(KNOWN_CARD_ISSUES.items())},
        "herbs": herbs,
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    total_xp = sum(h["xp"] for h in herbs)
    print(f"Wrote {OUT_JSON.relative_to(REPO)} — {len(herbs)} herbs, {total_xp} XP total.")
    if not args.skip_art:
        print(f"Wrote card art to {OUT_ART.relative_to(REPO)}/ (front, thumb, back).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
