"""Dandelion (Taraxacum officinale) — Garden growth sprite.

GROWTH HABIT: a basal rosette. Dandelion has no upright leafy stem at all — the leaves lie
flat in a circle at ground level, and the only thing that rises is a bare hollow scape with
a single flower on it. So this sequence spreads sideways before it goes up, which is the
opposite of the yarrow beside it and exactly the difference the Garden should show.

  sprout    the first true leaves — a pair, already toothed, close to the soil
  growing   the full rosette, leaves lying flat and radiating outward
  flowering the rosette with one hollow scape and the golden head on top

THE IDENTIFYING TRAIT IS THE TOOTH. "Dent de lion" is the name and the backward-pointing
lobes are what tells a dandelion from a cat's ear or a sow thistle in a lawn, so the teeth
are drawn as actual notches from the very first stage rather than implied by a smooth blade.
The flower is a solid gold disc, not a daisy with separate petals: at this size the ray
florets read as a single mass, and drawing petal gaps would make it a different plant.

The palette is lifted from the species' own portrait so the Garden and the Herbdex are
visibly the same universe.
"""

PALETTE = {
    "o": (74, 48, 92, 255),      # shared outline — the same plum every Garden sprite uses
    "G": (204, 225, 100, 255),   # leaf light
    "g": (160, 186, 72, 255),    # leaf mid
    "d": (113, 137, 53, 255),    # leaf dark
    "S": (150, 176, 68, 255),    # scape (hollow stem)
    "H": (250, 234, 191, 255),   # floret highlight
    "M": (230, 198, 123, 255),   # floret mid
    "D": (222, 166, 81, 255),    # floret deep
}

# One pair of true leaves, already showing their teeth. Small, hugging the ground.
SPROUT = [
    "   o o   ",
    "  ogog   ",
    " odGGdo  ",
    "ogGgGGgo ",
    " odgddo  ",
    "   ogo   ",
    "   ooo   ",
]

# The rosette: leaves radiating flat, longest at the sides, deeply notched along both
# edges. Read as a circle seen from slightly above.
GROWING = [
    "     o   o   o     ",
    "    ogo ogo ogo    ",
    "  oodGoodGoodGoo   ",
    " odGGgdGGgdGGgdo   ",
    "odGgGGgGGgGGgGGgdo ",
    " odggdggdggdggddo  ",
    "  oddgdddgdddgddo  ",
    "   ooddddddddoo    ",
    "     oooooooo      ",
]

# The rosette holds; one bare scape rises from its centre and carries the head. The scape
# is deliberately LEAFLESS — a dandelion's flowering stem carries nothing, which is half of
# how you tell it from the things it grows beside.
FLOWERING = [
    "      oooooo      ",
    "     oHHMMHHo     ",
    "    oHMMDDMMHo    ",
    "   oHMDDMMDDMHo   ",
    "   oMDMMHHMMDMo   ",
    "   oHMDDMMDDMHo   ",
    "    oHMMDDMMHo    ",
    "     oHHMMHHo     ",
    "      oooooo      ",
    "        So        ",
    "        So        ",
    "        So        ",
    "        So        ",
    "     o  So  o     ",
    "    ogo So ogo    ",
    "  oodGooSooGdoo   ",
    " odGGgdGSGdGGgdo  ",
    "odGgGGgGGgGGgGGgdo",
    " odggdggdggdggddo ",
    "  oddgdddgdddgddo ",
    "   ooddddddddoo   ",
    "     oooooooo     ",
]

GARDEN = {
    "herbId": "taraxacum-officinale",
    "palette": PALETTE,
    "note": "Basal rosette; spreads before it rises. Leafless scape carries a solid gold head.",
    "stages": {
        "sprout": SPROUT,
        "growing": GROWING,
        "flowering": FLOWERING,
    },
}
