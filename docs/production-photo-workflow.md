# Production photo workflow (private tool)

A private development tool for the 85 expansion cards (#57-141). It collects and tracks; **ChatGPT still
does the visual selection and the image generation.** Nothing here edits a card, touches the
website, approves anything, or deploys. Code: `scripts/production/`. Tests:
`python3 scripts/production/test_production.py` (68 checks, offline).

## The list gate

`pd init` only accepts an object `{"approved": true, "count": 85, "species": [...]}` with exactly
85 distinct species. The older 86-card file is a bare list and is refused. The production list is
`evidence/production/species-85.json`, GENERATED from the corrected expansion master by
`scripts/production/list_from_master.py` (the same file the site-side import reads, so card numbers
cannot drift). The ledger `evidence/production/queue.json` is created from it. Blue Mistflower is gone,
so every card after the old #72 moved down one; photos are keyed by species, never by number.

## Stages (tracked independently per card)

`pending`, `photos_collected`, `photos_selected`, `image_generation_needed`, `assets_generated`,
`quality_review`, `approved`, `needs_revision`. Each is its own flag with a timestamp; `pd status`
shows the furthest one. Three assets per card (`main_image`, `pixel_icon`, `tall_preview`) each
keep their own versions, validation and review, so one can be regenerated without touching the others.

| rule | how it is enforced |
|---|---|
| nothing approves itself | only `pd approve --by NAME`, and only after a recorded botanical review of every asset's current version and a built comparison board |
| approved assets are never overwritten | imports are refused on an approved card; `regenerate --confirm-unapprove` withdraws approval first |
| approval is a snapshot | it records each asset's version; change one and the approval is voided |
| versions are append-only | a new import is `v2`; `v1` stays on disk |
| originals vs AI derivatives | `original_selected/` (CC0 photos) and `generated/<asset>/vN/` (AI derivatives, `botanical_review_required`) are separate folders with separate provenance |

## Daily use

```bash
python3 scripts/production/pd.py package-next            # picks the next 10 uncompleted species, writes the batch request
git add evidence/production/batches/ && git commit -m "batch request" && git push   # starts collection in Actions
# ...download the review ZIP, give it to ChatGPT, get back a filled selection-template.json...
python3 scripts/production/pd.py import-selection selection.json --originals plantdex-batch-NNN-originals.zip --by YOURNAME
# ...ChatGPT generates the artwork...
python3 scripts/production/pd.py import-assets 62 --main m.png --pixel p.png --tall t.png --by YOURNAME   # any subset
python3 scripts/production/pd.py format 62               # card-front preview + comparison board (not an approval)
python3 scripts/production/pd.py review 62 --asset main_image --verdict pass --by YOURNAME --note "checked against the plant"
python3 scripts/production/pd.py approve 62 --by YOURNAME
python3 scripts/production/pd.py regenerate 62 --asset pixel_icon --reason "unreadable" --by YOURNAME
python3 scripts/production/pd.py status
```

Collection needs `api.inaturalist.org`, which the development sandbox blocks, so it runs in
`.github/workflows/production-batch.yml` (or run `package-next --collect` on any machine with network).
An interrupted batch is resumed, not restarted: finished species are checkpointed and originals
already downloaded are not fetched again.

## The two ZIPs per batch

* `plantdex-batch-NNN-review.zip` - for ChatGPT: `README_FOR_CHATGPT.md`, `selection-template.json`,
  `manifest.json`, numbered contact sheets, and full-size review JPEGs (long edge 1600) named `<label>__<photo_id>.jpg`.
* `plantdex-batch-NNN-originals.zip` - the untouched originals, `licenses.csv`, `manifest.json`. Kept
  separate because ten species of originals is hundreds of MB, too large to hand to ChatGPT.

Collection never pads: fewer than 20 CC0 photographs gives a recorded `SHORTFALL`, not invented or
relaxed-licence candidates. Duplicates are removed by observation, by outing (same photographer/date/place),
by identical file, and by near-identical image (perceptual hash).

## Selection manifest

```json
{"batch": "002", "selections": [
  {"card": 62, "main_photo": "62-07", "pixel_source": "62-03", "tall_preview": "62-12", "notes": "..."}]}
```
Labels or photo ids. Ids must be candidates for that card. Changing an earlier choice needs `--revise`;
the old choice is kept in history and only the affected derivative is flagged.

## Validation (`evidence/production/spec.json`)

* **main image** - real alpha (not an opaque RGB file), >=10% transparent, transparent corners, subject at
  least 484px tall (the 593x484 art window; 968px+ recommended), and the existing placement code must accept it.
* **pixel icon** - PNG, 21-24px native on each side, transparent background and corners, binary alpha (no
  anti-aliasing), small palette, and a heuristic that rejects blurred photo downscales. It is a heuristic:
  the board also shows the icon enlarged with nearest-neighbour for a person to judge.
* **tall preview** - **UNCONFIRMED placeholder** (>=600x900, height/width >=1.3). The repository never defined it.
* Validation checks files, not botany. A valid file can still show a leaf the plant lacks; that is the review.

## Formatting

Uses the existing template (`docs/assets/cardbase.pdf`), placement (`place_rooted`, bottom-seated, centred on the
deck's measured centroid), 95% subject opacity and the deck's soft-edge convention. The frame and purple gradient
are untouched (tested pixel-for-pixel outside the art slots). The preview has no card fields.
