# Preview pipeline: installation record and central-history integration

## Where things are

| what | location |
|---|---|
| package scripts, rules, guides (as supplied, byte-identical; digests in `FILE_SHA256.json`) | `tools/preview-pipeline/` |
| source-only #62 example workspace (S00 only; nothing beyond Stage 00 is edited or approved) | `artwork/preview-pipeline/EXAMPLE_62_SOURCE_ONLY/` |
| central-history adapter and its tests (new, written here) | `tools/preview-pipeline/preview_to_central.py`, `test_preview_to_central.py` |

Nothing existing was changed: no production artwork, no template, no card record, no central history entry. Dependencies: Pillow and NumPy (already present).

## Test results

- `test_preview_pipeline.py`: PASS (supplied).
- `preview_pipeline.py verify` on the example: PASS; `status`: S00 only, nothing owner-approved.
- `plantdex_history.py --help` runs.
- `test_preview_to_central.py`: 22 checks pass (synthetic fixtures only; the simulated "owner approval" in the tests approves nothing real).

## The adapter

`register` is append-only and dry-run unless `--apply` is given. It refuses unless ALL hold: the preview workspace verifies; an `owner` approval of an S07 card exists and its checksum still matches; S01, S03, S04, S05 and S06 each have a passing review for their current bytes; the preview's locked back template and gradient are byte-identical to the central ones; and `--license-manifest` shows the source photo is CC0, taxon-verified, and that the manifest's checksum equals the S00 bytes (or `--allow-unverified-license` is passed, and the record says so).
It registers S00 -> `source`, S02 -> `cutout`, S03 -> `refined`, S04 and S05 -> `render_layer`, S06 -> `gradient_overlay` through the central `add_asset` unchanged, writes `cards/NNN/preview/preview_provenance.json` (append-only), pins nothing and approves nothing in the central history. `verify` re-checks hashes and that the central overlay on the central back reproduces the owner-approved S07 pixel for pixel; `compose-back` produces that back.

## Integration problems found (all handled without editing either program)

1. **The central assembler cannot rebuild an approved preview.** `plantdex_history.py assemble` places a preview bottom-anchored in a fixed rectangle with the gradient squeezed into it; the preview pipeline centres the plant in the oval and maps the gradient over the whole card. On the synthetic fixture 4,506 visible pixels differ. The approved S06 overlay is therefore registered as `gradient_overlay` and `compose-back` is the sanctioned reproduction; `assemble` must not be used for an approved preview.
2. **The opaque S01 crop cannot enter the central history** (it requires alpha on every non-source preview asset). S01 stays in the preview workspace; its hash and crop box are in the sidecar and the central S02 takes the central S00 as its parent.
3. **The central history has no fields for reviews, owner approval or licence provenance**, and `pin approved` accepts only cutouts, refined cutouts and icons. Those facts live in the sidecar and the central records are untouched.
4. **The example's licence is recorded as "CC0 per supplied manifest; independently unverified".** The candidate-package manifest (`evidence/candidate-packages/manifests/`) is what `--license-manifest` expects.

## Rules kept

Gate order and reviews are unchanged; no image generation; nothing is registered without an owner approval; an agent review is never an owner approval; the adapter never marks anything approved in the central history.
