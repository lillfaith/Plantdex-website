# Photo selection study: the owner's hand picks for #62-66 against the pipeline

Research only. No card, asset, template, database row, ranking weight or file under `public/` was changed, and nothing
was regenerated. Every number is a readout of the pipeline's own measurements (`scripts/production/screen.py`,
`rank.py`) on the real photographs; none was tuned. **n is five species and 19 pictures, so this generates hypotheses and
a test plan. It does not prove anything about 2,000 species.**

Reproduce: `scripts/production/selection_study.py` (shortlist view) and `selection_study_pool.py` (whole pool, via
`.github/workflows/selection-study-pool.yml`); outputs in `evidence/selection-study/report*`.

## 0. A correction that changes how this study reads

Three different sets of photographs were in play and I had conflated two of them:

| set | what it is | status |
|---|---|---|
| the 15 photo IDs I fetched (CC0-verified originals) | **ChatGPT's** picks, from my contact sheets. The kit's own comparison image labels them "MY ORIGINAL" | fetched, verified |
| the 19 `*inspo*` pictures in `Humanpickstolearnfrom.zip` | **the owner's** picks. Resized pictures, no IDs, no licence record | not verifiable as supplied |
| the pipeline's own ranking | my score, per role | this study |

So the three-way comparison is *owner vs ChatGPT vs pipeline*. The IDs I fetched do not tell us what the owner chose.

## 1. Where the 19 pictures are (traceability)

I rebuilt each species' whole candidate pool (300 photos; 261 for the lotus), screened every photo with the real
pipeline, and located each picture in it by feature matching (2,000+ inlier matches = the same photograph; below 25 =
not found). Photo pages: `https://www.inaturalist.org/photos/<id>`. All located photos came from a CC0, research-grade,
exact-taxon query; the second per-photo licence re-check has **not** been run on them.

| card | role | owner picture | photo id | pipeline's own verdict on it |
|---|---|---|---|---|
| 62 | main | buckwheatmaininspo | not found | picture scored as-is: 84.9, would rank ~15/116 |
| 62 | pixel | buckwheatpixelinspo | not found | picture scored as-is: 87.9, would rank 1/140 |
| 62 | tall | buckwheatpreviewinspo | 3724391 | pool rank 77/98 (bottom quarter) |
| 63 | main | wildquininemaininspo | 547150859 | rank 106/185 |
| 63 | main | wildquininemaininspo2 | 127092 | rank 105/185 |
| 63 | main | wildquininemaininspo3 | not found | **hard-rejected: hand over subject** |
| 63 | pixel | wildquininepixelinspo | 231940855 | rank 94/193 |
| 63 | tall | wildquininepreviewinspo | 149770705 | **hard-rejected: stalk cut at top of frame** |
| 64 | main | sweeteverlastingmaininspo | 745700906 | rank 103/201 |
| 64 | main | sweeteverlastingmaininspo2 | 728257757 | main rank 27/201, **tall rank 1/188** (my #1 tall) |
| 64 | pixel | sweeteverlastingpixelinspo | not found | picture scored as-is: 82.6, would rank 11/239 |
| 64 | pixel | sweeteverlastingpixelinspo2 | 89984767 | **hard-rejected: "no separable plant subject"** |
| 64 | tall | sweeteverlastingpreviewinspo | not found | picture scored as-is: 49.4, would rank 145/188 |
| 65 | main | americanlotusmaininspo | 316785117 | rank 46/110 |
| 65 | pixel | americanlotuspixeinspo (seed pod) | not found | picture scored as-is: 87.9, would rank 1/98 |
| 65 | tall | americanlotuspreviewinspo | 21411326 | tall rank 7/120; it is my **#1 main** |
| 66 | main | annualfleabanemaininspo | not found | picture scored as-is: 96.3 (inflated, see caveat) |
| 66 | pixel | annualfleabanepixelinspo | 53367016 | **hard-rejected: hand over subject** |
| 66 | tall | annualfleabanepreviewinspo | not found | **picture scored as-is: "no separable plant subject"** |

Caveat on "scored as-is": the pictures are downsized (<=1024px) and sometimes cropped, and I used a neutral
identification record, so these scores are indicative and not comparable to pool scores to the decimal. The seven
"not found" pictures are either outside the pool (see 4.5) or cropped enough to defeat matching. (Resolved in 1b.)

Side-by-side sheets (owner picture | same photo in the pool | pipeline #1 for that role) are in
`evidence/selection-study/report-pool/<card>/sheets/`. Pipeline #1 per role:
62 main 546599977 / pixel 258888396 / tall 80766186; 63 main 130021953 / pixel 305990689 / tall 216137711;
64 main 559561652 / pixel 174334069 / tall 728257757; 65 main 21411326 / pixel 431603996 / tall 18367241;
66 main 41556743 / pixel 542375965 / tall 84051599.

## 1b. UPDATE: the exact photographs, from the owner's browsing history

The owner's history named the observations they chose from. Matching each of the 19 pictures against every photo on
those observations gave **19 of 19 unambiguous matches** (2,200-2,500 inliers; the runner-up on the other photos was 0-10, except
#66 tall, where a second frame of the same observation scored 1,370 and the match to 675951613 still wins).
Every photo is CC0 on its own record, the observation taxon is exactly the species, and originals were downloaded unedited
(`fetch_human_picks.py`, run 44181077227).

| card | role | owner picture | photo | observation |
|---|---|---|---|---|
| 62 | main | buckwheatmaininspo | 72518818 | 45735237 |
| 62 | pixel | buckwheatpixelinspo | 281944233 | 163034672 |
| 62 | tall | buckwheatpreviewinspo | 3724391 | 3217076 |
| 63 | main | wildquininemaininspo | 547150859 | 303560859 |
| 63 | main | wildquininemaininspo2 | 127092 | 87006 |
| 63 | main | wildquininemaininspo3 | 661119321 | 362228567 |
| 63 | pixel | wildquininepixelinspo | 231940855 | 135944027 |
| 63 | tall | wildquininepreviewinspo | 149770705 | 90608931 |
| 64 | main | sweeteverlastingmaininspo | 745700906 | 405928651 |
| 64 | main | sweeteverlastingmaininspo2 | 728257757 | 397085607 |
| 64 | pixel | sweeteverlastingpixelinspo | 151903275 | 91799030 |
| 64 | pixel | sweeteverlastingpixelinspo2 | 89984767 | 56464390 |
| 64 | tall | sweeteverlastingpreviewinspo | 419948962 | 236077232 |
| 65 | main | americanlotusmaininspo | 316785117 | 181762985 |
| 65 | pixel | americanlotuspixeinspo | 24700338 | 16418243 |
| 65 | tall | americanlotuspreviewinspo | 21411326 | 14396705 |
| 66 | main | annualfleabanemaininspo | 430695917 | 241644451 |
| 66 | pixel | annualfleabanepixelinspo | 53367016 | 33943486 |
| 66 | tall | annualfleabanepreviewinspo | 675951613 | 370030845 |

Consequences for sections 1-3: the seven "not found" pictures were photographs my pool never contained, so **7 of 19
owner picks (37%) were missing from the candidate pool before any ranking happened** (retrieval, not scoring). Together with the 5
Stage-A rejections (some overlap with the pool-missing set is possible: two were judged on the picture alone), the pipeline
failed to put a reachable owner pick in front of the owner in a large share of cases. The pool-rank figures in section 2 stay
as computed on the 12 located pictures; the seven can now be scored on their true originals in the blind-test setup.
Two of the owner's pictures are the same observation as ChatGPT's picks (lotus pixel: 16418243; everlasting tall: 397085607),
but a different photograph in the lotus case (24700338 vs 24700331).

## 1c. Retrieval probe: why 7 of 19 picks were never in a pool

`scripts/production/retrieval_probe.py` pages through iNaturalist orderings of CC0-photo observations and records where the 19
observations the owner chose from sit (`evidence/blind-test/retrieval-probe/`).

| ordering | owner observations inside it |
|---|---|
| research grade, **by votes**, first 100 observations | 12 of 19 |
| research grade, by votes, first 300 observations | **19 of 19** (deepest: 277) |
| research grade, site default order, first 300 | 6 of 19 (they sit at 13-1,428) |
| research grade + "Flowering" annotation | 5 of 19 |
| research grade + "Fruiting" annotation | 0 of 19 |

Findings, in order of how much they explain:
1. **Every one of the 19 was reachable.** Retrieval depth was never the limit: by-votes position <= 277 in all five species. The loss
   happened at the pool CUT, not in the search.
2. **The cut is biased against the owner's taste.** v2 sorts the pool "flowering-annotated first" and keeps 300 photographs. Only 14 of the owner's
   19 observations (74%) lack that annotation (just 5 appear in a flowering-annotated query), and annotated observations are 6-13% of each species.
   The sort therefore promotes a small, atypical subset and pushes the ordinary, well-liked photographs past the cut.
3. **iNaturalist's own vote ordering is a much better prior than the annotation.** Median by-votes position of the owner's
   observations is 64; in the site's default order it is several hundred.
4. **v3 as built may still be too shallow.** It drops the flowering-first sort but round-robins seven queries into a 320-photograph pool,
   so each query contributes only its first ~45-90 photographs and the by-votes list is cut at roughly position 50-90, short of the 8 of 19 observations
   that sit between 100 and 277. The retro run will show how many of the 19 v3 actually retrieves; if it is short of 19, the fix is
   **a pool that takes the top ~300 observations by votes outright**, with a cheap pre-screen (resolution, orientation, colour) deciding
   what reaches the expensive segmentation step. Not built yet: it is the next change to test, not a finding.

## 2. What the numbers say

1. **My ranking does not predict the owner's picks.** Of the 8 located, non-rejected owner picks, the median
   position is the **50th percentile** of survivors (from 6% to 79%), and 1 of 8 sits inside the 12 I would have shown.
   ChatGPT's picks, chosen from my sheets, sit at a median of the 11th percentile, which is what you expect when
   choosing from a shortlist. Small n; the direction is not subtle.
2. **Stage A rejected 5 of 19 owner pictures outright (26%)**: two for hands, one for a stalk cut at the top, two for "no
   separable subject". Four of the 19 show a hand and the owner accepted all four; the owner's tall picks include a
   frame-clipped stalk and two small plants in landscape frames.
3. **Roles are not independent in my ranking.** The top 10 for main and tall share 3-5 photos per species (mean 4.2),
   main/pixel 1-4 (2.8), pixel/tall 0-3 (1.6). The same photograph keeps floating to the top for two roles, and the
   owner's picks reuse that pattern twice (64 and 65 tall).
4. **Direction, not significance, of the located picks' measurements** (percentile within that species' survivors, n=5 main,
   2 tall, 1 pixel): owner main picks have *busier-than-median* backgrounds (median 0.63), *airy* subjects (solidity 0.26),
   and high mask coherence; owner tall picks have *low* boundary contrast (0.03, 0.24) and the most crowded
   "competing pieces" count (0.92-1.0). The weighted terms I give the opposite sign (plain background, boundary
   contrast, a single stalk) are exactly the ones the owner's picks sit against.

## 3. Verdict on each suspected weakness (inspected, not assumed)

| suspected weakness | verdict | evidence |
|---|---|---|
| overvalues sharpness over completeness | **not supported** | resolution + sharpness weigh 0.05 of the score; completeness 0.25 |
| overvalues close-ups with no stem/leaves | **cannot be tested** | no measure of anatomical connection exists, only edge contact |
| high-res but poor isolation | not supported | resolution is 5%; isolation has its own 20% |
| centred specimens with no readable silhouette | **real gap** | no silhouette-readability metric outside the pixel 24px test |
| dense bushes unsuitable for tall previews | **partly contradicted** | crowding multiplies tall scores by 0.6, but the owner's 62 tall is a foreground branch in a crowded field |
| defining feature partially cropped | **rule too blunt** | `tall_clipped_top` is a hard reject; the owner's 63 tall is clipped at the top |
| busy backgrounds / overlapping vegetation | **over-penalised** | isolation 20% and plain-background 22% (tall); owner picks sit on busier backgrounds |
| similar photos reused across roles | **real** | section 2.3 |
| hands | **real, and wrong** | 16 of 300 hard-rejected for 62; owner accepted four hand pictures |

Two further problems the owner's list did not name:
- **`no_subject` is the largest rejection by far**: 26-114 of every 300 photos (9-38%). The segmenter looks for one
  dominant object, so a small plant in a wide scene (fleabane preview, everlasting pixel 2) is invisible to it.
- **Retrieval depth.** Pools are the top 800 observations of each of five queries (4 pages x 200). The lotus pool (261) was
  not truncated, yet the seed-pod photo is not in it, so the cause is retrieval depth and ordering, not the cut-off.
  I cannot confirm that for the other six without the IDs.

## 4. Proposed system (measurable; no weights invented)

**What a program can check:** resolution, licence, taxon, subject-box clipping, stalk/leaf/flower connection once a
mask exists, silhouette fill and aspect after a candidate crop, native 24x24 colour/piece count, duplicate use across roles.
**What still needs a person or a vision model:** is this feature diagnostic, is the composition elegant, is a hand
removable without destroying anatomy, does a seed pod or a bud serve better than a flower.

1. **Stage A keeps only what the bytes decide:** unreadable or <1200px, wrong taxon, no CC0 licence. Hands,
   `tall_clipped_top`, `main_clipped`, `subject_too_small` and `no_subject` stop being rejections and become *"needs crop
   pass"*.
2. **Crop-then-score.** Generate candidate crops (vertical unit, one flower head, whole branch) per role, then score each crop; the
   owner's landscape tall picks are all "a vertical unit found inside a landscape frame".
3. **Role-specific scorers, same measurements, no shared formula.** Keep the existing separation; do not change a weight
   until step 6 passes.
4. **Cross-role assignment:** choose the three roles jointly so one photograph is not recommended twice, and require the
   pixel source to show a *different* organ than the main where the species allows (seed pod, bud, face-on flower).
5. **Widen retrieval:** per-query depth, plus explicit fruit/seed/bud queries. Report pool size per query.
6. **Blind evaluation before any claim.** For #77-81 I produce my top 3 per role, locked and committed, *before* the owner
   chooses. Then score: (a) owner pick not hard-rejected (current: 14/19 = 74%), (b) owner pick inside my top 12
   (current: 1/8 located, non-rejected picks), (c) median percentile of owner picks (current: 0.50). A change is
   adopted only if it beats these on that batch **and** does not worsen them on #62-66.

## 5. ChatGPT's draft against this analysis

Independently reached by both: selection should optimise what survives extraction, not source-photo attractiveness; hands
and habitat clutter are not grounds for rejection; landscape source images can yield good tall previews; the lotus seed
pod shows that the pixel feature need not be a flower; source background is secondary if extraction is clean; keep alternatives.
Differences: ChatGPT reads the picks as *preferences*; I can measure that **my ranking is unrelated to them** and that
5 of 19 never survive Stage A, which turns the lessons into specific rule changes. ChatGPT's "isolation matters
less" is supported only weakly by my numbers (n=5). Its "crowded backgrounds fine if the foreground branch is
complete" is supported by one tall pick. Needs a person: diagnostic value of a feature, elegance, removability of a hand.

## 6. Questions for the owner

1. The seven pictures marked "not found": which iNaturalist photo IDs are they?
2. For Wild Quinine (3 mains) and Sweet Everlasting (2 mains, 2 pixels): which of the alternates would you actually use?
   They are different photographs, so the study cannot treat them as one answer.
