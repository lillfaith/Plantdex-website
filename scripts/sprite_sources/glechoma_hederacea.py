"""Ground Ivy (Glechoma hederacea) - creature portrait sprite.

THE DESIGN HOOK: creeping charlie. It spreads by runners - stems that go out sideways
along the ground, root wherever a node touches, and become a whole new plant that is
still attached to the first one. A lawn does not get ground ivy plants; it gets one
ground ivy, several metres across.

So this sprite does the one thing no other creature in the set does: it MAKES ANOTHER OF
ITSELF. A runner goes out, a small copy stands up on the end of it, the two of them look
at each other, and the copy folds back down. It is a plant reproducing sideways in
fourteen frames.

WHERE THE FACE GOES: in the scalloped kidney-shaped leaf, which is what identifies it,
with the small violet hooded flowers in the axils.

PERSONALITY: companionable. Its trademark gesture is THE RUNNER, and the reason it lands
is the beat where BOTH faces are present and blinking at slightly different times.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_shift, feature_parts, on_face
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

PALETTE = {
    **FACE_PALETTE,
    "G": (72, 220, 146, 255),   # leaf highlight
    "g": (47, 171, 118, 255),    # leaf mid
    "d": (32, 118, 87, 255),     # leaf deep
    "n": (37, 101, 82, 255),      # leaf shadow
    "V": (163, 123, 230, 255),   # the hooded violet flowers
    "v": (110, 53, 209, 255),   # flower shade
    "r": (52, 190, 126, 255),   # runner
}

HEAD_W, HEAD_H = 17, 15
COPY_W, COPY_H = 11, 10


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    # Ten shallow lobes: the scalloped margin of a ground ivy leaf, which together with
    # the kidney outline is the whole identification.
    return flower_head(
        HEAD_W, HEAD_H, 8.0, 7.0, 7.6, 6.6, 10, 0.11, 4.8, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.4, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.4, light=(-1.25, -0.65))

# The copy on the end of the runner. Same shape, two thirds the size, and a face too
# small for anything but a pair of dots - which is exactly right for a plantlet.
COPY = flower_head(
    COPY_W, COPY_H, 5.0, 4.5, 4.8, 4.2, 6, 0.09, 2.8, 2.4,
    trim_tail=False, chars="GgdnFo",
)
COPY_AT = (21, 13)

COPY_NONE = [
    " ",
]

# The copy folded down flat, which is where it starts and ends.
COPY_FLAT = [
    " ooooo ",
    "ogGGGgo",
    "odgggdo",
    " ooooo ",
]

# Two dots and a line. A plantlet does not get a full face - it gets the least a face can
# be and still be one.
COPY_FACE = [
    "E E",
    " o ",
]

COPY_BLINK = [
    "o o",
    " o ",
]

COPY_FACE_NONE = [
    " ",
]

# The runner, going out along the ground. It grows a segment at a time.
RUNNER_NONE = [
    " ",
]

RUNNER_SHORT = [
    "orrro",
    " ooo ",
]

RUNNER_LONG = [
    "orrrrrrrrro",
    " ooooooooo ",
]

# The hooded violet flowers, in the leaf axils in pairs, which is where a real one has
# them and is the second half of the identification.
FLOWERS = [
    "oVo  oVo",
    "vVv  vVv",
    " o    o",
]

STEM = [
    "ogdo",
    "ogdo",
    " oo ",
]

HEAD_AT = (2, 8)
TURN_L = face_shift(HEAD, HEAD_LEFT)[0]
TURN_R = face_shift(HEAD, HEAD_RIGHT)[0]
HEAD_DX = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
# It turns to look at the copy while the copy is up, and back when it has gone.
TURN = [0, 0, TURN_R, TURN_R, TURN_R, TURN_R, TURN_R, TURN_R, TURN_R, 0, 0, 0, 0, 0]
FACE_DX = [h + t for h, t in zip(HEAD_DX, TURN)]

# --- Growth stages -----------------------------------------------------------
#
# MAKING ANOTHER OF YOURSELF IS THE LAST THING YOU LEARN. This sprite's trademark is a
# runner going out and a small copy of the creature standing up on the end of it, and that
# is reproduction — a seedling cannot do it, and drawing it doing so would be the single
# least true thing in the set.
#
#   sprout    one kidney leaf with a face on it. No runner, no copy, no flowers. It looks
#             around for company and does not find any, which is the whole characterisation
#             of a companionable plant that is still on its own.
#   growing   the RUNNER GOES OUT AND NOTHING STANDS UP ON IT. This is exactly what
#             happens: a stolon extends well before a node roots and raises a plantlet,
#             so the stage that has a runner but no copy is the botanically real one.
#             The flowers are present as closed buds, violet only just showing.
#   flowering the runner, the copy, and four frames with two faces in them. Unchanged.

BUD_PALETTE = {
    "K": (128, 196, 152, 255),   # calyx highlight — the bud is green until it opens
    "k": (86, 148, 116, 255),    # calyx mid
}

# --- Sprout: one leaf, and nobody to talk to --------------------------------
YOUNG_HEAD_AT = (4, 14)


def _young_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        14, 9, 6.5, 4.4, 6.6, 4.4, 8, 0.10, 5.4, 2.8,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.2, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.2, light=(-1.25, -0.65))

# --- Growing: a runner with nothing on the end of it ------------------------
MID_HEAD_AT = (3, 11)


def _mid_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        15, 11, 7.0, 5.4, 7.0, 5.4, 10, 0.11, 5.4, 3.2,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


MID_HEAD = _mid_head()
MID_HEAD_LEFT = _mid_head(face_dx=-1.3, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_head(face_dx=1.3, light=(-1.25, -0.65))

# The hooded flowers shut. Ground ivy's buds sit in the same axillary pairs the open ones
# do, with the violet showing at the tip and the calyx still closed round the rest.
BUDS = [
    "ovo  ovo",
    "okKo okKo",
    " o    o",
]

S_TURN_L = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)[0]
S_TURN_R = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)[0]
S_FACE_DX = [0, 0, S_TURN_R, S_TURN_R, 0, S_TURN_L, 0, 0]

G_TURN_L = face_shift(MID_HEAD, MID_HEAD_LEFT)[0]
G_TURN_R = face_shift(MID_HEAD, MID_HEAD_RIGHT)[0]
G_FACE_DX = [0, 0, G_TURN_R, G_TURN_R, G_TURN_R, G_TURN_R, G_TURN_R, 0, 0, 0]

SPRITE = {
    "herbId": "glechoma-hederacea",
    "personality": "companionable",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(8, "sprout"),
            "hide": ["runner", "copy", "copyFace", "flowers", "stem", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"], "half": YOUNG_EYES["half"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=1, mouth_dy=3
                ),
            },
            # It checks right, checks left, and finds nobody. The adult's turn to the
            # right is a turn TOWARD something; this one is a turn toward where something
            # is going to be.
            "motion": {
                "head": {
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0],
                    "art": [None, None, "right", "right", None, "left", None, None],
                },
                "eyes": {
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0],
                    "dx": S_FACE_DX,
                    "art": [None, "half", None, None, None, None, "blink", None],
                },
                "mouth": {"dy": [0, -1, 0, 0, 0, 0, 0, 0], "dx": S_FACE_DX},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(8, "growing"),
            "palette": BUD_PALETTE,
            # The runner exists; the plantlet on the end of it does not, yet.
            "hide": ["copy", "copyFace", "cheeks"],
            "swap": {
                "head": MID_HEAD,
                "flowers": BUDS,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": MID_HEAD_LEFT, "right": MID_HEAD_RIGHT},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                    "wide": YOUNG_EYES["wide"],
                },
            },
            "origins": {
                "head": MID_HEAD_AT,
                "flowers": (2, 20),
                "stem": (8, 20),
                "runner": (16, 21),
                **seat_young(
                    MID_HEAD_AT, MID_HEAD, cheeks=False, eye_dy=1, mouth_dy=3
                ),
            },
            # The runner grows out, holds, and draws back in — and the creature watches
            # the far end of it the whole time, waiting for something that is not going
            # to happen this year.
            "motion": {
                "head": {
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0],
                    "art": [None, None, "right", "right", "right", "right", "right",
                            None, None, None],
                },
                "eyes": {
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0],
                    "dx": G_FACE_DX,
                    "art": [None, "half", None, "wide", "wide", "wide", None, None,
                            "blink", None],
                },
                "mouth": {"dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0], "dx": G_FACE_DX},
                "runner": {
                    "art": [None, None, "short", "short", "long", "long", "long",
                            "short", None, None],
                },
                "flowers": {"dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0]},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "stem", "origin": (8, 20), "rows": STEM},
        {
            "name": "runner",
            "origin": (11, 21),
            "rows": RUNNER_NONE,
            "variants": {"short": RUNNER_SHORT, "long": RUNNER_LONG},
        },
        {
            "name": "copy",
            "origin": COPY_AT,
            "rows": COPY_NONE,
            "variants": {"up": COPY, "flat": COPY_FLAT},
        },
        {
            "name": "copyFace",
            # Measured off the plantlet's own face patch, the same as every other face
            # here. It is five pixels wide and there is no room to be a pixel out.
            "origin": on_face(COPY_AT, COPY, COPY_FACE, dy=1),
            "rows": COPY_FACE_NONE,
            "variants": {"on": COPY_FACE, "blink": COPY_BLINK},
        },
        {"name": "flowers", "origin": (3, 18), "rows": FLOWERS},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(HEAD_AT, HEAD, eyes="round", mouth="smile", eye_dy=1, mouth_dy=4),
    ],
    #
    #  0    1     2      3      4     5     6     7     8     9     10   11   12    13
    # rest notice RUNNER RUNNER RISE  UP    UP    UP   blink  fold  fold rest blink rest
    #
    # The runner is frames 2-9 and it is this sprite's trademark: a stem goes out, a small
    # copy of the creature stands up on the end of it, and for four frames there are two
    # of them. The two faces deliberately blink out of phase - identical timing would read
    # as one drawing shown twice, which is exactly what it is and exactly what it must not
    # look like. Frame 0 is the rest pose reduced motion freezes on: one plant, no runner.
    "motion": {
        "head": {
            "art": [None, None, "right", "right", "right", "right", "right", "right",
                    "right", None, None, None, None, None],
            "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, "half", None, None, "wide", "wide", "wide", None, "blink",
                    None, None, None, "half", None],
            "dx": FACE_DX,
            "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {"dx": FACE_DX, "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
        "mouth": {
            "art": [None, None, None, None, "grin", "grin", "grin", "grin", "grin",
                    None, None, None, None, None],
            "dx": FACE_DX,
            "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        # The runner grows a segment at a time and withdraws the same way. It never
        # vanishes while the copy is still standing on it.
        "runner": {
            "art": [None, None, "short", "long", "long", "long", "long", "long",
                    "long", "long", "short", None, None, None],
        },
        # The copy is flat, then up. Flat first is what makes it read as unfolding rather
        # than as appearing.
        "copy": {
            "art": [None, None, None, "flat", "up", "up", "up", "up", "up", "flat",
                    None, None, None, None],
            "dy": [0, 0, 0, 6, 0, -1, -1, 0, 0, 6, 0, 0, 0, 0],
        },
        "copyFace": {
            "art": [None, None, None, None, None, "on", "blink", "on", "on", None,
                    None, None, None, None],
            "dy": [0, 0, 0, 0, 0, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "flowers": {"dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
