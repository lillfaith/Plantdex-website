"""Two crops of one card's embedded photograph, for the live Plant ID check.

The card fronts carry a real species photograph above the text panel, so cropping to that
panel asks the provider to identify a plant rather than the card's typography.

WHY TWO. `identify-plant` requires `MIN_OBSERVATION_PHOTOS` images and refuses below it:
both providers treat a submitted set as ONE individual, and the browser will not let anybody
send fewer. `verify-plant-id.yml` posted a single `image` field and would have begun
answering `400 tooFewImages` the moment the multi-photo function deployed — the one check
that proves a provider key works live, broken by the deploy it exists to verify.

The second crop is a tighter window on the SAME photograph. That is honest for what this
workflow is: a key-and-connectivity smoke test, not an accuracy benchmark. It is genuinely
one individual plant, which is the constraint the providers actually impose.
"""

import sys

from PIL import Image

# The photo panel, as a fraction of the card front. Measured against the shipped artwork.
PANEL = (0.12, 0.11, 0.88, 0.50)
# A tighter window on that panel, standing in for the close-up slot.
CLOSE = (0.25, 0.20, 0.75, 0.80)


def main() -> int:
    if len(sys.argv) != 4:
        print("usage: crop_card_photo.py <card.webp> <whole.jpg> <close.jpg>", file=sys.stderr)
        return 2
    source, whole_path, close_path = sys.argv[1:4]

    card = Image.open(source).convert("RGB")
    width, height = card.size
    panel = card.crop(
        (
            int(width * PANEL[0]),
            int(height * PANEL[1]),
            int(width * PANEL[2]),
            int(height * PANEL[3]),
        )
    )
    panel_width, panel_height = panel.size
    panel.resize((900, int(900 * panel_height / panel_width))).save(whole_path, quality=88)
    panel.crop(
        (
            int(panel_width * CLOSE[0]),
            int(panel_height * CLOSE[1]),
            int(panel_width * CLOSE[2]),
            int(panel_height * CLOSE[3]),
        )
    ).resize((900, 900)).save(close_path, quality=88)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
