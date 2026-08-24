"""Oak (Quercus spp.) - creature portrait sprite.

THE DESIGN HOOK: an oak supports more other species than any other tree in its range -
hundreds of insects, and everything that eats those. It is the thing other things live
on, and it does that for three or four hundred years. Its acorn is the most recognisable
seed in the northern hemisphere and the whole tree is in it.

This is the last card in the deck and one of its three Epics, so it gets the ending: the
tree drops an acorn, the acorn sprouts, and the oak looks at what it has started. It is
the only sprite whose gesture produces another living thing, and the only one that ends
its loop with two creatures in frame where there was one.

WHERE THE FACE GOES: in the crown, high and central - the only face in the deck placed
where you would put a portrait rather than where the plant's structure forced it.

PERSONALITY: patriarchal, in the literal sense of the word. Its trademark gesture is THE
ACORN, and everything about the timing is slow: it is a tree, and it has time.

Deliberately not the maple's drop, though both release a seed: the maple's spins away out
of frame and the tree watches it go, and this one lands, stays, and becomes something.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

import math

from _face import FACE_PALETTE, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "G": (140, 186, 108, 255),   # canopy highlight
    "g": (98, 146, 84, 255),     # canopy mid
    "d": (66, 108, 62, 255),     # canopy deep
    "n": (44, 78, 48, 255),      # canopy shadow
    "T": (168, 128, 92, 255),    # trunk light
    "t": (122, 90, 64, 255),     # trunk dark
    "A": (206, 162, 104, 255),   # acorn nut
    "a": (158, 118, 72, 255),    # acorn shade
    "C": (128, 94, 62, 255),     # acorn cup
    "S": (170, 214, 130, 255),   # the sprout - brighter than the canopy, so it reads new
}

HEAD_W, HEAD_H = 23, 17


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    """The crown, cut into seven deep ROUNDED lobes.

    An oak leaf's lobes are round-ended with smooth deep sinuses between them, which is
    exactly the thing that tells it from a maple's points - so the crown is cut the same
    way, and the whole tree carries its own leaf shape. Shallower and it was a lumpy
    circle that could have been any tree in the deck.
    """
    return flower_head(
        HEAD_W, HEAD_H, 11.0, 8.0, 10.4, 7.6, 7, 0.26, 5.4, 4.4,
        face_dx=face_dx, phase=-math.pi / 2, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.6, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.6, light=(-1.25, -0.65))

# The acorn, and it is deliberately the biggest single prop in the deck. This is the most
# recognisable seed in the northern hemisphere and at five pixels across it was reading as
# a bead; at nine it reads as an acorn from the other side of the room. The cup is
# cross-hatched, which is the texture everybody has run a thumb over.
ACORN = [
    " ooooooo ",
    "oCcCcCcCo",
    "oCCcCcCCo",
    "oCcCcCcCo",
    "ooAAAAAoo",
    " oAAAAAo",
    " oAAAaao",
    "  oAaao",
    "   ooo",
    "   oto",
]

ACORN_NONE = [
    " ",
]

# The acorn on the ground, split, with the first shoot out of it. Two stages, because a
# seed that went straight from whole to seedling would be a substitution rather than a
# germination.
SPLIT = [
    "oCoCo",
    "oAoAo",
    " ooo",
]

SPROUT_SMALL = [
    " S ",
    "oSo",
    "oCo",
]

SPROUT = [
    "S S",
    "oSo",
    " S ",
    "oSo",
    "oCo",
]

SPROUT_NONE = [
    " ",
]

# The trunk. The widest in the deck by some way, because that is the difference between
# an oak and everything else standing next to it - and it runs UP INTO the canopy rather
# than stopping short of it, which is what was making the tree read as two objects.
TRUNK = [
    "otTTTTto",
    "otTTTTto",
    "otTTTTto",
    "otTTTTto",
    "ottTTTto",
    "otTTTtto",
    "otTTTTto",
    "ottTTtto",
    "oottttoo",
]

# The acorn-bearing twig, branching out of the crown and back down to the cup.
TWIG = [
    "oott",
    "  ootto",
    "    ootto",
    "      otto",
]

HEAD_AT = (4, 0)

SPRITE = {
    "herbId": "quercus-spp",
    "personality": "patriarchal",
    "size": (32, 28),
    "frames": 16,
    "fps": 6,
    "parts": [
        {"name": "trunk", "origin": (12, 15), "rows": TRUNK},
        {"name": "twig", "origin": (18, 13), "rows": TWIG},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(HEAD_AT, HEAD, eyes="beady", mouth="smile", eye_dy=1, mouth_dy=4),
        {
            "name": "acorn",
            "origin": (22, 16),
            "rows": ACORN,
            "variants": {"none": ACORN_NONE},
        },
        {
            "name": "sprout",
            "origin": (23, 24),
            "rows": SPROUT_NONE,
            "variants": {
                "split": SPLIT,
                "small": SPROUT_SMALL,
                "grown": SPROUT,
            },
        },
    ],
    #
    #  0    1    2    3     4     5     6     7      8      9     10     11     12    13   14    15
    # rest hold hold LET GO fall  fall LAND  split  split  SHOOT  SHOOT  GROWN  GROWN look beam  rest
    #
    # The acorn is the whole loop and it is deliberately the slowest thing in the deck:
    # at 6fps this takes nearly three seconds, and the seedling is only in frame for the
    # last five. It goes whole, split, shoot, sapling - four stages, because a seed that
    # jumped from acorn to seedling would be a substitution rather than a germination.
    # Frame 0 is the rest pose reduced motion freezes on: the acorn still on the twig,
    # nothing yet begun, which is the right still image for the deck's last card.
    "motion": {
        # It barely moves. Everything that happens in this loop happens below it, which is
        # the whole characterisation - an oak is what other things happen on.
        "head": {
            "art": [None, None, None, None, None, None, None, None, None, None,
                    None, None, "right", "right", "right", None],
            "dy": [0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        },
        "eyes": {
            "art": [None, "half", None, None, None, None, None, None, None, "wide",
                    "wide", "wide", "wide", None, None, "blink"],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0],
            "dy": [0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        },
        "cheeks": {
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0],
            "dy": [0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        },
        # It smiles at the end, at the thing it has started, and not before.
        "mouth": {
            "art": [None, None, None, None, None, None, None, None, None, None,
                    None, None, "grin", "grin", "grin", None],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0],
            "dy": [0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        },
        # Off the twig and down, and then it is on the ground and the sprout part takes
        # over. Two parts rather than one, because what falls and what grows are not the
        # same object.
        "acorn": {
            "art": [None, None, None, None, None, None, "none", "none", "none",
                    "none", "none", "none", "none", "none", "none", None],
            "dy": [0, 0, 0, 1, 3, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "sprout": {
            "art": [None, None, None, None, None, None, "split", "split", "split",
                    "small", "small", "grown", "grown", "grown", "grown", None],
            "dy": [0, 0, 0, 0, 0, 0, 0, 0, 0, -1, -1, -3, -3, -3, -3, 0],
        },
        "twig": {"lean": [0, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
