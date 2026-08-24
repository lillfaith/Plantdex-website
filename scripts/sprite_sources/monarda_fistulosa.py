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

from _face import FACE_PALETTE, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "V": (232, 196, 232, 255),   # floret highlight - wild bergamot is a soft lilac-pink
    "v": (198, 148, 196, 255),   # floret mid
    "q": (154, 104, 154, 255),   # floret deep
    "Q": (112, 74, 114, 255),    # floret shadow
    "R": (216, 130, 150, 255),   # the warmer pink at the tube mouths
    "G": (148, 190, 116, 255),   # leaf highlight
    "g": (104, 148, 88, 255),    # leaf mid
    "d": (70, 110, 66, 255),     # leaf deep
    "n": (48, 80, 50, 255),      # leaf shadow
    "t": (128, 168, 104, 255),   # square stem
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

SPRITE = {
    "herbId": "monarda-fistulosa",
    "personality": "flamboyant",
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
