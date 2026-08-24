"""Wild Geranium (Geranium maculatum) - creature portrait sprite.

THE DESIGN HOOK: cranesbill. The seed capsule is a long straight beak, and when it dries
the five sections peel upward and away from the central column all at once, flinging the
seeds - a catapult that looks exactly like a bird opening its bill. The genus is named
`Geranium` from geranos, crane, for that beak and nothing else.

So this sprite is the only BIRD-LIKE one in the deck, and the beak is real botany rather
than a costume.

WHERE THE FACE GOES: in the deeply palmate leaf, with the beak carried beside it - the
beak is the identification and it needs to be seen in profile, which it cannot be if it
is coming out of the middle of a face.

PERSONALITY: inquisitive. Its trademark gesture is THE PECK - it cranes forward, tilts
its head the way a bird does when it has noticed something, taps twice, and straightens
up. Nothing else in this deck moves like an animal.

Deliberately not the jewelweed's pop, though both plants are catapults: jewelweed's
gesture is the explosion, and this one's is the curiosity that precedes it.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "V": (216, 190, 240, 255),   # petal highlight - wild geranium is a soft lilac-pink
    "v": (178, 146, 214, 255),   # petal mid
    "q": (134, 106, 168, 255),   # petal deep
    "G": (150, 196, 118, 255),   # leaf highlight
    "g": (106, 152, 90, 255),    # leaf mid
    "d": (72, 114, 68, 255),     # leaf deep
    "n": (50, 84, 52, 255),      # leaf shadow
    "K": (196, 172, 140, 255),   # the beak - dry, pale, and quite unlike the leaves
    "k": (150, 126, 98, 255),    # beak shadow
    "S": (238, 226, 190, 255),   # seeds, for the frame the beak springs
}

HEAD_W, HEAD_H = 19, 15


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    # Deeply cut, five ways: a wild geranium leaf is palmate and slashed almost to the
    # base, which is the field mark before and after it flowers.
    return flower_head(
        HEAD_W, HEAD_H, 9.0, 7.0, 8.4, 6.6, 5, 0.22, 5.0, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))

# The cranesbill itself. Closed, and sprung - the five sections peeling upward all at
# once, which is what the capsule really does and is the shape the genus is named after.
BEAK_CLOSED = [
    "oKo",
    "oKo",
    "oKo",
    "oKo",
    "oko",
    "okKko",
    "okkko",
    " ooo",
]

BEAK_SPRUNG = [
    "o o o",
    "oKoKo",
    "oKoKo",
    " okko",
    " oko",
    "okKko",
    "okkko",
    " ooo",
]

SEEDS_NONE = [
    " ",
]

SEEDS = [
    "S   S",
    " S S",
]

# The five-petalled flower, held to one side.
FLOWER = [
    "oVoVo",
    "VvvvV",
    "oVoVo",
]

# One more palmate leaf, lower down.
LEAF = [
    " o o o ",
    "oGoGoGo",
    "oGgggGo",
    " ogddgo",
    "  ondo",
    "   o",
]

STEM = [
    "ogdo",
    "ogdo",
    "ogdo",
    " oo ",
]

HEAD_AT = (5, 8)
TURN_L = face_shift(HEAD, HEAD_LEFT)[0]
TURN_R = face_shift(HEAD, HEAD_RIGHT)[0]
# The head tilt is the bird bit: it goes one way, holds, and comes back the other. A
# creature that looked straight ahead through a peck would read as a machine.
HEAD_ART = [None, "right", "right", "left", "left", "left", "left", "right", "right",
            None, None, None, None, None]
_SLIDE = {"left": TURN_L, "right": TURN_R}
FACE_DX = [_SLIDE.get(art, 0) for art in HEAD_ART]

SPRITE = {
    "herbId": "geranium-maculatum",
    "personality": "inquisitive",
    "size": (32, 28),
    "frames": 14,
    "fps": 10,
    "parts": [
        {"name": "stem", "origin": (14, 23), "rows": STEM},
        {"name": "leaf", "origin": (2, 20), "rows": LEAF},
        {"name": "flower", "origin": (24, 17), "rows": FLOWER},
        {
            "name": "beak",
            "origin": (24, 4),
            "rows": BEAK_CLOSED,
            "variants": {"sprung": BEAK_SPRUNG},
        },
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(
            HEAD_AT, HEAD, eyes="beady", mouth="line", eye_dy=2, mouth_dy=5,
            # A two-row bill rather than a three-row "oh": the third row hangs off the
            # bottom of this face, and a peck is a snap anyway.
            extra_mouths={"tap": ["ooo", "oFo"]},
        ),
        {
            "name": "seeds",
            "origin": (22, 2),
            "rows": SEEDS_NONE,
            "variants": {"on": SEEDS},
        },
    ],
    #
    #  0    1     2     3      4     5     6     7     8      9     10   11   12    13
    # rest notice TILT  crane  PECK  up    PECK  up    SPRING seeds  rest rest blink rest
    #
    # The peck is frames 4-7 and it is this sprite's trademark: two taps, one frame apart,
    # with the head coming back up in between - which is how a bird pecks and is nothing
    # like how anything else in this deck moves. The capsule springs on frame 8, as if the
    # tapping set it off. Frame 0 is the rest pose reduced motion freezes on: beak closed,
    # head level.
    "motion": {
        "head": {
            "art": HEAD_ART,
            "dx": [0, 1, 1, 2, 3, 2, 3, 2, 1, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 1, 3, 1, 3, 1, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, "wide", "wide", "wide", "wide", "wide", "wide", "wide",
                    "wide", None, None, None, "blink", None],
            "dx": [dx + slide for dx, slide in
                   zip([0, 1, 1, 2, 3, 2, 3, 2, 1, 0, 0, 0, 0, 0], FACE_DX)],
            "dy": [0, 0, 0, 1, 3, 1, 3, 1, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 1, 1, 2, 3, 2, 3, 2, 1, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 1, 3, 1, 3, 1, 0, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, None, None, "tap", None, "tap", None, None, None,
                    None, None, None, None],
            "dx": [0, 1, 1, 2, 3, 2, 3, 2, 1, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 1, 3, 1, 3, 1, 0, 0, 0, 0, 0, 0],
        },
        # The capsule springs once and stays sprung. A cranesbill that re-closed would be
        # claiming something the plant cannot do.
        "beak": {
            "art": [None, None, None, None, None, None, None, None, "sprung",
                    "sprung", "sprung", "sprung", "sprung", None],
            "dy": [0, 0, 0, 0, 0, 0, 0, 0, -1, -1, 0, 0, 0, 0],
        },
        "seeds": {
            "art": [None, None, None, None, None, None, None, None, "on", "on",
                    None, None, None, None],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, 0, 0, 0, 0, 0, -2, 0, 0, 0, 0],
        },
        "flower": {"dy": [0, 0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0]},
        "leaf": {"lean": [0, 0, 1, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
