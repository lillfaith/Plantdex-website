"""Evening Primrose (Oenothera biennis) - creature portrait sprite.

THE DESIGN HOOK is in the name. This is the plant that opens at dusk - the flowers unfurl in
the evening, are worked by moths rather than bees, and are finished by the middle of the next
morning. Everything else in the deck is a daytime creature. This one is awake when they are
not, and the whole sprite is built on that.

FOUR PETALS, AND THE COUNT IS THE POINT. `flower_head` takes a lobe count, and four broad
lobes at a high amplitude is a different silhouette from the dandelion's eight - which matters
here more than anywhere else in the set, because these are the only two yellow heads built the
same way. Three more separations, all deliberate: a pale LEMON against the dandelion's gold, a
TALL STEM rather than a bare scape over a rosette, and a closed BUD riding on that stem. A
real O. biennis carries buds, open flowers and spent ones on one spike at the same time, so
the thing that keeps the two apart is also the botany.

WHERE THE FACE GOES: in the flower, which is the organ everybody looks at - and the mane IS
the `flower_head`, never a ring hung beside a dome.

PERSONALITY: nocturnal. Its trademark gesture is THE DUSK TURN - the head turns to follow the
last of the light, petals spreading as it goes, holds at the far end of the turn, and comes
back. `flower_head`'s own docstring names what makes a turn read as three-dimensional: the
face slides one way and the highlight slides the other, and neither works alone. Nothing else
in the set opens on a schedule.

Frame 0 is the flower OPEN and square-on. A resting pose has to be a complete, dignified
sprite, never a stub mid-gesture, and an open primrose is what the card shows.

COLOUR: leaves at ~88 deg, in the gap between wood sorrel and lamb's quarters, taking a
saturation and lightness bias that differs from both so no two neighbours in hue are separable
on one axis alone. The flower sits at ~50, which is 38 deg away - outside the 34 the set
forbids between a species' leaves and its own flower. Midtones stay under the saturation cap.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

import math

from _face import FACE_PALETTE, face_box, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks

PALETTE = {
    **FACE_PALETTE,
    "H": (247, 236, 161, 255),   # petal highlight - lemon, not the dandelion's gold
    "M": (238, 219, 99, 255),    # petal mid
    "D": (226, 202, 50, 255),    # petal deep
    "S": (188, 168, 36, 255),    # petal shadow. The whole ramp holds ONE hue and
                                 # varies only lightness: walking the hue down as it
                                 # darkened turned this petal olive, which reads as a dead
                                 # one at full size and as a hat at thumbnail size.
    "G": (147, 199, 87, 255),    # leaf highlight
    "g": (111, 166, 48, 255),    # leaf mid
    "d": (82, 120, 38, 255),     # leaf deep
    "n": (58, 83, 29, 255),      # leaf shadow
    "K": (200, 216, 182, 255),   # the pale midrib down each leaf
}

# --- The flower --------------------------------------------------------------
#
# FOUR lobes at a deep amplitude, ROTATED BY HALF A LOBE. A four-lobed curve bulges at 0,
# 90, 180 and 270 degrees by default, which puts a petal straight up and down - and with the
# face carved out of the middle those two get squeezed to spurs and the whole head reads as a
# cross. `phase` turns it 45 degrees so the four petals sit at the corners, where each has
# room to be a petal. Same number as the maple's: one argument between a shape and a blob.
#
# The amplitude has to be DEEP. At 0.16 the notches vanish and the head is a circle; what is
# left after the face is carved out is a ring, and shallow lobes on a ring read as nothing.
HEAD_W, HEAD_H = 27, 21


def _head(rx=10.0, ry=8.6, face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        HEAD_W, HEAD_H, 13.0, 10.0, rx, ry, 4, 0.30, 5.0, 4.6,
        face_dx=face_dx, phase=math.pi / 4, light=light,
        trim_tail=False, chars="HMDSFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.6, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.6, light=(-1.25, -0.65))
# The petals SPREAD at the far end of the turn. Opening is what this plant is for, so the
# gesture has to contain an opening rather than only a rotation.
HEAD_WIDE = _head(rx=10.6, ry=9.1, face_dx=1.6, light=(-1.25, -0.65))

HEAD_AT = (2, 0)

L_DX, _ = face_shift(HEAD, HEAD_LEFT)
R_DX, _ = face_shift(HEAD, HEAD_RIGHT)

# --- The bud -----------------------------------------------------------------
#
# Riding on the stem beside the open flower, because that is how the spike is built: buds
# above, open flowers in the middle, spent ones below, all at once. It is also what stops
# the silhouette being a dandelion's.
BUD = [
    " oo ",
    "oMDo",
    "oMDo",
    "oGdo",
    "oGdo",
    " ogo",
    "  oo",
]

BUD_AT = (18, 16)

# A bud opens a little at dusk too - not all the way, just enough to show colour.
BUD_OPEN = [
    "o  o",
    "oMMo",
    "oMDo",
    "oMDo",
    "oGdo",
    " ogo",
    "  oo",
]

# --- Stem and leaves ---------------------------------------------------------
#
# LANCE-SHAPED with a PALE MIDRIB, which is the identification trait this species is known
# for at the rosette stage and the reason the leaves are not the soft ovals most of the deck
# carries.
STEM = [
    "odgo",
    "odgo",
    "odgo",
    "odgo",
    "odgo",
    "odgo",
    "odgo",
    "odgo",
    " oo ",
]

STEM_AT = (14, 16)

LEAF_L = [
    "    ooo",
    "  ooGGo",
    " oGKGgo",
    "oGKGggo",
    "oGKgggo",
    " oKgddo",
    "  ogdo ",
    "   oo  ",
]

LEAF_R = [row[::-1] for row in LEAF_L]

LEAF_L_AT = (8, 18)
LEAF_R_AT = (19, 19)

# --- Growth stages -----------------------------------------------------------
#
#   sprout    the first-year ROSETTE, which is the whole of what this plant is for a year:
#             O. biennis is a biennial and spends its first summer as a flat rosette of
#             lance leaves with a pale midrib, and never flowers at all.
#   growing   a stem with the flower still in BUD. Closed, green, colour just showing - the
#             state the plant is in every daylight hour of its second summer.
#   flowering open, and turning.

ROSETTE_W, ROSETTE_H = 19, 13


def _rosette(rx=8.6, ry=5.8, light=(-0.85, -0.65)):
    return flower_head(
        ROSETTE_W, ROSETTE_H, 9.0, 6.2, rx, ry, 7, 0.22, 5.6, 4.0,
        light=light, trim_tail=False, chars="GgdnFo",
    )


ROSETTE = _rosette()
ROSETTE_AT = (6, 11)

MID_HEAD_W, MID_HEAD_H = 13, 15


def _mid_head(rx=5.4, ry=6.4, face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        MID_HEAD_W, MID_HEAD_H, 6.0, 7.0, rx, ry, 5, 0.14, 4.6, 3.6,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


MID_HEAD = _mid_head()
MID_HEAD_LEFT = _mid_head(face_dx=-1.2, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_head(face_dx=1.2, light=(-1.25, -0.65))

MID_HEAD_AT = (9, 4)

G_L_DX, _ = face_shift(MID_HEAD, MID_HEAD_LEFT)
G_R_DX, _ = face_shift(MID_HEAD, MID_HEAD_RIGHT)

MID_STEM = [
    "odgo",
    "odgo",
    "odgo",
    "odgo",
    "odgo",
    " oo ",
]

MID_LEAF_L = [
    "   ooo",
    " ooGGo",
    "oGKGgo",
    "oGKggo",
    " oKddo",
    "  ooo ",
]

MID_LEAF_R = [row[::-1] for row in MID_LEAF_L]

# The young loops. Whatever a species does that nothing else in the set does stays with the
# open flower, so mastery buys something a player can actually see: a bud can look about,
# but only an open primrose turns to follow the light and spreads as it goes.
S_BOB = [0, 0, -1, -1, 0, 0, 0, 0]
S_EYES = [None, None, "half", "half", None, None, "blink", None]

G_BOB = [0, 0, -1, -1, -1, 0, 0, 0, 0, 0]
G_HEAD = [None, None, "right", "right", None, "left", None, None, None, None]
G_DX = [0, 0, G_R_DX, G_R_DX, 0, G_L_DX, 0, 0, 0, 0]
G_EYES = [None, None, "half", "half", None, None, None, "blink", None, None]


SPRITE = {
    "herbId": "oenothera-biennis",
    "personality": "nocturnal",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(6, "sprout"),
            "hide": ["bud", "stem", "cheeks"],
            "swap": {
                "head": ROSETTE,
                "leafL": MID_LEAF_L,
                "leafR": MID_LEAF_R,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "eyes": {"blink": YOUNG_EYES["blink"], "half": YOUNG_EYES["half"]},
            },
            "origins": {
                "head": ROSETTE_AT,
                "leafL": (5, 20),
                "leafR": (21, 20),
                **seat_young(ROSETTE_AT, ROSETTE, cheeks=False, eye_dy=1, mouth_dy=4),
            },
            "motion": {
                "head": {"dy": S_BOB},
                "eyes": {"dy": S_BOB, "art": S_EYES},
                "mouth": {"dy": S_BOB},
                "leafL": {"dy": [0, 0, 0, -1, -1, 0, 0, 0]},
                "leafR": {"dy": [0, 0, 0, -1, -1, 0, 0, 0]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(6, "growing"),
            "hide": ["bud"],
            "swap": {
                "head": MID_HEAD,
                "stem": MID_STEM,
                "leafL": MID_LEAF_L,
                "leafR": MID_LEAF_R,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
                "cheeks": young_cheeks(face_box(MID_HEAD)[2]),
            },
            "variants": {
                "head": {"left": MID_HEAD_LEFT, "right": MID_HEAD_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"], "half": YOUNG_EYES["half"]},
            },
            "origins": {
                "head": MID_HEAD_AT,
                "stem": (14, 16),
                "leafL": (8, 19),
                "leafR": (18, 19),
                **seat_young(MID_HEAD_AT, MID_HEAD, eye_dy=1, mouth_dy=4),
            },
            "motion": {
                "head": {"dy": G_BOB, "art": G_HEAD},
                "eyes": {"dy": G_BOB, "dx": G_DX, "art": G_EYES},
                "cheeks": {"dy": G_BOB, "dx": G_DX},
                "mouth": {"dy": G_BOB, "dx": G_DX},
                "leafL": {"dy": [0, 0, 0, -1, -1, 0, 0, 0, 0, 0]},
                "leafR": {"dy": [0, 0, 0, -1, -1, 0, 0, 0, 0, 0]},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 6,
    # Stem and leaves under the flower; the bud rides beside it on its own short stalk.
    "parts": [
        {"name": "stem", "origin": STEM_AT, "rows": STEM},
        {"name": "leafL", "origin": LEAF_L_AT, "rows": LEAF_L},
        {"name": "leafR", "origin": LEAF_R_AT, "rows": LEAF_R},
        {
            "name": "bud",
            "origin": BUD_AT,
            "rows": BUD,
            "variants": {"open": BUD_OPEN},
        },
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {
                "left": HEAD_LEFT,
                "right": HEAD_RIGHT,
                "wide": HEAD_WIDE,
            },
        },
        *feature_parts(HEAD_AT, HEAD, eyes="round", mouth="smile", eye_dy=1, mouth_dy=4),
    ],
    #
    #  0    1     2      3      4     5     6     7     8     9   10   11   12    13
    # rest still turn   turn   open  open  open  hold  back  back centre rest blink rest
    #
    # THE DUSK TURN, frames 2-9. The head comes round to the last of the light, the petals
    # spread once it gets there, and it comes back. Six frames per second, the slowest tier
    # in the set: this plant opens over an evening, and a low frame rate is itself a
    # character note - the same reason mullein runs at six.
    #
    # THE TURN IS TWO THINGS AT ONCE and neither works alone. The face slides across the
    # head AND the highlight slides the other way; move only the face and the eyes wander
    # on a flat disc, move only the light and the sun moved instead of the flower.
    #
    # The bud opens a little on the same beat. It is the one thing on the stem that can
    # answer the flower, and a spike where only the top moves reads as a cut stem.
    "motion": {
        "head": {
            "art": [None, None, "right", "right", "wide", "wide", "wide", "right",
                    "left", "left", None, None, None, None],
            "dy": [0, 0, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, None, None, None, None, None, None, None, None,
                    None, None, "blink", None],
            "dx": [0, 0, R_DX, R_DX, R_DX, R_DX, R_DX, R_DX, L_DX, L_DX, 0, 0, 0, 0],
            "dy": [0, 0, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 0, R_DX, R_DX, R_DX, R_DX, R_DX, R_DX, L_DX, L_DX, 0, 0, 0, 0],
            "dy": [0, 0, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, None, None, "grin", "grin", "grin", None, None, None,
                    None, None, None, None],
            "dx": [0, 0, R_DX, R_DX, R_DX, R_DX, R_DX, R_DX, L_DX, L_DX, 0, 0, 0, 0],
            "dy": [0, 0, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        "bud": {
            "art": [None, None, None, None, "open", "open", "open", "open", None, None,
                    None, None, None, None],
            "dy": [0, 0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        # The leaves lift a beat behind, so the turn reads as travelling down the plant
        # rather than happening to the flower alone.
        "leafL": {"dy": [0, 0, 0, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0]},
        "leafR": {"dy": [0, 0, 0, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
