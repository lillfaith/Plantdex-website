"""Wood Sorrel (Oxalis stricta) - creature portrait sprite.

THE DESIGN HOOK: wood sorrel folds up. Its three heart-shaped leaflets shut downward at
dusk, in rain, and when something disturbs them - real nyctinasty, not a metaphor - and
open again in the morning. The plant does an animation by itself, and this sprite would
be dishonest doing anything else.

Nothing else in the deck closes. The passion flower opens out of a bud, but that is a
bloom arriving; this is a plant that goes away and comes back, several times a day, its
whole life.

WHERE THE FACE GOES: under the three leaflets, so that when they fold they come down
over it like an umbrella - which is the only way the gesture reads at this size.

PERSONALITY: private. Its trademark gesture is THE FOLD - three leaflets drop, the face
is hidden entirely for two frames, and it opens again with a small squint at the light.
It is the only sprite that removes itself from its own portrait for reasons of its own.

SAFETY: a portrait, never an identification aid. Wood sorrel is a sour-tasting plant with
oxalic acid in it, the card says as much, and this drawing is deliberately stylised - the
card's identification content stays the reference outdoors.
"""

from _face import FACE_PALETTE, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "G": (168, 216, 132, 255),   # leaflet highlight - wood sorrel is a fresh light green
    "g": (120, 178, 100, 255),   # leaflet mid
    "d": (82, 130, 76, 255),     # leaflet deep
    "n": (58, 96, 58, 255),      # leaflet shadow
    "Y": (250, 226, 132, 255),   # the small yellow flower
    "y": (208, 176, 92, 255),    # flower shade
    "t": (128, 172, 108, 255),   # leaf stalk
}

HEAD_W, HEAD_H = 17, 15


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        HEAD_W, HEAD_H, 8.0, 7.0, 7.4, 6.6, 5, 0.10, 4.8, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.4, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.4, light=(-1.25, -0.65))

# The three heart-shaped leaflets, open. Each is notched at the tip, which is the shape
# people check for when they are deciding whether they have found clover instead.
TRIFOIL_OPEN = [
    "  ooo     ooo",
    " oGoGo   oGoGo",
    "oGGGGGo oGGGGGo",
    "oGgggggogggggGo",
    " oggdddogddddgo",
    "  oddnooonnddo",
    "   ooo   ooo",
]

# Half shut: the leaflets have begun to drop and turn edge-on.
TRIFOIL_HALF = [
    "   oo   oo",
    "  oGGo oGGo",
    " oGgggogggGo",
    " oggddoddggo",
    "  oddoodddo",
    "   oo   oo",
]

# Shut: the leaflets hanging straight down, edge-on and closed, over exactly where the
# face was. This is the pose the whole sprite exists for, so it is sized to COVER the
# face rather than to sit above it - a fold that leaves the eyes showing is a plant
# wearing a hat.
TRIFOIL_SHUT = [
    " ooo ooo ",
    "odGdodGdo",
    "odGdodGdo",
    "odgdodgdo",
    "odgdodgdo",
    "odgdodgdo",
    "odgdodgdo",
    "odndodndo",
    "odndodndo",
    " ooo ooo ",
]

# The crowning leaflet, which stays up longest and folds last.
CROWN_OPEN = [
    "  ooo",
    " oGoGo",
    "oGGGGGo",
    "ogggggo",
    " oddno",
    "  ooo",
]

CROWN_SHUT = [
    " ooo",
    "odGdo",
    "odgdo",
    "odndo",
    " ooo",
]

# The small yellow five-petalled flower.
FLOWER = [
    "oYo",
    "YyY",
    "oYo",
]

FLOWER_SHUT = [
    "oyo",
    "oyo",
]

STEMS = [
    "ot o to",
    "ot o to",
    " otoo t",
    "  ooo",
]

HEAD_AT = (7, 11)

SPRITE = {
    "herbId": "oxalis-stricta",
    "personality": "private",
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    # The head is drawn BEFORE the leaflets, which is what lets them close over the face
    # rather than behind it. Getting this order wrong is the whole gesture failing.
    "parts": [
        {"name": "stems", "origin": (12, 22), "rows": STEMS},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(HEAD_AT, HEAD, eyes="round", mouth="small", eye_dy=2, mouth_dy=5),
        {
            "name": "trifoil",
            "origin": (8, 8),
            "rows": TRIFOIL_OPEN,
            "variants": {"half": TRIFOIL_HALF, "shut": TRIFOIL_SHUT},
        },
        {
            "name": "crown",
            "origin": (12, 5),
            "rows": CROWN_OPEN,
            "variants": {"shut": CROWN_SHUT},
        },
        {
            "name": "flower",
            "origin": (22, 12),
            "rows": FLOWER,
            "variants": {"shut": FLOWER_SHUT},
        },
    ],
    #
    #  0    1    2     3     4     5    6    7     8     9     10    11   12    13
    # open sway FOLD  FOLD  SHUT  SHUT SHUT open  open  squint squint rest blink rest
    #
    # The fold is frames 2-8 and it is this sprite's trademark: the leaflets drop, the
    # face is gone entirely for three frames, and it comes back squinting. Frame 0 is the
    # rest pose reduced motion freezes on - fully open, because a card that showed a
    # folded-away creature would look like a bug rather than like botany.
    "motion": {
        # The leaflets change art rather than merely moving down: folding is a change of
        # shape, and a grid slid downward is a grid slid downward.
        "trifoil": {
            "art": [None, None, "half", "half", "shut", "shut", "shut", "half",
                    "half", None, None, None, None, None],
            "dx": [0, 0, 2, 2, 4, 4, 4, 2, 2, 0, 0, 0, 0, 0],
            "dy": [0, 0, 2, 3, 4, 4, 4, 3, 2, 0, 0, 0, 0, 0],
        },
        # The crown leaflet folds last and opens first, which is what stops the three
        # leaflets reading as one object with a hinge.
        "crown": {
            "art": [None, None, None, "shut", "shut", "shut", "shut", "shut", None,
                    None, None, None, None, None],
            "dx": [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 2, 4, 4, 4, 2, 0, 0, 0, 0, 0, 0],
        },
        # The flower shuts too, a frame behind the leaves. Oxalis closes both.
        "flower": {
            "art": [None, None, None, "shut", "shut", "shut", "shut", "shut", "shut",
                    None, None, None, None, None],
            "dy": [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "head": {
            "art": [None, "right", None, None, None, None, None, None, None, "left",
                    None, None, None, None],
            "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        # The face does not move while it is covered - it is simply not visible. What
        # sells the reopening is the squint: three frames of dark and then light.
        "eyes": {
            "art": [None, None, "half", "shut", "shut", "shut", "shut", "shut",
                    "half", "half", None, None, "blink", None],
            "dx": [0, 2, 0, 0, 0, 0, 0, 0, 0, -2, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 1, 0, 0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, "wide", "wide", "wide", "wide", "wide", "wide",
                    None, None, None, None, None, None],
            "dx": [0, 1, 0, 0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
    },
    "palette": PALETTE,
}
