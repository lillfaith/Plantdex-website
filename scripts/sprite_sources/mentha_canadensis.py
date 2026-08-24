"""Wild Mint (Mentha canadensis) - creature portrait sprite.

THE DESIGN HOOK: mint does not lower its own temperature by a single degree. Menthol
binds to TRPM8, the receptor that reports cold, and the nerve sends the message anyway -
so the cool is entirely real as an experience and entirely false as a fact. That is a
lovely thing for a sprite to act out: the plant does not get cold, it just goes cold, and
everything about it says so.

So this one changes COLOUR. For three frames its whole palette shifts to ice - the same
drawing, rendered in frost - and then it warms back to green. Nothing else in this deck
recolours itself; the sumac lights one prop, and this recolours the entire creature.

WHERE THE FACE GOES: in the leaf pair at the top of the square stem, which with the
whorls of small flowers in the axils is what identifies a mint.

PERSONALITY: refreshing, and quietly pleased about the trick. Its trademark gesture is
THE CHILL - a breath in, the frost, a genuine shiver, and a satisfied thaw.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "G": (150, 204, 128, 255),   # leaf highlight
    "g": (104, 162, 96, 255),    # leaf mid
    "d": (68, 118, 72, 255),     # leaf deep
    "n": (46, 86, 56, 255),      # leaf shadow
    # The ice set. Same four roles, shifted the whole way to blue-white - this is the
    # gesture, so the shift has to be unmistakable at a glance rather than a tint.
    "I": (232, 246, 250, 255),   # frosted highlight
    "i": (186, 218, 234, 255),   # frosted mid
    "j": (140, 176, 204, 255),   # frosted deep
    "J": (100, 132, 166, 255),   # frosted shadow
    "V": (204, 186, 232, 255),   # the small pale flowers in the whorls
    "K": (246, 252, 255, 255),   # frost sparks
    "t": (128, 176, 112, 255),   # square stem
}

HEAD_W, HEAD_H = 19, 15


def _head(face_dx=0.0, light=(-0.85, -0.65), chars="GgdnFo", ry=6.6):
    return flower_head(
        HEAD_W, HEAD_H, 9.0, 7.0, 8.4, ry, 7, 0.14, 5.0, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars=chars,
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))
# Frosted: the identical curve, drawn in ice. Building it from the same call is the point
# - it must be recognisably the SAME creature, gone cold, not a second creature.
HEAD_FROST = _head(chars="IijJFo")
# Frosted mid-shiver, a pixel squatter. Two of these alternating is a shudder.
HEAD_SHIVER = _head(chars="IijJFo", ry=6.1)

# The paired leaves down the stem, toothed the way a mint's are, in both palettes.
LEAF_L = [
    "  ooooo",
    " oGoGoGgo",
    "oGGgggggdo",
    " oggdddno",
    "  ooooo",
]

LEAF_L_FROST = [
    "  ooooo",
    " oIoIoIjo",
    "oIIijjjjJo",
    " oijjjJJo",
    "  ooooo",
]

LEAF_R = [
    "ooooo",
    "ogGoGoGo",
    "oddgggggGo",
    " onddddgo",
    "  ooooo",
]

LEAF_R_FROST = [
    "ooooo",
    "oiIoIoIo",
    "oJJijjjjIo",
    " oJjjjjio",
    "  ooooo",
]

# The whorls of tiny flowers in the leaf axils, which is where a mint puts them and how
# you tell one from a dead nettle.
WHORLS = [
    "oVo   oVo",
    " V     V",
]

# Frost sparks, for the two frames the chill lands. Small and few - a blizzard would be
# claiming the plant is actually cold.
SPARKS_NONE = [
    " ",
]

SPARKS = [
    "K     K",
    "  K K",
    "K     K",
]

STEM = [
    "otto",
    "otto",
    "otto",
    " oo ",
]

HEAD_AT = (6, 8)

SPRITE = {
    "herbId": "mentha-canadensis",
    "personality": "refreshing",
    "size": (32, 28),
    "frames": 14,
    "fps": 10,
    "parts": [
        {"name": "stem", "origin": (14, 22), "rows": STEM},
        {
            "name": "leafL",
            "origin": (0, 18),
            "rows": LEAF_L,
            "variants": {"frost": LEAF_L_FROST},
        },
        {
            "name": "leafR",
            "origin": (22, 18),
            "rows": LEAF_R,
            "variants": {"frost": LEAF_R_FROST},
        },
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {
                "left": HEAD_LEFT,
                "right": HEAD_RIGHT,
                "frost": HEAD_FROST,
                "shiver": HEAD_SHIVER,
            },
        },
        {"name": "whorls", "origin": (11, 21), "rows": WHORLS},
        *feature_parts(
            HEAD_AT, HEAD, eyes="round", mouth="small", eye_dy=2, mouth_dy=5,
            extra_mouths={"breathe": ["oo", "FF"], "content": ["o  o", " oo "]},
        ),
        {
            "name": "sparks",
            "origin": (10, 6),
            "rows": SPARKS_NONE,
            "variants": {"on": SPARKS},
        },
    ],
    #
    #  0    1     2      3      4      5      6      7     8      9      10   11   12    13
    # rest breathe in    CHILL  SHIVER CHILL  SHIVER thaw  content content rest rest blink rest
    #
    # The chill is frames 3-7 and it is this sprite's trademark: five frames in which the
    # entire creature is drawn in a different palette. The shiver alternates two frosted
    # poses rather than moving the sprite, so the shudder happens in the drawing rather
    # than in the offsets - the same reason a real shiver is not a wobble. Frame 0 is the
    # rest pose reduced motion freezes on: green, which is what a mint looks like.
    "motion": {
        "head": {
            "art": [None, None, "right", "frost", "shiver", "frost", "shiver", "frost",
                    None, "left", None, None, None, None],
            "dx": [0, 0, 0, -1, 1, -1, 1, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, -1, -1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, "half", "wide", "wide", "shut", "wide", "shut", "half",
                    "happy", "happy", None, None, "blink", None],
            "dx": [0, 0, 2, -1, 1, -1, 1, 0, 0, -2, 0, 0, 0, 0],
            "dy": [0, -1, -1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 0, 1, -1, 1, -1, 1, 0, 0, -1, 0, 0, 0, 0],
            "dy": [0, -1, -1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, "breathe", "breathe", "wide", "wide", "wide", "wide", None,
                    "content", "content", None, None, None, None],
            "dx": [0, 0, 1, -1, 1, -1, 1, 0, 0, -1, 0, 0, 0, 0],
            "dy": [0, -1, -1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        },
        # The leaves frost a frame AFTER the head and thaw a frame before it. Cold arrives
        # at the middle and spreads outward, which is the only order that reads as the
        # creature going cold rather than as two drawings being swapped.
        "leafL": {
            "art": [None, None, None, None, "frost", "frost", "frost", None, None,
                    None, None, None, None, None],
            "dx": [0, 0, 0, -1, 1, -1, 1, 0, 0, 0, 0, 0, 0, 0],
        },
        "leafR": {
            "art": [None, None, None, None, "frost", "frost", "frost", None, None,
                    None, None, None, None, None],
            "dx": [0, 0, 0, 1, -1, 1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "sparks": {
            "art": [None, None, None, "on", None, "on", None, None, None, None,
                    None, None, None, None],
            "dy": [0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "whorls": {"dy": [0, -1, -1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
