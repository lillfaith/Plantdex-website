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

## What the primary audit found

`.github/workflows/ga-invasive-audit.yml` fetched GISC's current list from a runner and
cross-referenced all 54 cards mechanically. **It did not confirm the search-attested draft; it
corrected it in four places.**

### The method had to be fixed twice before it could be trusted

Worth recording, because both failures produced confident wrong answers rather than errors.

1. **Proximity.** The first run looked for a status token within 400 characters of a species
   and reported "none" for most of them — including for the one species being badged. These
   lists are **sectioned**: the GA-EPPC PDF carries five "Category 1" tokens across 10,638
   characters, one heading and then forty species beneath it.
2. **Sections.** Assigning the last heading before a species was right in principle and still
   wrong in practice, for two reasons. A **multi-column PDF extracts out of reading order**, so
   "the heading before" is whichever column fragment happened to come first — the 2006 list
   shows 13 headings for about 5 sections. And the **Georgia DNR strategy is a 318,000-character
   narrative with no sections at all**, which is how `Pinus species` acquired a Priority 1 from
   a sentence about a beetle's symbiotic fungus, and `Rumex acetosella` a Watch List from a line
   about seeds costing 200 per pound.

**So no category was derived from a PDF at all.** What survives both failures is a binomial
appearing in clean HTML on the authority's own page, and the page was printed verbatim and read.

### What GISC's current page actually publishes

It is tiered, and the tier headings do not survive as text — the page carries **no per-species
priority**. Only the first tier's definition is in the prose:

> Exotic plants that are a serious problem in Georgia natural areas by extensively invading
> native plant communities and displacing native species.

and a final section: **"Species of Concern — a species that is not yet found in [Georgia]"**.

GISC's list *index* does use RIPSA — Priority 1, Priority 2, Watchlist — but the plant list
itself does not apply those labels per species, and its own notes say the RIPSA migration is
incomplete. **This file therefore records the authority's sentence and never a number.** Writing
"Category 1" or "Priority 1" would translate between two vocabularies the authority is itself
mid-transition between, and assert a classification its current page does not print.

### The complete set of Plantdex taxa on the current primary list

| Card | Listed taxon | Tier | Badge? |
| --- | --- | --- | --- |
| **#40 Honeysuckle** | ***Lonicera japonica*** | **Top tier** — the one whose definition the page prints | **YES** |
| #37 Wild Rose | *Rosa multiflora* | Top tier | No — genus card |
| #37 Wild Rose | *Rosa laevigata* | Lower tier, undefined on the page | No — genus card |
| #42 Mulberry | *Morus alba* | Lower tier, undefined | No — genus card |
| #18 Blackberry | *Rubus armeniacus* | Lower tier, undefined | No — genus card |
| #18 Blackberry | *Rubus phoenicolasius* | Lower tier, undefined | No — genus card |
| #45 Oak | *Quercus acutissima* | Lower tier, undefined | No — genus card |
| #29 Field Garlic | *Allium vineale* | Lower tier, **undefined** | No — tier unreadable |
| #07 Garlic Mustard | *Alliaria petiolata* | **Species of Concern — not yet found in Georgia** | No — not present here |

**One badge: card #40, *Lonicera japonica*.** Its taxon is the listed taxon and it sits in the
tier the page defines as a serious problem extensively invading and displacing natives.

### Differences from the search-attested draft

| | Draft said | Primary list says |
| --- | --- | --- |
| *Lonicera japonica* | "Category 1" | **No category published.** Top tier, definition recorded verbatim. The number was never in any document. |
| *Alliaria petiolata* | "Category 3", recorded `introduced` | **"Species of Concern" — not yet found in Georgia.** Right outcome, wrong fact. Now `watchlist`. |
| *Rosa multiflora* | Category "1 or 2", disputed | **Top tier**, same as honeysuckle. The dispute was an artefact of summaries. |
| *Rubus armeniacus*, *Rubus phoenicolasius*, *Quercus acutissima*, *Rosa laevigata* | **absent** | On the list. The draft missed four taxa entirely. |
| *Morus alba* | "Category 3" | On the list; tier undefined on the page. |
| Evidence grade | `search-attested` | **`primary-source` throughout.** |

A fourth status, **`watchlist`**, was added because the audit found a concept the model had no
room for: a species the authority names and says is *not here*. Folding that into `introduced`
would assert a presence the source explicitly denies.

### What is still not knowable

The page prints no definition for its lower tiers, so for seven of the nine listed taxa the
authority's own severity claim cannot be read. For the genus cards that changes nothing — they
would be suppressed regardless. For *Allium vineale* it is the whole reason there is no badge:
the card's taxon matches and `appliesToCard` is true, and the badge is withheld because the
evidence is ambiguous, which is the rule working rather than an omission.

Absence from the list is also weaker evidence than presence: the fetched page is 9,520
characters and may be partial, so "not found" means "not found in what the page served", not
"the authority has ruled on it".

## What this did not touch

No taxonomy, no card scopes, no identification matching, no unlock basis, no XP, no
progression, no card content, no photo requirements, no provider behaviour. `invasive-status.ts`
imports none of `plant-match`, `card-coverage`, `herbdex-reducer`, `progression`, `mastery` or
`seed-shelf`, and a test enforces that. It is also kept out of `PURE_MODULES`, so it never
reaches the edge functions: a regional badge is presentation and has no business on the server.
