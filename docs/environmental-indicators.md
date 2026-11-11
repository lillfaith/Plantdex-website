# Water, sunlight and temperature indicators

The three indicator rows on a card front are counts out of five (`SLOT_N = 5`): droplets for
water, suns for light, thermometers for temperature. Dandelion #01 prints 2 / 3 / 5.

Chamomile's three rows are **empty and flagged**, and this file is the proposal for filling
them. No value is assigned here, because none has been retrieved.

## Why the existing pipeline cannot answer this

`scripts/retrieve_evidence.py` searches EuropePMC. That is a **biomedical** corpus, and the
41 sources it returned for *Matricaria chamomilla* contain nothing about how the plant grows.
Searching the retrieved passages for `full sun`, `drought`, `soil moist`, `well-drained`,
`rainfall`, `hardiness`, `frost` and `habitat` returns **zero usable hits**. The two that look
like hits are not:

* `temperature` matches a **supercritical-extraction parameter** ("pressure and temperature"),
  which is laboratory apparatus, not a growing requirement.
* `semi-arid` describes **where one study's sample was collected** in Algeria. Where a
  specimen was picked is not where the species requires to be.

So this is a missing source class, not a missing claim. Reading a cultivation value out of
this corpus would be inventing it.

## Proposed source, in order of preference

1. **Ellenberg indicator values** (Ellenberg et al., *Zeigerwerte von Pflanzen in
   Mitteleuropa*, 1991), via the **BiolFlor** database. This is the standard ecological
   indicator system for Central European flora and it carries exactly the three axes the deck
   draws: **L** (light, 1-9), **F** (moisture, 1-12) and **T** (temperature, 1-9). It is a
   measured, peer-reviewed, per-species system rather than a horticultural opinion.
2. **USDA PLANTS** characteristics, which publish `Moisture Use`, `Shade Tolerance` and
   `Temperature, Minimum (deg F)` per species. Useful as a cross-check and for North American
   species; coverage for introduced species is patchier.
3. **Kew Plants of the World Online** for habitat prose, as a tie-breaker only. Prose has to
   be read by a person before it becomes a number.

## Proposed mapping to the deck's five slots

Ellenberg scales are wider than five, so each is banded. The bands are equal-width over the
part of the scale that actually occurs, NOT over the nominal range, because no European
species scores 1 on light and banding over 1-9 would push everything into the middle:

| icons | light (Ellenberg L) | water (Ellenberg F) | temperature (Ellenberg T) |
|---|---|---|---|
| 1 | 1-3 deep shade | 1-2 very dry | 1-2 alpine / boreal |
| 2 | 4-5 shade | 3-4 dry | 3-4 cool |
| 3 | 6-7 half light | 5-6 fresh | 5-6 temperate |
| 4 | 8 light | 7-8 moist | 7-8 warm |
| 5 | 9 full light | 9-12 wet to aquatic | 9 Mediterranean |

An **indifferent** rating (Ellenberg `x`) is not a 3. It means the species does not respond to
that axis, which the deck has no icon for, so it stays **empty and flagged** rather than being
rendered as a middling score.

## What still has to happen

Retrieval. This sandbox is proxy-blocked from outbound hosts, so the fetch belongs in GitHub
Actions beside the existing evidence workflows, writing a `environment` block into
`evidence/retrieved/<species>.json` with the raw L/F/T values, the database queried and the
date. The banding above is then applied by code, so the card's three rows are derived from a
cited value rather than typed in by hand.

Until that exists, the rows stay empty. An empty row is a true statement about what Plantdex
knows; a middling three is not.
