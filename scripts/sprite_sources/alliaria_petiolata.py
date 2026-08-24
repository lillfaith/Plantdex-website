"""Garlic Mustard (Alliaria petiolata) - creature portrait sprite.

THE DESIGN HOOK: crush a leaf and it smells unmistakably of garlic, which is how anybody
identifies it and where both halves of its name come from. It is also one of the most
aggressive invaders in North American woodland - it poisons the soil fungi other plants
depend on, and it spreads by simply being everywhere.

So this one is a smell you can see. Its trademark is the only visible ODOUR in the deck,
and the deck's other airborne effects are deliberately different things: ragweed's pollen
is a violent involuntary blast it is ashamed of, and this is a slow deliberate exhale it
is delighted by.

WHERE THE FACE GOES: in the heart-shaped, scallop-edged leaf, which is the structure
people actually look at when identifying it.

PERSONALITY: pleased with itself, and closer than you would like. Its trademark gesture
is THE WAFT - it breathes out a slow cloud of garlic, leans in a little further while
you are dealing with that, and grins. The lean never resets fully within the loop, which
is the quietest way to draw an invasive species.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "G": (162, 208, 132, 255),   # leaf highlight
    "g": (116, 166, 98, 255),    # leaf mid
    "d": (78, 122, 72, 255),     # leaf deep
    "n": (54, 90, 56, 255),      # leaf shadow
    "V": (238, 246, 234, 255),   # the four small white petals
    "v": (204, 216, 202, 255),   # petal shade
    "S": (206, 224, 196, 255),   # the waft - pale green, so it reads as smell not steam
    "s": (176, 200, 172, 255),   # waft, thinner
}

HEAD_W, HEAD_H = 19, 17


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    # Eight shallow lobes: the scalloped margin of a garlic mustard leaf, which is the
    # detail that separates it from every other heart-shaped woodland leaf.
    return flower_head(
        HEAD_W, HEAD_H, 9.0, 8.5, 8.4, 8.0, 8, 0.13, 5.0, 4.2,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))

# The four-petalled white flowers, in a small cluster - garlic mustard is a crucifer and
# four petals in a cross is the family's signature.
FLOWERS = [
    "oVo vVv",
    "VVV oVo",
    "oVo vVv",
]

# The waft. It leaves the mouth small and dense, spreads, and thins to almost nothing -
# which is what a smell does, and is why it is drawn in three states rather than moved.
WAFT_NONE = [
    " ",
]

WAFT_NEAR = [
    " Ss",
    "sSS",
    " Ss",
]

WAFT_MID = [
    "  sSs",
    " sSSSs",
    "  sSs",
]

WAFT_FAR = [
    "  s  s",
    " s  s  s",
    "   s  s",
]

# Heart-shaped leaves on long stalks, the way this plant holds them.
LEAF_L = [
    "   ooooo",
    " ooGGGGgo",
    "oGGGGgggdo",
    "oGgggddddo",
    " oddnnnno",
    "  ooooo",
]

LEAF_R = [
    "ooooo",
    "ogGGGGoo",
    "oddgggGGGo",
    "odddddgggo",
    " onnnnddo",
    "  ooooo",
]

STEM = [
    "odgdo",
    "odgdo",
    "odgdo",
    " ooo ",
]

HEAD_AT = (6, 5)

SPRITE = {
    "herbId": "alliaria-petiolata",
    "personality": "pleased",
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "stem", "origin": (14, 22), "rows": STEM},
        {"name": "flowers", "origin": (13, 3), "rows": FLOWERS},
        {"name": "leafL", "origin": (0, 17), "rows": LEAF_L},
        {"name": "leafR", "origin": (22, 17), "rows": LEAF_R},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(
            HEAD_AT, HEAD, eyes="round", mouth="smile", eye_dy=1, mouth_dy=4,
            # A small round mouth for the exhale, and a wide pleased one for afterwards.
            extra_mouths={"blow": ["oo", "FF"]},
        ),
        {
            "name": "waft",
            "origin": (20, 13),
            "rows": WAFT_NONE,
            "variants": {"near": WAFT_NEAR, "mid": WAFT_MID, "far": WAFT_FAR},
        },
    ],
    #
    #  0    1     2      3     4     5     6     7     8    9     10   11   12    13
    # rest breathe BLOW  BLOW  waft  waft  thin  LEAN  LEAN grin  grin rest blink rest
    #
    # The waft is frames 2-6 and it is this sprite's trademark: a slow deliberate exhale
    # that spreads and thins over three frames, and then - while you are dealing with it -
    # frames 7-10 lean the whole plant a little closer to you and grin. Frame 0 is the
    # rest pose reduced motion freezes on: nothing in the air, and standing where it
    # started.
    "motion": {
        # The lean is the invasive bit. It goes out on the waft and comes back slowly, a
        # pixel at a time, so the loop never quite looks like it reset.
        "head": {
            "art": [None, None, None, None, "right", "right", "right", "right",
                    "right", None, None, None, None, None],
            "dx": [0, 0, 1, 1, 2, 2, 3, 3, 3, 2, 1, 1, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, "half", None, None, None, None, None, "happy", "happy",
                    "happy", "happy", None, "blink", None],
            "dx": [0, 0, 1, 1, 4, 4, 5, 5, 5, 2, 1, 1, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            # The blush sits right on the rim of the face, so it travels a shade less
            # than the mouth does or it slides off onto the leaf.
            "dx": [0, 0, 0, 0, 3, 3, 4, 4, 4, 2, 1, 0, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, "blow", "blow", "blow", None, None, "grin", "grin",
                    "grin", "grin", None, None, None],
            "dx": [0, 0, 1, 1, 3, 3, 4, 4, 4, 2, 1, 1, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
        },
        # Out, spreading, and gone. It never comes back within the loop, because a smell
        # that pulses would read as a machine rather than as a plant.
        "waft": {
            "art": [None, None, "near", "near", "mid", "mid", "far", None, None, None,
                    None, None, None, None],
            "dx": [0, 0, 0, 1, 2, 3, 5, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, -1, -1, -2, 0, 0, 0, 0, 0, 0, 0],
        },
        "flowers": {"lean": [0, 0, 1, 1, 1, 0, 0, -1, -1, 0, 0, 0, 0, 0]},
        "leafL": {"dx": [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]},
        "leafR": {"dx": [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
