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
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

PALETTE = {
    **FACE_PALETTE,
    "R": (219, 86, 67, 255),    # drupe highlight
    "r": (180, 44, 34, 255),     # drupe mid
    "u": (140, 11, 11, 255),     # drupe deep
    "U": (118, 15, 21, 255),      # drupe shadow
    "B": (230, 160, 122, 255),   # the hotter red of the raised torch - this loop only
    "b": (220, 105, 72, 255),    # torch mid
    "G": (194, 218, 59, 255),   # leaf highlight
    "g": (136, 160, 44, 255),    # leaf mid
    "d": (89, 112, 31, 255),     # leaf deep
    "n": (76, 97, 37, 255),      # leaf shadow
    "t": (158, 86, 35, 255),    # the furred stem staghorn sumac is named for
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

# --- Growth stages -----------------------------------------------------------
#
# THE LIGHT IS THE FRUIT. This sprite's trademark is raising the cone and having it
# BRIGHTEN into two reds that appear nowhere else in the deck — and that red is ripe
# drupes, which is also what sumac lemonade is made of. So the torch cannot light before
# there is fruit to light it with:
#
#   sprout    the compound fronds and nothing above them. It has no torch, so it lifts
#             its own face instead, which is as close as it gets.
#   growing   the panicle is up, in the exact position the cone will occupy — and it is
#             GREENISH-YELLOW, because that is what a sumac inflorescence is before it
#             sets fruit. It raises it proudly. It does not light.
#   flowering the cone, red, and the two hotter reds on the lift. Unchanged.
#
# The pinnate frond stays at every stage. A sumac leaf is many paired leaflets down a
# rachis rather than a single blade, which is unlike almost everything else in this deck
# and is the thing that identifies the plant when there is no cone to look at — which is
# to say, at exactly the two stages that have no cone.

PANICLE_PALETTE = {
    "K": (228, 230, 142, 255),   # panicle highlight — greenish yellow, no red yet
    "k": (188, 192, 102, 255),   # panicle mid
    "j": (142, 150, 72, 255),    # panicle deep
    "J": (104, 112, 56, 255),    # panicle shadow
}

# --- Sprout: fronds, and nothing to carry -----------------------------------
YOUNG_HEAD_AT = (9, 12)


def _young_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        15, 14, 7.0, 6.6, 7.2, 6.4, 7, 0.13, 5.4, 3.8,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.3, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.3, light=(-1.25, -0.65))

FROND_L_YOUNG = [
    " oo oo",
    "oGGoGGo",
    "oggggggo",
    " oddddo",
    " oo oo",
]

FROND_R_YOUNG = [
    "oo oo",
    "oGGoGGo",
    "oggggggo",
    "oddddo",
    "oo oo",
]

# --- Growing: the panicle, before it is fruit -------------------------------
MID_HEAD_AT = (7, 11)


def _mid_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        17, 15, 8.0, 7.0, 7.6, 6.6, 7, 0.13, 5.4, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


MID_HEAD = _mid_head()
MID_HEAD_LEFT = _mid_head(face_dx=-1.4, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_head(face_dx=1.4, light=(-1.25, -0.65))

# Same upright shape, smaller, and no face — a panicle in the place the cone will be.
PANICLE = flower_head(
    9, 11, 4.0, 6.0, 3.8, 5.4, 9, 0.12, 0, 0,
    light=(-0.85, -0.85), trim_tail=False, chars="KkjJFo",
)

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(MID_HEAD, MID_HEAD_LEFT)
G_R_DX, _ = face_shift(MID_HEAD, MID_HEAD_RIGHT)

SPRITE = {
    "herbId": "rhus-spp",
    "personality": "ceremonial",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(8, "sprout"),
            "hide": ["cone", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "frondL": FROND_L_YOUNG,
                "frondR": FROND_R_YOUNG,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                    "wide": YOUNG_EYES["wide"],
                },
                "mouth": {"wide": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "frondL": (2, 18),
                "frondR": (21, 18),
                "stem": (14, 22),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=2, mouth_dy=4
                ),
            },
            # It gathers and lifts, and there is nothing over its head to lift. The
            # ceremony is intact; the object is missing.
            "motion": {
                "head": {
                    "dy": [0, 1, 0, -1, -1, -1, 0, 0],
                    "art": [None, None, None, None, "right", None, None, None],
                },
                "eyes": {
                    "dy": [0, 1, 0, -1, -1, -1, 0, 0],
                    "dx": [0, 0, 0, 0, S_R_DX, 0, 0, 0],
                    "art": [None, "half", None, "wide", "wide", None, "blink", None],
                },
                "mouth": {
                    "dy": [0, 1, 0, -1, -1, -1, 0, 0],
                    "dx": [0, 0, 0, 0, S_R_DX, 0, 0, 0],
                },
                "frondL": {"dx": [0, 0, 0, -1, -1, -1, 0, 0]},
                "frondR": {"dx": [0, 0, 0, 1, 1, 1, 0, 0]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(8, "growing"),
            "palette": PANICLE_PALETTE,
            "hide": ["cheeks"],
            "swap": {
                "head": MID_HEAD,
                "cone": PANICLE,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": MID_HEAD_LEFT, "right": MID_HEAD_RIGHT},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                    "wide": YOUNG_EYES["wide"],
                    "happy": YOUNG_EYES["happy"],
                },
                "mouth": {"wide": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": MID_HEAD_AT,
                "cone": (12, 5),
                "frondL": (1, 17),
                "frondR": (20, 17),
                "stem": (14, 22),
                **seat_young(
                    MID_HEAD_AT, MID_HEAD, cheeks=False, eye_dy=2, mouth_dy=4
                ),
            },
            # The full raise, and no light at the top of it. Everything the adult does
            # except the one thing the adult is FOR.
            "motion": {
                "cone": {"dy": [0, 1, -1, -3, -4, -4, -4, -2, 0, 0]},
                "head": {
                    "dy": [0, 1, 0, -1, -1, -1, -1, 0, 0, 0],
                    "art": [None, None, None, None, None, None, None, "right", None,
                            None],
                },
                "eyes": {
                    "dy": [0, 1, 0, -1, -1, -1, -1, 0, 0, 0],
                    "dx": [0, 0, 0, 0, 0, 0, 0, G_R_DX, 0, 0],
                    "art": [None, "half", None, "wide", "wide", "wide", "wide", "happy",
                            "blink", None],
                },
                "mouth": {
                    "dy": [0, 1, 0, -1, -1, -1, -1, 0, 0, 0],
                    "dx": [0, 0, 0, 0, 0, 0, 0, G_R_DX, 0, 0],
                    "art": [None, None, None, "wide", "wide", "wide", "wide", None,
                            None, None],
                },
                "frondL": {"dx": [0, 0, 0, -1, -1, -1, -1, 0, 0, 0]},
                "frondR": {"dx": [0, 0, 0, 1, 1, 1, 1, 0, 0, 0]},
            },
        },
    },
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
