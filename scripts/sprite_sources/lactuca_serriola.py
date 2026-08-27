"""Prickly Lettuce (Lactuca serriola) - creature portrait sprite.

THE DESIGN HOOK: prickly lettuce is the compass plant. Its leaves twist at the base until
the blades stand vertical and line up north-south, which shades them at midday and catches
the low sun morning and evening. A whole field of it points the same way, and people have
navigated by it. `Lactuca` is from lac, milk, for the white sap that runs out of a cut
stem, and there is a row of spines down the underside of every midrib.

WHERE THE FACE GOES: in the leaf, in profile, so the alignment is visible - which is the
only sprite in this deck whose whole gesture would be invisible from any other angle.

PERSONALITY: orienting. Its trademark gesture is THE BEARING - the whole plant swings
like a compass needle, overshoots, swings back short, and settles pointing. Nothing else
in this deck has direction as a personality trait, and nothing else overshoots and
corrects.

An Epic card, and the reason this one earns it is that its trick is invisible until
somebody tells you about it. Then you cannot stop seeing it in car parks.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

PALETTE = {
    **FACE_PALETTE,
    "G": (192, 208, 161, 255),   # leaf highlight - a grey-green, not a salad green
    "g": (152, 166, 132, 255),   # leaf mid
    "d": (118, 134, 100, 255),     # leaf deep
    "n": (72, 83, 63, 255),      # leaf shadow
    "S": (237, 242, 228, 255),   # the spines down the midrib, carried on the stem - drawn
                                 # across the leaf as well they ended up through the face
    "M": (249, 250, 244, 255),   # the milky sap `Lactuca` is named for
    "Y": (226, 220, 194, 255),   # the small pale yellow flowers
    "N": (225, 230, 216, 255),   # the bearing marks, which appear only while it swings
}

HEAD_W, HEAD_H = 17, 17


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    # Tall rather than wide: these leaves stand on EDGE, which is the entire point of the
    # species, and a round head would be drawing a plant that had given up on it.
    return flower_head(
        HEAD_W, HEAD_H, 8.0, 8.0, 6.8, 8.0, 6, 0.16, 4.8, 4.4,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.4, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.4, light=(-1.25, -0.65))

# A bead of milky sap at a broken edge. It appears once, low down, and it is the only
# white in the sprite that is not a spine.
SAP_NONE = [
    " ",
]

SAP = [
    "M",
    "M",
]

# The bearing marks: two small ticks either side, present only while it is swinging. They
# are the sprite saying "this is a direction" without a compass rose, which would be a
# machine rather than a plant.
MARKS_NONE = [
    " ",
]

MARKS = [
    "N" + " " * 24 + "N",
]

# The stem leaves, clasping the stem and standing on edge like everything else here.
BLADE_L = [
    "  ooo",
    " oGGgo",
    "oGgggdo",
    " ogddno",
    "  ooo",
]

BLADE_R = [
    "ooo",
    "ogGGo",
    "odgggGo",
    " onddgo",
    "  ooo",
]

FLOWERS = [
    "oYo oYo",
    "YYY YYY",
    " o   o",
]

STEM = [
    "ogSdo",
    "ogSdo",
    "ogSdo",
    " ooo ",
]

HEAD_AT = (7, 4)
TURN_L = face_shift(HEAD, HEAD_LEFT)[0]
TURN_R = face_shift(HEAD, HEAD_RIGHT)[0]
# A needle finding north: a big swing one way, a smaller correction back, a smaller one
# again, and rest. Each overshoot is about half the last, which is what makes it read as
# settling rather than as rocking.
HEAD_ART = [None, "right", "right", "left", "left", "left", "right", "right", "left",
            None, None, None, None, None]
SWING = [0, 4, 5, -4, -5, -3, 2, 3, -1, 0, 0, 0, 0, 0]
_SLIDE = {"left": TURN_L, "right": TURN_R}
FACE_DX = [dx + _SLIDE.get(art, 0) for dx, art in zip(SWING, HEAD_ART)]

# --- Growth stages -----------------------------------------------------------
#
# THE COMPASS IS A PROPERTY OF THE STEM LEAVES, and that is the whole ladder. Prickly
# lettuce is a winter annual: it spends its first season as a FLAT ROSETTE, and the
# blades that twist at the base and line up north-south are the ones that come later, on
# the stem. A rosette cannot point, and it is the most satisfying gate in this set
# because it is not a rule imposed on the drawing — it is simply what the plant does.
#
#   sprout    the first-year rosette, leaves lying flat. It turns once, aimlessly, and
#             stops. No bearing marks, because there is no bearing.
#   growing   the stem up, the blades on edge and aligned. It swings and finds the
#             bearing — with ONE overshoot, not the full damped series.
#   flowering the full swing: overshoot, correction, smaller correction, rest. Each about
#             half the one before it, which is what makes a needle read as settling.
#             Unchanged.
#
# THE MILKY SAP is what `Lactuca` means and it runs from a cut stem at any age, so it
# stays from the middle stage on — the sprout has no stem to cut. The spines down the
# midrib are on the stem for the same reason.

BUD_PALETTE = {
    "K": (194, 206, 158, 255),   # bud highlight — green, before the pale yellow rays
    "k": (146, 162, 112, 255),   # bud mid
}

# --- Sprout: the first-year rosette, flat -----------------------------------
YOUNG_HEAD_AT = (8, 11)


def _young_head(face_dx=0.0, light=(-0.85, -0.65)):
    # WIDE, not tall — the opposite of the adult, and deliberately so. A first-year
    # rosette lies flat against the ground; the vertical blade is the thing this stage
    # has not got, and drawing it upright would be drawing the trick before the plant
    # has it.
    return flower_head(
        17, 13, 8.0, 6.2, 8.0, 6.0, 8, 0.20, 5.4, 3.6,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.4, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.4, light=(-1.25, -0.65))

BLADE_L_YOUNG = [
    "  ooo",
    " oGGgo",
    "oGgggdo",
    "  ooo",
]

BLADE_R_YOUNG = [
    "ooo",
    "ogGGo",
    "odgggGo",
    " ooo",
]

# --- Growing: on edge, and pointing -----------------------------------------
MID_HEAD_AT = (8, 10)


def _mid_head(face_dx=0.0, light=(-0.85, -0.65)):
    # Tall again: the blades have twisted onto their edges, which is the whole species.
    return flower_head(
        15, 14, 7.0, 6.6, 6.2, 6.6, 6, 0.16, 5.4, 3.8,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


MID_HEAD = _mid_head()
MID_HEAD_LEFT = _mid_head(face_dx=-1.3, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_head(face_dx=1.3, light=(-1.25, -0.65))

# The flower heads shut: small green knots, no rays out.
BUDS = [
    "oKo oKo",
    "okKo oko",
    " o   o",
]

S_TURN_L = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)[0]
S_TURN_R = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)[0]
S_HEAD_ART = [None, "right", "right", None, "left", None, None, None]
S_SWING = [0, 2, 2, 0, -2, 0, 0, 0]
_S_SLIDE = {"left": S_TURN_L, "right": S_TURN_R}
S_FACE_DX = [dx + _S_SLIDE.get(a, 0) for dx, a in zip(S_SWING, S_HEAD_ART)]

G_TURN_L = face_shift(MID_HEAD, MID_HEAD_LEFT)[0]
G_TURN_R = face_shift(MID_HEAD, MID_HEAD_RIGHT)[0]
# One overshoot and one correction. The third and fourth swings are the adult's, and
# they are what turns a swing into a needle finding north.
G_HEAD_ART = [None, "right", "right", "left", "left", "right", None, None, None, None]
G_SWING = [0, 4, 5, -3, -4, 2, 0, 0, 0, 0]
_G_SLIDE = {"left": G_TURN_L, "right": G_TURN_R}
G_FACE_DX = [dx + _G_SLIDE.get(a, 0) for dx, a in zip(G_SWING, G_HEAD_ART)]

SPRITE = {
    "herbId": "lactuca-serriola",
    "personality": "orienting",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(10, "sprout"),
            # No stem, so no sap and no spines; no marks, because there is no bearing to
            # read.
            "hide": ["stem", "flowers", "marks", "sap", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "bladeL": BLADE_L_YOUNG,
                "bladeR": BLADE_R_YOUNG,
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
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "bladeL": (3, 19),
                "bladeR": (21, 19),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=1, mouth_dy=3
                ),
            },
            # One turn, and it settles wherever it happens to stop. There is nothing to
            # correct toward.
            "motion": {
                "head": {"art": S_HEAD_ART, "dx": S_SWING},
                "eyes": {
                    "art": [None, None, "half", None, None, None, "blink", None],
                    "dx": S_FACE_DX,
                },
                "mouth": {"dx": S_FACE_DX},
                "bladeL": {"dx": [dx // 2 for dx in S_SWING]},
                "bladeR": {"dx": [dx // 2 for dx in S_SWING]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(10, "growing"),
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
                    "wide": YOUNG_EYES["wide"],
                    "half": YOUNG_EYES["half"],
                },
            },
            "origins": {
                "head": MID_HEAD_AT,
                "flowers": (12, 7),
                "bladeL": (6, 18),
                "bladeR": (19, 18),
                "stem": (14, 20),
                "marks": (2, 14),
                "sap": (22, 21),
                **seat_young(
                    MID_HEAD_AT, MID_HEAD, cheeks=False, eye_dy=1, mouth_dy=4
                ),
            },
            # A swing and one correction. It arrives at a bearing; it does not yet
            # arrive at it the way a needle does.
            "motion": {
                "head": {"art": G_HEAD_ART, "dx": G_SWING},
                "eyes": {
                    "art": [None, "wide", "wide", "wide", None, None, None, None,
                            "blink", None],
                    "dx": G_FACE_DX,
                },
                "mouth": {"dx": G_FACE_DX},
                "marks": {
                    "art": [None, "on", "on", "on", "on", "on", None, None, None, None],
                },
                "sap": {
                    "art": [None, None, None, None, None, None, None, "on", "on", None],
                    "dy": [0, 0, 0, 0, 0, 0, 0, 0, 2, 0],
                },
                "flowers": {
                    "dx": G_SWING,
                    "lean": [0, -2, -2, 2, 2, -1, 0, 0, 0, 0],
                },
                "bladeL": {"dx": [dx // 2 for dx in G_SWING]},
                "bladeR": {"dx": [dx // 2 for dx in G_SWING]},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 10,
    "parts": [
        {"name": "stem", "origin": (14, 20), "rows": STEM},
        {"name": "bladeL", "origin": (6, 18), "rows": BLADE_L},
        {"name": "bladeR", "origin": (19, 18), "rows": BLADE_R},
        {"name": "flowers", "origin": (12, 3), "rows": FLOWERS},
        {
            "name": "marks",
            # Far enough out that the head never covers them however far it swings.
            "origin": (2, 13),
            "rows": MARKS_NONE,
            "variants": {"on": MARKS},
        },
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(HEAD_AT, HEAD, eyes="narrow", mouth="line", eye_dy=2, mouth_dy=5),
        {
            "name": "sap",
            "origin": (23, 21),
            "rows": SAP_NONE,
            "variants": {"on": SAP},
        },
    ],
    #
    #  0     1     2     3      4      5     6     7     8     9    10   11   12    13
    # rest SWING SWING BACK   BACK   back  over  over  settle rest rest rest blink rest
    #
    # The bearing is frames 1-8 and it is this sprite's trademark: a full swing, an
    # overshoot the other way, a smaller correction, and rest. Each overshoot is about
    # half the one before it, which is the only thing that makes a needle read as
    # settling rather than as swaying. Frame 0 is the rest pose reduced motion freezes on:
    # pointing, and level.
    "motion": {
        "head": {"art": HEAD_ART, "dx": SWING},
        "eyes": {
            "art": [None, "wide", "wide", "wide", "wide", None, None, None, None,
                    None, None, None, "blink", None],
            "dx": FACE_DX,
        },
        "cheeks": {"dx": [dx // 2 + s for dx, s in
                          zip(SWING, [_SLIDE.get(a, 0) for a in HEAD_ART])]},
        "mouth": {
            "art": [None, None, None, None, None, None, None, None, None, None,
                    None, None, None, None],
            "dx": [dx // 2 + s for dx, s in
                   zip(SWING, [_SLIDE.get(a, 0) for a in HEAD_ART])],
        },
        # The marks show only while it is actually turning, and they are gone the moment
        # it settles - which is what makes them a reading rather than a decoration.
        "marks": {
            "art": [None, "on", "on", "on", "on", "on", "on", "on", None, None,
                    None, None, None, None],
        },
        # One bead of milky sap, once, near the end - the plant's own name, mentioned
        # quietly rather than made into the gesture.
        "sap": {
            "art": [None, None, None, None, None, None, None, None, None, "on",
                    "on", None, None, None],
            "dy": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
        },
        "flowers": {"dx": SWING, "lean": [0, -2, -2, 2, 2, 1, -1, -1, 1, 0, 0, 0, 0, 0]},
        "bladeL": {"dx": [dx // 2 for dx in SWING]},
        "bladeR": {"dx": [dx // 2 for dx in SWING]},
    },
    "palette": PALETTE,
}
