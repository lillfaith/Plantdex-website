"""Passion Flower (Passiflora incarnata) - creature portrait sprite.

THE DESIGN HOOK: this is one of the deck's three Epic cards and the most structurally
elaborate flower in it - a ring of fringed corona filaments over the petals, which is
what the whole plant is famous for. Measured from the card panel its magenta is only
1.5% of the crop: the intricacy is STRUCTURAL, not chromatic. So the sprite has to earn
its rarity through shape, and it does the one thing nothing else in the set does - it
CHANGES SHAPE rather than moving a fixed one.

WHERE THE FACE GOES: in the flower's centre, ringed by the corona. When the bud is shut
there is no face at all, which is the only time in this set a creature is absent from
its own portrait, and it is what makes the bloom land.

PERSONALITY: theatrical. Its trademark gesture is THE BLOOM - a shut bud swells, splits,
and throws its corona open in a ring, and the face arrives with it, delighted. Nothing
else here transforms; the burdock flares and the dandelion spins, but both are the same
creature the whole way round the loop.

Frame 0 is the flower fully open, not the bud: reduced motion freezes there, and an Epic
card that rested as a closed green lump would be the wrong still image in the collection.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

import math

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

PALETTE = {
    **FACE_PALETTE,
    "P": (238, 186, 250, 255),   # petal highlight
    "p": (196, 106, 227, 255),   # petal mid
    "q": (159, 42, 208, 255),   # petal deep
    "Q": (104, 33, 145, 255),    # petal shadow
    "M": (223, 86, 177, 255),   # corona magenta - the card's own accent, used sparingly
    "m": (180, 36, 146, 255),    # corona deep
    "Y": (248, 227, 160, 255),   # anthers
    "G": (60, 218, 79, 255),   # leaf light
    "g": (43, 167, 67, 255),    # leaf mid
    "d": (32, 116, 56, 255),     # leaf deep
    "t": (48, 201, 71, 255),   # tendril
}

HEAD_W, HEAD_H = 21, 19
# The whole sprite's centre. Both the flower and the ring of filaments around it are
# built about this point, which is the only way the corona lands concentric with the
# petals rather than merely near them.
CX, CY = 15.0, 13.0


def _bloom(face_dx=0.0, light=(-0.85, -0.65), rx=9.0, ry=8.4, lobes=10, amp=0.16):
    return flower_head(
        HEAD_W, HEAD_H, 10.0, 9.0, rx, ry, lobes, amp, 5.2, 4.6,
        face_dx=face_dx, light=light, trim_tail=False, chars="PpqQFo",
    )


HEAD = _bloom()
HEAD_LEFT = _bloom(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _bloom(face_dx=1.5, light=(-1.25, -0.65))
# Thrown wide on the bloom frame: the petals over-open before settling, the way a real
# one does and the way any good entrance does.
HEAD_FLARE = _bloom(rx=9.6, ry=9.0, amp=0.22)
# Half open, and still faceless. `face_rx=0` is what draws no face at all.
HEAD_HALF = flower_head(
    HEAD_W, HEAD_H, 10.0, 9.0, 5.6, 5.2, 10, 0.10, 0, 0,
    light=(-0.85, -0.65), trim_tail=False, chars="PpqQFo",
)
# The shut bud: a small green spindle, hand-drawn, because a bud is not a flower with
# smaller radii - it is a different object.
BUD = [
    "  oo  ",
    " oGGo ",
    "oGGggo",
    "oGgggo",
    "ogggdo",
    "ogdddo",
    " oddo ",
    "  oo  ",
]

def _corona(inner: float, outer: float, count: int = 30) -> list[str]:
    """A ring of filaments around the flower, drawn on the whole 32x28 canvas.

    Generated rather than typed because it has to land CONCENTRIC with a head built from
    a polar curve, and a hand-drawn ring at this radius was three pixels out of round -
    which at 32px is the difference between a corona and a scatter of dots. Two radii,
    alternating, is what makes it read as a fringe instead of as a dotted circle.
    """
    grid = [[" "] * 32 for _ in range(28)]
    for i in range(count):
        angle = 2 * math.pi * i / count
        for radius, char in ((inner, "m"), (outer, "M")):
            # y is squashed: the flower is drawn slightly wide, so its ring must be too.
            x = round(CX + radius * math.cos(angle))
            y = round(CY + radius * 0.86 * math.sin(angle))
            if 0 <= x < 32 and 0 <= y < 28:
                grid[y][x] = char
    return ["".join(row).rstrip() for row in grid]


# Three states, and they are the whole gesture: none, just breaking out of the bud, and
# thrown fully open.
CORONA_NONE = [
    " ",
]

CORONA_BREAK = _corona(6.6, 7.8, count=18)
CORONA_FULL = _corona(10.0, 11.4)

# The anthers at the centre, over the face's brow. Small, and only present once open.
ANTHERS = [
    "Y Y Y",
]

ANTHERS_NONE = [
    " ",
]

# A three-lobed leaf and a coiled tendril: the two structures that say passionflower even
# when the flower itself is shut.
LEAF = [
    " oo oo oo",
    "oGGoGGoGGo",
    "oGgggggggo",
    " odggggddo",
    "  oodddoo",
    "    ooo",
]

TENDRIL = [
    "ot",
    "oto",
    " oto",
    "otto",
    "oto",
    " oo",
]

HEAD_AT = (5, 4)

# --- Growth stages -----------------------------------------------------------
#
# THE BLOOM IS A TRANSFORMATION, and it is the only one in the deck. The corona breaks,
# throws open a frame before the petals catch up, and the face arrives with it. Every
# part of that needs a corona to throw, so the whole gesture belongs to the last stage:
#
#   sprout    the three-lobed leaf and the tendril — the two structures that say
#             passionflower when there is no flower to look at. The face rides the leaf,
#             since this creature's head IS the bloom.
#   growing   the BUD, and this is the interesting one. The adult's bud is faceless: the
#             whole reason the bloom lands is that nobody is home while it is shut. A
#             stage cannot do that — the face is what makes the creature the same creature
#             at every stage — so here the bud has one, and it SWELLS and shudders and
#             does not open. Everything is in place. It cannot yet perform.
#   flowering the split, the corona thrown open, the face arriving delighted. Unchanged.
#
# WHY THE CORONA IS NOT SIMPLY DRAWN SMALLER: it is a ring of filaments generated about
# the flower's own centre, and it exists at all only because a flower has opened. A shut
# bud with a small corona round it would be drawing the structure outside the thing it
# comes out of.

LEAF_PALETTE = {
    "n": (36, 84, 48, 255),   # leaf shadow — this palette has three greens, not four
}

# --- Sprout: leaf and tendril -----------------------------------------------
YOUNG_HEAD_AT = (9, 11)


def _young_head(face_dx=0.0, light=(-0.85, -0.65)):
    # Three deep lobes with one pointing up: a passionflower leaf, which is as
    # recognisable as the bloom and available a great deal more of the year.
    return flower_head(
        16, 13, 7.5, 6.2, 7.4, 6.0, 3, 0.30, 5.4, 3.6,
        face_dx=face_dx, phase=-math.pi / 2, light=light, trim_tail=False,
        chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.3, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.3, light=(-1.25, -0.65))

# --- Growing: the bud, with somebody in it ----------------------------------
MID_HEAD_AT = (7, 7)


def _mid_head(face_dx=0.0, light=(-0.85, -0.65), rx=7.2, ry=7.0):
    # A tall green spindle. Shallow lobes, because a passionflower bud is smooth and
    # ridged rather than petalled — the petals are inside it.
    return flower_head(
        17, 15, 8.0, 7.2, rx, ry, 5, 0.10, 5.4, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


MID_HEAD = _mid_head()
MID_HEAD_LEFT = _mid_head(face_dx=-1.4, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_head(face_dx=1.4, light=(-1.25, -0.65))
# Swollen, and swollen further. It gets all the way to the edge of opening and stops.
MID_HEAD_SWELL = _mid_head(rx=7.6, ry=7.4)
MID_HEAD_TIGHT = _mid_head(rx=6.9, ry=7.2)

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(MID_HEAD, MID_HEAD_LEFT)
G_R_DX, _ = face_shift(MID_HEAD, MID_HEAD_RIGHT)

SPRITE = {
    "herbId": "passiflora-incarnata",
    "personality": "theatrical",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(8, "sprout"),
            "palette": LEAF_PALETTE,
            "hide": ["corona", "anthers", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "wide": YOUNG_EYES["wide"],
                    "half": YOUNG_EYES["half"],
                },
                "mouth": {"open": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "leaf": (2, 18),
                "tendril": (24, 17),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=1, mouth_dy=3
                ),
            },
            # The tendril curls and the leaf leans. Nothing here performs, because there
            # is nothing here to perform with.
            "motion": {
                "head": {
                    "art": [None, "right", None, None, "left", None, None, None],
                    "dy": [0, 0, -1, -1, 0, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, None, "half", "half", None, None, "blink", None],
                    "dx": [0, S_R_DX, 0, 0, S_L_DX, 0, 0, 0],
                    "dy": [0, 0, -1, -1, 0, 0, 0, 0],
                },
                "mouth": {
                    "dx": [0, S_R_DX, 0, 0, S_L_DX, 0, 0, 0],
                    "dy": [0, 0, -1, -1, 0, 0, 0, 0],
                },
                "tendril": {"dy": [0, -1, -1, 0, 0, 1, 0, 0]},
                "leaf": {"lean": [0, 1, 1, 0, -1, -1, 0, 0]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(8, "growing"),
            "palette": LEAF_PALETTE,
            # No corona and no anthers: both are inside the bud, and drawing them outside
            # it would be drawing the structure outside the thing it comes out of.
            "hide": ["corona", "anthers", "cheeks"],
            "swap": {
                "head": MID_HEAD,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {
                    "left": MID_HEAD_LEFT,
                    "right": MID_HEAD_RIGHT,
                    "swell": MID_HEAD_SWELL,
                    "tight": MID_HEAD_TIGHT,
                },
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "wide": YOUNG_EYES["wide"],
                    "half": YOUNG_EYES["half"],
                    "shut": YOUNG_EYES["shut"],
                },
                "mouth": {"open": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": MID_HEAD_AT,
                "leaf": (1, 19),
                "tendril": (22, 17),
                **seat_young(
                    MID_HEAD_AT, MID_HEAD, cheeks=False, eye_dy=2, mouth_dy=4
                ),
            },
            # It swells to the very edge of opening, holds, shuts its eyes, and settles
            # back. The entrance is entirely rehearsed and entirely unperformed, which is
            # the most theatrical thing a bud could possibly do.
            "motion": {
                "head": {
                    "art": [None, "tight", "swell", "swell", "swell", "tight", None,
                            "right", None, None],
                    "dy": [0, 1, -1, -1, -1, 0, 0, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, "half", "wide", "wide", "wide", "shut", "half", None,
                            "blink", None],
                    "dx": [0, 0, 0, 0, 0, 0, 0, G_R_DX, 0, 0],
                    "dy": [0, 1, -1, -1, -1, 0, 0, 0, 0, 0],
                },
                "mouth": {
                    "art": [None, None, "open", "open", "open", None, None, None, None,
                            None],
                    "dx": [0, 0, 0, 0, 0, 0, 0, G_R_DX, 0, 0],
                    "dy": [0, 1, -1, -1, -1, 0, 0, 0, 0, 0],
                },
                "tendril": {"dy": [0, 0, -1, -1, 0, 0, 1, 1, 0, 0]},
                "leaf": {"lean": [0, 1, 1, 0, 0, -1, -1, 0, 0, 0]},
            },
        },
    },
    "size": (32, 28),
    "frames": 16,
    "fps": 8,
    "parts": [
        {"name": "leaf", "origin": (1, 19), "rows": LEAF},
        {"name": "tendril", "origin": (25, 17), "rows": TENDRIL},
        {
            # Drawn on the whole canvas, so its origin is the canvas itself.
            "name": "corona",
            "origin": (0, 0),
            "rows": CORONA_FULL,
            "variants": {"none": CORONA_NONE, "break": CORONA_BREAK},
        },
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {
                "left": HEAD_LEFT,
                "right": HEAD_RIGHT,
                "flare": HEAD_FLARE,
                "half": HEAD_HALF,
                "bud": BUD,
            },
        },
        {
            "name": "anthers",
            "origin": (13, 8),
            "rows": ANTHERS,
            "variants": {"none": ANTHERS_NONE},
        },
        *feature_parts(HEAD_AT, HEAD, eyes="big", mouth="beam", eye_dy=1, mouth_dy=5),
    ],
    #
    #  0    1    2     3      4     5    6    7    8     9      10     11     12    13   14   15
    # open sway close close  BUD   BUD  BUD swell SPLIT BLOOM! flare  settle sway blink open open
    #
    # The bloom is frames 8-11 and it is this sprite's trademark: the corona breaks, then
    # throws fully open a frame before the petals catch up, and the face arrives with it.
    # A flower that opened all at once would read as a light switching on.
    "motion": {
        "head": {
            "art": [None, "right", "half", "half", "bud", "bud", "bud", "bud", "half",
                    "flare", "flare", None, "left", None, None, None],
            # The bud is a small part and needs its own seat; everything else shares the
            # head's origin, so the offset moves it there and back.
            "dx": [0, 1, 0, 0, 8, 8, 8, 8, 0, -1, -1, 0, -1, 0, 0, 0],
            "dy": [0, 0, 0, 1, 6, 6, 5, 4, 0, -1, -1, 0, 0, 0, 0, 0],
        },
        # The corona is the star: absent while shut, breaking on the split, and fully open
        # a frame BEFORE the petals finish. Leading the body is what makes it an entrance.
        "corona": {
            "art": [None, None, "break", "none", "none", "none", "none", "none",
                    "break", None, None, None, None, None, None, None],
            "dx": [0, 1, 0, 0, 0, 0, 0, 0, 0, -1, -1, 0, -1, 0, 0, 0],
            "dy": [0, 0, 1, 0, 0, 0, 0, 0, 0, -1, -1, 0, 0, 0, 0, 0],
        },
        "anthers": {
            "art": [None, None, "none", "none", "none", "none", "none", "none", "none",
                    None, None, None, None, None, None, None],
            "dx": [0, 1, 0, 0, 0, 0, 0, 0, 0, -1, -1, 0, -1, 0, 0, 0],
            "dy": [0, 0, 0, 0, 0, 0, 0, 0, 0, -1, -1, 0, 0, 0, 0, 0],
        },
        # The face is simply not there while the flower is shut. It arrives wide-eyed.
        "eyes": {
            "art": [None, None, "hidden", "hidden", "hidden", "hidden", "hidden",
                    "hidden", "hidden", "wide", "wide", None, None, "blink", None, None],
            "dx": [0, 3, 0, 0, 0, 0, 0, 0, 0, -1, -1, 0, -3, 0, 0, 0],
            "dy": [0, 0, 0, 0, 0, 0, 0, 0, 0, -1, -1, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "art": [None, None, "hidden", "hidden", "hidden", "hidden", "hidden",
                    "hidden", "hidden", None, None, None, None, None, None, None],
            # The blush stays nearer the middle than the eyes do: pushed the full width
            # of a turn it slides off the face onto the petals.
            "dx": [0, 2, 0, 0, 0, 0, 0, 0, 0, -1, -1, 0, -1, 0, 0, 0],
            "dy": [0, 0, 0, 0, 0, 0, 0, 0, 0, -1, -1, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, "hidden", "hidden", "hidden", "hidden", "hidden",
                    "hidden", "hidden", "open", "open", None, None, None, None, None],
            "dx": [0, 3, 0, 0, 0, 0, 0, 0, 0, -1, -1, 0, -3, 0, 0, 0],
            "dy": [0, 0, 0, 0, 0, 0, 0, 0, 0, -1, -1, 0, 0, 0, 0, 0],
        },
        # The tendril goes on curling through the whole thing, indifferent to the show.
        "tendril": {"dy": [0, 0, -1, -1, 0, 0, 1, 1, 0, 0, -1, -1, 0, 0, 0, 0]},
        "leaf": {"lean": [0, 1, 1, 0, 0, -1, -1, 0, 0, 1, 1, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
