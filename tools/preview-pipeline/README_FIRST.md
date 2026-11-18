# PlantDex Preview-Only Version Gates v1.0

A **working local CLI + QA contract**, not an image generator. It enforces a photo-first, staged editing workflow for tall PlantDex card-back previews.

**The complete card and the exact gradient are NEVER image-generator inputs.** An external image editor (Adobe/Photoshop/manual/OpenCV) may receive only the source crop or isolated botanical cutout via `export-editor`. Everything involving rotation, placement, gradient application, and card assembly is handled by Pillow in deterministic code.

> **What this package includes**
>
> - `preview_pipeline.py` — runnable version manager, reviewer gates, exact masks/assembly and SHA validation
> - `PREVIEW_PRODUCTION_RULES.json` — machine-readable workflow guardrails
> - `test_preview_pipeline.py` — executable positive/negative tests using synthetic fixtures (NOT botanical content)
> - `EXAMPLE_62_SOURCE_ONLY` — real #62 California Buckwheat source photo, **untouched** original card back, exact gradient, and initial source-only history. Nothing beyond Stage 00 has been edited or approved.
> - `CLAUDE_CODE_HANDOFF.md` — integrate with Codex CLI/Claude Code without exposing card bases to generation
>
> Python 3.10+ recommended. Dependencies: `pip install Pillow numpy`.

## Two independent identifiers

- **Stage** tells you *what kind of artifact it is*: `S03_refined_cutout` is always a cleaned transparent cutout.
- **Revision** tells you *which saved candidate*: `S03_refined_cutout/v0002` is the second cleaned cutout, not the second card.

To choose a past revision, pass that precise ID as `--parent` in the next step. The old revision is read-only. Alternative branches can be created from the same prior stage. No old assets are deleted.

## The mandatory stage chain

| Stage | Filename pattern | How to produce it | Gate to proceed |
|---|---|---|---|
| **S00_source** | `S00_source/v0001/asset.jpeg` | Original real photo, no edits | SHA-256 integrity |
| **S01_crop** | `S01_crop/v0001/asset.png` | Crop photograph to an extractable flower+stem+leaves | Visual review: connected stem and usable composition |
| **S02_raw_cutout** | `S02_raw_cutout/v0001/asset.png` | Background removal performed on crop only | RGBA transparency technical check; failures are fixed in S03 |
| **S03_refined_cutout** | `S03_refined_cutout/v0001/asset.png` | Correct alpha mask or restrained plant-only cleanup | **Visual pass required:** no background, no damaged petals, connected stems, recognizable anatomy |
| **S04_upright** | `S04_upright/v0001/asset.png` | Deterministic slight rotation (max 15°) | Visual review: natural upright structure |
| **S05_positioned** | `S05_positioned/v0001/asset.png` | Proportional scale and center on **transparent 390×630 layer** within original oval | Visual fit: no clipping or odd placement |
| **S06_gradient** | `S06_gradient/v0001/asset.png` | Real gradient RGB through positioned plant alpha, no image generation | Exact per-pixel RGB check + visual review |
| **S07_card** | `S07_card/v0001/asset.png` | Composite overlay on locked original back | 390×630, original base outside overlay unchanged; **owner approval** for production |

**Important:** A technical pass is not botanical approval. Especially at S03, the agent must genuinely inspect on light and dark backgrounds. A simple RGBA file can be technically valid while its petals or stems have been badly removed.

## First run: already seeded #62 example

After extracting this ZIP into a persistent folder:

```bash
python3 preview_pipeline.py status --root EXAMPLE_62_SOURCE_ONLY
python3 preview_pipeline.py verify --root EXAMPLE_62_SOURCE_ONLY
```

This example contains only the source version. It does **not** pretend to contain a successful background removal.

### 1. Crop the real original photo

Inspect the full photo first; determine four coordinates for the desired **connected flowering stem**, not just close-up flower heads.

```bash
python3 preview_pipeline.py crop --root EXAMPLE_62_SOURCE_ONLY \
  --parent S00_source/v0001 --box X0 Y0 X1 Y1 \
  --note 'Complete stem, foliage and flowers'
```

Use actual numeric coordinates. They are intentionally not guessed here.

### 2. Record a real visual review of the crop

```bash
python3 preview_pipeline.py review --root EXAMPLE_62_SOURCE_ONLY \
  --version S01_crop/v0001 --decision pass --reviewer agent \
  --checks composition-ok \
  --note 'Verified distinct flowers, full connected stem, enough vertical structure'
```

Agent review means the agent inspected it; it is not user/owner approval. Failed crops should receive a **fail** review, then create another S01 revision from S00.

### 3. Export ONLY the crop to Adobe/another editor

```bash
python3 preview_pipeline.py export-editor --root EXAMPLE_62_SOURCE_ONLY --version S01_crop/v0001
```

The output folder contains `isolated_photo_input.png` and `EDIT_JOB.json`. **Do not upload the back template or gradient to the editor as generative inputs.** The edited photo must be saved as an independent **RGBA transparent PNG**.

### 4. Register background removal, then improve the mask

```bash
python3 preview_pipeline.py import-cutout --root EXAMPLE_62_SOURCE_ONLY \
  --parent S01_crop/v0001 --stage S02_raw_cutout \
  --file /path/to/actual-photo-cutout.png --method adobe-background-removal

python3 preview_pipeline.py import-cutout --root EXAMPLE_62_SOURCE_ONLY \
  --parent S02_raw_cutout/v0001 --stage S03_refined_cutout \
  --file /path/to/actually-cleaned-cutout.png --method manual-mask \
  --note 'Removed residual scenery and preserved connecting stems'
```

Inspect the cleaned cutout over **white, black, and purple** backgrounds and compare it to the source. Require ALL visual criteria, not just that the file is transparent:

```bash
python3 preview_pipeline.py review --root EXAMPLE_62_SOURCE_ONLY \
  --version S03_refined_cutout/v0001 --decision pass --reviewer agent \
  --checks background-clear anatomy-intact stems-connected silhouette-readable \
  --note 'No scenery residue; important flowers and botanical connections retained'
```

If not clean, record `--decision fail` with a specific note, make a **new S03 revision from S02**, or return to an earlier crop. Do not advance a failed S03 to rotation.

### 5. Rotate, position, exact-mask, and assemble

```bash
python3 preview_pipeline.py rotate --root EXAMPLE_62_SOURCE_ONLY \
  --parent S03_refined_cutout/v0001 --degrees 8
python3 preview_pipeline.py review --root EXAMPLE_62_SOURCE_ONLY \
  --version S04_upright/v0001 --decision pass --reviewer agent \
  --checks orientation-ok --note 'Natural upright branching, no clipping'

python3 preview_pipeline.py place --root EXAMPLE_62_SOURCE_ONLY --parent S04_upright/v0001
python3 preview_pipeline.py review --root EXAMPLE_62_SOURCE_ONLY \
  --version S05_positioned/v0001 --decision pass --reviewer agent \
  --checks fits-oval --note 'Centered within original oval, readable and complete'

python3 preview_pipeline.py gradient --root EXAMPLE_62_SOURCE_ONLY --parent S05_positioned/v0001
python3 preview_pipeline.py review --root EXAMPLE_62_SOURCE_ONLY \
  --version S06_gradient/v0001 --decision pass --reviewer agent \
  --checks gradient-appearance-ok --note 'Silhouette remains clear and gradient colors accurate'

python3 preview_pipeline.py assemble --root EXAMPLE_62_SOURCE_ONLY --parent S06_gradient/v0001
python3 preview_pipeline.py verify --root EXAMPLE_62_SOURCE_ONLY
```

The result will be `history/S07_card/v0001/asset.png`. It remains **DRAFT** unless the owner explicitly approves it.

### 6. Owner approves only the final card

Only after the user says they approve the specific version:

```bash
python3 preview_pipeline.py approve --root EXAMPLE_62_SOURCE_ONLY \
  --version S07_card/v0001 --reviewer owner \
  --note 'Owner approved final preview placement and silhouette'
```

**Do not run this merely on the assumption that silence equals approval.**

## Recover, branch, undo

- If the flowers are damaged at S03, return to `S02_raw_cutout/v0001` and create another `S03_refined_cutout/v0002`.
- If S04's rotation feels wrong, return to the **approved S03 cutout** and make `S04_upright/v0002` with another angle.
- If the card looks wrong after masking, return to S05 (or S04) rather than generating the assembled card.
- If the user prefers an earlier result, reference its original stage/revision ID and create a new child from that. The earlier PNG stays untouched.

Every commit stores **stage, parent ID, SHA-256, timestamp, method, and notes**. A visual review is an explicit recorded event tied to the asset hash, not a silent assumption. Final owner approval is separate.

## Limitations and safeguards

1. This program **does not actually remove photographic backgrounds** or verify botanical species. Use Adobe/manual photo-editing for the alpha-mask stage and perform a real visual comparison. The final pixel checks cannot catch a flower missing from the source-derived silhouette.
2. No software can ensure that an external AI model didn't internally redraw a flower. Only submit isolated photographs to external editing, preserve original + before/after, and reject unnatural repairs.
3. A prohibited full-card input can still be supplied manually outside this script. The script prevents this via its **editor export workflow**, but the operator must use that workflow.
4. Exact gradient means deterministic sampling of the **original supplied file** resized from its 500×500 pixels to the 390×630 card pixel field using Pillow BILINEAR, not a newly generated approximate color ramp.
5. The original oval's geometry is approximated from the approved template as `(130,193,260,443)` and should be visually checked, not assumed to be an authoritative production contour.
6. The `EXAMPLE_62_SOURCE_ONLY` contains source photography with *license as supplied*, not a fresh independent commercial-use rights audit.
7. Keep the extracted project on durable storage and back it up. A sandbox archive or chat memory alone isn't a permanent synchronized version repository.

## Run the automated regression checks

```bash
python3 test_preview_pipeline.py
```

This exercises accepted steps, rejected transitions, branching, immutable originals, gradient sampling, template reproduction, no editor export of assembled card layers, and owner approval restrictions using synthetic fixtures. It does not claim any real plant cutout was visually approved.
