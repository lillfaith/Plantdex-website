"""Lemon Balm (Melissa officinalis) - creature portrait sprite.

THE DESIGN HOOK: `Melissa` is Greek for honeybee. Beekeepers have rubbed the crushed
leaves inside empty hives for two thousand years to persuade a swarm to move in, and
Pliny wrote it down. The plant smells of lemon, and its long tradition is a calming one -
the deck's Healing Traits heading frames that as tradition, and so does this.

WHERE THE FACE GOES: in the heart-shaped, deeply veined leaf, which is what identifies
it. Lemon balm's flowers are small and white and nobody looks at them.

PERSONALITY: calm. Its trademark gesture is THE BREATH - it draws a slow breath in over
three frames, holds it, and lets it out over four more, and its shoulders visibly drop.
It is the only sprite that relaxes, the only one whose gesture makes it SMALLER at the
end than it was at the start, and the slowest thing in the deck that is not a tree.

Deliberately the opposite number to the catnip. Both are mints, both are on cards about
the nervous system, and one of them is having the time of its life on the floor.

SAFETY: a portrait, never an identification aid, and not a claim. The card's Healing
Traits heading frames traditional use as tradition, and /safety carries the full text.
"""

from _face import FACE_PALETTE, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "G": (188, 216, 132, 255),   # leaf highlight - lemon balm is a yellow-green
    "g": (142, 180, 104, 255),   # leaf mid
    "d": (100, 136, 78, 255),    # leaf deep
    "n": (72, 102, 60, 255),     # leaf shadow
    "v": (166, 198, 116, 255),   # the sunken veining that makes the leaves look quilted
    "V": (248, 250, 236, 255),   # the small white flowers
    "B": (246, 216, 120, 255),   # the bee - Melissa's own namesake
    "b": (86, 66, 62, 255),      # bee stripe
    "S": (226, 240, 214, 255),   # the breath, and nothing else uses it
}

HEAD_W, HEAD_H = 19, 17


def _head(face_dx=0.0, light=(-0.85, -0.65), rx=8.4, ry=7.6):
    return flower_head(
        HEAD_W, HEAD_H, 9.0, 8.0, rx, ry, 8, 0.12, 5.0, 4.4,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))
# Filled: taller and a little narrower, on the breath in.
HEAD_FULL = _head(rx=8.1, ry=8.2)
# Let go: wider and lower than it started. The sprite ends its own gesture smaller than
# it began, which is the only place in this deck that happens.
HEAD_EASED = _head(rx=8.7, ry=7.1)

# The breath. Out of the mouth, spreading, gone - and unlike the garlic mustard's waft
# this one is nearly the colour of the background, because it is a breath and not a smell.
BREATH_NONE = [
    " ",
]

BREATH_NEAR = [
    " S",
    "SS",
]

BREATH_MID = [
    " S S",
    "S  S",
]

BREATH_FAR = [
    "S   S  S",
]

# The bee. It arrives, hovers, and settles - two wing poses one frame apart is a bee at
# this size, and anything more elaborate is a fly.
BEE_NONE = [
    " ",
]

BEE_UP = [
    "o o",
    "oBbo",
    " oo",
]

BEE_DOWN = [
    "oBbo",
    "o o",
    " oo",
]

# Opposite pairs of scalloped leaves down a square stem.
LEAF_L = [
    "  ooooo",
    " oGvGvGo",
    "oGGgggddo",
    " oggddnno",
    "  ooooo",
]

LEAF_R = [
    "ooooo",
    "oGvGvGo",
    "oddgggGGo",
    " onnddggo",
    "  ooooo",
]

STEM = [
    "ogdo",
    "ogdo",
    "ogdo",
    " oo ",
]

HEAD_AT = (6, 5)

SPRITE = {
    "herbId": "melissa-officinalis",
    "personality": "calm",
    "size": (32, 28),
    "frames": 14,
    "fps": 6,
    "parts": [
        {"name": "stem", "origin": (14, 22), "rows": STEM},
        {"name": "leafL", "origin": (0, 18), "rows": LEAF_L},
        {"name": "leafR", "origin": (23, 18), "rows": LEAF_R},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {
                "left": HEAD_LEFT,
                "right": HEAD_RIGHT,
                "full": HEAD_FULL,
                "eased": HEAD_EASED,
            },
        },
        *feature_parts(
            HEAD_AT, HEAD, eyes="sleepy", mouth="line", eye_dy=2, mouth_dy=5,
            extra_mouths={"breathe": ["oo", "FF"], "content": ["o  o", " oo "]},
        ),
        {
            "name": "bee",
            "origin": (24, 8),
            "rows": BEE_NONE,
            "variants": {"up": BEE_UP, "down": BEE_DOWN},
        },
        {
            "name": "breath",
            "origin": (20, 14),
            "rows": BREATH_NONE,
            "variants": {"near": BREATH_NEAR, "mid": BREATH_MID, "far": BREATH_FAR},
        },
    ],
    #
    #  0    1    2     3     4     5      6      7      8      9     10    11   12    13
    # rest IN   IN    IN    hold  OUT    OUT    OUT    OUT   settle settle rest blink rest
    #
    # The breath is the whole loop. Three frames in, one held, four out, and it is the
    # only gesture in the set with no event in it at all - nothing happens, which is the
    # point. The head ends the loop WIDER AND LOWER than it started and does not go back
    # until the loop restarts, so the sprite visibly ends more relaxed than it began.
    # Frame 0 is the rest pose reduced motion freezes on: an ordinary calm face.
    "motion": {
        "head": {
            "art": [None, None, "full", "full", "full", "full", None, None, "eased",
                    "eased", "eased", "eased", None, None],
            "dy": [0, -1, -1, -2, -2, -1, 0, 0, 1, 1, 1, 0, 0, 0],
        },
        "eyes": {
            # Half-lidded throughout and shut for the whole exhale. This is the only
            # sprite whose eyes are closed for most of its own loop.
            "art": [None, None, None, "shut", "shut", "shut", "shut", "shut", "shut",
                    None, None, None, "blink", None],
            "dy": [0, -1, -1, -2, -2, -1, 0, 0, 1, 1, 1, 0, 0, 0],
        },
        "cheeks": {"dy": [0, -1, -1, -2, -2, -1, 0, 0, 1, 1, 1, 0, 0, 0]},
        "mouth": {
            "art": [None, "breathe", "breathe", "breathe", "breathe", "breathe",
                    "breathe", "breathe", None, "content", "content", "content",
                    None, None],
            "dy": [0, -1, -1, -2, -2, -1, 0, 0, 1, 1, 1, 0, 0, 0],
        },
        "breath": {
            "art": [None, None, None, None, None, "near", "mid", "far", None, None,
                    None, None, None, None],
            "dx": [0, 0, 0, 0, 0, 0, 2, 4, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, 0, 0, -1, -2, 0, 0, 0, 0, 0, 0],
        },
        # The bee comes in over the exhale and stays. Melissa means honeybee; having one
        # arrive and then leave again would be the wrong ending for that name.
        "bee": {
            "art": [None, None, None, None, "up", "down", "up", "down", "up",
                    "down", "up", "up", "up", None],
            "dx": [0, 0, 0, 0, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, -4, -3, -1, 0, 1, 1, 1, 1, 1, 0],
        },
        "leafL": {"dy": [0, 0, -1, -1, -1, -1, 0, 0, 1, 1, 1, 0, 0, 0]},
        "leafR": {"dy": [0, 0, -1, -1, -1, -1, 0, 0, 1, 1, 1, 0, 0, 0]},
    },
    "palette": PALETTE,
}
