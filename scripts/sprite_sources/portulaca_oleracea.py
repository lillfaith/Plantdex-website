"""Purslane (Portulaca oleracea) - creature portrait sprite.

THE DESIGN HOOK: purslane is a succulent. Its leaves are fat little water tanks, its
stems are red and rubbery, and it lies flat against hot bare ground looking entirely
untroubled while everything around it wilts. It also carries more omega-3 than any other
leafy plant anybody has bothered to measure, which is a fact it would absolutely mention.

Its silhouette is therefore ROUND and LOW - no spike, no plume, no crown. It is the
plumpest sprite in the set and the only one with no vertical element at all.

WHERE THE FACE GOES: in the fattest leaf pad, which is most of the plant.

PERSONALITY: smug. Its trademark gesture is THE PUFF - it draws water up, swells until
it is visibly rounder than it started, holds the pose, and then wobbles like set jelly
when it lets go. It is the only sprite that changes its own volume, and the only one
whose gesture is pure self-satisfaction with nothing happening to it at all.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

PALETTE = {
    **FACE_PALETTE,
    "G": (152, 224, 92, 255),   # pad highlight - succulents are glossy, so this is bright
    "g": (103, 204, 43, 255),   # pad mid
    "d": (69, 137, 37, 255),     # pad deep
    "n": (44, 96, 26, 255),      # pad shadow
    "R": (218, 82, 62, 255),   # the red stem purslane is known by
    "r": (168, 43, 33, 255),     # stem shadow
    "Y": (230, 207, 124, 255),   # the small yellow flower
}

HEAD_W, HEAD_H = 21, 17


def _pad(face_dx=0.0, light=(-0.85, -0.65), rx=9.6, ry=7.8):
    # Very shallow lobes: a succulent pad is smooth. What varies here is the RADII, which
    # is the whole gesture - this sprite acts by changing size.
    return flower_head(
        HEAD_W, HEAD_H, 10.0, 8.5, rx, ry, 4, 0.08, 5.2, 4.4,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _pad()
HEAD_LEFT = _pad(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _pad(face_dx=1.5, light=(-1.25, -0.65))
# Drawing water: fractionally taller before it goes wide, the breath in.
HEAD_DRAW = _pad(rx=9.2, ry=8.3)
# Full: visibly rounder than rest in both directions. This is the pose it is proud of.
HEAD_FULL = _pad(rx=10.4, ry=8.6)
# The wobble either side of letting go. Two frames of overshoot, opposite ways.
HEAD_WOBBLE_A = _pad(rx=10.2, ry=8.0)
HEAD_WOBBLE_B = _pad(rx=9.4, ry=8.4)

# Fat little leaf pads either side, held low. Blunt, thick and rounded - a purslane leaf
# has no point on it anywhere.
PAD_L = [
    "  ooo",
    " oGGGo",
    "oGGgggo",
    "oGggddo",
    " oddno",
    "  ooo",
]

PAD_R = [
    "ooo",
    "oGGGo",
    "oggGGGo",
    "oddggGo",
    " onddo",
    "  ooo",
]

# The small yellow flower purslane opens for a few hours of morning sun and no longer.
FLOWER = [
    "oYo",
    "YYY",
    "oYo",
]

# Red rubbery stems, sprawling sideways rather than standing up.
STEM_L = [
    "    ooo",
    "oooRRRo",
    "oRRRoo",
    "ooo",
]

STEM_R = [
    "ooo",
    "  oRRRo",
    "   oRRRooo",
    "     ooo",
]

HEAD_AT = (5, 6)

# --- Growth stages -----------------------------------------------------------
#
# SMUGNESS IS EARNED, so it arrives last. The trademark is the PUFF: it swells visibly
# rounder than it started, holds the pose three frames with its eyes shut, and wobbles
# like set jelly when it lets go. A seedling has neither the water to do that with nor the
# track record to be pleased about, so the gesture grows with the plant:
#
#   sprout    two fleshy seed leaves and a low pad. It draws a breath, swells barely, and
#             lets it straight back out — no hold, no wobble, nothing to be smug about.
#   growing   a real swell and ONE frame of holding it, then a single wobble.
#   flowering the full puff. Unchanged.
#
# BOTANICALLY. Purslane germinates with small fat cotyledons that are often red-tinged —
# the red stem is already there, and it is the field mark, so it stays at every stage. Its
# flower is the last thing to arrive and the least reliable thing to see: a few hours of
# morning sun and it shuts. The middle stage is that flower as a closed knot, green with
# the yellow only just showing through, which is how it spends nearly all of its time.

BUD_PALETTE = {
    "K": (206, 216, 126, 255),   # bud highlight — yellow beginning to show
    "k": (146, 172, 82, 255),    # bud mid, still green
}

# --- Sprout: two fat seed leaves, low to the ground -------------------------
YOUNG_HEAD_AT = (8, 12)


def _young_pad(face_dx=0.0, light=(-0.85, -0.65), rx=7.8, ry=5.6):
    return flower_head(
        17, 12, 8.0, 6.0, rx, ry, 4, 0.08, 5.4, 3.4,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_pad()
YOUNG_HEAD_LEFT = _young_pad(face_dx=-1.3, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_pad(face_dx=1.3, light=(-1.25, -0.65))
# The whole of its swell, and it is small. A seedling holds very little water.
YOUNG_HEAD_FULL = _young_pad(rx=8.2, ry=5.9)

PAD_L_YOUNG = [
    " ooo",
    "oGGGo",
    "oGgddo",
    " oooo",
]

PAD_R_YOUNG = [
    "ooo",
    "oGGGo",
    "oddgGo",
    " oooo",
]

STEM_L_YOUNG = [
    "  ooo",
    "ooRRRo",
    "ooo",
]

STEM_R_YOUNG = [
    "ooo",
    " oRRRoo",
    "   ooo",
]

# --- Growing: the bud, shut as it almost always is --------------------------
MID_HEAD_AT = (7, 10)


def _mid_pad(face_dx=0.0, light=(-0.85, -0.65), rx=8.8, ry=6.6):
    return flower_head(
        19, 14, 9.0, 7.0, rx, ry, 4, 0.08, 5.4, 3.8,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


MID_HEAD = _mid_pad()
MID_HEAD_LEFT = _mid_pad(face_dx=-1.4, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_pad(face_dx=1.4, light=(-1.25, -0.65))
MID_HEAD_DRAW = _mid_pad(rx=8.5, ry=7.0)
MID_HEAD_FULL = _mid_pad(rx=9.5, ry=7.3)
MID_HEAD_WOBBLE = _mid_pad(rx=9.3, ry=6.8)

BUD_SHUT = [
    " oo",
    "okKo",
    " oo",
]

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(MID_HEAD, MID_HEAD_LEFT)
G_R_DX, _ = face_shift(MID_HEAD, MID_HEAD_RIGHT)

SPRITE = {
    "herbId": "portulaca-oleracea",
    "personality": "smug",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(8, "sprout"),
            "hide": ["flower", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "padL": PAD_L_YOUNG,
                "padR": PAD_R_YOUNG,
                "stemL": STEM_L_YOUNG,
                "stemR": STEM_R_YOUNG,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {
                    "left": YOUNG_HEAD_LEFT,
                    "right": YOUNG_HEAD_RIGHT,
                    "full": YOUNG_HEAD_FULL,
                },
                "eyes": {"blink": YOUNG_EYES["blink"], "wide": YOUNG_EYES["wide"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "padL": (3, 18),
                "padR": (22, 18),
                "stemL": (2, 21),
                "stemR": (21, 21),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=1, mouth_dy=4
                ),
            },
            # In, and straight back out. There is no hold, because there is nothing yet
            # to be pleased about.
            "motion": {
                "head": {
                    "art": [None, None, "full", "full", None, "right", None, None],
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, "wide", "wide", None, None, None, "blink", None],
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0],
                    "dx": [0, 0, 0, 0, 0, S_R_DX, 0, 0],
                },
                "mouth": {
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0],
                    "dx": [0, 0, 0, 0, 0, S_R_DX, 0, 0],
                },
                "padL": {"dx": [0, 0, -1, -1, 0, 0, 0, 0]},
                "padR": {"dx": [0, 0, 1, 1, 0, 0, 0, 0]},
                "stemL": {"dx": [0, 0, -1, -1, 0, 0, 0, 0]},
                "stemR": {"dx": [0, 0, 1, 1, 0, 0, 0, 0]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(8, "growing"),
            "palette": BUD_PALETTE,
            "hide": ["cheeks"],
            "swap": {
                "head": MID_HEAD,
                "flower": BUD_SHUT,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {
                    "left": MID_HEAD_LEFT,
                    "right": MID_HEAD_RIGHT,
                    "draw": MID_HEAD_DRAW,
                    "full": MID_HEAD_FULL,
                    "wobble": MID_HEAD_WOBBLE,
                },
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "wide": YOUNG_EYES["wide"],
                    "shut": YOUNG_EYES["shut"],
                },
            },
            "origins": {
                "head": MID_HEAD_AT,
                "flower": (14, 8),
                "padL": (1, 17),
                "padR": (24, 17),
                "stemL": (0, 21),
                "stemR": (22, 21),
                **seat_young(
                    MID_HEAD_AT, MID_HEAD, cheeks=False, eye_dy=1, mouth_dy=4
                ),
            },
            # A real swell, held for one frame, and one wobble on the way down. The
            # three-frame hold and the second overshoot are what mastery buys.
            "motion": {
                "head": {
                    "art": [None, "draw", "full", "full", "full", "wobble", None,
                            "right", None, None],
                    "dy": [0, -1, 0, 0, 0, 0, 1, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, "wide", "shut", "shut", "shut", None, None, None,
                            "blink", None],
                    "dy": [0, -1, 0, 0, 0, 0, 1, 0, 0, 0],
                    "dx": [0, 0, 0, 0, 0, 1, 0, G_R_DX, 0, 0],
                },
                "mouth": {
                    "dy": [0, -1, 0, 0, 0, 0, 1, 0, 0, 0],
                    "dx": [0, 0, 0, 0, 0, 1, 0, G_R_DX, 0, 0],
                },
                "padL": {"dx": [0, 0, -1, -1, -1, -1, 0, 0, 0, 0]},
                "padR": {"dx": [0, 0, 1, 1, 1, 1, 0, 0, 0, 0]},
                "stemL": {"dx": [0, 0, -1, -1, -1, 0, 0, 0, 0, 0]},
                "stemR": {"dx": [0, 0, 1, 1, 1, 0, 0, 0, 0, 0]},
                "flower": {"dy": [0, -1, -1, -1, -1, 0, 1, 0, 0, 0]},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "stemL", "origin": (0, 21), "rows": STEM_L},
        {"name": "stemR", "origin": (22, 21), "rows": STEM_R},
        {"name": "padL", "origin": (0, 16), "rows": PAD_L},
        {"name": "padR", "origin": (24, 16), "rows": PAD_R},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {
                "left": HEAD_LEFT,
                "right": HEAD_RIGHT,
                "draw": HEAD_DRAW,
                "full": HEAD_FULL,
                "wobbleA": HEAD_WOBBLE_A,
                "wobbleB": HEAD_WOBBLE_B,
            },
        },
        {"name": "flower", "origin": (14, 4), "rows": FLOWER},
        *feature_parts(
            HEAD_AT, HEAD, eyes="round", mouth="smile", eye_dy=1, mouth_dy=4,
            # Pleased with itself, eyes closed. Smugness is a closed-eye expression.
            extra_eyes={"smug": ["oo  oo", "EE  EE"]},
        ),
    ],
    #
    #  0    1    2     3     4     5     6     7      8      9     10   11   12    13
    # rest draw draw  PUFF  PUFF  FULL  FULL  hold  wobble wobble sag rest blink rest
    #
    # The puff is frames 1-9 and it is this sprite's trademark: it swells, holds the pose
    # for three frames with its eyes shut, and then wobbles - two frames of overshoot in
    # opposite directions, because a bag of water does not stop moving when it stops
    # being squeezed. Frame 0 is the rest pose reduced motion freezes on - fat, but not
    # yet showing off.
    "motion": {
        "head": {
            "art": [None, "draw", "draw", "full", "full", "full", "full", "full",
                    "wobbleA", "wobbleB", None, "right", None, None],
            "dy": [0, -1, -1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        },
        "eyes": {
            "art": [None, "wide", "wide", "smug", "smug", "smug", "smug", "smug",
                    None, None, None, None, "blink", None],
            "dy": [0, -1, -1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 1, -1, 0, 2, 0, 0],
        },
        "cheeks": {
            "dy": [0, -1, -1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 1, -1, 0, 1, 0, 0],
        },
        "mouth": {
            "art": [None, None, None, "grin", "grin", "grin", "grin", "grin", None,
                    None, None, None, None, None],
            "dy": [0, -1, -1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 1, -1, 0, 1, 0, 0],
        },
        # The side pads get pushed OUT by the swelling body rather than moving themselves.
        # They are being displaced, which is what sells the volume.
        "padL": {"dx": [0, 0, 0, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0]},
        "padR": {"dx": [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]},
        "flower": {"dy": [0, -1, -2, -1, -1, -1, -1, -1, 0, 0, 1, 0, 0, 0]},
        "stemL": {"dx": [0, 0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0]},
        "stemR": {"dx": [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
