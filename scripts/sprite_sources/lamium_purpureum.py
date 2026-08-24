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

from _face import FACE_PALETTE, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "P": (214, 176, 220, 255),   # the purple flush over the top leaves
    "p": (176, 132, 190, 255),   # flush mid
    "q": (134, 96, 152, 255),    # flush deep
    "Q": (96, 68, 114, 255),     # flush shadow
    "G": (152, 200, 118, 255),   # leaf highlight - the lower leaves stay green
    "g": (108, 158, 90, 255),    # leaf mid
    "d": (72, 116, 66, 255),     # leaf deep
    "n": (50, 84, 50, 255),      # leaf shadow
    "M": (198, 112, 168, 255),   # the small hooded pink flowers
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

SPRITE = {
    "herbId": "lamium-purpureum",
    "personality": "all talk",
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
        {"name": "leafR", "origin": (24, 21), "rows": LEAF_R},
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
