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

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

PALETTE = {
    **FACE_PALETTE,
    "G": (142, 223, 142, 255),   # leaf highlight
    "g": (111, 179, 116, 255),    # leaf mid
    "d": (78, 147, 87, 255),     # leaf deep
    "n": (54, 84, 60, 255),      # leaf shadow
    "B": (172, 114, 181, 255),    # berry highlight
    "b": (138, 71, 156, 255),    # berry mid
    "u": (74, 42, 86, 255),      # berry deep
    "J": (158, 77, 175, 255),    # juice - brighter than the berry so a drop reads in air
    "j": (124, 60, 143, 255),     # the stain, which is duller than the juice that made it
    "t": (175, 132, 95, 255),    # twig and trunk shade
    "T": (205, 164, 126, 255),   # trunk light
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
# these has a notch cut out of it and the other does not. Both are drawn with a stalk that
# reaches back to the trunk, because a leaf floating beside a plant is not on the plant.
LEAF_LOBED = [
    "  oo oo",
    " oGGoGGo",
    "oGGgggggo",
    " oggddddoo",
    "  odnnnottt",
    "   ooooooo",
]

LEAF_PLAIN = [
    "  ooooo",
    " oGGGGGo",
    " oGgggggo",
    "ooggddddo",
    "ttodnnno",
    "ooooooo",
]

# The fruiting twig. It grows out of the crown and ARCS DOWN, so the berry hanging off it
# is plainly on this plant - which was the whole problem with the first version, where the
# twig, the berry and both leaves each floated on their own.
TWIG = [
    "oo",
    "otto",
    " ootto",
    "   ootto",
    "     otto",
    "      oto",
    "      oto",
]

# The trunk, joining the crown to the ground so the sprite is one object from top to
# bottom.
TRUNK = [
    "otTto",
    "otTto",
    "otTto",
    "otTto",
    " ooo ",
]

HEAD_AT = (2, 4)

# --- Growth stages -----------------------------------------------------------
#
# THE STAIN IS THE FRUIT, and this deck does not draw fruit before the last stage. That
# rule was written where getting ripeness wrong is dangerous; here it is simply true, and
# it takes with it the one thing this creature is known for:
#
#   sprout    leaves and a trunk. No twig, no berry, no drop, and NO PURPLE MOUTH — it
#             has never had one. That clean mouth is the whole characterisation of the
#             stage: this is the only version of this creature that is innocent.
#   growing   the fruiting twig, and a mulberry on it that is GREEN. Mulberries go green,
#             then red, then black, and a green one neither drips nor stains nor is worth
#             picking. So it hangs there, and nothing happens, and the mouth is still
#             clean.
#   flowering the drip, the splotch that stays, and the purple grin. Unchanged.
#
# THE LEAVES ARE ODD AT EVERY STAGE. Mulberry carries lobed and unlobed leaves on the
# same tree — sometimes a mitten, sometimes a plain oval — which is the field mark when
# there is no fruit to look at, and at two of the three stages there is not.

UNRIPE_PALETTE = {
    "K": (176, 214, 132, 255),   # unripe highlight — green, weeks off anything
    "k": (128, 172, 92, 255),    # unripe mid
    "j": (88, 126, 68, 255),     # unripe deep
}

# --- Sprout: a clean mouth --------------------------------------------------
YOUNG_HEAD_AT = (8, 12)


def _young_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        15, 11, 7.0, 5.4, 7.0, 5.2, 4, 0.19, 5.4, 3.2,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.3, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.3, light=(-1.25, -0.65))

LEAF_LOBED_YOUNG = [
    "  oo oo",
    " oGGoGGo",
    "oGgggggo",
    " oddnnoo",
    "  ooootto",
]

LEAF_PLAIN_YOUNG = [
    " ooooo",
    "oGGGGGo",
    "oggddddo",
    "todnnno",
    "ooooo",
]

TRUNK_SHORT = [
    "otTto",
    " ooo ",
]

# --- Growing: a green mulberry ----------------------------------------------
MID_HEAD_AT = (5, 8)


def _mid_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        17, 14, 8.0, 6.6, 7.8, 6.4, 4, 0.19, 5.4, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


MID_HEAD = _mid_head()
MID_HEAD_LEFT = _mid_head(face_dx=-1.4, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_head(face_dx=1.4, light=(-1.25, -0.65))

# The same aggregate of drupelets, in the colour it wears for most of its existence.
BERRY_GREEN = [
    " oo ",
    "oKko",
    "okkjo",
    "okjjo",
    "okjo",
    " oo",
]

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(MID_HEAD, MID_HEAD_LEFT)
G_R_DX, _ = face_shift(MID_HEAD, MID_HEAD_RIGHT)

SPRITE = {
    "herbId": "morus-spp",
    "personality": "unrepentant",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(8, "sprout"),
            "hide": ["twig", "berry", "drop", "stain", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "leafLobed": LEAF_LOBED_YOUNG,
                "leafPlain": LEAF_PLAIN_YOUNG,
                "trunk": TRUNK_SHORT,
                "eyes": YOUNG_EYES["rows"],
                # A clean mouth. The adult wears `stained` in its RESTING frame, which
                # is the joke; this one has not earned it.
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "wide": YOUNG_EYES["wide"],
                    "happy": YOUNG_EYES["happy"],
                },
                "mouth": {"grin": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "leafLobed": (2, 18),
                "leafPlain": (17, 18),
                "trunk": (14, 22),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=1, mouth_dy=3
                ),
            },
            "motion": {
                "head": {
                    "art": [None, "right", None, None, "left", None, None, None],
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, None, "happy", "happy", None, None, "blink", None],
                    "dx": [0, S_R_DX, 0, 0, S_L_DX, 0, 0, 0],
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0],
                },
                "mouth": {
                    "art": [None, None, "grin", "grin", None, None, None, None],
                    "dx": [0, S_R_DX, 0, 0, S_L_DX, 0, 0, 0],
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0],
                },
                "leafLobed": {"lean": [0, 1, 1, 0, -1, 0, 0, 0]},
                "leafPlain": {"dy": [0, 0, 0, 0, 0, 0, 0, 0]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(8, "growing"),
            "palette": UNRIPE_PALETTE,
            # A green mulberry does not drip, so there is nothing to fall and nothing to
            # land. The frame stays clean, which for this creature is the whole point.
            "hide": ["drop", "stain", "cheeks"],
            "swap": {
                "head": MID_HEAD,
                "berry": BERRY_GREEN,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": MID_HEAD_LEFT, "right": MID_HEAD_RIGHT},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "wide": YOUNG_EYES["wide"],
                    "happy": YOUNG_EYES["happy"],
                },
                "mouth": {"grin": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": MID_HEAD_AT,
                "twig": (16, 12),
                "berry": (21, 17),
                "leafLobed": (0, 17),
                "leafPlain": (15, 18),
                "trunk": (13, 19),
                **seat_young(
                    MID_HEAD_AT, MID_HEAD, cheeks=False, eye_dy=1, mouth_dy=4
                ),
            },
            # It watches the berry the whole loop, waiting for it to do the thing it
            # cannot do yet. Nothing falls. It looks away again.
            "motion": {
                "head": {
                    "art": [None, "right", "right", "right", "right", "right", None,
                            "left", None, None],
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, None, "wide", "wide", "wide", "wide", None, None,
                            "blink", None],
                    "dx": [0, G_R_DX, G_R_DX, G_R_DX, G_R_DX, G_R_DX, 0, G_L_DX, 0, 0],
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0],
                },
                "mouth": {
                    "dx": [0, G_R_DX, G_R_DX, G_R_DX, G_R_DX, G_R_DX, 0, G_L_DX, 0, 0],
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0],
                },
                "berry": {"dy": [0, 0, 0, 1, 1, 1, 1, 0, 0, 0]},
                "leafLobed": {"lean": [0, 1, 1, 0, 0, -1, -1, 0, 0, 0]},
                "leafPlain": {"dy": [0, 0, 0, 0, 1, 1, 0, 0, 0, 0]},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "trunk", "origin": (13, 19), "rows": TRUNK},
        {"name": "twig", "origin": (16, 8), "rows": TWIG},
        {"name": "stain", "origin": (20, 25), "rows": STAIN_NONE,
         "variants": {"small": STAIN_SMALL, "full": STAIN_FULL}},
        {"name": "leafPlain", "origin": (16, 17), "rows": LEAF_PLAIN},
        {
            "name": "berry",
            "origin": (21, 15),
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
        {"name": "leafLobed", "origin": (0, 16), "rows": LEAF_LOBED},
        {
            "name": "drop",
            "origin": (23, 21),
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
