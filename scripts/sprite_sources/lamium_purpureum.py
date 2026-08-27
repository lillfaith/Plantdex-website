"""Purple Dead Nettle (Lamium purpureum) - creature portrait sprite.

THE DESIGN HOOK: the name says it. It looks enough like a stinging nettle that people
give it a wide berth, and it cannot sting at all - "dead" nettle means exactly that, a
nettle with the sting taken out. It is a mint, not a nettle, and the giveaway is the
purple flush over its top whorls of leaves and its square stem.

So this sprite is deliberately built as a VISUAL RHYME with the nettle's. Same toothed
ears held up over a small face, same silhouette, same proportions - and then the palette
goes purple and the whole thing turns out to be bluffing. Reading them side by side in
the collection is the joke, and it only works because the two sprites are drawn to be
mistaken for one another at a glance.

WHERE THE FACE GOES: in the leaf mass, exactly where the nettle's is.

PERSONALITY: all talk. Its trademark gesture is THE BLUFF - it bristles, brows down,
snarling exactly the way the nettle does for two frames, and then it cannot keep it up:
the bristles drop, the brows go, and it grins sheepishly at having tried. It is the only
sprite whose gesture is an impression of another sprite.

SAFETY: a portrait, never an identification aid. The one place this drawing must not be
taken at its word is telling a dead nettle from a stinging one outdoors, where the card's
identification content is the reference.
"""

from _face import FACE_PALETTE, face_box, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks

PALETTE = {
    **FACE_PALETTE,
    "P": (229, 194, 234, 255),   # the purple flush over the top leaves
    "p": (195, 154, 208, 255),   # flush mid
    "q": (157, 110, 179, 255),    # flush deep
    "Q": (119, 77, 146, 255),     # flush shadow
    "G": (205, 221, 138, 255),   # leaf highlight - the lower leaves stay green
    "g": (161, 179, 110, 255),    # leaf mid
    "d": (124, 147, 76, 255),     # leaf deep
    "n": (70, 82, 52, 255),      # leaf shadow
    "M": (220, 131, 189, 255),   # the small hooded pink flowers
}

BODY_W, BODY_H = 19, 18


def _body(face_dx=0.0, light=(-0.85, -0.65), amp=0.16):
    # Same generator call the nettle uses, with the purple flush in place of green. The
    # rhyme is the point: change the colours, keep the shape.
    return flower_head(
        BODY_W, BODY_H, 9.0, 8.5, 8.2, 8.0, 5, amp, 5.4, 4.8,
        face_dx=face_dx, light=light, trim_tail=False, chars="PpqQFo",
    )


BODY = _body()
BODY_LEFT = _body(face_dx=-1.6, light=(-0.35, -0.65))
BODY_RIGHT = _body(face_dx=1.6, light=(-1.25, -0.65))
# Bristled - the nettle's own hackles pose, borrowed wholesale. That is the bluff.
BODY_BRISTLE = _body(amp=0.30)

# Toothed ears, cut to the same pattern as the nettle's, in purple. Their teeth are
# blunter, because a dead nettle's are, and because the sprite should not survive close
# inspection as a threat.
EAR_L = [
    "    oP",
    "   oPPo",
    "  oPPPPo",
    " oPPPPqo",
    "oPPPpqqQo",
    " opPpqQQo",
    "  opqQo",
    "   oQo",
]

EAR_L_UP = [
    "   oP",
    "  oPPo",
    " oPPPPo",
    "oPPPPqo",
    "oPPPpqqQo",
    " opPpqQQo",
    "  opqQo",
    "   oQo",
]

EAR_R = [
    "Po",
    "oPPo",
    "oPPPPo",
    "oqPPPPo",
    "oQqqpPPPo",
    " oQQqpPpo",
    "   oQqpo",
    "    oQo",
]

EAR_R_UP = [
    "    Po",
    "   oPPo",
    "  oPPPPo",
    " oqPPPPo",
    "oQqqpPPPo",
    " oQQqpPpo",
    "   oQqpo",
    "    oQo",
]

# The hooded flowers, tucked in the whorls where a real one carries them.
FLOWERS = [
    "oMo   oMo",
    "MMM   MMM",
    " o     o",
]

# Lower leaves, still green - which is the plant's own gradient, purple at the top and
# green below, and a useful way to say "this is not the nettle" without a caption.
LEAF_L = [
    "  ooo",
    " oGGGo",
    "oGGgddo",
    " oggdno",
    "  ooo",
]

LEAF_R = [
    "ooo",
    "oGGGo",
    "oddgGGo",
    " ondggo",
    "  ooo",
]

# Square stem, which is the actual field mark for a mint, drawn with visible corners.
STEM = [
    "ogGgo",
    "od.do".replace(".", "g"),
    "ogGgo",
    " ooo ",
]

BODY_AT = (7, 8)

# --- Growth stages -----------------------------------------------------------
#
# THE SAME ALL-TALK DEAD NETTLE, YOUNGER. Its trademark is bristling like the nettle it is
# named after and then not doing anything about it — the bluff is the whole joke — and a
# seedling bluffs exactly as hard, just smaller.
#
# THE PURPLE FLUSH IS ON EVERY STAGE, and it has to be. A dead nettle's top leaves go
# purple while its lower ones stay green, and that gradient is how anyone tells this from
# an actual stinging nettle without touching it. A green seedling here would be drawing
# the plant it is pretending to be.
#
#   sprout    the crowded purple-flushed top pair over green below, no flowers.
#   growing   the flowers in bud: tight and green-pink, tucked in the leaf whorls where
#             they open, rather than a paler version of the open hood.
#   flowering the small hooded pink flowers, unchanged.

BUD_PALETTE = {
    "m": (168, 132, 156, 255),   # a bud, before the hood colours up
}

# --- Sprout: the flush already on ------------------------------------------
YOUNG_BODY_W, YOUNG_BODY_H = 15, 12
YOUNG_BODY_AT = (8, 15)


def _young_body(rx=6.6, ry=5.2, face_dx=0.0, light=(-0.85, -0.65), amp=0.16):
    return flower_head(
        YOUNG_BODY_W, YOUNG_BODY_H, 7.0, 5.6, rx, ry, 7, amp, 5.2, 3.6,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_BODY = _young_body()
YOUNG_BODY_LEFT = _young_body(face_dx=-1.2, light=(-0.35, -0.65))
YOUNG_BODY_RIGHT = _young_body(face_dx=1.2, light=(-1.25, -0.65))
YOUNG_BODY_BRISTLE = _young_body(amp=0.26)

SEED_EAR_L = [
    "   oP",
    "  oPPo",
    " oPPpqo",
    "oPpqQQo",
    " opqQo",
    "  oQo",
]
SEED_EAR_R = [
    "Po   ",
    "oPPo ",
    "oqpPPo",
    "oQQqpPo",
    " oQqpo",
    "  oQo",
]
SEED_LEAF_L = [
    " ooo",
    "oGGGo",
    "oggdo",
    " ooo",
]
SEED_LEAF_R = [
    "ooo",
    "oGGGo",
    "odggo",
    "ooo",
]
SEED_STEM = [
    "ogdo",
    "ogdo",
    " oo ",
]

# --- Growing: the flowers still in bud --------------------------------------
BUD_FLOWERS = [
    "omo   omo",
    "omo   omo",
    " o     o ",
]

BUD_BODY_AT = (7, 14)


def _bud_body(rx=7.8, ry=6.6, face_dx=0.0, light=(-0.85, -0.65), amp=0.16):
    return flower_head(
        17, 15, 8.0, 7.0, rx, ry, 7, amp, 6.0, 4.6,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


BUD_BODY = _bud_body()
BUD_BODY_LEFT = _bud_body(face_dx=-1.4, light=(-0.35, -0.65))
BUD_BODY_RIGHT = _bud_body(face_dx=1.4, light=(-1.25, -0.65))
BUD_BODY_BRISTLE = _bud_body(amp=0.26)

S_L_DX, _ = face_shift(YOUNG_BODY, YOUNG_BODY_LEFT)
S_R_DX, _ = face_shift(YOUNG_BODY, YOUNG_BODY_RIGHT)
G_L_DX, _ = face_shift(BUD_BODY, BUD_BODY_LEFT)
G_R_DX, _ = face_shift(BUD_BODY, BUD_BODY_RIGHT)

# Puffs itself up, thinks better of it, looks away. Smaller than the adult's bluff and
# exactly the same shape, which is the point.
S_BOB = [0, 0, -1, -1, 0, 0, 0, 0]
S_BODY = [None, "bristle", "bristle", None, "left", "right", None, None]
S_DX = [0, 0, 0, 0, S_L_DX, S_R_DX, 0, 0]
S_BLINK = [None, None, None, None, None, None, "blink", None]

G_BOB = [0, 0, -1, -1, -1, 0, 0, 0, 0, 0]
G_BODY = [None, "bristle", "bristle", "bristle", None, "left", "right", None, None, None]
G_DX = [0, 0, 0, 0, 0, G_L_DX, G_R_DX, 0, 0, 0]
G_BLINK = [None] * 8 + ["blink", None]


SPRITE = {
    "herbId": "lamium-purpureum",
    "personality": "all talk",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(12, "sprout"),
            "hide": ["flowers", "brows", "cheeks"],
            "swap": {
                "body": YOUNG_BODY,
                "earL": SEED_EAR_L,
                "earR": SEED_EAR_R,
                "leafL": SEED_LEAF_L,
                "leafR": SEED_LEAF_R,
                "stem": SEED_STEM,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "body": {
                    "left": YOUNG_BODY_LEFT,
                    "right": YOUNG_BODY_RIGHT,
                    "bristle": YOUNG_BODY_BRISTLE,
                },
                "eyes": {"blink": YOUNG_EYES["blink"]},
            },
            "origins": {
                "body": YOUNG_BODY_AT,
                "earL": (4, 15),
                "earR": (20, 15),
                "leafL": (5, 21),
                "leafR": (21, 21),
                "stem": (14, 23),
                **seat_young(YOUNG_BODY_AT, YOUNG_BODY, cheeks=False, eye_dy=2, mouth_dy=5),
            },
            "motion": {
                "body": {"dy": S_BOB, "art": S_BODY},
                "eyes": {"dy": S_BOB, "dx": S_DX, "art": S_BLINK},
                "mouth": {"dy": S_BOB, "dx": S_DX},
                "earL": {"dy": [0] * 8},
                "earR": {"dy": [0] * 8},
                "leafL": {"dy": [0] * 8},
                "leafR": {"dy": [0] * 8},
                "stem": {"dy": [0] * 8},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(12, "growing"),
            "palette": BUD_PALETTE,
            "hide": ["brows"],
            "swap": {
                "body": BUD_BODY,
                "flowers": BUD_FLOWERS,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
                "cheeks": young_cheeks(face_box(BUD_BODY)[2]),
            },
            "variants": {
                "body": {
                    "left": BUD_BODY_LEFT,
                    "right": BUD_BODY_RIGHT,
                    "bristle": BUD_BODY_BRISTLE,
                },
                "eyes": {"blink": YOUNG_EYES["blink"]},
            },
            "origins": {
                "body": BUD_BODY_AT,
                "earL": (3, 12),
                "earR": (20, 12),
                # In the leaf whorls, clear of the face. The adult's origin put them across this
                # stage's smaller head, so bud pixels were overwriting the eyes.
                "flowers": (11, 24),
                "leafL": (3, 20),
                "leafR": (22, 20),
                "stem": (14, 22),
                **seat_young(BUD_BODY_AT, BUD_BODY, eye_dy=2, mouth_dy=5),
            },
            "motion": {
                "body": {"dy": G_BOB, "art": G_BODY},
                "eyes": {"dy": G_BOB, "dx": G_DX, "art": G_BLINK},
                "cheeks": {"dy": G_BOB, "dx": G_DX},
                "mouth": {"dy": G_BOB, "dx": G_DX},
                "earL": {"dy": [0] * 10},
                "earR": {"dy": [0] * 10},
                "flowers": {"dy": [0] * 10},
                "leafL": {"dy": [0] * 10},
                "leafR": {"dy": [0] * 10},
                "stem": {"dy": [0] * 10},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 12,
    "parts": [
        {"name": "stem", "origin": (14, 22), "rows": STEM},
        {"name": "earL", "origin": (2, 7), "rows": EAR_L, "variants": {"up": EAR_L_UP}},
        {"name": "earR", "origin": (21, 7), "rows": EAR_R, "variants": {"up": EAR_R_UP}},
        {
            "name": "body",
            "origin": BODY_AT,
            "rows": BODY,
            "variants": {"left": BODY_LEFT, "right": BODY_RIGHT, "bristle": BODY_BRISTLE},
        },
        {"name": "flowers", "origin": (11, 21), "rows": FLOWERS},
        {"name": "leafL", "origin": (2, 21), "rows": LEAF_L},
        {"name": "leafR", "origin": (21, 21), "rows": LEAF_R},
        *feature_parts(
            BODY_AT, BODY, eyes="round", mouth="smile", eye_dy=2, mouth_dy=5,
            # The nettle's own angry face, borrowed for exactly two frames.
            extra_eyes={"angry": ["      ", "E    E"]},
            extra_mouths={"snarl": ["ooooo", "oPoPo"], "sheepish": ["o  oo", " oo  "]},
        ),
        {
            # Brows are the nettle's signature and nothing else in the deck has them.
            # Wearing them for two frames is what makes this an impression rather than a
            # coincidence.
            "name": "brows",
            "origin": (12, 13),
            "rows": [" "],
            "variants": {"angry": ["o       o", " oo   oo "]},
        },
    ],
    #
    #  0    1     2      3      4      5      6      7      8      9    10   11   12    13
    # rest notice PUFF  BRISTLE SNARL SNARL  drop   drop  sheepish grin grin rest blink rest
    #
    # The bluff is frames 2-8. Two frames of genuine menace - bristled, brows down,
    # snarling - and then it collapses over three frames into an apologetic grin. The
    # collapse is deliberately SLOWER than the threat, because that is what makes it read
    # as being unable to keep it up rather than as a second gesture. Frame 0 is the rest
    # pose reduced motion freezes on: mild, purple, obviously harmless.
    "motion": {
        "body": {
            "art": [None, None, "bristle", "bristle", "bristle", "bristle", None,
                    None, None, None, None, None, None, None],
            "dy": [0, -1, -1, -1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
        },
        "brows": {
            "art": [None, None, None, "angry", "angry", "angry", "angry", None,
                    None, None, None, None, None, None],
            "dy": [0, -1, -1, -1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, "wide", "wide", "angry", "angry", "angry", "angry", "half",
                    "happy", "happy", "happy", None, "blink", None],
            "dy": [0, -1, -1, -1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
        },
        "cheeks": {"dy": [0, -1, -1, -1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0]},
        "mouth": {
            "art": [None, None, None, "snarl", "snarl", "snarl", None, "sheepish",
                    "sheepish", "grin", "grin", None, None, None],
            "dy": [0, -1, -1, -1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
        },
        # The ears snap up on the bluff and then droop lower than they started, which is
        # the whole plant admitting it. The nettle's pin BACK; this one's give up.
        "earL": {
            "art": [None, None, "up", "up", "up", "up", None, None, None, None,
                    None, None, None, None],
            "dy": [0, -1, -2, -2, -2, -2, 1, 2, 2, 1, 0, 0, 0, 0],
            "dx": [0, 0, -1, -1, -1, -1, 0, 1, 1, 0, 0, 0, 0, 0],
        },
        "earR": {
            "art": [None, None, "up", "up", "up", "up", None, None, None, None,
                    None, None, None, None],
            "dy": [0, -1, -2, -2, -2, -2, 1, 2, 2, 1, 0, 0, 0, 0],
            "dx": [0, 0, 1, 1, 1, 1, 0, -1, -1, 0, 0, 0, 0, 0],
        },
        "flowers": {"dy": [0, -1, -1, -1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0]},
        "leafL": {"dx": [0, 0, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0]},
        "leafR": {"dx": [0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
