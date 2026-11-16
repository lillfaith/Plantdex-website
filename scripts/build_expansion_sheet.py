#!/usr/bin/env python3
"""Contact sheets for the expansion batch: three candidate card previews per species.

A VIEWER ONLY. It reads evidence/candidates/<species>/candidates.json and the `-front.png`
previews that photo_pipeline.py already wrote, and draws them side by side so a person can
compare. It selects nothing, scores nothing and writes no verdict: the owner picks.

    python3 scripts/build_expansion_sheet.py --candidates cands/ --out sheets/
    python3 scripts/build_expansion_sheet.py --self-test
"""
from __future__ import annotations

import argparse, json, pathlib, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "evidence" / "expansion-86.json"
THUMB_W, GAP, HEAD, PER_SHEET, COLS = 240, 10, 34, 6, 2


def key_of(sci: str) -> str:
    return sci.lower().replace(" ", "_").replace("-", "_")


def font(size: int):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


def block(row: dict, cdir: pathlib.Path) -> Image.Image:
    """One species: a header and up to three previews. A species with none says so."""
    w = 3 * THUMB_W + 2 * GAP
    thumbs = []
    cj = cdir / key_of(row["scientific"]) / "candidates.json"
    if cj.exists():
        for s in json.loads(cj.read_text()).get("selected", [])[:3]:
            f = cj.parent / f"{s['photo_id']}-front.png"
            if f.exists():
                im = Image.open(f).convert("RGB")
                im = im.resize((THUMB_W, round(im.height * THUMB_W / im.width)))
                thumbs.append((s["photo_id"], im))
    h = HEAD + (max((t[1].height for t in thumbs), default=60) + 18)
    img = Image.new("RGB", (w, h), (250, 248, 252))
    d = ImageDraw.Draw(img)
    flag = "  [SAFETY-FLAGGED]" if row.get("safety_flag") else ""
    d.text((4, 6), f"#{row['card']}  {row['common']}  ({row['scientific']}){flag}", fill=(60, 30, 100), font=font(15))
    if not thumbs:
        d.text((4, HEAD + 10), "no candidate survived the screen - needs another photo search", fill=(160, 30, 30), font=font(14))
    for i, (pid, im) in enumerate(thumbs):
        x = i * (THUMB_W + GAP)
        img.paste(im, (x, HEAD))
        d.text((x + 2, HEAD + im.height + 1), f"{'ABC'[i]}  photo {pid}", fill=(40, 40, 40), font=font(12))
    return img


def build(cdir: pathlib.Path, out: pathlib.Path, rows: list[dict]) -> list[pathlib.Path]:
    out.mkdir(parents=True, exist_ok=True)
    made = []
    groups: dict[str, list[dict]] = {}
    for r in rows:
        groups.setdefault(r.get("pdf_group", "Other"), []).append(r)
    for g, rs in groups.items():
        rs = sorted(rs, key=lambda r: r["card"])
        for n in range(0, len(rs), PER_SHEET):
            chunk = rs[n:n + PER_SHEET]
            blocks = [block(r, cdir) for r in chunk]
            bw = blocks[0].width
            rows_n = (len(blocks) + COLS - 1) // COLS
            rh = [max(b.height for b in blocks[i * COLS:(i + 1) * COLS]) for i in range(rows_n)]
            sheet = Image.new("RGB", (COLS * bw + (COLS + 1) * GAP, sum(rh) + (rows_n + 1) * GAP), (235, 232, 240))
            for i, b in enumerate(blocks):
                r_, c_ = divmod(i, COLS)
                sheet.paste(b, (GAP + c_ * (bw + GAP), GAP + sum(rh[:r_]) + r_ * GAP))
            name = f"{chunk[0]['card']:03d}-{chunk[-1]['card']:03d}-{g.split()[0].lower()}.jpg"
            sheet.save(out / name, quality=82)
            made.append(out / name)
    return made


def self_test() -> int:
    with tempfile.TemporaryDirectory() as t:
        t = pathlib.Path(t)
        d = t / "c" / "aa_bb"; d.mkdir(parents=True)
        Image.new("RGB", (800, 1293), (30, 120, 60)).save(d / "1-front.png")
        (d / "candidates.json").write_text(json.dumps({"selected": [{"photo_id": 1}]}))
        rows = [{"card": 57, "common": "Test", "scientific": "Aa bb", "pdf_group": "Eastern & Central U.S."},
                {"card": 58, "common": "Empty", "scientific": "Cc dd", "pdf_group": "Eastern & Central U.S."}]
        made = build(t / "c", t / "o", rows)
        assert len(made) == 1 and made[0].stat().st_size > 1000, made
    print("expansion sheet self-test ok")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--candidates"); ap.add_argument("--out"); ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    cdir = pathlib.Path(a.candidates)
    have = {p.name for p in cdir.iterdir() if p.is_dir()}
    rows = [r for r in json.loads(MANIFEST.read_text()) if key_of(r["scientific"]) in have]
    made = build(cdir, pathlib.Path(a.out), rows)
    print(f"{len(made)} sheet(s), {len(rows)} species")
    return 0


if __name__ == "__main__":
    sys.exit(main())
