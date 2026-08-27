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
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

PALETTE = {
    **FACE_PALETTE,
    "G": (95, 223, 119, 255),   # leaf highlight
    "g": (71, 177, 98, 255),    # leaf mid
    "d": (52, 130, 76, 255),     # leaf deep
    "n": (45, 89, 61, 255),      # leaf shadow
    "S": (229, 191, 117, 255),   # samara wing
    "s": (190, 141, 76, 255),    # samara seed
    "t": (166, 104, 54, 255),    # twig and petiole
    "T": (202, 137, 78, 255),   # petiole light
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

# --- Growth stages -----------------------------------------------------------
#
# AN UNRIPE SAMARA DOES NOT LET GO, and that single fact writes the whole ladder. Maple
# keys hang green and soft on the twig for weeks; they only detach once they have dried.
# So the drop — this sprite's trademark, and the most animated thing any plant in the deck
# does — is gated on ripeness rather than on having a wing to spin.
#
#   sprout    one small lobed leaf on a short petiole. A maple is years from fruiting, so
#             there are no keys at all, and the gesture simply has nothing to release.
#   growing   the paired keys are there and GREEN, still joined at the twig. It holds one
#             out, and it does not let go, because it cannot: the wing is not dry.
#   flowering the drop, eight frames of autorotation, and the tree watching it go.
#             Unchanged.
#
# The lobes stay cut deep at every stage, with one pointing straight up. That silhouette
# is the most widely recognised leaf outline in the deck — it is on a flag — so it is the
# last property that would ever be softened for the sake of a smaller drawing.

SAMARA_PALETTE = {
    "K": (162, 206, 124, 255),   # green wing — a key before it dries to the adult's tan
    "k": (110, 152, 86, 255),    # green seed
}

# --- Sprout: one leaf, and nothing to give away -----------------------------
YOUNG_HEAD_AT = (9, 11)


def _young_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        16, 12, 7.5, 5.6, 7.2, 5.6, 5, 0.34, 5.4, 3.4,
        face_dx=face_dx, phase=-math.pi / 2, light=light, trim_tail=False,
        chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.3, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.3, light=(-1.25, -0.65))

STALK_SHORT = [
    "otTto",
    "otTto",
    "otTto",
    " ooo ",
]

# --- Growing: the keys on the twig, still green -----------------------------
MID_HEAD_AT = (7, 6)


def _mid_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        19, 15, 9.0, 7.2, 8.6, 7.0, 5, 0.36, 5.4, 4.0,
        face_dx=face_dx, phase=-math.pi / 2, light=light, trim_tail=False,
        chars="GgdnFo",
    )


MID_HEAD = _mid_head()
MID_HEAD_LEFT = _mid_head(face_dx=-1.4, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_head(face_dx=1.4, light=(-1.25, -0.65))

# The V of paired keys, green and joined. Same shape as the adult's, and that is the
# point: what changes between the stages is the colour and whether one of them leaves.
PAIR_GREEN = [
    " oo   oo ",
    "oKKo oKKo",
    "oKKKoKKKo",
    " oKKoKKo",
    "  okoko",
    "   ooo",
]

STALK_MID = [
    "otTto",
    "otTto",
    "otTto",
    "otTto",
    "otTto",
    "otTto",
    " ooo ",
]

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(MID_HEAD, MID_HEAD_LEFT)
G_R_DX, _ = face_shift(MID_HEAD, MID_HEAD_RIGHT)

SPRITE = {
    "herbId": "acer-spp",
    "personality": "generous",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(10, "sprout"),
            "hide": ["pair", "samara", "twig", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "stalk": STALK_SHORT,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"], "happy": YOUNG_EYES["happy"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "stalk": (14, 22),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=1, mouth_dy=3
                ),
            },
            # It looks where the keys would be, and there is nothing there. That is the
            # whole loop, and it is honest: a maple this young has years to wait.
            "motion": {
                "head": {
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0],
                    "art": [None, None, "right", "right", None, "left", None, None],
                },
                "eyes": {
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0],
                    "dx": [0, 0, S_R_DX, S_R_DX, 0, S_L_DX, 0, 0],
                    "art": [None, None, None, None, None, None, "blink", None],
                },
                "mouth": {
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0],
                    "dx": [0, 0, S_R_DX, S_R_DX, 0, S_L_DX, 0, 0],
                },
                "stalk": {"lean": [0, 0, 1, 1, 0, -1, 0, 0]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(10, "growing"),
            "palette": SAMARA_PALETTE,
            # No loose samara, because nothing detaches. `pair` never changes to `one`.
            "hide": ["samara", "cheeks"],
            "swap": {
                "head": MID_HEAD,
                "pair": PAIR_GREEN,
                "stalk": STALK_MID,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": MID_HEAD_LEFT, "right": MID_HEAD_RIGHT},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "happy": YOUNG_EYES["happy"],
                    "wide": YOUNG_EYES["wide"],
                },
            },
            "origins": {
                "head": MID_HEAD_AT,
                "stalk": (14, 17),
                "twig": (16, 20),
                "pair": (20, 20),
                **seat_young(
                    MID_HEAD_AT, MID_HEAD, cheeks=False, eye_dy=2, mouth_dy=5
                ),
            },
            # It offers, and the offer stays put. The keys swing on the twig and come
            # back — which is what a green samara does in wind, and is exactly not the
            # thing the adult's whole gesture is about.
            "motion": {
                "head": {
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0],
                    "art": [None, None, "right", "right", "right", "right", None,
                            "left", None, None],
                },
                "eyes": {
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0],
                    "dx": [0, 0, G_R_DX, G_R_DX, G_R_DX, G_R_DX, 0, G_L_DX, 0, 0],
                    "art": [None, None, "wide", "wide", None, "happy", "happy", None,
                            "blink", None],
                },
                "mouth": {
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0],
                    "dx": [0, 0, G_R_DX, G_R_DX, G_R_DX, G_R_DX, 0, G_L_DX, 0, 0],
                },
                "pair": {"lean": [0, 0, -1, -1, -1, 0, 1, 1, 0, 0]},
                "twig": {"lean": [0, 0, -1, -1, 0, 0, 0, 0, 0, 0]},
                "stalk": {"lean": [0, 0, 1, 1, 0, 0, -1, 0, 0, 0]},
            },
        },
    },
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
