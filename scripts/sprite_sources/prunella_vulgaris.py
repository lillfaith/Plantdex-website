"""Self-Heal (Prunella vulgaris) - creature portrait sprite.

THE DESIGN HOOK: the name is the claim. Self-heal, heal-all, woundwort, carpenter's herb
- every common name this plant has ever had is about closing a wound, and it has carried
them across Europe, Asia and North America for as long as anyone has been writing names
down. The card's Healing Traits section is the deck's own non-claim framing of exactly
that tradition, and this sprite illustrates the NAME, not a medical effect.

So the gesture is repair, performed on itself and on nothing else. That distinction is
deliberate and it is a safety decision as much as a design one: a sprite that healed
something else would be making a claim about what the plant does for people. This one
mends a notch in its own leaf, which is a drawing of a name.

WHERE THE FACE GOES: below the squat purple flower head, which is club-shaped and packed
with hooded florets - the field mark, and far too dense to hold a face.

PERSONALITY: quietly capable. Its trademark gesture is THE MEND - a chip in the edge of
its own leaf closes up, and it looks quite satisfied. It is the only sprite that repairs
damage, and the only one that starts its loop imperfect.

SAFETY: a portrait, never an identification aid, and specifically not a claim that this
plant heals anything. The card's Healing Traits heading and the disclaimer at /safety
are the reference; a pixel creature mending its own leaf is a pun on a name.
"""

from _face import FACE_PALETTE, face_box, face_shift, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks

PALETTE = {
    **FACE_PALETTE,
    "G": (101, 219, 158, 255),   # leaf highlight
    "g": (72, 176, 130, 255),    # leaf mid
    "d": (53, 129, 100, 255),     # leaf deep
    "n": (45, 89, 75, 255),      # leaf shadow
    "V": (195, 161, 247, 255),   # floret highlight
    "v": (147, 107, 215, 255),   # floret mid
    "q": (104, 70, 170, 255),    # floret deep
    "Q": (74, 46, 124, 255),     # floret shadow
    "S": (210, 249, 224, 255),   # the mend - a pale green flash, once, on one frame
}

HEAD_W, HEAD_H = 19, 15
CLUB_W, CLUB_H = 15, 11


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        HEAD_W, HEAD_H, 9.0, 7.0, 8.4, 6.6, 6, 0.12, 5.0, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


def _club():
    # Squat, blunt and faceless: a self-heal flower head is a short thick club of hooded
    # florets, quite unlike the long spikes elsewhere in this deck.
    return flower_head(
        CLUB_W, CLUB_H, 7.0, 5.0, 6.6, 4.8, 8, 0.13, 0, 0,
        light=(-0.85, -0.75), trim_tail=False, chars="VvqQFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))
CLUB = _club()

# The damaged leaf, and the same leaf whole. The notch is bitten out of the margin, which
# is what actually happens to a leaf, and it is deliberately visible in FRAME 0 - this is
# the only sprite in the deck whose resting pose is of something that needs mending.
LEAF_TORN = [
    "  ooooo",
    " oGGGGgo",
    "oGGgg  oo",
    " oggd   o",
    "  oddnno",
    "   oooo",
]

LEAF_MENDING = [
    "  ooooo",
    " oGGGGgo",
    "oGGgggSoo",
    " oggddSno",
    "  oddnno",
    "   oooo",
]

LEAF_WHOLE = [
    "  ooooo",
    " oGGGGgo",
    "oGGgggddo",
    " oggddnno",
    "  oddnno",
    "   oooo",
]

# The other leaf, undamaged throughout - the control, so the mend is visibly a change to
# one leaf rather than a change to the drawing.
LEAF_R = [
    "ooooo",
    "ogGGGGo",
    "oddggggo",
    "onnddggo",
    " onnddo",
    "  oooo",
]

STEM = [
    "ogdo",
    "ogdo",
    "ogdo",
    " oo ",
]

HEAD_AT = (6, 12)

# --- Growth stages -----------------------------------------------------------
#
# THE SAME QUIETLY CAPABLE SELF-HEAL, YOUNGER. Its trademark is mending a notch in its OWN
# leaf — a pun on the common name, never anybody else's leaf — and that stays with the open
# flower. A seedling carries the same bitten margin and cannot do anything about it yet,
# which is a better reason for the adult's trick to feel earned than any amount of size.
#
# THE BOTANY DECIDES WHAT IS DRAWN:
#
#   sprout    leaves only, no club. The bitten notch is already there.
#   growing   the club up and still GREEN. A self-heal club is a tight green cone of
#             bracts long before the hooded purple florets push out of it, so the middle
#             stage is the plant's own colour rather than a paler version of the last one.
#   flowering the purple club, unchanged.

BUD_PALETTE = {
    "K": (150, 206, 172, 255),   # closed club highlight — still leaf-green
    "k": (104, 160, 128, 255),   # closed club mid
    "j": (70, 116, 94, 255),     # closed club deep
    "J": (48, 82, 68, 255),      # closed club shadow
}

# --- Sprout: leaves only ----------------------------------------------------
YOUNG_HEAD_AT = (8, 13)


def _young_head(rx=6.6, ry=5.0, face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        15, 11, 7.0, 5.2, rx, ry, 6, 0.12, 5.2, 3.4,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.2, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.2, light=(-1.25, -0.65))

# The notch is bitten out of the margin from the very first leaf: this is the one sprite
# in the deck whose resting pose is of something that needs mending, and being too young
# to mend it is the point.
SEED_LEAF_TORN = [
    " oooooo",
    "oGGgo  o",
    "oGggo  o",
    " ondnnno",
]
SEED_LEAF_R = [
    "oooooo ",
    "ogGGGGo",
    "oddgggo",
    "onnnnno",
]
SEED_STEM = [
    "odgo",
    "odgo",
    "odgo",
    " oo ",
]

# --- Growing: the club up, still green --------------------------------------
BUD_CLUB_W, BUD_CLUB_H = 13, 9


def _bud_club():
    return flower_head(
        BUD_CLUB_W, BUD_CLUB_H, 6.0, 4.2, 5.6, 4.0, 8, 0.13, 0, 0,
        light=(-0.85, -0.75), trim_tail=False, chars="KkjJFo",
    )


BUD_CLUB = _bud_club()

BUD_HEAD_AT = (7, 13)


def _bud_head(rx=7.6, ry=5.8, face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        17, 13, 8.0, 6.2, rx, ry, 6, 0.12, 5.4, 3.8,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


BUD_HEAD = _bud_head()
BUD_HEAD_LEFT = _bud_head(face_dx=-1.4, light=(-0.35, -0.65))
BUD_HEAD_RIGHT = _bud_head(face_dx=1.4, light=(-1.25, -0.65))

BUD_LEAF_TORN = [
    "  oooooooo",
    " oGGGgo   o",
    "oGGgggo   o",
    " oondnnnnno",
]
BUD_LEAF_R = [
    "oooooooo",
    "ogGGGGGo",
    "oddggggo",
    "onnnnnno",
]

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(BUD_HEAD, BUD_HEAD_LEFT)
G_R_DX, _ = face_shift(BUD_HEAD, BUD_HEAD_RIGHT)

# It looks at the notch, and then away. That is the whole loop at this age: aware of the
# damage, not yet able to do anything about it.
S_BOB = [0, 0, -1, -1, -1, 0, 0, 0]
S_HEAD = [None, "left", "left", "left", None, "right", None, None]
S_DX = [0, S_L_DX, S_L_DX, S_L_DX, 0, S_R_DX, 0, 0]
S_BLINK = [None, None, None, None, None, None, "blink", None]

G_BOB = [0, 0, -1, -1, -1, -1, 0, 0, 0, 0]
G_HEAD = [None, "left", "left", None, None, None, "right", "right", None, None]
G_DX = [0, G_L_DX, G_L_DX, 0, 0, 0, G_R_DX, G_R_DX, 0, 0]
G_BLINK = [None] * 8 + ["blink", None]


# It looks down at the notch while it mends it, so the features carry the head's offset
# plus the measured distance the face slides inside a turned head.
TURN_L = face_shift(HEAD, HEAD_LEFT)[0]
FACE_DX = [0, 0, TURN_L, TURN_L, TURN_L, TURN_L, 0, 0, 0, 0, 0, 0, 0, 0]

SPRITE = {
    "herbId": "prunella-vulgaris",
    "personality": "quietly capable",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(8, "sprout"),
            # No club, and no mending: the trick belongs to the open flower.
            "hide": ["club", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "leafTorn": SEED_LEAF_TORN,
                "leafR": SEED_LEAF_R,
                "stem": SEED_STEM,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "stem": (14, 23),
                "leafTorn": (3, 20),
                "leafR": (20, 20),
                **seat_young(YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=2, mouth_dy=5),
            },
            "motion": {
                "head": {"dy": S_BOB, "art": S_HEAD},
                "eyes": {"dy": S_BOB, "dx": S_DX, "art": S_BLINK},
                "mouth": {"dy": S_BOB, "dx": S_DX},
                "leafTorn": {"dy": [0] * 8},
                "leafR": {"dy": [0] * 8},
                "stem": {"dy": [0] * 8},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(8, "growing"),
            "palette": BUD_PALETTE,
            "swap": {
                "club": BUD_CLUB,
                "head": BUD_HEAD,
                "leafTorn": BUD_LEAF_TORN,
                "leafR": BUD_LEAF_R,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
                "cheeks": young_cheeks(face_box(BUD_HEAD)[2]),
            },
            "variants": {
                "head": {"left": BUD_HEAD_LEFT, "right": BUD_HEAD_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"]},
            },
            "origins": {
                "club": (9, 8),
                "head": BUD_HEAD_AT,
                "stem": (14, 23),
                "leafTorn": (1, 20),
                "leafR": (22, 20),
                **seat_young(BUD_HEAD_AT, BUD_HEAD, eye_dy=2, mouth_dy=5),
            },
            "motion": {
                "club": {"dy": G_BOB},
                "head": {"dy": G_BOB, "art": G_HEAD},
                "eyes": {"dy": G_BOB, "dx": G_DX, "art": G_BLINK},
                "cheeks": {"dy": G_BOB, "dx": G_DX},
                "mouth": {"dy": G_BOB, "dx": G_DX},
                "leafTorn": {"dy": [0] * 10},
                "leafR": {"dy": [0] * 10},
                "stem": {"dy": [0] * 10},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "stem", "origin": (14, 23), "rows": STEM},
        {"name": "club", "origin": (8, 3), "rows": CLUB},
        {
            "name": "leafTorn",
            "origin": (0, 19),
            "rows": LEAF_TORN,
            "variants": {"mending": LEAF_MENDING, "whole": LEAF_WHOLE},
        },
        {"name": "leafR", "origin": (23, 19), "rows": LEAF_R},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(HEAD_AT, HEAD, eyes="round", mouth="smile", eye_dy=1, mouth_dy=4),
    ],
    #
    #  0     1      2     3      4      5      6     7     8     9    10   11   12    13
    # torn  notice  look  MEND   MEND  whole  whole whole whole nod  nod  rest blink rest
    #
    # The mend is frames 3-5 and it is this sprite's trademark: two frames of a pale
    # green closing over the notch, and then the leaf is simply whole and STAYS whole for
    # the rest of the loop. Re-tearing it inside the loop would turn a repair into a
    # flicker. Frame 0 is the rest pose reduced motion freezes on - notched, because this
    # sprite's still image should be the one that has something to fix.
    "motion": {
        "head": {
            "art": [None, None, "left", "left", "left", "left", None, None, None,
                    None, None, None, None, None],
            "dy": [0, -1, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, "wide", "wide", "wide", "wide", None, "happy", "happy",
                    None, None, None, None, "blink", None],
            "dx": FACE_DX,
            "dy": [0, -1, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": FACE_DX,
            "dy": [0, -1, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, None, None, None, None, "grin", "grin", "grin",
                    "grin", None, None, None, None],
            "dx": FACE_DX,
            "dy": [0, -1, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0],
        },
        "leafTorn": {
            "art": [None, None, None, "mending", "mending", "whole", "whole", "whole",
                    "whole", "whole", "whole", "whole", "whole", None],
        },
        "club": {"dy": [0, -1, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
