#!/usr/bin/env python3
"""
Chip-sized card art: the third variant.

WHY A THIRD VARIANT EXISTS. `output: 'export'` forces `images: { unoptimized: true }`, so
`sizes` and `quality` do nothing and whichever file a component names is the file that
ships. Field Research renders a strip of card chips at 35x56 CSS pixels and was naming the
400px grid thumbnail for every one of them — ~22KB each to paint about 3KB of screen, and
912KB of images on one page. There is no lever for that except a smaller file.

WHY IT DERIVES FROM THE SHIPPED FRONT, NOT FROM THE PDF. `build_deck.py` renders from the
print masters and needs all 45 of them; a reprint of three cards is patched with `--only`
and the other 42 PDFs are a folder nobody wants to move. This variant is a pure downscale
of art that is already in the repository, so it needs no source material at all — and it is
the only generator that can reach the Field Cards, which were never printed and have no PDF
in this pipeline. Run it after any card art changes; it rewrites every chip from scratch, so
a stale one cannot survive.

112px is measured, not chosen: the strip renders 35 CSS px wide, and 35 x 3 = 105 is the
most a device pixel ratio of 3 can ask for. `deck-art.test.ts` fails if a catalogue entry
has no chip, or if one is not this width.
"""

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover - dev tooling only
    sys.exit("Pillow is required: pip3 install pillow")

REPO = Path(__file__).resolve().parent.parent
ART = REPO / "public" / "cards"
CHIP_WIDTH = 112


def main() -> int:
    fronts = sorted(p for p in ART.glob("*.webp") if p.is_file())
    if not fronts:
        print(f"No card fronts in {ART.relative_to(REPO)}/", file=sys.stderr)
        return 1

    out = ART / "chip"
    out.mkdir(parents=True, exist_ok=True)

    written = 0
    for front in fronts:
        img = Image.open(front).convert("RGB")
        height = round(img.height * CHIP_WIDTH / img.width)
        img.resize((CHIP_WIDTH, height), Image.LANCZOS).save(
            out / front.name, "WEBP", quality=80, method=6
        )
        written += 1

    total = sum(p.stat().st_size for p in out.glob("*.webp"))
    print(
        f"Wrote {written} chips to {out.relative_to(REPO)}/ "
        f"at {CHIP_WIDTH}px ({total / 1024:.0f}KB total, {total / written / 1024:.1f}KB each)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
