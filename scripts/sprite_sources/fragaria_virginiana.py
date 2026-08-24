"""Wild Strawberry (Fragaria virginiana) - creature portrait sprite.

THE DESIGN HOOK: a wild strawberry is a fraction of the size of the shop kind and tastes
more of strawberry than any of them. This is the species behind half the ancestry of
every cultivated strawberry on earth - it was carried from North America to Europe,
crossed with a Chilean one, and the result is what everybody now means by the word.

The berry is also the thing this plant is FOR, from the plant's point of view, and it
ripens in public: green, then white, then a shoulder of red, then all red. That is four
drawings and a gesture.

WHERE THE FACE GOES: in the three-parted leaf, so the berry can be held out beside it and
watched.

PERSONALITY: sweet, and quietly proud. Its trademark gesture is THE RIPEN - a berry
changes colour over four frames while the creature's own blush deepens to match. It is
the only sprite whose gesture is a gradual colour change, and the only one where the
creature and its prop change together.

Deliberately not the sumac's torch, which lights in a single step and is a prop being
shown off; this is something slowly becoming ready.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "G": (152, 202, 122, 255),   # leaf highlight
    "g": (108, 158, 92, 255),    # leaf mid
    "d": (74, 116, 68, 255),     # leaf deep
    "n": (52, 86, 52, 255),      # leaf shadow
    "W": (255, 255, 255, 255),   # eye glint, and the unripe berry's white
    "w": (226, 232, 214, 255),   # unripe berry shade
    "R": (238, 122, 118, 255),   # berry highlight
    "r": (206, 68, 74, 255),     # berry mid
    "u": (156, 44, 56, 255),     # berry deep
    "S": (250, 232, 156, 255),   # the seeds sitting on the outside of a strawberry
    "V": (250, 250, 244, 255),   # the five white petals
    "Y": (250, 220, 130, 255),   # flower centre
}

HEAD_W, HEAD_H = 19, 17


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    # Three lobes: a strawberry leaf is trifoliate, and three is the count that identifies
    # it at a glance in a lawn full of other things.
    # A taller face than most: the big three-row eyes and a three-row grin together need
    # nine rows of face to sit in, and squeezing them into seven put the grin in the leaf.
    return flower_head(
        HEAD_W, HEAD_H, 9.0, 8.0, 8.4, 7.4, 3, 0.16, 5.0, 4.6,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.4, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.4, light=(-1.25, -0.65))

# The berry, ripening. Four states, and the third is the important one: a real strawberry
# goes red at the tip first and keeps a white shoulder for a day or two, and skipping
# that step is what makes drawn fruit look like a coloured ball.
BERRY_GREEN = [
    " oo ",
    "ogGo",
    "ogggo",
    "oddo",
    " oo ",
]

BERRY_WHITE = [
    " oo ",
    "oWWo",
    "oWwWo",
    "owwo",
    " oo ",
]

BERRY_TURNING = [
    " oo ",
    "oWWo",
    "oWwRo",
    "orRo",
    " oo ",
]

BERRY_RIPE = [
    " oo ",
    "oRRo",
    "oRrSo",
    "oruo",
    " oo ",
]

# Seeds on the outside, which is where a strawberry keeps them and is the reason it is not
# botanically a berry at all.
SEEDS = [
    "S  S",
    " S S",
]

SEEDS_NONE = [
    " ",
]

# The five-petalled white flower, still open beside the ripening fruit.
FLOWER = [
    "oVoVo",
    "VYYYV",
    "oVoVo",
]

# The runner every strawberry sends out sideways, with a small plantlet starting on it.
RUNNER = [
    "ooooooooo",
    "ogggggggo",
]

# The toothed leaflets either side.
LEAF_L = [
    "  ooo",
    " oGoGo",
    "oGGGGgo",
    "oggdddo",
    " ooooo",
]

LEAF_R = [
    "ooo",
    "oGoGo",
    "ogGGGGo",
    "odddggo",
    "ooooo",
]

STEM = [
    "ogdo",
    "ogdo",
    " oo ",
]

HEAD_AT = (4, 5)

SPRITE = {
    "herbId": "fragaria-virginiana",
    "personality": "sweet",
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "runner", "origin": (18, 24), "rows": RUNNER},
        {"name": "stem", "origin": (10, 21), "rows": STEM},
        {"name": "leafL", "origin": (0, 17), "rows": LEAF_L},
        {"name": "leafR", "origin": (16, 17), "rows": LEAF_R},
        {"name": "flower", "origin": (23, 8), "rows": FLOWER},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(
            HEAD_AT, HEAD, eyes="big", mouth="smile", eye_dy=1, mouth_dy=5,
            # A deeper blush for the frames the berry is fully ripe. The creature and the
            # fruit come to colour together, which is the whole idea.
            extra_cheeks={"deep": ["r      r"]},
        ),
        {
            "name": "berry",
            "origin": (22, 14),
            "rows": BERRY_GREEN,
            "variants": {
                "white": BERRY_WHITE,
                "turning": BERRY_TURNING,
                "ripe": BERRY_RIPE,
            },
        },
        {
            "name": "seeds",
            "origin": (23, 16),
            "rows": SEEDS_NONE,
            "variants": {"on": SEEDS},
        },
    ],
    #
    #  0     1      2      3      4      5     6     7     8     9    10   11   12    13
    # green notice WHITE  WHITE TURNING TURNING RIPE  RIPE  RIPE beam  beam rest blink rest
    #
    # The ripening is frames 2-8 and it is this sprite's trademark: four berry states in
    # order, none of them skipped, with the white-shouldered one given as much time as the
    # others. The creature's blush deepens on the same frame the berry finishes, which is
    # the only moment in this deck where a creature and its prop change together. Frame 0
    # is the rest pose reduced motion freezes on - green, so the still image is the start
    # of something.
    "motion": {
        "berry": {
            "art": [None, None, "white", "white", "turning", "turning", "ripe",
                    "ripe", "ripe", "ripe", "ripe", "ripe", "ripe", None],
            "dy": [0, 0, 0, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        # The seeds only show once there is red for them to sit on. On a green berry they
        # would be invisible, and drawing them anyway is how sprites get muddy.
        "seeds": {
            "art": [None, None, None, None, None, None, "on", "on", "on", "on",
                    "on", "on", "on", None],
            "dy": [0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "head": {
            "art": [None, "right", "right", "right", "right", "right", "right",
                    "right", None, None, None, None, None, None],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, None, None, None, None, "wide", "wide", None,
                    "half", "half", None, "blink", None],
            "dx": [0, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "art": [None, None, None, None, None, None, "deep", "deep", "deep",
                    "deep", "deep", None, None, None],
            "dx": [0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, None, None, None, None, "grin", "grin", "grin",
                    "grin", "grin", None, None, None],
            "dx": [0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "flower": {"dy": [0, 0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0]},
        "leafL": {"dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0]},
        "leafR": {"dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
