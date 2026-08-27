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

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

PALETTE = {
    **FACE_PALETTE,
    "G": (208, 236, 152, 255),   # leaflet highlight - wood sorrel is a fresh light green
    "g": (166, 199, 120, 255),   # leaflet mid
    "d": (125, 162, 85, 255),     # leaflet deep
    "n": (96, 128, 67, 255),      # leaflet shadow
    "Y": (244, 231, 179, 255),   # the small yellow flower
    "y": (228, 196, 113, 255),    # flower shade
    "t": (167, 191, 130, 255),   # leaf stalk
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

# --- Growth stages -----------------------------------------------------------
#
# THE FOLD, GROWING INTO ITSELF. Wood sorrel's trademark is that it goes away: the three
# leaflets drop straight down over the face and the creature is simply absent for three
# frames. That full disappearance stays with the adult, because it is the thing mastery
# buys — but the fold itself is not a trick the plant learns late. Seedlings do it too,
# less deeply, which is why the gesture DEEPENS rather than appearing from nowhere:
#
#   sprout    the leaflets tip half over and come straight back — two frames, and the
#             face is never covered. Nerve, not ability.
#   growing   they hold half-folded for four frames and the crown leaflet shuts on top,
#             which is as close to gone as it gets before it is grown.
#   flowering the whole fold, face and all. Unchanged.
#
# BOTANICALLY. Oxalis germinates with two small cotyledons and then puts up trifoliate
# leaves at once, so the sprout already has its three heart-shaped leaflets — that shape
# is the plant, and drawing anything else would be drawing a different species. What the
# sprout does NOT have is a flower, in any form: the adult's small yellow bloom is gone,
# not shrunk. The growing stage is in bud, and an oxalis bud is a narrow closed spindle
# held upright on its own pedicel, greenish with the yellow only just showing through —
# which is a different organ from the five-petalled star it opens into, not a smaller one.

BUD_PALETTE = {
    "K": (214, 220, 148, 255),   # bud highlight — the yellow only just showing through
    "k": (168, 184, 110, 255),   # bud mid
    "j": (120, 144, 80, 255),    # bud deep
    "J": (86, 108, 60, 255),     # bud shadow
}

# --- Sprout: three leaflets and nothing else --------------------------------
#
# The silhouette is the adult's, squashed: crown leaflet on top, the two side leaflets
# just below it, and the face on the body beneath them with the leaflets' lower edge
# landing one row above it — exactly the spacing the adult has, which is what stops the
# fold reading as leaves floating past a head rather than closing over it.
YOUNG_HEAD_AT = (9, 17)


def _young_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        14, 9, 6.5, 4.2, 6.6, 4.2, 5, 0.10, 5.0, 2.9,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.2, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.2, light=(-1.25, -0.65))

# The two side leaflets, notched at the tip. The notch is the field mark people use to
# rule out clover, so it survives all the way down to the smallest drawing.
TRIFOIL_YOUNG = [
    " ooo   ooo",
    "oGoGo oGoGo",
    "oGGGGoGGGGo",
    " oggdodddgo",
    "  ooo ooo",
]

TRIFOIL_YOUNG_HALF = [
    "  oo oo",
    " oGGoGGo",
    " oggoddo",
    "  oo oo",
]

CROWN_YOUNG = [
    " ooo",
    "oGoGo",
    "oGGGo",
    " odo",
]

CROWN_YOUNG_SHUT = [
    " oo",
    "odGo",
    "odgo",
    " oo",
]

# --- Growing: in bud --------------------------------------------------------
BUD_HEAD_AT = (9, 14)


def _bud_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        15, 12, 7.0, 5.6, 6.8, 5.6, 5, 0.10, 5.4, 3.4,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


BUD_HEAD = _bud_head()
BUD_HEAD_LEFT = _bud_head(face_dx=-1.2, light=(-0.35, -0.65))
BUD_HEAD_RIGHT = _bud_head(face_dx=1.2, light=(-1.25, -0.65))

TRIFOIL_MID = [
    "  ooo   ooo  ",
    " oGoGo oGoGo ",
    "oGGGGGoGGGGGo",
    " oggddoddggo ",
    "  oddoodddo  ",
    "   ooo ooo   ",
]

# A closed spindle on its own pedicel — upright, narrow, and nothing like the open star.
BUD_CLOSED = [
    "  oo  ",
    " oKko ",
    " okjo ",
    " oJjo ",
    "  oo  ",
    "  oto ",
    " oto  ",
    " oo   ",
]

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(BUD_HEAD, BUD_HEAD_LEFT)
G_R_DX, _ = face_shift(BUD_HEAD, BUD_HEAD_RIGHT)

S_BOB = [0, 1, 0, 0, 0, 0, 0, 0]
S_DX = [0, S_R_DX, 0, 0, 0, S_L_DX, 0, 0]

G_BOB = [0, 1, 0, 0, 0, 0, 0, 0, 0, 0]
G_DX = [0, G_R_DX, 0, 0, 0, 0, 0, G_L_DX, 0, 0]

SPRITE = {
    "herbId": "oxalis-stricta",
    "personality": "private",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(8, "sprout"),
            # No flower of any kind, and no stem worth drawing: a seedling's leaflets sit
            # on a petiole the head itself already covers.
            "hide": ["flower", "stems", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "trifoil": TRIFOIL_YOUNG,
                "crown": CROWN_YOUNG,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "trifoil": {"half": TRIFOIL_YOUNG_HALF},
                "crown": {"shut": CROWN_YOUNG_SHUT},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                },
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "trifoil": (10, 15),
                "crown": (13, 13),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=1, mouth_dy=3
                ),
            },
            "motion": {
                "head": {
                    "dy": S_BOB,
                    "art": [None, "right", None, None, None, "left", None, None],
                },
                "trifoil": {
                    "art": [None, None, "half", "half", None, None, None, None],
                    "dx": [0, 0, 1, 1, 0, 0, 0, 0],
                    "dy": [0, 0, 1, 2, 0, 0, 0, 0],
                },
                "crown": {
                    "art": [None, None, None, "shut", None, None, None, None],
                    "dx": [0, 0, 0, 1, 0, 0, 0, 0],
                    "dy": [0, -1, 0, 2, 0, 0, 0, 0],
                },
                "eyes": {
                    "dy": S_BOB,
                    "dx": S_DX,
                    "art": [None, None, "half", "half", None, None, "blink", None],
                },
                "mouth": {"dy": S_BOB, "dx": S_DX},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(8, "growing"),
            "palette": BUD_PALETTE,
            "hide": ["cheeks"],
            "swap": {
                "head": BUD_HEAD,
                "trifoil": TRIFOIL_MID,
                "flower": BUD_CLOSED,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": BUD_HEAD_LEFT, "right": BUD_HEAD_RIGHT},
                # The adult's own half-fold fits here: it is the same two leaflets tipped
                # edge-on, and at this stage that is as far as the fold goes.
                "trifoil": {"half": TRIFOIL_HALF},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                },
            },
            "origins": {
                "head": BUD_HEAD_AT,
                "trifoil": (9, 12),
                "crown": (12, 9),
                "flower": (20, 12),
                "stems": (12, 22),
                **seat_young(
                    BUD_HEAD_AT, BUD_HEAD, cheeks=False, eye_dy=1, mouth_dy=3
                ),
            },
            "motion": {
                "head": {
                    "dy": G_BOB,
                    "art": [None, "right", None, None, None, None, None, "left",
                            None, None],
                },
                "trifoil": {
                    "art": [None, None, "half", "half", "half", "half", "half", None,
                            None, None],
                    "dx": [0, 0, 1, 2, 2, 2, 1, 0, 0, 0],
                    "dy": [0, 0, 1, 2, 3, 3, 2, 1, 0, 0],
                },
                "crown": {
                    "art": [None, None, None, "shut", "shut", "shut", "shut", None,
                            None, None],
                    "dx": [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
                    "dy": [0, -1, 0, 2, 3, 3, 2, 0, 0, 0],
                },
                # The bud nods with the leaves. It does not open — that is the next stage.
                "flower": {"dy": [0, 0, 0, 1, 1, 1, 1, 0, 0, 0]},
                "eyes": {
                    "dy": G_BOB,
                    "dx": G_DX,
                    "art": [None, None, None, "half", "half", "half", "half", None,
                            "blink", None],
                },
                "mouth": {"dy": G_BOB, "dx": G_DX},
                "stems": {"lean": [0, 0, 0, -1, -1, -1, -1, 0, 0, 0]},
            },
        },
    },
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
