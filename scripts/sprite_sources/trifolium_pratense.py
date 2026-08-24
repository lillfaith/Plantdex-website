"""Red Clover (Trifolium pratense) - creature portrait sprite.

THE DESIGN HOOK: clover is the plant everybody has knelt down and searched. Three
leaflets is the rule; the fourth is a mutation that turns up about once in five thousand
plants, and finding one is the single most widely known piece of folk botany there is.

So this sprite gets the deck's only gesture that ADDS A BODY PART. Nothing else here
grows anything; the passion flower opens what it already had, the horsetail stacks what
it already is. This one produces a fourth leaflet it did not have a frame ago, is
visibly delighted with it, and puts it away again.

WHERE THE FACE GOES: below the flower head, in the leaves. The rose-purple globe is the
recognisable part but it is a dense pompom with no room for a face in it, so it is worn
as a crown - and that is fine, because the leaves are what this plant is famous for.

PERSONALITY: hopeful. Its trademark is THE FOURTH LEAF, and the timing is the character:
the extra leaflet appears for four frames out of fourteen and then it is gone, which is
about the right ratio for luck.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "G": (150, 202, 120, 255),   # leaflet highlight
    "g": (106, 160, 92, 255),    # leaflet mid
    "d": (72, 118, 68, 255),     # leaflet deep
    "n": (50, 88, 54, 255),      # leaflet shadow
    "V": (236, 180, 200, 255),   # flower head highlight - rose, not magenta
    "v": (204, 130, 162, 255),   # flower head mid
    "u": (162, 92, 126, 255),    # flower head deep
    "U": (120, 66, 96, 255),     # flower head shadow
    "P": (230, 244, 222, 255),   # the pale chevron on every clover leaflet
    "S": (252, 240, 176, 255),   # the sparkle on the lucky frame
}

HEAD_W, HEAD_H = 17, 15
CROWN_W, CROWN_H = 15, 11


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        HEAD_W, HEAD_H, 8.0, 7.0, 7.6, 6.8, 5, 0.10, 4.8, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


def _crown(light=(-0.85, -0.65)):
    # Many tiny lobes and NO face: a clover head is a packed cluster of florets worn
    # above the face, the same arrangement the mullein uses and for the same reason.
    return flower_head(
        CROWN_W, CROWN_H, 7.0, 5.0, 6.6, 4.6, 12, 0.14, 0, 0,
        light=light, trim_tail=False, chars="VvuUFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.4, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.4, light=(-1.25, -0.65))
CROWN = _crown()
CROWN_LIT = _crown(light=(-0.55, -0.95))

# Three leaflets, each with the pale chevron real clover carries. Held out to the sides
# so there is somewhere for a fourth to appear.
LEAF_L = [
    "  ooo",
    " oGGGo",
    "oGPGGdo",
    "oGPGddno",
    " oggddo",
    "  ooo",
]

LEAF_R = [
    "ooo",
    "oGGGo",
    "odGGPGo",
    "onddGPGo",
    " oddggo",
    "  ooo",
]

# The fourth. Deliberately identical in construction to the other three - a lucky leaf
# that looked special would be missing the point, since the whole charm is that it is an
# ordinary leaflet in an unexpected place.
LEAF_FOURTH = [
    " ooo",
    "oGGGo",
    "oGPGdo",
    "oGgddo",
    " oddo",
    "  oo",
]

LEAF_NONE = [
    " ",
]

# The sparkle, for the two frames the fourth leaf is fully out.
SPARKLE_NONE = [
    " ",
]

SPARKLE = [
    " S ",
    "SoS",
    " S ",
]

STEM = [
    "ogGdo",
    "ogGdo",
    "odgdo",
    " ooo ",
]

HEAD_AT = (7, 11)

SPRITE = {
    "herbId": "trifolium-pratense",
    "personality": "hopeful",
    "size": (32, 28),
    "frames": 14,
    "fps": 10,
    "parts": [
        {"name": "stem", "origin": (14, 24), "rows": STEM},
        {
            "name": "fourth",
            "origin": (22, 8),
            "rows": LEAF_NONE,
            "variants": {"out": LEAF_FOURTH},
        },
        {"name": "leafL", "origin": (0, 18), "rows": LEAF_L},
        {"name": "leafR", "origin": (23, 18), "rows": LEAF_R},
        {
            "name": "crown",
            "origin": (8, 1),
            "rows": CROWN,
            "variants": {"lit": CROWN_LIT},
        },
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(HEAD_AT, HEAD, eyes="round", mouth="smile", eye_dy=1, mouth_dy=4),
        {
            "name": "sparkle",
            "origin": (25, 5),
            "rows": SPARKLE_NONE,
            "variants": {"on": SPARKLE},
        },
    ],
    #
    #  0    1    2     3      4      5      6      7     8    9    10   11   12    13
    # rest sway notice SPROUT FOURTH FOURTH FOURTH  show  tuck tuck rest rest blink rest
    #
    # The fourth leaf is frames 3-7 and it is this sprite's trademark: it is not there,
    # then it is, and then it is not there again. Frame 0 is the rest pose reduced motion
    # freezes on - three leaflets, because a still image permanently showing four would
    # be claiming something about the plant that is not true.
    "motion": {
        "head": {
            "art": [None, "right", None, None, "right", "right", "right", "right",
                    None, "left", None, None, None, None],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "crown": {
            "art": [None, None, None, None, "lit", "lit", "lit", "lit", None, None,
                    None, None, None, None],
            "dy": [0, -1, -1, -2, -2, -2, -2, -1, 0, 0, 0, 0, 0, 0],
            "lean": [0, 1, 1, 0, -1, -1, -1, 0, 0, 1, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, "wide", "wide", "wide", "wide", "wide", "happy",
                    "happy", None, None, None, "blink", None],
            "dx": [0, 2, 0, 0, 2, 2, 2, 2, 0, -2, 0, 0, 0, 0],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 1, 0, 0, 1, 1, 1, 1, 0, -1, 0, 0, 0, 0],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, None, "grin", "grin", "grin", "grin", "grin", "grin",
                    None, None, None, None, None],
            "dx": [0, 1, 0, 0, 1, 1, 1, 1, 0, -1, 0, 0, 0, 0],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        # It unfolds outward from behind the right-hand leaflet, which is where a real
        # extra leaflet would come from, and folds back the same way.
        "fourth": {
            "art": [None, None, None, "out", "out", "out", "out", "out", None, None,
                    None, None, None, None],
            "dx": [0, 0, 0, -1, 1, 2, 2, 1, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 2, 0, -1, -1, 1, 0, 0, 0, 0, 0, 0],
        },
        "sparkle": {
            "art": [None, None, None, None, None, "on", "on", None, None, None,
                    None, None, None, None],
            "dy": [0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "leafL": {"dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0]},
        "leafR": {"dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
