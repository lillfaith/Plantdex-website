# Expansion Garden sprite set: specification (DRAFT for owner review)

Status: specification and tooling only. No sprite is drawn, redrawn, generated or altered by this work, and no sprite for #57-61 is treated as approved: the
owner has not approved any of the five draft sets. A sprite either **passes automated QA** or **fails** it; only the owner approves art, and nothing in this
document or in `scripts/expansion/check_sprite_set.py` can do that for them.

Everything below is derived from rules the repository already enforces or states (`CLAUDE.md` "Animated plant portraits", `scripts/build_sprites.py`,
`scripts/audit_sprites.py`, `scripts/sprite_sources/_face.py`, `src/lib/plant-sprites.ts`, `src/lib/plant-sprites.test.ts`). Where a number was not already a rule it is marked
**proposal** and was calibrated against the 54 shipped sprites (section 9). Rule ids `R01`-`R19` are the ids the checker prints.

## 1. Scope

An "expansion sprite set" is, per species, one adult portrait (the `flowering` stage) plus two derived stages (`sprout`, `growing`): three sheets, three stills, one manifest entry.
The pilot plan (`docs/expansion/pilot-plan.md` section 5) says digital-only cards are not in the Garden or the profile today, and a card with no sprite set has a defined
missing-sprite state (see `missing-sprite-state.md`). This spec is what a set must satisfy *if and when* the owner decides a card gets one.
The Boss Form (`BOSS_STAGE`) is a fourth, optional form with its own canvas and rules and is out of scope here.

## 2. The authored unit and what is generated

- One module per species at `scripts/sprite_sources/<genus>_<epithet>.py` exporting `SPRITE`. File name is the herb id with `_` for `-` (R02).
- Herb ids come from the scientific name, never the common name (`CLAUDE.md`). Pattern `genus-epithet`, lowercase ASCII (R02).
- `src/data/sprites.json` and `public/cards/animated/**` are **generated** by `python3 scripts/build_sprites.py` and are never hand-edited. This pilot commits neither.
- Required `SPRITE` keys: `herbId`, `size`, `frames`, `fps`, `personality`, `parts`, `motion`, `palette` (R01). Stages go in an optional `stages` mapping of recipes (`apply_stage`).
- Helpers (`_face`, `_stages`, `_flowerhead`) are the only allowed imports besides the standard library. A source may not read a clock, a random source, the network or the file system (R17),
  because a generated sheet must be reproducible byte-for-byte.

## 3. Canvas and sheet geometry (R03)

| Property | Value | Source |
|---|---|---|
| Authored canvas `size` | **(32, 28)** px, shared by all three stages of a species | 53 of 54 shipped species use it; one larger canvas (taraxacum 44x32) exists; `plant-sprites.test.ts` "shares one canvas with the adult" |
| Scale | 5x, nearest neighbour, no interpolation, no anti-aliasing | `SCALE` |
| Transparent gutter | 1 authored px each side of every frame | `FRAME_GUTTER` |
| Shipped frame | (32+2)x5 = **170** wide, 28x5 = **140** tall | manifest `frameWidth`/`frameHeight` |
| Sheet | one horizontal row, `170 x frames` by `140`, RGBA | `compile_sprite` |
| Still | frame 0 alone, 170x140 | `compile_sprite` |

A non-standard canvas is a **WARN** (it needs an owner reason); stages with a different canvas from their adult **FAIL**.

## 4. Frames, timing and the resting pose (R04, R07, R08)

- `frames` must be in `SUPPORTED_FRAME_COUNTS = (4, 6, 8, 10, 12, 14, 16, 18)`. `steps()` cannot read a CSS variable, so any other count slides instead of snapping. Re-read by the checker from `build_sprites.py`; mirrored in `plant-sprites.ts`.
- The loop must last **at most 3 s** (`frames / fps`, `plant-sprites.test.ts`), and `fps` is **at least 4** (`stage_fps` floor). Never a single-frame stage.
- A motion track whose length does not divide `frames` makes `render_frame` wrap with a seam (**WARN**).
- **Frame 0 is the resting pose** reduced motion freezes on, and the still. It must be a complete, dignified sprite that claims nothing untrue (an oak with its acorn still on the twig, never a mid-gesture stub). Automated: R07, R08. Judged by eye: whether it reads as dignified (section 10).
- **Frame 0 is one 8-connected piece, at every stage** (R08, `audit_sprites.pieces`). Detached elements during a gesture are allowed; at rest a plant is one plant.
- **Nothing at rest is clipped** (R07): `draw_part` silently drops pixels outside the canvas, so a part authored half off the edge builds cleanly and loses pixels. Frame-0 pixels dropped = **FAIL**; pixels leaving the canvas in later frames and ink touching the canvas edge are reported in the detail and are acceptable only for a deliberate flung element.

## 5. Three growth stages (R05, R06)

The stage names are the garden's own `GardenStage` (`sprout`, `growing`, `flowering`); `flowering` **is** the authored adult.

| Stage | Botany (`_stages.py`) | Height of the adult's ink | fps |
|---|---|---|---|
| sprout | vegetative only: leaves, **no flower structure of any kind** | 60% +/- 6 | `stage_fps(adult, 'sprout')` = 0.6x, min 4 |
| growing | in bud: the flower exists and is closed | 80% +/- 6 | 0.8x |
| flowering | open; the authored portrait | 100% | adult fps |

- Heights are measured from **ink in frame 0**, not from the canvas (`ink_height`); the builder exits if they miss the tolerance (`check_growth`). Heights must strictly increase and fps must strictly increase (`plant-sprites.test.ts`).
- A stage changes the organ, not just its size: a bud is a different organ from a flower and a seedling has no flower. Whether a stage draws the *right* organ is a botanical review item the checker cannot see (section 10).
- The face is not removable at any stage: the same character, younger.
- **Ground line (R06, proposal).** Stages share a canvas and a shared ground line in principle, but the test suite only pins heights, and 8 of 54 shipped species drift by more than one row between stages. So: every stage's lowest ink row within 1 of the adult's is PASS; more than 1 is a **WARN** the owner can judge, not a FAIL.

## 6. The face (R09)

- Every species wears the shared feature vocabulary from `_face.py` (`EYES`, `MOUTHS`, `feature_parts`): parts named `eyes`, `mouth` and (normally) `cheeks`. A sprite with no `eyes` or `mouth` **FAILs**.
- **Placement is measured from the assembled art, never inferred from parameters** (`face_box`, `on_face`, `seat_young`). The recurring bug is a feature drawn at an estimated origin.
- The automated test is `audit_sprites.audit`, imported rather than restated: every frame is rendered with only the parts drawn *before* each feature; `eyes` and `mouth` may not put a single pixel on anything but face, outline or blush; `cheeks` and `brows` ride the rim and are held to 60%. Run for the adult and for each stage (a stage reseats the whole face onto a different organ, which is where a feature lands in a leaf).
- Features paint in part order, so anything crossing the face is routed clear of it rather than reordered; the blush sits at `mouth_dy - 1`, so a mouth at row 3 draws it through the eyes. These are authoring rules; the audit is what catches their failures.
- A face patch narrower than the eye art it carries is caught by the same audit (pixels off the face).

## 7. Colour (R10, R11, R12)

- **Palette:** single-character keys, `(r, g, b, 255)` integer tuples (opaque; the build never blends), every character drawn must resolve to a colour (the adult's palette must carry its own; a stage is layered onto `FACE_PALETTE` plus its recipe palette). Undefined, malformed or semi-transparent entries **FAIL**; entries never drawn are reported.
- **The five face colours are shared and stay shared** (`FACE_PALETTE`: `o` outline, `F` face, `E` eye, `W` glint, `c` cheek). A species may author its own face or eye shade only on purpose; any difference from `FACE_PALETTE` is a **WARN** that needs the source to say so. Repurposing a face character for something else (e.g. `W` as both a floret highlight and the eye glint) is also what this catches.
- **Hue ownership (R11).** Every species owns a hue and the deck spans yellow-green to blue-green. Checks, all **WARN** because the leaf/flower split is read from the `# leaf light` / `# ray mid` comments on `PALETTE` lines and is therefore a heuristic (SKIP when it cannot be read):
  - foliage hue at least **34 deg** from the species' own flower hue (`CLAUDE.md`);
  - no mid-lightness colour (HLS lightness 0.30-0.70) over saturation **0.85** (**proposal**, from "a pastel highlight at 0.85 is pleasant, the same number at half lightness is a neon sign");
  - foliage not indistinguishable from a shipped species (hue within 2 deg *and* saturation and lightness each within 0.05) (**proposal**; the deck was once 36 near-identical greens).
- **Avatar badge fit (R12).** `FRAME_FILL` (read from `plant-sprites.ts`, currently 0.74) is the largest share at which no shipped sheet loses a pixel to the 36px badge circle. The checker re-measures frame 0 of every stage in memory with `audit_sprites.badge_fit`'s own geometry; any clipped pixel **FAILs**. A sprite redrawn wider than the badge can hold must not ship.

## 8. Gesture and personality (R13-R16)

- **One named botanical gesture per species**, growing out of that plant's own botany or the printed card (the plantain springs back, the wood sorrel folds its leaflets over its face). Name it in capitals in the module docstring the way shipped sources do (`THE PINWHEEL:`, `THE TINGLE`, `trademark gesture is KNOCKING`) (R14, **WARN** if absent).
- **The plant must actually move, not just its face** (R14, **FAIL**): at least one non-face part has art variants or non-zero `dx`/`dy`/`lean`.
- **No medicinal implication** (R16). A gesture may show what a plant tastes, smells or does; it may never illustrate a medicinal effect, and never anybody else's wellbeing. The `personality` label is a hard test (**FAIL** on `heal|cure|treat|remed|medic|sooth|therap|detox|relief|pain`); medicinal vocabulary anywhere else in the source is a **WARN that lists the lines**, because shipped sources legitimately say "deliberately not the healing traits". A human reads those lines.
- **No two species share a gesture** (R13, R15). `personality` must be unique across the 54 shipped species and within the set (**FAIL** on a repeat; 54 of 54 shipped labels are distinct, so any repeat is a regression on the existing standard). A tool cannot read prose, so the machine proxy is the *choreography*: the per-part `art`/`dx`/`dy`/`lean` tracks of every non-face part. Identical choreography to another species **FAILs**; the same non-generic variant-name vocabulary **WARNs** for a human to confirm the gestures differ.
- A gesture illustrates only what the card and the plant support. No invented botany; safety lines in the source (`a portrait, never an identification aid`) are kept.

## 9. What the manifest must carry (R18, R19)

For the adult and for each of `sprout` and `growing` (entry shape of `PlantSpriteEntry`):

| Field | Rule |
|---|---|
| `herbId` | the stage id: `<id>` for the adult, `<id>-sprout`, `<id>-growing` |
| `src`, `still` | `/cards/animated/<id>.png`, `/cards/animated/still/<id>.png` |
| `version`, `stillVersion` | 8 hex chars, SHA-1 prefix of the file's actual bytes (cache busting) |
| `frameWidth` / `frameHeight` | `(w+2)*5` / `h*5` of the authored canvas (170 / 140 standard) |
| `frames`, `fps` | equal to the source stage |
| `personality` | equal to the source label |
| **`content`** | the **frame-0 ink box as fractions of the frame, measured from the assembled art, never from the part list**: `{left, top, right, bottom}` rounded to 4 dp. It is what lets the fixed-size avatar badge fit the plant instead of the sky above a seedling. Frame 0 only, because a gesture may fling a seed off the canvas |
| `stages` | `{sprout, growing}` entries as above (`boss` only if the owner wants it) |

When a manifest is supplied the checker recomputes `content` from the source and fails any mismatch beyond 1e-4, any absent required field, and any stage missing. When built PNGs are supplied it renders every sheet in memory and **FAILs on any pixel difference** (a stale build, the same bug `audit_sprites.stale` exists for) and on a `version` that is not the hash of the file.

## 10. Automated QA and what it cannot decide

| Id | Rule | FAIL | WARN / notes |
|---|---|---|---|
| R01 | module loads, required fields | missing field, import error | |
| R02 | id pattern, filename, new | bad pattern, mismatch, id already shipped | |
| R03 | canvas | stage canvas differs | non-standard canvas |
| R04 | frames/timing | unsupported count, loop > 3 s, fps < 4 | track length not dividing frames |
| R05 | stages | missing stage, build refusal (heights, fps order) | |
| R06 | ground line | | > 1 row from the adult |
| R07 | ink in canvas | frame-0 pixels dropped | later-frame clipping, edge contact (in detail) |
| R08 | frame 0 connected | > 1 piece, empty | |
| R09 | face | no eyes/mouth, feature pixels off the face (every frame, every stage) | |
| R10 | palette | undefined/malformed/non-opaque colour | face colours differ from `FACE_PALETTE` |
| R11 | hue ownership | | gap < 34 deg, neon mid colour, same green; SKIP if roles unreadable |
| R12 | badge | any clipped pixel | |
| R13 | label unique | repeat or empty | |
| R14 | gesture | only the face animates | gesture not named in capitals |
| R15 | gesture shared | identical choreography | same variant vocabulary |
| R16 | no medicinal wording | label contains a medicinal term | medicinal vocabulary in source (lines listed) |
| R17 | deterministic source | clock/random/network/fs import | non-helper import |
| R18 | manifest vs art | mismatch/absent | SKIP if no manifest |
| R19 | build vs source | any differing pixel, bad hash | SKIP if no build |

**Not automated, and required before the owner is asked to approve anything:**
1. Botanical accuracy of each stage's organ (no flower on a sprout; the bud really is a bud; leaf arrangement, e.g. opposite/perfoliate/whorled, matches the species).
2. Whether the species is distinguishable from its lookalikes at thumbnail size (Boneset vs Joe-Pye weed, Black-eyed Susan vs the deck's coneflower) and from every other sprite beside it in the Garden.
3. Whether frame 0 reads as a dignified resting pose, and whether the gesture is legible and charming rather than merely different.
4. Whether the named gesture is truly drawn from the card or the plant, and whether any line of source medicinal vocabulary is a claim.
5. Hue judgement where R11 is SKIP or WARN.

## 11. Calibration (how the thresholds were chosen)

The checker was run over the 54 shipped sprites (`--control`, each compared with the other 53) to find rules that would flag the existing deck for things it is allowed to do. Result:
**19 PASS, 31 WARN, 4 FAIL**, and every FAIL is a real fault in a shipped sprite, not a calibration artefact: R07 for `arctium-lappa` (sprout drops 1 px at rest), `capsella-bursa-pastoris` (adult drops 10 px at rest), `lamium-purpureum` and `urtica-dioica` (growing drops 2 px). Those are noted and **not** touched by this work.
Per-rule counts on the shipped deck: R01-R05, R08, R09, R12, R13, R17 all 54 PASS; R06 46 PASS / 8 WARN; R10 46 PASS / 8 WARN; R11 27 PASS / 6 WARN / 21 SKIP; R14 47 / 7 WARN; R15 48 / 6 WARN; R16 40 / 14 WARN (negated mentions of "healing"); R03 one WARN (taraxacum canvas).
Changes made because of calibration: ground line downgraded from FAIL to WARN; generic variant names (`left`, `right`, `up`, `wide`...) excluded from the gesture vocabulary; 7px faces not warned about; edge contact not warned about; boss form excluded.
`scripts/expansion/test_check_sprite_set.py` additionally breaks one shipped sprite in 14 specific ways in memory and asserts the matching rule fails.

## 12. Running it

```bash
python3 scripts/expansion/check_sprite_set.py --control                       # calibration run on the shipped 54
python3 scripts/expansion/check_sprite_set.py --sources DIR [--build-dir DIR] [--manifest FILE] [--out report.json]
python3 scripts/expansion/check_sprite_set.py --git-ref origin/<branch> --git-path expansion/sprites --out report.json
python3 scripts/expansion/test_check_sprite_set.py
```

It reads modules and renders in memory; it writes only `--out`. It never calls `compile_sprite`, so it cannot touch `public/` and is safe beside `npm test` (unlike `audit_sprites.py`, which rewrites every sheet). Exit code 1 if any card FAILs. It is a development tool and is not wired into `npm run verify`.
