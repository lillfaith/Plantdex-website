"""Elderberry (Sambucus spp.) - creature portrait sprite.

THE DESIGN HOOK: elder is the old one. The name is the same word as elder meaning senior,
the tree is knee-deep in European folklore about asking its permission before cutting it,
and its hollow stems have been made into whistles and flutes for as long as there have
been children. It flowers in enormous flat white umbels held out horizontally - a shape
that is, unmistakably, a wide-brimmed hat.

WHERE THE FACE GOES: under the umbel, in the shade of it. This is the only face in the
deck that is deliberately shaded by something the creature is wearing.

PERSONALITY: venerable. Its trademark gesture is THE TIP OF THE HAT - the umbel tilts
down over its eyes, holds a beat, and comes back up with a slow nod, while the heavy
berry clusters swing underneath. It is the only sprite wearing something it can move
independently of itself, and the only one whose gesture is a courtesy.

SAFETY: a portrait, never an identification aid, and this is a species where that
matters more than most: elder's raw berries, leaves, bark and stems are not safe to eat,
and other plants resemble it. The card's identification and safety content are the
reference, not a drawing.
"""

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

PALETTE = {
    **FACE_PALETTE,
    "V": (253, 247, 239, 255),   # umbel highlight - elderflower is properly white
    "v": (238, 223, 194, 255),   # umbel mid
    "q": (202, 179, 125, 255),   # umbel deep
    "Q": (132, 164, 90, 255),   # umbel shadow
    "B": (92, 47, 170, 255),    # berry highlight
    "b": (62, 29, 118, 255),     # berry mid
    "u": (51, 26, 100, 255),      # berry deep
    "G": (217, 196, 54, 255),   # leaf highlight
    "g": (157, 152, 43, 255),    # leaf mid
    "d": (109, 110, 30, 255),     # leaf deep
    "n": (89, 94, 34, 255),      # leaf shadow
    "t": (157, 91, 39, 255),    # the hollow stem people make whistles out of
}

HEAD_W, HEAD_H = 19, 15
BRIM_W, BRIM_H = 27, 9


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        HEAD_W, HEAD_H, 9.0, 7.0, 8.4, 6.6, 6, 0.11, 5.0, 4.2,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


def _brim(ry=3.8):
    # Very wide and very shallow, with no face: an elder umbel is a flat plate held out
    # sideways, and the extreme ratio between the radii is the whole silhouette.
    return flower_head(
        BRIM_W, BRIM_H, 13.0, 4.0, 12.6, ry, 14, 0.10, 0, 0,
        light=(-0.85, -0.9), trim_tail=False, chars="VvqQFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))
BRIM = _brim()
# Tipped: the same plate seen more edge-on, which is what a brim does when it comes down.
BRIM_TIPPED = _brim(ry=2.6)

# The berry clusters, hanging heavy. They swing a beat behind the hat, because weight
# lags - and elder carries so much fruit the branches bend under it.
BERRIES_L = [
    "oBbo",
    "obbuo",
    "obuuo",
    " ouo",
]

BERRIES_R = [
    "oBbo",
    "oBbbo",
    "obbuo",
    " ouo",
]

# Compound leaves - elder's are pinnate, several leaflets to a stalk, which is quite
# unlike the single blades most of this deck carries.
FROND_L = [
    " oo oo",
    "oGGoGGo",
    "oggggggo",
    "odddddo",
    " oo oo",
]

FROND_R = [
    "oo oo",
    "oGGoGGo",
    "oggggggo",
    "oddddo",
    "oo oo",
]

STEM = [
    "otto",
    "otto",
    "otto",
    " oo ",
]

HEAD_AT = (6, 9)

# --- Growth stages -----------------------------------------------------------
#
# NO BERRIES BEFORE THE LAST STAGE, and on this card that is a safety rule rather than a
# stylistic one. Elder's raw berries are not safe to eat, its leaves and bark and stems
# are not either, and other plants resemble it — this species' own docstring says a
# drawing cannot do that work for you. A young elder wearing fruit would be a picture
# saying "here it is" about the wrong thing at the wrong time.
#
#   sprout    the pinnate fronds and nothing above them. No hat, so the courtesy is a
#             plain nod: the gesture with the prop taken away.
#   growing   the umbel exists and is SHUT — a tight green-white knot held UP rather than
#             out, which is exactly how an elder carries it before it opens. It tips as
#             far as a stiff hat will go, and no further.
#   flowering the white plate, the full tip, two frames of shade, and the berries
#             swinging a beat behind. Unchanged.
#
# The compound frond is on every stage, because with no umbel to look at it is the only
# thing saying which plant this is: elder's leaves are pinnate, several leaflets to a
# stalk, which is unlike almost everything else in this deck.

BUD_PALETTE = {
    "K": (234, 240, 216, 255),   # bud umbel highlight — green-white, not yet white
    "k": (196, 212, 160, 255),   # bud umbel mid
    "j": (148, 170, 110, 255),   # bud umbel deep
    "J": (106, 128, 78, 255),    # bud umbel shadow
}

# --- Sprout: fronds, and no hat ---------------------------------------------
YOUNG_HEAD_AT = (8, 12)


def _young_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        16, 14, 7.5, 6.6, 7.6, 6.4, 6, 0.11, 5.4, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.3, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.3, light=(-1.25, -0.65))

FROND_L_YOUNG = [
    " oo o",
    "oGGoGo",
    "oggggo",
    " oo o",
]

FROND_R_YOUNG = [
    "o oo",
    "oGoGGo",
    "oggggo",
    "o oo",
]

# --- Growing: the umbel, shut -----------------------------------------------
MID_HEAD_AT = (7, 13)


def _mid_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        17, 14, 8.0, 6.6, 7.8, 6.4, 6, 0.11, 5.4, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


MID_HEAD = _mid_head()
MID_HEAD_LEFT = _mid_head(face_dx=-1.4, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_head(face_dx=1.4, light=(-1.25, -0.65))


def _bud_brim(ry=3.0):
    # Narrower and deeper than the open plate: a shut elder umbel is a knot rather than a
    # brim, and it is held up on the stem instead of out over the face.
    return flower_head(
        19, 7, 9.0, 3.2, 8.6, ry, 12, 0.14, 0, 0,
        light=(-0.85, -0.9), trim_tail=False, chars="KkjJFo",
    )


BUD_BRIM = _bud_brim()
BUD_BRIM_TIPPED = _bud_brim(ry=2.3)

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(MID_HEAD, MID_HEAD_LEFT)
G_R_DX, _ = face_shift(MID_HEAD, MID_HEAD_RIGHT)

SPRITE = {
    "herbId": "sambucus-spp",
    "personality": "venerable",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(6, "sprout"),
            "hide": ["brim", "berriesL", "berriesR", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "frondL": FROND_L_YOUNG,
                "frondR": FROND_R_YOUNG,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                    "shut": YOUNG_EYES["shut"],
                },
                "mouth": {"wide": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "frondL": (4, 20),
                "frondR": (19, 20),
                "stem": (14, 21),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=1, mouth_dy=4
                ),
            },
            # The courtesy, with nothing to take off. It lowers its own head instead,
            # which is what anybody does who has forgotten their hat.
            "motion": {
                "head": {
                    "dy": [0, 0, 1, 2, 2, 1, 0, 0],
                    "art": [None, None, None, None, "right", None, None, None],
                },
                "eyes": {
                    "dy": [0, 0, 1, 2, 2, 1, 0, 0],
                    "dx": [0, 0, 0, 0, S_R_DX, 0, 0, 0],
                    "art": [None, "half", "half", "shut", "shut", "half", "blink",
                            None],
                },
                "mouth": {
                    "dy": [0, 0, 1, 2, 2, 1, 0, 0],
                    "dx": [0, 0, 0, 0, S_R_DX, 0, 0, 0],
                },
                "frondL": {"dy": [0, 0, 0, 1, 1, 0, 0, 0]},
                "frondR": {"dy": [0, 0, 0, 1, 1, 0, 0, 0]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(6, "growing"),
            "palette": BUD_PALETTE,
            # Flowers before fruit. There is no elder anywhere that carries berries
            # under an umbel that has not opened.
            "hide": ["berriesL", "berriesR", "cheeks"],
            "swap": {
                "head": MID_HEAD,
                "brim": BUD_BRIM,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": MID_HEAD_LEFT, "right": MID_HEAD_RIGHT},
                "brim": {"tipped": BUD_BRIM_TIPPED},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                    "shut": YOUNG_EYES["shut"],
                },
                "mouth": {"wide": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": MID_HEAD_AT,
                "brim": (6, 7),
                "frondL": (0, 19),
                "frondR": (22, 19),
                "stem": (14, 21),
                **seat_young(
                    MID_HEAD_AT, MID_HEAD, cheeks=False, eye_dy=1, mouth_dy=4
                ),
            },
            # A stiff hat only goes so far. It comes down to the brow and stops there —
            # the two frames of complete shade are the adult's, and they are what makes
            # the adult's version a courtesy rather than a nod.
            "motion": {
                "brim": {
                    "art": [None, None, "tipped", "tipped", "tipped", "tipped", None,
                            None, None, None],
                    "dy": [0, 0, 2, 4, 5, 4, 2, 0, 0, 0],
                },
                "head": {
                    "dy": [0, 0, 1, 1, 2, 1, 0, 0, 0, 0],
                    "art": [None, None, None, None, None, None, "right", None, None,
                            None],
                },
                "eyes": {
                    "dy": [0, 0, 1, 1, 2, 1, 0, 0, 0, 0],
                    "dx": [0, 0, 0, 0, 0, 0, G_R_DX, 0, 0, 0],
                    "art": [None, "half", "half", "shut", "shut", "half", None, None,
                            "blink", None],
                },
                "mouth": {
                    "dy": [0, 0, 1, 1, 2, 1, 0, 0, 0, 0],
                    "dx": [0, 0, 0, 0, 0, 0, G_R_DX, 0, 0, 0],
                },
                "frondL": {"dy": [0, 0, 0, 1, 1, 1, 0, 0, 0, 0]},
                "frondR": {"dy": [0, 0, 0, 1, 1, 1, 0, 0, 0, 0]},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 6,
    # The brim is drawn AFTER the head, because the whole gesture is it coming down over
    # the face. Behind the head it would merely be a white shape near a creature.
    "parts": [
        {"name": "stem", "origin": (14, 21), "rows": STEM},
        {"name": "berriesL", "origin": (3, 15), "rows": BERRIES_L},
        {"name": "berriesR", "origin": (23, 15), "rows": BERRIES_R},
        {"name": "frondL", "origin": (0, 19), "rows": FROND_L},
        {"name": "frondR", "origin": (22, 19), "rows": FROND_R},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(HEAD_AT, HEAD, eyes="beady", mouth="line", eye_dy=2, mouth_dy=5),
        {
            "name": "brim",
            "origin": (3, 2),
            "rows": BRIM,
            "variants": {"tipped": BRIM_TIPPED},
        },
    ],
    #
    #  0    1     2     3     4     5     6     7     8     9    10   11   12    13
    # rest settle TIP   TIP   DOWN  DOWN  lift  lift  nod   nod  rest rest blink rest
    #
    # The tip is frames 2-7 and it is this sprite's trademark: the umbel comes down over
    # the eyes for two frames of complete shade, and lifts. At 6fps - the slowest in the
    # deck, shared with pine - the whole courtesy takes over two seconds, which is the
    # speed the character wants. The berries swing a beat behind, because weight lags.
    # Frame 0 is the rest pose reduced motion freezes on: hat up, face visible.
    "motion": {
        "brim": {
            "art": [None, None, "tipped", "tipped", "tipped", "tipped", "tipped",
                    None, None, None, None, None, None, None],
            "dy": [0, 0, 3, 6, 8, 8, 5, 2, 0, 0, 0, 0, 0, 0],
        },
        "head": {
            "art": [None, None, None, None, None, None, None, None, "right", None,
                    None, None, None, None],
            "dy": [0, 0, 1, 2, 2, 2, 1, 0, 1, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, "half", "half", "shut", "shut", "shut", "shut", "half",
                    None, None, None, None, "blink", None],
            "dy": [0, 0, 1, 2, 2, 2, 1, 0, 1, 0, 0, 0, 0, 0],
        },
        "cheeks": {"dy": [0, 0, 1, 2, 2, 2, 1, 0, 1, 0, 0, 0, 0, 0]},
        "mouth": {
            "art": [None, None, None, None, None, None, None, None, "frown", "frown",
                    None, None, None, None],
            "dy": [0, 0, 1, 2, 2, 2, 1, 0, 1, 0, 0, 0, 0, 0],
        },
        # A beat behind the hat in both directions. Fruit this heavy does not start or
        # stop when the branch does.
        "berriesL": {
            "dy": [0, 0, 0, 1, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0],
            "dx": [0, 0, 0, 0, -1, -1, 0, 1, 1, 0, 0, 0, 0, 0],
        },
        "berriesR": {
            "dy": [0, 0, 0, 1, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0],
            "dx": [0, 0, 0, 0, 1, 1, 0, -1, -1, 0, 0, 0, 0, 0],
        },
        "frondL": {"dy": [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0]},
        "frondR": {"dy": [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
