#!/usr/bin/env python3
"""Automated QA for an expansion Garden sprite set (pilot cards #57-61 and later).

Run:
    python3 scripts/expansion/check_sprite_set.py --sources DIR [--build-dir DIR]
        [--manifest FILE] [--ids a,b] [--out report.json] [--format json|text]
    python3 scripts/expansion/check_sprite_set.py \
        --git-ref origin/<branch> --git-path expansion/sprites ...   # reads with `git show`
    python3 scripts/expansion/check_sprite_set.py --control          # existing 54, calibration

The rules are specified in docs/expansion/pilot/sprite-spec.md; every check id below (R01...)
is defined there. A verdict here is "passes automated QA" or "fails" - never an approval.
Only the owner approves a sprite, and this tool cannot see what a human sees.

WHAT IT TOUCHES. It READS the authored modules, the shared helpers in scripts/sprite_sources/,
src/data/sprites.json and src/lib/plant-sprites.ts. It WRITES NOTHING except `--out`. In
particular it never calls `build_sprites.compile_sprite`, which writes into public/, and it
never modifies audit_sprites.py or any existing source: every sheet is rendered in memory with
the same `render_frame` the build uses. Because it does not rewrite public/cards/animated/, it
is safe to run beside `npm test` (audit_sprites.py is not).

MEASUREMENT. Same approach as audit_sprites.py, and it IMPORTS that module's `pieces()` and
`audit()` rather than restating them, so the two cannot drift: connectivity is an
eight-connected flood fill of frame 0; face placement renders every frame with the parts drawn
BEFORE each feature and reports feature pixels that landed on anything but face, outline or
blush. Everything else (ink box, ground line, badge fit) is measured from the assembled art,
never inferred from part parameters.

STATUSES. PASS, WARN (a human should look; heuristic or advisory), FAIL (violates a hard
rule), SKIP (could not be determined from what was supplied), N/A.
"""

from __future__ import annotations

import argparse
import colorsys
import hashlib
import importlib.util
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent.parent
SCRIPTS = ROOT / "scripts"
SOURCE_DIR = SCRIPTS / "sprite_sources"
EXISTING_MANIFEST = ROOT / "src" / "data" / "sprites.json"
PLANT_SPRITES_TS = ROOT / "src" / "lib" / "plant-sprites.ts"

sys.path.insert(0, str(SCRIPTS))
sys.path.insert(0, str(SOURCE_DIR))

import build_sprites as bs  # noqa: E402  (imports are side-effect free: no writes at import)
import audit_sprites as au  # noqa: E402  (reads sprites.json at import; main() is guarded)
from _face import FACE_PALETTE  # noqa: E402

TOOL_VERSION = 1

# --- Constants that mirror the app. Each is re-read from its source where it can be, so this
# file cannot audit against a stale number. ----------------------------------------------
STANDARD_CANVAS = (32, 28)  # authored pixels; 46 of 54 shipped adults are exactly this
SCALE = bs.SCALE
GUTTER = bs.FRAME_GUTTER
SUPPORTED_FRAME_COUNTS = tuple(bs.SUPPORTED_FRAME_COUNTS)
MAX_LOOP_SECONDS = 3.0  # plant-sprites.test.ts 'loops within three seconds'
MIN_FPS = 4  # _stages.stage_fps floor
STAGE_HEIGHT = dict(bs.STAGE_HEIGHT)
HEIGHT_TOLERANCE = bs.HEIGHT_TOLERANCE
REQUIRED_STAGES = tuple(bs.DERIVED_STAGES)  # sprout, growing; flowering IS the adult
FACE_CHARS = ("o", "F", "E", "W", "c")
HUE_FLOOR_DEG = 34.0  # leaves never within 34 deg of the species' own flower (CLAUDE.md)
# Proposal, calibrated against the 54 shipped sprites (see sprite-spec.md section 8): the
# saturation above which a MID-lightness colour reads as neon. Advisory only.
NEON_SAT = 0.85
NEON_LIGHT = (0.30, 0.70)
# Two species whose foliage differs by less than this on hue AND on saturation and lightness
# are the "same green" the deck was rebuilt once to avoid. Advisory only.
SAME_GREEN = (2.0, 0.05, 0.05)

PASS, WARN, FAIL, SKIP, NA = "PASS", "WARN", "FAIL", "SKIP", "N/A"
RULES = {
    "R01": "module loads and declares the required SPRITE fields",
    "R02": "id is a scientific-name id, matches its filename, and is new",
    "R03": "canvas size, shared across all stages",
    "R04": "frame counts supported; loop within 3 s; fps floor",
    "R05": "growth stages present, 60%/80% height, speed rises, single canvas",
    "R06": "ground line shared across stages",
    "R07": "ink inside the canvas (nothing clipped at rest)",
    "R08": "frame 0 is one connected piece (every stage)",
    "R09": "face parts exist; features sit on the face in every frame (measured)",
    "R10": "palette complete, well formed, and the five face colours shared",
    "R11": "hue ownership: foliage vs own flower, saturation cap, not the same green",
    "R12": "avatar badge would not crop frame 0 at FRAME_FILL",
    "R13": "personality label is unique across the deck and the set",
    "R14": "a named gesture exists and moves a part other than the face",
    "R15": "no gesture shared with an existing species (motion fingerprint)",
    "R16": "no medicinal wording in the label; flagged lines for human review",
    "R17": "source is deterministic and self-contained",
    "R18": "built manifest entry matches the measured art (if supplied)",
    "R19": "built sheets match a fresh in-memory render (if supplied)",
}

MEDICINAL = re.compile(
    r"\b(heal(s|ing|er)?|cure[sd]?|curing|treat(s|ed|ing|ment)?|remed(y|ies)|medic\w*|"
    r"therap\w*|detox\w*|soothing|anti-?inflammator\w*|immune|relie[fv]\w*|pain|antiseptic|"
    r"antibacterial|disinfect\w*)\b",
    re.I,
)
# The label is what ships in the manifest and in docs, so it gets a stricter, no-context
# test. 'self-heal' mends its OWN leaf and the deck's existing source says so in a comment,
# which is why comments are only WARNED and a label is FAILED.
LABEL_BAN = re.compile(r"heal|cure|treat|remed|medic|sooth|therap|detox|relief|pain", re.I)

FORBIDDEN_IMPORTS = re.compile(
    r"^\s*(import|from)\s+(random|time|datetime|os|subprocess|socket|urllib|requests|secrets|uuid)\b",
    re.M,
)
ALLOWED_HELPERS = {"_face", "_stages", "_flowerhead"}


# ---------------------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------------------
def load_module(path: Path):
    spec = importlib.util.spec_from_file_location(f"qa_{path.stem}", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_set(source_dir: Path) -> dict[str, dict]:
    """{filename stem: {'path','text','sprite','error'}} for every authored module."""
    found = {}
    for path in sorted(source_dir.glob("*.py")):
        if path.name.startswith("_"):
            continue
        entry = {"path": path, "text": path.read_text(), "sprite": None, "error": None}
        try:
            entry["sprite"] = load_module(path).SPRITE
        except BaseException as exc:  # SystemExit from a helper counts as a failure too
            entry["error"] = f"{type(exc).__name__}: {exc}"
        found[path.stem] = entry
    return found


def extract_from_git(ref: str, path: str) -> Path:
    out = Path(tempfile.mkdtemp(prefix="sprite-set-"))
    tar = subprocess.run(
        ["git", "-C", str(ROOT), "archive", ref, path], capture_output=True, check=True
    ).stdout
    subprocess.run(["tar", "-x", "-C", str(out)], input=tar, check=True)
    return out / path


# ---------------------------------------------------------------------------------------
# In-memory rendering (the same geometry compile_sprite uses, minus every write)
# ---------------------------------------------------------------------------------------
def grid_rows(sprite: dict, frame: int) -> list[list[str]]:
    return bs.render_frame(sprite, frame)


def ink_box(grid) -> tuple[int, int, int, int] | None:
    pts = [(x, y) for y, row in enumerate(grid) for x, c in enumerate(row) if c != " "]
    if not pts:
        return None
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def content_fractions(sprite: dict) -> dict | None:
    """Frame-0 ink box as fractions of the SHIPPED frame, exactly as build_sprites measures it."""
    box = ink_box(grid_rows(sprite, 0))
    if box is None:
        return None
    width, height = sprite["size"]
    cell = width + 2 * GUTTER
    left, top, right, bottom = box
    fw, fh = cell * SCALE, height * SCALE
    return {
        "left": round(((GUTTER + left) * SCALE) / fw, 4),
        "top": round((top * SCALE) / fh, 4),
        "right": round(((GUTTER + right) * SCALE) / fw, 4),
        "bottom": round((bottom * SCALE) / fh, 4),
    }


def render_sheet(sprite: dict) -> Image.Image:
    width, height = sprite["size"]
    # An undefined colour renders magenta here so R10 can report it; the real build exits.
    palette = {c: tuple(v) for c, v in sprite["palette"].items()}
    cell = width + 2 * GUTTER
    sheet = Image.new("RGBA", (cell * sprite["frames"] * SCALE, height * SCALE), (0, 0, 0, 0))
    px = sheet.load()
    for f in range(sprite["frames"]):
        for y, row in enumerate(grid_rows(sprite, f)):
            for x, c in enumerate(row):
                if c == " ":
                    continue
                for sy in range(SCALE):
                    for sx in range(SCALE):
                        px[(f * cell + GUTTER + x) * SCALE + sx, y * SCALE + sy] = palette.get(c, (255, 0, 255, 255))
    return sheet


def clipped_pixels(sprite: dict, frame: int, margin: int = 24) -> int:
    """Pixels the build would silently drop for landing outside the canvas.

    `draw_part` skips out-of-bounds pixels without a word, so a part authored half off the
    canvas builds cleanly. Re-render on a larger canvas with every part shifted by `margin`
    and count the ink that falls outside the original rectangle.
    """
    w, h = sprite["size"]
    big = dict(sprite)
    big["size"] = (w + 2 * margin, h + 2 * margin)
    big["parts"] = [{**p, "origin": (p["origin"][0] + margin, p["origin"][1] + margin)} for p in sprite["parts"]]
    grid = grid_rows(big, frame)
    n = 0
    for y, row in enumerate(grid):
        for x, c in enumerate(row):
            if c != " " and not (margin <= x < margin + w and margin <= y < margin + h):
                n += 1
    return n


# ---------------------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------------------
def hls(rgba) -> tuple[float, float, float]:
    r, g, b = (v / 255 for v in rgba[:3])
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return h * 360.0, l, s


def hue_gap(a: float, b: float) -> float:
    d = abs(a - b) % 360.0
    return min(d, 360.0 - d)


ROLE_WORDS = {
    "leaf": re.compile(r"\b(leaf|leaves|foliage|stem|frond|needle|blade|sprout)\b", re.I),
    "flower": re.compile(
        r"\b(ray|petal|flower|bloom|blossom|floret|head|spike|berry|fruit|bract|cone|panicle|catkin|bud)\b",
        re.I,
    ),
}


def palette_roles(text: str) -> dict[str, str]:
    """{palette char: 'leaf'|'flower'} read from the trailing comments on PALETTE lines.

    Heuristic and labelled as one: the sources describe each colour in a `# leaf light`
    comment and nothing else says which colours are foliage. A char whose comment matches
    neither or both is left out, and R11 reports SKIP rather than guessing when either role
    ends up empty.
    """
    roles: dict[str, str] = {}
    for m in re.finditer(r'^\s*"(.)":\s*\(([^)]*)\),?\s*#\s*(.*)$', text, re.M):
        char, _, comment = m.groups()
        if char in FACE_CHARS:
            continue
        leaf, flower = (bool(ROLE_WORDS[k].search(comment)) for k in ("leaf", "flower"))
        if leaf != flower:
            roles[char] = "leaf" if leaf else "flower"
    return roles


def role_hls(sprite: dict, roles: dict[str, str]) -> dict[str, tuple[float, float, float] | None]:
    """Mean HLS of the colours each role uses, weighted by pixels drawn in frame 0."""
    counts: dict[str, int] = {}
    for row in grid_rows(sprite, 0):
        for c in row:
            if c in roles and c in sprite["palette"]:
                counts[c] = counts.get(c, 0) + 1
    out = {}
    for role in ("leaf", "flower"):
        total = sum(n for c, n in counts.items() if roles[c] == role)
        if not total:
            out[role] = None
            continue
        # Hue is circular, so average unit vectors rather than angles.
        import math

        sx = sy = sl = ss = 0.0
        for c, n in counts.items():
            if roles[c] != role:
                continue
            h, l, s = hls(sprite["palette"][c])
            sx += n * math.cos(math.radians(h))
            sy += n * math.sin(math.radians(h))
            sl += n * l
            ss += n * s
        out[role] = ((math.degrees(math.atan2(sy, sx)) % 360.0), sl / total, ss / total)
    return out


# ---------------------------------------------------------------------------------------
# Existing deck, for the cross-species rules
# ---------------------------------------------------------------------------------------
def motion_fingerprint(sprite: dict) -> tuple:
    """What the NON-FACE parts do over a loop: a proxy for 'the gesture'.

    A gesture is authored prose; the only thing a tool can compare is the choreography it
    produced. Two sprites with the same variant names on the same non-face parts, moving by
    the same offsets on the same frames, are the same animation wearing different art.
    """
    face = {"eyes", "cheeks", "mouth", "brows"}
    items = []
    for name, track in sorted(sprite.get("motion", {}).items()):
        if name in face:
            continue
        items.append(
            (
                name,
                tuple(track.get("art", ())),
                tuple(track.get("dx", ())),
                tuple(track.get("dy", ())),
                tuple(track.get("lean", ())),
            )
        )
    return tuple(items)


# Variant names every species reuses for ordinary poses; matching on these says nothing.
GENERIC_VARIANTS = {"left", "right", "up", "down", "lift", "wide", "blink", "half", "hidden",
                    "flat", "open", "shut", "happy", "rest", "bud", "closed", "open2"}


def gesture_vocabulary(sprite: dict) -> frozenset:
    """Variant names a non-face part switches to - coarser than the fingerprint, WARN-grade."""
    names = set()
    for name, track in sprite.get("motion", {}).items():
        if name in {"eyes", "cheeks", "mouth", "brows"}:
            continue
        names.update(a for a in track.get("art", ()) if a and a not in GENERIC_VARIANTS)
    return frozenset(names)


def moving_nonface_parts(sprite: dict) -> list[str]:
    moving = []
    for name, track in sprite.get("motion", {}).items():
        if name in {"eyes", "cheeks", "mouth", "brows"}:
            continue
        if any(a for a in track.get("art", ())) or any(track.get("dx", ())) or any(
            track.get("dy", ())
        ) or any(track.get("lean", ())):
            moving.append(name)
    return moving


def load_existing(skip: set[str]) -> dict[str, dict]:
    existing = {}
    for stem, entry in load_set(SOURCE_DIR).items():
        sprite = entry["sprite"]
        if sprite and sprite["herbId"] not in skip:
            existing[sprite["herbId"]] = {"sprite": sprite, "text": entry["text"]}
    return existing


def frame_fill() -> float:
    m = re.search(r"export const FRAME_FILL = ([0-9.]+);", PLANT_SPRITES_TS.read_text())
    if not m:
        raise SystemExit("plant-sprites.ts no longer exports FRAME_FILL")
    return float(m.group(1))


def badge_clip(sprite: dict, fill: float) -> float:
    """audit_sprites.badge_fit's measurement, on an in-memory frame 0."""
    sheet = render_sheet(sprite)
    fw = (sprite["size"][0] + 2 * GUTTER) * SCALE
    fh = sprite["size"][1] * SCALE
    frame = sheet.crop((0, 0, fw, fh))
    box = frame.getbbox()
    if box is None:
        return 0.0
    left, top, right, bottom = box[0] / fw, box[1] / fh, box[2] / fw, box[3] / fh
    width, height = right - left, bottom - top
    aspect = fw / fh
    scale = min(fill / width, fill * aspect / height)
    inner, sample = 32.0, 4
    dw = max(1, round(inner * scale * sample))
    dh = max(1, round(inner / aspect * scale * sample))
    alpha = frame.resize((dw, dh), Image.NEAREST).split()[3].load()
    cx, cy = (left + width / 2) * dw, (top + height / 2) * dh
    radius = inner * sample / 2
    clipped = sum(
        1
        for y in range(dh)
        for x in range(dw)
        if alpha[x, y] >= 8 and (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 > radius**2
    )
    return clipped / sample**2


# ---------------------------------------------------------------------------------------
# The checks
# ---------------------------------------------------------------------------------------
class Card:
    def __init__(self, stem: str):
        self.stem = stem
        self.results: dict[str, dict] = {}
        self.stages: dict[str, dict] = {}

    def add(self, rule: str, status: str, detail: str = "", **extra):
        prev = self.results.get(rule)
        # A rule that runs per stage keeps its worst status and joins the details.
        order = [NA, SKIP, PASS, WARN, FAIL]
        if prev:
            if order.index(status) > order.index(prev["status"]):
                prev["status"] = status
            if detail:
                prev["detail"] = (prev["detail"] + "; " + detail).strip("; ")
            return
        self.results[rule] = {"status": status, "detail": detail, **extra}

    def overall(self) -> str:
        statuses = {r["status"] for r in self.results.values()}
        return FAIL if FAIL in statuses else WARN if WARN in statuses else PASS


def check_card(
    stem: str,
    entry: dict,
    ctx: dict,
) -> Card:
    card = Card(stem)
    if entry["error"] or not entry["sprite"]:
        card.add("R01", FAIL, entry["error"] or "module defines no SPRITE")
        return card
    sprite = entry["sprite"]
    text = entry["text"]
    herb_id = sprite.get("herbId", "")

    # R01 -------------------------------------------------------------------------------
    need = ("herbId", "size", "frames", "fps", "personality", "parts", "motion", "palette")
    missing = [k for k in need if k not in sprite]
    if missing:
        card.add("R01", FAIL, f"SPRITE lacks {missing}")
        return card
    card.add("R01", PASS)

    # R02 -------------------------------------------------------------------------------
    problems = []
    if not re.fullmatch(r"[a-z]+-[a-z]+(-[a-z]+)?", herb_id):
        problems.append(f"'{herb_id}' is not a lowercase scientific-name id (genus-epithet)")
    if herb_id.replace("-", "_") != stem:
        problems.append(f"filename '{stem}.py' does not match id '{herb_id}'")
    if herb_id in ctx["existing_ids"]:
        problems.append(f"'{herb_id}' already has a shipped sprite")
    card.add("R02", FAIL if problems else PASS, "; ".join(problems))

    # Build every stage (the same code path the build uses), catching its hard exits. ----
    stage_sprites: dict[str, dict] = {"flowering": sprite}
    try:
        for name, staged in bs.staged_sprites(sprite).items():
            stage_sprites[name] = staged
        stage_error = None
    except SystemExit as exc:
        stage_error = str(exc)
    except Exception as exc:  # noqa: BLE001
        stage_error = f"{type(exc).__name__}: {exc}"
    # The Boss Form is a fourth, optional form with its own canvas and rules (build_sprites
    # check_boss); it is not part of the sprout/growing/flowering ladder this spec covers.
    boss = stage_sprites.pop("boss", None)
    card.stage_sprites = stage_sprites  # type: ignore[attr-defined]
    if boss is not None:
        card.add("R05", PASS, "declares a boss form; out of scope for this spec and not checked")

    # R03 -------------------------------------------------------------------------------
    size = tuple(sprite["size"])
    if size == STANDARD_CANVAS:
        card.add("R03", PASS, f"{size[0]}x{size[1]}")
    else:
        card.add("R03", WARN, f"canvas {size[0]}x{size[1]} is not the standard {STANDARD_CANVAS}; "
                 "46 of 54 shipped sprites use the standard, one larger canvas exists")
    for name, st in stage_sprites.items():
        if tuple(st["size"]) != size:
            card.add("R03", FAIL, f"{name} canvas {tuple(st['size'])} differs from the adult's {size}")

    # R04 -------------------------------------------------------------------------------
    for name, st in stage_sprites.items():
        f, fps = st["frames"], st["fps"]
        if f not in SUPPORTED_FRAME_COUNTS:
            card.add("R04", FAIL, f"{name}: {f} frames not in {SUPPORTED_FRAME_COUNTS}")
        elif f / fps > MAX_LOOP_SECONDS:
            card.add("R04", FAIL, f"{name}: loop {f / fps:.2f}s exceeds {MAX_LOOP_SECONDS}s")
        elif fps < MIN_FPS:
            card.add("R04", FAIL, f"{name}: {fps}fps below the floor {MIN_FPS}")
        else:
            card.add("R04", PASS)
        for part, track in st["motion"].items():
            for key in ("art", "dx", "dy", "lean"):
                n = len(track.get(key, ()))
                if n and f % n:
                    card.add("R04", WARN, f"{name}: '{part}'.{key} has {n} entries; {f} frames "
                             "loop with a seam (render wraps with %)")

    # R05 -------------------------------------------------------------------------------
    if stage_error:
        card.add("R05", FAIL, f"stage build refused: {stage_error}")
    missing_stages = [s for s in REQUIRED_STAGES if s not in stage_sprites]
    if missing_stages:
        card.add("R05", FAIL, f"missing derived stage(s): {missing_stages}")
    elif not stage_error:
        adult_h = bs.ink_height(sprite)
        heights = {s: round(bs.ink_height(stage_sprites[s]) / adult_h, 3) for s in REQUIRED_STAGES}
        fps = [stage_sprites[s]["fps"] for s in REQUIRED_STAGES] + [sprite["fps"]]
        card.add("R05", PASS, f"heights {heights}, fps {fps}")
        card.stages["heights"] = heights  # type: ignore[assignment]

    # R06 / R07 / R08 / R12 ------------------------------------------------------------
    bottoms = {}
    for name, st in stage_sprites.items():
        box = ink_box(grid_rows(st, 0))
        if box is None:
            card.add("R08", FAIL, f"{name}: frame 0 is empty")
            continue
        bottoms[name] = box[3]
        l, t, r, b = box
        w, h = st["size"]
        clipped0 = clipped_pixels(st, 0)
        if clipped0:
            card.add("R07", FAIL, f"{name}: {clipped0}px of frame 0 fall outside the canvas and are dropped")
        else:
            other = sum(clipped_pixels(st, f) for f in range(1, st["frames"]))
            note = []
            if other:
                note.append(f"{name}: {other}px leave the canvas in later frames (acceptable only for a flung element)")
            if l == 0 or t == 0 or r == w or b == h:
                note.append(f"{name}: frame 0 ink touches the canvas edge {box}")
            card.add("R07", PASS, "; ".join(note))
        pieces = au.pieces(grid_rows(st, 0))
        if len(pieces) > 1:
            card.add("R08", FAIL, f"{name}: {len(pieces)} pieces ({', '.join(map(str, pieces))} px)")
        else:
            card.add("R08", PASS)
        fill = ctx["fill"]
        clip = badge_clip(st, fill)
        if clip:
            card.add("R12", FAIL, f"{name}: {clip:.1f}px outside the badge circle at fill {fill}")
        else:
            card.add("R12", PASS)
    if "flowering" in bottoms and len(bottoms) > 1:
        off = {n: b - bottoms["flowering"] for n, b in bottoms.items() if b != bottoms["flowering"]}
        if any(abs(v) > 1 for v in off.values()):
            # WARN, not FAIL: calibrated on the shipped deck, where 8 of 54 species drift
            # by more than a row between stages and plant-sprites.test.ts only pins heights.
            card.add("R06", WARN, f"ground line differs from the adult by >1 row: {off}")
        elif off:
            card.add("R06", PASS, f"stage ground line within 1 row of the adult's: {off}")
        else:
            card.add("R06", PASS, f"all stages end on row {bottoms['flowering']}")
    else:
        card.add("R06", SKIP, "needs the adult and at least one stage")

    # R09 -------------------------------------------------------------------------------
    for name, st in stage_sprites.items():
        part_names = [p["name"] for p in st["parts"]]
        if "eyes" not in part_names or "mouth" not in part_names:
            card.add("R09", FAIL, f"{name}: has no eyes/mouth part (the face is not removable)")
            continue
        face_char = st.get("faceChar", "F")
        grid0 = grid_rows(st, 0)
        fpx = [(x, y) for y, row in enumerate(grid0) for x, c in enumerate(row) if c == face_char]
        if not fpx:
            card.add("R09", FAIL, f"{name}: no face pixels in frame 0")
            continue
        fw = max(x for x, _ in fpx) - min(x for x, _ in fpx) + 1
        fh = max(y for _, y in fpx) - min(y for _, y in fpx) + 1
        problems = au.audit({**st, "herbId": name_id(sprite, name)})
        if problems:
            card.add("R09", FAIL, f"{name}: {len(problems)} audit problem(s); first: {problems[0]}")
        else:
            card.add("R09", PASS, f"{name}: face {fw}x{fh}px")

    # R10 -------------------------------------------------------------------------------
    pal = sprite["palette"]
    bad = [c for c, v in pal.items() if len(c) != 1 or c == " " or len(v) != 4 or not all(isinstance(n, int) and 0 <= n <= 255 for n in v)]
    used = set()
    undefined_set = set()
    for name, st in stage_sprites.items():
        seen = set()
        for f in range(st["frames"]):
            for row in grid_rows(st, f):
                seen.update(c for c in row if c != " ")
        used |= seen
        undefined_set |= {c for c in seen if c not in st["palette"]}
    undefined = sorted(undefined_set)
    # `apply_stage` layers FACE_PALETTE under every stage, so the adult must carry its own.
    adult_used = set()
    for f in range(sprite["frames"]):
        for row in grid_rows(sprite, f):
            adult_used.update(c for c in row if c != " ")
    adult_undefined = sorted(c for c in adult_used if c not in pal)
    semi = [c for c, v in pal.items() if len(v) == 4 and v[3] != 255]
    diverged = {c: pal[c] for c in FACE_CHARS if c in pal and tuple(pal[c]) != FACE_PALETTE[c]}
    unused = sorted(c for c in pal if c not in used)
    if bad or adult_undefined or undefined or semi:
        card.add("R10", FAIL, f"malformed {bad}; undefined in adult {adult_undefined}; undefined in stages {undefined}; semi-transparent {semi}")
    elif diverged:
        card.add("R10", WARN, f"face colour(s) {sorted(diverged)} differ from FACE_PALETTE; "
                 "allowed only if the source says it is deliberate")
    else:
        card.add("R10", PASS, f"palette entries never drawn: {unused}" if unused else "")

    # R11 -------------------------------------------------------------------------------
    roles = palette_roles(text)
    rh = role_hls(sprite, roles)
    details, status = [], PASS
    leaf = rh["leaf"]
    undetermined = rh["leaf"] is None or rh["flower"] is None
    if not undetermined:
        gap = hue_gap(rh["leaf"][0], rh["flower"][0])
        details.append(f"leaf {rh['leaf'][0]:.0f} deg, flower {rh['flower'][0]:.0f} deg, gap {gap:.0f} deg")
        if gap < HUE_FLOOR_DEG:
            status = WARN
            details.append(f"gap under the {HUE_FLOOR_DEG:.0f} deg floor")
    neon = [c for c, v in pal.items() if c not in FACE_CHARS and len(v) == 4
            and NEON_LIGHT[0] <= hls(v)[1] <= NEON_LIGHT[1] and hls(v)[2] > NEON_SAT]
    if neon:
        status = WARN
        details.append(f"mid-lightness colour(s) {neon} over saturation {NEON_SAT}")
    if leaf is not None:
        near = None
        for oid, other in ctx["existing_foliage"].items():
            d = hue_gap(leaf[0], other[0])
            if near is None or d < near[0]:
                near = (d, oid, other)
        if near:
            d, oid, other = near
            same = d < SAME_GREEN[0] and abs(leaf[2] - other[2]) < SAME_GREEN[1] and abs(leaf[1] - other[1]) < SAME_GREEN[2]
            details.append(f"nearest shipped foliage: {oid} ({d:.1f} deg)")
            if same:
                status = WARN
                details.append(f"indistinguishable from {oid} on hue, saturation and lightness")
    if undetermined:
        details.append("leaf/flower colours not both identifiable from PALETTE comments - hue gap needs a human eye")
        if status == PASS:
            status = SKIP
    card.add("R11", status, "; ".join(details), leafHue=None if leaf is None else round(leaf[0], 1))

    # R13 -------------------------------------------------------------------------------
    label = str(sprite["personality"]).strip()
    clash = [i for i, p in ctx["existing_personality"].items() if p.lower() == label.lower()]
    clash += [o for o, p in ctx["set_personality"].items() if o != herb_id and p.lower() == label.lower()]
    if not label:
        card.add("R13", FAIL, "empty personality label")
    elif clash:
        card.add("R13", FAIL, f"label '{label}' is already used by {clash}")
    else:
        card.add("R13", PASS, f"'{label}'")

    # R14 -------------------------------------------------------------------------------
    doc = (sys.modules.get(f"qa_{stem}").__doc__ or "") if f"qa_{stem}" in sys.modules else ""
    # A gesture is named in capitals the way the shipped sources do it ("THE PINWHEEL:",
    # "THE TINGLE, frames 2-8"). Section headings that are not gestures are excluded.
    named = re.search(
        r"\bTHE (?!DESIGN HOOK|PERSONALITY|COLOUR|COLOR|SAFETY|PALETTE|FACE|CARD)[A-Z][A-Z' -]{2,}(?=[:,.])|\bGESTURE\b",
        doc + "\n" + text,
    )
    movers = moving_nonface_parts(sprite)
    if not movers:
        card.add("R14", FAIL, "only the face animates; no part of the plant has a gesture")
    elif not named:
        card.add("R14", WARN, f"parts move ({', '.join(movers)}) but no gesture is named in capitals in the source")
    else:
        card.add("R14", PASS, f"'{named.group(0).strip()}' moving {', '.join(movers)}")

    # R15 -------------------------------------------------------------------------------
    fp = motion_fingerprint(sprite)
    vocab = gesture_vocabulary(sprite)
    same_fp = [i for i, o in ctx["existing_sprites"].items() if fp and motion_fingerprint(o) == fp]
    same_fp += [o for o, s in ctx["set_sprites"].items() if o != herb_id and fp and motion_fingerprint(s) == fp]
    same_vocab = [i for i, o in ctx["existing_sprites"].items() if vocab and gesture_vocabulary(o) == vocab]
    same_vocab += [o for o, s in ctx["set_sprites"].items() if o != herb_id and vocab and gesture_vocabulary(s) == vocab]
    if same_fp:
        card.add("R15", FAIL, f"identical choreography to {same_fp}")
    elif same_vocab:
        card.add("R15", WARN, f"same gesture vocabulary {sorted(vocab)} as {same_vocab}; a human must confirm the gestures differ")
    else:
        card.add("R15", PASS, f"vocabulary {sorted(vocab) or 'offsets only'}")

    # R16 -------------------------------------------------------------------------------
    if LABEL_BAN.search(label):
        card.add("R16", FAIL, f"personality label '{label}' reads as a medicinal term")
    else:
        lines = [(n + 1, ln.strip()) for n, ln in enumerate(text.splitlines())
                 if MEDICINAL.search(ln) and not ln.lstrip().startswith(("import", "from"))]
        if lines:
            card.add("R16", WARN, f"{len(lines)} source line(s) use medicinal vocabulary - read them: "
                     + " | ".join(f"L{n}: {ln[:90]}" for n, ln in lines[:4]))
        else:
            card.add("R16", PASS)

    # R17 -------------------------------------------------------------------------------
    imports = sorted(set(re.findall(r"^\s*from\s+(\w+)\s+import", text, re.M)))
    foreign = [m for m in imports if m not in ALLOWED_HELPERS]
    forbidden = FORBIDDEN_IMPORTS.findall(text)
    if forbidden or foreign:
        card.add("R17", FAIL if forbidden else WARN,
                 f"forbidden imports {sorted({f[1] for f in forbidden})}; non-helper imports {foreign}")
    else:
        card.add("R17", PASS)

    return card


def name_id(sprite: dict, stage: str) -> str:
    return sprite["herbId"] if stage == "flowering" else f"{sprite['herbId']}-{stage}"


# ---------------------------------------------------------------------------------------
# Built-artefact checks (R18/R19), only when a build is supplied
# ---------------------------------------------------------------------------------------
def check_built(card: Card, entry: dict, manifest: dict | None, build_dir: Path | None):
    sprite = entry["sprite"]
    if not sprite or not hasattr(card, "stage_sprites"):
        return
    herb_id = sprite["herbId"]
    if manifest is None:
        card.add("R18", SKIP, "no manifest supplied")
    elif herb_id not in manifest:
        card.add("R18", FAIL, "no manifest entry")
    else:
        top = manifest[herb_id]
        for stage, st in card.stage_sprites.items():  # type: ignore[attr-defined]
            m = top if stage == "flowering" else (top.get("stages") or {}).get(stage)
            if m is None:
                card.add("R18", FAIL, f"{stage}: missing from manifest")
                continue
            w, h = st["size"]
            want = {"frameWidth": (w + 2 * GUTTER) * SCALE, "frameHeight": h * SCALE,
                    "frames": st["frames"], "fps": st["fps"], "personality": st["personality"]}
            wrong = {k: (m.get(k), v) for k, v in want.items() if m.get(k) != v}
            measured = content_fractions(st)
            got = m.get("content")
            if not got:
                wrong["content"] = ("absent", measured)
            elif measured and any(abs(got[k] - measured[k]) > 1e-4 for k in measured):
                wrong["content"] = (got, measured)
            for key in ("src", "still", "stillVersion", "version"):
                if not m.get(key):
                    wrong[key] = ("absent", "required")
            if m.get("version") and not re.fullmatch(r"[0-9a-f]{8}", m["version"]):
                wrong["version"] = (m["version"], "8 hex chars")
            if wrong:
                card.add("R18", FAIL, f"{stage}: {wrong}")
            else:
                card.add("R18", PASS, f"{stage}: manifest entry and content box match the measured art")
    if build_dir is None:
        card.add("R19", SKIP, "no build directory supplied")
        return
    for stage, st in card.stage_sprites.items():  # type: ignore[attr-defined]
        sid = name_id(sprite, stage)
        path = build_dir / f"{sid}.png"
        if not path.exists():
            card.add("R19", FAIL, f"{stage}: {path.name} not found")
            continue
        sheet = Image.open(path).convert("RGBA")
        fresh = render_sheet(st)
        if sheet.size != fresh.size:
            card.add("R19", FAIL, f"{stage}: sheet is {sheet.size}, a fresh render is {fresh.size}")
        elif sheet.tobytes() != fresh.tobytes():
            diff = sum(1 for a, b in zip(sheet.getdata(), fresh.getdata()) if a != b)
            card.add("R19", FAIL, f"{stage}: {diff}px differ from a fresh render of the source (stale build)")
        else:
            m = None
            if manifest and sprite["herbId"] in manifest:
                top = manifest[sprite["herbId"]]
                m = top if stage == "flowering" else (top.get("stages") or {}).get(stage)
            sha = hashlib.sha1(path.read_bytes()).hexdigest()[:8]
            if m and m.get("version") and m["version"] != sha:
                card.add("R19", FAIL, f"{stage}: manifest version {m['version']} != file hash {sha}")
            else:
                card.add("R19", PASS, f"{stage}: sheet identical to a fresh render")


# ---------------------------------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sources", type=Path, help="directory of authored species modules")
    ap.add_argument("--git-ref", help="read --git-path from this ref instead of the working tree")
    ap.add_argument("--git-path", help="path inside --git-ref holding src/ and _build/")
    ap.add_argument("--build-dir", type=Path, help="directory of built PNG sheets (optional)")
    ap.add_argument("--manifest", type=Path, help="built manifest.json for the set (optional)")
    ap.add_argument("--ids", help="comma-separated file stems or herb ids to check")
    ap.add_argument("--control", action="store_true", help="check the shipped sprite_sources as a calibration run")
    ap.add_argument("--out", type=Path, help="write the JSON report here")
    ap.add_argument("--format", choices=("json", "text"), default="text")
    args = ap.parse_args()

    base = None
    if args.git_ref:
        if not args.git_path:
            ap.error("--git-ref needs --git-path")
        base = extract_from_git(args.git_ref, args.git_path)
        args.sources = args.sources or base / "src"
        args.build_dir = args.build_dir or (base / "_build" if (base / "_build").exists() else None)
        if args.manifest is None and args.build_dir and (args.build_dir / "manifest.json").exists():
            args.manifest = args.build_dir / "manifest.json"
    if args.control:
        args.sources = SOURCE_DIR
    if not args.sources:
        ap.error("give --sources, --git-ref/--git-path, or --control")

    entries = load_set(args.sources)
    if args.ids:
        want = {i.strip().replace("-", "_") for i in args.ids.split(",")}
        entries = {k: v for k, v in entries.items() if k in want}
    set_ids = {e["sprite"]["herbId"] for e in entries.values() if e["sprite"]}

    existing = {} if args.control else load_existing(skip=set())
    # In control mode each species is compared with the OTHER 53/54, which is the calibration
    # that tells us whether a rule would flag the existing deck against itself.
    pool = load_existing(skip=set()) if args.control else existing
    manifest_existing = json.loads(EXISTING_MANIFEST.read_text())
    manifest = json.loads(args.manifest.read_text()) if args.manifest else None

    def foliage(pool_sprites: dict) -> dict:
        out = {}
        for oid, o in pool_sprites.items():
            lh = role_hls(o["sprite"], palette_roles(o["text"])).get("leaf")
            if lh:
                out[oid] = lh
        return out

    base_ctx = {
        "fill": frame_fill(),
        "existing_ids": set() if args.control else set(manifest_existing),
        "existing_sprites": {i: o["sprite"] for i, o in pool.items()},
        "existing_personality": {i: o["sprite"]["personality"] for i, o in pool.items()},
        "existing_foliage": foliage(pool),
        "set_sprites": {e["sprite"]["herbId"]: e["sprite"] for e in entries.values() if e["sprite"]},
        "set_personality": {e["sprite"]["herbId"]: e["sprite"]["personality"] for e in entries.values() if e["sprite"]},
    }

    cards: dict[str, dict] = {}
    for stem, entry in entries.items():
        ctx = dict(base_ctx)
        if args.control and entry["sprite"]:
            me = entry["sprite"]["herbId"]
            ctx["existing_sprites"] = {i: s for i, s in base_ctx["existing_sprites"].items() if i != me}
            ctx["existing_personality"] = {i: p for i, p in base_ctx["existing_personality"].items() if i != me}
            ctx["existing_foliage"] = {i: s for i, s in base_ctx["existing_foliage"].items() if i != me}
            ctx["set_sprites"] = {me: entry["sprite"]}
            ctx["set_personality"] = {me: entry["sprite"]["personality"]}
        try:
            card = check_card(stem, entry, ctx)
        except Exception as exc:  # noqa: BLE001 - a crash is a FAIL of the sprite, never a pass
            card = Card(stem)
            card.add("R01", FAIL, f"checker crashed on this module: {type(exc).__name__}: {exc}")
        if not args.control:
            check_built(card, entry, manifest, args.build_dir)
        herb_id = entry["sprite"]["herbId"] if entry["sprite"] else stem
        cards[herb_id] = {
            "file": f"{stem}.py",
            "overall": card.overall(),
            "rules": card.results,
            "measured": card.stages,
        }

    counts = {s: sum(1 for c in cards.values() if c["overall"] == s) for s in (PASS, WARN, FAIL)}
    report = {
        "tool": "scripts/expansion/check_sprite_set.py",
        "toolVersion": TOOL_VERSION,
        "verdictWording": "PASS means passes automated QA; it is not approval of any sprite",
        "frameFill": base_ctx["fill"],
        "supportedFrameCounts": list(SUPPORTED_FRAME_COUNTS),
        "ruleDefinitions": RULES,
        "comparedAgainstExistingSprites": len(pool) if not args.control else len(pool) - 1,
        "summary": counts,
        "cards": cards,
    }
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(report, indent=2, default=list) + "\n")
    if args.format == "json":
        print(json.dumps(report, indent=2, default=list))
    else:
        print_text(report)
    return 1 if counts[FAIL] else 0


def print_text(report: dict) -> None:
    rules = list(report["ruleDefinitions"])
    for herb_id, card in report["cards"].items():
        print(f"{herb_id}: {card['overall']}")
        for rule in rules:
            r = card["rules"].get(rule)
            if not r or r["status"] in (PASS, NA) and not r["detail"]:
                continue
            if r["status"] == PASS:
                continue
            print(f"  {rule} {r['status']:<4} {r['detail'][:200]}")
    print(f"summary: {report['summary']}")


if __name__ == "__main__":
    sys.exit(main())
