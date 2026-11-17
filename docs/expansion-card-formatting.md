# Formatting expansion cards: rules learned in review, and why

Written after cards #57-61. Every rule below came from the owner's review of a rendered card. For each: what was
said, why, what I (Claude) had assumed instead, and where it now lives so the next five cards get it right the first
time. `scripts/render_expansion_batch.py` encodes the rules; its `qa` block checks them on every card and the script
exits non-zero if any fails.

## The one lesson underneath all of them

**Measure against the SHIPPED cards (`public/cards/*.webp`), never against the renderer's own constants or a mockup
alone.** Four of the six corrections below were the same mistake: I trusted a calibration constant
(`STAT_ROWS_INK`, `SLOT_SEASON`, `SLOT_LIMITS`) or a mockup, produced something that matched *that*, and never
compared it with a printed card. The renderer was calibrated on one card (Pine #41) and several of its numbers do
not match the deck as shipped. The owner is comparing my output with the deck, so the deck is the standard.

## The rules

| # | Owner said | Why it matters | My assumption / reasoning | Where it lives now |
|---|---|---|---|---|
| 1 | Main art is not to be stretched; keep natural proportions; stem bottom ~row 329 | A stretched plant is botanically wrong and reads as distorted | My first fit scaled the art to the *bounding box* of the approved mockup, which stretched it horizontally (aspect .745 became .88). I caught it from the report before delivery | `fit_uniform()`: one scale for both axes, scored by overlap with the approved front; art clipped at the window bottom as the mockup is. QA: `main_art_not_stretched` |
| 2 | Pixel icons: centre them (earlier: match the mockup; Boneset slightly larger) | Consistency with the deck; an off-centre icon looks accidental | I treated the mockup as ground truth and copied its position. The mockup's *size* was the intent; its off-centre position was not | `place_pixel()` centres the icon's *ink* in the panel; display size kept (96 for Boneset). QA: `pixel_icon_centred_in_panel` |
| 3 | Water/sun/thermometer icons must be the same size as on existing cards | They are one visual system across 100+ cards | The renderer's icons were ~8-30% too large (drops 35x54 vs 33x49, suns overlapping). I had not measured | `SHIPPED_STAT_ROWS_INK`, pitch 66.4, from colour-segmenting Dandelion and Pine. QA: `icon_*_matches_shipped_size` |
| 4 | Season icon looked small, offset, "overlaid on the original" | It was a second tile on top of the template's own tile | The renderer's `SLOT_SEASON` sits 4px right of where shipped cards draw it | `SLOT_SEASON` corrected, template tile inpainted away first (`clear_template_tile`). QA: `season_tile_single_and_in_place` |
| 5 | Names: size like existing cards; when too long, reduce 5% at a time; stay inside the purple name bar; Latin must not touch the two trait discs; leave a little room | Printed cards were hand-fitted this way; touching edges looks broken | The renderer shrank 7% at a time against generic limits (480/520). Reasonable, but not the deck's practice or its real boundaries | `SHRINK_STEP = 0.95`; limits measured from the template (bar x 59-607, discs from x 619) with 14-24px of room. QA: `name_inside_bar_with_room`, `latin_clear_of_use_discs` |
| 6 | Main image opacity 5% lower | Matches the deck's photo treatment (95%) | I had placed art at full opacity | `MAIN_OPACITY = 0.95` |

## Photo-selection rules (earlier in the project)

- Tall previews: ONE clearly isolated upright stalk/branch with visible leaves and flowers beats a dramatic photo;
  plain background is a major advantage; penalise crowded patches and busy scenes. Now a separate `TALL_WEIGHTS`
  (role fit 25%, plain background 22%, aesthetics 2%) plus hard multipliers for crowds (x0.6) and busy scenes (x0.75).
- Reject hands/gloves, overhead views, cut-off parts, dense patches. **Known gap:** the hand detector still lets some
  hands and a glove through (seen on #60 and #61). Fixing it is the next screening task.
- Never present a non-CC0 photo or an unverified one silently; keep provenance (photo id, observation id, author).

## How to run the next five (what is automated, what is not)

1. Photos: `photo-search-v2` workflow -> ChatGPT chooses main / pixel / tall -> ChatGPT builds the art layers.
2. Put the approved package (same layout as `nov17-image-assets`) and `expansion-cards.json` in place and run
   `python3 scripts/render_expansion_batch.py --assets <pkg> --data src/data/expansion-cards.json --cards <n...> --out <dir>`.
   Text, bars, icons, season, names, opacity, centring and clipping are all automatic; QA must pass.
3. Review the side-by-side `compare_*` images and the overview. Look at: botanical accuracy of the art, long back
   entries the renderer had to shrink (listed in `render-report.json`; abbreviating is an editorial call), and any
   card whose season or stats look wrong against the species.

Not automated yet: judging the artwork itself; abbreviating over-long back entries the deck's way; per-card
season/stat sanity checks (e.g. New Jersey Tea is listed as spring in the table); and the hand-detector fix.

## Standing rules for me

- Before delivering, compare against a shipped card side by side. Do not rely on constants.
- When a mockup and an instruction disagree, the later instruction wins; when the mockup's intent is ambiguous
  (size vs position), keep the size and ask only if the choice is not recoverable.
- Report what I did not verify instead of implying it.
