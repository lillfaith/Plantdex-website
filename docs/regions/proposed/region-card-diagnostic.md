# Consistency diagnostic: the owner's draft card regions against this map (**draft provisional, not evidence**)

Researched 2026-11-25. Per-card data: `v2/card-diagnostic.csv` (139 rows). Tool: `scripts/regions/card_diagnostic.py`. Nothing here touches card data or the 85-card integration.

**What this is.** The owner's per-card regions are "EDITORIAL ESTIMATES: not verified state-by-state" (`regionalModel.status`) and every expansion card is marked "Provisional ecology-based; confirm range
before quest release". For each of the 139 cards I sampled up to 900 GBIF human-observation points in the US (three pages of 300 from the first 9,000 records, seeded) and asked which v2 region each falls in.
GBIF is effort-biased (cities, parks, iNaturalist hot spots), includes cultivated and escaped plants, and the sample is not complete. **Agreement proves nothing about either the cards or the map;
disagreement does not show the map is wrong.** It is a way to find where the two descriptions of "the ten regions" differ.

## Results (138 cards with data; Capsella bursa pastoris returned none because the card's name lacks the hyphen of *bursa-pastoris*)
- Median share of a species' points that fall in a region the card lists: **94%** (mean 89%). At least 99%: 28 cards; at least 90%: 94; at least 80%: 113; at least 50%: 135.
  By set: original deck 93% (44), Field Cards 92% (9), expansion 95% (85). The two descriptions mostly agree.
- **Regions the points find that the card does not list (at least 5% of points): 66 of 138 cards.** Most often NF (22 cards) and PC (20), then GP (15), MW (6). Either the draft lists omit the
  northern and Pacific regions for widespread plants, or the points are cultivated or introduced records there. Not decidable from this data.
- **Regions a card lists with under 1% of points: most often GC (17 cards), GP (13), RM (11).** Listing is generous toward the Southeast coast and the plains; again not decidable.
- **The clearest signal for the owner's boundary question:** the prairie cards *Amorpha canescens* (#132, 74% of points in MW, listed GP only), *Dalea purpurea* (#133, 66% in MW, GP only), and the
  cards listing GP while the records sit in unit 47 (Western Corn Belt) and 40 (Central Irregular Plains). Those are the two `uncertain` units where I carried MW and the question is "prairie transition
  or central woodland?". If the owner's cards mean GP for tallgrass prairie, the map carries MW where the card says GP.
- Lowest agreement: #132 Amorpha canescens 18%, #133 Dalea purpurea 21%, #139 Smilax bona-nox 45% (listed SE, GC; 53% of points in GP, the Texas units), #18 Rubus spp. 55%, #138 Bacopa monnieri 57%.
  Genus cards (`spp.`) use the genus key, so they pool species and will always look wide.

## What it cannot say
Nothing here validates a unit's region, and the card regions were not derived from boundaries at all. It does not block integration of the 85 cards.
