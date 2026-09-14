"""Blue Vervain (Verbena hastata) - creature portrait sprite.

THE DESIGN HOOK is a progress bar the plant runs on itself. A vervain spike does not open
all at once and does not open from the tip: a narrow RING of florets opens near the bottom,
and over the season that ring travels upward, leaving bare fruiting spike below it and tight
unopened buds above. Several spikes stand together in a candelabra, each with its own ring
at its own height. Nothing else in this set measures time on its own body.

THE FACE CANNOT GO IN A SPIKE, and that is a rule this codebase already wrote down. The eyes
need eight pixels of face to sit in, which puts a floor of about thirteen on any organ
carrying them, and a vervain spike is three pixels wide - a face-bearing spike would come out
square and stop being a spike, which is exactly the wall the cattail hit and the reason
mullein states the rule in its own docstring. So the face goes in the clump of leaves
IMMEDIATELY BELOW the spikes, and the candelabra rises out of the top of it.

THREE SPIKES, NOT ONE. One is a mullein or a cattail; the branched candelabra is what a
person actually picks Verbena hastata out of a wet meadow by, and it is the structure the
card's own field notes lead with. They are set at different heights so the silhouette is not
a comb.

PERSONALITY: measured. Its trademark gesture is THE RISING RING - the lit band climbs one
step up each spike in turn, the three of them slightly out of step, and when the last reaches
its tip the creature closes its eyes for a beat and the rings go back to the bottom. It
deliberately does NOT track the rings with its eyes: spicebush already follows something
upward and is pleased with itself, and this one is not watching, it is counting.

THIS ILLUSTRATES A FLOWERING PATTERN AND NOT AN EFFECT. The card prints digestive support,
nervous system aid, sleep aid and calming, and not one of them appears here in any form - a
gesture may show what a plant DOES, never it treating anything, which is the line self-heal
keeps by mending a notch in its OWN leaf. The one place the card's character is allowed to
reach the animation is its PACE: this is the slowest loop in the set, and slow is a property
of the drawing rather than a claim about the plant.

Frame 0 has all three rings at the BOTTOM of their spikes, which is where a vervain starts
its season. At rest a plant is one plant and a ring parked halfway up would restart as
ambient motion.

COLOUR: leaves at ~121 deg, in the gap between goldenrod and bee balm, at a lower saturation
than either so two neighbours in hue still separate on a second axis. The open florets sit at
~262 and the unopened buds at ~280 - both far outside the 34 deg either side of the foliage
that the set forbids, and the buds are deliberately DARKER and duller than the open ring,
because the whole gesture depends on being able to see which part of the spike is lit.
Midtones stay under the saturation cap.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits apart
from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_box, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks

PALETTE = {
    **FACE_PALETTE,
    "G": (134, 193, 134, 255),   # leaf highlight
    "g": (96, 169, 96, 255),     # leaf mid
    "d": (66, 128, 66, 255),     # leaf deep
    "n": (44, 84, 44, 255),      # leaf shadow
    "P": (180, 154, 223, 255),   # open floret, lit
    "p": (135, 99, 197, 255),    # open floret, deep
    "U": (115, 84, 131, 255),    # unopened bud
    "u": (82, 61, 92, 255),      # unopened bud, shadow
    "b": (108, 146, 96, 255),    # stem
    "B": (74, 104, 66, 255),     # stem shadow
}

# --- The clump ---------------------------------------------------------------
#
# THE FACE-BEARING ORGAN, and it is foliage rather than a flower. Nine shallow lobes give a
# bushy rim without reading as petals; this is a mound of opposite toothed leaves, which is
# what sits under a vervain's candelabra.
CLUMP_W, CLUMP_H = 25, 13


def _clump(rx=11.0, ry=5.6, face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        CLUMP_W, CLUMP_H, 12.0, 6.4, rx, ry, 9, 0.12, 5.4, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


CLUMP = _clump()
CLUMP_LEFT = _clump(face_dx=-1.5, light=(-0.35, -0.65))
CLUMP_RIGHT = _clump(face_dx=1.5, light=(-1.25, -0.65))

CLUMP_AT = (3, 13)

L_DX, _ = face_shift(CLUMP, CLUMP_LEFT)
R_DX, _ = face_shift(CLUMP, CLUMP_RIGHT)

# --- The spikes --------------------------------------------------------------
#
# EACH SPIKE IS ONE PART WITH SIX POSES, and the pose is which row is lit. Drawn as
# variants rather than as a separate travelling band, because a band laid over a spike has
# to be kept aligned with it on every frame and would slide off the moment a spike moved -
# the same reasoning that makes a face a carved hole rather than a patch.
#
# Bare BELOW the ring and budded ABOVE it, which is the plant's own order and the half that
# makes this read as progress rather than as a light blinking on and off.


def _spike(lit: int) -> list[str]:
    """A spike with its open ring at row `lit`, counted from the bottom."""
    rows = []
    for row in range(6):
        # 0 is the base of the spike, 5 the tip.
        if row == lit:
            rows.append("oPPo")
        elif row > lit:
            rows.append("oUUo")
        else:
            # Already flowered and gone over: bare rachis, not buds.
            rows.append("obbo")
        rows[-1] = rows[-1]
    return list(reversed(rows)) + ["oBBo"]


SPIKE = {f"r{i}": _spike(i) for i in range(6)}

# A HALF-GROWN SPIKE IS SHORTER, not a full one seated lower. Reusing the adult spike put
# the growing stage at 94% of the adult when the stage audit wants 80% — the plant had
# finished growing upward and only its leaves were still small, which is not how a vervain
# comes up. Four rows: two of bud, the ring, and the rachis.
MID_SPIKE = ["oUUo", "oUUo", "oUUo", "oPPo", "oBBo"]

SPIKE_L_AT = (7, 8)
SPIKE_M_AT = (14, 7)
# EVERY FOOT SEATED ON THE CLUMP, NOT AT A CHOSEN HEIGHT. Three spikes hung at three
# heights above a mound of leaves look fine in the source and float in the render: the
# middle one ended two rows clear of anything and the audit reported one plant in two
# pieces. The heights still differ — that is what stops the silhouette being a comb — but
# each foot now overlaps the leaves it grows out of.
SPIKE_R_AT = (21, 10)

# --- Growth stages -----------------------------------------------------------
#
#   sprout    the leaf clump alone, no spikes at all. A first-year vervain is a tuft of
#             opposite toothed leaves and nothing else, so this stage having no flower is
#             the plant rather than a simplification.
#   growing   the clump with ONE spike, and it does not climb. A single spike cannot be out
#             of step with anything, and the gesture is the three of them counting together
#             — so the rising ring is what mastery buys, which is the rule the whole set
#             keeps: whatever a species does that nothing else does stays with the adult.
#   flowering the full candelabra and the ring.

# A vervain's adult is tall — three spikes above a clump — so a seedling scaled like a
# shrub's came out at 38% of it. The organ is redrawn larger rather than the art scaled.
YOUNG_W, YOUNG_H = 19, 12


def _young(rx=8.4, ry=5.2, light=(-0.85, -0.65)):
    return flower_head(
        YOUNG_W, YOUNG_H, 9.0, 6.0, rx, ry, 9, 0.12, 5.4, 3.6,
        face_dy=0.5, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG = _young()
YOUNG_AT = (6, 13)

MID_W, MID_H = 21, 11


def _mid(rx=9.2, ry=4.8, face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        MID_W, MID_H, 10.0, 5.6, rx, ry, 9, 0.12, 5.4, 3.6,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


MID = _mid()
MID_LEFT = _mid(face_dx=-1.3, light=(-0.35, -0.65))
MID_RIGHT = _mid(face_dx=1.3, light=(-1.25, -0.65))

MID_AT = (5, 14)

G_L_DX, _ = face_shift(MID, MID_LEFT)
G_R_DX, _ = face_shift(MID, MID_RIGHT)

S_BOB = [0, 0, -1, -1, 0, 0, 0, 0]
S_EYES = [None, None, "half", "half", None, None, "blink", None]

G_BOB = [0, 0, 1, -1, -1, -1, 0, 0, 0, 0]
G_HEAD = [None, None, None, "right", "right", "left", None, None, None, None]
G_DX = [0, 0, 0, G_R_DX, G_R_DX, G_L_DX, 0, 0, 0, 0]
G_EYES = [None, None, "half", None, None, None, None, "blink", None, None]


SPRITE = {
    "herbId": "verbena-hastata",
    "personality": "measured",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(6, "sprout"),
            "hide": ["spikeL", "spikeM", "spikeR", "cheeks"],
            "swap": {
                "clump": YOUNG,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "eyes": {"blink": YOUNG_EYES["blink"], "half": YOUNG_EYES["half"]},
            },
            "origins": {
                "clump": YOUNG_AT,
                **seat_young(YOUNG_AT, YOUNG, cheeks=False, eye_dy=1, mouth_dy=4),
            },
            "motion": {
                "clump": {"dy": S_BOB},
                "eyes": {"dy": S_BOB, "art": S_EYES},
                "mouth": {"dy": S_BOB},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(6, "growing"),
            "hide": ["spikeL", "spikeR"],
            "swap": {
                "clump": MID,
                "spikeM": MID_SPIKE,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
                "cheeks": young_cheeks(face_box(MID)[2]),
            },
            "variants": {
                "clump": {"left": MID_LEFT, "right": MID_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"], "half": YOUNG_EYES["half"]},
            },
            "origins": {
                "clump": MID_AT,
                "spikeM": (14, 9),
                **seat_young(MID_AT, MID, eye_dy=1, mouth_dy=4),
            },
            "motion": {
                "clump": {"dy": G_BOB, "art": G_HEAD},
                "eyes": {"dy": G_BOB, "dx": G_DX, "art": G_EYES},
                "cheeks": {"dy": G_BOB, "dx": G_DX},
                "mouth": {"dy": G_BOB, "dx": G_DX},
                "spikeM": {"dy": G_BOB},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    # THE SLOWEST LOOP IN THE SET, and the one place the card's own character is allowed to
    # reach the drawing. Six frames a second over fourteen frames is a little over two
    # seconds a cycle; at the eight the shrubs use, a ring climbing six steps reads as a
    # progress bar filling rather than a season passing.
    "fps": 6,
    # Spikes behind, clump over them so they emerge from the leaves rather than standing in
    # front of them.
    "parts": [
        {"name": "spikeL", "origin": SPIKE_L_AT, "rows": SPIKE["r0"], "variants": SPIKE},
        {"name": "spikeM", "origin": SPIKE_M_AT, "rows": SPIKE["r0"], "variants": SPIKE},
        {"name": "spikeR", "origin": SPIKE_R_AT, "rows": SPIKE["r0"], "variants": SPIKE},
        {
            "name": "clump",
            "origin": CLUMP_AT,
            "rows": CLUMP,
            "variants": {"left": CLUMP_LEFT, "right": CLUMP_RIGHT},
        },
        *feature_parts(CLUMP_AT, CLUMP, eyes="sleepy", mouth="small", eye_dy=1, mouth_dy=4),
    ],
    #
    #  0   1   2   3   4   5   6   7   8   9  10  11  12  13
    #  the three rings climb, out of step, and reset together at 12
    #
    # OUT OF STEP BY ONE. The middle spike leads, the left follows a frame later and the
    # right a frame after that. In step, three bands moving as one read as a single object
    # sliding upward behind a plant; a frame apart, they read as three spikes each keeping
    # its own time, which is what a real candelabra looks like.
    #
    # The reset on 12 is NOT a climb back down. Every ring returns to the base together in
    # one cut, because a band travelling downward would say the flowers were closing in
    # order, which is not a thing this plant does.
    "motion": {
        "spikeM": {
            "art": ["r0", "r1", "r2", "r3", "r4", "r5", "r5", "r5", "r5", "r5",
                    "r5", "r5", "r0", "r0"],
        },
        "spikeL": {
            "art": ["r0", "r0", "r1", "r2", "r3", "r4", "r5", "r5", "r5", "r5",
                    "r5", "r5", "r0", "r0"],
        },
        "spikeR": {
            "art": ["r0", "r0", "r0", "r1", "r2", "r3", "r4", "r5", "r5", "r5",
                    "r5", "r5", "r0", "r0"],
        },
        # It is counting, not watching: the eyes stay level all the way up and only close
        # once every ring has arrived. A creature that tracked the bands would be spicebush.
        "eyes": {
            "art": [None, None, None, None, None, None, None, None, "shut", "shut",
                    "shut", None, None, None],
        },
        "mouth": {
            "art": [None, None, None, None, None, None, None, None, "wide", "wide",
                    None, None, None, None],
        },
    },
    "palette": PALETTE,
}
