# Pipeline v4 on #62-66: what the three changes established

Research only. v2 (shipped) and v3 are unchanged; v4 is a separate policy flag. No card, template, database row or weight was edited, and v4 introduces **no new number**: removed terms were
rescaled out proportionally. Every rank is in `evidence/blind-test/retro-report-v4.md`; review sheets are in `evidence/blind-test/sheets/`.

## The three changes

1. **Retrieval.** The votes-ordered list is read 400 observations deep with every CC0 photograph of each observation; no per-observation cap; the pool floor is 800 px and the resolution rule moved
   from the frame to the *subject*, per role (main subject >= 593 px, tall subject height >= 455 px, pixel feature >= 48 px: the sizes the finished asset is rendered at).
2. **Tall plain-background term removed** (the other tall weights rescaled to sum to 1).
3. **24 px legibility proxy given zero weight** (the remaining pixel terms rescaled).

## Results on the 19 known picks (training batch)

| | v2 | v3 | v4 |
|---|---|---|---|
| picks in the candidate pool | 11 / 19 | 10 / 19 | **19 / 19** |
| pool size per species | 261-320 | 261-320 | 350-1,200 |
| end-to-end, within the top 5% / 10% / 25% of survivors | 0 / 1 / 2 | 1 / 4 / 4 | **5 / 7 / 8** |
| if retrieved, within the top 5% / 10% / 25% | 1 / 4 / 6 | 3 / 8 / 9 | 5 / 7 / 8 |
| median percentile of picks: main / pixel / tall | 0.42 / 0.16 / 0.77 | 0.32 / 0.08 / 0.43 | 0.30 / 0.14 / 0.45 |
| picks hard-rejected | 5 | 1 | 2 |

(Percentiles, not raw ranks, because the pools are 2-4x larger.)

- **Change 1 worked as retrieval**: every pick is now in the pool, which lifts end-to-end performance from 4 to 7 of 19 within the top 10%. Scoring did not improve: if-retrieved results are
  flat against v3. Cost: a pool of 1,000+ photographs took 4-5 hours per species on the runner (three species hit the job time limit and are being re-run in shards), so a cheap pre-filter
  (which must itself be tested for recall) or sharding is needed before this scales to 2,000 species.
- **Change 2 did not improve tall ranking**: median percentile 0.45 vs 0.43 (v3). The owner's tall picks sit mid-pool whichever way the background is scored.
- **Change 3 did not improve pixel ranking** (0.14 vs 0.08), though pixel is the best-ranked role. The removal was an act of caution, not a gain.
- **New rejections from the per-role floors are a finding, not a bug fix**: they rejected the lotus main (subject 451 px, under 593) and the fleabane tall (no separable subject), both of which the owner picked.
  The floors come from the render geometry, not from preference. **This is a genuinely subjective decision for the owner**: is a subject that must be enlarged to fit acceptable?
  Until answered, the floors should be flags, not rejections.

## Visual review (my own look at the sheets; a person has not signed off)

- **#62 tall, v4's top 8 of 607**: #1-#3 are cluttered ground-level shrubs with few or reddish flower heads; #4 (11639963) is a genuinely good upright branch with connected clusters; #5-#8 are close-ups or
  short-stemmed heads. Only 2-3 of the top 8 match what the owner described. **Rank 1-3 is not a good photograph for the role.**
- **#62 pixel, v4's top 8**: a landscape of many bushes, a shrub with one dim cluster, a gloved hand holding a dark cluster, dried brown clusters, a white-clusters-in-foliage shot, and a large pink head (343249159)
  and a large white cluster (83028694) that are plausible. The owner's pick (a single white head on a stem against a soft background) is visibly cleaner than anything in the top 8.
- **The real 24 px reduction is not a discriminating test.** The pipeline's reduction keeps only the flower-colour blob and reduces to a pale, low-contrast patch for every white flower, including the owner's pick. It does not
  show what a person would draw from the photograph, so its output should not be used to rank pixel sources.

## Status

| criterion | result |
|---|---|
| retrieval of the owner's photographs | **passed** (19 / 19 in the pool) |
| ranking quality | **not passed** (flat against v3; picks sit at the 0.28 median percentile) |
| visual quality of the top picks | **not passed** (see above) |
| finished-asset checks | **not passed** (proxies are weak; no cut-out or icon has been reviewed) |
| generalisation | **untested** (blind predictions sealed, owner picks not yet supplied) |

v4 is **not** successful. It fixed one of the three problems that mattered and showed that the other two are not fixed by removing terms.

## Blind batch (#77-81)

v4 predictions (top 12 per role, three joint triples) are sealed in `evidence/blind-test/77-81/PREDICTIONS_SEALED_V4.json` before any selection was seen. #77-79 were sealed 2026-11-18T07:31:47Z; #80 and #81 are in the
sharded re-run and will be added to the same file before the owner chooses. The v2 and v3 predictions were sealed earlier (`PREDICTIONS_SEALED.json`, sha256 d3cbdb00822935e05b6c6e2af9c4f22e9684b708620ac718f8ee4060d359e4ee).

## What the evidence supports next (not built)

1. **A second-stage visual judge on the top K**: the score cannot separate a clean upright branch from a cluttered shrub, but the difference is obvious to a vision model or a person. Test: on #62-66, re-rank the top 40 per role with a vision pass and measure whether the owner's picks move up, leave-one-species-out so the judge is not tuned on the species it is scored on.
2. **A cheaper retrieval**: shard or pre-filter, then verify recall of the 19 is still 19 of 19.
3. **Owner-vs-sample features as hypotheses**, not weights: lower background colour spread (main), one dominant feature filling the frame on a calm background (pixel). Test them one at a time on a blind batch.
