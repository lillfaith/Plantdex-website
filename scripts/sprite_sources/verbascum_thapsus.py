"""Mullein (Verbascum thapsus) - creature portrait sprite.

THE DESIGN HOOK: mullein is a tall yellow flower spike standing over a thick woolly
rosette. Measured from the card panel, its yellow sits in a narrow vertical band - x110
to x179 of a 276-wide crop - which is the spike and nothing else. So the creature is a
sturdy, felted little thing wearing that spike like a torch held upright.

WHERE THE FACE GOES. Same rule as yarrow: on the plant's most recognisable structure
where that structure can hold one, and immediately below it where it cannot. A spike
three pixels wide cannot carry eyes, so the face sits on the woolly body beneath it.

The wool is the other identifying trait and it does real work here: the palette is a
desaturated sage rather than the leaf greens the other species use, and the body carries
a stipple of pale hairs. Mullein that is merely green is just a plant with a spike.

PERSONALITY: proud, and immovable with it. Its trademark gesture is THE RISE - it draws
itself up to full height, the spike extending like a standard being raised, and holds
there, unblinking, for a third of the loop. Nothing else in the set changes height.

An earlier pass had it dozing off, which was a misreading: mullein is woolly and slow,
but slow is not sleepy. Turning "sturdy and confident" into "so unbothered it naps" threw
away the bearing that makes the plant worth drawing. It holds its ground now.

Where the dandelion springs and the yarrow scans, this one STANDS. It never leaves the
ground and it never hurries. 6fps, the slowest in the set, because a low frame rate is
itself a character note.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits apart
from the card's identification content, which stays the reference for anyone actually
looking at a plant outdoors.
"""

from _flowerhead import flower_head

# Authored at 32x28, the house size.
PALETTE = {
    "o": (74, 48, 92, 255),      # outline
    "Y": (255, 231, 148, 255),   # floret highlight
    "M": (242, 202, 92, 255),    # floret mid
    "D": (206, 158, 62, 255),    # floret deep
    "S": (162, 118, 48, 255),    # floret shadow
    "L": (196, 208, 168, 255),   # wool highlight
    "l": (156, 174, 128, 255),   # wool mid
    "k": (116, 134, 96, 255),    # wool deep
    "n": (82, 98, 70, 255),      # wool shadow
    "F": (238, 242, 222, 255),   # face
    "E": (86, 58, 104, 255),     # eye
    "c": (236, 176, 172, 255),   # cheek
    "h": (222, 232, 200, 255),   # the pale hairs that make it look felted
}

SPIKE_W, SPIKE_H = 13, 17


def _spike(rx=4.4, ry=8.4, light=(-0.85, -0.65)):
    # Narrow, tall, and lobed hard: a stack of florets up a stem rather than a smooth
    # cone. No face - the spike is worn, not inhabited.
    return flower_head(
        SPIKE_W, SPIKE_H, 6.0, 8.5, rx, ry, 7, 0.34, 0, 0,
        light=light, trim_tail=False, chars="YMDSFo",
    )


SPIKE = _spike()
SPIKE_LEFT = _spike(light=(-0.35, -0.65))
SPIKE_RIGHT = _spike(light=(-1.25, -0.65))
# Extended: the standard raised. This is the trademark - the only part in the set that
# grows, and it is the tallest thing in frame, so the travel reads from across a page.
SPIKE_TALL = _spike(ry=10.2)

BODY_W, BODY_H = 25, 13


def _body(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        BODY_W, BODY_H, 12.0, 6.0, 11.6, 5.8, 0, 0.0, 5.4, 4.2,
        face_dx=face_dx, light=light, trim_tail=False, chars="Llkn" + "Fo",
    )


def _body_breath(rx, ry):
    return flower_head(
        BODY_W, BODY_H, 12.0, 6.0, rx, ry, 0, 0.0, 5.4, 4.2,
        light=(-0.85, -0.65), trim_tail=False, chars="LlknFo",
    )


BODY = _body()
BODY_LEFT = _body(face_dx=-1.6, light=(-0.35, -0.65))
BODY_RIGHT = _body(face_dx=1.6, light=(-1.25, -0.65))
# One pixel wider and flatter, and one pixel narrower and taller. A slow breath is the
# whole of this creature's idle - it does not bob, lean or hop anywhere in the loop.
BODY_OUT = _body_breath(12.2, 5.5)
BODY_IN = _body_breath(11.2, 6.2)

# Stipple of pale hairs over the wool. Sparse and irregular on purpose - an even grid
# reads as a pattern rather than as fuzz.
HAIRS = [
    " h    h  h",
    "h   h    h ",
    "  h   h   h",
]

EYES_OPEN = [
    "o     o",
    "E     E",
    "E     E",
]

EYES_HALF = [
    "o     o",
    "o     o",
    "E     E",
]

EYES_CLOSED = [
    "       ",
    "       ",
    "E     E",
]

CHEEKS = [
    "c      c",
]

# The mouth: a level line held throughout, lifting a little at the corners on the rise.
# This creature does not grin - a small set to the mouth is the whole of its expression.
MOUTH_FLAT = [
    "ooooo",
]

MOUTH_SET = [
    "o   o",
    " ooo ",
]

# Broad, thick, velvety blades - mullein leaves are the largest in the deck and nothing
# about them is delicate. Blunt tips, not the toothed points the dandelion uses.
LEAF_L = [
    "     oooo",
    "  ooolllLo",
    " oLLLLLLLlo",
    "olllllllkko",
    " onkkkkkkno",
    "  oonnnnoo",
]

LEAF_L_UP = [
    "       oooo",
    "   ooolllLo",
    "  oLLLLLLLlo",
    " olllllllkko",
    "  onkkkkkkno",
    "   oonnnnoo",
]

LEAF_R = [
    "oooo",
    "oLlllooo",
    "olLLLLLLLo",
    "okklllllllo",
    "onkkkkkkno",
    " oonnnnoo",
]

LEAF_R_UP = [
    "oooo",
    "oLlllooo",
    " olLLLLLLLo",
    "  okklllllllo",
    "   onkkkkkkno",
    "    oonnnnoo",
]

BASE = [
    "olklo",
    "onkno",
    " ooo ",
]

SPRITE = {
    "herbId": "verbascum-thapsus",
    "personality": "proud",
    "size": (32, 28),
    "frames": 14,
    "fps": 6,
    # Back to front: base, leaves, spike behind the head, body, then face details. The
    # spike goes BEHIND the body so it reads as rising from within the rosette.
    "parts": [
        {"name": "base", "origin": (14, 25), "rows": BASE},
        {
            "name": "leafL",
            "origin": (1, 17),
            "rows": LEAF_L,
            "variants": {"up": LEAF_L_UP},
        },
        {
            "name": "leafR",
            "origin": (21, 17),
            "rows": LEAF_R,
            "variants": {"up": LEAF_R_UP},
        },
        {
            "name": "spike",
            "origin": (10, 4),
            "rows": SPIKE,
            "variants": {"left": SPIKE_LEFT, "right": SPIKE_RIGHT, "tall": SPIKE_TALL},
        },
        {
            "name": "body",
            "origin": (4, 14),
            "rows": BODY,
            "variants": {
                "left": BODY_LEFT,
                "right": BODY_RIGHT,
                "out": BODY_OUT,
                "in": BODY_IN,
            },
        },
        {"name": "hairs", "origin": (7, 16), "rows": HAIRS},
        {
            "name": "eyes",
            "origin": (13, 18),
            "rows": EYES_OPEN,
            "variants": {"blink": EYES_CLOSED, "half": EYES_HALF},
        },
        {"name": "cheeks", "origin": (12, 22), "rows": CHEEKS},
        {
            "name": "mouth",
            "origin": (14, 23),
            "rows": MOUTH_FLAT,
            "variants": {"set": MOUTH_SET},
        },
    ],
    #
    #  frame  0     1     2      3      4     5      6      7     8     9     10    11
    #       rest settle hold  look-R look-R hold  look-L look-L hold blink half  rest
    #
    # No jump anywhere in this loop. Frame 0 is the rest pose reduced motion freezes on.
    #
    #  0    1     2     3     4     5      6      7     8      9     10    11   12   13
    # rest breath nod  doze  ASLEEP ASLEEP ASLEEP ASLEEP WAKE! settle look  look rest rest
    #
    # The nap is frames 3-7 and it is this sprite's trademark: the head nods, the eyes
    # close, a Z drifts up, and then it is startled awake. Nothing else in the set sleeps.
    # Frame 0 is the rest pose reduced motion freezes on: awake, level, eyes open.
    #
    #  0    1     2     3     4     5      6      7     8     9    10    11   12   13
    # rest breath RISE  RISE  HOLD  HOLD   HOLD  HOLD settle look  look blink rest rest
    #
    # The rise is frames 2-7 and it is this sprite's trademark: it draws itself up and
    # then simply STAYS there, unblinking, for a third of the loop. The hold is the
    # gesture - a creature confident enough to stop moving. Frame 0 is the rest pose
    # reduced motion freezes on.
    "motion": {
        # The spike extends and stays extended. It never droops anywhere in this loop.
        "spike": {
            "art": [None, None, "tall", "tall", "tall", "tall", "tall", "tall",
                    None, "right", "left", None, None, None],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, -1, 0, 0, 0],
            "dy": [0, 1, -1, -2, -2, -2, -2, -2, 0, 0, 0, 0, 0, 0],
        },
        # Chest out on the rise: the body widens and lifts, then holds without a tremor.
        "body": {
            "art": ["in", "in", "out", "out", "out", "out", "out", "out", None,
                    "right", "left", None, "in", None],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, -1, 0, 0, 0],
            "dy": [0, 1, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        "hairs": {
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, -1, 0, 0, 0],
            "dy": [0, 1, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        # Heavy lids the whole way, and exactly one blink - late, brief, and the only
        # moment the eyes are not looking straight at you.
        "eyes": {
            "art": [None, "half", None, None, None, None, None, None, None, None,
                    None, "blink", "half", None],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 0, 3, -3, 0, 0, 0],
            "dy": [0, 1, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 0, 3, -3, 0, 0, 0],
            "dy": [0, 1, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, "set", "set", "set", "set", "set", "set", None, None,
                    None, None, None, None],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 0, 3, -3, 0, 0, 0],
            "dy": [0, 1, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        # The leaves lift and set, like shoulders squaring. They never sag in this loop.
        "leafL": {
            "art": [None, None, "up", "up", "up", "up", "up", "up", None, None, None,
                    None, None, None],
            "dy": [0, 1, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
            "dx": [0, 0, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        "leafR": {
            "art": [None, None, None, "up", "up", "up", "up", "up", None, None, None,
                    None, None, None],
            "dy": [0, 1, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
            "dx": [0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        },
    },
    "palette": PALETTE,
}
