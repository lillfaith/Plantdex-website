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

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "G": (150, 198, 122, 255),   # leaf highlight
    "g": (106, 156, 92, 255),    # leaf mid
    "d": (72, 114, 68, 255),     # leaf deep
    "n": (50, 84, 52, 255),      # leaf shadow
    "V": (198, 176, 232, 255),   # floret highlight
    "v": (152, 126, 196, 255),   # floret mid
    "q": (110, 88, 152, 255),    # floret deep
    "Q": (78, 60, 110, 255),     # floret shadow
    "S": (232, 244, 214, 255),   # the mend - a pale green flash, once, on one frame
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
# It looks down at the notch while it mends it, so the features carry the head's offset
# plus the measured distance the face slides inside a turned head.
TURN_L = face_shift(HEAD, HEAD_LEFT)[0]
FACE_DX = [0, 0, TURN_L, TURN_L, TURN_L, TURN_L, 0, 0, 0, 0, 0, 0, 0, 0]

SPRITE = {
    "herbId": "prunella-vulgaris",
    "personality": "quietly capable",
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
