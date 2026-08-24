"""Lamb's Quarters (Chenopodium album) - creature portrait sprite.

THE DESIGN HOOK: its other name is goosefoot, for the shape of the leaf, and `album` -
white - is for the mealy bloom that dusts every new shoot as if it had been floured.
Both of those are gifts to a sprite: it gets actual FEET, and it gets a colour nothing
else in the deck has, a chalky off-white sitting on green.

WHERE THE FACE GOES: in the leafy crown, dusted with the same meal.

PERSONALITY: unhurried and faintly comic. Its trademark gesture is THE WADDLE - it
lifts one goosefoot, plants it, lifts the other, and shuffles a step sideways before
coming back. It is the only sprite in the deck that WALKS, and the reason it can is that
the plant handed it feet.

The mealy bloom puffs loose each time a foot lands, which is the second thing its own
botany pays for.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "G": (156, 194, 130, 255),   # leaf highlight - dusty, never fresh
    "g": (114, 154, 100, 255),   # leaf mid
    "d": (80, 114, 76, 255),     # leaf deep
    "n": (58, 86, 58, 255),      # leaf shadow
    "A": (238, 240, 226, 255),   # the mealy bloom - `album` itself
    "a": (206, 212, 194, 255),   # bloom, thinner
    "r": (170, 128, 104, 255),   # the red-streaked stem this plant is known for
}

HEAD_W, HEAD_H = 19, 16


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        HEAD_W, HEAD_H, 9.0, 8.0, 8.6, 7.4, 6, 0.14, 5.0, 4.2,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))

# The mealy dusting over the crown. It is what the species name means and it is the only
# chalk-white in the deck.
MEAL = [
    " A  a   A  a",
    "a  A  a   A",
]

# The goosefoot. Three blunt toes, splayed - which is exactly the leaf outline, so the
# feet are botanically the leaves and not a costume.
FOOT_DOWN = [
    "ooo ooo ooo",
    "oGGoGGGoGGo",
    "ogggggggggo",
    "oddddddddo",
    " ooooooooo",
]

FOOT_UP = [
    "ooo ooo ooo",
    "oGGoGGGoGGo",
    "oggggggggo",
    " oddddddo",
    "  oooooo",
]

# A puff of loosened meal, for the frame a foot lands.
PUFF_NONE = [
    " ",
]

PUFF = [
    "a   a",
    " A A ",
]

# The paired leaves down the stem, the diamond outline of a goosefoot leaf again.
LEAF_L = [
    "   oo",
    " ooGGo",
    "oGGgggo",
    " oggddo",
    "  oddo",
    "   oo",
]

LEAF_R = [
    "oo",
    "oGGoo",
    "oggggo",
    "oddggo",
    "oddo",
    "oo",
]

STEM = [
    "orgro",
    "orgro",
    "odgdo",
]

HEAD_AT = (7, 4)

SPRITE = {
    "herbId": "chenopodium-album",
    "personality": "unhurried",
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "stem", "origin": (14, 19), "rows": STEM},
        {"name": "leafL", "origin": (3, 16), "rows": LEAF_L},
        {"name": "leafR", "origin": (23, 16), "rows": LEAF_R},
        {
            "name": "footL",
            "origin": (3, 22),
            "rows": FOOT_DOWN,
            "variants": {"up": FOOT_UP},
        },
        {
            "name": "footR",
            "origin": (18, 22),
            "rows": FOOT_DOWN,
            "variants": {"up": FOOT_UP},
        },
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        {"name": "meal", "origin": (10, 6), "rows": MEAL},
        *feature_parts(HEAD_AT, HEAD, eyes="round", mouth="smile", eye_dy=1, mouth_dy=4),
        {
            "name": "puff",
            "origin": (6, 24),
            "rows": PUFF_NONE,
            "variants": {"left": PUFF, "right": PUFF},
        },
    ],
    #
    #  0    1     2     3     4     5     6     7     8     9    10    11    12   13
    # rest  lift  STEP  land  lift  STEP  land shift shift back  back  rest blink rest
    #
    # The waddle is frames 1-6 and it is this sprite's trademark: one foot up, planted, a
    # puff of meal, then the other. Everything else in the deck is rooted to one spot;
    # this one changes where it is standing. Frame 0 is the rest pose reduced motion
    # freezes on - both feet flat on the ground.
    "motion": {
        # The whole plant travels with its feet, one pixel at a time, and comes back. A
        # walk that did not move the body would be a plant marching on the spot.
        "head": {
            "art": [None, "right", "right", None, "left", "left", None, None, None,
                    None, None, None, None, None],
            "dx": [0, 1, 2, 2, 1, 0, 0, -1, -1, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "meal": {
            "dx": [0, 1, 2, 2, 1, 0, 0, -1, -1, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, "happy", None, None, "happy", None, None, None, None,
                    None, None, "blink", None],
            "dx": [0, 2, 3, 2, -1, -2, 0, -1, -1, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 1, 2, 2, -1, -1, 0, -1, -1, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, "grin", "grin", "grin", "grin", None, None, None, None,
                    None, None, None, None],
            "dx": [0, 1, 2, 2, -1, -1, 0, -1, -1, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        # The feet alternate, and neither is ever off the ground while the other is. It
        # is a waddle, not a hop.
        "footL": {
            "art": [None, "up", "up", None, None, None, None, None, None, None,
                    None, None, None, None],
            "dx": [0, 1, 3, 3, 3, 3, 3, 2, 1, 0, 0, 0, 0, 0],
            "dy": [0, -2, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "footR": {
            "art": [None, None, None, None, "up", "up", None, None, None, None,
                    None, None, None, None],
            "dx": [0, 0, 0, 1, 2, 3, 3, 2, 1, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, -2, -1, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        # A puff of loosened meal on each landing, and nowhere else. It is the sound the
        # sprite cannot make.
        "puff": {
            "art": [None, None, None, "left", None, None, "right", None, None, None,
                    None, None, None, None],
            "dx": [0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0],
        },
        "leafL": {"dy": [0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
        "leafR": {"dy": [0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
        "stem": {"lean": [0, 1, 1, 0, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
