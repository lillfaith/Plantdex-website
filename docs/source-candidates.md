# Candidate references — UNVERIFIED

**Nothing in this file is used by the site.** It is a research shortlist for a human to
check. Only entries in `src/data/sources.json` with `"verified": true` are ever rendered,
and moving something here into that file means someone has opened it and confirmed it
supports the specific claim it is attached to.

## Why these are unverified

They were found with a web search from an environment whose egress proxy blocks the
reference hosts themselves — `en.wikipedia.org`, `www.ncbi.nlm.nih.gov`,
`powo.science.kew.org` and `plants.usda.gov` all refuse both `curl` and page fetches. So
these titles and URLs come from search-engine results that could not be opened and read.

That is exactly the situation the product brief warns about: *"Do NOT allow AI-generated
citations that have not been verified."* Publishing them as citations would be asserting
something unchecked, so they stay here until a human confirms them.

## How to verify one

1. Open the URL and confirm it resolves and is about the right species.
2. Confirm it actually supports the specific claim you want to attach it to — a
   phytochemistry review supports a compound list, not a "healing trait".
3. Record author/organisation, year, publication and the access date.
4. Add it to `src/data/sources.json` with `"verified": true`.
5. Attach it with a `SourceRef` on the herb's `sources`, or on `sectionSources` for a
   single section.

## What still needs sourcing

The cards carry six kinds of content. They need different kinds of reference, and should
not share one:

| Card content | Appropriate reference |
| --- | --- |
| Scientific name | A taxonomic authority (Kew POWO, USDA PLANTS) |
| Signature compounds | Phytochemistry literature for that species |
| Healing traits | Ethnobotanical literature, described as *traditional use* |
| Taste / aromatic profile | Ethnobotanical or culinary reference |
| Preparations, usable parts | Ethnobotanical reference |

A reference supporting traditional use must never be presented as evidence of efficacy.

---

## Shortlist

### Achillea millefolium — Yarrow (card #33)

- *Comparative Phytoprofiling of Achillea millefolium Morphotypes* — PMC11013869
  <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11013869/>
- *Ethnobotany and phytochemistry of yarrow, Achillea millefolium, Compositae* —
  Economic Botany <https://link.springer.com/article/10.1007/BF02858720>
- *Antioxidant, Anti-Inflammatory, and Antibacterial Properties of an Achillea
  millefolium L. Extract* — PMC9598488
  <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9598488/>

Relevant to the card's `Achilleine` and `Azulene` entries. Search summaries described
achilleine as an alkaloid and azulene/chamazulene as a sesquiterpene constituent, which is
consistent with the card — but that consistency has not been confirmed against the papers.

### Taraxacum officinale — Dandelion (card #01)

- *Dandelion (Taraxacum Genus): A Review of Chemical Constituents and Pharmacological
  Effects* — PMC10343869 <https://pmc.ncbi.nlm.nih.gov/articles/PMC10343869/>
- *Bioactive Compounds from Vegetal Organs of Taraxacum Species* — PMC11764760
  <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11764760/>
- *Taraxacum officinale and related species — an ethnopharmacological review*
  <https://www.sciencedirect.com/science/article/abs/pii/S0378874115002263>

Relevant to `Kaempferol`, `Taraxasterol`, `Quercetin`, `Inulin`, and to the card's
"Bitter" taste note.

### Urtica dioica — Stinging Nettle (card #08)

- *Stinging Nettle (Urtica dioica L.): Nutritional Composition, Bioactive Compounds, and
  Food Functional Properties* — PMC9413031
  <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9413031/>
- *Antioxidant Activity of Urtica dioica* — PMC9774934
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC9774934/>
- *Stinging Nettle (Urtica dioica) Roots: The Power Underground — A Review*
  <https://www.mdpi.com/2223-7747/14/2/279>

Relevant to `Chlorophyll`, `Histamine`, `Iron`, `Silica` and to the card's usable-parts
list (leaf, stem, root, shoot).

---

## Remaining 42 species

Not yet researched. The three above were done as a representative sample to establish the
pattern and prove the shortlist is worth keeping separate from the shipped registry. The
same treatment is needed for the rest before any of it can appear on the site.
