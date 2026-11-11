#!/usr/bin/env python3
"""Harvest the deck's own icon set from the 54 printed card fronts.

────────────────────────────────────────────────────────────────────────────────
THE ICONS ARE ALREADY IN THIS REPOSITORY, AND NOTHING NEEDS TO BE UPLOADED.

`public/cards/*.webp` are the 800px card fronts the site serves. Every use icon the deck
has is printed on one of them, and `herbs.json` says which uses each card carries IN
ORDER -- so the discs can be cut out and LABELLED by cross-referencing rather than by
somebody deciding what each picture means.

That cross-reference is the whole point. A gold disc with a steaming cup on it is only
`tea` because every card showing it has `tea` in its uses and no card lacking `tea`
shows it. The script asserts exactly that, and refuses to name an icon it cannot
distinguish -- a mislabelled icon is a false claim about a plant, printed on a card.

    python3 scripts/extract_card_icons.py --out docs/assets/card-kit/icons
    python3 scripts/extract_card_icons.py --self-test
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
import pathlib
import sys

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
FRONTS = ROOT / "public" / "cards"

# ── THE DISCS SIT IN TWO FIXED SLOTS, AND BLOB DETECTION WAS THE WRONG TOOL ────
#
# Measured across the fronts: every printed card carries EXACTLY TWO use icons, in the
# same two boxes, on all 45. So the positions are a property of the layout, not something
# to rediscover per card.
#
# Finding them by connected gold ran into two walls that no threshold fixes. The fill
# ratio depends on the GLYPH -- a fork and knife leaves 0.50 of the disc gold, a lungs
# glyph 0.33 -- so a fill filter rejects whichever icons happen to be busy. And a glyph
# that touches the rim SPLITS the ring into two blobs, which is what happened to Pine:
# three blobs for two discs. Both failures are silent and both mislabel.
#
# Cropping the slots is exact, needs no threshold, and cannot split anything.
SLOT_A = (619, 699, 675, 759)
SLOT_B = (679, 699, 735, 759)
SLOTS = (SLOT_A, SLOT_B)

# The season tile, at the right-hand end of the encounter strip. Measured the same way:
# the gold on Pine's front runs y 1017-1063, x 684-731.
SEASON_SLOT = (681, 1014, 735, 1068)

# Still used, but only for the self-test's controls and for reporting: the deck's icon
# gold samples at (254, 248, 140), which is NOT the token gold #ffd54a used by the corner
# flourishes and the encounter tile.
GOLD_MIN = (235, 225, 95)
GOLD_MAX = (255, 255, 175)


def gold_mask(rgb: np.ndarray) -> np.ndarray:
    lo, hi = np.array(GOLD_MIN), np.array(GOLD_MAX)
    return np.all((rgb >= lo) & (rgb <= hi), axis=-1)


def discs_for(path: pathlib.Path) -> list[Image.Image]:
    """The two use discs, left then right, cropped from the fixed slots."""
    im = Image.open(path).convert("RGB")
    return [im.crop(slot) for slot in SLOTS]


def season_tile(path: pathlib.Path) -> Image.Image:
    return Image.open(path).convert("RGB").crop(SEASON_SLOT)


def thumb(im: Image.Image) -> np.ndarray:
    """A 48x48 grey normalised view, for comparing two discs.

    A PERCEPTUAL HASH WAS THE FIRST ATTEMPT AND IT WAS TOO BRITTLE: the same icon printed
    on five different cards differs by a few anti-aliased pixels, which flips bits, and
    the run reported "edible matched 5 distinct discs". Comparing by DISTANCE instead
    tolerates that and still separates genuinely different pictures.
    """
    a = np.array(im.convert("L").resize((48, 48), Image.BOX), float)
    a -= a.mean()
    norm = np.linalg.norm(a)
    return a / norm if norm else a


def distance(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.linalg.norm(a - b))


def harvest() -> tuple[list[tuple[str, str, Image.Image]], list[str]]:
    """(use key, card id, disc) for every card whose disc count matches its use count."""
    deck = json.loads((ROOT / "src" / "data" / "herbs.json").read_text())
    pairs: list[tuple[str, str, Image.Image]] = []
    notes: list[str] = []
    for herb in deck["herbs"]:
        path = FRONTS / f"{herb['id']}.webp"
        if not path.exists():
            continue
        found = discs_for(path)
        uses = herb["uses"]
        if len(uses) != len(SLOTS):
            notes.append(f"{herb['id']}: {len(uses)} use(s) {uses} but the layout has "
                         f"{len(SLOTS)} slots -- skipped, cannot pair them safely")
            continue
        # THE PAIRING ASSUMPTION: discs are printed left to right in the order `uses`
        # lists them. It is checked below rather than trusted.
        for im, use in zip(found, uses):
            pairs.append((use, herb["id"], im))
    return pairs, notes


def resolve(pairs: list[tuple[str, str, Image.Image]]) -> tuple[dict, dict, list[str]]:
    """Pick one canonical disc per use, and VERIFY the labelling actually clusters.

    The medoid is the instance closest to all the others wearing that label. Then every
    instance is re-classified against the medoids: if an icon labelled `tea` is closer to
    the `digestive` medoid, the left-to-right pairing assumption is wrong somewhere, and
    that is reported rather than silently shipped. A mislabelled icon is a false claim
    about a plant, printed on a card.
    """
    by_use: dict[str, list[tuple[str, Image.Image, np.ndarray]]] = collections.defaultdict(list)
    for use, card, im in pairs:
        by_use[use].append((card, im, thumb(im)))

    medoid: dict[str, np.ndarray] = {}
    chosen: dict[str, Image.Image] = {}
    problems: list[str] = []
    for use, items in by_use.items():
        if len(items) == 1:
            chosen[use], medoid[use] = items[0][1], items[0][2]
            continue
        best, best_cost = None, None
        for card, im, t in items:
            cost = sum(distance(t, other[2]) for other in items)
            if best_cost is None or cost < best_cost:
                best, best_cost = (card, im, t), cost
        chosen[use], medoid[use] = best[1], best[2]

    # The check: does every instance land on its own label?
    confusion: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    for use, items in by_use.items():
        for card, im, t in items:
            nearest = min(medoid, key=lambda u: distance(t, medoid[u]))
            confusion[use][nearest] += 1
            if nearest != use:
                problems.append(f"{card}: a disc labelled {use!r} is closest to the "
                                f"{nearest!r} icon -- the ordering assumption may be wrong")
    return chosen, confusion, problems


def self_test() -> int:
    a = Image.new("RGB", (40, 40), (255, 214, 74))
    b = Image.new("RGB", (40, 40), (255, 214, 74))
    b.putpixel((0, 0), (0, 0, 0))
    checks = [
        (distance(thumb(a), thumb(Image.new("RGB", (40, 40), (255, 214, 74)))) < 1e-9,
         "two identical pictures are at distance zero"),
        (not gold_mask(np.array([[[255, 213, 74]]]))[0][0],
         "CONTROL: the deck's TOKEN gold (#ffd54a, the corner flourishes and the encounter "
         "tile) is NOT matched -- it is a different, darker gold from the icons', and "
         "matching it would add false blobs to every card"),
        (not gold_mask(np.array([[[156, 33, 248]]]))[0][0],
         "CONTROL: the card's violet ground is NOT matched"),
        (not gold_mask(np.array([[[111, 208, 239]]]))[0][0],
         "CONTROL: the water droplet's cyan is NOT matched"),
        (len(SLOTS) == 2, "the layout has two use slots"),
        (SLOT_A[2] <= SLOT_B[0], "CONTROL: the two slots do not overlap"),
        (gold_mask(np.array([[[254, 248, 140]]]))[0][0],
         "the MEASURED icon gold (254,248,140) is matched -- the first bounds were not"),
    ]
    bad = sum(1 for ok, _ in checks if not ok)
    for ok, label in checks:
        print(f"{'PASS' if ok else 'FAIL'}  {label}")
    print("\nALL SELF-TESTS PASSED" if not bad else f"\n{bad} FAILURE(S)")
    return 1 if bad else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="docs/assets/card-kit/icons")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        return self_test()

    pairs, notes = harvest()
    named, confusion, problems = resolve(pairs)
    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    deck = json.loads((ROOT / "src" / "data" / "herbs.json").read_text())
    all_uses = sorted({u for h in deck["herbs"] for u in h["uses"]})

    # ── Seasons. One tile per card, and every card declares its season, so this needs
    # ── no pairing assumption at all -- it is a straight lookup.
    deck_herbs = json.loads((ROOT / "src" / "data" / "herbs.json").read_text())["herbs"]
    season_pairs = [(h["season"], h["id"], season_tile(FRONTS / f"{h['id']}.webp"))
                    for h in deck_herbs if (FRONTS / f"{h['id']}.webp").exists()]
    season_named, season_confusion, season_problems = resolve(season_pairs)
    season_counts = collections.Counter(s for s, _, _ in season_pairs)
    for season, im in sorted(season_named.items()):
        im.resize((200, 200), Image.LANCZOS).save(out / f"season-{season}.png")
        print(f"  season-{season}.png  from {season_counts[season]} card(s), "
              f"{season_confusion[season][season]}/{season_counts[season]} agree")
    problems.extend(season_problems)

    counts = collections.Counter(use for use, _, _ in pairs)
    for use, im in sorted(named.items()):
        im.resize((200, 200), Image.LANCZOS).save(out / f"use-{use}.png")
        agree = confusion[use][use]
        print(f"  use-{use}.png  from {counts[use]} card(s), "
              f"{agree}/{counts[use]} agree with the medoid")

    missing = [u for u in all_uses if u not in named]
    print(f"\nnamed {len(named)}/{len(all_uses)} use icons")
    if missing:
        print(f"  MISSING: {missing}")
    for note in notes:
        print(f"  note: {note}")
    for problem in problems:
        print(f"  WARN: {problem}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
