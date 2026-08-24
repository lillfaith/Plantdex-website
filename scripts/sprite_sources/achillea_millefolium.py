"""Yarrow (Achillea millefolium) - creature portrait sprite.

THE DESIGN HOOK: yarrow wears a flat-topped umbel of tiny white florets like a wide
brimmed hat, over foliage so finely divided the species is named for it - millefolium,
thousand leaf. So the creature is a small figure under a white canopy, peering out from
beneath the brim, with feathery fronds for arms.

Measured from the card panel: the flower is white with a trace of yellow and a trace of
pink, and there is no single round head - the umbel is broad and flat. That is why this
species does NOT reuse the dandelion's body plan, where the flower IS the face.

WHERE THE FACE GOES. On the plant's most recognisable structure where that structure can
hold one, and immediately below it where it cannot. A yarrow umbel is four pixels tall at
this resolution and could never carry a pair of eyes, so the face sits on the body under
the brim. Same rule, different answer - that is the point of having a rule.

PERSONALITY: shy and watchful. Its trademark gesture is HIDING - the brim comes down
over the face and only the lower halves of the eyes peek back out, before it decides you
are all right and smiles.

Originally: Yarrow is the deck's Rare card and a battlefield herb,
so it holds still more than the dandelion does: a slow sway, a long look out from under
the brim, and a slow blink. It never leaves the ground. Where the dandelion bounces, this
one breathes.

SAFETY: a portrait, never an identification aid. Yarrow's card carries a look-alike
warning, and this sprite is deliberately stylised - the card art and the identification
section remain the reference for anyone actually looking at a plant outdoors.
"""

from _flowerhead import flower_head

# Authored at 32x28, the house size.
PALETTE = {
    "o": (74, 48, 92, 255),      # outline
    "W": (255, 255, 255, 255),   # floret highlight, and the eye glint
    "w": (240, 236, 246, 255),   # floret mid
    "v": (206, 198, 222, 255),   # floret deep
    "V": (166, 156, 190, 255),   # floret shadow
    "y": (247, 216, 130, 255),   # floret eye, the yellow centre
    "p": (236, 168, 186, 255),   # the trace of pink the card carries
    "G": (150, 205, 120, 255),   # foliage light
    "g": (108, 166, 92, 255),    # foliage mid
    "d": (74, 122, 68, 255),     # foliage dark
    "n": (52, 90, 52, 255),      # foliage shadow
    "F": (233, 244, 226, 255),   # face, a cool pale green
    "E": (86, 58, 104, 255),     # eye
    "c": (240, 168, 180, 255),   # cheek
}

UMBEL_W, UMBEL_H = 27, 13


def _umbel(rx=9.8, ry=5.4, light=(-0.85, -0.65)):
    # lobes high and amp low: many shallow scallops, which is what a cluster of tiny
    # florets looks like in silhouette. face_rx 0 means no face - the brim wears none.
    return flower_head(
        UMBEL_W, UMBEL_H, 13.0, 5.6, rx, ry, 11, 0.19, 0, 0,
        light=light, trim_tail=False, chars="Wwv VFo".replace(" ", ""),
    )


UMBEL = _umbel()
UMBEL_TILT_L = _umbel(light=(-0.35, -0.65))
UMBEL_TILT_R = _umbel(light=(-1.25, -0.65))
# Squashed a touch for the settle at the bottom of the sway.
UMBEL_SETTLE = _umbel(rx=10.3, ry=4.9)

BODY_W, BODY_H = 15, 19


def _body(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        BODY_W, BODY_H, 7.0, 9.0, 6.6, 8.8, 0, 0.0, 5.0, 5.6,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


BODY = _body()
BODY_LEFT = _body(face_dx=-1.6, light=(-0.35, -0.65))
BODY_RIGHT = _body(face_dx=1.6, light=(-1.25, -0.65))

# A trace of yellow and pink at the centre of the brim - the two accents the card
# actually carries, and the thing that stops the umbel reading as a plain white disc.
FLORET_DOTS = [
    "y p  y  p y",
]

EYES_OPEN = [
    "WE   WE",
    "EE   EE",
]

# A slow blink for a slow plant: half, closed, half.
EYES_HALF = [
    "oo   oo",
    "EE   EE",
]

EYES_CLOSED = [
    "       ",
    "EE   EE",
]

CHEEKS = [
    "c     c",
]

CHEEKS_HIDDEN = [
    "       ",
]

EYES_HIDDEN = [
    "       ",
]

# Peeking: only the lower halves of the eyes show under the brim. This is the frame the
# whole gesture is for.
EYES_PEEK = [
    "       ",
    "EE   EE",
]

# The mouth the eyes cannot carry: a small shy line at rest, a wavy one while hiding,
# and a real smile once it has decided you are all right.
MOUTH_SHY = [
    " ooo ",
]

MOUTH_WAVY = [
    "o o o",
]

MOUTH_SMILE = [
    "o   o",
    " ooo ",
]

MOUTH_HIDDEN = [
    "     ",
]

# Finely divided fronds - millefolium. Rendered as a spine with short teeth either side
# rather than a solid blade, which is what makes them read as feathery at 32px.
FROND_L = [
    "    ododo",
    " ododGGGGo",
    "oGGGGGGGgo",
    " odogdodo",
    "  o o o",
]

FROND_L_UP = [
    "       ododo",
    "   ododGGGGo",
    " oGGGGGGGGgo",
    "  ododogdodo",
    "   o o o o",
]

FROND_R = [
    "ododo",
    "oGGGGodo",
    "ogGGGGGGo",
    "ododgodo",
    "  o o o",
]

FROND_R_UP = [
    "ododo",
    "oGGGGodo",
    " ogGGGGGGGGo",
    "  ododgodod o",
    "     o o o o",
]

STEM = [
    "ogGgo",
    "ogGgo",
    "odgdo",
    " ooo ",
]

SPRITE = {
    "herbId": "achillea-millefolium",
    "personality": "watchful",
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    # Back to front: stem, fronds, body, the brim over it, then face details. The umbel
    # is drawn AFTER the body so it genuinely overhangs the face, which is what sells the
    # figure as standing under it.
    "parts": [
        {"name": "stem", "origin": (14, 22), "rows": STEM},
        {
            "name": "frondL",
            "origin": (0, 17),
            "rows": FROND_L,
            "variants": {"up": FROND_L_UP},
        },
        {
            "name": "frondR",
            "origin": (21, 17),
            "rows": FROND_R,
            "variants": {"up": FROND_R_UP},
        },
        {
            "name": "body",
            "origin": (9, 9),
            "rows": BODY,
            "variants": {"left": BODY_LEFT, "right": BODY_RIGHT},
        },
        {
            "name": "umbel",
            "origin": (3, 1),
            "rows": UMBEL,
            "variants": {"left": UMBEL_TILT_L, "right": UMBEL_TILT_R, "settle": UMBEL_SETTLE},
        },
        {"name": "dots", "origin": (11, 6), "rows": FLORET_DOTS},
        {
            "name": "eyes",
            "origin": (13, 16),
            "rows": EYES_OPEN,
            "variants": {
                "blink": EYES_CLOSED,
                "half": EYES_HALF,
                "peek": EYES_PEEK,
                "hidden": EYES_HIDDEN,
            },
        },
        {
            "name": "cheeks",
            "origin": (13, 19),
            "rows": CHEEKS,
            "variants": {"hidden": CHEEKS_HIDDEN},
        },
        {
            "name": "mouth",
            "origin": (14, 20),
            "rows": MOUTH_SHY,
            "variants": {"wavy": MOUTH_WAVY, "smile": MOUTH_SMILE, "hidden": MOUTH_HIDDEN},
        },
    ],
    #
    #  frame  0     1      2      3      4      5     6     7      8      9     10    11
    #       rest sway-R look-R  hold  sway-L look-L hold  settle  --   blink  --    --
    #
    # 8fps and no jump: this one breathes where the dandelion bounces.
    #
    #  0    1     2     3     4      5      6      7     8     9    10    11   12   13
    # rest sway> sway< sink  HIDE   HIDE  peek  peek  rise  smile smile bow  bow  rest
    #
    # The hide is frames 4-7 and it is this sprite's trademark: the brim comes right
    # down over the face and only the lower halves of the eyes come back out. Frame 0 is
    # the rest pose reduced motion freezes on.
    "motion": {
        # The brim drops two pixels to cover the face, and lifts again on the peek.
        "umbel": {
            "art": [None, "right", "left", "settle", "settle", "settle", None, None,
                    None, None, None, None, None, None],
            "dx": [0, 2, -2, 0, 0, 0, 0, 0, 0, 0, 0, -1, -1, 0],
            "dy": [0, 0, 0, 3, 6, 6, 4, 4, 1, 0, 0, 1, 1, 0],
        },
        "dots": {
            "dx": [0, 2, -2, 0, 0, 0, 0, 0, 0, 0, 0, -1, -1, 0],
            "dy": [0, 0, 0, 3, 6, 6, 4, 4, 1, 0, 0, 1, 1, 0],
        },
        # The body sinks with it - shoulders up around the ears, the whole shape getting
        # smaller. `lean` keeps the sway a bend rather than a slide.
        "body": {
            "art": [None, "right", "left", None, None, None, None, None, None, None,
                    None, None, None, None],
            "dx": [0, 1, -1, 0, 0, 0, 0, 0, 0, 0, 0, -1, -1, 0],
            "dy": [0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 1, 1, 0],
            "lean": [0, 2, -2, 0, 0, 0, 0, 0, 0, 0, 0, -1, -1, 0],
        },
        "eyes": {
            "art": [None, None, None, "half", "peek", "peek", "peek", "peek",
                    "half", None, None, "half", "blink", None],
            "dx": [0, 4, -4, 0, 0, 0, 0, 0, 0, 0, 0, -1, -1, 0],
            "dy": [0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 1, 1, 0],
        },
        "cheeks": {
            "art": [None, None, None, None, "hidden", "hidden", "hidden", None, None, None,
                    None, None, None, None],
            "dx": [0, 4, -4, 0, 0, 0, 0, 0, 0, 0, 0, -1, -1, 0],
            "dy": [0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 1, 1, 0],
        },
        # Shy line, wavy while hidden, then an actual smile once it has come back out.
        "mouth": {
            "art": [None, None, None, "wavy", "hidden", "hidden", "wavy", "wavy",
                    None, "smile", "smile", "smile", None, None],
            "dx": [0, 4, -4, 0, 0, 0, 0, 0, 0, 0, 0, -1, -1, 0],
            "dy": [0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 1, 1, 0],
        },
        # The fronds pull IN as it hides - arms drawn to the body - rather than lifting.
        "frondL": {
            "art": [None, None, "up", None, None, None, None, None, "up", "up", None,
                    None, None, None],
            "dx": [0, 1, -1, 2, 3, 3, 3, 2, 1, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 1, 1, 0],
        },
        "frondR": {
            "art": [None, "up", None, None, None, None, None, None, "up", "up", None,
                    None, None, None],
            "dx": [0, 1, -1, -2, -3, -3, -3, -2, -1, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 1, 1, 0],
        },
    },
    "palette": PALETTE,
}
