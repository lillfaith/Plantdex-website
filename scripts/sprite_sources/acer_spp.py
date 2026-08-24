"""Maple (Acer spp.) - creature portrait sprite.

THE DESIGN HOOK: the samara. Maple seeds are winged and they autorotate - a single blade
spinning like a rotor, slowing the fall so the wind gets time to carry the seed away from
the parent. Children call them helicopters and throw them in the air specifically to
watch. It is the single most animated thing any plant in this deck does, and this sprite
would be wasting its species not to use it.

WHERE THE FACE GOES: in the lobed leaf, which is on a flag and would be recognised by
almost anyone.

PERSONALITY: generous, and a bit pleased with the trick. Its trademark gesture is THE
DROP - it holds a samara out, lets go, and the seed spins away down and out of frame
while the tree watches it go. It is the only sprite that releases something and then
looks at where it went.

Deliberately not the jewelweed's pop, though both send something out of frame: jewelweed
detonates and startles itself, and this one lets go on purpose and enjoys the result.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

import math

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "G": (150, 200, 118, 255),   # leaf highlight
    "g": (106, 158, 90, 255),    # leaf mid
    "d": (72, 116, 66, 255),     # leaf deep
    "n": (50, 84, 50, 255),      # leaf shadow
    "S": (214, 186, 132, 255),   # samara wing
    "s": (170, 138, 96, 255),    # samara seed
    "t": (146, 106, 74, 255),    # twig and petiole
    "T": (180, 138, 100, 255),   # petiole light
}

HEAD_W, HEAD_H = 21, 18


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    """The maple leaf, which is the whole point of this species.

    Five lobes cut deep, with ONE OF THEM POINTING STRAIGHT UP - that is what `phase`
    buys, and it is the entire difference between a maple leaf and a lumpy circle. The
    amplitude is the highest in the deck bar the bee balm: shallower and the sinuses
    close up into a plain round leaf, deeper and the lobes separate from each other.
    """
    return flower_head(
        HEAD_W, HEAD_H, 10.0, 8.5, 9.4, 8.2, 5, 0.38, 5.0, 4.2,
        face_dx=face_dx, phase=-math.pi / 2, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))

# The samara, through one rotation. Four poses: blade out one way, edge-on, out the other
# way, edge-on again. Cycling them IS the autorotation - a spinning object at this size
# is four drawings, not a transform, and the edge-on frames are what sell it.
SAMARA_A = [
    "oSSSo",
    "oSSSSo",
    " osso",
]

SAMARA_B = [
    " oSo",
    " oSo",
    " oso",
]

SAMARA_C = [
    "  oSSSo",
    " oSSSSo",
    " osso",
]

SAMARA_D = [
    " oo",
    " oSo",
    " oso",
]

SAMARA_NONE = [
    " ",
]

# The paired samaras still attached, hanging in their V. A maple carries them in twos, and
# the V between the two wings is as recognisable as the leaf.
PAIR = [
    " oo   oo ",
    "oSSo oSSo",
    "oSSSoSSSo",
    " oSSoSSo",
    "  ososo",
    "   ooo",
]

PAIR_ONE = [
    "      oo ",
    "     oSSo",
    "   ooSSSo",
    "   osSSo",
    "   ooso",
    "   ooo",
]

# The petiole and the twig it joins. The petiole shows THROUGH the sinus between the two
# lower lobes, which is exactly where a real leaf stalk enters - and it is what stops the
# leaf floating above a stick it has no visible connection to.
STALK = [
    "otTto",
    "otTto",
    "otTto",
    "otTto",
    "otTto",
    "otTto",
    "otTto",
    "otTto",
    "otTto",
    " ooo ",
]

# The side twig the samaras hang from, branching off the petiole.
TWIG = [
    "ootto",
    "  oottoo",
    "     ootto",
    "        oto",
]


HEAD_AT = (5, 1)
TURN_L = face_shift(HEAD, HEAD_LEFT)[0]
TURN_R = face_shift(HEAD, HEAD_RIGHT)[0]
HEAD_DX = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
# It watches the samara go: turned toward it for as long as the seed is in the air.
TURN = [0, 0, TURN_R, TURN_R, TURN_R, TURN_R, TURN_R, TURN_R, TURN_R, TURN_R, 0, 0, 0, 0]
FACE_DX = [h + t for h, t in zip(HEAD_DX, TURN)]

SPRITE = {
    "herbId": "acer-spp",
    "personality": "generous",
    "size": (32, 28),
    "frames": 14,
    "fps": 10,
    "parts": [
        {"name": "stalk", "origin": (14, 13), "rows": STALK},
        {"name": "twig", "origin": (16, 17), "rows": TWIG},
        {
            "name": "pair",
            "origin": (21, 20),
            "rows": PAIR,
            "variants": {"one": PAIR_ONE},
        },
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(HEAD_AT, HEAD, eyes="round", mouth="smile", eye_dy=1, mouth_dy=4),
        {
            "name": "samara",
            "origin": (24, 21),
            "rows": SAMARA_NONE,
            "variants": {"a": SAMARA_A, "b": SAMARA_B, "c": SAMARA_C, "d": SAMARA_D},
        },
    ],
    #
    #  0    1     2      3     4     5     6     7     8     9     10   11   12    13
    # rest hold  LET GO  spin  spin  spin  spin  spin  spin  gone  rest rest blink rest
    #
    # The drop is frames 2-9 and it is this sprite's trademark: eight frames of a seed
    # autorotating down and out of the frame while the tree turns to watch it. The four
    # samara poses cycle twice on the way down, which at 10fps is about five rotations a
    # second - fast enough to read as spinning rather than as flapping. Frame 0 is the
    # rest pose reduced motion freezes on: both samaras still on the twig.
    "motion": {
        "head": {
            "art": [None, None, "right", "right", "right", "right", "right", "right",
                    "right", "right", None, None, None, None],
            "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, "wide", "wide", None, None, None, None, None, "happy",
                    None, None, "blink", None],
            "dx": FACE_DX,
            "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {"dx": FACE_DX, "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
        "mouth": {
            "art": [None, None, None, "grin", "grin", "grin", "grin", "grin", "grin",
                    "grin", None, None, None, None],
            "dx": FACE_DX,
            "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        # One of the pair leaves; the other stays on the twig the whole time, which is
        # what makes the departure read as a departure.
        "pair": {
            "art": [None, None, "one", "one", "one", "one", "one", "one", "one",
                    "one", None, None, None, None],
        },
        # Four poses cycling, falling and drifting right. Real samaras drift; one that
        # fell straight down would look like a dropped stone.
        "samara": {
            "art": [None, None, "a", "b", "c", "d", "a", "b", "c", None, None, None,
                    None, None],
            "dx": [0, 0, 0, 1, 2, 3, 4, 5, 6, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 1, 2, 3, 4, 5, 6, 0, 0, 0, 0, 0],
        },
        "twig": {"lean": [0, 0, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
