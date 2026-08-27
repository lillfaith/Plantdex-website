"""Dandelion (Taraxacum officinale) - creature portrait sprite.

THE DESIGN HOOK: dandelion is "dent de lion", lion's tooth. So the ray florets become a
golden MANE around a face and the plant reads as a small sun-lion. That is a creature
the species itself supplies rather than one bolted onto a flower, and every identifying
trait does double duty: the mane IS the ray-floret head, the arms ARE the deeply toothed
basal leaves, and the palette is the plant's own gold and green.

PSEUDO-3D. Offsetting a flat drawing up and down is a bobbing sticker; this head has
five poses and the loop moves between them:

  neutral / squash / stretch / turned left / turned right

Squash and stretch are the head genuinely widening as it lands and narrowing as it
leaves - weight, not just position. The turns work because two things move at once: the
face slides across the head AND the highlight slides the other way. Move only the face
and the eyes look like they are wandering on a flat disc; move only the light and it
looks like the sun moved. Together the head reads as rotating.

All five come from the same generator in `_flowerhead.py` - a lobed polar curve carved
with a face oval and lit by position - so a pose is a few numbers rather than another
grid to draw and keep in sync. That is what makes this affordable across 45 species.

PERSONALITY: energetic and resilient, the weed that comes back through tarmac. The loop
is a performance rather than a cycle: it crouches, springs, hangs at the top looking
about, lands heavily, then glances around and blinks. Arms lag the body a beat, and they
move asymmetrically - both arms doing the same thing on the same frame is what makes a
sprite look mechanical.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference for anyone
actually looking at a plant outdoors.
"""

from _face import EYES, face_box, face_shift
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks

# Authored at 32x28. Softened palette: desaturated golds, a plum outline rather than
# near-black, gentler greens - the previous set read as poster paint against the deck's
# violet.
PALETTE = {
    "o": (74, 48, 92, 255),      # outline
    "H": (250, 234, 191, 255),   # mane highlight
    "M": (230, 198, 123, 255),   # mane mid
    "D": (222, 166, 81, 255),    # mane deep
    "S": (205, 128, 39, 255),    # mane shadow
    "F": (255, 247, 224, 255),   # face
    "E": (86, 58, 104, 255),     # eye
    "W": (255, 255, 255, 255),   # eye glint
    "c": (240, 168, 180, 255),   # cheek
    "G": (204, 225, 100, 255),   # leaf light
    "g": (160, 186, 72, 255),    # leaf mid
    "d": (113, 137, 53, 255),     # leaf dark
}

HEAD_W, HEAD_H = 27, 25
CX, CY = 13.0, 12.0
RX, RY = 10.5, 10.5
LOBES, AMP = 8, 0.20
FACE_RX, FACE_RY = 5.9, 5.3


def _pose(rx=RX, ry=RY, face_dx=0.0, face_dy=0.0, light=(-0.85, -0.65)):
    return flower_head(
        HEAD_W, HEAD_H, CX, CY, rx, ry, LOBES, AMP, FACE_RX, FACE_RY,
        face_dx=face_dx, face_dy=face_dy, light=light,
    )


HEAD = _pose()
# Wider and shorter, face settling low: the head carrying its own weight on landing.
HEAD_SQUASH = _pose(rx=RX + 0.8, ry=RY - 1.0, face_dy=0.8)
# Narrower and taller, face riding high: the head pulling away as it leaves the ground.
HEAD_STRETCH = _pose(rx=RX - 0.7, ry=RY + 1.1, face_dy=-0.7)
# Turns: face one way, highlight the other.
HEAD_LEFT = _pose(face_dx=-1.8, light=(-0.35, -0.65))
HEAD_RIGHT = _pose(face_dx=1.8, light=(-1.25, -0.65))
# Three-quarter: the face is nearly at the rim and the light has swung right round.
HEAD_FAR_LEFT = _pose(face_dx=-3.6, light=(0.35, -0.55))
HEAD_FAR_RIGHT = _pose(face_dx=3.6, light=(-1.75, -0.55))
# The back of the head - no face at all. This is the frame that turns a wobble into a
# spin: without it the face merely slides to one side and slides back.
HEAD_BACK = flower_head(
    HEAD_W, HEAD_H, CX, CY, RX, RY, LOBES, AMP, 0, 0, light=(0.0, -0.9),
)

# Two-pixel eyes with a glint, three pixels apart. At a narrower face they merged into
# one dark band, and single-pixel dots vanished against the cream - nine pixels of face
# is what it takes for a readable pair.
EYES_OPEN = [
    "WE   WE",
    "EE   EE",
]

EYES_CLOSED = [
    "       ",
    "EE   EE",
]

# Half-lidded, for the frame either side of a blink. A blink that snaps straight from
# open to shut reads as a glitch; one frame of lid on the way down is all it takes.
EYES_HALF = [
    "oE   oE",
    "EE   EE",
]

EYES_HIDDEN = [
    "       ",
]

CHEEKS = [
    "c     c",
]

# The mouth carries the expression the eyes cannot: a small smile at rest, an open grin
# on the landing, and nothing at all while the head is turned away.
MOUTH_SMILE = [
    "o   o",
    " ooo ",
]

MOUTH_GRIN = [
    "ooooo",
    "oMMMo",
    " ooo ",
]

MOUTH_HIDDEN = [
    "     ",
]

# The blush goes with the face when the head turns away.
CHEEKS_HIDDEN = [
    "       ",
]

# The head's own taper ends in gold; this green stem and base replaces it, so the flower
# sits on something plainly a plant.
BODY = [
    "ogGgo",
    "ogGgo",
    "odgdo",
    " ooo ",
]

# The toothed basal leaves, doing duty as arms. Drawn BEHIND the head so each blade
# emerges from among the petals - out beside the flower they read as loose green slivers
# with background showing through the join.
ARM_L = [
    "      ooo",
    "  ooooGGGGo",
    "oGGGGGGGGGo",
    "oGdoggdGGGo",
    " oo ooooooo",
]

# Raised: the blade swept up, for the frames where the arm throws itself into the jump.
ARM_L_UP = [
    "        ooo",
    "     oooGGGo",
    "  oooGGGGGGo",
    "oGGGGGGGGGGo",
    " oGdoggdGGGo",
    "  oo ooooooo",
]

ARM_R = [
    "ooo",
    "oGGGGoooo",
    "oGGGGGGGGGo",
    "oGGGdggodGo",
    "ooooooo oo",
]

ARM_R_UP = [
    "ooo",
    "oGGGooo",
    "oGGGGGGooo",
    "oGGGGGGGGGo",
    "oGGGdggodGo",
    "ooooooo oo",
]

# --- Growth stages -----------------------------------------------------------
#
# THE SAME LION, YOUNGER. The adult's trademark is that it commits: it crouches, springs,
# spins all the way through its own back and lands grinning. Each younger stage is that
# same performance with the follow-through taken out — so the spin stays earned, and is
# the thing mastery actually buys.
#
# THE BOTANY DECIDES WHAT IS DRAWN, not the wish for a cute baby version:
#
#   sprout    the basal rosette. Toothed leaves and NO flower of any kind, because a
#             dandelion seedling has not made one — this is the plant's whole first
#             season. The face rides on the rosette itself.
#   growing   in bud. One tight, plump, green-bracted head on a hollow stem, gold only
#             just visible at the tip. A bud is a different organ from an open bloom,
#             which is the entire reason this stage is worth drawing.
#   flowering the open ray-floret head — the mane, and the authored adult, unchanged.
#
# The face never goes, at any stage. The point of staging these is that the player
# watches THEIR creature grow up, so it has to stay recognisably itself throughout.

# --- Sprout: the rosette, no flower at all ----------------------------------
ROSETTE_W, ROSETTE_H = 19, 13
ROSETTE_AT = (13, 14)


def _rosette(rx=9.0, ry=6.2, face_dx=0.0, face_dy=0.2, light=(-0.85, -0.65)):
    # `lobes=3, amp=0.07`: a rosette seen head on is a low mound of leaves, barely
    # scalloped. Nothing here may hint at a flower head, so it stays green and round.
    return flower_head(
        ROSETTE_W, ROSETTE_H, 9.0, 6.4, rx, ry, 3, 0.07, 5.2, 3.6,
        face_dx=face_dx, face_dy=face_dy, light=light, chars="GgddFo",
    )


ROSETTE = _rosette()
ROSETTE_SQUASH = _rosette(rx=9.4, ry=5.7, face_dy=0.6)
ROSETTE_LEFT = _rosette(face_dx=-1.3, light=(-0.30, -0.68))
ROSETTE_RIGHT = _rosette(face_dx=1.3, light=(-1.35, -0.68))

# The first true leaves: already deeply toothed, because the teeth are the identifying
# trait and a seedling has them, but a fraction of the adult blade and held low.
SEED_LEAF_L = [
    "   ooo",
    "oooGGGo",
    "oGdgGGo",
    "ooooooo",
]
SEED_LEAF_R = [
    "ooo   ",
    "oGGGooo",
    "oGGgdGo",
    "ooooooo",
]
# Short, and OVERLAPPING the rosette above it: a seedling is barely off the ground, and
# at rest a plant has to be one connected piece.
SEED_STEM = [
    "ogGgo",
    "ogGgo",
    "odgdo",
    " ooo ",
]

# --- Growing: one tight bud on a stem ---------------------------------------
BUD_PALETTE = {
    "B": (198, 222, 120, 255),   # bract highlight
    "b": (152, 184, 86, 255),    # bract mid
    "n": (112, 142, 60, 255),    # bract deep
    "N": (82, 106, 46, 255),     # bract shadow
}

BUD_W, BUD_H = 17, 15
BUD_AT = (14, 9)


def _bud(rx=7.6, ry=7.2, face_dx=0.0, face_dy=0.3, light=(-0.85, -0.65)):
    # Plump rather than narrow — a dandelion bud is a fat green knob, and `lobes=6,
    # amp=0.10` gives the bracts that wrap it without ever reading as petals.
    return flower_head(
        BUD_W, BUD_H, 8.0, 7.4, rx, ry, 6, 0.10, 5.2, 3.6,
        face_dx=face_dx, face_dy=face_dy, light=light, chars="BbnNFo",
    )


BUD = _bud()
BUD_SQUASH = _bud(rx=8.1, ry=6.6, face_dy=0.8)
BUD_STRETCH = _bud(rx=7.1, ry=7.9, face_dy=-0.5)
BUD_LEFT = _bud(face_dx=-1.6, light=(-0.32, -0.66))
BUD_RIGHT = _bud(face_dx=1.6, light=(-1.34, -0.66))

# Sized from the FACE this stage actually has, not copied from the adult's. The blush is
# by definition the thing nearest the rim, so it has no margin to give away — a hardcoded
# pair put both dots in the bracts.
BUD_CHEEKS = young_cheeks(face_box(BUD)[2])

BUD_LEAF_L = [
    "    ooo",
    " oooGGGo",
    "oGGGdgGo",
    " ooooooo",
]
BUD_LEAF_R = [
    "ooo    ",
    "oGGGooo",
    "oGgdGGo",
    "ooooooo",
]

# A dandelion carries its bud on a long hollow scape, and that stalk is most of the extra
# height this stage gains. Growing up is largely growing a stem.
BUD_STEM = [
    "ogGgo",
    "ogGgo",
    "ogGgo",
    "ogGgo",
    "ogGgo",
    "odgdo",
    " ooo ",
]

# A turned face slides ACROSS its own head, so features travel the head's offset plus
# this. Measured from the finished rows, because the carve and the lighting move the face
# patch by a different amount than `face_dx` suggests — that mismatch is how an eye ends
# up in the mane.
ROS_L_DX, _ = face_shift(ROSETTE, ROSETTE_LEFT)
ROS_R_DX, _ = face_shift(ROSETTE, ROSETTE_RIGHT)
BUD_L_DX, _ = face_shift(BUD, BUD_LEFT)
BUD_R_DX, _ = face_shift(BUD, BUD_RIGHT)

#  0     1       2      3      4      5      6      7
# rest  gather  lift   peek<  peek>  settle blink  rest
#
# The adult's loop with the nerve taken out: it gathers, rises a single pixel, checks both
# ways to see whether anyone noticed, and settles. Frame 0 is the resting pose that
# reduced motion freezes on.
SPROUT_BOB = [0, 1, -1, -1, -1, 0, 0, 0]
SPROUT_HEAD = [None, "squash", None, "left", "right", None, None, None]
SPROUT_DX = [0, 0, 0, ROS_L_DX, ROS_R_DX, 0, 0, 0]
SPROUT_BLINK = [None, None, None, None, None, None, "blink", None]

#  0     1       2       3     4     5      6     7      8      9
# rest  gather  launch  peak  peak  land   grin  look<  look>  rest
#
# A real hop now, and a grin on the landing. Still no spin.
GROW_BOB = [0, 1, -2, -3, -3, 1, 0, 0, 0, 0]
GROW_HEAD = [None, "squash", "stretch", None, None, "squash", None, "left", "right", None]
GROW_DX = [0, 0, 0, 0, 0, 0, 0, BUD_L_DX, BUD_R_DX, 0]
GROW_BLINK = [None] * 9 + ["blink"]
GROW_MOUTH = [None, None, None, None, None, "open", "open", None, None, None]


SPRITE = {
    "herbId": "taraxacum-officinale",
    "personality": "energetic",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(12, "sprout"),
            # The arms this creature uses ARE its basal leaves, so the rosette wears its
            # own smaller pair instead — and there is no flower part at all to hide.
            "swap": {
                "head": ROSETTE,
                "armL": SEED_LEAF_L,
                "armR": SEED_LEAF_R,
                "body": SEED_STEM,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "hide": ["cheeks"],
            "variants": {
                "head": {"squash": ROSETTE_SQUASH, "left": ROSETTE_LEFT,
                         "right": ROSETTE_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"]},
            },
            "origins": {
                "head": ROSETTE_AT,
                "body": (19, 24),
                "armL": (10, 23),
                "armR": (25, 23),
                **seat_young(ROSETTE_AT, ROSETTE, cheeks=False),
            },
            "motion": {
                "head": {"dy": SPROUT_BOB, "art": SPROUT_HEAD},
                "eyes": {"dy": SPROUT_BOB, "dx": SPROUT_DX, "art": SPROUT_BLINK},
                "mouth": {"dy": SPROUT_BOB, "dx": SPROUT_DX},
                "armL": {"dy": [0, 0, 0, 0, 0, 0, 0, 0]},
                "armR": {"dy": [0, 0, 0, 0, 0, 0, 0, 0]},
                "body": {"dy": [0, 0, 0, 0, 0, 0, 0, 0]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(12, "growing"),
            "palette": BUD_PALETTE,
            "swap": {
                "head": BUD,
                "armL": BUD_LEAF_L,
                "armR": BUD_LEAF_R,
                "body": BUD_STEM,
                "eyes": EYES["round"]["rows"],
                "mouth": YOUNG_MOUTH["rows"],
                "cheeks": BUD_CHEEKS,
            },
            "variants": {
                "head": {"squash": BUD_SQUASH, "stretch": BUD_STRETCH,
                         "left": BUD_LEFT, "right": BUD_RIGHT},
                "eyes": {"blink": EYES["round"]["blink"]},
                "mouth": {"open": YOUNG_MOUTH["open"]},
            },
            "origins": {
                "head": BUD_AT,
                "body": (19, 22),
                "armL": (11, 23),
                "armR": (24, 23),
                **seat_young(BUD_AT, BUD, eyes=EYES["round"], mouth_dy=3),
            },
            "motion": {
                "head": {"dy": GROW_BOB, "art": GROW_HEAD},
                "eyes": {"dy": GROW_BOB, "dx": GROW_DX, "art": GROW_BLINK},
                "cheeks": {"dy": GROW_BOB, "dx": GROW_DX},
                "mouth": {"dy": GROW_BOB, "dx": GROW_DX, "art": GROW_MOUTH},
                # The leaves lag the body, and asymmetrically: both arms doing the same
                # thing on the same frame is what makes a sprite look mechanical.
                "armL": {"dy": [0, 1, -1, -2, -2, 1, 0, 0, 0, 0]},
                "armR": {"dy": [0, 1, 0, -2, -2, 1, 0, 0, 0, 0]},
                "body": {"dy": [0, 1, 0, -1, -1, 1, 0, 0, 0, 0]},
            },
        },
    },
    "size": (44, 32),
    "frames": 16,
    "fps": 12,
    # Back to front: base, arms, head, then face details on top.
    "parts": [
        {"name": "body", "origin": (19, 25), "rows": BODY},
        {
            "name": "armL",
            "origin": (1, 19),
            "rows": ARM_L,
            "variants": {"up": ARM_L_UP},
        },
        {
            "name": "armR",
            "origin": (21, 19),
            "rows": ARM_R,
            "variants": {"up": ARM_R_UP},
        },
        {
            "name": "head",
            "origin": (3, 4),
            "rows": HEAD,
            "variants": {
                "squash": HEAD_SQUASH,
                "stretch": HEAD_STRETCH,
                "left": HEAD_LEFT,
                "right": HEAD_RIGHT,
                "farLeft": HEAD_FAR_LEFT,
                "farRight": HEAD_FAR_RIGHT,
                "back": HEAD_BACK,
            },
        },
        {
            "name": "eyes",
            "origin": (13, 14),
            "rows": EYES_OPEN,
            "variants": {"blink": EYES_CLOSED, "half": EYES_HALF, "hidden": EYES_HIDDEN},
        },
        {
            "name": "cheeks",
            "origin": (13, 17),
            "rows": CHEEKS,
            "variants": {"hidden": CHEEKS_HIDDEN},
        },
        {
            "name": "mouth",
            "origin": (15, 19),
            "rows": MOUTH_SMILE,
            "variants": {"grin": MOUTH_GRIN, "hidden": MOUTH_HIDDEN},
        },
    ],
    #
    #  0     1      2      3      4     5      6      7     8     9    10    11    12   13   14  15
    # rest crouch launch peak  SPIN> SPIN>> BACK  <SPIN <SPIN land  GRIN  grin settle look blink rest
    #
    # The spin is frames 4-8 and it is this sprite's trademark: nothing else in the set
    # turns all the way round. Frame 0 is the rest pose reduced motion freezes on.
    "motion": {
        "head": {
            "art": [None, "squash", "stretch", None, "right", "farRight", "back",
                    "farLeft", "left", "squash", None, None, None, "right", None, None],
            "dy": [0, 1, -2, -4, -4, -4, -4, -4, -3, 1, 0, 0, 0, 0, 0, 0],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        },
        # The face rides round with the head and vanishes for the frames it is facing
        # away. Hiding it is what makes the back of the head land as a back of a head.
        "eyes": {
            "art": [None, None, None, None, None, None, "hidden", None, None, None,
                    None, None, None, None, "blink", "half"],
            # The grin is three rows deep where the small mouth is one, so it rides a
            # pixel higher - otherwise its bottom lip hangs off the face into the mane.
            "dy": [0, 1, -2, -4, -4, -4, -4, -4, -3, 0, -1, -1, 0, 0, 0, 0],
            "dx": [0, 0, 0, 0, 2, 4, 0, -4, -2, 0, 0, 0, 0, 3, 0, 0],
        },
        "cheeks": {
            "art": [None, None, None, None, None, None, "hidden", None, None, None,
                    None, None, None, None, None, None],
            # The grin is three rows deep where the small mouth is one, so it rides a
            # pixel higher - otherwise its bottom lip hangs off the face into the mane.
            "dy": [0, 1, -2, -4, -4, -4, -4, -4, -3, 0, -1, -1, 0, 0, 0, 0],
            "dx": [0, 0, 0, 0, 2, 4, 0, -4, -2, 0, 0, 0, 0, 3, 0, 0],
        },
        # Open-mouthed on the landing: the payoff the whole jump is for.
        "mouth": {
            "art": [None, None, "hidden", "hidden", "hidden", "hidden", "hidden",
                    "hidden", "hidden", "grin", "grin", "grin", None, None, None, None],
            # The grin is three rows deep where the small mouth is one, so it rides a
            # pixel higher - otherwise its bottom lip hangs off the face into the mane.
            "dy": [0, 1, -2, -4, -4, -4, -4, -4, -3, 0, -1, -1, 0, 0, 0, 0],
            "dx": [0, 0, 0, 0, 2, 4, 0, -4, -2, 0, 0, 0, 0, 3, 0, 0],
        },
        "body": {"dy": [0, 1, 0, -1, -1, -1, -1, -1, -1, 1, 1, 0, 0, 0, 0, 0]},
        # Both arms fly up for the spin - it is the one moment this creature commits
        # completely - then trail on the way down.
        "armL": {
            "art": [None, None, "up", "up", "up", "up", "up", "up", "up", None, None,
                    None, None, None, None, None],
            "dy": [0, 1, -1, -3, -3, -3, -3, -3, -2, 1, 0, 0, 0, 0, 0, 0],
            "dx": [0, 0, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, -1, 0, 0],
        },
        "armR": {
            "art": [None, None, None, "up", "up", "up", "up", "up", "up", None, None,
                    None, None, None, None, None],
            "dy": [0, 1, 0, -2, -3, -3, -3, -3, -2, 1, 0, 0, 0, 0, 0, 0],
            "dx": [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0],
        },
    },
    "palette": PALETTE,
}
