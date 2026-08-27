"""Wild Geranium (Geranium maculatum) - creature portrait sprite.

THE DESIGN HOOK: cranesbill. The seed capsule is a long straight beak, and when it dries
the five sections peel upward and away from the central column all at once, flinging the
seeds - a catapult that looks exactly like a bird opening its bill. The genus is named
`Geranium` from geranos, crane, for that beak and nothing else.

So this sprite is the only BIRD-LIKE one in the deck, and the beak is real botany rather
than a costume.

WHERE THE FACE GOES: in the flower. Wild geranium's bloom is a wide flat five-petalled
disc, lilac-pink with darker veins running out of the throat, and it is what anybody
recognises the plant by from a distance - a deeply cut leaf could belong to half the
woodland. The beak is carried beside it on its own stalk, because a beak has to be seen
in profile and cannot be if it is coming out of the middle of a face.

PERSONALITY: inquisitive. Its trademark gesture is THE PECK - it cranes forward, tilts
its head the way a bird does when it has noticed something, taps twice, and straightens
up. Nothing else in this deck moves like an animal.

Deliberately not the jewelweed's pop, though both plants are catapults: jewelweed's
gesture is the explosion, and this one's is the curiosity that precedes it.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

import math

from _face import FACE_PALETTE, face_box, face_shift, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks

PALETTE = {
    **FACE_PALETTE,
    "V": (238, 196, 246, 255),   # petal highlight - wild geranium is a lilac-pink
    "v": (232, 173, 243, 255),   # petal mid
    "q": (191, 119, 208, 255),   # petal deep
    "Q": (155, 68, 179, 255),    # petal shadow
    "L": (171, 86, 197, 255),    # the nectar guides - dark veins running out of the throat
    "W": (255, 255, 255, 255),   # eye glint, and the pale throat
    "G": (169, 217, 138, 255),   # leaf highlight
    "g": (129, 177, 106, 255),    # leaf mid
    "d": (94, 146, 77, 255),     # leaf deep
    "n": (58, 82, 52, 255),      # leaf shadow
    "K": (214, 192, 163, 255),   # the beak - dry, pale, and quite unlike the leaves
    "k": (179, 147, 110, 255),    # beak shadow
    "S": (245, 229, 183, 255),   # seeds, for the frame the beak springs
    "t": (147, 187, 122, 255),   # the stalks
}

HEAD_W, HEAD_H = 21, 17
LEAF_W, LEAF_H = 17, 13


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    """The flower: five broad petals, one pointing up, cut only shallowly apart.

    Shallow lobes on purpose - a geranium petal is wide and rounded and barely separated
    from its neighbours, which is what makes the bloom read as a disc rather than as a
    star. The leaf below carries the deep cutting instead.
    """
    return flower_head(
        HEAD_W, HEAD_H, 10.0, 8.0, 9.4, 7.6, 5, 0.14, 5.2, 4.4,
        face_dx=face_dx, phase=-math.pi / 2, light=light, trim_tail=False, chars="VvqQFo",
    )


def _leaf():
    # And here is the deep cutting: seven lobes slashed almost to the base, which is the
    # geranium leaf and the field mark once the flowers are over.
    return flower_head(
        LEAF_W, LEAF_H, 8.0, 6.0, 7.6, 5.6, 7, 0.34, 0, 0,
        phase=-math.pi / 2, light=(-0.85, -0.5), trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))
LEAF = _leaf()

# The nectar guides: dark veins radiating out of the throat across every petal. They are
# the detail that stops a five-lobed lilac disc reading as a generic flower, and a real
# geranium's are strong enough to see across a clearing.
GUIDES = [
    "L   L   L",
    " L  L  L",
    "  L L L",
    "   LLL",
]

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

# The stalk the beak rides on, reaching back to the main stem so the capsule is plainly
# part of this plant rather than a shape parked beside it.
BEAK_STALK = [
    "  oto",
    "  oto",
    " ootoo",
    "oottoo",
    "otto",
]

STEM = [
    "ogGdo",
    "ogGdo",
    "ogGdo",
    "ogGdo",
    "ogGdo",
    "ogGdo",
    " ooo ",
]

HEAD_AT = (2, 1)

# --- Growth stages -----------------------------------------------------------
#
# THE SAME INQUISITIVE GERANIUM, YOUNGER. Its trademark is the cranesbill springing — the
# capsule peeling its five sections upward all at once — and that stays with the last
# stage for a reason beyond drama: the beak IS the spent flower. It forms from the ovary
# after pollination, so a plant that has not flowered has no beak to spring, and drawing
# one earlier would be inventing the plant's calendar as well as its anatomy.
#
#   sprout    the deeply cut palmate leaf and nothing else, with the face on it. This is
#             the species' own field mark once the flowers are over — seven lobes slashed
#             almost to the base — so a leaf is a better thing for a seedling to be than
#             a small flower would have been.
#   growing   in bud: nodding, pointed, green with the lilac only just showing where the
#             sepals part. A geranium bud hangs its head and lifts it to open, which is
#             the one thing about this stage worth drawing.
#   flowering the open lilac disc with its nectar guides, and the beak, unchanged.

# --- Sprout: the palmate leaf, wearing the face -----------------------------
LEAF_HEAD_W, LEAF_HEAD_H = 21, 17
LEAF_HEAD_AT = (5, 9)


def _leaf_head(rx=9.4, ry=7.4, face_dx=0.0, light=(-0.85, -0.5)):
    # The same seven-lobe cutting as the adult's leaf, sized up so there is still leaf
    # left around a face. At the adult's leaf size the face swallowed it and the lobes
    # came out as slivers — a green frill rather than the field mark.
    return flower_head(
        LEAF_HEAD_W, LEAF_HEAD_H, 10.0, 8.0, rx, ry, 7, 0.30, 5.4, 4.0,
        face_dx=face_dx, phase=-math.pi / 2, light=light, trim_tail=False, chars="GgdnFo",
    )


LEAF_HEAD = _leaf_head()
LEAF_HEAD_LEFT = _leaf_head(face_dx=-1.3, light=(-0.35, -0.5))
LEAF_HEAD_RIGHT = _leaf_head(face_dx=1.3, light=(-1.25, -0.5))

SEED_STEM = [
    "otto",
    "otto",
    "otto",
    " oo ",
]

# --- Growing: the bud, nodding ----------------------------------------------
BUD_W, BUD_H = 15, 15
BUD_AT = (9, 6)


def _bud(rx=6.2, ry=6.8, face_dx=0.0, face_dy=0.6, light=(-0.85, -0.65)):
    # Narrow and taller than wide, with few shallow lobes: a geranium bud is an ovoid
    # wrapped in sepals, quite unlike the broad flat disc it opens into.
    return flower_head(
        BUD_W, BUD_H, 7.0, 7.2, rx, ry, 5, 0.10, 5.2, 3.6,
        face_dx=face_dx, face_dy=face_dy, light=light, chars="GgdnFo",
    )


BUD = _bud()
BUD_LEFT = _bud(face_dx=-1.2, light=(-0.32, -0.66))
BUD_RIGHT = _bud(face_dx=1.2, light=(-1.34, -0.66))

# The lilac showing where the sepals part at the tip — the only colour a geranium bud
# gives away, and the whole promise of the next stage.
S_L_DX, _ = face_shift(LEAF_HEAD, LEAF_HEAD_LEFT)
S_R_DX, _ = face_shift(LEAF_HEAD, LEAF_HEAD_RIGHT)
G_L_DX, _ = face_shift(BUD, BUD_LEFT)
G_R_DX, _ = face_shift(BUD, BUD_RIGHT)

S_BOB = [0, 0, -1, -1, -1, 0, 0, 0]
S_HEAD = [None, "left", "left", None, "right", None, None, None]
S_DX = [0, S_L_DX, S_L_DX, 0, S_R_DX, 0, 0, 0]
S_BLINK = [None, None, None, None, None, None, "blink", None]

# It nods, and lifts. That is what a geranium bud does before it opens, and it is the
# gesture the adult's spring grows out of.
G_BOB = [0, 1, 1, 0, -1, -1, -1, 0, 0, 0]
G_HEAD = [None, "left", "left", None, None, None, "right", "right", None, None]
G_DX = [0, G_L_DX, G_L_DX, 0, 0, 0, G_R_DX, G_R_DX, 0, 0]
G_BLINK = [None] * 8 + ["blink", None]


LEAF_AT = (7, 14)
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
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(10, "sprout"),
            # No flower, and therefore no beak: the capsule IS the spent flower.
            "hide": ["beak", "beakStalk", "seeds", "leaf", "cheeks"],
            "swap": {
                "head": LEAF_HEAD,
                "stem": SEED_STEM,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": LEAF_HEAD_LEFT, "right": LEAF_HEAD_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"]},
            },
            "origins": {
                "head": LEAF_HEAD_AT,
                "stem": (14, 22),
                **seat_young(LEAF_HEAD_AT, LEAF_HEAD, cheeks=False, eye_dy=2, mouth_dy=5),
            },
            "motion": {
                "head": {"dy": S_BOB, "art": S_HEAD},
                "eyes": {"dy": S_BOB, "dx": S_DX, "art": S_BLINK},
                "mouth": {"dy": S_BOB, "dx": S_DX},
                "stem": {"dy": [0] * 8},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(10, "growing"),
            # Still no beak — it forms from the ovary after the flower is over.
            "hide": ["beak", "beakStalk", "seeds", "cheeks"],
            "swap": {
                "head": BUD,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": BUD_LEFT, "right": BUD_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"]},
            },
            "origins": {
                "head": BUD_AT,
                "leaf": (7, 14),
                "stem": (13, 19),
                **seat_young(BUD_AT, BUD, cheeks=False, eye_dy=2, mouth_dy=5),
            },
            "motion": {
                "head": {"dy": G_BOB, "art": G_HEAD},
                "eyes": {"dy": G_BOB, "dx": G_DX, "art": G_BLINK},
                "mouth": {"dy": G_BOB, "dx": G_DX},
                "leaf": {"dy": [0] * 10},
                "stem": {"dy": [0] * 10},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 10,
    "parts": [
        {"name": "stem", "origin": (13, 15), "rows": STEM},
        {"name": "leaf", "origin": LEAF_AT, "rows": LEAF},
        {"name": "beakStalk", "origin": (20, 13), "rows": BEAK_STALK},
        {
            "name": "beak",
            "origin": (23, 5),
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
            "origin": (21, 2),
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
        "guides": {
            "dx": [0, 1, 1, 2, 3, 2, 3, 2, 1, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 1, 3, 1, 3, 1, 0, 0, 0, 0, 0, 0],
        },
        "leaf": {"lean": [0, 0, 1, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
