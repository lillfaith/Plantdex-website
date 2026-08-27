"""Blackberry (Rubus spp.) - creature portrait sprite.

THE DESIGN HOOK: blackberry is the bargain plant. It hands you the best fruit in the
hedge and charges you in blood for it. Measured from the card panel its dark mass sits
upper right, y84-185 of a 276 crop, over a tangle of warm cane - so the creature is a
heavy berry cluster riding on armed canes.

WHERE THE FACE GOES: in the berry cluster, the only round structure here and the one
everybody recognises. Deep purple, so the face patch has to be genuinely pale to read.

PERSONALITY: generous and prickly, in that order and in quick succession. Its trademark
gesture is THE BARGAIN - it holds a berry out to you, beaming, and the instant you reach
for it every thorn on the cane snaps upright and the berry is snatched back. It is the
only gesture in the set that REVERSES: two beats that contradict each other, which is
the whole character of the plant.

Deliberately not the burdock's grab, though both reach: burdock wants to come with you
and never changes its mind.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

PALETTE = {
    **FACE_PALETTE,
    "B": (158, 127, 188, 255),   # drupelet highlight
    "b": (120, 77, 166, 255),    # drupelet mid
    "u": (67, 40, 104, 255),      # drupelet deep
    "U": (46, 32, 70, 255),      # drupelet shadow - the darkest note on the card
    "R": (215, 154, 169, 255),   # a drupelet still ripening red
    "T": (242, 217, 166, 255),   # thorn - pale, so the snap actually reads
    "G": (137, 214, 127, 255),   # leaf light
    "g": (102, 178, 99, 255),     # leaf mid
    "d": (74, 141, 77, 255),     # leaf deep
    "r": (186, 138, 101, 255),    # cane
}

HEAD_W, HEAD_H = 21, 19


def _cluster(face_dx=0.0, light=(-0.85, -0.65), amp=0.11):
    # Many shallow lobes: a blackberry is a knot of drupelets, but driven hard the lobes
    # separate into a ring of spikes and the head stops being a berry at all.
    return flower_head(
        HEAD_W, HEAD_H, 10.0, 9.0, 9.2, 8.6, 10, amp, 5.0, 4.4,
        face_dx=face_dx, light=light, trim_tail=False, chars="BbuUFo",
    )


HEAD = _cluster()
HEAD_LEFT = _cluster(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _cluster(face_dx=1.5, light=(-1.25, -0.65))
# Drawn tight: the cluster pulling in on itself as it takes the offer back.
HEAD_TIGHT = _cluster(amp=0.04)

# A few drupelets caught still red. Without them the head is a plum.
UNRIPE = [
    "R      R",
    "   RR",
]

# The berry it offers, on the end of a cane. Three states: held close, held out, gone.
BERRY_NEAR = [
    " oo ",
    "oBbo",
    "ouUo",
    " oo ",
]

BERRY_OUT = [
    " oo ",
    "oBBo",
    "obuo",
    " oo ",
]

BERRY_GONE = [
    " ",
]

# The canes, held like arms. Their thorns are drawn as a separate part so they can snap
# out without the arm moving - the snap has to be faster than the limb.
CANE_L = [
    "     oooo",
    "  ooorrrro",
    "oorrrrrroo",
    "orrrroooo",
    "oooo",
]

CANE_R = [
    "oooo",
    "orrrrooo",
    "oorrrrrroo",
    " oorrrrrro",
    "     oooo",
]

# Thorns lie flat, then stand straight up. Pale, and the only pale thing down there.
THORNS_FLAT = [
    " T  T   T",
]

THORNS_UP = [
    "T  T   T",
    "oT oT  oT",
]

LEAF = [
    "  ooo",
    " oGGGo",
    "oGgGGdo",
    "oggddddo",
    " oddddo",
    "  ooo",
]

HEAD_AT = (5, 2)

# --- Growth stages -----------------------------------------------------------
#
# THE THORNS COME FIRST. Blackberry's canes are biennial: a first-year cane is vegetative
# — leaves and prickles and nothing else — and only a second-year cane flowers and fruits.
# So the plant genuinely spends a whole year holding up its half of the bargain and none
# of yours, which is the most characterful piece of botany in this species and is what the
# sprout is:
#
#   sprout    a first-year cane. Leaves, and thorns already fully armed. It has the SNAP
#             and nothing to offer with it — the second half of the bargain, on its own.
#   growing   the flower buds, tight and green-white. Now it has something to hold out,
#             and it holds out a BUD, beams, and snatches it back exactly the same way.
#   flowering the berry. Unchanged.
#
# NO FRUIT BEFORE THE LAST STAGE, and here that rule is doing real work rather than being
# recited: this deck already treats ripeness as the thing a picture of a plant can get
# dangerously wrong, and a bramble is the plant people most often eat straight off. A
# green cane wearing berries would be a drawing that says "ready" a year early.
#
# THE FACE MOVES ONTO A LEAF for the sprout, the way violet's and St John's Wort's do,
# because this creature's head IS the berry cluster and there is no cluster yet.

LEAF_PALETTE = {
    "n": (52, 104, 58, 255),   # leaf shadow — the adult's palette never needed one
}

BUD_PALETTE = {
    "K": (232, 236, 214, 255),   # petal tip, only just showing past the sepals
    "k": (178, 200, 152, 255),   # sepal highlight
    "j": (124, 154, 104, 255),   # sepal mid
    "J": (84, 110, 74, 255),     # sepal shadow
}

# --- Sprout: the first-year cane, all thorns ---------------------------------
YOUNG_HEAD_AT = (8, 11)


def _young_head(face_dx=0.0, light=(-0.85, -0.65)):
    # A bramble leaflet: toothed hard all round, which is the outline people check when
    # they are working out whether the tangle in front of them is worth reaching into.
    return flower_head(
        16, 12, 7.5, 5.6, 7.4, 5.6, 7, 0.20, 5.4, 3.4,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.3, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.3, light=(-1.25, -0.65))

# --- Growing: the flowers, still shut ----------------------------------------
MID_HEAD_AT = (6, 7)


def _mid_head(face_dx=0.0, light=(-0.85, -0.65), amp=0.11):
    return flower_head(
        19, 16, 9.0, 7.6, 8.4, 7.6, 10, amp, 5.4, 4.2,
        face_dx=face_dx, light=light, trim_tail=False, chars="KkjJFo",
    )


MID_HEAD = _mid_head()
MID_HEAD_LEFT = _mid_head(face_dx=-1.4, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_head(face_dx=1.4, light=(-1.25, -0.65))
MID_HEAD_TIGHT = _mid_head(amp=0.04)

# What it holds out instead of a berry: one closed flower, green sepals with the white
# barely showing. Same silhouette as the berry, so the reversal reads identically.
BUD_NEAR = [
    " oo ",
    "okKo",
    "ojJo",
    " oo ",
]

BUD_OUT = [
    " oo ",
    "oKKo",
    "okjo",
    " oo ",
]

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(MID_HEAD, MID_HEAD_LEFT)
G_R_DX, _ = face_shift(MID_HEAD, MID_HEAD_RIGHT)

SPRITE = {
    "herbId": "rubus-spp",
    "personality": "conditional",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(10, "sprout"),
            "palette": LEAF_PALETTE,
            # No berry, and no unripe drupelets either — there is no fruit here to be
            # part-way to.
            "hide": ["berry", "unripe", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "narrow": YOUNG_EYES["shut"],
                    "wide": YOUNG_EYES["wide"],
                },
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "leaf": (21, 18),
                "caneL": (0, 18),
                "caneR": (18, 21),
                "thorns": (2, 19),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=1, mouth_dy=3
                ),
            },
            # The snap, with no offer in front of it. Frames 0-2 are a plant standing
            # there; on frame 3 every thorn is up, and it holds them up. There is nothing
            # to take, and it would still rather you did not.
            "motion": {
                "head": {
                    "dy": [0, 0, 0, -1, -1, 0, 0, 0],
                    "art": [None, "right", None, "left", "left", None, None, None],
                },
                "eyes": {
                    "dy": [0, 0, 0, -1, -1, 0, 0, 0],
                    "dx": [0, S_R_DX, 0, S_L_DX, S_L_DX, 0, 0, 0],
                    "art": [None, None, None, "narrow", "narrow", "narrow", "blink",
                            None],
                },
                "mouth": {
                    "dy": [0, 0, 0, -1, -1, 0, 0, 0],
                    "dx": [0, S_R_DX, 0, S_L_DX, S_L_DX, 0, 0, 0],
                },
                "thorns": {
                    "art": [None, None, None, "up", "up", "up", None, None],
                    "dy": [0, 0, 0, -1, -1, -1, 0, 0],
                },
                "caneL": {"dx": [0, 0, 0, -1, -1, 0, 0, 0]},
                "caneR": {"dx": [0, 0, 0, 1, 1, 0, 0, 0]},
                "leaf": {"dy": [0, 0, -1, -1, 0, 0, 0, 0]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(10, "growing"),
            "palette": BUD_PALETTE,
            "hide": ["unripe", "cheeks"],
            "swap": {
                "head": MID_HEAD,
                "berry": BUD_NEAR,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {
                    "left": MID_HEAD_LEFT,
                    "right": MID_HEAD_RIGHT,
                    "tight": MID_HEAD_TIGHT,
                },
                "berry": {"out": BUD_OUT, "gone": ["  "]},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "narrow": YOUNG_EYES["shut"],
                    "wide": YOUNG_EYES["wide"],
                },
            },
            "origins": {
                "head": MID_HEAD_AT,
                "leaf": (20, 17),
                "caneL": (0, 17),
                "caneR": (18, 20),
                "thorns": (2, 18),
                "berry": (4, 19),
                **seat_young(
                    MID_HEAD_AT, MID_HEAD, cheeks=False, eye_dy=2, mouth_dy=5
                ),
            },
            # The whole bargain, played with a flower instead of a berry. It offers, it
            # beams, the thorns go up and the bud is gone. The only thing missing is the
            # thing you actually wanted.
            "motion": {
                "head": {
                    "art": [None, "right", None, None, None, "tight", "tight", None,
                            None, None],
                    "dx": [0, 1, 1, 2, 2, -1, -2, -1, 0, 0],
                    "dy": [0, 0, 1, 1, 1, -1, -1, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, None, "wide", "wide", "wide", "narrow", "narrow",
                            "narrow", "blink", None],
                    "dx": [0, 1 + G_R_DX, 1, 2, 2, -1, -2, -1, 0, 0],
                    "dy": [0, 0, 1, 1, 1, -1, -1, 0, 0, 0],
                },
                "mouth": {
                    "dx": [0, 1 + G_R_DX, 1, 2, 2, -1, -2, -1, 0, 0],
                    "dy": [0, 0, 1, 1, 1, -1, -1, 0, 0, 0],
                },
                "berry": {
                    "art": [None, None, "out", "out", "out", "gone", "gone", "gone",
                            None, None],
                    "dx": [0, 0, -1, -2, -2, 0, 0, 0, 0, 0],
                    "dy": [0, 0, -1, -2, -2, 0, 0, 0, 0, 0],
                },
                "thorns": {
                    "art": [None, None, None, None, None, "up", "up", "up", None, None],
                    "dy": [0, 0, 0, 0, 0, -1, -1, -1, 0, 0],
                },
                "caneL": {"dx": [0, 0, -1, -1, -1, 0, 0, 0, 0, 0]},
                "caneR": {"dx": [0, 0, 1, 1, 1, 0, 0, 0, 0, 0]},
                "leaf": {"dy": [0, 0, 0, -1, -1, 0, 1, 0, 0, 0]},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 10,
    "parts": [
        {"name": "leaf", "origin": (20, 17), "rows": LEAF},
        {"name": "caneL", "origin": (0, 17), "rows": CANE_L},
        {"name": "caneR", "origin": (18, 20), "rows": CANE_R},
        {
            "name": "thorns",
            "origin": (2, 18),
            "rows": THORNS_FLAT,
            "variants": {"up": THORNS_UP},
        },
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT, "tight": HEAD_TIGHT},
        },
        {"name": "unripe", "origin": (9, 6), "rows": UNRIPE},
        *feature_parts(
            HEAD_AT, HEAD, eyes="round", mouth="smile", eye_dy=2, mouth_dy=5,
            # Guarded: the eyes it wears the moment the bargain turns.
            extra_eyes={"narrow": ["oo  oo", "EE  EE"]},
        ),
        {
            "name": "berry",
            "origin": (4, 19),
            "rows": BERRY_NEAR,
            "variants": {"out": BERRY_OUT, "gone": BERRY_GONE},
        },
    ],
    #
    #  0    1     2      3      4     5     6     7     8     9    10   11   12    13
    # rest notice OFFER OFFER  hold  hold  SNAP! guard guard settle rest rest blink rest
    #
    # The bargain is frames 2-8: the berry goes out on a beaming grin, and on frame 6
    # every thorn snaps upright, the berry vanishes and the smile is gone. Frame 0 is the
    # rest pose reduced motion freezes on - berry held close, thorns down, nobody hurt.
    "motion": {
        "head": {
            "art": [None, "right", None, None, None, None, "tight", "tight", "tight",
                    None, "left", None, None, None],
            "dx": [0, 1, 1, 2, 2, 2, -1, -2, -2, -1, 0, 0, 0, 0],
            "dy": [0, 0, 1, 1, 1, 1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        "unripe": {
            "dx": [0, 1, 1, 2, 2, 2, -1, -2, -2, -1, 0, 0, 0, 0],
            "dy": [0, 0, 1, 1, 1, 1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, "wide", "wide", "wide", "wide", "narrow", "narrow",
                    "narrow", None, None, None, "blink", None],
            "dx": [0, 1, 1, 2, 2, 2, -1, -2, -2, -1, 0, 0, 0, 0],
            "dy": [0, 0, 1, 1, 1, 1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 1, 1, 2, 2, 2, -1, -2, -2, -1, 0, 0, 0, 0],
            "dy": [0, 0, 1, 1, 1, 1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        # Beaming for the whole offer, flat the instant the thorns go up. The mouth is
        # where the reversal lands hardest.
        "mouth": {
            "art": [None, None, "grin", "grin", "grin", "grin", "flat", "flat", "flat",
                    None, None, None, None, None],
            "dx": [0, 1, 1, 2, 2, 2, -1, -2, -2, -1, 0, 0, 0, 0],
            "dy": [0, 0, 1, 1, 1, 1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        # The berry travels out on a cane and is simply GONE on the snap frame. Watching
        # it retract would soften the joke; vanishing is the point.
        "berry": {
            "art": [None, None, "out", "out", "out", "out", "gone", "gone", "gone",
                    "gone", None, None, None, None],
            "dx": [0, 0, -1, -2, -2, -2, 0, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, -1, -2, -2, -2, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        # One frame from flat to upright, and they stay up for three. Thorns do not ease.
        "thorns": {
            "art": [None, None, None, None, None, None, "up", "up", "up", "up",
                    None, None, None, None],
            "dy": [0, 0, 0, 0, 0, 0, -1, -1, -1, 0, 0, 0, 0, 0],
        },
        "caneL": {"dx": [0, 0, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0]},
        "caneR": {"dx": [0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]},
        "leaf": {"dy": [0, 0, 0, -1, -1, 0, 0, 1, 1, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
