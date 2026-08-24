"""Mulberry (Morus spp.) - creature portrait sprite.

THE DESIGN HOOK: mulberries stain. A fruiting tree marks the pavement under it purple for
weeks, the fruit falls apart the moment you pick it, and anyone who has eaten them has
walked away with the evidence on their hands. That is the plant's whole social reputation
and it is far more memorable than its leaves.

WHERE THE FACE GOES: in the leaf, which is a genuinely odd shape - mulberry leaves come
lobed and unlobed on the same tree, sometimes with a mitten shape and sometimes plain, and
this creature wears one of the lobed ones.

PERSONALITY: unrepentant. Its trademark gesture is THE DRIP - a berry hangs, a drop of
juice gathers and falls, a purple splotch lands below, and the creature does not clean it
up or look sorry. It is the only sprite that leaves a mark on its own frame, and the only
one whose gesture is still there at the end of the loop.

That last part is the joke and it is worth protecting: the splotch is what a mulberry
leaves behind, so it must not tidy itself away before the loop restarts.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "G": (156, 202, 122, 255),   # leaf highlight
    "g": (110, 158, 92, 255),    # leaf mid
    "d": (74, 116, 68, 255),     # leaf deep
    "n": (52, 86, 52, 255),      # leaf shadow
    "B": (150, 96, 158, 255),    # berry highlight
    "b": (110, 64, 122, 255),    # berry mid
    "u": (74, 42, 86, 255),      # berry deep
    "J": (128, 72, 140, 255),    # juice - brighter than the berry so a drop reads in air
    "j": (96, 54, 108, 255),     # the stain, which is duller than the juice that made it
    "t": (148, 112, 82, 255),    # twig
}

HEAD_W, HEAD_H = 19, 15


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        HEAD_W, HEAD_H, 9.0, 7.0, 8.4, 6.6, 4, 0.19, 5.0, 4.2,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))

# The fruit. A mulberry is an aggregate of little drupelets on a stalk, longer than it is
# wide - much closer to a blackberry than to anything round.
BERRY = [
    " oo ",
    "oBbo",
    "obbuo",
    "obuuo",
    "obuo",
    " oo",
]

BERRY_HEAVY = [
    " oo ",
    "oBbo",
    "obbuo",
    "obuuo",
    "obuuo",
    "obuo",
    " oo",
]

# The drop, on its way down. One pixel, then two, then gone - and where it lands is the
# only place in this deck a sprite changes its own frame permanently.
DROP_NONE = [
    " ",
]

DROP = [
    "J",
]

DROP_LONG = [
    "J",
    "J",
]

# The stain. It arrives and it does NOT go away before the loop ends: a mulberry that
# tidied up after itself would be a different plant.
STAIN_NONE = [
    " ",
]

STAIN_SMALL = [
    " j ",
    "jjj",
]

STAIN_FULL = [
    " jj ",
    "jjjjj",
    " jjj ",
]

# Mulberry's other oddity: lobed and unlobed leaves on the same tree, which is why one of
# these has a notch cut out of it and the other does not.
LEAF_LOBED = [
    "  oo oo",
    " oGGoGGo",
    "oGGgggggo",
    " oggddddo",
    "  odnnno",
    "   oooo",
]

LEAF_PLAIN = [
    " ooooo",
    "oGGGGGo",
    "oGgggggo",
    "oggddddo",
    " odnnno",
    "  oooo",
]

TWIG = [
    "ottto",
    " ottto",
    "  otto",
]

HEAD_AT = (2, 5)

SPRITE = {
    "herbId": "morus-spp",
    "personality": "unrepentant",
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "twig", "origin": (17, 3), "rows": TWIG},
        {"name": "stain", "origin": (23, 24), "rows": STAIN_NONE,
         "variants": {"small": STAIN_SMALL, "full": STAIN_FULL}},
        {"name": "leafPlain", "origin": (22, 17), "rows": LEAF_PLAIN},
        {
            "name": "berry",
            "origin": (23, 8),
            "rows": BERRY,
            "variants": {"heavy": BERRY_HEAVY},
        },
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(
            HEAD_AT, HEAD, eyes="round", mouth="smile", eye_dy=1, mouth_dy=4,
            # Purple. It has clearly already had some, which is why it is not sorry.
            extra_mouths={"stained": ["ojjjo", "ojjo"]},
        ),
        {"name": "leafLobed", "origin": (0, 19), "rows": LEAF_LOBED},
        {
            "name": "drop",
            "origin": (25, 14),
            "rows": DROP_NONE,
            "variants": {"on": DROP, "long": DROP_LONG},
        },
    ],
    #
    #  0    1     2      3      4      5     6      7      8     9    10   11   12    13
    # rest look  swell  swell  DROP   fall  fall  SPLAT  spread grin grin rest blink rest
    #
    # The drip is frames 2-8 and it is this sprite's trademark: the berry swells, a drop
    # falls, and a purple stain lands and STAYS. Frames 9 onward are the creature grinning
    # at it with a purple mouth. Frame 0 is the rest pose reduced motion freezes on: berry
    # intact, nothing spilled - the one honest still image, since a card permanently
    # showing a mess would read as damage rather than as character.
    "motion": {
        "berry": {
            "art": [None, None, "heavy", "heavy", "heavy", "heavy", "heavy", "heavy",
                    "heavy", "heavy", "heavy", "heavy", "heavy", None],
            "dy": [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        },
        # One drop, gathering and then falling ten pixels in two frames. Anything slower
        # would read as syrup.
        "drop": {
            "art": [None, None, None, "on", "on", "long", "long", None, None, None,
                    None, None, None, None],
            "dy": [0, 0, 0, 0, 1, 4, 8, 0, 0, 0, 0, 0, 0, 0],
        },
        # The stain arrives on the frame the drop lands and stays for the rest of the
        # loop. This is the one thing in this deck a gesture leaves behind.
        "stain": {
            "art": [None, None, None, None, None, None, None, "small", "full",
                    "full", "full", "full", "full", "full"],
        },
        "head": {
            "art": [None, "right", "right", "right", "right", "right", "right",
                    "right", "right", None, None, None, None, None],
            "dy": [0, -1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, "wide", "wide", "wide", "wide", "wide", "wide",
                    "wide", "happy", "happy", None, "blink", None],
            "dx": [0, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": ["stained", "stained", "stained", "stained", "stained", "stained",
                    "stained", "stained", "stained", "grin", "grin", "stained",
                    "stained", "stained"],
            "dx": [0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        },
        "leafLobed": {"lean": [0, 1, 1, 0, 0, -1, -1, 0, 0, 1, 0, 0, 0, 0]},
        "leafPlain": {"dy": [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
