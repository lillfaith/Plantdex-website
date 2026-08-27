"""Wild Rose (Rosa spp.) - creature portrait sprite.

THE DESIGN HOOK: a wild rose is five petals and nothing else - no ruff, no hundred-petal
bloom, just a simple open five-pointed flower with a boss of gold in the middle, over
thorns. Everything florists have done to roses since is subtraction from that. The hips
that follow it carry more vitamin C by weight than an orange, which is the reason the
plant is in a foraging deck at all.

WHERE THE FACE GOES: in the flower, which is flat, open and wide - the easiest face in
the deck to place and the one with the most room around it.

PERSONALITY: vain, and entitled to be. Its trademark gesture is THE PREEN - it turns
slowly to show its better side, checks that you are still watching, and WINKS. It is the
only sprite in the deck that winks, and the only one that acknowledges the viewer.

The thorns are always drawn and never used. A rose does not need to threaten anybody.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_shift, feature_parts, on_face
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

PALETTE = {
    **FACE_PALETTE,
    "V": (252, 216, 226, 255),   # petal highlight
    "v": (248, 164, 194, 255),   # petal mid
    "q": (226, 100, 153, 255),   # petal deep
    "Q": (179, 61, 114, 255),    # petal shadow
    "Y": (234, 214, 146, 255),   # the gold boss of stamens at the centre
    "R": (220, 70, 70, 255),     # a hip, already forming
    "G": (123, 210, 96, 255),   # leaf highlight
    "g": (84, 168, 68, 255),    # leaf mid
    "d": (58, 125, 51, 255),     # leaf deep
    "n": (44, 85, 43, 255),      # leaf shadow
    "T": (244, 216, 178, 255),   # thorns - drawn, never used
    "t": (168, 109, 66, 255),    # cane
}

HEAD_W, HEAD_H = 21, 17


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    # Five broad lobes: five petals, which is what a wild rose has and what every
    # cultivated one has had bred out of it.
    return flower_head(
        HEAD_W, HEAD_H, 10.0, 8.0, 9.4, 7.6, 5, 0.17, 5.4, 4.4,
        face_dx=face_dx, light=light, trim_tail=False, chars="VvqQFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.6, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.6, light=(-1.25, -0.65))
# Three-quarters, for the frames it is showing you its better side. The face is nearly at
# the rim and the light has swung right round.
HEAD_FAR_RIGHT = _head(face_dx=2.6, light=(-1.7, -0.55))

# The gold boss of stamens, which is what stops a five-petalled pink disc reading as a
# cartoon flower and starts it reading as a rose. It sits across the TOP of the face
# rather than in the middle of it - drawn over the middle it simply buried the eyes.
BOSS = [
    "oYYYYYo",
]

# A hip already forming beside the flower - the part of this plant worth foraging.
HIP = [
    " oo ",
    "oRRo",
    "oRRo",
    " oTo",
]

# The compound leaf: rose leaves come in odd-numbered leaflets with serrated edges, which
# is the field mark once the flower has gone.
FROND_L = [
    "  oo oo",
    " oGGoGGo",
    "oGgggggdo",
    " oddddddo",
    "  oo oo",
]

FROND_R = [
    "oo oo",
    "oGGoGGo",
    "oggggggGo",
    "oddddddo",
    "oo oo",
]

# The cane, with thorns on it. They point down, the way a real rose's do - which is why
# a rose stem is easy to pull upward through your hand and painful to pull down.
CANE = [
    "otTo",
    "otto",
    "oTto",
    "otto",
    " oo ",
]

HEAD_AT = (5, 3)
TURN_R = face_shift(HEAD, HEAD_RIGHT)[0]
TURN_FAR = face_shift(HEAD, HEAD_FAR_RIGHT)[0]
TURN_L = face_shift(HEAD, HEAD_LEFT)[0]
HEAD_ART = [None, "right", "right", "farRight", "farRight", "farRight", "farRight",
            "right", "right", None, "left", None, None, None]
_SLIDE = {"right": TURN_R, "farRight": TURN_FAR, "left": TURN_L}
FACE_DX = [_SLIDE.get(art, 0) for art in HEAD_ART]

# --- Growth stages -----------------------------------------------------------
#
# THE WINK IS THE WHOLE SPRITE. It is one frame, it is the only frame in this deck where
# a creature looks directly at the person holding the card, and every other frame of the
# adult's loop exists to set it up. So it is the last thing this plant earns:
#
#   sprout    a compound leaf with the face on it, and thorns already fully grown. It
#             turns to show you its better side and has not got one yet, which for a vain
#             creature is the correct joke.
#   growing   the BUD: pointed, wrapped in sepals, petal colour showing only at the tip.
#             It does the entire preen — turns, holds the profile, checks you are still
#             watching — and blinks instead of winking.
#   flowering the five petals, the gold boss, the hip, and the wink. Unchanged.
#
# NO HIP BEFORE THE FLOWER. The hip is the fruit, it is the reason a rose is in a
# foraging deck at all, and it cannot exist on a plant that has not bloomed. Same rule
# the strawberry and the bramble carry, applied where it happens to cost this creature
# the one thing it is proud of.
#
# THE THORNS ARE THERE AT EVERY STAGE, drawn and never used. A rose seedling is armed
# from very early, and the adult's own note applies unchanged: it does not need to
# threaten anybody.

# --- Sprout: leaves and thorns, and no better side --------------------------
YOUNG_HEAD_AT = (9, 11)


def _young_head(face_dx=0.0, light=(-0.85, -0.65)):
    # A rose leaflet: oval and serrated all the way round, which is the field mark once
    # the flower has gone and the only one available before it arrives.
    return flower_head(
        17, 13, 8.0, 6.2, 8.0, 6.0, 7, 0.22, 5.4, 3.6,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.3, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.3, light=(-1.25, -0.65))

# --- Growing: the bud, wrapped ----------------------------------------------
MID_HEAD_AT = (8, 6)


def _mid_head(face_dx=0.0, light=(-0.85, -0.65)):
    """The bud: tall, tight, and green with the petal colour only at the lit tip.

    The char order does the work — highlight is the PETAL pink and the three shades
    under it are the sepals, so the colour reads as something showing through a wrapping
    rather than as a small pink flower. A rose bud that was simply a smaller bloom would
    be the one thing this ladder must not draw.
    """
    return flower_head(
        17, 15, 8.0, 7.2, 7.4, 7.0, 5, 0.10, 5.4, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="vgdnFo",
    )


MID_HEAD = _mid_head()
MID_HEAD_LEFT = _mid_head(face_dx=-1.4, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_head(face_dx=1.4, light=(-1.25, -0.65))
MID_HEAD_FAR_RIGHT = _mid_head(face_dx=2.4, light=(-1.7, -0.55))

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_R_DX, _ = face_shift(MID_HEAD, MID_HEAD_RIGHT)
G_FAR_DX, _ = face_shift(MID_HEAD, MID_HEAD_FAR_RIGHT)
G_L_DX, _ = face_shift(MID_HEAD, MID_HEAD_LEFT)

G_HEAD_ART = [None, "right", "right", "farRight", "farRight", "farRight", "right",
              None, "left", None]
_G_SLIDE = {"right": G_R_DX, "farRight": G_FAR_DX, "left": G_L_DX}
G_FACE_DX = [_G_SLIDE.get(art, 0) for art in G_HEAD_ART]

SPRITE = {
    "herbId": "rosa-spp",
    "personality": "vain",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(8, "sprout"),
            # No boss, because there are no stamens; no hip, because there has been no
            # flower.
            "hide": ["boss", "hip", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                    "happy": YOUNG_EYES["happy"],
                },
                "mouth": {"grin": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "frondL": (2, 17),
                "frondR": (19, 18),
                "cane": (14, 19),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=1, mouth_dy=3
                ),
            },
            # It turns one way, turns the other, and finds both sides identical. No
            # profile is held, because holding a profile is a claim.
            "motion": {
                "head": {
                    "art": [None, "right", None, "left", None, None, None, None],
                    "dy": [0, 0, -1, 0, 0, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, None, "happy", None, None, None, "blink", None],
                    "dx": [0, S_R_DX, 0, S_L_DX, 0, 0, 0, 0],
                    "dy": [0, 0, -1, 0, 0, 0, 0, 0],
                },
                "mouth": {
                    "dx": [0, S_R_DX, 0, S_L_DX, 0, 0, 0, 0],
                    "dy": [0, 0, -1, 0, 0, 0, 0, 0],
                },
                "frondL": {"lean": [0, 1, 1, 0, -1, 0, 0, 0]},
                "frondR": {"lean": [0, -1, -1, 0, 1, 0, 0, 0]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(8, "growing"),
            "hide": ["boss", "hip", "cheeks"],
            "swap": {
                "head": MID_HEAD,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {
                    "left": MID_HEAD_LEFT,
                    "right": MID_HEAD_RIGHT,
                    "farRight": MID_HEAD_FAR_RIGHT,
                },
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                    "happy": YOUNG_EYES["happy"],
                },
                "mouth": {"grin": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": MID_HEAD_AT,
                "frondL": (2, 16),
                "frondR": (18, 18),
                "cane": (14, 19),
                **seat_young(
                    MID_HEAD_AT, MID_HEAD, cheeks=False, eye_dy=2, mouth_dy=4
                ),
            },
            # The whole preen, and a BLINK where the wink goes. Everything is set up and
            # the punchline is withheld, which is precisely what mastery buys here.
            "motion": {
                "head": {
                    "art": G_HEAD_ART,
                    "dy": [0, 0, -1, -1, -1, -1, 0, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, None, "happy", None, None, "blink", None, "happy",
                            None, None],
                    "dx": G_FACE_DX,
                    "dy": [0, 0, -1, -1, -1, -1, 0, 0, 0, 0],
                },
                "mouth": {
                    "art": [None, None, None, "grin", "grin", "grin", "grin", None,
                            None, None],
                    "dx": [max(-2, min(2, dx)) for dx in G_FACE_DX],
                    "dy": [0, 0, -1, -1, -1, -1, 0, 0, 0, 0],
                },
                "frondL": {"lean": [0, 1, 1, 0, 0, -1, -1, 0, 1, 0]},
                "frondR": {"lean": [0, -1, -1, 0, 0, 1, 1, 0, -1, 0]},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "cane", "origin": (14, 19), "rows": CANE},
        {"name": "frondL", "origin": (0, 16), "rows": FROND_L},
        {"name": "frondR", "origin": (19, 18), "rows": FROND_R},
        {"name": "hip", "origin": (26, 12), "rows": HIP},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {
                "left": HEAD_LEFT,
                "right": HEAD_RIGHT,
                "farRight": HEAD_FAR_RIGHT,
            },
        },
        {"name": "boss", "origin": on_face(HEAD_AT, HEAD, BOSS, dy=0), "rows": BOSS},
        *feature_parts(
            HEAD_AT, HEAD, eyes="round", mouth="smile", eye_dy=1, mouth_dy=4,
            # The wink. One eye shut, one open, and it is the only frame in this deck
            # where a creature is looking directly at the person holding the card.
            extra_eyes={"wink": ["WE  oo", "EE    "]},
        ),
    ],
    #
    #  0    1     2     3      4      5      6     7     8     9    10    11   12    13
    # rest turn  turn  PROFILE PROFILE WINK  hold  back  back  rest glance rest blink rest
    #
    # The preen is frames 1-8 and the wink is frame 5 - one frame, and every other frame
    # of the loop exists to set it up and to give it somewhere to land. A wink held for
    # two frames stops being a wink and becomes a squint. Frame 0 is the rest pose reduced
    # motion freezes on: full face, both eyes open, which is the flower anybody would draw.
    "motion": {
        "head": {
            "art": HEAD_ART,
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "boss": {
            "dx": FACE_DX,
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, "happy", None, None, "wink", None, "happy", None,
                    None, None, None, "blink", None],
            "dx": FACE_DX,
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [max(-2, min(2, dx)) for dx in FACE_DX],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, None, "grin", "grin", "grin", "grin", "grin", None,
                    None, None, None, None, None],
            "dx": [max(-2, min(2, dx)) for dx in FACE_DX],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        # The hip rocks gently and takes no part in any of this.
        "hip": {"dy": [0, 0, 0, -1, -1, 0, 0, 1, 1, 0, 0, 0, 0, 0]},
        "frondL": {"lean": [0, 1, 1, 0, 0, -1, -1, 0, 0, 1, 0, 0, 0, 0]},
        "frondR": {"lean": [0, -1, -1, 0, 0, 1, 1, 0, 0, -1, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
