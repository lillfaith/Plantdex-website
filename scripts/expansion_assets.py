#!/usr/bin/env python3
"""Artwork for the expansion cards: import, validate, and completeness. PRIVATE dev tool.

    python3 scripts/expansion_assets.py check [--json] [--strict] [--card 57]
    python3 scripts/expansion_assets.py import --from <folder> [--by NAME] [--tool ChatGPT] [--dry-run]
    python3 scripts/expansion_assets.py placeholders          # regenerate the three shared placeholders
    python3 scripts/expansion_assets.py --self-test

THE CARD RECORDS NEVER CHANGE WHEN ARTWORK ARRIVES. Records live in src/data/expansion-cards.json
and know nothing about images. Artwork is found on disk by the card's stable id, so an import
only adds or replaces files under expansion/assets/<id>/. Three kinds, each independent:

    main   the transparent main botanical image
    pixel  the native 21-24px pixel icon, transparent background
    tall   the tall preview

Until a kind exists, the card resolves to ONE shared placeholder for that kind
(expansion/assets/_placeholders/), so a card is never blank and never impersonates real art.

MATCHING is by stable card number OR id: `57_main.png`, `eupatorium-perfoliatum_pixel.png`,
`57_eupatorium-perfoliatum_tall.png`, or a folder `57/` / `<id>/` holding `main.png` etc.
If a number and an id are both given they must agree. A file that matches nothing is REPORTED,
never skipped silently, and a file that fails validation is REJECTED and changes nothing.

REPLACING keeps the old file under expansion/assets/<id>/_history/. Assets live OUTSIDE
public/, so nothing here is published or deployed.

Validation checks FILES, not botany. A generated derivative of an iNaturalist photograph is an
AI derivative; its details need botanical review before the card is ever promoted.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import io
import json
import pathlib
import re
import shutil
import sys
import tempfile

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[1]
CARDS = ROOT / "src" / "data" / "expansion-cards.json"
SPEC = ROOT / "expansion" / "asset-spec.json"
ASSETS = ROOT / "expansion" / "assets"
PLACEHOLDERS = ASSETS / "_placeholders"
KINDS = ["main", "pixel", "tall"]
ALIASES = {"main": "main", "main_image": "main", "pixel": "pixel", "pixel_icon": "pixel", "sprite": "pixel",
           "tall": "tall", "tall_preview": "tall"}
FRONT_FIELDS = ["rarity", "xp", "season", "uses", "stats"]
EXTS = (".png", ".webp", ".jpg", ".jpeg")


def load_spec(path=SPEC) -> dict:
    return json.loads(pathlib.Path(path).read_text())


def load_cards(path=CARDS) -> list[dict]:
    return json.loads(pathlib.Path(path).read_text())["cards"]


# --- validators ------------------------------------------------------------------------

def _open(path):
    try:
        im = Image.open(path)
        im.load()
        return im
    except Exception as e:  # noqa: BLE001
        return e


def _res(err, warn, m):
    return {"ok": not err, "errors": err, "warnings": warn, "metrics": m}


def _has_alpha(im):
    return im.mode in ("RGBA", "LA", "PA") or "transparency" in im.info


def validate_main(path, sp):
    sp = sp["main"]
    im = _open(path)
    if isinstance(im, Exception):
        return _res([f"not a readable image: {im}"], [], {})
    err, warn, m = [], [], {"format": im.format, "mode": im.mode, "size": list(im.size)}
    if im.format not in sp["formats"]:
        err.append(f"format {im.format} not allowed (need {'/'.join(sp['formats'])})")
    if not _has_alpha(im):
        return _res(err + [f"no alpha channel (mode {im.mode}); a main image must be genuinely transparent"], warn, m)
    a = np.array(im.convert("RGBA").getchannel("A"))
    n = a.size
    tr, op = float((a == 0).sum()) / n, float((a == 255).sum()) / n
    m.update(transparent_fraction=round(tr, 3), opaque_fraction=round(op, 3))
    if tr < sp["min_transparent_fraction"]:
        err.append(f"only {tr:.1%} transparent; this is not a cutout (need {sp['min_transparent_fraction']:.0%}+)")
    if op < sp["min_opaque_fraction"]:
        err.append(f"only {op:.1%} opaque; the subject is missing or faint")
    h, w = a.shape
    corners = sum(int(a[y, x] == 0) for y in (0, h - 1) for x in (0, w - 1))
    m["transparent_corners"] = corners
    if corners < sp["min_transparent_corners"]:
        err.append(f"only {corners} of 4 corners transparent; the background was not removed")
    ys, xs = np.nonzero(a > 127)
    if len(xs):
        bh = int(ys.max() - ys.min() + 1)
        m["subject_px"] = [int(xs.max() - xs.min() + 1), bh]
        if bh < sp["min_subject_height_px"]:
            err.append(f"subject is {bh}px tall; the template window needs at least {sp['min_subject_height_px']}px")
        elif bh < sp["recommended_subject_height_px"]:
            warn.append(f"subject is {bh}px tall; {sp['recommended_subject_height_px']}px+ leaves headroom")
    return _res(err, warn, m)


def smooth_gradient_share(rgba):
    op = rgba[..., 3] > 127
    rgb = rgba[..., :3].astype(int)
    ds = []
    for dy, dx in ((0, 1), (1, 0)):
        a, b = rgb[: rgb.shape[0] - dy, : rgb.shape[1] - dx], rgb[dy:, dx:]
        both = op[: op.shape[0] - dy, : op.shape[1] - dx] & op[dy:, dx:]
        ds.append(np.abs(a - b).sum(axis=2)[both])
    d = np.concatenate(ds)
    d = d[d > 0]
    return float((d < 36).sum()) / len(d) if len(d) else 0.0


def validate_pixel(path, sp):
    sp = sp["pixel"]
    im = _open(path)
    if isinstance(im, Exception):
        return _res([f"not a readable image: {im}"], [], {})
    w, h = im.size
    err, warn, m = [], [], {"format": im.format, "mode": im.mode, "size": [w, h]}
    if im.format not in sp["formats"]:
        err.append(f"format {im.format} not allowed (need PNG; lossy formats smear pixel art)")
    if not (sp["min_px"] <= w <= sp["max_px"] and sp["min_px"] <= h <= sp["max_px"]):
        err.append(f"native size is {w}x{h}; a pixel icon must be {sp['min_px']}-{sp['max_px']}px on BOTH sides "
                   "(an enlarged or resized file does not count)")
    elif w != h:
        warn.append(f"icon is {w}x{h}, not square")
    if not _has_alpha(im):
        return _res(err + [f"no alpha channel (mode {im.mode}); the background must be transparent"], warn, m)
    rgba = np.array(im.convert("RGBA"))
    a = rgba[..., 3]
    n = a.size
    tr = float((a == 0).sum()) / n
    semi = float(((a > 0) & (a < 255)).sum()) / n
    corners = sum(int(a[y, x] == 0) for y in (0, h - 1) for x in (0, w - 1))
    colours = len({tuple(p) for p in rgba[a > 127][:, :3].tolist()})
    sm = smooth_gradient_share(rgba)
    m.update(transparent_fraction=round(tr, 3), semi_transparent_fraction=round(semi, 3), transparent_corners=corners,
             opaque_colours=colours, smooth_gradient_share=round(sm, 3))
    if tr < sp["min_transparent_fraction"]:
        err.append(f"only {tr:.1%} transparent; the background is not transparent")
    if corners < sp["min_transparent_corners"]:
        err.append(f"only {corners} of 4 corners transparent; the background was not removed")
    if semi > sp["max_semi_transparent_fraction"]:
        err.append(f"{semi:.1%} of pixels are semi-transparent; genuine pixel art has hard, binary edges")
    if colours > sp["fail_colours"]:
        err.append(f"{colours} distinct colours; pixel art uses a small palette (this reads as a downscaled photo)")
    elif colours > sp["warn_colours"]:
        warn.append(f"{colours} distinct colours is a large palette for pixel art")
    if sm > sp["max_smooth_gradient_share"]:
        err.append(f"{sm:.0%} of colour changes are tiny smooth gradients; pixel art has flat colours and hard steps")
    return _res(err, warn, m)


def validate_tall(path, sp):
    sp = sp["tall"]
    im = _open(path)
    if isinstance(im, Exception):
        return _res([f"not a readable image: {im}"], [], {})
    w, h = im.size
    err, warn, m = [], [], {"format": im.format, "mode": im.mode, "size": [w, h], "spec_confirmed": sp.get("confirmed", False)}
    if im.format not in sp["formats"]:
        err.append(f"format {im.format} not allowed")
    if w < sp["min_width_px"] or h < sp["min_height_px"]:
        err.append(f"{w}x{h} is below the required {sp['min_width_px']}x{sp['min_height_px']}")
    if w and h / w < sp["min_aspect_h_over_w"]:
        err.append(f"aspect {h / w:.2f} (height/width) is not tall enough; need {sp['min_aspect_h_over_w']}+")
    if not sp.get("confirmed", False):
        warn.append("tall dimensions are an UNCONFIRMED placeholder spec; confirm them in expansion/asset-spec.json")
    return _res(err, warn, m)


VALIDATORS = {"main": validate_main, "pixel": validate_pixel, "tall": validate_tall}


# --- placeholders ----------------------------------------------------------------------

def _font(size):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


def make_placeholders(out: pathlib.Path = PLACEHOLDERS) -> None:
    """Three SHARED, deterministic placeholders. Deliberately generic: no species, no botany."""
    out.mkdir(parents=True, exist_ok=True)
    # main: a flat violet silhouette of 'a plant' on transparency, plainly labelled.
    im = Image.new("RGBA", (1000, 1300), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    col = (180, 150, 230, 255)
    d.rectangle((486, 420, 514, 1300), fill=col)
    d.ellipse((330, 120, 670, 460), fill=col)
    d.ellipse((250, 640, 490, 760), fill=col)
    d.ellipse((510, 800, 760, 920), fill=col)
    f = _font(46)
    t = "ARTWORK PENDING"
    w = d.textlength(t, font=f)
    d.text(((1000 - w) / 2, 270), t, fill=(70, 30, 120, 255), font=f)
    im.save(out / "main.png")
    # pixel: a 22x22 native seedling, hard edges, five flat colours, transparent background.
    px = Image.new("RGBA", (22, 22), (0, 0, 0, 0))
    p = px.load()
    leaf, leaf2, stem, soil = (90, 190, 90, 255), (50, 140, 70, 255), (60, 120, 60, 255), (140, 100, 70, 255)
    for x, y in [(6, 6), (7, 5), (8, 5), (9, 6), (7, 6), (8, 6), (6, 7), (7, 7), (8, 7), (9, 7), (10, 7)]:
        p[x, y] = leaf
    for x, y in [(12, 5), (13, 4), (14, 4), (15, 5), (13, 5), (14, 5), (12, 6), (13, 6), (14, 6), (15, 6)]:
        p[x, y] = leaf2
    for y in range(8, 16):
        p[10, y] = stem
    for x in range(6, 15):
        p[x, 16] = soil
        p[x, 17] = soil
    for x in range(8, 13):
        p[x, 18] = soil
    px.save(out / "pixel.png")
    # tall: a plain violet panel, labelled.
    tall = Image.new("RGB", (800, 1300), (150, 60, 230))
    d = ImageDraw.Draw(tall)
    for y in range(1300):
        k = y / 1300
        d.line((0, y, 800, y), fill=(int(150 - 40 * k), int(60 + 20 * k), int(230 - 30 * k)))
    f = _font(44)
    t = "PREVIEW PENDING"
    w = d.textlength(t, font=f)
    d.text(((800 - w) / 2, 600), t, fill=(240, 230, 255), font=f)
    tall.save(out / "tall.png")


# --- finding, matching, importing ------------------------------------------------------

def live_file(cid: str, kind: str, root=ASSETS):
    d = pathlib.Path(root) / cid
    for ext in EXTS:
        f = d / f"{kind}{ext}"
        if f.exists():
            return f
    return None


def resolve(cid: str, kind: str, root=ASSETS):
    """The file a consumer should use: the real artwork if present, else the shared placeholder."""
    f = live_file(cid, kind, root)
    return (f, "present") if f else (pathlib.Path(root) / "_placeholders" / f"{kind}.png", "placeholder")


def index_cards(cards):
    return {c["cardNumber"]: c for c in cards}, {c["id"]: c for c in cards}


def parse_name(rel: pathlib.PurePosixPath):
    """-> (card ref string, kind) or None. Accepts `57_main.png`, `<id>_pixel.png`, `57/tall.png`."""
    stem = rel.stem.lower()
    for alias in sorted(ALIASES, key=len, reverse=True):
        if stem == alias and len(rel.parts) > 1:
            return rel.parts[-2].lower(), ALIASES[alias]
        if stem.endswith("_" + alias):
            return stem[: -(len(alias) + 1)], ALIASES[alias]
    return None


def match_card(ref: str, by_num, by_id):
    m = re.match(r"^(\d+)(?:[_-](.+))?$", ref)
    if m:
        c = by_num.get(int(m.group(1)))
        if c is None:
            return None, f"no card numbered {int(m.group(1))}"
        if m.group(2) and m.group(2) != c["id"]:
            return None, f"number {c['cardNumber']} is {c['id']!r} but the file says {m.group(2)!r}; refusing to guess"
        return c, None
    c = by_id.get(ref)
    return (c, None) if c else (None, f"no card with id {ref!r}")


def sha(path):
    return hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()


def import_assets(src: pathlib.Path, by: str, tool: str, dry: bool = False, root=ASSETS, cards=None, spec=None):
    cards = cards or load_cards()
    spec = spec or load_spec()
    by_num, by_id = index_cards(cards)
    report = {"accepted": [], "rejected": [], "unmatched": [], "replaced": []}
    files = sorted(p for p in pathlib.Path(src).rglob("*") if p.suffix.lower() in EXTS)
    seen = {}
    for f in files:
        rel = pathlib.PurePosixPath(f.relative_to(src).as_posix())
        parsed = parse_name(rel)
        if parsed is None:
            report["unmatched"].append({"file": str(rel), "why": "cannot tell which card and kind from the name"})
            continue
        ref, kind = parsed
        card, why = match_card(ref, by_num, by_id)
        if card is None:
            report["unmatched"].append({"file": str(rel), "why": why})
            continue
        if (card["id"], kind) in seen:
            report["rejected"].append({"file": str(rel), "card": card["cardNumber"], "kind": kind,
                                       "errors": [f"duplicate: {seen[(card['id'], kind)]} is also {kind} for this card in this import"]})
            continue
        seen[(card["id"], kind)] = str(rel)
        v = VALIDATORS[kind](f, spec)
        row = {"file": str(rel), "card": card["cardNumber"], "id": card["id"], "kind": kind,
               "errors": v["errors"], "warnings": v["warnings"], "metrics": v["metrics"]}
        if not v["ok"]:
            report["rejected"].append(row)
            continue
        report["accepted"].append(row)
        if dry:
            continue
        d = pathlib.Path(root) / card["id"]
        d.mkdir(parents=True, exist_ok=True)
        old = live_file(card["id"], kind, root)
        stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S%f")
        if old:
            (d / "_history").mkdir(exist_ok=True)
            shutil.move(str(old), str(d / "_history" / f"{kind}-{stamp}{old.suffix}"))
            report["replaced"].append({"card": card["cardNumber"], "kind": kind})
        target = d / f"{kind}{f.suffix.lower()}"
        shutil.copy2(f, target)
        prov_path = d / "assets.json"
        prov = json.loads(prov_path.read_text()) if prov_path.exists() else {"id": card["id"], "cardNumber": card["cardNumber"]}
        prov.setdefault("history", [])
        if kind in prov:
            prov["history"].append({**prov[kind], "kind_of_asset": kind, "retired_at": stamp})
        prov[kind] = {"file": target.name, "sha256": sha(target), "size": v["metrics"]["size"], "imported_at": stamp,
                      "imported_by": by, "tool": tool, "source_name": f.name, "origin": "ai_generated_derivative",
                      "botanical_review_required": True, "warnings": v["warnings"]}
        prov_path.write_text(json.dumps(prov, indent=1) + "\n")
    return report


# --- completeness ----------------------------------------------------------------------

def completeness(cards=None, root=ASSETS, spec=None):
    cards, spec = cards or load_cards(), spec or load_spec()
    out = []
    for c in cards:
        missing_front = [k for k in FRONT_FIELDS if c["front"].get(k) in (None, [], {})]
        assets, issues = {}, []
        for kind in KINDS:
            f = live_file(c["id"], kind, root)
            if f is None:
                assets[kind] = {"status": "placeholder", "uses": f"_placeholders/{kind}.png"}
                issues.append(f"{kind} artwork missing (placeholder in use)")
            else:
                v = VALIDATORS[kind](f, spec)
                assets[kind] = {"status": "present" if v["ok"] else "invalid", "file": f.name, "errors": v["errors"]}
                if not v["ok"]:
                    issues.append(f"{kind} file fails validation: {v['errors'][0]}")
        empty_back = [k for k, v in c["back"].items() if not v]
        out.append({"cardNumber": c["cardNumber"], "id": c["id"], "commonName": c["commonName"],
                    "missingFrontFields": missing_front, "emptyBackFields": empty_back, "assets": assets,
                    "complete": not missing_front and not empty_back and all(a["status"] == "present" for a in assets.values()),
                    "issues": issues})
    return out


def summarize(rows):
    return {"cards": len(rows), "complete": sum(r["complete"] for r in rows),
            "missingMain": sum(r["assets"]["main"]["status"] != "present" for r in rows),
            "missingPixel": sum(r["assets"]["pixel"]["status"] != "present" for r in rows),
            "missingTall": sum(r["assets"]["tall"]["status"] != "present" for r in rows),
            "cardsMissingFrontFields": sum(bool(r["missingFrontFields"]) for r in rows)}


# --- self-test -------------------------------------------------------------------------

def _plant(path, w=1200, h=1600, alpha=True, transparent=True):
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0) if transparent else (30, 90, 40, 255))
    d = ImageDraw.Draw(im)
    d.rectangle((w // 2 - 20, h // 3, w // 2 + 20, h), fill=(40, 120, 50, 255))
    d.ellipse((w // 2 - 240, h // 8, w // 2 + 240, h // 8 + 480), fill=(200, 60, 120, 255))
    (im if alpha else im.convert("RGB")).save(path)


def _px(path, size=22, kind="good"):
    if kind == "photo":
        arr = np.random.RandomState(1).randint(0, 255, (size, size, 3)).astype("uint8")
        from PIL import ImageFilter
        Image.fromarray(arr).filter(ImageFilter.GaussianBlur(1.0)).convert("RGBA").save(path)
        return
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0) if kind != "opaque" else (40, 120, 50, 255))
    p = im.load()
    pal = [(40, 120, 50, 255), (70, 170, 70, 255), (200, 60, 120, 255)]
    if kind != "opaque":
        c = size // 2
        for y in range(size):
            for x in range(size):
                if (x - c) ** 2 + (y - c) ** 2 <= (size // 2 - 2) ** 2:
                    p[x, y] = pal[(x + y) % 3]
    im.save(path)


def self_test() -> int:
    ok_n, bad = 0, []

    def check(ok, label):
        nonlocal ok_n
        ok = bool(ok)
        print(("PASS  " if ok else "FAIL  ") + label)
        if not ok:
            bad.append(label)
        ok_n += ok

    cards = load_cards()
    spec = load_spec()
    with tempfile.TemporaryDirectory() as t:
        t = pathlib.Path(t)
        root, inbox = t / "assets", t / "in"
        inbox.mkdir()
        make_placeholders(root / "_placeholders")
        check(all(validate_main(root / "_placeholders/main.png", spec)["ok"] for _ in [0]), "the shared main placeholder passes the main spec")
        check(validate_pixel(root / "_placeholders/pixel.png", spec)["ok"], "the shared pixel placeholder is a valid 22x22 transparent pixel icon")
        check(validate_tall(root / "_placeholders/tall.png", spec)["ok"], "the shared tall placeholder passes the tall spec")
        a, b = cards[0], cards[1]
        rows = completeness(cards, root, spec)
        s = summarize(rows)
        check(s["complete"] == 0 and s["missingMain"] == len(cards) and s["missingPixel"] == len(cards), "with no artwork every card reports missing main, pixel and tall")
        check(all(r["missingFrontFields"] == FRONT_FIELDS for r in rows), "every card reports its missing front fields")
        check(resolve(a["id"], "main", root)[1] == "placeholder", "a card with no artwork resolves to the shared placeholder")

        _plant(inbox / f"{a['cardNumber']}_main.png"); _px(inbox / f"{a['id']}_pixel.png")
        tall = Image.new("RGB", (800, 1300), (120, 200, 120)); tall.save(inbox / f"{a['cardNumber']}_{a['id']}_tall_preview.png")
        _plant(inbox / f"{b['cardNumber']}_main.png", alpha=False)             # no alpha: must be rejected
        _px(inbox / f"{b['cardNumber']}_pixel.png", size=32)                  # wrong native size
        _px(inbox / f"{b['cardNumber']}_sprite.png", kind="photo")            # not pixel art (and a duplicate kind)
        _plant(inbox / "9999_main.png")                                       # no such card
        (inbox / "notes.png").write_bytes(b"x")                               # unmatchable
        _plant(inbox / f"{b['cardNumber']}_wrong-id_main.png")                # number and id disagree
        r = import_assets(inbox, "tester", "ChatGPT", root=root, cards=cards, spec=spec)
        acc = {(x["card"], x["kind"]) for x in r["accepted"]}
        check(acc == {(a["cardNumber"], "main"), (a["cardNumber"], "pixel"), (a["cardNumber"], "tall")},
              "valid files match by number, by id, and by number+id, one per kind")
        rej = {(x["card"], x["kind"]) for x in r["rejected"]}
        check((b["cardNumber"], "main") in rej and (b["cardNumber"], "pixel") in rej, "no-alpha main and 32x32 pixel are rejected")
        check(live_file(b["id"], "main", root) is None and live_file(b["id"], "pixel", root) is None, "rejected files change nothing on disk")
        why = " | ".join(x["why"] for x in r["unmatched"])
        check("9999" in why and "refusing to guess" in why and any(x["file"] == "notes.png" for x in r["unmatched"]),
              "unknown card, disagreeing number/id and unnamed files are reported, never skipped")
        prov = json.loads((root / a["id"] / "assets.json").read_text())
        check(prov["main"]["origin"] == "ai_generated_derivative" and prov["main"]["botanical_review_required"] and prov["main"]["sha256"],
              "imported artwork is recorded as an AI derivative with a hash")
        check(resolve(a["id"], "pixel", root)[1] == "present" and resolve(b["id"], "pixel", root)[1] == "placeholder",
              "present artwork resolves to itself; others still resolve to the placeholder")

        # independent replacement of ONE kind
        inbox2 = t / "in2"; inbox2.mkdir()
        _px(inbox2 / f"{a['cardNumber']}_pixel.png", size=24)
        r2 = import_assets(inbox2, "tester", "ChatGPT", root=root, cards=cards, spec=spec)
        check(len(r2["replaced"]) == 1 and len(list((root / a["id"] / "_history").glob("pixel-*"))) == 1,
              "replacing the pixel icon keeps the old one in _history")
        check(live_file(a["id"], "main", root) is not None and live_file(a["id"], "tall", root) is not None,
              "replacing one kind leaves the others untouched")
        rows = completeness(cards, root, spec)
        ra = next(x for x in rows if x["id"] == a["id"])
        check(all(v["status"] == "present" for v in ra["assets"].values()) and ra["missingFrontFields"] == FRONT_FIELDS and not ra["complete"],
              "a card with all three assets is still incomplete while front fields are missing")
        rb = next(x for x in rows if x["id"] == b["id"])
        check(all(v["status"] == "placeholder" for v in rb["assets"].values()), "an untouched card stays all-placeholder")
        # dry run writes nothing
        inbox3 = t / "in3"; inbox3.mkdir(); _plant(inbox3 / f"{b['id']}_main.png")
        r3 = import_assets(inbox3, "tester", "ChatGPT", dry=True, root=root, cards=cards, spec=spec)
        check(len(r3["accepted"]) == 1 and live_file(b["id"], "main", root) is None, "--dry-run validates but writes nothing")
        # a file that was valid but is later damaged is reported invalid, not present
        (root / a["id"] / "pixel.png").write_bytes(b"not an image")
        ra = next(x for x in completeness(cards, root, spec) if x["id"] == a["id"])
        check(ra["assets"]["pixel"]["status"] == "invalid", "a corrupted file on disk is reported invalid")
    print(f"\n{ok_n} passed, {len(bad)} failed")
    return 1 if bad else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--self-test", action="store_true")
    sub = ap.add_subparsers(dest="cmd")
    c = sub.add_parser("check"); c.add_argument("--json", action="store_true"); c.add_argument("--strict", action="store_true"); c.add_argument("--card", type=int, action="append")
    i = sub.add_parser("import"); i.add_argument("--from", dest="src", required=True); i.add_argument("--by", required=True)
    i.add_argument("--tool", default="ChatGPT"); i.add_argument("--dry-run", action="store_true")
    sub.add_parser("placeholders")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    if a.cmd == "placeholders":
        make_placeholders()
        print(f"wrote {PLACEHOLDERS}")
        return 0
    if a.cmd == "import":
        r = import_assets(pathlib.Path(a.src), a.by, a.tool, dry=a.dry_run)
        for k in ("accepted", "replaced", "rejected", "unmatched"):
            print(f"{k.upper()}: {len(r[k])}")
        for x in r["rejected"]:
            print(f"  REJECTED {x['file']} (#{x['card']} {x['kind']}): " + "; ".join(x["errors"]))
        for x in r["unmatched"]:
            print(f"  UNMATCHED {x['file']}: {x['why']}")
        for x in r["accepted"]:
            for w in x["warnings"]:
                print(f"  note #{x['card']} {x['kind']}: {w}")
        if a.dry_run:
            print("(dry run: nothing written)")
        return 1 if (r["rejected"] or r["unmatched"]) else 0
    if a.cmd == "check":
        rows = completeness()
        if a.card:
            rows = [r for r in rows if r["cardNumber"] in a.card]
        s = summarize(rows)
        if a.json:
            print(json.dumps({"summary": s, "cards": rows}, indent=1))
        else:
            print(f"{s['cards']} cards | complete {s['complete']} | missing main {s['missingMain']}, pixel {s['missingPixel']}, "
                  f"tall {s['missingTall']} | cards missing front fields {s['cardsMissingFrontFields']}")
            for r in rows[:5 if not a.card else None]:
                print(f"  #{r['cardNumber']} {r['commonName']}: missing front {r['missingFrontFields']}; "
                      + ", ".join(f"{k}={v['status']}" for k, v in r['assets'].items()))
            if not a.card and len(rows) > 5:
                print(f"  ... {len(rows) - 5} more (use --json for all)")
        return 1 if (a.strict and s["complete"] != s["cards"]) else 0
    ap.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
