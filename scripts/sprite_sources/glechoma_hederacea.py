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

PALETTE = {
    **FACE_PALETTE,
    "G": (156, 200, 128, 255),   # leaf highlight
    "g": (110, 158, 96, 255),    # leaf mid
    "d": (74, 116, 70, 255),     # leaf deep
    "n": (52, 86, 54, 255),      # leaf shadow
    "V": (186, 162, 226, 255),   # the hooded violet flowers
    "v": (140, 116, 182, 255),   # flower shade
    "r": (128, 168, 110, 255),   # runner
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

SPRITE = {
    "herbId": "glechoma-hederacea",
    "personality": "companionable",
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "stem", "origin": (8, 22), "rows": STEM},
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
        {"name": "flowers", "origin": (3, 20), "rows": FLOWERS},
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
