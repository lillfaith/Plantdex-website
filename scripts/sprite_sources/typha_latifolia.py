"""Broadleaf Cattail (Typha latifolia) - creature portrait sprite.

THE DESIGN HOOK: everybody knows the shape. A brown velvet sausage on a stick standing over
a fan of flat strap leaves - probably the most instantly nameable silhouette in the set, and
the one thing that could ruin it is cleverness. So this is drawn as the thing on the pond
edge and nothing else.

WHERE THE FACE GOES, AND WHY NOT IN THE SPIKE. Mullein's own docstring states the rule this
set uses: the face goes on the plant's most recognisable structure where that structure can
hold one, and IMMEDIATELY BELOW IT where it cannot. A cattail spike cannot. The eyes need
eight pixels of face to sit in, which puts a floor of about thirteen on any organ carrying
them, and a cattail spike is roughly four times taller than it is wide - so a face-bearing
spike on a 28px canvas comes out square. Three passes proved it: the sprite read as a brown
bottle with a cork in it, and no amount of reshading fixed that, because the aspect ratio was
the thing that was wrong. The spike is SIX pixels wide now, which is close to the proportion
the plant actually has, and the face sits on the clump of leaf bases underneath - the same
answer mullein reached, for the same reason, on the same canvas.

HAND-DRAWN WHERE IT MATTERS. The spike is a cylinder with flat ends, so it is authored as
literal rows: `_flowerhead.py` builds ROUND organs out of a polar curve, and forcing this
through it gives a lozenge pretending to be a sausage, the way it gave pine a lumpy ball
pretending to be a tree. The BODY is a `flower_head`, because the organ that surrounds a face
always is - here with nine very shallow lobes, which is a rim of blade tips and is what the base
of a cattail clump really looks like from the front.

TWO SPIKES, AND THE UPPER ONE IS THE POINT. The brown club is the FEMALE spike; the slim pale
one sitting straight on top is the male, and it is the male that sheds pollen and then withers
away. Most drawings leave it off and so lose the only part of this plant that moves on its own.

PERSONALITY: dusty. Its trademark gesture is THE POLLEN SHAKE - the spike leans, shakes
itself, and lets go of a drift of gold while the blades sway. It comes off the card rather
than out of my head: the back lists `usableParts: [Shoot, Rhizome, Flower, POLLEN]`, and
shedding is what that word is describing. Nothing else in the set gives anything away.

Frame 0 keeps the pollen ON. That is the connectivity rule - at rest a plant is one plant -
and it is also the honest resting pose, because a spike that has already shed is a spike with
nothing left to do.

COLOUR: leaves at ~169 deg, the blue-green end of the range and the only species past
horsetail's 165.6, which it separates from on saturation rather than hue. The spike sits at
~27 deg and the pollen at ~45, both a long way outside the 34 deg either side of its own
foliage that the set forbids. Midtones stay under the saturation cap.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_box, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks

PALETTE = {
    **FACE_PALETTE,
    "G": (134, 203, 190, 255),   # leaf highlight - glaucous, the blue-green end
    "g": (86, 179, 162, 255),    # leaf mid
    "d": (60, 134, 120, 255),    # leaf deep
    "n": (42, 90, 81, 255),      # leaf shadow
    "N": (202, 158, 114, 255),   # spike highlight
    "m": (174, 119, 71, 255),    # spike mid
    "b": (127, 84, 52, 255),     # spike deep
    "B": (86, 56, 37, 255),      # spike shadow
    "Y": (232, 205, 115, 255),   # pollen
    "y": (208, 168, 57, 255),    # pollen deep / the male spike's own shade
}

# --- The body ----------------------------------------------------------------
#
# The clump of leaf bases, and the organ that carries the face - so it is a `flower_head`,
# the way every face-bearing organ in this set is. NINE SHALLOW LOBES rather than a smooth
# lens: a cattail base is a fan of overlapping straps seen end-on, and the bumpy rim is
# those blade edges. A clean ellipse here would be a pebble with a face on it.
BODY_W, BODY_H = 23, 15


def _body(rx=10.5, ry=7.0, light=(-0.85, -0.65)):
    return flower_head(
        BODY_W, BODY_H, 11.0, 7.2, rx, ry, 9, 0.07, 5.6, 3.8,
        face_dy=0.6,
        light=light, trim_tail=False, chars="GgdnFo",
    )


BODY = _body()
# The sway: the clump widens its stance into the shake rather than staying nailed down.
BODY_WIDE = _body(rx=11.0, ry=6.6)

BODY_AT = (4, 11)

# --- The female spike --------------------------------------------------------
#
# SIX WIDE, and that number is the whole sprite. Every version of this that carried a face
# was thirteen wide and read as a bottle; the proportion is what says cattail, so the
# proportion is what the face had to give way to. Straight sides, rounded ends, shaded
# left to right because that is what a cylinder does - a radial gradient would be a ball.
_SPIKE = [
    " oooo ",
    "oNmmbo",
    "oNmmbo",
    "oNmmbo",
    "oNmmbo",
    "oNmmbo",
    "oNmmbo",
    "oNmmbo",
    "ommmbo",
    "ommbbo",
    "ombbBo",
    "obbBBo",
    " oooo ",
]

# A WIGGLE IS NOT A SLIDE. Shifting the whole spike sideways moves it at the foot as well
# as the tip, which reads as the plant being shoved rather than the spike shaking itself.
# So each row takes its OWN offset: the base holds, the middle gives a pixel, the top five
# give two. That is a whip, and it is the only thing on this plant that moves under its
# own power.
_SPAN = 2
_BEND = (2, 2, 2, 2, 2, 1, 1, 1, 1, 0, 0, 0, 0)


def _bend(rows, offsets):
    out = [" " * (_SPAN + o) + r for r, o in zip(rows, offsets)]
    w = max(len(line) for line in out)
    return [line.ljust(w) for line in out]


SPIKE = _bend(_SPIKE, (0,) * len(_SPIKE))
SPIKE_L = _bend(_SPIKE, tuple(-o for o in _BEND))
SPIKE_R = _bend(_SPIKE, _BEND)

SPIKE_AT = (11, 2)

# --- The male spike ----------------------------------------------------------
#
# Sits STRAIGHT ON TOP of the female, which is how a cattail is built and is also what
# keeps frame 0 one connected piece: its foot lands on the brown spike's crown.
MALE = [
    "oo",
    "Yo",
    "Yo",
    "yo",
    "oo",
]

MALE_L = [
    "oo",
    "Yo",
    "Yo",
    "yo",
    "oo",
]

MALE_R = [
    "oo",
    "oY",
    "oY",
    "oy",
    "oo",
]

MALE_AT = (15, 0)

# --- The pollen --------------------------------------------------------------
#
# Its own part, defaulting to NOTHING, the same trick horsetail's separate fertile shoot
# uses. Detached pixels during a gesture are fine and often the whole point; at rest they
# would be gold floating in the sky beside a plant.
POLLEN_NONE = [" "]

PUFF_A = [
    "Y   ",
    "  Y ",
]

PUFF_B = [
    " Y  Y",
    "Y  Y ",
    "   Y ",
]

PUFF_C = [
    "Y   Y",
    "  Y  ",
    " Y  Y",
    "   Y ",
]

PUFF_D = [
    "  Y  ",
    "Y   Y",
    "  Y  ",
]

POLLEN_AT = (19, 2)

# --- The blades --------------------------------------------------------------
#
# BROAD STRAPS, which is the species: `latifolia` is broad-leaved, and the narrow-leaved
# cattail it is most often confused with is a different plant. They rise out of the clump
# and arch away, so each ribbon runs corner to corner - an upright rectangle beside a
# spike reads as a fence post. Two pixels of colour, not three: blades as wide as the
# spike would make the silhouette a trident.
BLADE_L = [
    "oooo     ",
    "oGGo     ",
    " oGGo    ",
    "  oGGo   ",
    "   oGGo  ",
    "   oGgo  ",
    "    oGgo ",
    "    oGgo ",
    "    oggo ",
    "     oggo",
    "     ogdo",
    "     ogdo",
    "     ogno",
]

# MIRRORED BY REVERSING THE STRINGS, never typed a second time. Hand-typing the other
# side is how a plant ends up a pixel wider on one side than the other, and reversing
# also flips the shading the right way: every leaf in this set is lit from its own outer
# edge, so the mirror is what the light wants too.
BLADE_R = [row[::-1] for row in BLADE_L]

BLADE_L_AT = (4, 1)
BLADE_R_AT = (18, 1)

# --- Growth stages -----------------------------------------------------------
#
#   sprout    the clump and ONE blade, no spike at all. A first-year cattail is leaves;
#             the spike is what a settled stand puts up, not what a seedling does.
#   growing   the spike GREEN and short. A cattail club really is green before it ripens
#             brown, so the stage has a colour of its own rather than being the adult
#             drawn small - and there is no pollen, because nothing is ripe to shed.
#   flowering brown spike, pale male spike, and a gesture that lets go of something.

YOUNG_BODY_W, YOUNG_BODY_H = 19, 12


def _young_body(rx=8.6, ry=5.5, light=(-0.85, -0.65)):
    return flower_head(
        YOUNG_BODY_W, YOUNG_BODY_H, 9.0, 5.7, rx, ry, 7, 0.07, 5.6, 3.8,
        face_dy=0.6,
        light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_BODY = _young_body()

YOUNG_BODY_AT = (6, 14)

MID_BODY_W, MID_BODY_H = 21, 13


def _mid_body(rx=9.6, ry=6.0, light=(-0.85, -0.65)):
    return flower_head(
        MID_BODY_W, MID_BODY_H, 10.0, 6.2, rx, ry, 9, 0.07, 5.6, 3.8,
        face_dy=0.6,
        light=light, trim_tail=False, chars="GgdnFo",
    )


MID_BODY = _mid_body()

MID_BODY_AT = (5, 13)

_SPIKE_MID = [
    " oooo ",
    "oGggdo",
    "oGggdo",
    "oGggdo",
    "oGggdo",
    "oggddo",
    "oggddo",
    " oooo ",
]

_BEND_MID = (2, 2, 2, 1, 1, 0, 0, 0)

SPIKE_MID = _bend(_SPIKE_MID, (0,) * len(_SPIKE_MID))
SPIKE_MID_L = _bend(_SPIKE_MID, tuple(-o for o in _BEND_MID))
SPIKE_MID_R = _bend(_SPIKE_MID, _BEND_MID)

SPIKE_MID_AT = (11, 8)

MALE_MID = [
    " oo ",
    "oGgo",
    " oo ",
]

MALE_MID_AT = (14, 5)

BLADE_MID = [
    "oooo   ",
    "oGGo   ",
    " oGGo  ",
    "  oGGo ",
    "  oGgo ",
    "   oGgo",
    "   oggo",
    "   ogdo",
    "   ogno",
]

BLADE_MID_R = [row[::-1] for row in BLADE_MID]

# The young loop: a lean and a look, no shedding. Whatever a species does that nothing
# else in the set does stays with the adult, so mastery buys something visible.
S_BOB = [0, 0, -1, -1, 0, 0, 0, 0]
S_EYES = [None, None, "wide", "wide", None, None, "blink", None]

G_BOB = [0, 0, -1, -1, -1, -1, 0, 0, 0, 0]
G_EYES = [None, None, "wide", "wide", "wide", None, None, None, "blink", None]
G_SPIKE = [None, None, "lean_l", "lean_l", "lean_r", "lean_r", None, None, None, None]


SPRITE = {
    "herbId": "typha-latifolia",
    "personality": "dusty",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(7, "sprout"),
            "hide": ["spike", "male", "pollen", "cheeks"],
            "swap": {
                "body": YOUNG_BODY,
                "bladeL": BLADE_MID,
                "bladeR": BLADE_MID_R,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                    "wide": YOUNG_EYES["wide"],
                },
            },
            "origins": {
                "body": YOUNG_BODY_AT,
                "bladeL": (7, 10),
                "bladeR": (18, 10),
                **seat_young(
                    YOUNG_BODY_AT, YOUNG_BODY, cheeks=False, eye_dy=1, mouth_dy=3
                ),
            },
            "motion": {
                "body": {"dy": S_BOB},
                "eyes": {"dy": S_BOB, "art": S_EYES},
                "mouth": {"dy": S_BOB},
                "bladeL": {"dy": [0, 0, 0, -1, -1, 0, 0, 0]},
                "bladeR": {"dy": [0, 0, 0, -1, -1, 0, 0, 0]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(7, "growing"),
            # No pollen. A green spike is not ripe, and a sprite that shed anyway would
            # be claiming something about the plant that is not true.
            "hide": ["pollen"],
            "swap": {
                "body": MID_BODY,
                "spike": SPIKE_MID,
                "male": MALE_MID,
                "bladeL": BLADE_MID,
                "bladeR": BLADE_MID_R,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
                "cheeks": young_cheeks(face_box(MID_BODY)[2]),
            },
            "variants": {
                "spike": {"lean_l": SPIKE_MID_L, "lean_r": SPIKE_MID_R},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                    "wide": YOUNG_EYES["wide"],
                },
            },
            "origins": {
                "body": MID_BODY_AT,
                "spike": SPIKE_MID_AT,
                "male": MALE_MID_AT,
                "bladeL": (6, 9),
                "bladeR": (19, 9),
                **seat_young(MID_BODY_AT, MID_BODY, eye_dy=1, mouth_dy=4),
            },
            "motion": {
                "body": {"dy": G_BOB},
                "spike": {"dy": G_BOB, "art": G_SPIKE},
                "male": {"dy": G_BOB},
                "eyes": {"dy": G_BOB, "art": G_EYES},
                "cheeks": {"dy": G_BOB},
                "mouth": {"dy": G_BOB},
                "bladeL": {"dy": [0, 0, 0, -1, -1, 0, 0, 0, 0, 0]},
                "bladeR": {"dy": [0, 0, 0, -1, -1, 0, 0, 0, 0, 0]},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 7,
    # Blades behind everything, then the spike, then the clump OVER the blade feet so
    # they read as emerging from it, then the male spike, then the falling pollen.
    "parts": [
        {"name": "bladeL", "origin": BLADE_L_AT, "rows": BLADE_L},
        {"name": "bladeR", "origin": BLADE_R_AT, "rows": BLADE_R},
        {
            "name": "spike",
            "origin": SPIKE_AT,
            "rows": SPIKE,
            "variants": {"lean_l": SPIKE_L, "lean_r": SPIKE_R},
        },
        {
            "name": "body",
            "origin": BODY_AT,
            "rows": BODY,
            "variants": {"wide": BODY_WIDE},
        },
        {
            "name": "male",
            "origin": MALE_AT,
            "rows": MALE,
            "variants": {"lean_l": MALE_L, "lean_r": MALE_R},
        },
        {
            "name": "pollen",
            "origin": POLLEN_AT,
            "rows": POLLEN_NONE,
            "variants": {"a": PUFF_A, "b": PUFF_B, "c": PUFF_C, "d": PUFF_D},
        },
        *feature_parts(BODY_AT, BODY, eyes="round", mouth="small", eye_dy=1, mouth_dy=4),
    ],
    #
    #  0     1      2      3      4      5      6      7     8      9   10  11  12    13
    # rest wiggle wiggle wiggle wiggle wiggle wiggle wiggle settle rest rest rest blink rest
    #
    # THE POLLEN SHAKE. The spike whips back and forth for half the loop and lets go; the
    # gold then FALLS rather than dispersing, because cattail pollen drops - it is heavy
    # enough to have been collected in a bag held under the spike, which is why the card
    # lists it as a usable part at all.
    #
    # THE CREATURE ITSELF BARELY MOVES, and that is the joke. One thin spike shakes
    # overhead and a cloud comes off something that looked entirely inert; the clump below
    # only widens its stance and looks up. A body travelling as far as its own pollen
    # would read as the whole plant jumping.
    "motion": {
        # THE TIP TRAVELS FARTHER THAN THE SPIKE IT SITS ON. Given the same offsets it
        # looked welded on; two pixels against the spike's own bend is what makes the top
        # of the thing whip rather than tilt.
        "male": {
            "art": [None, "lean_l", "lean_r", "lean_l", "lean_r", "lean_l",
                    "lean_r", None, None, None, None, None, None, None],
            "dx": [0, -2, 2, -2, 2, -2, 2, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "spike": {
            "art": [None, "lean_l", "lean_r", "lean_l", "lean_r", "lean_l",
                    "lean_r", None, None, None, None, None, None, None],
        },
        "pollen": {
            "art": [None, "a", "b", "c", "c", "d", "d", "d", None, None,
                    None, None, None, None],
            # Falling, and drifting clear of the spike rather than down through it.
            "dy": [0, 0, 2, 4, 6, 9, 11, 13, 0, 0, 0, 0, 0, 0],
            "dx": [0, 0, 0, 1, 1, 2, 2, 3, 0, 0, 0, 0, 0, 0],
        },
        "body": {
            "art": [None, "wide", "wide", "wide", "wide", "wide", "wide", None, None,
                    None, None, None, None, None],
        },
        "eyes": {
            "art": [None, "wide", "wide", "wide", "wide", "wide", "wide", None, None,
                    None, None, None, "blink", None],
        },
        "mouth": {
            "art": [None, None, "wide", "wide", "wide", "wide", "wide", None, None,
                    None, None, None, None, None],
        },
        # The straps sway half a beat behind, which is what makes the shake read as
        # travelling down the plant rather than happening to the spike alone.
        "bladeL": {"dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0]},
        "bladeR": {"dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
