"""Shepherd's Purse (Capsella bursa-pastoris) - creature portrait sprite.

THE DESIGN HOOK: `bursa pastoris` is "shepherd's pouch", for the seed pods - flat green
hearts, notched at the top, hung all the way up the stem like coins on a string. It is
one of the most widespread flowering plants on earth and it is identified almost entirely
by those pods, which no other plant in this deck has anything like.

WHERE THE FACE GOES: in the basal rosette at the bottom, because the top of this plant is
purses and nothing else - and a face among the purses would be competing with the one
thing anybody looks at.

PERSONALITY: thrifty. Its trademark gesture is THE RATTLE - it gives its stem a shake and
every purse on it swings and knocks, one after another up the stalk rather than all at
once, and it counts them with obvious satisfaction. It is the only sprite that plays an
instrument, and the only one whose gesture travels UP the plant.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "G": (156, 202, 124, 255),   # leaf highlight
    "g": (112, 160, 94, 255),    # leaf mid
    "d": (76, 118, 68, 255),     # leaf deep
    "n": (52, 88, 52, 255),      # leaf shadow
    "P": (188, 216, 148, 255),   # purse face - paler than the leaves, so they stand out
    "p": (140, 174, 108, 255),   # purse shade
    "V": (244, 248, 238, 255),   # the tiny white four-petalled flowers at the tip
}

HEAD_W, HEAD_H = 19, 15


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    # Deep lobes: shepherd's purse has a dandelion-ish toothed rosette, and the teeth are
    # most of what it offers at ground level.
    return flower_head(
        HEAD_W, HEAD_H, 9.0, 7.0, 8.4, 6.6, 7, 0.19, 5.0, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))

# One purse: a flat heart with a notch in the top, on a short stalk. This shape is the
# entire identification of the species and it is drawn three times up the stem.
PURSE = [
    " o ",
    "oPo",
    "oPPo",
    "oPpo",
    " oo",
]

PURSE_SWUNG_L = [
    "  o",
    " oPo",
    "oPPo",
    "oppo",
    " oo",
]

PURSE_SWUNG_R = [
    "o  ",
    "oPo ",
    " oPPo",
    " oppo",
    "  oo",
]

# The tiny white flowers at the growing tip, which is where a crucifer keeps them while
# the pods ripen below.
TIP = [
    "oVo",
    "VoV",
    "oVo",
    " o ",
]

# The flowering stalk. It is drawn AFTER the rosette and runs several rows down INTO it,
# so it plainly grows out of the plant - drawn behind and stopping at the rosette's edge
# it read as a separate stick standing in front of a bush, which is the one thing a
# single-stemmed plant must not look like.
STALK = [
    "ogGdo",
    "ogGdo",
    "ogGdo",
    "ogGdo",
    "ogGdo",
    "ogGdo",
    "ogGdo",
    "ogGdo",
    "ogGdo",
    "ogGdo",
    "ogGdo",
    "ogGdo",
    "ogGdo",
    "ogGdo",
    " oGo ",
]

HEAD_AT = (6, 15)
TURN_L = face_shift(HEAD, HEAD_LEFT)[0]
TURN_R = face_shift(HEAD, HEAD_RIGHT)[0]
HEAD_ART = [None, "right", "left", "left", None, None, None, "right", None,
            None, None, None, None, None]
HEAD_DX = [0, 0, -1, 1, -1, 1, 0, 0, 0, 0, 0, 0, 0, 0]
_SLIDE = {"left": TURN_L, "right": TURN_R}
FACE_DX = [dx + _SLIDE.get(art, 0) for dx, art in zip(HEAD_DX, HEAD_ART)]

SPRITE = {
    "herbId": "capsella-bursa-pastoris",
    "personality": "thrifty",
    "size": (32, 28),
    "frames": 14,
    "fps": 10,
    "parts": [
        {"name": "tip", "origin": (14, 0), "rows": TIP},
        {
            "name": "purseA",
            "origin": (18, 12),
            "rows": PURSE,
            "variants": {"left": PURSE_SWUNG_L, "right": PURSE_SWUNG_R},
        },
        {
            "name": "purseB",
            "origin": (11, 9),
            "rows": PURSE,
            "variants": {"left": PURSE_SWUNG_L, "right": PURSE_SWUNG_R},
        },
        {
            "name": "purseC",
            "origin": (18, 6),
            "rows": PURSE,
            "variants": {"left": PURSE_SWUNG_L, "right": PURSE_SWUNG_R},
        },
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(HEAD_AT, HEAD, eyes="round", mouth="smile", eye_dy=1, mouth_dy=4),
        {"name": "stalk", "origin": (13, 4), "rows": STALK},
    ],
    #
    #  0    1     2      3      4      5      6     7     8     9    10   11   12    13
    # rest wind  SHAKE  purseA purseB purseC ring  ring  count count rest rest blink rest
    #
    # The rattle is frames 2-9 and it is this sprite's trademark: the shake starts at the
    # bottom and each purse swings one frame after the one below it, so the movement
    # travels UP the stalk. Every purse swinging together would be a plant in wind; a
    # wave going up it is a plant being shaken deliberately, which is the difference the
    # whole gesture rests on. Frame 0 is the rest pose reduced motion freezes on: purses
    # hanging still, all present and correct.
    "motion": {
        "head": {
            "art": HEAD_ART,
            "dx": HEAD_DX,
        },
        "eyes": {
            "art": [None, "half", "wide", "wide", "wide", "wide", None, None,
                    "happy", "happy", None, None, "blink", None],
            "dx": FACE_DX,
        },
        "cheeks": {"dx": [0, 1, -2, 2, -1, 1, 0, 0, 0, 0, 0, 0, 0, 0]},
        "mouth": {
            "art": [None, None, None, None, None, None, "grin", "grin", "grin",
                    "grin", None, None, None, None],
            "dx": FACE_DX,
        },
        # Each purse is one frame behind the one below it. This offset IS the gesture.
        "purseA": {
            "art": [None, None, "left", "right", "left", None, None, None, None,
                    None, None, None, None, None],
            "dx": [0, 0, -1, 1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "purseB": {
            "art": [None, None, None, "left", "right", "left", None, None, None,
                    None, None, None, None, None],
            "dx": [0, 0, 0, -1, 1, -1, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "purseC": {
            "art": [None, None, None, None, "left", "right", "left", None, None,
                    None, None, None, None, None],
            "dx": [0, 0, 0, 0, -1, 1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        # The stalk shears, and the tip at the top of it travels furthest - which is what
        # a struck string does, and what tells the viewer where the shake came from.
        "stalk": {"lean": [0, 0, -2, 2, -2, 1, -1, 0, 0, 0, 0, 0, 0, 0]},
        "tip": {"dx": [0, 0, -2, 2, -2, 1, -1, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
