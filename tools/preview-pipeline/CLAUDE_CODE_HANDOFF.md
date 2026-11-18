# Handoff to Claude Code / Codex CLI — PlantDex preview version gates

Install alongside existing PlantDex image-production scripts. **Do not replace the existing main/pixel histories**; this is an additional, preview-only gate. Store one workspace per species or card; do not copy full-card mockups into the isolated-edit input workflow.

## Setup

1. Extract archive into durable private workspace, e.g. `artwork/preview-pipeline/` (or outside Git for large originals), and back it up.
2. Install Pillow and NumPy.
3. Run `python3 test_preview_pipeline.py`; require PASS.
4. Run `python3 preview_pipeline.py verify --root EXAMPLE_62_SOURCE_ONLY`; require PASS.
5. For each card create a separate `init` workspace with the **actual original source photo**, exact original 390×630 back template, and exact 500×500 source gradient. Verify source license separately.
6. Add a mandatory agent workflow step: read `PREVIEW_PRODUCTION_RULES.json` and `README_FIRST.md` before each batch.

## Source/preview failure handling

- Inspect the full source at original resolution. A good tall source must yield an extractable **flower + connected stem + foliage** composition. Photo orientation is not decisive; actual stem extent is.
- Maintain original sizes and RGB until alpha extraction; never use the gradient or card base as generative inputs.
- If `S03_refined_cutout` fails background, anatomy, or silhouette review, record FAIL. Either refine again from saved raw cutout or select another source; **no generation of geometric filler**.
- S04–S07 are pure deterministic Pillow transformations.
- All output versions are immutable and parent-linked, allowing retrieval of any earlier S01–S06 branch.
- Any final without an explicit owner approval stays `DRAFT`.

## Suggested agent sequence

`status -> inspect source -> crop -> review S01 -> export-editor -> run Adobe remove background -> import S02 -> manually refine -> import S03 -> visual gate -> rotate -> visual gate -> place -> visual gate -> mask -> visual gate -> assemble -> verify -> review with owner -> approve if explicitly granted`

**Important:** the CLI cannot programmatically determine if a stem is botanically connected or an extraction has faint background residue. The agent must inspect and write a factual review. Reject ambiguous cases instead of asserting a pass.

For the currently approved master version-history v1 (`plantdex_history.py`), use this preview-only system as a *validation companion* rather than copying assets over in place. Once a preview is owner-approved, register the approved transparent plant cutout and gradient-overlay versions into the central history with exact file hashes and the parent provenance from this workspace. Implement an adapter rather than altering or overwriting central history entries.
