# Regional invasive status — the Georgia audit

Two things are recorded here: **why the data model is regional**, and **what the audit of all
54 catalogue cards against Georgia's own lists actually found**. The data lives in
`src/lib/invasive-status.ts`; this is the evidence behind it.

---

## Why there is no `invasive: boolean`

Invasive is not a property of a species. It is a relationship between a species and a place,
asserted by a named authority, on a date.

The deck itself makes the point twice over. **Card #03 is *Solidago canadensis*** — native
across the eastern United States, and a serious invader in Europe and China. **Card #40 is
*Lonicera japonica*** — exactly the reverse. A boolean has to write one of those two truths
down as the other, and whichever way it is set the card is wrong for half the people reading
it.

So every claim carries `regionId`, `region`, `status`, `taxon`, `source` and `verification`,
and `invasive-status.test.ts` fails if a bare boolean, an `isInvasive`, or a region-free field
appears.

## Native, introduced and invasive are three facts

Most of this deck arrived with European settlement: dandelion, broadleaf plantain, chickweed,
lamb's quarters, red clover, purslane, shepherd's purse, purple dead nettle, ground ivy,
chicory, burdock, mullein. **Every one is introduced. Not one is on Georgia's invasive list.**

Labelling them invasive because they are not native would put a marker on nine tenths of the
deck while saying nothing true, and would spend the badge's credibility on the cards where it
means least.

There is also a reason so little of a forager's deck is listed, and it is not an oversight in
the sources: **Georgia's list deliberately excludes plants that are only a problem in
agricultural and pastoral systems.** The list is about natural areas. A plant can be a serious
nuisance in a pasture and correctly absent from it.

## The threshold, and why Category 3 does not clear it

GA-EPPC — now continuing as the Georgia Invasive Species Council — publishes categories, and
the badge is built on their own definitions:

| | Definition | Badge? |
| --- | --- | --- |
| **Category 1** | A serious exotic plant problem in Georgia natural areas, extensively invading native plant communities and displacing native species | **Yes** |
| **Category 1 Alert** | Not yet a serious problem in Georgia, but significant potential to become one | No |
| **Category 2** | A moderate problem, invading and displacing, to a lesser degree than Category 1 | **Yes** |
| **Category 3** | A **minor** problem in Georgia natural areas, **or not yet known to be a problem in Georgia** but known to be a problem in adjacent states | No |
| **Category 4** | Naturalized but generally not a problem in Georgia natural areas | No |

Only 1 and 2 assert that the plant is actually invading Georgia. **Category 3 explicitly
covers plants that are not known to be a problem here**, and Category 4 says they are not — so
a badge reading "invasive in Georgia" on either would say something the source does not.

---

## What the audit found

54 cards examined: 45 printed plus 9 Field Cards. **One qualifies.**

### Badged

| Card | Scientific name | Region | Listing | Source |
| --- | --- | --- | --- | --- |
| #40 Honeysuckle | *Lonicera japonica* | Georgia | Category 1 — a serious exotic plant problem in Georgia natural areas | [GA-EPPC / Georgia Invasive Species Council invasive plant list](https://gainvasivespeciescouncil.org/list/) |

Exact wording shown in the UI:

> **INVASIVE — GEORGIA**  ·  Category 1 — a serious exotic plant problem in Georgia natural areas
>
> This species is considered invasive in Georgia. Harvest responsibly where legal, and avoid
> spreading seeds, roots, fruit, or other reproductive material.
>
> Climbs and smothers saplings and shrubs, and spreads from both runners and bird-carried fruit.
>
> Listed as *Lonicera japonica* by GA-EPPC / Georgia Invasive Species Council invasive plant list.

It says **"is considered invasive"** rather than "is invasive": the badge reports a listing by
a named authority, it does not make its own determination. It says **"where legal"** rather
than stating the law, because legality varies by land and site and is not ours to assert —
the same reason `/safety` says foraging rules vary rather than summarising them.

### Recorded and deliberately NOT badged

Kept in the data with the reason attached, so the next reader finds a decision rather than an
absence.

| Card | Listed taxon | Why no badge |
| --- | --- | --- |
| #37 Wild Rose | *Rosa multiflora* | **Genus card.** `Rosa spp.` covers roses native to Georgia. Badging the card would tell somebody holding a native rose that their plant is an invader. (Published copies of the list also disagree between Category 1 and 2, so no category number is printed.) |
| #42 Mulberry | *Morus alba* | **Category 3**, which does not assert invasion in Georgia — and the card covers the native *Morus rubra* as well. Recorded as `introduced`. |
| #07 Garlic Mustard | *Alliaria petiolata* | **Category 3.** A serious invader further north; Georgia lists it at the category meaning "not yet known to be a problem here". Recorded as `introduced`. |
| #29 Field Garlic | *Allium vineale* | **Category 3.** Recorded as `introduced`. |

Note that #07 and #29 have `appliesToCard: true` and still render nothing, because their
status is not `invasive`. The two conditions are independent on purpose.

### Not found on Georgia's lists

Checked and absent: chicory, burdock, mullein, St John's wort, ground ivy. The remaining
cards — natives (*Solidago canadensis*, *Ambrosia artemisiifolia*, *Monarda fistulosa*,
*Passiflora incarnata*, *Viola sororia*, *Fragaria virginiana*, *Geranium maculatum*,
*Impatiens capensis*, all nine Field Cards) and the other introduced weeds — produced no hit.

---

## Evidence grade, stated plainly

**Every entry is `verification: 'search-attested'`, not `'primary-source'.**

The sandbox this work was done in cannot reach `gainvasivespeciescouncil.org`,
`se-eppc.org`, `invasive.org`, `bugwoodcloud.org`, `georgiawildlife.com` or `fs.usda.gov` —
the egress proxy refuses all of them. So the listing documents were established through a
search engine's summaries **with the primary documents' URLs recorded but not fetched**.

That matters, and one finding shows exactly how much: **two searches disagreed about whether
*Rosa multiflora* is Category 1 or Category 2.** Both cannot be right, and the disagreement is
why no category number is printed for that entry and why `verification` is a per-claim field
rather than a note at the top of the file.

`scripts/ga_invasive_audit.py` and `.github/workflows/ga-invasive-audit.yml` close this. The
script fetches the primary lists from a runner, where egress is open, and cross-references
**every** catalogue name — expanding genus cards, since `Rosa spp.` has to be checked against
every *Rosa* on the list. Its output is evidence for a human to read, not data: nothing in it
reaches the UI, so a PDF layout change cannot put a badge on a plant.

**It has not been run.** `workflow_dispatch` resolves a workflow only if the file is on the
default branch, and on this repository pushing to the default branch *is* a production
deployment. So running it is a decision about deploying, not a research step.

---

## What this did not touch

No taxonomy, no card scopes, no identification matching, no unlock basis, no XP, no
progression, no card content, no photo requirements, no provider behaviour. `invasive-status.ts`
imports none of `plant-match`, `card-coverage`, `herbdex-reducer`, `progression`, `mastery` or
`seed-shelf`, and a test enforces that. It is also kept out of `PURE_MODULES`, so it never
reaches the edge functions: a regional badge is presentation and has no business on the server.
