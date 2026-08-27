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

from _face import face_shift
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

# Authored at 32x28, the house size.
PALETTE = {
    "o": (74, 48, 92, 255),      # outline
    "B": (215, 178, 205, 255),   # burr highlight - the dusty mauve of a ripe head
    "b": (184, 125, 173, 255),   # burr mid
    "u": (153, 84, 145, 255),    # burr deep
    "U": (94, 50, 91, 255),      # burr shadow
    "k": (229, 199, 224, 255),   # hook tips, paler than the burr so they catch the eye
    "F": (246, 234, 244, 255),   # face
    "E": (86, 58, 104, 255),     # eye
    "W": (255, 255, 255, 255),   # eye glint
    "c": (238, 164, 184, 255),   # cheek
    "G": (125, 212, 171, 255),   # leaf highlight
    "g": (92, 179, 144, 255),     # leaf mid
    "d": (70, 139, 116, 255),     # leaf deep
    "n": (46, 76, 69, 255),      # leaf shadow
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

# --- Growth stages -----------------------------------------------------------
#
# THE FOURTH BIENNIAL, and the most dramatic of them. A first-year burdock is an enormous
# flat rosette of the broadest leaves in this deck and NOT ONE BURR — the whole structure
# this creature is built out of belongs to year two. So:
#
#   sprout    the first-year rosette. The face moves onto a leaf, because the head IS the
#             burr and there is no burr. It reaches, both leaves out, and has nothing to
#             catch you with — an eager plant with no hooks is just a plant leaning at you.
#   growing   the burr, GREEN, hooks already formed and the purple florets not out. A
#             green burr is soft: the hooks are there, they simply do not hold yet. So it
#             flares them and the flare is smaller, and there is no wiggle afterwards
#             because nothing was achieved.
#   flowering the full grab, the hooks flared hard, and the pleased little wiggle at
#             having tried. Unchanged.
#
# THE HOOKS ARE THE POINT OF THE SPECIES — this is the plant Velcro was copied from — so
# they are drawn from the moment there is a burr to put them on, and never before it.

LEAF_HEAD_PALETTE = {
    "n": (46, 76, 69, 255),   # already in the adult palette; named here for the swap
}

BURR_PALETTE = {
    "K": (182, 210, 150, 255),   # green burr highlight — no purple until it opens
    "N": (138, 172, 112, 255),   # green burr mid
    "j": (98, 128, 82, 255),     # green burr deep
    "J": (66, 92, 60, 255),      # green burr shadow
    "k": (216, 232, 186, 255),   # hook tips, pale against green instead of against mauve
}

# --- Sprout: the first-year rosette, no burr --------------------------------
YOUNG_HEAD_AT = (8, 12)


def _young_head(face_dx=0.0, light=(-0.85, -0.65)):
    # A burdock leaf: broad, heart-shaped and wavy-margined rather than lobed. It is the
    # biggest single leaf in the deck and the rosette is nothing but these.
    return flower_head(
        17, 13, 8.0, 6.2, 8.0, 6.0, 5, 0.12, 5.4, 3.8,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.4, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.4, light=(-1.25, -0.65))

# --- Growing: the burr, green ------------------------------------------------
MID_BURR_AT = (7, 8)


def _mid_burr(face_dx=0.0, light=(-0.85, -0.65), amp=0.13):
    return flower_head(
        19, 16, 9.0, 7.8, 8.4, 7.6, 10, amp, 5.4, 4.2,
        face_dx=face_dx, light=light, trim_tail=False, chars="KNjJFo",
    )


MID_BURR = _mid_burr()
MID_BURR_LEFT = _mid_burr(face_dx=-1.5, light=(-0.35, -0.65))
MID_BURR_RIGHT = _mid_burr(face_dx=1.5, light=(-1.25, -0.65))
# A smaller flare than the adult's 0.30, and from a shallower rest. A green burr's hooks
# are soft: they open, and they do not hold.
MID_BURR_FLARE = _mid_burr(amp=0.22)

HOOKS_MID = [
    "k  k   k  k",
    "k         k",
    " k       k",
]

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(MID_BURR, MID_BURR_LEFT)
G_R_DX, _ = face_shift(MID_BURR, MID_BURR_RIGHT)

SPRITE = {
    "herbId": "arctium-lappa",
    "personality": "eager",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(10, "sprout"),
            "palette": LEAF_HEAD_PALETTE,
            "hide": ["hooks", "cheeks"],
            "swap": {
                "burr": YOUNG_HEAD,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "burr": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "wide": YOUNG_EYES["wide"],
                    "happy": YOUNG_EYES["happy"],
                },
                "mouth": {"wide": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "burr": YOUNG_HEAD_AT,
                "leafL": (1, 19),
                "leafR": (22, 19),
                "stem": (14, 23),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=2, mouth_dy=4
                ),
            },
            # The lean, with both leaves out, and nothing on the end of it. It is the
            # grab as pure enthusiasm — which is what a first-year burdock is.
            "motion": {
                "burr": {
                    "art": [None, None, "right", "right", None, "left", None, None],
                    "dy": [0, -1, 0, 1, 1, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, "wide", "wide", "wide", "wide", None, "blink", None],
                    "dx": [0, 0, S_R_DX, S_R_DX, 0, S_L_DX, 0, 0],
                    "dy": [0, -1, 0, 1, 1, 0, 0, 0],
                },
                "mouth": {
                    "art": [None, None, "wide", "wide", "wide", None, None, None],
                    "dx": [0, 0, S_R_DX, S_R_DX, 0, S_L_DX, 0, 0],
                    "dy": [0, -1, 0, 1, 1, 0, 0, 0],
                },
                "leafL": {
                    "art": [None, None, "reach", "reach", "reach", None, None, None],
                    "dx": [0, 0, -1, -2, -2, -1, 0, 0],
                    "dy": [0, 0, 0, 1, 1, 0, 0, 0],
                },
                "leafR": {
                    "art": [None, None, "reach", "reach", "reach", None, None, None],
                    "dx": [0, 0, 1, 2, 2, 1, 0, 0],
                    "dy": [0, 0, 0, 1, 1, 0, 0, 0],
                },
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(10, "growing"),
            "palette": BURR_PALETTE,
            "hide": ["cheeks"],
            "swap": {
                "burr": MID_BURR,
                "hooks": HOOKS_MID,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "burr": {
                    "left": MID_BURR_LEFT,
                    "right": MID_BURR_RIGHT,
                    "flare": MID_BURR_FLARE,
                },
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "wide": YOUNG_EYES["wide"],
                    "happy": YOUNG_EYES["happy"],
                },
                "mouth": {"wide": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "burr": MID_BURR_AT,
                "hooks": (11, 10),
                "leafL": (0, 18),
                "leafR": (21, 18),
                "stem": (14, 23),
                **seat_young(
                    MID_BURR_AT, MID_BURR, cheeks=False, eye_dy=2, mouth_dy=4
                ),
            },
            # The grab, and no wiggle after it. The wiggle is delight at having tried and
            # very nearly managed it; a green burr does not get to feel that yet.
            "motion": {
                "burr": {
                    "art": [None, None, "flare", "flare", "flare", "flare", None, None,
                            None, None],
                    "dy": [0, -1, 0, 1, 2, 2, 1, 0, 0, 0],
                },
                "hooks": {
                    "dx": [0, 0, -1, -1, -1, 1, 0, 0, 0, 0],
                    "dy": [0, -1, 0, 1, 2, 2, 1, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, "wide", "wide", "wide", "wide", "wide", None, "happy",
                            "blink", None],
                    "dy": [0, -1, 0, 1, 2, 2, 1, 0, 0, 0],
                },
                "mouth": {
                    "art": [None, None, "wide", "wide", "wide", "wide", "wide", None,
                            None, None],
                    "dy": [0, -1, 0, 1, 2, 2, 1, 0, 0, 0],
                },
                "leafL": {
                    "art": [None, None, "reach", "reach", "reach", "reach", None, None,
                            None, None],
                    "dx": [0, 0, -1, -2, -2, -2, -1, 0, 0, 0],
                    "dy": [0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
                },
                "leafR": {
                    "art": [None, None, "reach", "reach", "reach", "reach", None, None,
                            None, None],
                    "dx": [0, 0, 1, 2, 2, 2, 1, 0, 0, 0],
                    "dy": [0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
                },
            },
        },
    },
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
