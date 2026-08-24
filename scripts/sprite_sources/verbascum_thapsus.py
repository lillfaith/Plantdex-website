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

PERSONALITY: sturdy, and so unbothered it falls asleep. Its trademark gesture is a
DOZE - the spike droops, the eyes close, a Z drifts up, and then it wakes with a start,
mouth open. Nothing else in the set sleeps.

Originally: Where the dandelion springs and the
yarrow breathes, this one HOLDS - a slow settle, a long steady look, and the spike
swaying a beat behind the body like a mast. It never leaves the ground and it never
hurries. 6fps, the slowest in the deck so far, because a low frame rate is itself a
character note.

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
    "z": (255, 244, 214, 255),   # sleep marks - pale, or they vanish into the violet
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

# Wide awake, for the one frame it is startled out of the nap.
EYES_WIDE = [
    "       ",
    "oE   Eo",
    "EE   EE",
]

# The mouth: a flat sturdy line at rest, an open yawn as it nods off, and a small
# surprised o on the wake.
MOUTH_FLAT = [
    "ooooo",
]

MOUTH_YAWN = [
    " ooo ",
    "oMMMo",
    "oMMMo",
    " ooo ",
]

MOUTH_OH = [
    " oo ",
    "oMMo",
    " oo ",
]

# Sleep marks, drifting up and away as it nods off. The one piece of pure cartoon in the
# set, and the clearest way to say "asleep" in a 32px portrait.
ZEE_SMALL = [
    "zz",
    " z",
    "zz",
]

ZEE_BIG = [
    "zzz",
    "  z",
    " z ",
    "zzz",
]

ZEE_NONE = [
    " ",
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
    "personality": "sturdy",
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
            "variants": {"left": SPIKE_LEFT, "right": SPIKE_RIGHT},
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
            "variants": {
                "blink": EYES_CLOSED,
                "half": EYES_HALF,
                "wide": EYES_WIDE,
            },
        },
        {"name": "cheeks", "origin": (12, 22), "rows": CHEEKS},
        {
            "name": "mouth",
            "origin": (14, 23),
            "rows": MOUTH_FLAT,
            "variants": {"yawn": MOUTH_YAWN, "oh": MOUTH_OH},
        },
        {
            "name": "zee",
            "origin": (23, 12),
            "rows": ZEE_NONE,
            "variants": {"small": ZEE_SMALL, "big": ZEE_BIG},
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
    "motion": {
        "spike": {
            "art": [None, None, None, None, None, None, None, None, None, None,
                    "right", "right", None, None],
            # The spike droops as it dozes and snaps upright on the wake - the clearest
            # read on the whole sprite, because it is the tallest thing in the frame.
            "dx": [0, 0, 1, 2, 3, 3, 3, 3, 0, 0, 1, 1, 0, 0],
            "dy": [0, 0, 1, 2, 3, 3, 3, 3, -1, 0, 0, 0, 0, 0],
            "lean": [0, 0, 1, 2, 3, 3, 3, 3, -1, 0, 1, 1, 0, 0],
        },
        "body": {
            "art": ["in", "out", None, "in", "in", "in", "in", "in", "out", "out",
                    "right", "right", "in", None],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
            "dy": [0, 0, 1, 2, 2, 2, 2, 2, -1, 0, 0, 0, 0, 0],
        },
        "hairs": {
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
            "dy": [0, 0, 1, 2, 2, 2, 2, 2, -1, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, "half", "blink", "blink", "blink", "blink", "blink",
                    "wide", "half", None, None, None, None],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0],
            "dy": [0, 0, 1, 2, 2, 2, 2, 2, -1, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0],
            "dy": [0, 0, 1, 2, 2, 2, 2, 2, -1, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, "yawn", "yawn", None, None, None, None, "oh", "oh",
                    None, None, None, None],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0],
            "dy": [0, 0, 1, 2, 2, 2, 2, 2, -1, 0, 0, 0, 0, 0],
        },
        # The Z appears once it is properly under, grows, drifts up and away, and is
        # gone the instant it wakes.
        "zee": {
            "art": [None, None, None, None, "small", "small", "big", "big", None,
                    None, None, None, None, None],
            "dy": [0, 0, 0, 0, 0, -1, -2, -4, 0, 0, 0, 0, 0, 0],
            "dx": [0, 0, 0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 0, 0],
        },
        # The leaves sag as it sleeps. They are the heaviest things here and they show
        # it - they never lift, they only droop further.
        "leafL": {
            "dy": [0, 0, 1, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0],
            "dx": [0, 0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        "leafR": {
            "dy": [0, 0, 1, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0],
            "dx": [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        },
    },
    "palette": PALETTE,
}
