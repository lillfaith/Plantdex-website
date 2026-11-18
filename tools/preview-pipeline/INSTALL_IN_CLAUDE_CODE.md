# PlantDex — Claude Code installation handoff (complete archive)

This archive **contains the actual scripts and example files**. A markdown handoff alone does not supply them. Attach the **ZIP** to the Claude Code session or copy/unzip it into your local PlantDex workspace; do not send only this Markdown file.

## Required components, all included

- `preview_pipeline.py` — preview-only CLI, version gates and exact mask / card assembly.
- `test_preview_pipeline.py` — synthetic regression tests.
- `PREVIEW_PRODUCTION_RULES.json` — role/stage guardrails.
- `README_FIRST.md` — complete user guide, stages and commands.
- `EXAMPLE_62_SOURCE_ONLY/` — source-only #62 example (locked original source image, original card back and exact gradient).
- `plantdex_history.py` — earlier central version-history CLI used by an adapter. **The adapter linking the two programs is NOT supplied as a finished integration.** Build and test one without editing historical records.

## First steps (from this extracted folder)

```bash
python3 -m pip install Pillow numpy
python3 test_preview_pipeline.py
python3 preview_pipeline.py verify --root EXAMPLE_62_SOURCE_ONLY
python3 preview_pipeline.py status --root EXAMPLE_62_SOURCE_ONLY
python3 plantdex_history.py --help
```

Expected: tests and example verification PASS. The example is **source-only**; do not treat its cutout or final card as approved or completed.

## Integration rules

1. Store this extracted folder in a persistent local workspace (or version-controlled code plus private backed-up assets). Do not rely on ChatGPT's transient `/mnt/data` path as a durable copy.
2. Review `PREVIEW_PRODUCTION_RULES.json`, `README_FIRST.md`, `CLAUDE_CODE_HANDOFF.md` before changes.
3. Preserve existing main/pixel histories. Implement a compatible adapter to register only approved preview assets into central history, with hashes and provenance. Do not replace old assets or mark them owner-approved without authorization.
4. Do **not** pass a full PlantDex card, base, or exact gradient into an image generator. An image editing tool may receive only a real photographed plant crop or its isolated cutout. Rotation, scale, pixelation, gradient masks and final assembly must use deterministic code.
5. Stage files are append-only; reject damaged botanical masks despite technical PASS. Record the inspected evidence and explicit owner approval separately.
6. `FILE_SHA256.json` lists content digests for audit; use it to check extracted files if needed.

## Note to Claude

Read the archive first, run tests, and report whether you can access all six requested components. Do not claim it is installed if you received only this text or can't actually open its files.
