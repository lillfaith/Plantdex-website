# Expansion cards: draft import and artwork workflow

Status: **imported as hidden drafts. Nothing is promoted, published or deployed.**

## What was imported

`npm run import:expansion` reads `expansion/source/` (kept byte-identical, hashes recorded) and writes
`src/data/expansion-cards.json`: 85 cards, #57-141. The count is 85, not 83: the corrected master declares it
and the importer refuses if the header, the QA file or the card numbers disagree.

| Source | Role |
|---|---|
| `PlantDex_85_All_Requested_Corrections.json` | **Canonical.** Every card field: names, rarity, XP, season, use icons, sun/water/heat, the six back fields, editorial and safety copy, regions, references |
| `PlantDex_85_All_Requested_Corrections.csv` and the `.xlsx` first tab | Cross-checks only. If either disagrees with the JSON on any imported field, the import refuses |
| `PlantDex_85_Claude_Safety_Correction_Handoff.md`, `..._QA.json` | The package's own instructions and claims (replace all older exports; do not merge by row position; no publishing without review) |
| `PlantDex_139_Three_Research_Links_Per_Plant.csv` + tracker `.xlsx` | Supplementary: attached as `researchLinks`, matched by scientific name. Search links are `isCitation: false` |

The earlier 86-card healing-traits spreadsheet was superseded by the master and removed from the repo.
Cards are matched across files by scientific name, never by row position.

## One mapping, and what stays unset

* The master says peak season "Fall"; the app's vocabulary is `autumn`. `front.season` carries `autumn` and
  `supplied.peakSeason` keeps the master's "Fall". The master's `heat` becomes the card's `temperature`.
* Rarity and XP are validated against the deck's own table (Common 100, Uncommon 175, Rare 300, Epic 500).
* **Every card's safety copy is marked "SHORT CARD COPY - final botanical/safety review pending".** It is kept in
  `review`, never in `Herb.warning`. 25 of the 85 carry only a generic "identify positively" line rather than a
  species-specific caution, and the master states that the caution wording is partly precautionary and unverified.
* **No artwork exists yet.** Each card resolves to one of three shared placeholders.

## Why the cards are hidden

They are not in `CATALOGUE`. Every live feature reads `CATALOGUE` or `PRINTED_CARDS`, so a card outside both is
invisible to the collection, scanner, quests, leaderboard, Seed Shelf, herb pages and progression. A test makes that
a rule: no live module or edge function may reference the data, and `public/` may hold no expansion artwork.

## Artwork, delivered in batches

```
expansion/assets/<id>/main.png    transparent main botanical image
expansion/assets/<id>/pixel.png   native 21-24px pixel icon, transparent
expansion/assets/<id>/tall.png    tall preview
expansion/assets/_placeholders/   one shared placeholder per kind
```

```bash
python3 scripts/expansion_assets.py import --from ~/Downloads/batch-1 --by YOURNAME --dry-run   # validate only
python3 scripts/expansion_assets.py import --from ~/Downloads/batch-1 --by YOURNAME
npm run check:expansion                       # what is still missing, per card
python3 scripts/expansion_assets.py check --json --strict   # machine-readable; non-zero until everything is complete
```

File names: `57_main.png`, `57_pixel.png`, `57_tall.png`, or `<id>_main.png`, or `57_<id>_tall_preview.png`, or a
folder `57/` or `<id>/` containing `main.png` etc. If a number and an id are both given they must agree. Unmatched
and rejected files are listed, never skipped, and a rejected file changes nothing. Importing a file for a kind that
already exists replaces it and moves the old one to `_history/`. No card record changes.

The check reports `complete` (could be drawn: front values, back text and all three artwork files present) separately
from `promotable`, which stays false while a card's own record says its safety review is pending. Validation checks
files, not botany: a valid file can still show a leaf the plant lacks. Generated artwork is recorded as an AI
derivative that needs botanical review. The `tall` dimensions are a placeholder the repository never defined.

## Promotion (not built)

A card becomes a real `Herb` only when it is complete, reviewed, and approved. That is a separate change adding it to
`DIGITAL_ONLY_ENTRIES` with an explicit `collectionId`. Checked today: no expansion species shares a genus with an
existing `spp.` card, so promotion would not change scanner matching. The numbering of the photo-production queue must
follow this file (it was built on the older 86-card numbering).
