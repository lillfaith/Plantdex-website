"""Chicory (Cichorium intybus) - creature portrait sprite.

THE DESIGN HOOK: chicory keeps time. Its sky-blue flowers open around five in the
morning and are shut by midday, every day, reliably enough that Linnaeus put it in his
flower clock as one of the fixed hours. It is also the roadside plant whose roasted root
became coffee during every shortage anyone can name, which makes an early riser that
runs on chicory a joke the plant set up itself.

Its blue is worth having on its own terms: nothing else in this deck is blue at all.

WHERE THE FACE GOES: in the flower, which is a flat open ray disc - the one flower shape
in this set with real room for a face across it.

PERSONALITY: an early riser. Its trademark gesture is THE YAWN - it wakes, the ray
petals unstick one at a time, and it yawns with the widest open mouth in the deck before
shutting again at noon. It is the only sprite that is tired, and the only one that opens
and shuts on a clock rather than on a mood.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "B": (196, 216, 246, 255),   # ray petal highlight
    "b": (146, 176, 226, 255),   # ray petal mid - the deck's only blue
    "q": (104, 130, 186, 255),   # petal deep
    "Q": (72, 94, 142, 255),     # petal shadow
    "Y": (250, 232, 158, 255),   # the pale anthers at the centre
    "G": (146, 190, 116, 255),   # leaf light
    "g": (102, 148, 88, 255),    # leaf mid
    "d": (68, 108, 66, 255),     # leaf deep
    "n": (48, 80, 50, 255),      # leaf shadow
}

HEAD_W, HEAD_H = 21, 17


def _head(face_dx=0.0, light=(-0.85, -0.65), rx=9.6, ry=7.6, amp=0.22):
    # Deep, many lobes: chicory's ray florets are strap-shaped with SQUARE, toothed ends,
    # which is what gives the flower its ragged wheel outline.
    return flower_head(
        HEAD_W, HEAD_H, 10.0, 8.0, rx, ry, 11, amp, 5.4, 4.4,
        face_dx=face_dx, light=light, trim_tail=False, chars="BbqQFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))
# Opening: the rays still half stuck together, shorter and rounder.
HEAD_WAKING = _head(rx=8.0, ry=6.8, amp=0.10)
# Stretched wide on the yawn itself, which is where the flower reaches its full spread.
HEAD_WIDE = _head(rx=10.2, ry=8.0, amp=0.26)

# Shut: the rays furled into a narrow blue bud, closed for the afternoon. Hand-drawn,
# because a shut chicory is a spindle and the generator makes discs.
HEAD_SHUT = [
    "  ooo  ",
    " oBbqo ",
    " oBbqo ",
    " oBbqo ",
    " obqQo ",
    " obqQo ",
    "  ooo  ",
]

# The anthers at the centre of an open flower.
ANTHERS = [
    "Y Y Y",
]

ANTHERS_NONE = [
    " ",
]

# Chicory's stem leaves clasp it and are small and sparse; the big ones are all at the
# base. Two low ones is the honest arrangement.
LEAF_L = [
    "   oooo",
    " ooGGGgo",
    "oGGgggddo",
    " oggddnno",
    "  oooooo",
]

LEAF_R = [
    "oooo",
    "ogGGGoo",
    "oddgggGGo",
    " onnddggo",
    "  oooooo",
]

STEM = [
    "ogdo",
    "ogdo",
    "ogdo",
    "ogdo",
    " oo ",
]

HEAD_AT = (5, 4)

SPRITE = {
    "herbId": "cichorium-intybus",
    "personality": "early riser",
    "size": (32, 28),
    "frames": 16,
    "fps": 8,
    "parts": [
        {"name": "stem", "origin": (14, 20), "rows": STEM},
        {"name": "leafL", "origin": (1, 19), "rows": LEAF_L},
        {"name": "leafR", "origin": (22, 19), "rows": LEAF_R},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {
                "left": HEAD_LEFT,
                "right": HEAD_RIGHT,
                "waking": HEAD_WAKING,
                "wide": HEAD_WIDE,
                "shut": HEAD_SHUT,
            },
        },
        {
            "name": "anthers",
            "origin": (13, 8),
            "rows": ANTHERS,
            "variants": {"none": ANTHERS_NONE},
        },
        *feature_parts(
            HEAD_AT, HEAD, eyes="sleepy", mouth="line", eye_dy=1, mouth_dy=4,
            # The widest open mouth in the deck, and it earns it: this is a yawn, and a
            # yawn drawn small is just an "oh".
            extra_mouths={"yawn": [" ooo ", "oFFFo", "oFFFo", " ooo "]},
        ),
    ],
    #
    #  0    1    2     3      4     5     6     7     8     9    10   11   12   13    14   15
    # open sway blink stretch YAWN  YAWN  YAWN  settle sway  sway furl furl SHUT SHUT  open open
    #
    # The yawn is frames 3-6 and it is this sprite's trademark: the flower spreads to its
    # widest exactly while the mouth is open, so the yawn and the bloom are one movement.
    # Frames 10-13 are noon - it furls and shuts, and stays shut for two frames, which is
    # the only time in this deck a creature is simply not awake. Frame 0 is the rest pose
    # reduced motion freezes on: open, which is the flower everyone has seen.
    "motion": {
        "head": {
            "art": [None, "right", None, "waking", "wide", "wide", "wide", None,
                    "left", None, "waking", "waking", "shut", "shut", "waking", None],
            "dx": [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 7, 7, 1, 0],
            "dy": [0, 0, 1, 1, -1, -1, -1, 0, 0, 0, 1, 1, 5, 5, 1, 0],
        },
        # The anthers are the flower's centre, so they are simply gone while it is shut.
        "anthers": {
            "art": [None, None, None, None, None, None, None, None, None, None,
                    "none", "none", "none", "none", "none", None],
            "dy": [0, 0, 1, 1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, "blink", "half", "shut", "shut", "shut", "wide",
                    None, None, "half", "half", "hidden", "hidden", "hidden", "half"],
            "dx": [0, 2, 0, 0, 0, 0, 0, 0, -2, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 1, 1, -1, -1, -1, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        },
        "cheeks": {
            "art": [None, None, None, None, None, None, None, None, None, None,
                    None, None, "hidden", "hidden", "hidden", None],
            "dx": [0, 1, 0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 1, 1, -1, -1, -1, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, None, None, "yawn", "yawn", "yawn", None, None, None,
                    None, None, "hidden", "hidden", "hidden", None],
            "dx": [0, 1, 0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 1, 1, -1, -1, -1, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        },
        "leafL": {"lean": [0, 1, 1, 0, -1, -1, -1, 0, 0, 1, 1, 0, 0, 0, 0, 0]},
        "leafR": {"lean": [0, -1, -1, 0, 1, 1, 1, 0, 0, -1, -1, 0, 0, 0, 0, 0]},
        "stem": {"lean": [0, 0, 0, 0, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
