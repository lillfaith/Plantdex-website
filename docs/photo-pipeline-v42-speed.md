# Making screening faster without losing recall (v4.2)

Research only. No card, template, database row or weight changed. v2, v3, v4, v4.1 stay reproducible; v4.2 is a new policy flag. "Retrieval" below means the whole step from a species name to a ranked pool,
because the search itself takes about a minute and everything else is screening.

## Where the time goes (profile, 16 photographs from #62's pool, 4-core runner)

| stage | seconds per photograph |
|---|---|
| download (large) | 0.77 |
| load and resize | 0.02 |
| segmentation (BiRefNet-lite) | 9.0 |
| scoring one view | 9.0 (that is the segmentation) |
| whole screening (full frame + its crops, 2.0 views on average) | **18.1** |

Re-segmenting a crop cost 7.8 s; reusing the full-frame mask for it cost 0.025 s. Segmentation is the cost; everything else is noise.

## Options tested

| option | result |
|---|---|
| lighter segmenters | **rejected.** u2netp, silueta and isnet-general-use are 5-26x faster but their masks overlap the current ones by only 40-52% (mean IoU), so they would change the scores, not just the speed |
| segmentation-free pre-filter (colour/edge statistics) | **rejected.** Leave-one-species-out on 4,367 photographs: it predicts the full score with rank correlation only 0.44-0.48. Keeping 70% of the pool still loses 2 of 8 main picks and 2 of 5 tall picks; keeping 50% loses 3 of 8 and 3 of 5. No safe cutoff exists |
| **v4.2: subject crops reuse the full-frame mask** | **adopted as a candidate.** Flower-cluster crops (no subject in the frame) are still segmented afresh |

## v4.2 results on the 19 known picks (same five species, same sharded setup)

| | v4.1 | v4.2 |
|---|---|---|
| seconds per photograph per job | 20.6 | **14.3** (1.44x faster; less than 2x because the download, the flower-cluster crops and framework overhead remain) |
| picks in the pool | 19 / 19 | 19 / 19 (retrieval is unchanged by design) |
| picks surviving screening | 18 | **19** |
| picks in the top 5% / top 25% of survivors | 5 / 8 | **6 / 13** |
| median percentile of the picks | 0.277 | **0.174** |

**v4.2 is not a bit-identical speedup.** Its scores agree with v4.1's with rank correlation 0.82-0.95 per role and the top-12 lists share 9-12 of 12 photographs: reusing the whole-frame mask changes what a crop scores, because a crop segmented
on its own sees less context. On these 19 picks the change moved them *up*, but that is one training batch and the effect is not tuned or explained. It must be confirmed on a blind batch before anyone calls it better.

## Status

| criterion | result |
|---|---|
| recall of the owner's picks (in pool, surviving) | held: 19 / 19 retrieved, 19 / 19 survive |
| speed | 1.44x per photograph; a species pool of ~1,000 photographs takes about 4 hours of compute (about 40 minutes sharded 6 ways) |
| score parity with v4.1 | **not identical** (above) |
| visual quality, finished-asset checks | not run for v4.2 (unchanged from v4.1: not passed) |
| generalisation | untested; v4.2 blind predictions for #77-81 are being sealed before the owner chooses |

## What would speed it up further (not built)

Sharding is linear and free of risk. Beyond that, the only lever left is the segmenter itself (9 s per photograph on CPU): a GPU runner or an exact, faster export of the same BiRefNet-lite weights. Any replacement must reproduce the current masks (IoU near 1.0) before it is used.
