"""Garlic Mustard (Alliaria petiolata) - creature portrait sprite.

THE DESIGN HOOK: crush a leaf and it smells unmistakably of garlic, which is how anybody
identifies it and where both halves of its name come from. It is also one of the most
aggressive invaders in North American woodland - it poisons the soil fungi other plants
depend on, and it spreads by simply being everywhere.

So this one is a smell you can see. Its trademark is the only visible ODOUR in the deck,
and the deck's other airborne effects are deliberately different things: ragweed's pollen
is a violent involuntary blast it is ashamed of, and this is a slow deliberate exhale it
is delighted by.

WHERE THE FACE GOES: in the heart-shaped, scallop-edged leaf, which is the structure
people actually look at when identifying it.

PERSONALITY: pleased with itself, and closer than you would like. Its trademark gesture
is THE WAFT - it breathes out a slow cloud of garlic, leans in a little further while
you are dealing with that, and grins. The lean never resets fully within the loop, which
is the quietest way to draw an invasive species.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

PALETTE = {
    **FACE_PALETTE,
    "G": (153, 228, 164, 255),   # leaf highlight
    "g": (120, 185, 133, 255),    # leaf mid
    "d": (81, 154, 101, 255),     # leaf deep
    "n": (50, 94, 65, 255),      # leaf shadow
    "V": (234, 246, 236, 255),   # the four small white petals
    "v": (199, 219, 204, 255),   # petal shade
    "S": (193, 227, 199, 255),   # the waft - pale green, so it reads as smell not steam
    "s": (191, 221, 199, 255),   # waft, thinner
}

HEAD_W, HEAD_H = 19, 17


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    # Eight shallow lobes: the scalloped margin of a garlic mustard leaf, which is the
    # detail that separates it from every other heart-shaped woodland leaf.
    return flower_head(
        HEAD_W, HEAD_H, 9.0, 8.5, 8.4, 8.0, 8, 0.13, 5.0, 4.2,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))

# The four-petalled white flowers, in a small cluster - garlic mustard is a crucifer and
# four petals in a cross is the family's signature.
FLOWERS = [
    "oVo vVv",
    "VVV oVo",
    "oVo vVv",
]

# The waft. It leaves the mouth small and dense, spreads, and thins to almost nothing -
# which is what a smell does, and is why it is drawn in three states rather than moved.
WAFT_NONE = [
    " ",
]

WAFT_NEAR = [
    " Ss",
    "sSS",
    " Ss",
]

WAFT_MID = [
    "  sSs",
    " sSSSs",
    "  sSs",
]

WAFT_FAR = [
    "  s  s",
    " s  s  s",
    "   s  s",
]

# Heart-shaped leaves on long stalks, the way this plant holds them.
LEAF_L = [
    "   ooooo",
    " ooGGGGgo",
    "oGGGGgggdo",
    "oGgggddddo",
    " oddnnnno",
    "  ooooo",
]

LEAF_R = [
    "ooooo",
    "ogGGGGoo",
    "oddgggGGGo",
    "odddddgggo",
    " onnnnddo",
    "  ooooo",
]

STEM = [
    "odgdo",
    "odgdo",
    "odgdo",
    " ooo ",
]

HEAD_AT = (6, 5)

# --- Growth stages -----------------------------------------------------------
#
# THE SMELL IS THERE FROM THE START; THE CREEP IS NOT. Crush a first-year rosette leaf and
# it smells exactly as much of garlic as the flowering plant does — that is the
# identification, and withholding it from the early stages would be drawing a garlic
# mustard that is not one. So the waft stays at every stage. What grows is how far it
# travels, and whether the plant follows it toward you:
#
#   sprout    a small dense cloud right at the mouth, and the plant does not move. It is
#             a first-year rosette; it is not going anywhere yet.
#   growing   the cloud spreads, and it leans — but it comes all the way back.
#   flowering the full three-frame waft, and a lean that never quite resets. Unchanged,
#             because that unreset pixel is the quietest way to draw an invasive.
#
# THE THIRD BIENNIAL IN THE DECK, after mullein and chicory, and the one where it matters
# most for identification: garlic mustard spends year one as a rosette of round, scalloped,
# long-stalked leaves that stays green under snow, and year two as a tall stem with
# triangular toothed leaves and four white petals. Anyone who has only ever seen the second
# would not recognise the first, which is exactly the argument for drawing it.

BUD_PALETTE = {
    "K": (188, 214, 172, 255),   # bud highlight — green, before the four white petals
    "k": (132, 168, 128, 255),   # bud mid
}

# --- Sprout: the first-year rosette -----------------------------------------
YOUNG_HEAD_AT = (9, 13)


def _young_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        15, 13, 7.0, 6.4, 7.2, 6.2, 8, 0.13, 5.4, 3.6,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.3, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.3, light=(-1.25, -0.65))

# Rounder than the adult's and on a long stalk — a first-year leaf is kidney-shaped and
# scalloped, not the triangular toothed one the flowering stem carries.
LEAF_L_YOUNG = [
    "  ooooo",
    " oGGGGgo",
    "oGGgggddo",
    " oddnnno",
    "  ooooo",
]

LEAF_R_YOUNG = [
    "ooooo",
    "ogGGGGo",
    "oddgggGGo",
    " onnnddo",
    "  ooooo",
]

# --- Growing: the stem up, the crosses still shut ---------------------------
MID_HEAD_AT = (7, 10)


def _mid_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        17, 15, 8.0, 7.4, 7.8, 7.0, 8, 0.13, 5.4, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


MID_HEAD = _mid_head()
MID_HEAD_LEFT = _mid_head(face_dx=-1.4, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_head(face_dx=1.4, light=(-1.25, -0.65))

# A crucifer's buds: small green clubs packed into a tight terminal head, with no cross
# visible until the four petals actually open.
BUDS = [
    "oko oko",
    "okKokKo",
    " oo oo",
]

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(MID_HEAD, MID_HEAD_LEFT)
G_R_DX, _ = face_shift(MID_HEAD, MID_HEAD_RIGHT)

SPRITE = {
    "herbId": "alliaria-petiolata",
    "personality": "pleased",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(8, "sprout"),
            "hide": ["flowers", "stem", "cheeks"],
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
                "mouth": {"wide": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "leafL": (2, 19),
                "leafR": (21, 19),
                "waft": (22, 18),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=2, mouth_dy=4
                ),
            },
            # It breathes out and the smell stays right where it was made. No lean: a
            # rosette that crept toward the viewer would be claiming a second year it
            # has not had.
            "motion": {
                "head": {
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0],
                    "art": [None, None, None, "right", "right", None, None, None],
                },
                "eyes": {
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0],
                    "dx": [0, 0, 0, S_R_DX, S_R_DX, 0, 0, 0],
                    "art": [None, "half", None, None, None, None, "blink", None],
                },
                "mouth": {
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0],
                    "dx": [0, 0, 0, S_R_DX, S_R_DX, 0, 0, 0],
                    "art": [None, None, "wide", "wide", None, None, None, None],
                },
                "waft": {
                    "art": [None, None, "near", "near", None, None, None, None],
                },
                "leafL": {"dy": [0, -1, 0, 0, 0, 0, 0, 0]},
                "leafR": {"dy": [0, -1, 0, 0, 0, 0, 0, 0]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(8, "growing"),
            "palette": BUD_PALETTE,
            "hide": ["cheeks"],
            "swap": {
                "head": MID_HEAD,
                "flowers": BUDS,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": MID_HEAD_LEFT, "right": MID_HEAD_RIGHT},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                    "happy": YOUNG_EYES["happy"],
                },
                "mouth": {"wide": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": MID_HEAD_AT,
                "flowers": (13, 8),
                "leafL": (1, 18),
                "leafR": (22, 18),
                "stem": (14, 22),
                "waft": (23, 15),
                **seat_young(
                    MID_HEAD_AT, MID_HEAD, cheeks=False, eye_dy=2, mouth_dy=4
                ),
            },
            # The cloud spreads now, and it does lean in — but it comes all the way home
            # before the loop ends. The pixel it fails to give back is the adult's.
            "motion": {
                "head": {
                    "art": [None, None, None, "right", "right", "right", "right", None,
                            None, None],
                    "dx": [0, 0, 1, 1, 2, 2, 2, 1, 0, 0],
                    "dy": [0, -1, 0, 0, 0, 0, 1, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, "half", None, None, None, "happy", "happy", "happy",
                            "blink", None],
                    "dx": [0, 0, 1, 1 + G_R_DX, 2 + G_R_DX, 2 + G_R_DX, 2 + G_R_DX,
                           1, 0, 0],
                    "dy": [0, -1, 0, 0, 0, 0, 1, 0, 0, 0],
                },
                "mouth": {
                    "art": [None, None, "wide", "wide", "wide", None, None, None, None,
                            None],
                    "dx": [0, 0, 1, 1 + G_R_DX, 2 + G_R_DX, 2 + G_R_DX, 2 + G_R_DX,
                           1, 0, 0],
                    "dy": [0, -1, 0, 0, 0, 0, 1, 0, 0, 0],
                },
                "waft": {
                    "art": [None, None, "near", "near", "mid", "mid", None, None, None,
                            None],
                    "dx": [0, 0, 0, 1, 2, 3, 0, 0, 0, 0],
                    "dy": [0, 0, 0, 0, -1, -1, 0, 0, 0, 0],
                },
                "flowers": {"lean": [0, 0, 1, 1, 1, 0, -1, 0, 0, 0]},
                "leafL": {"dx": [0, 0, 0, 1, 1, 1, 1, 0, 0, 0]},
                "leafR": {"dx": [0, 0, 0, 1, 1, 1, 1, 0, 0, 0]},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "stem", "origin": (14, 22), "rows": STEM},
        {"name": "flowers", "origin": (13, 3), "rows": FLOWERS},
        {"name": "leafL", "origin": (0, 17), "rows": LEAF_L},
        {"name": "leafR", "origin": (22, 17), "rows": LEAF_R},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(
            HEAD_AT, HEAD, eyes="round", mouth="smile", eye_dy=1, mouth_dy=4,
            # A small round mouth for the exhale, and a wide pleased one for afterwards.
            extra_mouths={"blow": ["oo", "FF"]},
        ),
        {
            "name": "waft",
            "origin": (20, 13),
            "rows": WAFT_NONE,
            "variants": {"near": WAFT_NEAR, "mid": WAFT_MID, "far": WAFT_FAR},
        },
    ],
    #
    #  0    1     2      3     4     5     6     7     8    9     10   11   12    13
    # rest breathe BLOW  BLOW  waft  waft  thin  LEAN  LEAN grin  grin rest blink rest
    #
    # The waft is frames 2-6 and it is this sprite's trademark: a slow deliberate exhale
    # that spreads and thins over three frames, and then - while you are dealing with it -
    # frames 7-10 lean the whole plant a little closer to you and grin. Frame 0 is the
    # rest pose reduced motion freezes on: nothing in the air, and standing where it
    # started.
    "motion": {
        # The lean is the invasive bit. It goes out on the waft and comes back slowly, a
        # pixel at a time, so the loop never quite looks like it reset.
        "head": {
            "art": [None, None, None, None, "right", "right", "right", "right",
                    "right", None, None, None, None, None],
            "dx": [0, 0, 1, 1, 2, 2, 3, 3, 3, 2, 1, 1, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, "half", None, None, None, None, None, "happy", "happy",
                    "happy", "happy", None, "blink", None],
            "dx": [0, 0, 1, 1, 4, 4, 5, 5, 5, 2, 1, 1, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            # The blush sits right on the rim of the face, so it travels a shade less
            # than the mouth does or it slides off onto the leaf.
            "dx": [0, 0, 0, 0, 3, 3, 4, 4, 4, 2, 1, 0, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, "blow", "blow", "blow", None, None, "grin", "grin",
                    "grin", "grin", None, None, None],
            "dx": [0, 0, 1, 1, 3, 3, 4, 4, 4, 2, 1, 1, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
        },
        # Out, spreading, and gone. It never comes back within the loop, because a smell
        # that pulses would read as a machine rather than as a plant.
        "waft": {
            "art": [None, None, "near", "near", "mid", "mid", "far", None, None, None,
                    None, None, None, None],
            "dx": [0, 0, 0, 1, 2, 3, 5, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, -1, -1, -2, 0, 0, 0, 0, 0, 0, 0],
        },
        "flowers": {"lean": [0, 0, 1, 1, 1, 0, 0, -1, -1, 0, 0, 0, 0, 0]},
        "leafL": {"dx": [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]},
        "leafR": {"dx": [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
