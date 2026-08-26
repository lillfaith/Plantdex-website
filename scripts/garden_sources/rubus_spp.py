"""Blackberry (Rubus spp.) — Garden growth sprite.

GROWTH HABIT: a bramble does not stand up and it does not spread flat. It throws a single
long cane that ARCHES over and lets its tip hang, and that arch is the silhouette — you can
identify a bramble thicket from across a field without seeing one leaf. Dandelion stays low,
yarrow goes straight up, pine builds a trunk; this one draws a curve. Four species, four
different shapes, which is the entire reason the Garden stopped scaling one portrait.

  sprout    a single toothed leaf on a short cane, with its first prickle
  growing   the arching cane, leaves hanging off it, prickles on the underside
  flowering the same arch carrying a white five-petalled flower and a berry cluster

THE PRICKLES ARE PART OF THE IDENTIFICATION, not decoration. They are why the plant is
drawn with them from stage one — a bramble you could walk through is a different plant. They
sit on the OUTSIDE of the curve and on the underside of the cane, where they actually grow,
and they are drawn pale so they read against the dark cane rather than disappearing into it.

THE BERRIES ARE BLACK, AND ONLY AT THE LAST STAGE. Ripeness is the one thing a picture of
this plant can get dangerously wrong, so there is no half-red cluster earlier in the sequence
implying something is ready. Nothing here is an edibility cue: the card and the safety notice
are where that lives, and this is a plant in a garden, not a harvest.

The cane is purple-red rather than green, which is true of a first-year bramble cane and is
also what keeps the arch legible against the foliage hanging off it.
"""

PALETTE = {
    "o": (74, 48, 92, 255),      # shared outline
    "G": (140, 182, 132, 255),   # leaf light — a cooler green than yarrow's grey-green
    "g": (100, 142, 102, 255),   # leaf mid
    "d": (68, 102, 76, 255),     # leaf dark
    "C": (146, 104, 124, 255),   # cane — purple-red, as a first-year cane really is
    "k": (232, 206, 220, 255),   # prickle, pale so it reads against the cane
    "W": (250, 246, 244, 255),   # petal
    "y": (246, 222, 150, 255),   # flower centre
    "B": (46, 30, 58, 255),      # berry, near-black
    "b": (156, 116, 186, 255),   # drupelet highlight — the berry sits on a near-black ground,
                                 # so without this the whole cluster disappears into it
}

# One toothed leaf, a short cane and the first prickle. The serrated margin is drawn as
# alternating notches — a smooth blade at this size would read as some other plant entirely.
SPROUT = [
    " o o o ",
    "oGoGoGo",
    "oGgGgGo",
    " ogdgo ",
    "  odo  ",
    "  oCo  ",
    " koCo  ",
    "  ooo  ",
]

# The arch: up from the ground on the left, over, and down to a hanging tip on the right.
# Leaves hang from the apex and from the lower limb; prickles ride the outside of the curve,
# which is where they grow and also where they are legible.
GROWING = [
    "        oCCCCo    ",
    "      oCCooCoCCok ",
    "     oCo  oCo oCo ",
    "    oCo  o o o oCo",
    "   oCo  oGoGoGooCo",
    "  koCo  oGgGgGooCo",
    "  oCo    ogdgo oCo",
    "  oCoo o oodo     ",
    "  oCoGoGoGo       ",
    "  oCoGgGgGo       ",
    "  oCoogdgo        ",
    "  oCo odo         ",
    "  ooo             ",
]

# The same arch, now carrying one open flower under the apex and a berry cluster hanging at
# the tip — which is where a bramble actually fruits.
FLOWERING = [
    "        oCCCCo     ",
    "      oCCooCoCCok  ",
    "     oCo  oCo oCo  ",
    "    oCo   ooo  oCo ",
    "   oCo   oWyWo oCo ",
    "  koCo   oWWWo oCo ",
    "  oCo     ooo  oCo ",
    "  oCoo o o     ooo ",
    "  oCoGoGoGo   oBbBo",
    "  oCoGgGgGo   oBBBo",
    "  oCoogdgo    obBbo",
    "  oCo odo      ooo ",
    "  ooo              ",
]

GARDEN = {
    "herbId": "rubus-spp",
    "palette": PALETTE,
    "note": "Arching cane with prickles from stage 1. Black fruit only at the last stage.",
    "stages": {
        "sprout": SPROUT,
        "growing": GROWING,
        "flowering": FLOWERING,
    },
}
