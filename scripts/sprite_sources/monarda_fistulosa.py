"""Bee Balm (Monarda fistulosa) - creature portrait sprite.

THE DESIGN HOOK: wild bergamot's flower head is a shaggy crown of long tubular florets
sticking out in every direction, and it opens from the outside in, so a head halfway
through flowering has a ring of open tubes round a bare middle. It is the most eccentric
flower shape in this deck, and it looks like nothing so much as a mane after a long day.

WHERE THE FACE GOES: under the crown, so the crown can be worn and shaken. The face is
placed low, because the crown is the performance and it should have the room.

PERSONALITY: flamboyant. Its trademark gesture is THE FLOURISH - it shakes its whole
shaggy crown out, floret by floret, in a wave that runs round the head rather than
happening all at once, and holds the last pose a beat too long. It is the only sprite
that performs for an audience.

The deck's other two bee plants make a set worth reading together: lemon balm is named
for the bee and waits calmly for one, catnip has forgotten bees exist, and this one is
putting on a show.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

PALETTE = {
    **FACE_PALETTE,
    "V": (248, 180, 248, 255),   # floret highlight - wild bergamot is a soft lilac-pink
    "v": (217, 93, 212, 255),   # floret mid
    "q": (175, 48, 175, 255),   # floret deep
    "Q": (115, 33, 120, 255),    # floret shadow
    "R": (223, 87, 119, 255),   # the warmer pink at the tube mouths
    "G": (61, 217, 54, 255),   # leaf highlight
    "g": (43, 157, 47, 255),    # leaf mid
    "d": (30, 110, 39, 255),     # leaf deep
    "n": (34, 94, 44, 255),      # leaf shadow
    "t": (53, 185, 51, 255),   # square stem
}

HEAD_W, HEAD_H = 17, 13
CROWN_W, CROWN_H = 21, 13


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        HEAD_W, HEAD_H, 8.0, 6.0, 7.6, 5.8, 6, 0.11, 4.8, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


def _crown(amp=0.30, rx=9.6, ry=5.8):
    # The most extreme lobe amplitude in the deck by a distance, and deliberately so:
    # everywhere else driving the lobes this hard broke the shape into pieces, and here
    # breaking into pieces is exactly what a shaggy crown of separate tubes should do.
    return flower_head(
        CROWN_W, CROWN_H, 10.0, 6.0, rx, ry, 13, amp, 0, 0,
        light=(-0.85, -0.8), trim_tail=False, chars="VvqQFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.4, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.4, light=(-1.25, -0.65))
CROWN = _crown()
# Three shakes, each throwing the florets a different way. Varying the RADII rather than
# the offsets is what makes the crown look like it is being tossed rather than slid.
CROWN_OUT = _crown(amp=0.38, rx=10.2)
CROWN_UP = _crown(amp=0.34, ry=6.4)
CROWN_FLAT = _crown(amp=0.26, ry=5.2, rx=10.0)

# The warmer mouths of the open tubes, which open from the outside of the head inward.
TUBES = [
    "R   R   R",
    " R  R  R",
]

# Lance leaves, held out. Sparse, so the crown has no competition.
LEAF_L = [
    "   ooo",
    " ooGGgo",
    "oGGgggddo",
    " oggddnno",
    "  ooooo",
]

LEAF_R = [
    "ooo",
    "ogGGoo",
    "oddgggGGo",
    " onnddggo",
    "  ooooo",
]

STEM = [
    "otto",
    "otto",
    "otto",
    " oo ",
]

HEAD_AT = (7, 12)

# --- Growth stages -----------------------------------------------------------
#
# A PERFORMER NEEDS A COSTUME. The flourish is the crown being tossed through three
# shapes and then HELD a beat too long, and every part of that depends on there being a
# shaggy crown of separate tubes to toss. So the ladder is the costume arriving:
#
#   sprout    lance leaves on a square stem and no crown at all. It has the temperament
#             and nothing to perform in, so it looks about for an audience and finds one
#             absent, which is a worse fate for this creature than for any other here.
#   growing   the head is there and SHUT — a tight knot of green bracts with the lilac
#             only beginning to show underneath. A closed head barely moves, so it tosses
#             what it has and does not hold the pose: nobody poses in a hat.
#   flowering the shaggy crown, the wave running round the head, and three frames of
#             holding the last shape. Unchanged.
#
# WILD BERGAMOT OPENS FROM THE OUTSIDE IN, which is why the adult's head has a ring of
# open tubes round a bare middle — and it is also why the shut stage is a plain knot
# rather than a small version of the crown. Those are two different shapes, not two sizes
# of one, which is the whole reason this deck draws stages at all.

BUD_PALETTE = {
    "K": (150, 206, 128, 255),   # bract highlight — green, the lilac still underneath
    "k": (104, 160, 96, 255),    # bract mid
}

# --- Sprout: no crown, and no audience --------------------------------------
YOUNG_HEAD_AT = (8, 13)


def _young_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        16, 14, 7.5, 6.6, 7.6, 6.4, 6, 0.11, 5.4, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.3, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.3, light=(-1.25, -0.65))

LEAF_L_YOUNG = [
    "  ooo",
    " ooGgo",
    "oGGgggdo",
    "  ooooo",
]

LEAF_R_YOUNG = [
    "ooo",
    "ogGoo",
    "oddgggGo",
    " ooooo",
]

STEM_SHORT = [
    "otto",
    "otto",
    " oo ",
]

# --- Growing: the head, shut ------------------------------------------------
MID_HEAD_AT = (8, 15)


def _mid_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        15, 13, 7.0, 6.0, 7.0, 5.8, 6, 0.11, 5.4, 3.6,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


MID_HEAD = _mid_head()
MID_HEAD_LEFT = _mid_head(face_dx=-1.3, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_head(face_dx=1.3, light=(-1.25, -0.65))


def _bud_crown(amp=0.12, rx=6.8, ry=3.6):
    # A knot, not a crown: shallow lobes and a squat ellipse. The lilac is present only
    # as the deep and shadow shades, which is the colour showing THROUGH the bracts
    # rather than out past them.
    return flower_head(
        15, 8, 7.0, 3.8, rx, ry, 10, amp, 0, 0,
        light=(-0.85, -0.8), trim_tail=False, chars="KkqQFo",
    )


BUD_CROWN = _bud_crown()
BUD_CROWN_OUT = _bud_crown(amp=0.18, rx=7.2)
BUD_CROWN_UP = _bud_crown(amp=0.16, ry=4.0)

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(MID_HEAD, MID_HEAD_LEFT)
G_R_DX, _ = face_shift(MID_HEAD, MID_HEAD_RIGHT)

SPRITE = {
    "herbId": "monarda-fistulosa",
    "personality": "flamboyant",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(10, "sprout"),
            "hide": ["crown", "tubes", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "leafL": LEAF_L_YOUNG,
                "leafR": LEAF_R_YOUNG,
                "stem": STEM_SHORT,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                    "wide": YOUNG_EYES["wide"],
                },
                "mouth": {"open": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "leafL": (4, 20),
                "leafR": (21, 20),
                "stem": (15, 24),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=1, mouth_dy=4
                ),
            },
            # It checks both ways for anybody watching. That is the entire loop, and for
            # this particular creature it is the saddest thing in the set.
            "motion": {
                "head": {
                    "art": [None, None, "left", None, "right", None, None, None],
                    "dy": [0, 1, 0, -1, 0, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, "half", "wide", "wide", "wide", None, "blink", None],
                    "dx": [0, 0, S_L_DX, 0, S_R_DX, 0, 0, 0],
                    "dy": [0, 1, 0, -1, 0, 0, 0, 0],
                },
                "mouth": {
                    "dx": [0, 0, S_L_DX, 0, S_R_DX, 0, 0, 0],
                    "dy": [0, 1, 0, -1, 0, 0, 0, 0],
                },
                "leafL": {"dy": [0, 0, 0, -1, 0, 0, 0, 0]},
                "leafR": {"dy": [0, 0, 0, -1, 0, 0, 0, 0]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(10, "growing"),
            "palette": BUD_PALETTE,
            # No tubes: the warm mouths only exist where a floret has opened, and none
            # has.
            "hide": ["tubes", "cheeks"],
            "swap": {
                "head": MID_HEAD,
                "crown": BUD_CROWN,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": MID_HEAD_LEFT, "right": MID_HEAD_RIGHT},
                "crown": {"out": BUD_CROWN_OUT, "up": BUD_CROWN_UP},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                    "wide": YOUNG_EYES["wide"],
                    "happy": YOUNG_EYES["happy"],
                },
                "mouth": {"open": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": MID_HEAD_AT,
                "crown": (9, 7),
                "leafL": (3, 20),
                "leafR": (22, 20),
                "stem": (14, 23),
                **seat_young(
                    MID_HEAD_AT, MID_HEAD, cheeks=False, eye_dy=1, mouth_dy=3
                ),
            },
            # It tosses what it has, and there is not much to toss. No hold at the end:
            # the pose is the payoff, and a knot has nothing to pose with.
            "motion": {
                "crown": {
                    "art": [None, None, "out", "up", "out", "up", None, None, None,
                            None],
                    "dx": [0, 0, -1, 0, 1, 0, 0, 0, 0, 0],
                    "dy": [0, 1, -1, -1, -1, 0, 0, 0, 0, 0],
                },
                "head": {
                    "art": [None, None, "left", None, "right", None, "left", None,
                            None, None],
                    "dy": [0, 1, 0, -1, 0, 0, 0, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, "half", "wide", "wide", "wide", "wide", "happy",
                            None, "blink", None],
                    "dx": [0, 0, G_L_DX, 0, G_R_DX, 0, G_L_DX, 0, 0, 0],
                    "dy": [0, 1, 0, -1, 0, 0, 0, 0, 0, 0],
                },
                "mouth": {
                    "art": [None, None, "open", "open", "open", "open", None, None,
                            None, None],
                    "dx": [0, 0, G_L_DX, 0, G_R_DX, 0, G_L_DX, 0, 0, 0],
                    "dy": [0, 1, 0, -1, 0, 0, 0, 0, 0, 0],
                },
                "leafL": {"dy": [0, 0, 0, -1, 0, 0, 0, 0, 0, 0]},
                "leafR": {"dy": [0, 0, 0, -1, 0, 0, 0, 0, 0, 0]},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 10,
    "parts": [
        {"name": "stem", "origin": (14, 23), "rows": STEM},
        {"name": "leafL", "origin": (2, 19), "rows": LEAF_L},
        {"name": "leafR", "origin": (23, 19), "rows": LEAF_R},
        {
            "name": "crown",
            "origin": (5, 2),
            "rows": CROWN,
            "variants": {"out": CROWN_OUT, "up": CROWN_UP, "flat": CROWN_FLAT},
        },
        {"name": "tubes", "origin": (11, 5), "rows": TUBES},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(HEAD_AT, HEAD, eyes="round", mouth="beam", eye_dy=1, mouth_dy=4),
    ],
    #
    #  0    1     2     3     4     5     6     7      8      9     10   11   12    13
    # rest ready SHAKE SHAKE SHAKE SHAKE SHAKE POSE   POSE   POSE  rest rest blink rest
    #
    # The flourish is frames 2-9 and it is this sprite's trademark: five frames of the
    # crown being tossed through three different shapes, and then THREE frames of holding
    # the last one. The hold is the joke - it is a beat longer than the pose deserves, and
    # a performer who stops moving is asking you to look. Frame 0 is the rest pose reduced
    # motion freezes on: crown settled, nobody watching.
    "motion": {
        "crown": {
            "art": [None, "flat", "out", "up", "out", "flat", "up", "out", "out",
                    "out", None, None, None, None],
            "dx": [0, 0, -1, 0, 1, 0, -1, 1, 1, 1, 0, 0, 0, 0],
            "dy": [0, 1, -1, -2, -1, 0, -1, -2, -2, -2, 0, 0, 0, 0],
        },
        "tubes": {
            "dx": [0, 0, -1, 0, 1, 0, -1, 1, 1, 1, 0, 0, 0, 0],
            "dy": [0, 1, -1, -2, -1, 0, -1, -2, -2, -2, 0, 0, 0, 0],
        },
        "head": {
            "art": [None, None, "left", None, "right", None, "left", "right",
                    "right", "right", None, None, None, None],
            "dy": [0, 1, 0, -1, 0, 0, 0, -1, -1, -1, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, "half", "wide", "wide", "wide", "wide", "wide", "happy",
                    "happy", "happy", None, None, "blink", None],
            "dx": [0, 0, -2, 0, 2, 0, -2, 2, 2, 2, 0, 0, 0, 0],
            "dy": [0, 1, 0, -1, 0, 0, 0, -1, -1, -1, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 0, -1, 0, 1, 0, -1, 1, 1, 1, 0, 0, 0, 0],
            "dy": [0, 1, 0, -1, 0, 0, 0, -1, -1, -1, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, "open", "open", "open", "open", "open", "flat",
                    "flat", "flat", None, None, None, None],
            "dx": [0, 0, -1, 0, 1, 0, -1, 1, 1, 1, 0, 0, 0, 0],
            "dy": [0, 1, 0, -1, 0, 0, 0, -1, -1, -1, 0, 0, 0, 0],
        },
        # The leaves are the audience: they lift once, at the pose, and not during any of
        # the shaking.
        "leafL": {"dy": [0, 0, 0, 0, 0, 0, 0, -1, -1, -1, 0, 0, 0, 0]},
        "leafR": {"dy": [0, 0, 0, 0, 0, 0, 0, -1, -1, -1, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
