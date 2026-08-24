"""Measures where a face actually landed in an assembled part, so eyes can be placed.

WHY THIS EXISTS. Every placement bug in this set came from the same mistake: guessing
where a face sits from the parameters that produced it, rather than measuring it from
the art those parameters produced. `flower_head` trims empty rows, shading pushes the
face patch around, and a squashed body does not move its face the way the radii suggest.
So eyes drawn at an estimated origin land on the outline, or in the mane, or a pixel off
centre - which happened five times before this module existed.

`face_box` reads the finished rows and reports the face patch's real bounding box;
`on_face` turns that box plus a part origin into the origin a piece of face art needs to
sit centred inside it. Authoring a species is then: build the body, measure it, place
the features. Nothing is estimated.

Not a sprite: the leading underscore keeps `build_sprites.py` from loading it as one.
"""


def face_box(rows: list[str], face_char: str = "F") -> tuple[int, int, int, int]:
    """`(x, y, width, height)` of the face patch inside `rows`, in part coordinates."""
    xs = [(x, y) for y, row in enumerate(rows) for x, c in enumerate(row) if c == face_char]
    if not xs:
        raise ValueError(f"no '{face_char}' pixels in these rows - is there a face at all?")
    left = min(x for x, _ in xs)
    right = max(x for x, _ in xs)
    top = min(y for _, y in xs)
    bottom = max(y for _, y in xs)
    return left, top, right - left + 1, bottom - top + 1


def on_face(
    part_origin: tuple[int, int],
    rows: list[str],
    art: list[str],
    dy: int = 0,
    dx: int = 0,
    face_char: str = "F",
) -> tuple[int, int]:
    """Canvas origin that centres `art` horizontally in the face of `rows`.

    `dy` is measured from the TOP of the face patch, because that is the edge the eyes
    hang from - a face that grows downward (a squash, a stretch) should not slide its
    eyes. `dx` nudges off centre for a piece that is deliberately lopsided.
    """
    ox, oy = part_origin
    fx, fy, fw, _ = face_box(rows, face_char)
    art_w = max(len(row) for row in art)
    return ox + fx + (fw - art_w) // 2 + dx, oy + fy + dy


# ---------------------------------------------------------------------------
# The feature vocabulary.
#
# Every species draws its eyes and mouth from here rather than hand-rolling them, for
# the same reason `_flowerhead.py` exists: hand-authored 2px eyes came out merged into a
# dark band, or one pixel off centre, five separate times. What makes species differ is
# WHICH set they wear and what they do with it - a beady-eyed nettle and a big-eyed
# strawberry are different characters built from a shared alphabet, the way a sprite
# sheet for any real game is.
#
# Every set is authored to the same footprint rule learned the hard way: 2px pupils with
# a 2-3px gap, which needs a face at least 8px wide to sit in.
# ---------------------------------------------------------------------------

EYES = {
    # Round and bright, with a glint. The default happy creature.
    "round": {
        "rows": ["WE  WE", "EE  EE"],
        "blink": ["      ", "EE  EE"],
        "half": ["oo  oo", "EE  EE"],
        "happy": ["oo  oo", "EE  EE"],
        "wide": ["EE  EE", "EE  EE"],
        "shut": ["oo  oo", "      "],
        "look_left": ["EW  EW", "EE  EE"],
        "look_right": ["WE  WE", "EE  EE"],
    },
    # Narrow and level - watching you rather than pleased to see you.
    "narrow": {
        "rows": ["E    E", "EE  EE"],
        "blink": ["      ", "oo  oo"],
        "half": ["      ", "EE  EE"],
        "wide": ["EE  EE", "EE  EE"],
        "shut": ["oo  oo", "      "],
    },
    # Small hard dots. Reads as older, drier, less sentimental.
    "beady": {
        "rows": ["E    E", "o    o"],
        "blink": ["      ", "o    o"],
        "half": ["o    o", "o    o"],
        "wide": ["EE  EE", "oo  oo"],
        "shut": ["oo  oo", "      "],
    },
    # Heavy-lidded. Half shut even at rest.
    "sleepy": {
        "rows": ["oo  oo", "EE  EE"],
        "blink": ["oo  oo", "oo  oo"],
        "half": ["oo  oo", "EE  EE"],
        "wide": ["EE  EE", "EE  EE"],
        "shut": ["oo  oo", "      "],
    },
    # Three rows: the biggest eyes in the set, for the small sweet ones.
    "big": {
        "rows": ["WEE  WEE", "EEE  EEE", "oEo  oEo"],
        "blink": ["        ", "        ", "EEE  EEE"],
        "half": ["oooo oooo", "EEE  EEE", "oEo  oEo"],
        "shut": ["oooo oooo", "        ", "        "],
        "wide": ["EEE  EEE", "EEE  EEE", "EEE  EEE"],
    },
}

MOUTHS = {
    "small": {"rows": ["oo"], "open": ["oo", "FF", "oo"], "wide": ["oooo"]},
    "smile": {"rows": ["o   o", " ooo "], "grin": ["ooooo", "oFFFo", " ooo "], "flat": ["ooooo"]},
    "line": {"rows": ["ooo"], "open": ["ooo", "oFo", "ooo"], "frown": [" oo ", "o  o"]},
    "beam": {"rows": ["o   o", "ooooo"], "open": [" ooo ", "oFFFo", " ooo "], "flat": ["ooooo"]},
    "frown": {"rows": [" ooo ", "o   o"], "flat": ["ooooo"], "open": ["ooo", "oFo", "ooo"]},
}


def feature_parts(
    head_at: tuple[int, int],
    head_rows: list[str],
    eyes: str = "round",
    mouth: str = "small",
    eye_dy: int = 2,
    mouth_dy: int = 5,
    eye_dx: int = 0,
    mouth_dx: int = 0,
    cheeks: bool = True,
    extra_eyes: dict[str, list[str]] | None = None,
    extra_mouths: dict[str, list[str]] | None = None,
    extra_cheeks: dict[str, list[str]] | None = None,
) -> list[dict]:
    """The eyes, cheeks and mouth of one face, seated by measurement.

    `eye_dy` and `mouth_dy` are measured DOWN FROM THE TOP of the face patch that
    `head_rows` actually contains, so a wider or shallower head reseats its own features
    instead of needing every origin retyped. `extra_*` adds species-specific variants -
    the snarl only nettle has, the pucker only sorrel has.

    Every face gets a `hidden` variant for free, on all three parts. A creature that
    turns its back, shuts itself into a bud or ducks behind a leaf has to be able to take
    its face with it, and a blush left hanging in mid-air was how that bug first showed.
    """
    eye_set = {**EYES[eyes], **(extra_eyes or {})}
    mouth_set = {**MOUTHS[mouth], **(extra_mouths or {})}
    cheek_art = ["c" + " " * (max(len(r) for r in eye_set["rows"]) + 2) + "c"]

    parts = [
        {
            "name": "eyes",
            "origin": on_face(head_at, head_rows, eye_set["rows"], dy=eye_dy, dx=eye_dx),
            "rows": eye_set["rows"],
            "variants": {"hidden": [" "], **{k: v for k, v in eye_set.items() if k != "rows"}},
        }
    ]
    if cheeks:
        parts.append(
            {
                "name": "cheeks",
                "origin": on_face(head_at, head_rows, cheek_art, dy=mouth_dy - 1),
                "rows": cheek_art,
                "variants": {"hidden": [" "], **(extra_cheeks or {})},
            }
        )
    parts.append(
        {
            "name": "mouth",
            "origin": on_face(head_at, head_rows, mouth_set["rows"], dy=mouth_dy, dx=mouth_dx),
            "rows": mouth_set["rows"],
            "variants": {"hidden": [" "], **{k: v for k, v in mouth_set.items() if k != "rows"}},
        }
    )
    return parts


# The five colours every face in the set shares, so a species palette only declares what
# is actually its own. Keeping them identical is what makes 45 different plants read as
# one deck rather than 45 unrelated drawings.
FACE_PALETTE = {
    "o": (74, 48, 92, 255),      # outline
    "F": (244, 246, 232, 255),   # face
    "E": (86, 58, 104, 255),     # eye
    "W": (255, 255, 255, 255),   # eye glint
    "c": (238, 168, 172, 255),   # cheek
}


def face_shift(
    base_rows: list[str], variant_rows: list[str], face_char: str = "F"
) -> tuple[int, int]:
    """How far the face moved between two poses of the same head, in whole pixels.

    A turned head slides its face across itself, so the features have to travel the
    head's own offset PLUS this. Guessing that second number is what makes eyes drift off
    a face on exactly the frames a sprite turns to look at something, which is the one
    moment a viewer is watching the eyes.
    """
    bx, by, bw, bh = face_box(base_rows, face_char)
    vx, vy, vw, vh = face_box(variant_rows, face_char)
    # Compare centres, not corners: a pose that also widens the face would otherwise
    # report a shift it does not have.
    return (vx + vw // 2) - (bx + bw // 2), (vy + vh // 2) - (by + bh // 2)
