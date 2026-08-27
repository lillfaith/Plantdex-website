"""Lamb's Quarters (Chenopodium album) - creature portrait sprite.

THE DESIGN HOOK: its other name is goosefoot, for the shape of the leaf, and `album` -
white - is for the mealy bloom that dusts every new shoot as if it had been floured.
Both of those are gifts to a sprite: it gets actual FEET, and it gets a colour nothing
else in the deck has, a chalky off-white sitting on green.

WHERE THE FACE GOES: in the leafy crown, dusted with the same meal.

PERSONALITY: unhurried and faintly comic. Its trademark gesture is THE WADDLE - it
lifts one goosefoot, plants it, lifts the other, and shuffles a step sideways before
coming back. It is the only sprite in the deck that WALKS, and the reason it can is that
the plant handed it feet.

The mealy bloom puffs loose each time a foot lands, which is the second thing its own
botany pays for.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

PALETTE = {
    **FACE_PALETTE,
    "G": (165, 195, 129, 255),   # leaf highlight - dusty, never fresh
    "g": (125, 159, 95, 255),   # leaf mid
    "d": (91, 117, 73, 255),     # leaf deep
    "n": (67, 89, 55, 255),      # leaf shadow
    "A": (237, 241, 225, 255),   # the mealy bloom - `album` itself
    "a": (206, 214, 192, 255),   # bloom, thinner
    "r": (176, 126, 98, 255),   # the red-streaked stem this plant is known for
}

HEAD_W, HEAD_H = 19, 16


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        HEAD_W, HEAD_H, 9.0, 8.0, 8.6, 7.4, 6, 0.14, 5.0, 4.2,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))

# The mealy dusting over the crown. It is what the species name means and it is the only
# chalk-white in the deck.
MEAL = [
    " A  a   A  a",
    "a  A  a   A",
]

# The goosefoot. Three blunt toes, splayed - which is exactly the leaf outline, so the
# feet are botanically the leaves and not a costume.
FOOT_DOWN = [
    "ooo ooo ooo",
    "oGGoGGGoGGo",
    "ogggggggggo",
    "oddddddddo",
    " ooooooooo",
]

FOOT_UP = [
    "ooo ooo ooo",
    "oGGoGGGoGGo",
    "oggggggggo",
    " oddddddo",
    "  oooooo",
]

# A puff of loosened meal, for the frame a foot lands.
PUFF_NONE = [
    " ",
]

PUFF = [
    "a   a",
    " A A ",
]

# The paired leaves down the stem, the diamond outline of a goosefoot leaf again.
LEAF_L = [
    "   oo",
    " ooGGo",
    "oGGgggo",
    " oggddo",
    "  oddo",
    "   oo",
]

LEAF_R = [
    "oo",
    "oGGoo",
    "oggggo",
    "oddggo",
    "oddo",
    "oo",
]

STEM = [
    "orgro",
    "orgro",
    "odgdo",
]

HEAD_AT = (7, 4)

# --- Growth stages -----------------------------------------------------------
#
# THE ONE SPECIES WHOSE MIDDLE STAGE IS NOT A BUD, and the reason is worth stating rather
# than working around. Lamb's quarters flowers in dense knots of tiny green mealy florets
# with no petals at all — inconspicuous enough that this card's portrait draws none. There
# is therefore no flower to close, and inventing one for the middle stage would leave that
# stage looking MORE advanced than the adult, which is backwards. So the ladder runs on
# the trait the plant is named twice for instead: the leaf.
#
#   sprout    strap-shaped COTYLEDONS, which is what lamb's quarters actually germinates
#             with — narrow, blunt, and nothing whatever like a goose's foot. So the
#             sprout has no feet, and therefore cannot waddle: it rocks where it stands.
#   growing   the goosefoot leaf arrives, small. It manages ONE step, not two.
#   flowering the full waddle — two steps, two puffs of meal. Unchanged.
#
# THE MEAL STAYS AT EVERY STAGE. `album` is the mealy white bloom, it dusts new shoots
# hardest of all, and it is the only chalk-white in the deck. A seedling without it would
# be the one thing here that contradicts its own species name.

# --- Sprout: cotyledons, and no feet to walk on -----------------------------
YOUNG_HEAD_AT = (10, 13)


def _young_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        15, 12, 7.0, 6.0, 7.2, 5.8, 6, 0.14, 5.4, 3.6,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.3, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.3, light=(-1.25, -0.65))

MEAL_YOUNG = [
    " A  a  A",
    "a  A  a",
]

# The seed leaves. Blunt straps, and the point of drawing them is that they have no toes:
# this creature has nothing to walk on yet.
COT_L = [
    "oooooo",
    "oGggddo",
    " oooooo",
]

COT_R = [
    "oooooo",
    "oddggGo",
    "oooooo",
]

# --- Growing: the goosefoot arrives -----------------------------------------
MID_HEAD_AT = (8, 9)


def _mid_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        17, 14, 8.0, 7.0, 8.0, 6.6, 6, 0.14, 5.4, 3.8,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


MID_HEAD = _mid_head()
MID_HEAD_LEFT = _mid_head(face_dx=-1.4, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_head(face_dx=1.4, light=(-1.25, -0.65))

# Three toes, smaller. The outline is the leaf outline, which is why the feet were never
# a costume in the first place.
FOOT_MID = [
    "oo oo oo",
    "oGoGGoGo",
    "oggggggo",
    " oooooo",
]

FOOT_MID_UP = [
    "oo oo oo",
    "oGoGGoGo",
    "oggggo",
    " oooo",
]

LEAF_L_MID = [
    "  oo",
    " oGGo",
    "oGgggo",
    " oggdo",
    "  ooo",
]

LEAF_R_MID = [
    "oo",
    "oGGo",
    "ogggGo",
    "oddggo",
    "ooo",
]

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(MID_HEAD, MID_HEAD_LEFT)
G_R_DX, _ = face_shift(MID_HEAD, MID_HEAD_RIGHT)

S_ROCK_DX = [0, 1, 1, 0, -1, -1, 0, 0]
S_ROCK_DY = [0, -1, 0, 0, -1, 0, 0, 0]

SPRITE = {
    "herbId": "chenopodium-album",
    "personality": "unhurried",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(8, "sprout"),
            # No feet means no landings, so nothing to puff. The leaves are the
            # cotyledons' job at this stage, so the stem pair goes too.
            "hide": ["puff", "leafL", "leafR", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "meal": MEAL_YOUNG,
                "footL": COT_L,
                "footR": COT_R,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"], "happy": YOUNG_EYES["happy"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "meal": (13, 15),
                "footL": (7, 24),
                "footR": (19, 24),
                "stem": (15, 22),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=1, mouth_dy=4
                ),
            },
            # It rocks side to side where it stands. The cotyledons never leave the
            # ground, because a strap-shaped seed leaf is not a foot.
            "motion": {
                "head": {
                    "dx": S_ROCK_DX,
                    "dy": S_ROCK_DY,
                    "art": [None, "right", "right", None, "left", "left", None, None],
                },
                "meal": {"dx": S_ROCK_DX, "dy": S_ROCK_DY},
                "eyes": {
                    "dx": [0, 1 + S_R_DX, 1 + S_R_DX, 0, -1 + S_L_DX, -1 + S_L_DX,
                           0, 0],
                    "dy": S_ROCK_DY,
                    "art": [None, None, "happy", None, None, "happy", "blink", None],
                },
                "mouth": {
                    "dx": [0, 1 + S_R_DX, 1 + S_R_DX, 0, -1 + S_L_DX, -1 + S_L_DX,
                           0, 0],
                    "dy": S_ROCK_DY,
                },
                "footL": {"dy": [0] * 8},
                "footR": {"dy": [0] * 8},
                "stem": {"lean": [0, 1, 1, 0, -1, -1, 0, 0]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(8, "growing"),
            "hide": ["cheeks"],
            "swap": {
                "head": MID_HEAD,
                "footL": FOOT_MID,
                "footR": FOOT_MID,
                "leafL": LEAF_L_MID,
                "leafR": LEAF_R_MID,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": MID_HEAD_LEFT, "right": MID_HEAD_RIGHT},
                "footL": {"up": FOOT_MID_UP},
                "footR": {"up": FOOT_MID_UP},
                "eyes": {"blink": YOUNG_EYES["blink"], "happy": YOUNG_EYES["happy"]},
            },
            "origins": {
                "head": MID_HEAD_AT,
                "meal": (11, 11),
                "leafL": (4, 17),
                "leafR": (23, 17),
                "footL": (6, 23),
                "footR": (18, 23),
                "stem": (14, 20),
                "puff": (9, 25),
                **seat_young(
                    MID_HEAD_AT, MID_HEAD, cheeks=False, eye_dy=1, mouth_dy=4
                ),
            },
            # ONE step. It lifts a foot, plants it, puffs once, and brings itself back.
            # The second step — and the whole sideways journey — is the adult's.
            "motion": {
                "head": {
                    "dx": [0, 1, 2, 2, 2, 1, 0, 0, 0, 0],
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0],
                    "art": [None, "right", "right", None, None, "left", None, None,
                            None, None],
                },
                "meal": {
                    "dx": [0, 1, 2, 2, 2, 1, 0, 0, 0, 0],
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0],
                },
                "eyes": {
                    "dx": [0, 1 + G_R_DX, 2 + G_R_DX, 2, 2, 1 + G_L_DX, 0, 0, 0, 0],
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0],
                    "art": [None, None, "happy", "happy", None, None, None, None,
                            "blink", None],
                },
                "mouth": {
                    "dx": [0, 1 + G_R_DX, 2 + G_R_DX, 2, 2, 1 + G_L_DX, 0, 0, 0, 0],
                    "dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0],
                },
                "footL": {
                    "art": [None, "up", "up", None, None, None, None, None, None, None],
                    "dx": [0, 1, 2, 2, 2, 2, 1, 0, 0, 0],
                    "dy": [0, -2, -1, 0, 0, 0, 0, 0, 0, 0],
                },
                "footR": {
                    "dx": [0, 0, 0, 1, 2, 2, 1, 0, 0, 0],
                    "dy": [0] * 10,
                },
                "puff": {
                    "art": [None, None, None, "left", None, None, None, None, None,
                            None],
                },
                "leafL": {"dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0]},
                "leafR": {"dy": [0, -1, 0, 0, 0, 0, 0, 0, 0, 0]},
                "stem": {"lean": [0, 1, 1, 1, 0, -1, 0, 0, 0, 0]},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "stem", "origin": (14, 19), "rows": STEM},
        {"name": "leafL", "origin": (3, 16), "rows": LEAF_L},
        {"name": "leafR", "origin": (23, 16), "rows": LEAF_R},
        {
            "name": "footL",
            "origin": (3, 22),
            "rows": FOOT_DOWN,
            "variants": {"up": FOOT_UP},
        },
        {
            "name": "footR",
            "origin": (18, 22),
            "rows": FOOT_DOWN,
            "variants": {"up": FOOT_UP},
        },
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        {"name": "meal", "origin": (10, 6), "rows": MEAL},
        *feature_parts(HEAD_AT, HEAD, eyes="round", mouth="smile", eye_dy=1, mouth_dy=4),
        {
            "name": "puff",
            "origin": (6, 24),
            "rows": PUFF_NONE,
            "variants": {"left": PUFF, "right": PUFF},
        },
    ],
    #
    #  0    1     2     3     4     5     6     7     8     9    10    11    12   13
    # rest  lift  STEP  land  lift  STEP  land shift shift back  back  rest blink rest
    #
    # The waddle is frames 1-6 and it is this sprite's trademark: one foot up, planted, a
    # puff of meal, then the other. Everything else in the deck is rooted to one spot;
    # this one changes where it is standing. Frame 0 is the rest pose reduced motion
    # freezes on - both feet flat on the ground.
    "motion": {
        # The whole plant travels with its feet, one pixel at a time, and comes back. A
        # walk that did not move the body would be a plant marching on the spot.
        "head": {
            "art": [None, "right", "right", None, "left", "left", None, None, None,
                    None, None, None, None, None],
            "dx": [0, 1, 2, 2, 1, 0, 0, -1, -1, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "meal": {
            "dx": [0, 1, 2, 2, 1, 0, 0, -1, -1, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, "happy", None, None, "happy", None, None, None, None,
                    None, None, "blink", None],
            "dx": [0, 2, 3, 2, -1, -2, 0, -1, -1, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 1, 2, 2, -1, -1, 0, -1, -1, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, "grin", "grin", "grin", "grin", None, None, None, None,
                    None, None, None, None],
            "dx": [0, 1, 2, 2, -1, -1, 0, -1, -1, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        # The feet alternate, and neither is ever off the ground while the other is. It
        # is a waddle, not a hop.
        "footL": {
            "art": [None, "up", "up", None, None, None, None, None, None, None,
                    None, None, None, None],
            "dx": [0, 1, 3, 3, 3, 3, 3, 2, 1, 0, 0, 0, 0, 0],
            "dy": [0, -2, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "footR": {
            "art": [None, None, None, None, "up", "up", None, None, None, None,
                    None, None, None, None],
            "dx": [0, 0, 0, 1, 2, 3, 3, 2, 1, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, -2, -1, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        # A puff of loosened meal on each landing, and nowhere else. It is the sound the
        # sprite cannot make.
        "puff": {
            "art": [None, None, None, "left", None, None, "right", None, None, None,
                    None, None, None, None],
            "dx": [0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0],
        },
        "leafL": {"dy": [0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
        "leafR": {"dy": [0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
        "stem": {"lean": [0, 1, 1, 0, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
