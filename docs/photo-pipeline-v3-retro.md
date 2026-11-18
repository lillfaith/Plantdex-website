# Pipeline v3 retro on #62-66: what the experiments establish (and what they do not)

Research only. No card, template, database row or ranking weight was changed; v2 remains the shipped default and v3 is a policy flag. Sources:
`evidence/blind-test/retro-report.md` (every rank), `retrieval-probe/` (where the owner's observations and photographs sit in each query and in the pool),
`feature-analysis.md` (permutation tests on measurements), `scripts/production/*` (all code). v3 changed rejections, scored crops, joint assignment and
retrieval depth, **not a weight**. It was designed after seeing these 19 picks, so #62-66 is a *training* batch.

## 1. Where each of the 19 photographs ranked

Full per-photograph table: `evidence/blind-test/retro-report.md`. Ranks are among the role's survivors; "(if retrieved)" means the photograph was
not in the candidate pool and was scored afterwards, so it shows what ranking alone would have done.

| outcome (v3) | n | photographs |
|---|---|---|
| **hit** (retrieved, ranked <= 20) | 3 | 63 main 547150859 (13/298), 65 tall 21411326 (10/186), 66 pixel 53367016 (13/217) |
| **ranking miss** (retrieved, ranked > 20) | 7 | 62 tall 3724391 (108/194), 63 main 127092 (137/298), 63 main 661119321 (224/298), 63 pixel 231940855 (117/242), 64 main 745700906 (96/308), 64 main 728257757 (29/308), 65 main 316785117 (75/226) |
| **retrieval miss** (never in the pool) | 9 | see section 2 |

## 2. Top-1 / top-5 / top-20 against v2 and simple baselines (n = 19)

| method | retrieved into pool | end-to-end top-1 / 5 / 20 | if retrieved: top-1 / 5 / 20 | median percentile if retrieved |
|---|---|---|---|---|
| v2 (as shipped) | 11 | 0 / 0 / 1 | 1 / 1 / 4 | 0.41 |
| v3 | 10 | 0 / 0 / 3 | 1 / 2 / 7 | 0.25 |
| random order (expected) | n/a | n/a | 0.1 / 0.4 / 1.5 | 0.50 |
| iNaturalist vote order (observations, not photographs) | 19 of 19 within the top 300 | n/a | 0 / 2 / 4 | n/a |

What this shows: scoring improved (top-20 if retrieved 4 -> 7; median percentile 0.41 -> 0.25; Stage A now passes 18 of 19, was 14), but v3 did **not** improve
retrieval (10 vs 11 in the pool) and end-to-end top-20 is only 3 of 19. Against random the ranking has some signal; against the owner's picks it is weak.
n is 19, so a difference of one or two picks is noise.

## 3. Why the misses happened

**Retrieval (9 of 19)**, diagnosed by replaying the pool builder (`pool-cut-probe.json`, `pool-filter-probe.json`):
- 6 were **cut by the interleave**: v3 interleaves seven queries and keeps 320 photographs, so each query contributes only its first ~45; those six sat at interleaved
  positions 344-887. All six appear in the plain votes-ordered list at photograph positions 134-619.
- 2 were **dropped by the two-photographs-per-observation cap** (64 pixel 151903275, 66 tall 675951613: the 4th photograph of 4 and of 7). This
  is a rule that eliminates strong secondary photographs, which the owner asked not to do.
- 1 was **filtered by the resolution floor** (65 pixel 24700338 is 1079 px; the pool floor is 1400 px). A pixel source is reduced to 24 px, so the floor is not
  obviously right for that role.
- Not the cause: observation taxon, licence, retrieval ordering by votes (every observation is within the top 277 by votes), and, in v3, the flowering-first sort (removed).

**Ranking (7 of 19)**: the owner's picks sit mid-pool (median percentile 0.25 if retrieved). That is better than v2 but not a good predictor.

**Downstream processing**: only automatic proxies exist so far (cutout mask and the real 24x24 reduction), and the pixel-legibility proxy points the wrong
way (section 4). No visual review of finished cutouts or icons has been done, so **no finished-asset check has passed**.

## 4. What distinguishes the owner's picks from the available alternatives (permutation tests)

Owner picks vs 400 randomly sampled pool photographs (`feature-analysis.md`; ~34 features per role, so most nominal p-values are chance; Bonferroni threshold 0.0015).

- **No signal in popularity, flowering annotation, faves, agreements or cover status** (all p > 0.2; cover 0.29 vs 0.53 among multi-photo observations, n = 7). The
  tempting result "owner picks come from single-photo observations" (p < 0.001) is an artefact: the sample counts photographs, the owner picked one per observation, so multi-photo
  observations are over-represented in the sample. It is not a preference.
- **Main (n = 8):** background colour spread is lower than typical (0.48 vs 0.67, percentile 0.11, **passes Bonferroni**); subjects are airier (solidity 0.46 vs 0.62), wider in frame and have more
  edge contrast (71 vs 55). Suggestive, not significant after correction: the subject touches a frame edge more often (stems run off the bottom).
- **Pixel (n = 6):** one dominant feature fills more of the frame (feature area 0.076 vs 0.019), flower colour share is higher (0.51 vs 0.23, p = 0.002), the background is calmer (busyness 0.16 vs 0.45), and there are
  fewer competing clusters (1.3 vs 3.2). My 24 px legibility proxy rates the pipeline's top picks 0.74-0.84 and the owner's 0.47, so **that proxy does not predict this owner's choice** and should not be trusted yet.
- **Tall (n = 5):** the pipeline's top-5 sit on very plain backgrounds (busyness 0.05-0.09); the owner's picks and the random sample do not (0.52 vs 0.45). The 22% plain-background term
  therefore selects for something the owner does not require. The source frame is more often landscape (width/height 1.31 vs 0.92, p = 0.0065, not Bonferroni).
- Hands: no difference (owner 0.074 vs 0.031 hand-skin share, p = 0.11).

## 5. Does it generalise?

Not established. The #62-66 improvements are in-sample. The blind batch is the only valid test: predictions for #77-81 (v2 and v3: top 12 per role and three joint triples)
were committed at 2026-11-18T00:51:03Z in `evidence/blind-test/77-81/PREDICTIONS_SEALED.json`, **sha256 d3cbdb00822935e05b6c6e2af9c4f22e9684b708620ac718f8ee4060d359e4ee**, before any #77-81 selection was seen.
Those predictions come from the v3 as built, including the retrieval problems in section 3, so they will probably under-retrieve. That is the honest baseline for v3 and
any later version is a separate, separately sealed prediction.

## 6. Status of v3 and what to test next (nothing implemented)

v3 is **not** successful: retrieval 10/19, end-to-end top-20 3/19, no visual-quality or finished-asset check passed. Hypotheses supported by evidence, each to be tested, not adopted:
1. **Retrieval:** take every observation from a votes-ordered list to a fixed depth (the owner's observations are within 277), uncap per-observation photographs, and apply the resolution
   floor per role. Test: recall of the 19 photographs (target is simply to measure it), plus screening cost. Cost control by a cheap pre-screen is a *further* hypothesis and must itself be tested for recall.
2. **Tall plain-background term:** the data say it selects against the owner. Test removing it on the retro batch and then on a blind batch; do not tune a replacement weight on 5 picks.
3. **Pixel legibility proxy:** validate against real reductions viewed by a person before it carries any weight.
4. **Visual review:** side-by-side of owner picks and the top picks per role, judged by a person, before any finished-asset claim.
Evaluation order: retrieval fix on the retro set -> seal predictions for the next unseen batch -> owner picks -> score. Each version's predictions are sealed before the selections are inspected.
