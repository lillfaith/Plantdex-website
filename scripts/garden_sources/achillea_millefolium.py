"""Yarrow (Achillea millefolium) — Garden growth sprite.

GROWTH HABIT: an upright stem carrying finely divided leaves, topped by a FLAT-TOPPED
cluster. Where dandelion spreads sideways and stays low, yarrow goes straight up and holds
its flowers in one wide plate — put the two side by side in the Garden and the difference
in habit is the first thing you see, before either name is read.

  sprout    a single feathery shoot, already showing side-branchlets
  growing   the upright stem with paired feathery leaves down its length
  flowering the same stem topped by the flat white corymb

"MILLEFOLIUM" IS A THOUSAND LEAVES, and the featheriness is the identifying trait — it is
what separates yarrow from poison hemlock, which the card's printed warning is about. At 24
pixels a truly dissected leaf turns to mush, so each leaf is drawn as a midrib with single
pixels stepping off both sides: the eye reads that as finely cut, which is the honest
compression rather than a smooth blade that would read as the wrong plant entirely.

The head is FLAT ON TOP and slightly domed underneath, because that silhouette is the other
half of the identification. Cream rather than pure white, so it sits on the dark plum ground
without glaring.
"""

PALETTE = {
    "o": (74, 48, 92, 255),      # shared outline
    "G": (176, 198, 138, 255),   # leaf light — yarrow's grey-green, not dandelion's yellow-green
    "g": (132, 158, 104, 255),   # leaf mid
    "d": (94, 118, 74, 255),     # leaf dark / stem shadow
    "S": (146, 170, 112, 255),   # stem
    "W": (250, 248, 238, 255),   # floret highlight
    "C": (226, 220, 200, 255),   # floret cream
    "u": (186, 180, 162, 255),   # floret underside
}

# One shoot. Even this early the leaf is cut rather than entire.
SPROUT = [
    "  o o  ",
    " oGoGo ",
    "ogdGdgo",
    " odSdo ",
    "  oSo  ",
    "  oSo  ",
    "  ooo  ",
]

# Upright, with pairs of feathery leaves stepping off the stem. Taller than it is wide,
# which is the shape of the plant.
GROWING = [
    "     ooo     ",
    "    oGdGo    ",
    "   ogdSdgo   ",
    "    odSdo    ",
    "  o  oSo  o  ",
    " oGo oSo oGo ",
    "ogdGooSoogdgo",
    " odgdoSodgdo ",
    "   odoSodo   ",
    "  o   S   o  ",
    " oGo  S  oGo ",
    "ogdGooSoogdgo",
    " odgdoSodgdo ",
    "   od oSdo   ",
    "      S      ",
    "     oSo     ",
    "     ooo     ",
]

# The corymb: flat across the top, domed below, sitting on the same stem and foliage.
FLOWERING = [
    "  ooooooooooooo  ",
    " oWWCWWCWWCWWCWo ",
    " oCWCCWCCWCCWCCo ",
    "  ouCuuCuuCuuCo  ",
    "   oouuuuuuuoo   ",
    "      odSdo      ",
    "       oSo       ",
    "   o   oSo   o   ",
    "  oGo  oSo  oGo  ",
    " ogdGo oSo oGdgo ",
    "  odgdooSoodgdo  ",
    "    odooSoodo    ",
    "   o    S    o   ",
    "  oGo   S   oGo  ",
    " ogdGo  S  oGdgo ",
    "  odgdooSoodgdo  ",
    "    odooSoodo    ",
    "        S        ",
    "       oSo       ",
    "       ooo       ",
]

GARDEN = {
    "herbId": "achillea-millefolium",
    "palette": PALETTE,
    "note": "Upright stem, finely cut leaves, flat-topped cream corymb. Feathery from stage 1.",
    "stages": {
        "sprout": SPROUT,
        "growing": GROWING,
        "flowering": FLOWERING,
    },
}
