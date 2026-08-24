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

PALETTE = {
    **FACE_PALETTE,
    "V": (252, 216, 226, 255),   # petal highlight
    "v": (240, 172, 196, 255),   # petal mid
    "q": (206, 120, 156, 255),   # petal deep
    "Q": (158, 82, 116, 255),    # petal shadow
    "Y": (250, 222, 130, 255),   # the gold boss of stamens at the centre
    "R": (212, 78, 78, 255),     # a hip, already forming
    "G": (146, 190, 116, 255),   # leaf highlight
    "g": (102, 148, 88, 255),    # leaf mid
    "d": (70, 110, 66, 255),     # leaf deep
    "n": (48, 80, 50, 255),      # leaf shadow
    "T": (232, 214, 190, 255),   # thorns - drawn, never used
    "t": (150, 112, 84, 255),    # cane
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

SPRITE = {
    "herbId": "rosa-spp",
    "personality": "vain",
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
