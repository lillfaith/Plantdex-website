"""Wild Violet (Viola sororia) — Garden growth sprite.

GROWTH HABIT: a low clump, and — like dandelion — stemless. Both leaves and flowers rise
on their own stalks straight from the ground, so a violet never builds an upright leafy
stem the way yarrow does. It stays short and gets DENSER rather than taller, which is the
progression drawn here.

  sprout    one heart-shaped leaf on its own stalk
  growing   three leaves on three stalks, at three heights
  flowering the same clump with two flowers held on stalks of their own, clear of the leaves

THE HEART IS THE IDENTIFYING TRAIT, so every stage has one: a broad notched base tapering
to a blunt tip. It is what separates a violet from the round-leaved things it grows among,
and it is legible even at the seven pixels the sprout gets.

THE FLOWER'S ASYMMETRY IS THE OTHER HALF. A violet is not a five-point star — it has two
upper petals that stand apart, two side petals, and one broad lower lip with a pale throat.
Drawn as an even rosette it would read as a generic blossom, so the top is NOTCHED between
the two upper petals, the throat is a lighter pixel, and the lip below is shaded wider than
the rest. That is the whole difference between "a violet" and "a purple flower".

Flowers sit just ABOVE the leaves rather than buried in them: that is how the plant looks
when it is actually worth noticing, and it is what makes the mature stage feel earned.
"""

PALETTE = {
    "o": (74, 48, 92, 255),      # shared outline
    "G": (150, 196, 118, 255),   # leaf light
    "g": (110, 156, 90, 255),    # leaf mid
    "d": (74, 112, 66, 255),     # leaf dark
    "S": (120, 160, 96, 255),    # stalk
    "V": (150, 122, 214, 255),   # petal
    "p": (100, 76, 168, 255),    # lower lip, shaded so the flower is not a flat disc
    "y": (250, 238, 176, 255),   # throat
}

# One heart-shaped leaf, already notched at the base.
SPROUT = [
    "  ooo  ",
    " oGGGo ",
    "oGGgGGo",
    "oGgdgGo",
    " odgdo ",
    "  oSo  ",
    "  oSo  ",
    "  ooo  ",
]

# Three leaves, OVERLAPPING, on stalks that are short. Both halves of that matter. A violet
# leaf is large next to the stalk that carries it and the leaves crowd each other, so drawn
# with long thin stalks and clear air between them the same three leaves read as three little
# trees — which is what the first attempt did. Density is the plant.
GROWING = [
    "     ooo     ",
    "    oGGGo    ",
    "  oooGgGGo   ",
    " oGGGodgooo  ",
    "oGGgGGooGGGo ",
    "oGgdgGoGGgGGo",
    " odgdooGgdgGo",
    "  oSooSodgdo ",
    "  oSoooo oSo ",
    "  ooo    ooo ",
]

# The clump in flower: two blooms on stalks of their own, held just clear of the leaves and
# rising from the same crown at ground level, which is how a stemless plant holds them. Just
# clear — not on poles. The flowers are a violet's reward, not its silhouette.
FLOWERING = [
    "            o o  ",
    "   o o     oVoVo ",
    "  oVoVo   oVVyVVo",
    " oVVyVVo  oVpppVo",
    " oVpppVo   ooooo ",
    "  ooooo     oSo  ",
    "   oSo      oSo  ",
    "   oSo      oSo  ",
    "   oSo ooo  oSo  ",
    "   oSooGGGo oSo  ",
    "  ooooGGgGGoooo  ",
    " oGGGoGgdgGoGGGo ",
    "oGGgGGodgdoGGgGGo",
    "oGgdgGooSooGgdgGo",
    " odgdo oSo odgdo ",
    "  oSo  oSo  oSo  ",
    "  oSo  oSo  oSo  ",
    "  ooo  ooo  ooo  ",
]

GARDEN = {
    "herbId": "viola-sororia",
    "palette": PALETTE,
    "note": "Stemless clump. Heart leaves from stage 1; flowers held just above them at stage 3.",
    "stages": {
        "sprout": SPROUT,
        "growing": GROWING,
        "flowering": FLOWERING,
    },
}
