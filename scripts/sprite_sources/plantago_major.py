"""Broad Leaf Plantain (Plantago major) - creature portrait sprite.

THE DESIGN HOOK: plantain is the footpath plant. Its old name is waybread, and it
followed colonists across a continent so reliably it got called "white man's footprint".
It grows in the places that get walked on, and it does not mind.

Measured from the card panel its green sits LOW, y104-253 of a 276 crop, while its
yellow runs the full height, y31-269. That is a flat ground rosette with tall thin seed
spikes rising out of it, and it gives this sprite the widest, lowest silhouette in the
set - the opposite of the jewelweed hanging above its own stem.

WHERE THE FACE GOES: in the rosette centre, low in frame and looking up. Every other
face here is at or above the middle of its frame; this one is near the floor.

PERSONALITY: unbothered, and impossible to discourage. Its trademark gesture is THE
STOMP - something treads on it, the whole rosette flattens, and it springs back with the
seed spikes still whipping. It is the only sprite acted upon by something outside
itself, and the only one that gets squashed.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import on_face
from _flowerhead import flower_head

# Authored at 32x28, the house size.
PALETTE = {
    "o": (74, 48, 92, 255),      # outline
    "G": (154, 206, 118, 255),   # leaf highlight
    "g": (108, 166, 88, 255),    # leaf mid
    "d": (72, 122, 66, 255),     # leaf deep
    "n": (50, 88, 52, 255),      # leaf shadow
    "v": (132, 188, 106, 255),   # the parallel ribs plantain is named for
    "T": (222, 200, 140, 255),   # seed spike light
    "t": (168, 142, 92, 255),    # seed spike dark
    "F": (238, 248, 226, 255),   # face
    "E": (86, 58, 104, 255),     # eye
    "W": (255, 255, 255, 255),   # eye glint
    "c": (236, 172, 168, 255),   # cheek
}

HEAD_W, HEAD_H = 19, 15


def _head(face_dx=0.0, light=(-0.85, -0.65), rx=9.0, ry=6.6):
    # Wide and shallow: a rosette pressed to the ground, not a flower held up.
    return flower_head(
        HEAD_W, HEAD_H, 9.0, 7.0, rx, ry, 6, 0.12, 5.2, 4.2,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.4, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.4, light=(-1.25, -0.65))
# Flattened: wider and two thirds the height. This is a boot landing on it.
HEAD_SQUASHED = _head(rx=9.8, ry=4.4)
# Rebounding: narrower and taller than rest - the overshoot on the way back up.
HEAD_SPRUNG = _head(rx=8.3, ry=7.4)

# The broad ribbed paddles plantain is named for, held out flat either side. The parallel
# ribs are the whole point: without them this is a green oval, with them it is a plantain.
LEAF_L = [
    "    ooooooo",
    "  ooGGGGGGgo",
    " oGGvGGvGGgdo",
    "oGgvggvggdddo",
    " ondnnnnnnddo",
    "  ooonnnnnoo",
]

LEAF_L_FLAT = [
    "   ooooooooo",
    " ooGGvGGvGGgo",
    "oGGvggvggggdo",
    " ondnnnnnnnddo",
    "  oooonnnnnoo",
]

LEAF_R = [
    "ooooooo",
    "ogGGGGGGoo",
    "oddgGGvGGvGGo",
    "odddggvggvgGo",
    "oddnnnnnnndno",
    "  oonnnnnooo",
]

LEAF_R_FLAT = [
    "ooooooooo",
    "ogGGvGGvGGoo",
    "oddggvggvgggo",
    "odddnnnnnnnno",
    "  oonnnnnoooo",
]

# Two tall seed spikes - the full-height element the card's yellow band is, and what
# shows the rebound: they whip long after the rosette has settled.
SPIKE = [
    "oto",
    "oTo",
    "oto",
    "oTo",
    "oto",
    "oTo",
    "oto",
    "oto",
]

SPIKE_SHORT = [
    "oto",
    "oTo",
    "oto",
]

EYES_OPEN = [
    "WE  WE",
    "EE  EE",
]

# Squeezed shut under the weight of whatever just stood on it.
EYES_SQUEEZE = [
    "oo  oo",
    "      ",
]

EYES_CLOSED = [
    "      ",
    "EE  EE",
]

EYES_HALF = [
    "oo  oo",
    "EE  EE",
]

CHEEKS = [
    "c      c",
]

MOUTH_SMALL = [
    "oo",
]

# Pressed into a line, then a small pleased set once it is back up: it is fine, thank you.
MOUTH_FLAT = [
    "oooo",
]

MOUTH_SET = [
    "o  o",
    " oo ",
]

HEAD_AT = (6, 11)
STOMP = [0, 0, 2, 2, 2, 0, -1, -1, 0, 0, 0, 0, 0, 0]
# The head variants are built so the FACE lands in the same place whether the rosette is
# squashed or sprung - measured with `face_box`, not assumed. So the features do not
# follow the stomp; they dip a pixel inside a face holding still while the plant is
# flattened around it, which is the read the character wants anyway: it does not stop
# looking at you.
FACE_DIP = [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]
WOBBLE = [0, 0, 0, 0, 0, 0, 0, 0, -2, 2, 0, 0, 0, 0]

SPRITE = {
    "herbId": "plantago-major",
    "personality": "unbothered",
    "size": (32, 28),
    "frames": 14,
    "fps": 10,
    # Spikes behind, leaves either side, rosette centre over them, face on top.
    "parts": [
        {"name": "spikeL", "origin": (11, 3), "rows": SPIKE, "variants": {"short": SPIKE_SHORT}},
        {"name": "spikeR", "origin": (18, 3), "rows": SPIKE, "variants": {"short": SPIKE_SHORT}},
        {"name": "leafL", "origin": (0, 17), "rows": LEAF_L, "variants": {"flat": LEAF_L_FLAT}},
        {"name": "leafR", "origin": (19, 17), "rows": LEAF_R, "variants": {"flat": LEAF_R_FLAT}},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {
                "left": HEAD_LEFT,
                "right": HEAD_RIGHT,
                "squashed": HEAD_SQUASHED,
                "sprung": HEAD_SPRUNG,
            },
        },
        {
            "name": "eyes",
            "origin": on_face(HEAD_AT, HEAD, EYES_OPEN, dy=2),
            "rows": EYES_OPEN,
            "variants": {"blink": EYES_CLOSED, "half": EYES_HALF, "squeeze": EYES_SQUEEZE},
        },
        {"name": "cheeks", "origin": on_face(HEAD_AT, HEAD, CHEEKS, dy=5), "rows": CHEEKS},
        {
            "name": "mouth",
            "origin": on_face(HEAD_AT, HEAD, MOUTH_SMALL, dy=5),
            "rows": MOUTH_SMALL,
            "variants": {"flat": MOUTH_FLAT, "set": MOUTH_SET},
        },
    ],
    #
    #  0    1     2      3      4      5     6      7      8      9     10  11  12    13
    # rest brace STOMP  STOMP  STOMP  boing SPRUNG SPRUNG wobble wobble set set blink rest
    #
    # The stomp is frames 2-4 and it is this sprite's trademark: the rosette flattens
    # under something outside the frame, then overshoots on the way back up while the
    # seed spikes go on whipping. Frame 0 is the rest pose reduced motion freezes on -
    # upright and unsquashed.
    "motion": {
        "head": {
            "art": [None, None, "squashed", "squashed", "squashed", None, "sprung",
                    "sprung", "left", "right", None, None, None, None],
            "dy": STOMP,
        },
        "eyes": {
            "art": [None, "half", "squeeze", "squeeze", "squeeze", "half", None, None,
                    None, None, None, None, "blink", None],
            "dx": WOBBLE,
            "dy": FACE_DIP,
        },
        "cheeks": {"dy": FACE_DIP, "dx": WOBBLE},
        "mouth": {
            "art": [None, None, "flat", "flat", "flat", None, None, None, None, None,
                    "set", "set", None, None],
            "dx": WOBBLE,
        },
        # The leaves splay wider as the rosette is trodden on, which is what a real one
        # does - the weight goes out sideways because there is nowhere else for it.
        "leafL": {
            "art": [None, None, "flat", "flat", "flat", None, None, None, None, None,
                    None, None, None, None],
            "dx": [0, 0, -1, -2, -2, -1, 0, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "leafR": {
            "art": [None, None, "flat", "flat", "flat", None, None, None, None, None,
                    None, None, None, None],
            "dx": [0, 0, 1, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        # The spikes shorten under the stomp and then WHIP, overshooting side to side for
        # four frames after the rosette has settled. The lag is what sells the
        # springiness; a plant that recovers all at once reads as rigid.
        "spikeL": {
            "art": [None, None, "short", "short", "short", None, None, None, None,
                    None, None, None, None, None],
            "dy": [0, 1, 7, 7, 7, 1, -1, -1, 0, 0, 0, 0, 0, 0],
            "lean": [0, 0, 0, 0, 0, -2, -3, -2, 2, 3, 1, 0, 0, 0],
        },
        "spikeR": {
            "art": [None, None, "short", "short", "short", None, None, None, None,
                    None, None, None, None, None],
            "dy": [0, 1, 7, 7, 7, 1, -1, -1, 0, 0, 0, 0, 0, 0],
            "lean": [0, 0, 0, 0, 0, 2, 3, 2, -2, -3, -1, 0, 0, 0],
        },
    },
    "palette": PALETTE,
}
