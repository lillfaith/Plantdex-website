"""Stinging Nettle (Urtica dioica) - creature portrait sprite.

THE DESIGN HOOK: nettle has no showy flower at all. Measured from the card panel, its
green is 5% of the crop and spread right across it, with no concentration anywhere - the
plant IS its leaves. So the creature is built from them: a pair of big sharply toothed
leaves raised like ears over a small wary face, and two more held out low in front like
a guard.

WHERE THE FACE GOES. On the plant's most recognisable structure - which here is the leaf
mass itself, so the face sits directly in it rather than beneath a crown. Three species,
one rule, three different answers: dandelion wears its face IN the flower, yarrow and
mullein wear theirs BELOW one, and nettle has no flower to wear.

The stinging hairs are the other identifying trait, and they are the reason this sprite
gets a colour nothing else in the deck uses: a pale sting-white stipple along the leaf
edges. It is also why the eyes are narrower than the others' - this one is watching you.

PERSONALITY: it gets ANGRY. Its trademark gesture is a snarl - brows down, mouth open
on its sting-white teeth, bristled, lunging at you - then a slow return to a wary
squint. Nothing else in the set has eyebrows or bares anything.

Originally: alert and defensive, and the only sprite here that does not sway. It holds
still, flicks - two frames, no easing - and holds again, with the leaves snapping up on
the flick. Where the dandelion springs and the mullein settles, this one FLINCHES. 12fps
so the snaps land hard, and long holds between them so the stillness reads as watching
rather than as a paused animation.

SAFETY: a portrait, never an identification aid. Nettle stings on contact, the card says
so, and this sprite is deliberately stylised - the card art and the identification
section remain the reference for anyone actually looking at a plant outdoors.
"""

from _face import face_box, face_shift
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks

# Authored at 32x28, the house size.
PALETTE = {
    "o": (74, 48, 92, 255),      # outline
    "G": (153, 222, 131, 255),   # leaf highlight
    "g": (114, 183, 100, 255),    # leaf mid
    "d": (81, 148, 73, 255),     # leaf deep
    "n": (48, 80, 48, 255),      # leaf shadow
    "F": (226, 240, 214, 255),   # face
    "E": (86, 58, 104, 255),     # eye
    "c": (232, 168, 168, 255),   # cheek
    "s": (232, 247, 225, 255),   # stinging hairs
    "r": (188, 152, 117, 255),    # stem
}

BODY_W, BODY_H = 19, 18


def _body(face_dx=0.0, light=(-0.85, -0.65), amp=0.16):
    return flower_head(
        BODY_W, BODY_H, 9.0, 8.5, 8.2, 8.0, 5, amp, 5.4, 4.8,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


BODY = _body()
BODY_LEFT = _body(face_dx=-1.6, light=(-0.35, -0.65))
BODY_RIGHT = _body(face_dx=1.6, light=(-1.25, -0.65))
# Bristled: the same body with the lobes driven hard, so the silhouette spikes outward
# on the flick. A cat's hackles, done with a polar curve.
BODY_BRISTLE = _body(amp=0.30)

# Narrow, level eyes rather than the round ones the others use - the difference between
# a plant that is pleased to see you and one that is not.
EYES_OPEN = [
    "E     E",
    "EE   EE",
]

EYES_NARROW = [
    "       ",
    "EE   EE",
]

EYES_CLOSED = [
    "       ",
    "oo   oo",
]

CHEEKS = [
    "c       c",
]

# Furious: the eyes shrink to hard points under the brows.
EYES_ANGRY = [
    "       ",
    "E     E",
]

# The brows are the whole gesture. Slanted down toward the middle is a scowl; nothing
# else in this set has them, and they are what turns "wary" into "angry".
BROWS_NONE = [
    " ",
]

BROWS_ANGRY = [
    "o       o",
    " oo   oo ",
]

# Mouth: a flat wary line, then an open jagged snarl. The teeth are the sting.
MOUTH_FLAT = [
    " ooo ",
]

MOUTH_SNARL = [
    "ososo",
    "ooooo",
]

# The toothed ears. Deep triangular teeth on both edges, which is the trait that makes a
# nettle leaf unmistakable, and the stinging hairs picked out along the upper edge.
EAR_L = [
    "    os",
    "   osGo",
    "  osGGGo",
    " osGGGGdo",
    "osGGGgddno",
    " ogGgdnno",
    "  ogdno",
    "   ono",
]

EAR_L_UP = [
    "   os",
    "  osGo",
    " osGGGo",
    "osGGGGdo",
    "osGGGgddno",
    " ogGgdnno",
    "  ogdno",
    "   ono",
]

EAR_R = [
    "so",
    "oGso",
    "oGGGso",
    "odGGGGso",
    "onndgGGGso",
    " onndgGgo",
    "   ondgo",
    "    ono",
]

EAR_R_UP = [
    "    so",
    "   oGso",
    "  oGGGso",
    " odGGGGso",
    "onndgGGGso",
    " onndgGgo",
    "   ondgo",
    "    ono",
]

# Low guard leaves, held out in front. Shorter and blunter than the ears so the
# silhouette does not turn into four identical spikes.
GUARD_L = [
    "   oso",
    " osGGdo",
    "osGGgdno",
    " ogdnno",
    "  ooo",
]

GUARD_R = [
    "oso",
    "odGGso",
    "onndGGso",
    " onndgo",
    "   ooo",
]

STEM = [
    "orro",
    "orro",
    " oo ",
]

# --- Growth stages -----------------------------------------------------------
#
# THE SAME ALERT NETTLE, YOUNGER — and the sting is there from the first leaf, because it
# is. A nettle seedling stings exactly as much as an adult one does, so nothing here gets
# softened: the hairs are on every stage, and the scowl only deepens.
#
# NETTLE IS THE AWKWARD FLOWERING CASE. Its flowers are not a bloom at all — they are
# inconspicuous green CATKINS that dangle in the leaf axils, which is why the deck's own
# adult portrait has no flower part to close up. So the middle stage grows them where they
# actually grow: on the guard leaves, hanging from the joint. That is the plant's real
# behaviour rather than a bud invented to fill the slot.
#
#   sprout    two leaves and a stem, stinging already, no catkins.
#   growing   catkins forming in the axils, still short and tight.
#   flowering the full plant, unchanged.

# --- Sprout: two leaves, already stinging -----------------------------------
YOUNG_BODY_W, YOUNG_BODY_H = 15, 11
YOUNG_BODY_AT = (8, 15)


def _young_body(rx=6.6, ry=5.0, face_dx=0.0, light=(-0.85, -0.65), amp=0.16):
    return flower_head(
        YOUNG_BODY_W, YOUNG_BODY_H, 7.0, 5.4, rx, ry, 7, amp, 5.2, 3.4,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_BODY = _young_body()
YOUNG_BODY_LEFT = _young_body(face_dx=-1.2, light=(-0.35, -0.65))
YOUNG_BODY_RIGHT = _young_body(face_dx=1.2, light=(-1.25, -0.65))
# Bristling: the same body with the serrations pushed out. A young nettle that could not
# bristle would be the one softening this species allows itself, so it can.
YOUNG_BODY_BRISTLE = _young_body(amp=0.26)

SEED_EAR_L = [
    "  os",
    " osGGdo",
    "osGGgdno",
    " ogdnno",
    "  oo",
]
SEED_EAR_R = [
    "so  ",
    "odGGso",
    "onndGGso",
    " onndgo",
    "  oo",
]
SEED_STEM = [
    "oro",
    "oro",
    "ooo",
]

# --- Growing: catkins in the axils ------------------------------------------
#
# Short, tight and GREEN, hanging from the leaf joint. Nothing about a nettle's flowering
# is showy and drawing it showy would be inventing a different plant.
GUARD_L_CATKIN = [
    "   oso",
    " osGGdo",
    "osGGgdno",
    " ogdnno",
    "  oodo",
    "   odo",
    "   oo",
]
GUARD_R_CATKIN = [
    "oso",
    "odGGso",
    "onndGGso",
    " onndgo",
    " odoo",
    " odo",
    " oo",
]

BUD_BODY_AT = (7, 14)


def _bud_body(rx=7.8, ry=6.6, face_dx=0.0, light=(-0.85, -0.65), amp=0.16):
    return flower_head(
        17, 15, 8.0, 7.0, rx, ry, 7, amp, 5.4, 4.0,
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

# It watches, and bristles when something gets close. Faster than most stages in the deck
# even when young, because being quick to react IS this creature.
S_BOB = [0, 0, -1, -1, 0, 0, 0, 0]
S_BODY = [None, "left", None, "bristle", "bristle", "right", None, None]
S_DX = [0, S_L_DX, 0, 0, 0, S_R_DX, 0, 0]
S_BLINK = [None, None, None, None, None, None, "blink", None]

G_BOB = [0, 0, -1, -1, -1, 0, 0, 0, 0, 0]
G_BODY = [None, "left", None, "bristle", "bristle", "bristle", "right", None, None, None]
G_DX = [0, G_L_DX, 0, 0, 0, 0, G_R_DX, 0, 0, 0]
G_BLINK = [None] * 8 + ["blink", None]


SPRITE = {
    "herbId": "urtica-dioica",
    "personality": "alert",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(12, "sprout"),
            # No catkins yet, and no lower guard leaves — a seedling is two leaves and a
            # stem. The brows go with the smaller face; the scowl lives in the eyes.
            "hide": ["guardL", "guardR", "brows", "cheeks"],
            "swap": {
                "body": YOUNG_BODY,
                "earL": SEED_EAR_L,
                "earR": SEED_EAR_R,
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
                "earL": (3, 16),
                "earR": (21, 16),
                "stem": (14, 23),
                **seat_young(YOUNG_BODY_AT, YOUNG_BODY, cheeks=False, eye_dy=1, mouth_dy=3),
            },
            "motion": {
                "body": {"dy": S_BOB, "art": S_BODY},
                "eyes": {"dy": S_BOB, "dx": S_DX, "art": S_BLINK},
                "mouth": {"dy": S_BOB, "dx": S_DX},
                "earL": {"dy": [0] * 8},
                "earR": {"dy": [0] * 8},
                "stem": {"dy": [0] * 8},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(12, "growing"),
            "hide": ["brows"],
            "swap": {
                "body": BUD_BODY,
                "guardL": GUARD_L_CATKIN,
                "guardR": GUARD_R_CATKIN,
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
                "earL": (2, 13),
                "earR": (20, 13),
                "guardL": (4, 19),
                "guardR": (21, 19),
                "stem": (14, 23),
                **seat_young(BUD_BODY_AT, BUD_BODY, eye_dy=2, mouth_dy=5),
            },
            "motion": {
                "body": {"dy": G_BOB, "art": G_BODY},
                "eyes": {"dy": G_BOB, "dx": G_DX, "art": G_BLINK},
                "cheeks": {"dy": G_BOB, "dx": G_DX},
                "mouth": {"dy": G_BOB, "dx": G_DX},
                "earL": {"dy": [0] * 10},
                "earR": {"dy": [0] * 10},
                "guardL": {"dy": [0] * 10},
                "guardR": {"dy": [0] * 10},
                "stem": {"dy": [0] * 10},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 12,
    # Back to front: stem, ears behind the head, guards in front of it, then the face.
    "parts": [
        {"name": "stem", "origin": (14, 22), "rows": STEM},
        {
            "name": "earL",
            "origin": (4, 8),
            "rows": EAR_L,
            "variants": {"up": EAR_L_UP},
        },
        {
            "name": "earR",
            "origin": (18, 8),
            "rows": EAR_R,
            "variants": {"up": EAR_R_UP},
        },
        {
            "name": "body",
            "origin": (7, 8),
            "rows": BODY,
            "variants": {"left": BODY_LEFT, "right": BODY_RIGHT, "bristle": BODY_BRISTLE},
        },
        {"name": "guardL", "origin": (4, 19), "rows": GUARD_L},
        {"name": "guardR", "origin": (21, 19), "rows": GUARD_R},
        {
            "name": "eyes",
            "origin": (13, 15),
            "rows": EYES_OPEN,
            "variants": {
                "blink": EYES_CLOSED,
                "narrow": EYES_NARROW,
                "angry": EYES_ANGRY,
            },
        },
        {
            "name": "brows",
            "origin": (12, 13),
            "rows": BROWS_NONE,
            "variants": {"angry": BROWS_ANGRY},
        },
        {"name": "cheeks", "origin": (12, 18), "rows": CHEEKS},
        {
            "name": "mouth",
            "origin": (14, 18),
            "rows": MOUTH_FLAT,
            "variants": {"snarl": MOUTH_SNARL},
        },
    ],
    #
    #  frame  0    1     2     3      4      5      6     7     8      9     10   11
    #       rest hold  FLICK FLICK  hold   hold  narrow hold  FLICK  FLICK hold rest
    #
    # No easing anywhere: every move is a two-frame snap between holds. Easing is what
    # would make this one look calm, which is the opposite of the brief.
    #
    #  0    1     2      3      4      5      6      7     8     9    10   11   12   13
    # watch watch NOTICE BROWS LUNGE! LUNGE! SNARL SNARL back  squint squint watch watch rest
    #
    # The anger is frames 2-7 and it is this sprite's trademark: brows down, mouth open,
    # bristled, and lunging AT you. Nothing else in the set has eyebrows. Frame 0 is the
    # rest pose reduced motion freezes on: level, wary, mouth shut.
    "motion": {
        "body": {
            "art": [None, None, "bristle", "bristle", "bristle", "bristle", "bristle",
                    "bristle", None, None, None, None, None, None],
            # Forward and DOWN on the lunge - a creature dropping its weight to spring,
            # not hopping. The 1px jitter in the holds never resolves.
            "dx": [0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0],
            "dy": [0, 0, -1, -1, 0, 1, 1, 0, -1, 0, 0, 0, 0, 0],
        },
        "brows": {
            "art": [None, None, "angry", "angry", "angry", "angry", "angry", "angry",
                    "angry", None, None, None, None, None],
            "dx": [0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0],
            "dy": [0, 0, -1, -1, 0, 1, 1, 0, -1, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, "narrow", None, "angry", "angry", "angry", "angry", "angry",
                    "narrow", "narrow", "narrow", None, "blink", None],
            "dx": [0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0],
            "dy": [0, 0, -1, -1, 0, 1, 1, 0, -1, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0],
            "dy": [0, 0, -1, -1, 0, 1, 1, 0, -1, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, None, "snarl", "snarl", "snarl", "snarl", "snarl",
                    None, None, None, None, None, None],
            "dx": [0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0],
            "dy": [0, 0, -1, -1, 0, 1, 1, 0, -1, 0, 0, 0, 0, 0],
        },
        # The ears flatten BACK on the lunge rather than rising - a cat pinning its ears
        # before it strikes. They only stand up again once the anger has passed.
        "earL": {
            "art": [None, None, "up", "up", None, None, None, None, "up", None, None,
                    None, None, None],
            "dy": [0, 0, -2, -2, 1, 2, 2, 1, -1, 0, 0, 0, 0, 0],
            "dx": [0, 0, 1, 1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        "earR": {
            "art": [None, None, "up", "up", None, None, None, None, "up", None, None,
                    None, None, None],
            "dy": [0, 0, -2, -2, 1, 2, 2, 1, -1, 0, 0, 0, 0, 0],
            "dx": [0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        # The guards thrust forward and stay out through the whole snarl.
        "guardL": {"dx": [0, 0, -1, -1, -2, -2, -2, -2, -1, 0, 0, 0, 0, 0]},
        "guardR": {"dx": [0, 0, 1, 1, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
