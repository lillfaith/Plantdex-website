# Retro report: the owner's 19 photographs under v2 and v3

Training batch (#62-66): v3's rules were chosen after seeing these picks, so this measures whether the changes repair the failures they were
designed against. It does NOT show that v3 generalises; only the sealed blind batch can.

## Per-photograph ranks (rank among survivors for the role it was picked for; `-` = not in pool / rejected)

| card | role | photo | v2 outcome | v2 rank | v3 outcome | v3 rank | v4 outcome | v4 rank | v4 view | v4 pool |
|---|---|---|---|---|---|---|---|---|---|---|
| 62 | main | 72518818 | retrieval | 50/124 (if retrieved) | retrieval | 82/256 (if retrieved) | ranking | 226/562 | subject-crop | 1100 |
| 62 | pixel | 281944233 | retrieval | 8/149 (if retrieved) | retrieval | 11/206 (if retrieved) | ranking | 29/627 | full-frame | 1100 |
| 62 | tall | 3724391 | ranking | 79/102 | ranking | 108/194 | ranking | 372/607 | subject-crop | 1100 |
| 63 | main | 547150859 | ranking | 110/194 | hit | 13/298 | ranking | 26/479 | subject-crop | 667 |
| 63 | main | 127092 | ranking | 109/194 | ranking | 137/298 | ranking | 201/479 | full-frame | 667 |
| 63 | main | 661119321 | retrieval | - | ranking | 224/298 | ranking | 352/479 | full-frame | 667 |
| 63 | pixel | 231940855 | ranking | 99/201 | ranking | 117/242 | ranking | 148/436 | full-frame | 667 |
| 63 | tall | 149770705 | stage-A | - | retrieval | - | ranking | 422/493 | subject-crop | 667 |
| 64 | main | 745700906 | ranking | 107/209 | ranking | 96/308 | ranking | 251/827 | subject-crop | 1050 |
| 64 | main | 728257757 | ranking | 27/209 | ranking | 29/308 | ranking | 65/827 | full-frame | 1050 |
| 64 | pixel | 151903275 | retrieval | 56/251 (if retrieved) | retrieval | 61/291 (if retrieved) | ranking | 200/866 | subject-crop | 1050 |
| 64 | pixel | 89984767 | stage-A | - | retrieval | 5/291 (if retrieved) | hit | 20/866 | subject-crop | 1050 |
| 64 | tall | 419948962 | retrieval | 169/196 (if retrieved) | retrieval | 237/276 (if retrieved) | ranking | 244/857 | subject-crop | 1050 |
| 65 | main | 316785117 | ranking | 46/110 | ranking | 75/226 | stage-A | - | full-frame | 350 |
| 65 | pixel | 24700338 | retrieval | 9/98 (if retrieved) | retrieval | 15/150 (if retrieved) | ranking | 87/191 | full-frame | 350 |
| 65 | tall | 21411326 | hit | 7/120 | hit | 10/186 | hit | 7/170 | subject-crop | 350 |
| 66 | main | 430695917 | retrieval | 1/142 (if retrieved) | retrieval | 1/268 (if retrieved) | hit | 8/694 | full-frame | 1200 |
| 66 | pixel | 53367016 | stage-A | - | hit | 13/217 | ranking | 23/693 | subject-crop | 1200 |
| 66 | tall | 675951613 | retrieval | - | retrieval | 67/227 (if retrieved) | stage-A | - | full-frame | 1200 |

## Top-k performance. END-TO-END counts a pick only if it was retrieved into the pool AND ranked within k among the role's survivors;
## IF-RETRIEVED additionally scores the picks the pool missed (injected afterwards), so it isolates ranking from retrieval.

| method | n | retrieved into pool | end-to-end top-1 | top-5 | top-20 | if-retrieved top-1 | top-5 | top-20 | median percentile (if retrieved) |
|---|---|---|---|---|---|---|---|---|---|
| v2 | 19 | 11 | 0 | 0 | 1 | 1 | 1 | 4 | 0.41 |
| v3 | 19 | 10 | 0 | 0 | 3 | 1 | 2 | 7 | 0.25 |
| v4 | 19 | 19 | 0 | 0 | 3 | 0 | 0 | 3 | 0.28 |
| random order over v3 survivors (expected, if retrieved) | 19 | n/a | n/a | n/a | n/a | 0.1 | 0.4 | 1.5 | 0.50 |
| iNaturalist vote order (observation level, not photo level) | 19 | 19/19 within 300 | n/a | n/a | n/a | 0 | 2 | 4 | n/a |

## Why each miss happened (v4)

| failure stage | count | photos |
|---|---|---|
| retrieval | 0 |  |
| stage-A | 2 | 65/main/316785117, 66/tall/675951613 |
| below-minimum-score | 0 |  |
| ranking | 14 | 62/main/72518818, 62/pixel/281944233, 62/tall/3724391, 63/main/547150859, 63/main/127092, 63/main/661119321, 63/pixel/231940855, 63/tall/149770705, 64/main/745700906, 64/main/728257757, 64/pixel/151903275, 64/tall/419948962, 65/pixel/24700338, 66/pixel/53367016 |
| hit | 3 | 64/pixel/89984767, 65/tall/21411326, 66/main/430695917 |

'retrieval' = never in the pool; 'stage-A' = hard-rejected; 'ranking' = survived but ranked beyond 20. Downstream failure (a photograph that ranks well but cannot
be cut out or reduced to 24px) is not visible in these ranks; it is measured separately (owner feature study).

## By role

| role | v2 top-20 | v3 top-20 | v4 top-20 | v2 survives | v3 survives | v4 survives |
|---|---|---|---|---|---|---|
| main | 1/8 | 2/8 | 1/8 | 7/8 | 8/8 | 7/8 |
| pixel | 2/6 | 4/6 | 1/6 | 4/6 | 6/6 | 6/6 |
| tall | 1/5 | 1/5 | 1/5 | 3/5 | 4/5 | 4/5 |
