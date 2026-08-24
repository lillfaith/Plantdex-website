"""Burdock (Arctium lappa) - creature portrait sprite.

THE DESIGN HOOK: burdock's burr is the plant that invented Velcro. George de Mestral
pulled them off his dog and looked at the hooks under a microscope. So the creature is
a round hooked burr riding on the deck's broadest leaves, and everything about it wants
to attach itself to you.

WHERE THE FACE GOES: in the burr, which is both the recognisable structure and the only
round thing here big enough to hold one. Same rule as the dandelion, opposite feeling -
that head is covered in hooks.

PERSONALITY: eager and clingy, and pleased about it. Its trademark gesture is THE GRAB -
it leans right out toward you, both leaves reaching, the burr's hooks flaring, then
settles back with a delighted little wiggle at having tried.

This is deliberately NOT the nettle's lunge, though both move forward. The nettle wants
you gone and bares teeth; the burdock wants to come with you and grins the whole time.
Forward is not one emotion.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits apart
from the card's identification content, which stays the reference for anyone actually
looking at a plant outdoors.
"""

from _flowerhead import flower_head

# Authored at 32x28, the house size.
PALETTE = {
    "o": (74, 48, 92, 255),      # outline
    "B": (198, 154, 186, 255),   # burr highlight - the dusty mauve of a ripe head
    "b": (156, 112, 148, 255),   # burr mid
    "u": (116, 80, 112, 255),    # burr deep
    "U": (86, 58, 84, 255),      # burr shadow
    "k": (214, 178, 208, 255),   # hook tips, paler than the burr so they catch the eye
    "F": (246, 234, 244, 255),   # face
    "E": (86, 58, 104, 255),     # eye
    "W": (255, 255, 255, 255),   # eye glint
    "c": (238, 164, 184, 255),   # cheek
    "G": (138, 190, 106, 255),   # leaf highlight
    "g": (96, 150, 80, 255),     # leaf mid
    "d": (64, 108, 60, 255),     # leaf deep
    "n": (44, 78, 48, 255),      # leaf shadow
}

BURR_W, BURR_H = 23, 21


def _burr(face_dx=0.0, light=(-0.85, -0.65), amp=0.17):
    # Many shallow lobes: a burr is a dense ball of small hooks, not a few big petals.
    return flower_head(
        BURR_W, BURR_H, 11.0, 10.0, 9.4, 9.0, 14, amp, 5.4, 4.8,
        face_dx=face_dx, light=light, trim_tail=False, chars="BbuUFo",
    )


BURR = _burr()
BURR_LEFT = _burr(face_dx=-1.6, light=(-0.35, -0.65))
BURR_RIGHT = _burr(face_dx=1.6, light=(-1.25, -0.65))
# Hooks flared: the same ball with the lobes driven out. This is the burr deciding it
# would like to come with you.
BURR_FLARE = _burr(amp=0.30)

# Hook tips scattered round the rim, a shade paler than the burr. They are what stops it
# reading as a plum.
HOOKS = [
    "k   k    k   k",
    "k             k",
    "  k         k",
]

EYES_OPEN = [
    "WE   WE",
    "EE   EE",
]

EYES_HAPPY = [
    "oo   oo",
    "EE   EE",
]

EYES_CLOSED = [
    "       ",
    "EE   EE",
]

# Eager: the eyes go wide the moment it decides to reach.
EYES_WIDE = [
    "EE   EE",
    "EE   EE",
]

CHEEKS = [
    "c     c",
]

# Grinning the entire time it is trying to stick to you.
MOUTH_SMILE = [
    "o   o",
    " ooo ",
]

MOUTH_GRIN = [
    "ooooo",
    "oFFFo",
    " ooo ",
]

# The deck's broadest leaves, held out low and forward like hands. They reach on the
# grab rather than lifting - this creature grabs at knee height, which is where burrs
# actually catch you.
LEAF_L = [
    "     ooooo",
    "  oooGGGGGo",
    " oGGGGGGGgo",
    "oGGgggggddo",
    " ognnnnnndo",
    "  oonnnnoo",
]

LEAF_L_REACH = [
    "       ooooo",
    "    oooGGGGGo",
    "  oGGGGGGGGgo",
    "oGGGGgggggddo",
    " oggnnnnnnndo",
    "   oonnnnnoo",
]

LEAF_R = [
    "ooooo",
    "oGGGGGooo",
    "ogGGGGGGGo",
    "oddgggggGGo",
    "odnnnnnngo",
    "  oonnnnoo",
]

LEAF_R_REACH = [
    "ooooo",
    "oGGGGGooo",
    "ogGGGGGGGGo",
    "oddgggggGGGGo",
    "odnnnnnnnggo",
    "  oonnnnnoo",
]

STEM = [
    "odgdo",
    "odgdo",
    " ooo ",
]

SPRITE = {
    "herbId": "arctium-lappa",
    "personality": "eager",
    "size": (32, 28),
    "frames": 14,
    "fps": 10,
    "parts": [
        {"name": "stem", "origin": (14, 23), "rows": STEM},
        {
            "name": "leafL",
            "origin": (0, 18),
            "rows": LEAF_L,
            "variants": {"reach": LEAF_L_REACH},
        },
        {
            "name": "leafR",
            "origin": (21, 18),
            "rows": LEAF_R,
            "variants": {"reach": LEAF_R_REACH},
        },
        {
            "name": "burr",
            "origin": (5, 3),
            "rows": BURR,
            "variants": {"left": BURR_LEFT, "right": BURR_RIGHT, "flare": BURR_FLARE},
        },
        {"name": "hooks", "origin": (9, 5), "rows": HOOKS},
        {
            "name": "eyes",
            "origin": (13, 11),
            "rows": EYES_OPEN,
            "variants": {"blink": EYES_CLOSED, "happy": EYES_HAPPY, "wide": EYES_WIDE},
        },
        {"name": "cheeks", "origin": (13, 14), "rows": CHEEKS},
        {
            "name": "mouth",
            "origin": (14, 15),
            "rows": MOUTH_SMILE,
            "variants": {"grin": MOUTH_GRIN},
        },
    ],
    #
    #  0    1     2      3      4      5      6     7     8     9    10   11   12   13
    # rest notice REACH  REACH  GRAB!  GRAB!  hold back wiggle wiggle wiggle rest blink rest
    #
    # The grab is frames 2-7 and it is this sprite's trademark: it leans right out with
    # both leaves reaching and the hooks flared, then settles back with a pleased little
    # wiggle. Frame 0 is the rest pose reduced motion freezes on.
    "motion": {
        # Forward and DOWN: burrs catch you at knee height, so the reach goes low rather
        # than rearing up. This is also what keeps it from reading as the nettle's lunge.
        "burr": {
            "art": [None, None, "flare", "flare", "flare", "flare", "flare", None,
                    "right", "left", "right", None, None, None],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 1, -1, 1, 0, 0, 0],
            "dy": [0, -1, 0, 1, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0],
        },
        "hooks": {
            "dx": [0, 0, -1, -1, -1, 1, 1, 0, 1, -1, 1, 0, 0, 0],
            "dy": [0, -1, 0, 1, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, "wide", "wide", "wide", "wide", "wide", "wide", None,
                    "happy", "happy", "happy", None, "blink", None],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 3, -3, 3, 0, 0, 0],
            "dy": [0, -1, 0, 1, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 3, -3, 3, 0, 0, 0],
            "dy": [0, -1, 0, 1, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0],
        },
        # Grinning through the whole attempt. It is not sorry.
        "mouth": {
            "art": [None, None, "grin", "grin", "grin", "grin", "grin", "grin",
                    None, None, None, None, None, None],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 3, -3, 3, 0, 0, 0],
            "dy": [0, -1, 0, 1, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0],
        },
        # Both leaves reach TOGETHER and stay out - this is a grab, and a grab is the one
        # gesture where symmetry is the point.
        "leafL": {
            "art": [None, None, "reach", "reach", "reach", "reach", "reach", None,
                    None, None, None, None, None, None],
            "dx": [0, 0, -1, -2, -3, -3, -3, -1, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        },
        "leafR": {
            "art": [None, None, "reach", "reach", "reach", "reach", "reach", None,
                    None, None, None, None, None, None],
            "dx": [0, 0, 1, 2, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        },
    },
    "palette": PALETTE,
}
