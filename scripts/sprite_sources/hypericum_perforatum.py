"""St. John's Wort (Hypericum perforatum) - creature portrait sprite.

THE DESIGN HOOK: `perforatum` is the identification and it is a genuinely lovely one -
hold a leaf up to the light and it is peppered with translucent dots, hundreds of tiny
oil glands that let the light straight through. They are not holes; they only exist when
there is something behind them. Nothing else in this deck can be identified by an action
the person has to perform.

The flowers carry the other half of it: black dots along the petal edges, and a resin
that stains a finger red if you crush a bud.

WHERE THE FACE GOES: in the golden flower, which is the showiest thing here and is
already a five-petalled disc with room across it.

PERSONALITY: sunlit. Its trademark gesture is HOLDING A LEAF UP TO THE LIGHT - it lifts
one leaf, the perforations light up through it, and it looks at them. It is the only
sprite that becomes translucent, and the only one that demonstrates its own
identification test.

SAFETY: a portrait, never an identification aid, and this species in particular is not a
casual one - the card's safety content covers what matters and is the reference. A
drawing of a leaf against the light is a picture of a name, not advice.
"""

from _face import FACE_PALETTE, face_box, face_shift, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks

PALETTE = {
    **FACE_PALETTE,
    "Y": (244, 233, 179, 255),   # petal highlight
    "y": (235, 214, 148, 255),    # petal mid
    "u": (225, 185, 96, 255),    # petal deep
    "U": (208, 154, 53, 255),    # petal shadow
    "K": (68, 56, 61, 255),      # the black dots along the petal margins
    "G": (174, 215, 138, 255),   # leaf highlight
    "g": (134, 177, 106, 255),    # leaf mid
    "d": (98, 145, 76, 255),     # leaf deep
    "n": (59, 80, 52, 255),      # leaf shadow
    "L": (231, 247, 201, 255),   # the lit leaf - backlit green, nearly white
    "l": (217, 243, 181, 255),   # lit leaf mid
    "P": (251, 249, 230, 255),   # a perforation with the light coming through it
}

HEAD_W, HEAD_H = 19, 15


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    # Five lobes: the five petals of a hypericum flower, held flat and slightly ragged.
    return flower_head(
        HEAD_W, HEAD_H, 9.0, 7.0, 8.4, 6.6, 5, 0.16, 5.0, 4.2,
        face_dx=face_dx, light=light, trim_tail=False, chars="YyuUFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))

# The black dots round the petal margins, which with the perforations are the two things
# that identify this plant and nothing else in the deck has either.
DOTS = [
    "K       K",
    " K     K",
    "  K   K",
]

# The leaf, held up. Three states: ordinary, backlit, and backlit with every perforation
# showing. The middle state matters - a leaf that lit its dots the same frame it lifted
# would look switched on rather than held up.
LEAF_PLAIN = [
    "  ooo",
    " oGGGo",
    "oGGgggo",
    "oGgggddo",
    " oggddno",
    "  oooo",
]

LEAF_BACKLIT = [
    "  ooo",
    " oLLLo",
    "oLLlllo",
    "oLlllllo",
    " ollllo",
    "  oooo",
]

LEAF_PERFORATED = [
    "  ooo",
    " oLPLo",
    "oLPlPlo",
    "oLlPlPlo",
    " oPllPo",
    "  oooo",
]

# The other leaf, which stays where it is and stays ordinary green - the control, so the
# lit one is visibly lit rather than the palette having changed.
LEAF_STILL = [
    "ooo",
    "oGGGo",
    "ogGGGGo",
    "oddgggGo",
    " onddggo",
    "  oooo",
]

# The narrow opposite leaves down the stem.
PAIR = [
    "ooo   ooo",
    "oGgo oGgo",
    "oddo oddo",
]

STEM = [
    "ogdo",
    "ogdo",
    "ogdo",
    " oo ",
]

HEAD_AT = (6, 6)

# --- Growth stages -----------------------------------------------------------
#
# THE SAME SUNLIT ST JOHN'S WORT, YOUNGER — and this is the second species after violet
# where the adult wears its FACE ON THE FLOWER, so a stage with no flower has to move the
# face onto the plant it does have. Here that is easy and lucky: the identifying trait is
# the PERFORATE LEAF, the pinprick translucent glands you only see by holding a leaf to
# the light, and "perforatum" is literally the name. A seedling whose face rides a leaf
# full of light is more on-species than the flower would have been.
#
#   sprout    leaves only, no flower. The face rides the backlit perforate leaf.
#   growing   in bud. St John's Wort buds are narrow POINTED cones, green with the black
#             marginal dots already on them — the dots are on the sepals before they are
#             on the petals, so the trait survives the stage that has no petals.
#   flowering the open yellow star, unchanged.
#
# Its trademark is lifting a leaf to the sun and letting the perforations light up. That
# stays with the open flower: a seedling holds the leaf, and only the mature plant gets
# the moment where the light comes through.

BUD_PALETTE = {
    "S": (168, 200, 128, 255),   # bud highlight — sepal green
    "s": (124, 160, 96, 255),    # bud mid
    "j": (88, 120, 70, 255),     # bud deep
    "J": (60, 84, 52, 255),      # bud shadow
}

# --- Sprout: the face on a perforate leaf -----------------------------------
#
# HAND-DRAWN, for the same reason violet's is: a leaf is not a rounded organ, and this one
# has to carry the perforations as well. The `F` patch is measured by `face_box` exactly
# as a generated head would be.
LEAF_HEAD_AT = (7, 14)

LEAF_HEAD = [
    "      ooooo      ",
    "   oooLPLLPLooo  ",
    "  oLLPLLLLLPLLo  ",
    " oLPoFFFFFFFoPLo ",
    "oLLoFFFFFFFFFoLLo",
    "oLPoFFFFFFFFFoPLo",
    "oLLoFFFFFFFFFoLLo",
    " oLoooooooooooLo ",
    "  ollPlllPllllo  ",
    "   ollllllllo    ",
    "     ooooooo     ",
]

SEED_PAIR = [
    "ooo  ooo",
    "oGgooGgo",
    "oddooddo",
]
SEED_STEM = [
    "ogdo",
    "ogdo",
    " oo ",
]

# --- Growing: the pointed bud -----------------------------------------------
BUD_W, BUD_H = 15, 14
BUD_AT = (9, 10)


def _bud(rx=6.4, ry=6.8, face_dx=0.0, face_dy=0.6, light=(-0.85, -0.65)):
    # Fewer lobes than the open star's five and a taller ellipse: a St John's Wort bud is
    # a narrow pointed cone, which is quite unlike the flat star it becomes.
    return flower_head(
        BUD_W, BUD_H, 7.0, 7.2, rx, ry, 3, 0.14, 5.2, 3.2,
        face_dx=face_dx, face_dy=face_dy, light=light, chars="SsjJFo",
    )


BUD = _bud()
BUD_LEFT = _bud(face_dx=-1.2, light=(-0.32, -0.66))
BUD_RIGHT = _bud(face_dx=1.2, light=(-1.34, -0.66))

# The black marginal dots, already on the sepals. They are on the bud before they are on
# the petals, which is why the trait survives a stage that has no petals to put them on.
BUD_DOTS = [
    "K     K",
    " K   K",
]

G_L_DX, _ = face_shift(BUD, BUD_LEFT)
G_R_DX, _ = face_shift(BUD, BUD_RIGHT)

# It holds the leaf up and looks at it, and nothing lights. That is the whole loop at this
# age: the gesture without the payoff.
S_BOB = [0, 0, -1, -1, -1, -1, 0, 0]
S_EYES = [None, "look_left", "look_left", None, None, "look_right", "blink", None]

G_BOB = [0, 0, -1, -1, -1, -1, -1, 0, 0, 0]
G_HEAD = [None, "left", "left", None, None, None, "right", "right", None, None]
G_DX = [0, G_L_DX, G_L_DX, 0, 0, 0, G_R_DX, G_R_DX, 0, 0]
G_BLINK = [None] * 8 + ["blink", None]


TURN_L = face_shift(HEAD, HEAD_LEFT)[0]
HEAD_ART = [None, None, "left", "left", "left", "left", "left", "left", "left",
            None, None, None, None, None]
FACE_DX = [TURN_L if art == "left" else 0 for art in HEAD_ART]

SPRITE = {
    "herbId": "hypericum-perforatum",
    "personality": "sunlit",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(8, "sprout"),
            # No flower, so no petal dots. The lifted-leaf trick belongs to the adult, so
            # the seedling keeps a plain second leaf and never lights anything.
            "hide": ["dots", "leafUp", "cheeks"],
            "swap": {
                "head": LEAF_HEAD,
                "pair": SEED_PAIR,
                "stem": SEED_STEM,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "look_left": YOUNG_EYES["look_left"],
                    "look_right": YOUNG_EYES["look_right"],
                },
            },
            "origins": {
                "head": LEAF_HEAD_AT,
                "pair": (12, 21),
                "leafStill": (21, 20),
                "stem": (14, 22),
                **seat_young(LEAF_HEAD_AT, LEAF_HEAD, cheeks=False, eye_dy=1, mouth_dy=4),
            },
            "motion": {
                "head": {"dy": S_BOB},
                "eyes": {"dy": S_BOB, "art": S_EYES},
                "mouth": {"dy": S_BOB},
                "pair": {"dy": [0] * 8},
                "leafStill": {"dy": [0] * 8},
                "stem": {"dy": [0] * 8},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(8, "growing"),
            "palette": BUD_PALETTE,
            "hide": ["leafUp"],
            "swap": {
                "head": BUD,
                "dots": BUD_DOTS,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
                "cheeks": young_cheeks(face_box(BUD)[2]),
            },
            "variants": {
                "head": {"left": BUD_LEFT, "right": BUD_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"]},
            },
            "origins": {
                "head": BUD_AT,
                "dots": (13, 12),
                "pair": (11, 20),
                "leafStill": (20, 18),
                "stem": (14, 22),
                **seat_young(BUD_AT, BUD, eye_dy=1, mouth_dy=4),
            },
            "motion": {
                "head": {"dy": G_BOB, "art": G_HEAD},
                "dots": {"dy": G_BOB},
                "eyes": {"dy": G_BOB, "dx": G_DX, "art": G_BLINK},
                "cheeks": {"dy": G_BOB, "dx": G_DX},
                "mouth": {"dy": G_BOB, "dx": G_DX},
                "pair": {"dy": [0] * 10},
                "leafStill": {"dy": [0] * 10},
                "stem": {"dy": [0] * 10},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "stem", "origin": (14, 22), "rows": STEM},
        {"name": "pair", "origin": (11, 20), "rows": PAIR},
        {"name": "leafStill", "origin": (20, 18), "rows": LEAF_STILL},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        {"name": "dots", "origin": (11, 7), "rows": DOTS},
        *feature_parts(HEAD_AT, HEAD, eyes="round", mouth="smile", eye_dy=1, mouth_dy=4),
        {
            # Drawn last, over the flower: the whole gesture is the leaf being held UP,
            # in front of the creature, between it and the light.
            "name": "leafUp",
            "origin": (4, 17),
            "rows": LEAF_PLAIN,
            "variants": {"lit": LEAF_BACKLIT, "holes": LEAF_PERFORATED},
        },
    ],
    #
    #  0    1     2      3     4     5      6      7      8     9    10   11   12    13
    # rest reach LIFT   LIFT   lit   lit   HOLES  HOLES  HOLES lower rest rest blink rest
    #
    # The gesture is frames 2-9 and it is this sprite's trademark: the leaf goes up, goes
    # backlit, and only THEN do the perforations light through it - three stages, because
    # that is the order the effect actually happens in when a person does it. The creature
    # turns to look at the leaf it is holding, which is what makes it a demonstration
    # rather than a special effect. Frame 0 is the rest pose reduced motion freezes on:
    # leaf down, ordinary green.
    "motion": {
        "leafUp": {
            "art": [None, None, None, "lit", "lit", "lit", "holes", "holes", "holes",
                    "lit", None, None, None, None],
            "dx": [0, 0, 1, 2, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0],
            "dy": [0, -1, -5, -8, -9, -9, -9, -9, -9, -4, 0, 0, 0, 0],
        },
        "head": {
            "art": HEAD_ART,
            "dy": [0, 0, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, "wide", "wide", "wide", "wide", "wide", "wide",
                    "happy", None, None, None, "blink", None],
            "dx": FACE_DX,
            "dy": [0, 0, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0],
        },
        "cheeks": {"dx": FACE_DX, "dy": [0, 0, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0]},
        "mouth": {
            "art": [None, None, None, None, None, None, "grin", "grin", "grin",
                    "grin", None, None, None, None],
            "dx": FACE_DX,
            "dy": [0, 0, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0],
        },
        "dots": {"dy": [0, 0, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0]},
        "leafStill": {"lean": [0, 1, 1, 0, 0, -1, -1, 0, 0, 1, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
