"""Validate generated assets, store them as new versions, and format them on the card.

THE ORIGINAL PHOTOGRAPH AND THE AI-GENERATED DERIVATIVE ARE DIFFERENT KINDS OF THING and are
stored in different folders with different provenance records:

    <assets>/<card>_<species>/original_selected/   iNaturalist photographs (CC0, untouched)
    <assets>/<card>_<species>/generated/<asset>/vN/ AI-generated derivatives (never CC0 data;
                                                   botanical review required before approval)

Validation here checks FILES, not botany. A transparent, correctly sized, genuinely pixel-
art file can still show a leaf the plant does not have; that is what the recorded botanical
review is for, and `approve` refuses without it.
"""
from __future__ import annotations

import io
import json
import pathlib
import shutil
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from production import ledger as L  # noqa: E402

PROD = L.PROD
SPEC_FILE = PROD / "spec.json"

DEFAULT_SPEC = {
    "_what": "Validation thresholds. Edit here, not in code. `confirmed:false` means the number is a "
             "placeholder the repository never defined and a person must confirm it.",
    "main_image": {
        "confirmed": True,
        "formats": ["PNG", "WEBP"],
        "min_transparent_fraction": 0.10,
        "min_opaque_fraction": 0.05,
        "min_transparent_corners": 3,
        "min_subject_height_px": 484,        # the template's art window is 593x484 (SLOT_PHOTO)
        "recommended_subject_height_px": 968,  # 2x, so the window is filled without upscaling
        "note": "Placement is also tested with the real placement code (max 2.0x upscale)."},
    "pixel_icon": {
        "confirmed": True,
        "min_px": 21, "max_px": 24,
        "formats": ["PNG"],
        "min_transparent_fraction": 0.15,
        "min_transparent_corners": 4,
        "max_semi_transparent_fraction": 0.02,
        "warn_colours": 24, "fail_colours": 40,
        "max_smooth_gradient_share": 0.35},
    "tall_preview": {
        "confirmed": False,
        "formats": ["PNG", "WEBP", "JPEG"],
        "min_width_px": 600, "min_height_px": 900, "min_aspect_h_over_w": 1.3,
        "note": "PLACEHOLDER. The repository does not define a 'tall preview'. Confirm these numbers."},
}


def spec() -> dict:
    if SPEC_FILE.exists():
        return json.loads(SPEC_FILE.read_text())
    return DEFAULT_SPEC


def _open(path: pathlib.Path):
    try:
        im = Image.open(path)
        im.load()
        return im
    except Exception as e:  # noqa: BLE001
        return e


def result(ok_errors, warnings, metrics) -> dict:
    return {"ok": not ok_errors, "errors": ok_errors, "warnings": warnings, "metrics": metrics}


# --- main image ------------------------------------------------------------------------

def validate_main(path: pathlib.Path, sp: dict | None = None) -> dict:
    sp = (sp or spec())["main_image"]
    err, warn, m = [], [], {}
    im = _open(path)
    if isinstance(im, Exception):
        return result([f"not a readable image: {im}"], [], {})
    m["format"], m["mode"], m["size"] = im.format, im.mode, list(im.size)
    if im.format not in sp["formats"]:
        err.append(f"format {im.format} not allowed (need {'/'.join(sp['formats'])})")
    if im.mode not in ("RGBA", "LA", "PA") and "transparency" not in im.info:
        err.append(f"no alpha channel (mode {im.mode}); a main image must be genuinely transparent")
        return result(err, warn, m)
    a = np.array(im.convert("RGBA").getchannel("A"))
    n = a.size
    transparent, opaque = float((a == 0).sum()) / n, float((a == 255).sum()) / n
    m.update(transparent_fraction=round(transparent, 3), opaque_fraction=round(opaque, 3))
    if transparent < sp["min_transparent_fraction"]:
        err.append(f"only {transparent:.1%} of pixels are transparent; this is not a cutout "
                   f"(need at least {sp['min_transparent_fraction']:.0%})")
    if opaque < sp["min_opaque_fraction"]:
        err.append(f"only {opaque:.1%} of pixels are opaque; the subject is missing or faint")
    h, w = a.shape
    corners = sum(int(a[y, x] == 0) for y in (0, h - 1) for x in (0, w - 1))
    m["transparent_corners"] = corners
    if corners < sp["min_transparent_corners"]:
        err.append(f"only {corners} of 4 corners are transparent; the background was not removed")
    ys, xs = np.nonzero(a > 127)
    if len(xs):
        bw, bh = int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)
        m["subject_px"] = [bw, bh]
        if bh < sp["min_subject_height_px"]:
            err.append(f"subject is {bh}px tall; the template window needs at least {sp['min_subject_height_px']}px")
        elif bh < sp["recommended_subject_height_px"]:
            warn.append(f"subject is {bh}px tall; {sp['recommended_subject_height_px']}px+ leaves headroom for sharp placement")
        # THE REAL TEST: can the existing placement code seat it without refusing?
        try:
            import photo_pipeline as P
            cut = im.convert("RGBA")
            try:
                P.place_rooted(cut, P.style_profile())
            except P.Unplaceable as e:
                err.append(f"placement code refuses it: {e}")
        except ImportError as e:
            warn.append(f"placement check skipped (missing dependency: {e})")
    semi = float(((a > 0) & (a < 255)).sum()) / n
    m["semi_transparent_fraction"] = round(semi, 4)
    if semi == 0:
        warn.append("no soft edge in the alpha; the deck's cutouts are soft (formatting will soften the rim)")
    return result(err, warn, m)


# --- pixel icon ------------------------------------------------------------------------

def smooth_gradient_share(rgba: np.ndarray) -> float:
    """Of adjacent opaque pixel pairs that differ at all, what share differ only SLIGHTLY?

    Pixel art jumps between a few flat colours, so differences are zero or large. A photo
    shrunk to 24px is full of tiny differences. This is a heuristic, which is why the review
    board also shows the icon enlarged with nearest-neighbour for a person to judge.
    """
    op = rgba[..., 3] > 127
    rgb = rgba[..., :3].astype(int)
    diffs = []
    for dy, dx in ((0, 1), (1, 0)):
        a = rgb[: rgb.shape[0] - dy, : rgb.shape[1] - dx]
        b = rgb[dy:, dx:]
        both = op[: op.shape[0] - dy, : op.shape[1] - dx] & op[dy:, dx:]
        d = np.abs(a - b).sum(axis=2)[both]
        diffs.append(d)
    d = np.concatenate(diffs) if diffs else np.array([])
    d = d[d > 0]
    if len(d) == 0:
        return 0.0
    return float((d < 36).sum()) / len(d)


def validate_pixel(path: pathlib.Path, sp: dict | None = None) -> dict:
    sp = (sp or spec())["pixel_icon"]
    err, warn, m = [], [], {}
    im = _open(path)
    if isinstance(im, Exception):
        return result([f"not a readable image: {im}"], [], {})
    w, h = im.size
    m.update(format=im.format, mode=im.mode, size=[w, h])
    if im.format not in sp["formats"]:
        err.append(f"format {im.format} not allowed (need PNG; lossy formats smear pixel art)")
    if not (sp["min_px"] <= w <= sp["max_px"] and sp["min_px"] <= h <= sp["max_px"]):
        err.append(f"native size is {w}x{h}; a pixel icon must be {sp['min_px']}-{sp['max_px']}px on each side "
                   "(an enlarged or shrunk-to-fit file does not count)")
    elif w != h:
        warn.append(f"icon is {w}x{h}, not square")
    if im.mode not in ("RGBA", "LA", "PA") and "transparency" not in im.info:
        err.append(f"no alpha channel (mode {im.mode}); the background must be transparent")
        return result(err, warn, m)
    rgba = np.array(im.convert("RGBA"))
    a = rgba[..., 3]
    n = a.size
    transparent = float((a == 0).sum()) / n
    semi = float(((a > 0) & (a < 255)).sum()) / n
    corners = sum(int(a[y, x] == 0) for y in (0, h - 1) for x in (0, w - 1))
    colours = len({tuple(p) for p in rgba[a > 127][:, :3].tolist()})
    smooth = smooth_gradient_share(rgba)
    m.update(transparent_fraction=round(transparent, 3), semi_transparent_fraction=round(semi, 3),
             transparent_corners=corners, opaque_colours=colours, smooth_gradient_share=round(smooth, 3))
    if transparent < sp["min_transparent_fraction"]:
        err.append(f"only {transparent:.1%} transparent; the background is not transparent")
    if corners < sp["min_transparent_corners"]:
        err.append(f"only {corners} of 4 corners transparent; the background was not removed")
    if semi > sp["max_semi_transparent_fraction"]:
        err.append(f"{semi:.1%} of pixels are semi-transparent; genuine pixel art has hard, binary edges")
    if colours > sp["fail_colours"]:
        err.append(f"{colours} distinct colours; pixel art uses a small palette (this reads as a downscaled photo)")
    elif colours > sp["warn_colours"]:
        warn.append(f"{colours} distinct colours is a large palette for pixel art")
    if smooth > sp["max_smooth_gradient_share"]:
        err.append(f"{smooth:.0%} of colour changes are tiny smooth gradients; pixel art has flat colours and hard steps")
    return result(err, warn, m)


# --- tall preview ----------------------------------------------------------------------

def validate_tall(path: pathlib.Path, sp: dict | None = None) -> dict:
    full = (sp or spec())["tall_preview"]
    err, warn, m = [], [], {}
    im = _open(path)
    if isinstance(im, Exception):
        return result([f"not a readable image: {im}"], [], {})
    w, h = im.size
    m.update(format=im.format, mode=im.mode, size=[w, h], spec_confirmed=full.get("confirmed", False))
    if im.format not in full["formats"]:
        err.append(f"format {im.format} not allowed")
    if w < full["min_width_px"] or h < full["min_height_px"]:
        err.append(f"{w}x{h} is below the required {full['min_width_px']}x{full['min_height_px']}")
    if w and h / w < full["min_aspect_h_over_w"]:
        err.append(f"aspect {h / w:.2f} (height/width) is not tall enough; need at least {full['min_aspect_h_over_w']}")
    if not full.get("confirmed", False):
        warn.append("tall_preview dimensions are an UNCONFIRMED placeholder spec; confirm them in spec.json")
    return result(err, warn, m)


VALIDATORS = {"main_image": validate_main, "pixel_icon": validate_pixel, "tall_preview": validate_tall}


# --- importing a generated file --------------------------------------------------------

def asset_dir(assets_root: pathlib.Path, c: dict, asset: str) -> pathlib.Path:
    return pathlib.Path(assets_root) / L.folder(c) / "generated" / asset


def import_asset(led: L.Ledger, assets_root: pathlib.Path, card: int, asset: str, src: pathlib.Path,
                 by: str, tool: str = "ChatGPT") -> dict:
    """Validate and store as a NEW version. Invalid files are recorded but never stored as
    usable, and nothing already stored is ever overwritten."""
    c = led.card(card)
    if asset not in L.ASSETS:
        raise L.LedgerError(f"unknown asset {asset!r}")
    if not c.get("selection"):
        raise L.LedgerError(f"#{card} has no imported selection yet; import the selection first, so the derivative "
                            "has an original to be traced to")
    if c.get("approval"):
        raise L.LedgerError(f"#{card} is APPROVED. Approved assets are never overwritten; run "
                            f"`pd regenerate {card} --asset {asset} --confirm-unapprove --reason ...` first.")
    src = pathlib.Path(src)
    if not src.exists():
        raise L.LedgerError(f"{src} does not exist")
    a = c["assets"][asset]
    n = len(a["versions"]) + 1
    verdict = VALIDATORS[asset](src)
    role = L.ROLE_OF_ASSET[asset]
    pid = c["selection"][role]
    src_photo = next((p for p in c["collection"]["candidates"] if p["photo_id"] == pid), {})
    rec = {"n": n, "validation": verdict, "imported_at": L.now(), "imported_by": by,
           "source_file": src.name,
           "provenance": {
               "kind": "ai_generated_derivative",
               "generated_with": tool,
               "derived_from": {"kind": "original_photograph", "role": role, "photo_id": pid,
                                "observation_url": src_photo.get("observation_url"),
                                "license_code": src_photo.get("license_code"),
                                "photographer": src_photo.get("photographer"),
                                "original_sha256": src_photo.get("sha256")},
               "botanical_review_required": True,
               "note": "AI-generated details are not botanical evidence; each must be checked against the plant."}}
    if verdict["ok"]:
        dest = asset_dir(assets_root, c, asset) / f"v{n}"
        dest.mkdir(parents=True, exist_ok=True)
        target = dest / f"{asset}{src.suffix.lower()}"
        shutil.copy2(src, target)
        rec["file"] = str(target.relative_to(assets_root))
        rec["sha256"] = L.sha256_file(target)
        a["regenerate"] = None
    a["versions"].append(rec)
    a["attempt"] = n
    a["review"] = None if verdict["ok"] else a.get("review")
    led.event(c, "asset_imported", asset=asset, version=n, ok=verdict["ok"], errors=verdict["errors"])
    led.recompute(c)
    led.save()
    return rec


def request_regeneration(led: L.Ledger, card: int, asset: str, reason: str, by: str,
                         confirm_unapprove: bool = False) -> None:
    c = led.card(card)
    if asset not in L.ASSETS:
        raise L.LedgerError(f"unknown asset {asset!r}")
    if c.get("approval") and not confirm_unapprove:
        raise L.LedgerError(f"#{card} is approved. Add --confirm-unapprove to withdraw the approval and regenerate.")
    c["assets"][asset]["regenerate"] = {"reason": reason, "by": by, "at": L.now()}
    c["assets"][asset]["review"] = None
    if c.get("approval"):
        c["approval_void"] = {"at": L.now(), "was": c["approval"], "by": by}
        c["approval"] = None
    c["preview"] = None
    led.event(c, "regeneration_requested", asset=asset, reason=reason, by=by)
    led.recompute(c)
    led.save()


def record_review(led: L.Ledger, card: int, asset: str, verdict: str, by: str, note: str) -> None:
    if verdict not in ("pass", "fail"):
        raise L.LedgerError("verdict must be pass or fail")
    if not by:
        raise L.LedgerError("a named reviewer is required")
    c = led.card(card)
    v = led.current_asset_version(c, asset)
    if v is None:
        raise L.LedgerError(f"#{card} {asset} has no valid imported version to review")
    c["assets"][asset]["review"] = {"verdict": verdict, "by": by, "at": L.now(), "note": note, "version": v["n"],
                                    "kind": "botanical_and_visual"}
    led.event(c, "reviewed", asset=asset, version=v["n"], verdict=verdict, by=by)
    led.recompute(c)
    led.save()


def approve(led: L.Ledger, card: int, by: str) -> None:
    """A person's explicit act. Refuses unless every gate has been passed by a human."""
    c = led.card(card)
    if not by:
        raise L.LedgerError("approval needs a named person")
    led.recompute(c)
    missing = []
    if not c["stages"]["quality_review"].get("done"):
        missing.append("the comparison board has not been generated for the current assets (run `pd format`)")
    for a in L.ASSETS:
        s = led.asset_status(c, a)
        if s != "review_passed":
            missing.append(f"{a}: {s} (needs a recorded botanical review of the current version)")
    if missing:
        raise L.LedgerError(f"#{card} cannot be approved:\n  - " + "\n  - ".join(missing))
    c["approval"] = {"by": by, "at": L.now(), "versions": led.versions(c)}
    c["approval_void"] = None
    led.event(c, "approved", by=by)
    led.recompute(c)
    led.save()


# --- formatting on the real template ---------------------------------------------------

def soften(cut: Image.Image) -> tuple[Image.Image, dict]:
    """Match the deck's soft rim (~1.8 halo px per boundary px) using the SAME 3x3 blur the
    existing segmenter applies - but only when the supplied cutout is harder than the deck's."""
    import cv2
    a = np.array(cut.getchannel("A"))
    solid = a > 127
    er = cv2.erode(solid.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    boundary = int((solid & ~er).sum())
    semi = int(((a > 0) & (a < 255)).sum())
    ratio = semi / boundary if boundary else 0.0
    plan = {"measured_halo_per_boundary_px": round(ratio, 2), "deck_target": 1.83, "softened": False}
    if boundary and ratio < 1.5:
        a = cv2.GaussianBlur(a, (3, 3), 0)
        cut = cut.copy()
        cut.putalpha(Image.fromarray(a))
        plan["softened"] = True
    return cut, plan


def integer_scale_nearest(icon: Image.Image, box_w: int, box_h: int) -> Image.Image:
    k = max(1, min(box_w // icon.width, box_h // icon.height))
    return icon.resize((icon.width * k, icon.height * k), Image.NEAREST)


def compose_front(main_path: pathlib.Path, pixel_path: pathlib.Path | None = None) -> tuple[Image.Image, dict]:
    """Card front with NO card fields: template frame + gradient, the plant, the pixel icon.

    Uses the existing placement, opacity and template code unchanged. `place_rooted` seats the
    stem running off the bottom (the deck crops the bottom on 44 of 45 cards) and centres on
    the deck's measured horizontal centroid; where a cutout has no stem at its foot it falls
    back to seating on the bottom edge rather than beheading the plant.
    """
    import photo_pipeline as P
    import render_generated_card as R
    prof = P.style_profile()
    cut = Image.open(main_path).convert("RGBA")
    cut, soft = soften(cut)
    box = cut.getbbox()
    stem = P.stem_support(cut.crop(box)) if box else {"has_stem": False}
    if stem["has_stem"]:
        art, plan = P.place_rooted(cut, prof)
    else:
        art, plan = P.place_like_the_deck(cut, prof)
        plan["rooted"] = False
    plan.update(stem=stem, soft_edge=soft, opacity=P.PHOTO_OPACITY)
    front = P.composite(art, plan)
    if pixel_path is not None:
        icon = Image.open(pixel_path).convert("RGBA")
        x0, y0, x1, y1 = R.SLOT_PIXEL
        icon = integer_scale_nearest(icon, (x1 - x0) - 8, (y1 - y0) - 8)
        front.alpha_composite(icon, (x0 + ((x1 - x0) - icon.width) // 2, y0 + ((y1 - y0) - icon.height) // 2))
        plan["pixel_icon_scale"] = icon.width // Image.open(pixel_path).width
    return front, plan


def _font(size, bold=True):
    for base in ("/usr/share/fonts/truetype/dejavu/", ""):
        try:
            return ImageFont.truetype(base + ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"), size)
        except OSError:
            pass
    return ImageFont.load_default()


def checker(size, cell=14):
    img = Image.new("RGB", size, (235, 235, 235))
    d = ImageDraw.Draw(img)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                d.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(200, 200, 200))
    return img


def _fit(im: Image.Image, box, bg=None, nearest=False) -> Image.Image:
    im = ImageOps.contain(im.convert("RGBA"), box, Image.NEAREST if nearest else Image.LANCZOS)
    base = bg.copy() if bg is not None else Image.new("RGB", box, (250, 248, 252))
    if base.size != box:
        base = base.resize(box)
    base.paste(im, ((box[0] - im.width) // 2, (box[1] - im.height) // 2), im)
    return base


def build_board(led: L.Ledger, assets_root: pathlib.Path, card: int) -> dict:
    """Format the card and write the comparison board. Does not approve anything."""
    c = led.card(card)
    assets_root = pathlib.Path(assets_root)
    vm, vp, vt = (led.current_asset_version(c, a) for a in L.ASSETS)
    if vm is None:
        raise L.LedgerError(f"#{card} has no valid main_image to format")
    main = assets_root / vm["file"]
    pixel = assets_root / vp["file"] if vp else None
    front, plan = compose_front(main, pixel)
    out = assets_root / L.folder(c) / "preview"
    out.mkdir(parents=True, exist_ok=True)
    vers = led.versions(c)
    tag = "-".join(f"{k[0]}{v}" for k, v in vers.items())
    front_path = out / f"card-front-preview_{tag}.png"
    front.save(front_path)

    orig = None
    sel = c["selection"]["main_photo"]
    for f in (assets_root / L.folder(c) / "original_selected").glob(f"main_photo__{sel}.*"):
        orig = Image.open(f).convert("RGB")
    W, H, pad = 1720, 1180, 20
    board = Image.new("RGB", (W, H), (222, 218, 232))
    d = ImageDraw.Draw(board)
    d.rectangle((0, 0, W, 62), fill=(60, 20, 110))
    d.text((pad, 8), f"#{c['card']}  {c['common']}  ({c['scientific']})", fill="white", font=_font(26))
    d.text((pad, 38), "REVIEW ONLY - NOT APPROVED - AI-generated derivatives need botanical review against the real plant",
           fill=(255, 220, 120), font=_font(14))
    col_w, top = 540, 82
    def panel(x, y, title, img, box, sub=None):
        d.text((x, y), title, fill=(40, 10, 80), font=_font(15))
        board.paste(img, (x, y + 24))
        if sub:
            d.text((x, y + 28 + img.height), sub, fill=(70, 60, 90), font=_font(12, False))
    sel_lbl = next((p["label"] for p in c["collection"]["candidates"] if p["photo_id"] == sel), "")
    panel(pad, top, f"ORIGINAL iNaturalist photo {sel} ({sel_lbl}) - CC0",
          _fit(orig, (col_w, 640)) if orig else Image.new("RGB", (col_w, 640), (250, 248, 252)), None,
          f"{(c['collection']['candidates'][0].get('license_code') or '').upper()}  photographer: "
          f"{next((p.get('photographer') for p in c['collection']['candidates'] if p['photo_id'] == sel), '')}")
    panel(pad * 2 + col_w, top, "GENERATED main image (transparent) - AI derivative",
          _fit(Image.open(main), (col_w, 640), bg=checker((col_w, 640))), None,
          f"v{vm['n']}  {vm['validation']['metrics'].get('subject_px')}px subject")
    fw = 560
    panel(pad * 3 + col_w * 2, top, "CARD FRONT preview (no card fields)",
          front.convert("RGB").resize((fw, round(front.height * fw / front.width)), Image.LANCZOS), None,
          f"opacity {plan['opacity']}  rooted={plan.get('rooted')}  soft-edge applied={plan['soft_edge']['softened']}")
    y2 = top + 24 + 640 + 70
    if vp:
        icon = Image.open(assets_root / vp["file"]).convert("RGBA")
        cell = Image.new("RGB", (col_w, 200), (250, 248, 252))
        cell.paste(icon, (20, 20), icon)
        big = integer_scale_nearest(icon, 400, 170)
        cell.paste(big, (80, 15), big)
        panel(pad, y2, f"GENERATED pixel icon v{vp['n']}  native {icon.width}x{icon.height} + enlarged",
              cell, None, f"{vp['validation']['metrics'].get('opaque_colours')} colours")
    if vt:
        tall = Image.open(assets_root / vt["file"]).convert("RGBA")
        panel(pad * 2 + col_w, y2, f"GENERATED tall preview v{vt['n']}",
              _fit(tall, (260, 330)), None, f"{tall.width}x{tall.height}")
    lines = ["PROVENANCE", f"main photo    {sel}", f"pixel source  {c['selection']['pixel_source']}",
             f"tall photo    {c['selection']['tall_preview']}", "", "Originals: CC0 iNaturalist.", "Generated: AI derivatives,",
             "not CC0 data. Verify every", "detail against the real plant."]
    for i, t in enumerate(lines):
        d.text((pad * 2 + col_w + 290, y2 + i * 20), t, fill=(40, 10, 80) if i == 0 else (60, 50, 80), font=_font(14, i == 0))
    board_path = out / f"comparison-board_{tag}.png"
    board.save(board_path)
    c["preview"] = {"versions": vers, "front": str(front_path.relative_to(assets_root)),
                    "board": str(board_path.relative_to(assets_root)), "at": L.now(), "placement": plan}
    led.event(c, "board_built", versions=vers)
    led.recompute(c)
    led.save()
    return c["preview"]
