"""Goldenrod (Solidago canadensis) - creature portrait sprite.

THE DESIGN HOOK: goldenrod is the plant that gets the blame. It flowers at exactly the
moment hay fever peaks, so it is the one people point at - while the actual culprit,
ragweed, flowers beside it with flowers too drab to notice. Goldenrod's pollen is heavy
and insect-carried; it barely travels. The deck has both cards, and this sprite and the
ragweed one are built as a pair.

Its plume is the tallest single structure in the set and it ARCHES to one side, which is
what a real goldenrod does under its own weight - and what keeps it from reading as the
mullein, whose spike is dead vertical.

WHERE THE FACE GOES: at the base of the arch, looking up along its own plume.

PERSONALITY: grand, and completely innocent. Its trademark gesture is THE DEEP BOW - the
whole plume folds over in a long slow arc until it is nearly horizontal, hangs there, and
comes back up. It is the biggest single movement in the set, and the slowest.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "Y": (248, 228, 157, 255),   # plume highlight
    "y": (227, 194, 111, 255),    # plume mid
    "u": (218, 161, 60, 255),    # plume deep
    "G": (102, 217, 89, 255),   # leaf light
    "g": (67, 173, 65, 255),    # leaf mid
    "d": (51, 125, 55, 255),     # leaf deep
    "n": (43, 87, 47, 255),      # leaf shadow
}

HEAD_W, HEAD_H = 17, 15


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        HEAD_W, HEAD_H, 8.0, 7.0, 7.6, 6.8, 6, 0.12, 4.8, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.4, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.4, light=(-1.25, -0.65))

# The plume: a long tapering spray of tiny florets, arching right. Upright, folded to
# halfway, and bowed nearly flat - the three poses the whole gesture is made of. Drawn by
# hand rather than generated, because an arch is a curve along a spine and the shared
# generator makes rounded organs, not spines.
PLUME_UP = [
    "     oyo",
    "    oyYyo",
    "    oyYyo",
    "   oyYYYyo",
    "   oyYYYyo",
    "  oyYYYYYyo",
    "  oyYYuYYyo",
    " oyYYuuuYYyo",
    " oyYuuuuuYyo",
    "  oyuuuuuyo",
    "   oyuuuyo",
    "    oyuyo",
]

PLUME_MID = [
    "         ooo",
    "       ooyYyo",
    "     ooyYYYyo",
    "   ooyYYYYYyo",
    " ooyYYYuYYYyo",
    "oyYYuuuuuYYyo",
    "oyuuuuuuuuuyo",
    " ooyuuuuuuyo",
    "   ooyuuuyo",
    "     ooyuyo",
]

PLUME_BOWED = [
    "          ooooo",
    "     ooooyYYYYyo",
    "  oooyYYYYYYYYyo",
    "ooyYYYuuuuuYYYyo",
    "oyuuuuuuuuuuuuyo",
    " oooouuuuuuuuyo",
    "     oooooyuyo",
]

# One pair of long lance leaves. Goldenrod's leaves are narrow and many; two is enough to
# say so without competing with the plume, which is the thing worth looking at.
LEAF_L = [
    "     ooo",
    "  oooGGgo",
    "oGGGGGgddo",
    " oggdddno",
    "  ooooo",
]

LEAF_R = [
    "ooo",
    "ogGGooo",
    "oddgGGGGGo",
    " ondddggo",
    "   ooooo",
]

STEM = [
    "ogGdo",
    "ogGdo",
    "odgdo",
    " ooo ",
]

HEAD_AT = (8, 11)
# The bow, shared by everything above the stem. It is the only motion track in the set
# that reaches eight pixels - the plume genuinely folds over.
BOW = [0, 0, 1, 3, 5, 7, 8, 8, 8, 6, 4, 2, 0, 0]

SPRITE = {
    "herbId": "solidago-canadensis",
    "personality": "grand",
    "size": (32, 28),
    "frames": 14,
    "fps": 6,
    "parts": [
        {"name": "stem", "origin": (14, 24), "rows": STEM},
        {"name": "leafL", "origin": (1, 18), "rows": LEAF_L},
        {"name": "leafR", "origin": (21, 18), "rows": LEAF_R},
        {
            "name": "plume",
            "origin": (10, 0),
            "rows": PLUME_UP,
            "variants": {"mid": PLUME_MID, "bowed": PLUME_BOWED},
        },
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(HEAD_AT, HEAD, eyes="round", mouth="smile", eye_dy=1, mouth_dy=4),
    ],
    #
    #  0    1     2    3    4     5     6     7     8     9    10   11   12    13
    # rest lift  fold fold fold  BOW   BOW   hold  hold  rise rise rise blink rest
    #
    # The bow is frames 2-8 and it is this sprite's trademark: seven frames of one
    # continuous fold, at 6fps, which makes it the slowest and largest gesture here.
    # Speeding it up would turn a bow into a nod. Frame 0 is the rest pose reduced motion
    # freezes on - plume fully upright, which is how anyone would draw a goldenrod.
    "motion": {
        # The plume changes ART as it folds rather than merely leaning: a spray bending
        # under its own weight changes shape, and shearing an upright one just skews it.
        "plume": {
            "art": [None, None, "mid", "mid", "mid", "bowed", "bowed", "bowed",
                    "bowed", "mid", "mid", None, None, None],
            "dx": [0, 0, -1, -2, -3, -6, -7, -7, -7, -3, -2, -1, 0, 0],
            "dy": [0, -1, 1, 2, 3, 5, 6, 6, 6, 3, 2, 1, 0, 0],
        },
        # The head follows the plume down but only a fraction of the way. A creature whose
        # face travelled the full arc would read as falling over rather than as bowing.
        "head": {
            "art": [None, None, None, "right", "right", "right", "right", "right",
                    "right", None, "left", None, None, None],
            "dy": [0, 0, 0, 1, 1, 2, 2, 2, 2, 1, 1, 0, 0, 0],
            "lean": [0, 0, -1, -1, -2, -3, -3, -3, -3, -2, -1, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, None, None, "half", "half", "shut", "shut", "shut",
                    "half", None, None, "blink", None],
            "dx": [0, 0, 0, 2, 2, 2, 2, 2, 2, 0, -2, 0, 0, 0],
            "dy": [0, 0, 0, 1, 1, 2, 2, 2, 2, 1, 1, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, -1, 0, 0, 0],
            "dy": [0, 0, 0, 1, 1, 2, 2, 2, 2, 1, 1, 0, 0, 0],
        },
        # Gracious throughout. A bow with a straight face is a stoop.
        "mouth": {
            "art": [None, None, "grin", "grin", "grin", "grin", "grin", "grin",
                    "grin", "grin", None, None, None, None],
            "dx": [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, -1, 0, 0, 0],
            "dy": [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        },
        # The leaves lift as the plume goes over, the way a hem does. They are the only
        # part of the plant that goes UP during the bow.
        "leafL": {"dy": [0, 0, 0, -1, -1, -2, -2, -2, -2, -1, -1, 0, 0, 0]},
        "leafR": {"dy": [0, 0, 0, -1, -1, -2, -2, -2, -2, -1, -1, 0, 0, 0]},
    },
    "palette": PALETTE,
}
