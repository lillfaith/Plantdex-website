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

from _face import EYES, MOUTHS, face_shift, on_face
from _flowerhead import flower_head

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
# THE SAME LION, YOUNGER AND SHYER. Not a smaller copy: the character has to survive the
# scaling down, so what changes is nerve. The adult's trademark is that it commits — it
# crouches, springs, spins all the way round and lands grinning. The seedling wants to do
# that and doesn't dare, so it gets the same gesture with the commitment taken out: a
# crouch that barely leaves the ground, and a peek to each side instead of a spin. Same
# performance, no follow-through. That is what reads as shy rather than merely small.
#
# WHAT IT HAS NOT GROWN YET IS BOTANY, NOT STYLING. A dandelion's mane IS its open
# ray-floret head and its arms ARE its basal leaves, so a seedling has a closed green bud
# and no arms because that is what a dandelion seedling is. The face never goes, at any
# stage — the whole point is that the player watches THEIR creature grow up.
#
# Baby proportions do the rest: `big` eyes on a head that is mostly face. It is the
# oldest trick there is and it is the reason a 15-pixel bud reads as young rather than
# just small.

BUD_PALETTE = {
    "B": (198, 222, 120, 255),   # bud highlight
    "b": (152, 184, 86, 255),    # bud mid
    "n": (112, 142, 60, 255),    # bud deep
    "N": (82, 106, 46, 255),     # bud shadow
}

# --- Sprout: a closed green bud with a face in it ---------------------------
# `lobes=5, amp=0.09` against the mane's `8, 0.20`: a bud is faintly ribbed by its
# bracts, not shaggy. Taller than it is wide, which is the other half of reading as a bud.
BUD_W, BUD_H = 17, 20
BUD_AT = (13, 8)


def _bud(rx=7.0, ry=9.2, face_dx=0.0, face_dy=0.4, light=(-0.85, -0.65)):
    return flower_head(
        BUD_W, BUD_H, 8.0, 9.6, rx, ry, 5, 0.09, 5.0, 4.4,
        face_dx=face_dx, face_dy=face_dy, light=light, chars="BbnNFo",
    )


BUD = _bud()
# Barely a crouch. The adult drops a whole pixel and widens; this widens by a fraction
# and thinks better of it.
BUD_SQUASH = _bud(rx=7.5, ry=8.6, face_dy=0.9)
# The peek. Where the adult turns all the way through its own back, this only goes far
# enough to look, and the light moves with it so the head still reads as turning.
BUD_LEFT = _bud(face_dx=-1.5, light=(-0.30, -0.68))
BUD_RIGHT = _bud(face_dx=1.5, light=(-1.35, -0.68))

# --- Growing: the head half open, the first leaves out ----------------------
# Gold ramp on bud radii — which is exactly what a dandelion looks like on the morning it
# opens, and it puts the species' own colour on screen one stage before the full mane.
BLOOM_W, BLOOM_H = 23, 22
BLOOM_AT = (10, 6)


def _half(rx=9.0, ry=9.4, face_dx=0.0, face_dy=0.3, light=(-0.85, -0.65)):
    return flower_head(
        BLOOM_W, BLOOM_H, 11.0, 10.6, rx, ry, 7, 0.15, 5.4, 4.8,
        face_dx=face_dx, face_dy=face_dy, light=light,
    )


HALF = _half()
HALF_SQUASH = _half(rx=9.7, ry=8.7, face_dy=1.0)
HALF_STRETCH = _half(rx=8.5, ry=10.2, face_dy=-0.6)
HALF_LEFT = _half(face_dx=-1.9, light=(-0.32, -0.66))
HALF_RIGHT = _half(face_dx=1.9, light=(-1.34, -0.66))

# A face that turns slides ACROSS its own head, so the features travel the head's offset
# plus this. Measured from the finished rows rather than inferred from `face_dx`, because
# the two are not the same number once the curve is carved and lit — that mismatch is how
# eyes end up sitting in the mane.
BUD_L_DX, _ = face_shift(BUD, BUD_LEFT)
BUD_R_DX, _ = face_shift(BUD, BUD_RIGHT)
HALF_L_DX, _ = face_shift(HALF, HALF_LEFT)
HALF_R_DX, _ = face_shift(HALF, HALF_RIGHT)

# Big eyes and a small mouth: young. `big` needs ten pixels of face to sit in, which is
# why both young heads are mostly face.
EYES_YOUNG = EYES["big"]
MOUTH_YOUNG = MOUTHS["small"]

# The first true leaves. Toothed already, because the teeth are the identifying trait and
# a seedling has them — but a third of the adult blade, and held close in rather than
# thrown wide.
LEAF_L = [
    "    ooo",
    " oooGGGo",
    "oGGGdgGo",
    " ooooooo",
]
LEAF_R = [
    "ooo    ",
    "oGGGooo ",
    "oGgdGGGo",
    "ooooooo ",
]


def _seat(head_at, head_rows, hide_cheeks=False):
    """Eyes, cheeks and mouth seated by MEASURING the head they sit on.

    Never by arithmetic on the radii that produced it: `flower_head` trims empty rows and
    the shading moves the face patch, so a head's parameters do not tell you where its
    face ended up. This is the rule the whole `_face` module exists to enforce.
    """
    seats = {
        "eyes": on_face(head_at, head_rows, EYES_YOUNG["rows"], dy=1),
        "mouth": on_face(head_at, head_rows, MOUTH_YOUNG["rows"], dy=5),
    }
    if not hide_cheeks:
        seats["cheeks"] = on_face(head_at, head_rows, CHEEKS_YOUNG, dy=4)
    return seats


CHEEKS_YOUNG = ["c    c"]

#  0     1       2      3      4      5      6     7
# rest  crouch  lift   peek<  peek>  settle blink rest
#
# The adult's loop in miniature and without the nerve: it gathers itself, rises a single
# pixel, checks both ways to see whether anyone noticed, and settles. Frame 0 is the
# resting pose reduced motion freezes on.
SPROUT_BOB = [0, 1, -1, -1, -1, 0, 0, 0]
SPROUT_HEAD = [None, "squash", None, "left", "right", None, None, None]
SPROUT_FACE_DX = [0, 0, 0, BUD_L_DX, BUD_R_DX, 0, 0, 0]
SPROUT_BLINK = [None, None, None, None, None, None, "blink", None]

#  0     1       2      3     4      5      6      7      8     9
# rest  crouch  launch peak  peak   land   grin   look<  look> rest
#
# A real hop now, and a grin on the landing — but still no spin. The spin is the adult's
# trademark and it stays earned; this stage gets everything up to it.
GROW_BOB = [0, 1, -2, -3, -3, 1, 0, 0, 0, 0]
GROW_HEAD = [None, "squash", "stretch", None, None, "squash", None, "left", "right", None]
GROW_FACE_DX = [0, 0, 0, 0, 0, 0, 0, HALF_L_DX, HALF_R_DX, 0]
GROW_BLINK = [None, None, None, None, None, None, None, None, None, "blink"]
GROW_MOUTH = [None, None, None, None, None, "open", "open", None, None, None]


SPRITE = {
    "herbId": "taraxacum-officinale",
    "personality": "energetic",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": 7,
            "palette": BUD_PALETTE,
            # No leaves at all: a dandelion seedling is a bud on a stem, and the arms
            # this creature would use ARE the basal leaves it has not grown.
            "hide": ["armL", "armR", "cheeks"],
            "swap": {
                "head": BUD,
                "eyes": EYES_YOUNG["rows"],
                "mouth": MOUTH_YOUNG["rows"],
            },
            "variants": {
                "head": {"squash": BUD_SQUASH, "left": BUD_LEFT, "right": BUD_RIGHT},
                "eyes": {"blink": EYES_YOUNG["blink"]},
            },
            "origins": {"head": BUD_AT, "body": (19, 25), **_seat(BUD_AT, BUD, True)},
            "motion": {
                "head": {"dy": SPROUT_BOB, "art": SPROUT_HEAD},
                "eyes": {"dy": SPROUT_BOB, "dx": SPROUT_FACE_DX, "art": SPROUT_BLINK},
                "mouth": {"dy": SPROUT_BOB, "dx": SPROUT_FACE_DX},
                "body": {"dy": [0, 0, 0, 0, 0, 0, 0, 0]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": 9,
            "swap": {
                "head": HALF,
                "eyes": EYES_YOUNG["rows"],
                "cheeks": CHEEKS_YOUNG,
                "mouth": MOUTH_YOUNG["rows"],
                "armL": LEAF_L,
                "armR": LEAF_R,
            },
            "variants": {
                "head": {
                    "squash": HALF_SQUASH,
                    "stretch": HALF_STRETCH,
                    "left": HALF_LEFT,
                    "right": HALF_RIGHT,
                },
                "eyes": {"blink": EYES_YOUNG["blink"]},
                "mouth": {"open": MOUTH_YOUNG["open"]},
            },
            "origins": {
                "head": BLOOM_AT,
                "body": (19, 25),
                "armL": (12, 23),
                "armR": (23, 23),
                **_seat(BLOOM_AT, HALF),
            },
            "motion": {
                "head": {"dy": GROW_BOB, "art": GROW_HEAD},
                "eyes": {"dy": GROW_BOB, "dx": GROW_FACE_DX, "art": GROW_BLINK},
                "cheeks": {"dy": GROW_BOB, "dx": GROW_FACE_DX},
                "mouth": {"dy": GROW_BOB, "dx": GROW_FACE_DX, "art": GROW_MOUTH},
                # The leaves lag the body, and asymmetrically — both arms doing the same
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
