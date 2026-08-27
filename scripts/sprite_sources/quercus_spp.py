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

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

PALETTE = {
    **FACE_PALETTE,
    "G": (128, 207, 160, 255),   # canopy highlight
    "g": (98, 172, 135, 255),     # canopy mid
    "d": (73, 138, 109, 255),     # canopy deep
    "n": (46, 76, 66, 255),      # canopy shadow
    "T": (188, 148, 113, 255),    # trunk light
    "t": (156, 109, 71, 255),     # trunk dark
    "A": (230, 183, 121, 255),   # acorn nut
    "a": (192, 139, 79, 255),    # acorn shade
    "C": (165, 114, 66, 255),     # acorn cup
    "S": (150, 235, 182, 255),   # the sprout - brighter than the canopy, so it reads new
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

# --- Growth stages -----------------------------------------------------------
#
# THE DECK CLOSES ON ITSELF HERE. The adult's loop ends with an acorn on the ground, split
# open, with a shoot out of it — and that seedling is exactly what this species' SPROUT
# stage is. The last card's gesture produces the last card's first stage, which is not a
# device: it is what an oak does, and it is the only place in this set where a creature's
# trademark and a creature's beginning are the same object.
#
#   sprout    a seedling, with the split acorn cup still at its foot. That cup stays on
#             for weeks in a real one, and it is the plainest way to say where this came
#             from. It cannot drop an acorn; it has none. It looks up.
#   growing   a young tree with acorns forming — GREEN, and still seated in their cups.
#             A green acorn does not fall, so the twig holds it and the loop is a tree
#             waiting, which for an oak is not a hardship.
#   flowering the acorn released, the fall, the split, the shoot, and the tree looking at
#             what it has started. Unchanged, and it is the deck's ending.
#
# ROUND LOBES AT EVERY STAGE. An oak leaf's lobes are round-ended with deep smooth
# sinuses, which is the thing that tells it from a maple's points — so the crown is cut
# that way at all three sizes, and the whole tree carries its own leaf shape from the
# seedling on.

ACORN_PALETTE = {
    "K": (176, 206, 128, 255),   # unripe acorn highlight — green, and firmly attached
    "k": (128, 162, 90, 255),    # unripe acorn mid
}

# --- Sprout: the seedling the adult's own loop makes ------------------------
YOUNG_HEAD_AT = (10, 11)


def _young_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        17, 12, 8.0, 5.6, 7.8, 5.4, 5, 0.24, 5.4, 3.4,
        face_dx=face_dx, phase=-math.pi / 2, light=light, trim_tail=False,
        chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.3, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.3, light=(-1.25, -0.65))

# A seedling's stem, and nothing like a trunk yet.
TRUNK_THIN = [
    "otTto",
    "otTto",
    " ooo ",
]

# The cup it came out of, still at the foot. This is not decoration: an oak seedling
# carries the split shell for weeks, and it is the clearest thing a picture can say
# about where a tree comes from.
CUP = [
    "oCoCo",
    "oAoAo",
    " ooo ",
]

# --- Growing: acorns, green and attached ------------------------------------
MID_HEAD_AT = (7, 4)


def _mid_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        21, 16, 10.0, 7.6, 9.4, 7.2, 7, 0.26, 5.4, 4.2,
        face_dx=face_dx, phase=-math.pi / 2, light=light, trim_tail=False,
        chars="GgdnFo",
    )


MID_HEAD = _mid_head()
MID_HEAD_LEFT = _mid_head(face_dx=-1.5, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_head(face_dx=1.5, light=(-1.25, -0.65))

# The same acorn, unripe: the cup is already cross-hatched, and what is sitting in it is
# green and going nowhere.
ACORN_GREEN = [
    " ooooooo ",
    "oCcCcCcCo",
    "oCCcCcCCo",
    "oCcCcCcCo",
    "ooKKKKKoo",
    " oKKKKKo",
    " oKKKkko",
    "  oKkko",
    "   ooo",
    "   oto",
]

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(MID_HEAD, MID_HEAD_LEFT)
G_R_DX, _ = face_shift(MID_HEAD, MID_HEAD_RIGHT)

SPRITE = {
    "herbId": "quercus-spp",
    "personality": "patriarchal",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(6, "sprout"),
            # No twig and no acorn. The `sprout` part becomes the split cup it came out
            # of, which is the same object it was in the adult's loop, one moment later.
            "hide": ["twig", "acorn", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "trunk": TRUNK_THIN,
                "sprout": CUP,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "wide": YOUNG_EYES["wide"],
                    "half": YOUNG_EYES["half"],
                },
                "mouth": {"grin": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "trunk": (16, 21),
                "sprout": (15, 23),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=1, mouth_dy=3
                ),
            },
            # It looks up. That is the whole loop, and for the thing the deck's last
            # gesture produces it is the right one.
            "motion": {
                "head": {
                    "art": [None, None, "right", "right", None, "left", None, None],
                    "dy": [0, -1, -1, -1, 0, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, "wide", "wide", "wide", "wide", None, "blink", None],
                    "dx": [0, 0, S_R_DX, S_R_DX, 0, S_L_DX, 0, 0],
                    "dy": [0, -1, -1, -1, 0, 0, 0, 0],
                },
                "mouth": {
                    "art": [None, None, None, "grin", "grin", "grin", None, None],
                    "dx": [0, 0, S_R_DX, S_R_DX, 0, S_L_DX, 0, 0],
                    "dy": [0, -1, -1, -1, 0, 0, 0, 0],
                },
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(6, "growing"),
            "palette": ACORN_PALETTE,
            # Nothing on the ground: nothing has fallen, because a green acorn is still
            # seated in its cup and holds on.
            "hide": ["sprout", "cheeks"],
            "swap": {
                "head": MID_HEAD,
                "acorn": ACORN_GREEN,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": MID_HEAD_LEFT, "right": MID_HEAD_RIGHT},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "wide": YOUNG_EYES["wide"],
                    "half": YOUNG_EYES["half"],
                },
                "mouth": {"grin": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": MID_HEAD_AT,
                "twig": (17, 14),
                "acorn": (21, 16),
                "trunk": (12, 16),
                **seat_young(
                    MID_HEAD_AT, MID_HEAD, cheeks=False, eye_dy=2, mouth_dy=4
                ),
            },
            # A tree waiting, which for an oak is not a hardship. The acorn stirs on the
            # twig and stays exactly where it is.
            "motion": {
                "head": {
                    "art": [None, None, None, None, "right", "right", None, "left",
                            None, None],
                    "dy": [0, 0, -1, -1, 0, 0, 0, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, "half", None, None, "wide", "wide", None, None,
                            "blink", None],
                    "dx": [0, 0, 0, 0, G_R_DX, G_R_DX, 0, G_L_DX, 0, 0],
                    "dy": [0, 0, -1, -1, 0, 0, 0, 0, 0, 0],
                },
                "mouth": {
                    "art": [None, None, None, None, None, "grin", "grin", "grin", None,
                            None],
                    "dx": [0, 0, 0, 0, G_R_DX, G_R_DX, 0, G_L_DX, 0, 0],
                    "dy": [0, 0, -1, -1, 0, 0, 0, 0, 0, 0],
                },
                "acorn": {"dy": [0, 0, 0, 1, 1, 0, 0, 0, 0, 0]},
                "twig": {"lean": [0, 0, 0, -1, -1, 0, 0, 0, 0, 0]},
            },
        },
    },
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
