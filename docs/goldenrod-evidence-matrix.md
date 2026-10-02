# Goldenrod — the evidence matrix

**Card #3**, anchor ***Solidago canadensis***. Present scope: genus-wide `pendingCuration`,
the last `UNCLASSIFIED` card. **Nothing here is implemented.**

The card's own claims, which every candidate is measured against:

| | |
| --- | --- |
| Traditional use | *Urinary support, Anti-inflam., Mild diuretic, Allergy support* |
| Compounds | *Quercetin, Flavonoids, Rutin, Saponins* |
| Usable parts | *Flower, Leaf, Stem* |
| Preparations | *Tea, Tincture, Infusion* |
| Printed warning | none |

**PlantNet confusion is not evidence and is not used below.** The internet benchmark is cited
once, at the end, only to state what the recommended scope would cost in coverage.

---

## Verdicts

| Candidate | Verdict |
| --- | --- |
| ***Solidago gigantea*** | **ACCEPT** |
| ***Solidago altissima*** | **INSUFFICIENT EVIDENCE** |
| ***Solidago virgaurea*** | **REJECT** |
| ***S. rugosa*, *S. juncea*, *S. caesia*** and other congeners | **REJECT** |

---

## ACCEPT — *Solidago gigantea* Aiton

**The decisive fact is pharmacopoeial, not morphological.** The European Pharmacopoeia
recognises a herbal drug, ***Solidaginis herba*** ("goldenrod herb"), and accepts
***Solidago canadensis* L. and *S. gigantea* Aiton as two EQUIVALENT species** for it. That is
an authority stating, for the exact indication this card prints, that the two are
interchangeable as the drug — which is precisely what `curatedEquivalent` is meant to record,
and it is a determination somebody else made and published rather than one inferred here.

| Criterion | Finding |
| --- | --- |
| **1 · Taxonomy** | **PASS.** GBIF: `Solidago gigantea` Aiton, **ACCEPTED**, distinct species, EXACT/98. Not a synonym of the anchor — so this is a genuine equivalence, not a renaming. |
| **2 · Traditional / medicinal use** | **PASS.** Named as an equivalent source of *Solidaginis herba*. The Commission E indication is irrigation for inflammatory disease of the lower urinary tract, urinary stones and renal gravel; ESCOP adds irrigation for inflammation and as adjunct in bacterial UTI. That maps directly onto the card's **Urinary support**, **Mild diuretic** and **Anti-inflam.** |
| **3 · Relevant plant part** | **PASS.** The pharmacopoeial drug is the dried **flowering aerial parts** — flower, leaf and stem, which is exactly the card's usable-parts list. |
| **4 · Phytochemistry** | **PASS.** Ph. Eur. uses **flavonoids as the quality marker** (expressed as hyperoside). Chlorogenic acid, **rutin**, hyperoside, quercitrin and isoquercitrin are reported in leaves and inflorescences of goldenrods; **quercetin**, rutin, kaempferol, phenolic acids, terpenoids and **saponins** in the *S. canadensis* profile. The card prints *Quercetin, Flavonoids, Rutin, Saponins* — all four are the marker class the pharmacopoeia standardises on. |
| **5 · Edibility** | **PASS, and the card claims little here.** No food use is printed beyond *Tea, Tincture, Infusion* — the drug's own preparations. Nothing contradicts them for *S. gigantea*. |
| **6 · Safety / contraindications** | **PASS, because they are the SAME.** The contraindications are genus-level and attach to the drug, not to a species: known **Asteraceae/Compositae allergy** (ragweed, daisies, chrysanthemum), and **oedema from impaired cardiac or renal function** — irrigation therapy drives water rather than salt excretion, so a fluid load is the issue. Avoid in pregnancy and breastfeeding. There is no contraindication for *S. gigantea* absent from *S. canadensis*; both carry the same one because they are one drug. |
| **7 · No misleading implication** | **PASS.** A reader who found *S. gigantea* and read this card would be reading the monograph that covers their plant. |

---

## INSUFFICIENT EVIDENCE — *Solidago altissima* L.

**Taxonomy passes and nothing else is established.** GBIF: ACCEPTED, distinct species,
EXACT/97 — so the gate is clear. But *S. altissima* is **not named in *Solidaginis herba***,
and the literature that routinely pairs it with *S. canadensis* is **invasion ecology and
allelopathy**, not therapeutics: the two are co-studied for naturalisation, with allelochemicals
(terpenes, flavonoids, polyacetylenes, *cis*-dehydromatricaria ester) characterised for that
purpose.

**Allelochemical similarity is not the card's claim.** The card prints quercetin, rutin and
saponins for a urinary indication; a shared growth-inhibitory ester says nothing about either.
No head-to-head measurement of the card's four compounds, and no traditional-use source naming
*S. altissima* for the card's indications, was found.

**This is not a rejection.** Nothing contradicts it, its taxonomic proximity to the anchor is
real, and North American treatments have at times placed it within *S. canadensis sensu lato*.
It is simply unproven against six of seven criteria — the same position as the other six
optional candidates, and it should wait in the same queue.

**What would settle it:** a pharmacopoeial or regulatory source naming *S. altissima* as a
source of goldenrod herb, or a comparative phytochemical study against *S. canadensis* covering
the card's markers.

---

## REJECT — *Solidago virgaurea* L.

**Rejected on the same authority that accepts *S. gigantea*, pointing the other way.** European
goldenrod is the source of a **separate herbal drug with its own monograph**, *Solidaginis
virgaureae herba*, deliberately distinct from *Solidaginis herba*. ESCOP's monograph covers
*S. virgaurea* specifically.

Accepting it would merge two drugs a pharmacopoeia keeps apart on purpose. That it is the
best-studied goldenrod in the European literature is exactly why it must be refused here: the
depth of evidence is for a *different* drug, and borrowing it is the error this architecture
exists to prevent.

## REJECT — *S. rugosa*, *S. juncea*, *S. caesia*, and the rest of the genus

All currently unlock the card **through the legacy genus override and nothing else**. None is
named in any goldenrod monograph. *S. rugosa* is subsect. ***Venosae*** and *S. juncea* subsect.
***Junceae*** — not even in the anchor's subsection — and *S. caesia* was the false unlock that
opened this whole investigation. No use evidence, no phytochemical case, no pharmacopoeial
standing.

---

## Recommended scope

```
anchor              Solidago canadensis
curatedEquivalent   Solidago gigantea        (Ph. Eur. Solidaginis herba, equivalent species)
```

Everything else in the genus becomes non-confirmable. Category **2 · Curated equivalent group** —
the first card to enter it.

## Wording implications

**1 · The equivalent-species notice fires.** Required for `curatedEquivalent` (`card-scope.md`
§6): a player who found *S. gigantea* is told the card's species is *S. canadensis* and that
these are different species. No transcription change — the card's binomial stays the anchor.

**2 · A pre-existing tension this audit surfaced, independent of scope.** The card prints
**"Allergy support"** as a healing trait, while goldenrod is **contraindicated in people
allergic to Asteraceae** — ragweed, daisies, chrysanthemum. Both statements are defensible
(goldenrod is traditionally used for allergic/catarrhal complaints, *and* it is an Asteraceae
that sensitised people must avoid), but side by side they read as a contradiction to anybody
who looks it up. **This is a card-content question, not a scope one**, and it would exist
unchanged if the scope never moved. Flagged, not acted on.

**3 · Nothing else changes.** No caution is required by the expansion itself: the
contraindication profile is identical because it is one drug.

## What the recommended scope costs in coverage

Stated last, deliberately, because **it is not evidence and did not enter any verdict above.**

On the three documented-observation conditions, PlantNet led with ***S. gigantea*** every time
(0.318 / 0.236 / 0.354), with *S. canadensis* second. Under the recommended scope that specimen
**still unlocks the card** — via the accepted equivalent rather than the legacy override.
*S. rugosa* and *S. juncea*, which appear third and fourth in those same lists, stop unlocking
it, which is the intended effect.

A provider answer of *S. altissima* would become `uncertain` and route to the Seed Shelf until
its evidence is settled. That is the real cost of the recommendation, and it is the honest
consequence of not having the evidence rather than a flaw in the scope.

---

### Sources

- [European Pharmacopoeia — *Solidaginis herba*: *S. canadensis* and *S. gigantea* as equivalent species](https://altmeyers.org/en/naturopathy/solidaginis-herba-143574)
- [*Solidaginis virgaureae herba* — the separate European goldenrod monograph](https://www.altmeyers.org/en/naturopathy/solidaginis-virgaureae-herba-143574)
- [EMA assessment report on *Solidago virgaurea* L., herba](https://www.ema.europa.eu/en/documents/herbal-report/assessment-report-solidago-virgaurea-l-herba_en.pdf)
- [*Solidago virgaurea* L.: ethnomedicinal uses, phytochemistry and pharmacology](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7761148/)
- [Assessment of phenolic compound accumulation in two widespread goldenrods](https://www.sciencedirect.com/science/article/abs/pii/S0926669014006219)
- [*Solidago canadensis* L. herb extract — phytochemical and pharmacological research](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12030483/)
- [Aquaretic activity of *Solidago canadensis*](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6706705/)
- [Allelopathy and allelochemicals of *S. canadensis* and *S. altissima*](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9738410/)
- [Goldenrod contraindications — Commission E indication, Asteraceae allergy, oedema](https://sbrmc.adam.com/content.aspx?productid=107&pid=33&gid=000251)
- GBIF backbone, resolved from CI via `scripts/resolve_taxa.py` — all four candidates ACCEPTED and distinct
