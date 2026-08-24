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

from _face import FACE_PALETTE, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "G": (152, 200, 116, 255),   # leaf highlight
    "g": (108, 160, 86, 255),    # leaf mid
    "d": (72, 116, 64, 255),     # leaf deep
    "n": (50, 84, 50, 255),      # leaf shadow
    "R": (192, 122, 84, 255),    # the red midrib dock leaves carry
    "S": (176, 108, 72, 255),    # seed stalk light - autumn rust
    "s": (128, 76, 56, 255),     # seed stalk dark
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

SPRITE = {
    "herbId": "rumex-obtusifolius",
    "personality": "steady",
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "stalk", "origin": (14, 2), "rows": STALK},
        {"name": "leafStill", "origin": (20, 17), "rows": LEAF_STILL},
        {
            "name": "leafOffer",
            "origin": (2, 17),
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
