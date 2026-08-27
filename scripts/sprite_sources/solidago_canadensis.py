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

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

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

# --- Growth stages -----------------------------------------------------------
#
# THE BOW IS THE PLUME, so the bow arrives when the plume does. A creature with nothing
# above its head to fold over cannot bow; it can only nod, and pretending otherwise would
# be animating a structure that is not drawn.
#
#   sprout    a leafy shoot. No plume at all — goldenrod spends its first season as
#             narrow three-veined leaves up a stem, and there is nothing gold about it.
#   growing   the panicle formed and still GREEN. This is the honest middle stage and it
#             is easy to miss: a goldenrod plume is a tight green spray for weeks before
#             it opens, and the plant is unrecognisable to most people in that state.
#             It folds partway — as far as `mid` — and no further.
#   flowering gold, and the full seven-frame bow. Unchanged.
#
# THE BLAME STAYS WITH THE FLOWER, which matters for this card in particular. Goldenrod
# is accused of hay fever it does not cause, and the accusation happens when it is a
# conspicuous gold plume beside an inconspicuous ragweed. A green goldenrod is nobody's
# suspect, so the two earlier stages are drawn as what they are: an ordinary weed.

PLUME_PALETTE = {
    "K": (172, 208, 122, 255),   # green plume highlight
    "k": (126, 168, 90, 255),    # green plume mid
    "j": (88, 124, 68, 255),     # green plume deep
}

# --- Sprout: leaves up a stem, and no plume ---------------------------------
YOUNG_HEAD_AT = (9, 12)


def _young_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        15, 13, 7.0, 6.0, 7.2, 6.0, 6, 0.12, 5.4, 3.6,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.3, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.3, light=(-1.25, -0.65))

# Narrower than the adult's, and shorter. Goldenrod leaves are lance-shaped with three
# veins running the length of them, which is the mark that survives being drawn small.
LEAF_L_YOUNG = [
    "   ooo",
    " ooGGgo",
    "oGGGgddo",
    " oggdno",
    "  oooo",
]

LEAF_R_YOUNG = [
    "ooo",
    "ogGGoo",
    "oddgGGGo",
    " onddgo",
    "  oooo",
]

# --- Growing: the panicle, still green --------------------------------------
MID_HEAD_AT = (8, 12)


def _mid_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        16, 14, 7.5, 6.4, 7.6, 6.4, 6, 0.12, 5.4, 3.8,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


MID_HEAD = _mid_head()
MID_HEAD_LEFT = _mid_head(face_dx=-1.4, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_head(face_dx=1.4, light=(-1.25, -0.65))

# Tighter than the gold one as well as shorter: the florets have not opened, so the spray
# is a narrow closed spindle rather than a spreading plume.
PLUME_GREEN = [
    "    oko",
    "   okKko",
    "   okKko",
    "  okKKKko",
    "  okKKKko",
    " okKKjKKko",
    " okKjjjKko",
    "  okjjjko",
    "   okjko",
]

PLUME_GREEN_MID = [
    "       ooo",
    "     ookKko",
    "   ookKKKko",
    " ookKKjKKko",
    "okKjjjjjKko",
    " ookjjjjko",
    "   ookjko",
]

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(MID_HEAD, MID_HEAD_LEFT)
G_R_DX, _ = face_shift(MID_HEAD, MID_HEAD_RIGHT)

SPRITE = {
    "herbId": "solidago-canadensis",
    "personality": "grand",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(6, "sprout"),
            "hide": ["plume", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "leafL": LEAF_L_YOUNG,
                "leafR": LEAF_R_YOUNG,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"], "half": YOUNG_EYES["half"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "leafL": (2, 19),
                "leafR": (21, 19),
                "stem": (14, 24),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=1, mouth_dy=4
                ),
            },
            # A nod, not a bow. It is the same movement with nothing on top of it.
            "motion": {
                "head": {
                    "dy": [0, 0, 1, 1, 1, 0, 0, 0],
                    "lean": [0, 0, -1, -1, -1, 0, 0, 0],
                    "art": [None, None, "right", "right", None, "left", None, None],
                },
                "eyes": {
                    "dy": [0, 0, 1, 1, 1, 0, 0, 0],
                    "dx": [0, 0, S_R_DX, S_R_DX, 0, S_L_DX, 0, 0],
                    "art": [None, None, None, "half", "half", None, "blink", None],
                },
                "mouth": {
                    "dy": [0, 0, 1, 1, 1, 0, 0, 0],
                    "dx": [0, 0, S_R_DX, S_R_DX, 0, S_L_DX, 0, 0],
                },
                "leafL": {"dy": [0, 0, 0, -1, -1, 0, 0, 0]},
                "leafR": {"dy": [0, 0, 0, -1, -1, 0, 0, 0]},
                "stem": {"lean": [0, 0, -1, -1, -1, 0, 0, 0]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(6, "growing"),
            "palette": PLUME_PALETTE,
            "hide": ["cheeks"],
            "swap": {
                "head": MID_HEAD,
                "plume": PLUME_GREEN,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": MID_HEAD_LEFT, "right": MID_HEAD_RIGHT},
                "plume": {"mid": PLUME_GREEN_MID},
                "eyes": {"blink": YOUNG_EYES["blink"], "half": YOUNG_EYES["half"]},
            },
            "origins": {
                "head": MID_HEAD_AT,
                "plume": (11, 5),
                "leafL": (1, 19),
                "leafR": (21, 19),
                "stem": (14, 24),
                **seat_young(
                    MID_HEAD_AT, MID_HEAD, cheeks=False, eye_dy=1, mouth_dy=4
                ),
            },
            # Halfway over and back. Reaching `mid` and stopping is the whole point: the
            # full fold to horizontal is what the last stage buys.
            "motion": {
                "plume": {
                    "art": [None, None, "mid", "mid", "mid", "mid", "mid", None, None,
                            None],
                    "dx": [0, 0, -1, -2, -3, -3, -2, -1, 0, 0],
                    "dy": [0, -1, 1, 2, 3, 3, 2, 1, 0, 0],
                },
                "head": {
                    "art": [None, None, None, "right", "right", "right", "right", None,
                            "left", None],
                    "dy": [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
                    "lean": [0, 0, -1, -1, -2, -2, -1, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, None, None, None, "half", "half", "half", None,
                            "blink", None],
                    "dx": [0, 0, 0, G_R_DX, G_R_DX, G_R_DX, G_R_DX, 0, G_L_DX, 0],
                    "dy": [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
                },
                "mouth": {
                    "dx": [0, 0, 0, G_R_DX, G_R_DX, G_R_DX, G_R_DX, 0, G_L_DX, 0],
                    "dy": [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
                },
                "leafL": {"dy": [0, 0, 0, -1, -1, -1, -1, 0, 0, 0]},
                "leafR": {"dy": [0, 0, 0, -1, -1, -1, -1, 0, 0, 0]},
                "stem": {"lean": [0, 0, 0, -1, -1, -1, 0, 0, 0, 0]},
            },
        },
    },
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
