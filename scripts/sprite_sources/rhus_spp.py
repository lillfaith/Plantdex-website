"""Sumac (Rhus spp.) - creature portrait sprite.

THE DESIGN HOOK: staghorn sumac carries its fruit in a dense upright cone of deep red
drupes, furred all over, held straight up above the leaves like a torch - and it stays
there all winter after the leaves have gone. Those drupes are what sumac lemonade is
made from, and the colour is the most saturated red anywhere in this deck.

WHERE THE FACE GOES: in the leafy crown below the cone, so the cone can be held ABOVE
it. Nothing else in the set holds a prop over its own head.

PERSONALITY: proud. Its trademark gesture is THE TORCH - it raises the red cone straight
up, and the cone brightens: a second, hotter red that appears nowhere else in the loop
and nowhere else in the deck. It is the only sprite that lights up.

Deliberately not the mullein's rise, though both go upward: the mullein straightens
itself, and this one lifts something and shows it to you.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "R": (226, 112, 96, 255),    # drupe highlight
    "r": (188, 70, 62, 255),     # drupe mid
    "u": (140, 46, 46, 255),     # drupe deep
    "U": (98, 34, 38, 255),      # drupe shadow
    "B": (255, 176, 132, 255),   # the hotter red of the raised torch - this loop only
    "b": (240, 122, 88, 255),    # torch mid
    "G": (152, 196, 116, 255),   # leaf highlight
    "g": (108, 152, 88, 255),    # leaf mid
    "d": (74, 112, 66, 255),     # leaf deep
    "n": (52, 82, 52, 255),      # leaf shadow
    "t": (150, 108, 78, 255),    # the furred stem staghorn sumac is named for
}

HEAD_W, HEAD_H = 19, 15
CONE_W, CONE_H = 11, 13


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        HEAD_W, HEAD_H, 9.0, 7.0, 8.4, 6.6, 7, 0.13, 5.0, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


def _cone(chars="RruUFo"):
    # Tall, narrow, and faceless: an upright cone of drupes held above the head. Many
    # shallow lobes give it the furred texture the species is named for.
    return flower_head(
        CONE_W, CONE_H, 5.0, 7.0, 4.6, 6.4, 11, 0.16, 0, 0,
        light=(-0.85, -0.85), trim_tail=False, chars=chars,
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))
CONE = _cone()
# The lit torch. Same shape, hotter palette - which is the entire gesture, and the reason
# the two extra reds exist in this species and nowhere else.
CONE_LIT = _cone(chars="BbRrFo")

# The compound leaf: many paired leaflets down a rachis, which is what a sumac leaf is
# and is quite unlike the single blades most of this deck carries.
FROND_L = [
    "  oo oo oo",
    " oGGoGGoGGo",
    "oGgggggggggo",
    " odddddddddo",
    "  oo oo ooo",
]

FROND_R = [
    "oo oo oo",
    "oGGoGGoGGo",
    "oggggggggGo",
    "oddddddddo",
    "oo oo oo",
]

STEM = [
    "otto",
    "otto",
    "otto",
    " oo ",
]

HEAD_AT = (6, 11)
TURN_L = face_shift(HEAD, HEAD_LEFT)[0]
TURN_R = face_shift(HEAD, HEAD_RIGHT)[0]
FACE_DX = [0, 0, 0, 0, 0, 0, 0, 0, 0, TURN_R, TURN_R, 0, 0, 0]

SPRITE = {
    "herbId": "rhus-spp",
    "personality": "proud",
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "stem", "origin": (14, 22), "rows": STEM},
        {"name": "frondL", "origin": (0, 17), "rows": FROND_L},
        {"name": "frondR", "origin": (21, 17), "rows": FROND_R},
        {
            "name": "cone",
            "origin": (11, 1),
            "rows": CONE,
            "variants": {"lit": CONE_LIT},
        },
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(HEAD_AT, HEAD, eyes="round", mouth="beam", eye_dy=1, mouth_dy=4),
    ],
    #
    #  0    1     2      3      4     5     6     7     8     9     10   11   12    13
    # rest gather RAISE  RAISE  LIT   LIT   LIT   LIT  lower lower  rest rest blink rest
    #
    # The torch is frames 2-7 and it is this sprite's trademark: the cone goes up and
    # then BRIGHTENS, into two reds that appear in no other frame of this loop and on no
    # other card. Colour is doing the work an animation usually does, which is why the
    # gesture itself is only four pixels of movement. Frame 0 is the rest pose reduced
    # motion freezes on: torch carried, not raised.
    "motion": {
        # Up four pixels and held. A torch raised any further would leave the frame, and
        # one raised any faster would read as thrown.
        "cone": {
            "art": [None, None, None, None, "lit", "lit", "lit", "lit", None, None,
                    None, None, None, None],
            "dy": [0, 1, -1, -3, -4, -4, -4, -4, -2, 0, 0, 0, 0, 0],
        },
        "head": {
            "art": [None, None, None, None, None, None, None, None, None, "right",
                    None, None, None, None],
            "dy": [0, 1, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, "half", None, "wide", "wide", "wide", "wide", "wide",
                    None, "happy", None, None, "blink", None],
            "dx": FACE_DX,
            "dy": [0, 1, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {"dx": FACE_DX, "dy": [0, 1, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0]},
        "mouth": {
            "art": [None, None, None, "open", "open", "open", "open", "open", None,
                    None, None, None, None, None],
            "dx": FACE_DX,
            "dy": [0, 1, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        # The fronds spread as the torch goes up - the whole plant opening out under it.
        "frondL": {"dx": [0, 0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0]},
        "frondR": {"dx": [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
