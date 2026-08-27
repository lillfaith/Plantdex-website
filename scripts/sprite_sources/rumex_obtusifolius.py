"""Broadleaf Dock (Rumex obtusifolius) - creature portrait sprite.

THE DESIGN HOOK: dock is the plant everyone meets on the worst day of their walk. It
grows within arm's reach of stinging nettle so reliably that the folk remedy is built
around the coincidence, and its leaf is broad enough to be a dressing. An autumn card,
so its seed stalk has gone rust brown while the leaves are still green.

WHERE THE FACE GOES: in the leaf rosette, wide and low - dock is all leaf, and its
flowers are tiny and brown.

PERSONALITY: steady, and slightly long-suffering. Its trademark gesture is THE OFFER -
it unrolls one broad leaf toward you, flat, like handing over a bandage, holds it there
patiently, and folds it back when nobody takes it. It is the only sprite that offers you
something and is not the least bit surprised to be ignored.

Deliberately not the blackberry's bargain: that one snatches the offer back. This one
waits, then puts it away.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

PALETTE = {
    **FACE_PALETTE,
    "G": (111, 218, 62, 255),   # leaf highlight
    "g": (73, 170, 40, 255),    # leaf mid
    "d": (45, 115, 29, 255),     # leaf deep
    "n": (42, 99, 35, 255),      # leaf shadow
    "R": (202, 96, 38, 255),    # the red midrib dock leaves carry
    "S": (178, 84, 34, 255),    # seed stalk light - autumn rust
    "s": (130, 49, 18, 255),     # seed stalk dark
}

HEAD_W, HEAD_H = 19, 16


def _head(face_dx=0.0, light=(-0.85, -0.65), rx=9.0, ry=7.4):
    # Few, shallow lobes: a dock rosette is broad and smooth-edged, not fringed.
    return flower_head(
        HEAD_W, HEAD_H, 9.0, 7.5, rx, ry, 5, 0.10, 5.0, 4.2,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))
# A patient breath in and out. This is as animated as dock gets when nothing is asked
# of it, and that restraint is the character.
HEAD_BREATH = _head(rx=9.3, ry=7.7)

# The offered leaf: rolled, half open, and held out flat. Three states, and the flat one
# is deliberately the biggest single shape in the sprite.
LEAF_ROLLED = [
    " oo",
    "oGdo",
    "oGdo",
    "oGdo",
    " oo",
]

LEAF_HALF = [
    "  oooo",
    " oGGGdo",
    "oGGRddno",
    " oggddno",
    "  oooo",
]

LEAF_FLAT = [
    "   oooooooo",
    " ooGGGGGGGdo",
    "oGGGGRRRRdddo",
    "oGGgggRgddnno",
    " oggddddddno",
    "  ooooooooo",
]

# The other leaf stays where it is throughout: one arm offers, one arm holds the plant up.
LEAF_STILL = [
    "ooooo",
    "oGGGGdoo",
    "oGGRRddno",
    "oggddddno",
    " ooooooo",
]

# The rust-brown seed stalk of an autumn dock, standing well above the leaves.
STALK = [
    " oso ",
    "osSso",
    "osSso",
    " oso ",
    "osSso",
    "osSso",
    " oso ",
    " oso ",
    " oo  ",
]

HEAD_AT = (7, 11)
# One shared breath, so the whole plant moves as one body rather than as a pile of parts.
BREATH = [0, 0, -1, -1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0]

# --- Growth stages -----------------------------------------------------------
#
# THE OFFER, LEARNED IN THREE GOES. The trademark is holding a broad leaf out FLAT for
# four frames and not being surprised when nobody takes it — the waiting is the joke, and
# a joke needs the pause, so the pause stays with the adult:
#
#   sprout    starts to unroll, gets as far as half, and puts it away again.
#   growing   reaches flat — for exactly one frame, and then folds. It has the leaf. It
#             has not yet got the patience.
#   flowering flat, and held. Unchanged.
#
# BOTANICALLY. Dock is a perennial that spends its early life as a broad basal rosette
# with the red midrib already on it, and no seed stalk at all — the stalk is the adult
# structure and simply is not there yet, which is why the sprout hides it outright rather
# than drawing a short one. The middle stage is where dock is genuinely interesting: the
# stalk goes up carrying tight GREEN whorls of tiny flowers, and only later does the whole
# thing turn the rust brown this card's autumn portrait is drawn in. So the growing stage
# is the same structure in the colour it actually wears first.

WHORL_PALETTE = {
    "K": (156, 200, 108, 255),   # whorl highlight — pale green, before any rust
    "k": (112, 156, 76, 255),    # whorl mid
}

# --- Sprout: the rosette, and nothing above it ------------------------------
YOUNG_HEAD_AT = (9, 13)


def _young_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        15, 14, 7.0, 6.6, 7.2, 6.4, 5, 0.10, 5.4, 3.8,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.3, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.3, light=(-1.25, -0.65))

# Small leaves, red midrib already on them. That midrib is a field mark, so it is never
# the thing that gets simplified away.
LEAF_STILL_YOUNG = [
    "oooo",
    "oGGGdoo",
    "oGRRddo",
    " oooooo",
]

LEAF_ROLLED_YOUNG = [
    " oo",
    "oGdo",
    "oGdo",
    " oo",
]

LEAF_HALF_YOUNG = [
    "  ooo",
    " oGGdo",
    "oGRddo",
    " ooooo",
]

# --- Growing: the stalk up, still green -------------------------------------
MID_HEAD_AT = (8, 12)


def _mid_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        17, 15, 8.0, 7.2, 8.0, 7.0, 5, 0.10, 5.4, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


MID_HEAD = _mid_head()
MID_HEAD_LEFT = _mid_head(face_dx=-1.4, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_head(face_dx=1.4, light=(-1.25, -0.65))

# The same whorled stalk the adult has, shorter and green. Whorls, not a smooth spike:
# dock's flowers ride in rings up the stem with bare stem between them, and that spacing
# is what tells it apart from a plantain's solid column.
STALK_GREEN = [
    " oko ",
    "okKko",
    " oko ",
    "okKko",
    " oko ",
    " oo  ",
]

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(MID_HEAD, MID_HEAD_LEFT)
G_R_DX, _ = face_shift(MID_HEAD, MID_HEAD_RIGHT)

S_BREATH = [0, 0, -1, -1, -1, 0, 0, 0]
G_BREATH = [0, 0, -1, -1, -1, -1, 0, 0, 0, 0]

SPRITE = {
    "herbId": "rumex-obtusifolius",
    "personality": "steady",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(8, "sprout"),
            "hide": ["stalk", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "leafStill": LEAF_STILL_YOUNG,
                "leafOffer": LEAF_ROLLED_YOUNG,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "leafOffer": {"half": LEAF_HALF_YOUNG},
                "eyes": {"blink": YOUNG_EYES["blink"], "wide": YOUNG_EYES["wide"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "leafStill": (20, 19),
                "leafOffer": (6, 19),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=2, mouth_dy=4
                ),
            },
            "motion": {
                "head": {
                    "dy": S_BREATH,
                    "art": [None, None, "right", "right", None, "left", None, None],
                },
                # As far as half, and back. It has the leaf; it has not got the nerve to
                # hold it out to a stranger yet.
                "leafOffer": {
                    "art": [None, None, "half", "half", "half", None, None, None],
                    "dx": [0, 0, -1, -1, -1, 0, 0, 0],
                    "dy": [0, 0, 0, 1, 1, 0, 0, 0],
                },
                "leafStill": {"dy": S_BREATH},
                "eyes": {
                    "dy": S_BREATH,
                    "dx": [0, 0, S_R_DX, S_R_DX, 0, S_L_DX, 0, 0],
                    "art": [None, None, "wide", "wide", "wide", None, "blink", None],
                },
                "mouth": {
                    "dy": S_BREATH,
                    "dx": [0, 0, S_R_DX, S_R_DX, 0, S_L_DX, 0, 0],
                },
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(8, "growing"),
            "palette": WHORL_PALETTE,
            "hide": ["cheeks"],
            "swap": {
                "head": MID_HEAD,
                "stalk": STALK_GREEN,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": MID_HEAD_LEFT, "right": MID_HEAD_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"], "wide": YOUNG_EYES["wide"]},
            },
            "origins": {
                "head": MID_HEAD_AT,
                "stalk": (14, 7),
                "leafStill": (21, 18),
                "leafOffer": (5, 18),
                **seat_young(
                    MID_HEAD_AT, MID_HEAD, cheeks=False, eye_dy=2, mouth_dy=4
                ),
            },
            "motion": {
                "head": {
                    "dy": G_BREATH,
                    "art": [None, None, None, "right", "right", "right", None, "left",
                            None, None],
                },
                # Flat, for ONE frame. Then it folds. The four-frame wait is the adult's.
                "leafOffer": {
                    "art": [None, None, "half", "half", "flat", "half", "half", None,
                            None, None],
                    "dx": [0, 0, -1, -2, -2, -2, -1, 0, 0, 0],
                    "dy": [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
                },
                "leafStill": {"dy": G_BREATH},
                "eyes": {
                    "dy": G_BREATH,
                    "dx": [0, 0, 0, G_R_DX, G_R_DX, G_R_DX, 0, G_L_DX, 0, 0],
                    "art": [None, None, "wide", "wide", "wide", "wide", "wide", None,
                            "blink", None],
                },
                "mouth": {
                    "dy": G_BREATH,
                    "dx": [0, 0, 0, G_R_DX, G_R_DX, G_R_DX, 0, G_L_DX, 0, 0],
                },
                "stalk": {"lean": [0, 1, 1, 1, 0, 0, -1, -1, 0, 0]},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "stalk", "origin": (14, 2), "rows": STALK},
        {"name": "leafStill", "origin": (20, 17), "rows": LEAF_STILL},
        {
            "name": "leafOffer",
            "origin": (5, 17),
            "rows": LEAF_ROLLED,
            "variants": {"half": LEAF_HALF, "flat": LEAF_FLAT},
        },
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT, "breath": HEAD_BREATH},
        },
        *feature_parts(
            HEAD_AT, HEAD, eyes="sleepy", mouth="line", eye_dy=2, mouth_dy=5,
            # A small kind mouth for the frames it is holding the leaf out. Dock does not
            # need an open mouth; it is not saying anything.
            extra_mouths={"kind": ["o   o", " ooo "]},
        ),
    ],
    #
    #  0    1     2      3     4     5     6     7     8    9     10    11    12    13
    # rest breath UNROLL UNROLL OFFER OFFER OFFER OFFER wait wait  fold  fold blink rest
    #
    # The offer is frames 2-9 and it is this sprite's trademark: the leaf goes flat and
    # STAYS flat for four frames, which is longer than any other gesture in the set holds
    # anything. The waiting is the joke. Frame 0 is the rest pose reduced motion freezes
    # on - leaf rolled, nothing asked of anybody.
    "motion": {
        "head": {
            "art": [None, "breath", None, None, "right", "right", "right", "right",
                    None, None, None, "breath", None, None],
            "dy": BREATH,
        },
        "eyes": {
            # Half-lidded at rest and only fully open while it is actually offering.
            "art": [None, None, "wide", "wide", "wide", "wide", "wide", "wide",
                    None, None, None, None, "blink", None],
            "dx": [0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0],
            "dy": BREATH,
        },
        "cheeks": {"dy": BREATH, "dx": [0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0]},
        "mouth": {
            "art": [None, None, None, None, "kind", "kind", "kind", "kind", "kind",
                    None, None, None, None, None],
            "dx": [0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0],
            "dy": BREATH,
        },
        # The leaf unrolls outward and downward - held out at the height of a stung hand,
        # not raised like a flag.
        "leafOffer": {
            "art": [None, None, "half", "half", "flat", "flat", "flat", "flat",
                    "flat", "half", "half", None, None, None],
            "dx": [0, 0, -1, -2, -2, -2, -2, -2, -2, -1, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        },
        "leafStill": {"dy": BREATH},
        # The stalk sways on a long slow arc that never lines up with the offer, so the
        # plant never looks like it is doing one thing with its whole self.
        "stalk": {"lean": [0, 1, 1, 1, 0, 0, -1, -1, -1, 0, 0, 1, 1, 0]},
    },
    "palette": PALETTE,
}
