# Expansion cards: draft import and artwork workflow

Status: **imported as hidden drafts. Nothing is promoted, published or deployed.**

## What was imported

`npm run import:expansion` reads the three supplied files in `expansion/source/` (kept byte-identical, hashes
recorded) and writes `src/data/expansion-cards.json`: 85 cards, #57-141.

| Source | Used for |
|---|---|
| `PlantDex_139_Three_Research_Links_Per_Plant.csv` | which cards exist (Set = Expansion), card numbers, common names, research links |
| `PlantDex_139_Three_Links_Per_Plant_Source_Tracker.xlsx` | cross-check only: must agree with the CSV or the import refuses |
| `PlantDex_86_Healing_Traits_Reviewed_Safety_Updated.xlsx` | the six back fields (healing traits, compounds, taste, aromatic, preparations, usable parts) and the review/safety columns |

Cards are matched across files by scientific name, because the numbering moved when Blue Mistflower was removed.
The import refuses on: a duplicate of an existing card (id, scientific name or number), a CSV/tracker
disagreement, a blank back field, or text that does not round-trip. `--exclude "<scientific name>"` drops a card.

## What is deliberately not there

* **Front fields**: rarity, XP, season, use icons and the three stat bars are in no supplied file. They are `null`.
* **Artwork**: none yet. Each card resolves to one of three shared placeholders.
* **Research links** are stored with the supplier's classification. A "Research search" link has
  `isCitation: false`.

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

Validation checks files, not botany: a valid file can still show a leaf the plant lacks. Generated artwork is recorded as an
AI derivative that needs botanical review. The `tall` dimensions are a placeholder the repository never defined.

## Promotion (not built)

A card becomes a real `Herb` only when its front fields, three artwork files and reviews exist. That is a separate change
adding it to `DIGITAL_ONLY_ENTRIES` with an explicit `collectionId`. Checked today: no expansion species shares a genus with an
existing `spp.` card, so promotion would not change scanner matching. The numbering of the photo-production queue must follow this file.
