"""Wild Violet (Viola sororia) - creature portrait sprite.

THE DESIGN HOOK: "shrinking violet" is one of the oldest character descriptions in the
language, and unusually for folk botany it matches the plant - violets flower low, under
their own heart-shaped leaves, and are easy to walk past. They also cheat: alongside the
showy purple flowers they produce cleistogamous ones that never open at all and set seed
in private, which is a plant being shy on purpose.

WHERE THE FACE GOES: in the flower, low in frame, with a heart-shaped leaf beside it big
enough to hide behind.

PERSONALITY: bashful. Its trademark gesture is THE PEEK - it ducks fully behind its own
leaf, waits, and comes back out one eye at a time. It is the only sprite that leaves the
frame it is standing in.

Deliberately not the wood sorrel's fold, though both disappear: sorrel closes on a
schedule the sun sets and never looks at you, while this one is hiding FROM you and
checks whether you are still there. One is botany, the other is stage direction.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, feature_parts, on_face
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "V": (206, 186, 240, 255),   # petal highlight
    "v": (162, 136, 212, 255),   # petal mid
    "q": (118, 96, 168, 255),    # petal deep
    "Q": (84, 66, 124, 255),     # petal shadow
    "Y": (250, 232, 150, 255),   # the pale throat every violet has
    "G": (146, 198, 116, 255),   # leaf highlight
    "g": (102, 156, 88, 255),    # leaf mid
    "d": (68, 114, 66, 255),     # leaf deep
    "n": (48, 84, 50, 255),      # leaf shadow
}

HEAD_W, HEAD_H = 17, 15


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    # Five lobes: a violet has five petals, two up and three down, and five is the count
    # the eye actually checks when it decides what it is looking at.
    return flower_head(
        HEAD_W, HEAD_H, 8.0, 7.0, 7.6, 6.8, 5, 0.18, 4.8, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="VvqQFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.4, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.4, light=(-1.25, -0.65))

# The pale throat, which every violet carries and which stops the flower reading as a
# flat purple disc.
THROAT = [
    " Y Y ",
    "  Y  ",
]

# The heart-shaped leaf it hides behind. Big enough to cover the whole flower, because a
# hiding place that leaves the head showing is not a hiding place.
SHIELD = [
    "  ooo   ooo  ",
    " oGGGGoGGGGo ",
    "oGGGGGGGGGGGo",
    "oGGGgggggGGGo",
    "oGgggggggggdo",
    "ogggggdddddno",
    " oggdddddnno",
    "  oddddnnno",
    "   oddnno",
    "    ono",
]

# The second leaf, which stays put - one leaf hides, one holds the plant up.
LEAF = [
    " ooo ooo",
    "oGGGoGGGo",
    "oGGgggGGo",
    " oggdddo",
    "  oddno",
    "   oo",
]

STEM = [
    "odgo",
    "odgo",
    "odgo",
    "odgo",
    " oo ",
]

HEAD_AT = (8, 6)

SPRITE = {
    "herbId": "viola-sororia",
    "personality": "bashful",
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    # The shield leaf is drawn LAST, over everything, because the whole gesture is it
    # passing in front of the face.
    "parts": [
        {"name": "stem", "origin": (14, 20), "rows": STEM},
        {"name": "leaf", "origin": (20, 17), "rows": LEAF},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        {"name": "throat", "origin": on_face(HEAD_AT, HEAD, THROAT, dy=6), "rows": THROAT},
        *feature_parts(
            HEAD_AT, HEAD, eyes="round", mouth="small", eye_dy=2, mouth_dy=5,
            # One eye open and the other still screwed shut. This is the frame the whole
            # gesture is for, and it only works asymmetrically.
            extra_eyes={"peek": ["EE    ", "EE  oo"]},
        ),
        {"name": "shield", "origin": (2, 16), "rows": SHIELD},
    ],
    #
    #  0    1    2     3     4     5     6     7     8     9     10   11   12    13
    # rest sway DUCK  HIDE  HIDE  HIDE  peek  peek  emerge back  rest rest blink rest
    #
    # The peek is frames 2-8 and it is this sprite's trademark: the leaf comes up over
    # the face for three frames, then drops just far enough for one eye, then all the way.
    # The half-frame of one eye is the whole character - a creature that reappeared all at
    # once would merely have been briefly obscured. Frame 0 is the rest pose reduced
    # motion freezes on: out in the open, which is what a card should show.
    "motion": {
        # The leaf travels UP and across rather than sideways: a violet hides under its
        # own leaves, which grow above the flowers, so the cover comes down over it.
        "shield": {
            # Measured against the face, not guessed: fully raised the leaf has to clear
            # the whole face, and on the peek frames it has to sit low enough to uncover
            # the eyes and nothing else.
            "dx": [0, 0, 3, 5, 5, 5, 4, 4, 2, 0, 0, 0, 0, 0],
            "dy": [0, 0, -3, -6, -7, -7, -2, -2, -1, 0, 0, 0, 0, 0],
        },
        "head": {
            "art": [None, "right", None, None, None, None, None, None, "left",
                    "left", None, None, None, None],
            "dy": [0, -1, 1, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "throat": {"dy": [0, -1, 1, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0]},
        "eyes": {
            "art": [None, None, "shut", "shut", "shut", "shut", "peek", "peek",
                    "half", None, None, None, "blink", None],
            "dx": [0, 2, 0, 0, 0, 0, 0, 0, -2, -2, 0, 0, 0, 0],
            "dy": [0, -1, 1, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 1, 0, 0, 0, 0, 0, 0, -1, -1, 0, 0, 0, 0],
            "dy": [0, -1, 1, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, None, None, None, None, None, None, None, None,
                    None, None, None, None],
            "dx": [0, 1, 0, 0, 0, 0, 0, 0, -1, -1, 0, 0, 0, 0],
            "dy": [0, -1, 1, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "leaf": {"lean": [0, 1, 1, 0, 0, 0, -1, -1, 0, 0, 0, 0, 0, 0]},
        "stem": {"lean": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
