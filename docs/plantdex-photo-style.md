# The PlantDex photographic style profile

Measured from the 45 printed card fronts by `scripts/analyze_card_photos.py`.
Regenerate with `python3 scripts/analyze_card_photos.py`; the numbers live in
`docs/plantdex-photo-style.json` and the pipeline reads them from there rather than from
this page, so the two cannot drift.

## What was measured, and what could not be

The shipped cards are **flattened**. There is no separate photographic layer in
`public/cards/*.webp`, and `build_deck.py` rasterises print masters that are not in this
repository. What IS recoverable is the photograph's **footprint**, because
`docs/assets/cardbase.pdf` is the same template carrying no content: every pixel inside the
art window that differs from the template is photograph, and every pixel that matches is
backdrop showing through.

So footprint, placement, crop behaviour, edge softness and composited colour are faithful.
The photograph's own pixels are **not** recoverable where it is composited at less than full
opacity, so the colour figures describe the finished card, not the source photograph.

One measurement bug is worth recording because it produced a confident, wrong answer: the
first run reported every card as filling the frame and touching all four edges. Card and
template are the same artwork resampled twice, so a few pixels on a gold corner differ by
more than the threshold — and a bounding box is a MIN and a MAX, so four stray pixels in
four corners describe a full-frame subject. Components under 400px are now dropped before
anything positional is computed, and a control checks that a card measured against *itself*
reports no photograph at all.

## The profile

| measurement | median | p10–p90 | sd |
|---|---|---|---|
| share of the art window the plant covers | 0.314 | 0.196–0.424 | 0.089 |
| subject width, as a share of the window | 0.811 | 0.646–0.975 | 0.136 |
| subject height, as a share of the window | 0.990 | 0.919–1.000 | 0.050 |
| horizontal centre of mass | 0.510 | 0.475–0.539 | 0.026 |
| vertical centre of mass | 0.541 | 0.456–0.638 | 0.069 |
| solidity: subject pixels within its own box | 0.385 | 0.249–0.539 | 0.105 |
| edge softness, halo px per boundary px | 1.830 | 1.554–1.926 | 0.152 |
| share of subject pixels that read as foliage | 0.495 | 0.052–0.841 | 0.280 |

## Cropping: the one rule that is nearly absolute

| edge | cropped on |
|---|---|
| bottom | **97.8%** |
| top | 64.4% |
| right | 22.2% |
| left | 8.9% |

**The bottom is cropped on 44 of the 45 printed cards.** The single exception is
`oxalis-stricta`, whose subject stops 42px short of a 484px window. Top cropping is a
coin-flip, and the sides are cropped on fewer than one card in four — so placement is
**height-driven, bottom-seated, and must not run off the sides**.

## Consistent across the deck vs. legitimate growth-form variation

**Consistent, and therefore safe to enforce:**

* Horizontal centring. `centroid_x` has a standard deviation of 0.026
  around a median of 0.510 — the tightest figure in the table.
* Bottom cropping, as above.
* Subject height, which fills essentially the whole window
  (median 0.990).
* Edge softness, clustered at 1.83 halo pixels per boundary
  pixel: the deck's cutouts are soft, not hard-edged, and a jagged mask will not match.

**Legitimately variable, and therefore NOT to be enforced:**

* `foliage_fraction` spans 0.052–0.841.
  A conifer and a rosette are different plants; demanding a fixed share of green would
  reject correct photographs of whole growth forms.
* `frame_fill` spans 0.196–0.424. An open
  umbel covers far less of its box than a dense clump at the same apparent size.
* Subject width (0.646–0.975) follows habit:
  a spike is narrow, a sprawling mat is not.

## The nine Field Cards are NOT part of the standard

They are digital-only, drawn later, and follow a different convention: they crop the top on
100.0% and the bottom on 100.0% of cards and the sides on
0.0%. Averaging them in with the printed deck would blur a real
distinction into a meaningless middle, so `profile` is the printed 45 and the Field Cards
are reported separately as `field_cards_profile`.

## Photograph opacity

The subject is composited at **95%**, applied to the cutout's alpha only — never to the
frame, the text, the icons or the card ground. Note this is a specified value, not a
measured one: with no separable photographic layer there is nothing to solve the
compositing equation against, so it cannot be confirmed from the shipped cards.


## First run against Chamomile: what the pipeline found

8 CC0 candidates, 18.4s end to end on one core, no paid API calls.

| outcome | n | why |
|---|---|---|
| rejected at scoring | 0 | — |
| rejected after segmentation | 3 | cutout solidity 0.88 / 0.96 / 1.00 — a rectangle of vegetation, not a plant |
| flagged, hand behind subject | 2 | a finger sits behind the bloom; segmentation removes it |
| placed and ranked | 5 | |

**Two blockers, and neither is in the code:**

1. **The CC0 pool is too small.** Photo-level CC0 + research grade + ≥900px yields **8**
   photographs for *Matricaria chamomilla*, not the 20–40 the scorer wants to choose from.
   Raising this needs a licence decision: CC-BY would multiply the pool several times over
   at the cost of carrying an attribution line.
2. **Colony photographs cannot be segmented.** Three of the eight are dense stands where
   every pixel is plant, so the mask keeps the whole frame. The pipeline rejects them
   rather than shipping a rectangle, which is correct — but it means the usable set is
   smaller still.

**Scoring note.** The first version scored each raw photograph's subject fraction against
the profile's `frame_fill`, which is a figure measured on *finished cards*. Those are
different quantities: a bloom filling 60% of its own frame can be seated to cover the deck's
usual 31% of the window. That error pushed the best single-specimen photograph in the set
below three colony shots. Composition is now scored **after** placement, where it is
comparable.
