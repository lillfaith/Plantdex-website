#!/usr/bin/env python3
"""One candidate, large, at all three stages side by side: source, cutout, finished card.

The contact sheet answers "which of these" and is deliberately small -- nineteen cards at
260px is a sheet you can take in at once. It cannot answer "is this one right", because the
questions left on the preferred candidates are all questions about detail: is the mullein's
apex clipped, is the elderberry's foliage healthy, do its branches actually connect, does a
tilted spike read on a card. At 260px none of those is visible.

SO THIS IS THE SAME THREE IMAGES THE VISION PASS IS SENT, drawn large enough for a person to
answer the same questions. That is the point of the pairing rather than a coincidence: when
the model's verdict arrives, it was looking at this, and a disagreement can be read rather
than guessed at.

The cutout is drawn on a mid-grey ground with a chequer under it -- grey because black hides
retained dark scenery (the reason vision_review.py flattens onto grey too), chequer because
against a flat ground alone you cannot tell a hole in the plant from a dark leaf.

    python3 scripts/review_strip.py --species sambucus_canadensis --photo 424182823
    python3 scripts/review_strip.py --preferred          # every candidate the owner pinned
"""
from __future__ import annotations

import argparse, json, pathlib, sys

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import decisions                                      # noqa: E402

BASE = ROOT / "evidence" / "candidates"
PANE = 620            # each stage is drawn this tall
PAD, HEAD, CAP = 18, 88, 26   # HEAD clears three header lines; at 74 the third overlapped
INK, PAPER = (28, 24, 38), (246, 244, 240)
GREY = (128, 128, 128)
CHEQUER = (112, 112, 112)


def font(size: int):
    p = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    return ImageFont.truetype(p, size) if pathlib.Path(p).exists() else ImageFont.load_default()


def fit(im: Image.Image, h: int) -> Image.Image:
    w = max(1, int(im.width * h / im.height))
    return im.resize((w, h), Image.LANCZOS)


def on_chequer(im: Image.Image, h: int) -> Image.Image:
    """The cutout over a grey chequer, so a hole in the plant is distinguishable from a
    dark leaf and retained scenery is distinguishable from a clean cut."""
    im = im.convert("RGBA")
    im = im.resize((max(1, int(im.width * h / im.height)), h), Image.LANCZOS)
    bg = Image.new("RGBA", im.size, GREY + (255,))
    d = ImageDraw.Draw(bg)
    for y in range(0, im.height, 24):
        for x in range(0, im.width, 24):
            if (x // 24 + y // 24) % 2:
                d.rectangle((x, y, x + 23, y + 23), fill=CHEQUER + (255,))
    return Image.alpha_composite(bg, im).convert("RGB")


def strip(species: str, photo_id: str, out: pathlib.Path) -> pathlib.Path | None:
    cf = BASE / species / "candidates.json"
    if not cf.exists():
        return None
    row = next((s for s in json.loads(cf.read_text())["selected"]
                if str(s["photo_id"]) == str(photo_id)), None)
    if row is None:
        print(f"{species} #{photo_id} is not in the current shortlist", file=sys.stderr)
        return None
    src = ROOT / "evidence" / "photos" / species / row["file"]
    panes = [("SOURCE PHOTOGRAPH", fit(Image.open(src).convert("RGB"), PANE)),
             ("BiRefNet CUTOUT", on_chequer(Image.open(BASE / species / row["cutout"]), PANE)),
             ("FINISHED CARD", fit(Image.open(BASE / species / row["preview"]).convert("RGB"),
                                   PANE))]
    W = PAD + sum(p.width + PAD for _, p in panes)
    sheet = Image.new("RGB", (W, HEAD + PANE + CAP + PAD), PAPER)
    d = ImageDraw.Draw(sheet)

    verdict = decisions.current().get(str(photo_id))
    prov = row.get("provenance", {}) or {}
    d.text((PAD, PAD - 4), f"{species.replace('_', ' ')}  #{photo_id}", font=font(26), fill=INK)
    line2 = (f"{verdict['decision'].upper()} - {verdict.get('by', '')}" if verdict
             else "no owner verdict recorded")
    lic = prov.get("license") or prov.get("licence") or "licence not recorded"
    who = prov.get("photographer") or prov.get("attribution") or "photographer not recorded"
    d.text((PAD, PAD + 26), f"{line2}   |   {lic}   |   {who}", font=font(13),
           fill=(96, 92, 104))
    d.text((PAD, PAD + 44), "nothing here is approved or published; the three stages are "
                            "judged separately", font=font(12), fill=(140, 92, 10))

    x = PAD
    for label, pane in panes:
        sheet.paste(pane, (x, HEAD))
        d.text((x, HEAD + PANE + 6), label, font=font(14), fill=INK)
        x += pane.width + PAD
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--species")
    ap.add_argument("--photo")
    ap.add_argument("--preferred", action="store_true",
                    help="every candidate the owner pinned as preferred or alternative")
    ap.add_argument("--out-dir", default="evidence/candidates/strips")
    a = ap.parse_args()
    outdir = ROOT / a.out_dir
    jobs = []
    if a.preferred:
        for pid, v in decisions.current().items():
            if v["decision"] in ("preferred", "alternative", "approved"):
                jobs.append((v["species"], pid))
    elif a.species and a.photo:
        jobs.append((a.species, a.photo))
    else:
        ap.error("give --species and --photo, or --preferred")
    made = 0
    for sp, pid in sorted(jobs):
        p = strip(sp, pid, outdir / f"{sp}-{pid}.png")
        if p:
            print(p)
            made += 1
    return 0 if made else 1


if __name__ == "__main__":
    sys.exit(main())
