# Reviewing the printed 45

**Purpose: empty the printed-tier publication exemption so it can be deleted.**

Until a species is `eligible`, its printed card publishes only by naming an outstanding
review in `eligibility_review_gap`. That exemption is now capped by the database — numbers
1–47, unique within Collection 01, and unavailable to any future printed deck — but a
capped exemption is still an exemption. This checklist exists to make it empty.

**Nothing here is approved. This is triage, not a verdict.**

## The bar

Eligibility asks ONE question: **is this species documented as having been used
medicinally, by a traceable source that is about this species?**

It does *not* ask whether the use worked, whether the plant is safe, or whether the card's
individual Healing Traits are supported. Those are Layer C claim reviews, separately and
later. Historical or traditional use is sufficient (`medicinal_relevance_kind =
'historical-use'` or `'traditional-use'`).

## Per-card checklist

For each card, in order. Stop at the first failure and leave the species `pending`.

- [ ] **1. The accepted name resolves.** Run the name through GBIF
      (Actions → "Resolve taxa against GBIF"). If it is a synonym, the catalog row is the
      accepted name with the printed name recorded in `catalog_synonyms`.
- [ ] **2. The card is a species, not a genus.** Nine cards are `Genus spp.` — see below;
      they are not catalog species and cannot be reviewed here.
- [ ] **3. Open each source in `CARD_SOURCES[n].sourceIds`.** Not the abstract. The source.
- [ ] **4. Each source is about THIS species.** A paper about another *Solidago* does not
      support *S. canadensis*. If the only support is genus-level, set
      `eligibility_from_genus_record = true` and leave it `pending` — the database will
      refuse to make it eligible, which is correct.
- [ ] **5. At least one source documents MEDICINAL use** — traditional, historical or
      studied. Edibility alone is not medicinal relevance. Containing a compound is not
      medicinal relevance.
- [ ] **6. Write `eligibility_basis`:** one or two sentences saying what the sources
      actually say about this species. If you cannot write it, you have not established it.
- [ ] **7. Choose `medicinal_relevance_kind`** — `historical-use`, `traditional-use` or
      `scientific-study`. Studied means studied, never proven.
- [ ] **8. Confirm each source id exists in `catalog_sources` with `verified = true`.** The
      trigger enforces this; confirming first saves a failed write.
- [ ] **9. Sign it:** `eligibility_reviewed_by`, `eligibility_reviewed_on`.
- [ ] **10. Clear the gap:** once eligible, set `eligibility_review_gap = null`.

## Triage — measured, not estimated

From `CARD_SOURCES` in `src/lib/card-sources.ts` cross-referenced against
`src/data/sources.json`. Every source counted below is already `verified: true`.

| Band | Cards | Sources each | What the eligibility review involves |
|---|---|---|---|
| **strong** | **20** | 3 verified | Confirmation. The sources exist, are verified and are species-level. Expect ~10 min each |
| **mixed** | **18** | 3 verified | Same mechanical work; the `auditNote` usually concerns *claim wording*, which is a Layer C problem and does not block eligibility. ~10–15 min each |
| **revise** | **4** | 3 verified | #04 Ragweed, #09 Wood Sorrel, #29 Field Garlic, #34 Jewelweed. Read the audit note first — a card flagged for revision may still be trivially *eligible* while its traits need fixing. ~20 min each |
| **hold** | **3** | **0** | #11 Purple Dead Nettle, #19 Sheep's Sorrel, #21 Chicory. **No sources at all.** These need new research before eligibility can be established |

**Estimated total: 7–9 hours**, of which the 3 `hold` cards are most of the risk — they need
a source found, read and added to `catalog_sources` as `verified`, which is 1–2 hours each
rather than ten minutes.

> **The grade is about card CONTENT, not about eligibility.** A `revise` card can be
> eligible — ragweed's medicinal use is documented — while its printed Healing Traits still
> need work. Do not read the bands as an eligibility prediction; read them as how much
> reading each card will take.

## The nine genus cards

`Acer spp.`, `Rubus spp.`, `Rhus spp.`, `Sambucus spp.`, `Rosa spp.`, `Salix spp.`,
`Pinus spp.`, `Morus spp.`, `Quercus spp.`

These have no binomial, are not catalog species, and **cannot be made eligible** — which is
the genus rule working, not a bug. They are published on the live site and unaffected by
any of this. Making them catalog-collectible needs a genus-level concept that does not exist
and should not be invented to clear a checklist.

## Done looks like

```sql
select count(*) from public.collectible_cards
 where published and eligibility_review_gap is not null;   -- 0
```

At zero, the exemption branch in `enforce_collectible_eligibility` can be deleted, along
with `eligibility_review_gap`, the range check and the partial unique index. That removal is
the real end of this task.
