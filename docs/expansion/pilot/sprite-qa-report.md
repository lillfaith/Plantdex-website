# Sprite QA report: the five draft expansion sets (#57-61)

Status: automated QA result only. **No sprite is approved by this report, and none is treated as approved.** The owner has not approved any of the five sets; the approval text that once existed
survives only in a commit message and was overwritten by later briefs. A card below either **passes automated QA** (no FAIL), **passes with WARNs** (a human must look) or **fails**.
Passing automated QA means "nothing the checker can measure is wrong"; it says nothing about whether the art is good, botanically right or wanted.

- Checker: `scripts/expansion/check_sprite_set.py`, rules defined in `docs/expansion/pilot/sprite-spec.md` (R01-R19).
- Input: `origin/claude/plantdex-v0-3-supabase-verify-iic8pz` at `26e9deafe5e50f9b70e8853ab83ac705ec5a7a4c`, `expansion/sprites/` (`src/*.py`, `_build/*.png`, `_build/manifest.json`), read with `git archive`; that branch was not modified and no image was committed.
- Command: `python3 scripts/expansion/check_sprite_set.py --git-ref origin/claude/plantdex-v0-3-supabase-verify-iic8pz --git-path expansion/sprites --out report.json`
- Compared against: the 54 shipped sprites (`src/data/sprites.json`, `scripts/sprite_sources/`); `FRAME_FILL` 0.74 read from `src/lib/plant-sprites.ts`.
- Nothing in `src/`, `public/`, `supabase/`, workflows, `next.config.ts` or any art was changed. The checker renders in memory and never ran `audit_sprites.py` (which rewrites sheets).
- The checker's own tests (`test_check_sprite_set.py`, 15 tests: one clean baseline, 14 deliberate breakages) pass. On the shipped deck it reports 19 PASS / 31 WARN / 4 FAIL (the four are existing R07 faults in `arctium-lappa`, `capsella-bursa-pastoris`, `lamium-purpureum`, `urtica-dioica`); see spec section 11.

## Verdict per card

| Card (species file) | Result | FAIL | WARN / SKIP |
|---|---|---|---|
| Boneset, *Eupatorium perfoliatum* (#57) | passes with WARN | none | R16 |
| Black-Eyed Susan, *Rudbeckia hirta* (#60) | passes with WARN | none | R11, R16 |
| *Ceanothus americanus* | passes automated QA | none | R11 SKIP (hue roles not readable) |
| *Eutrochium fistulosum* | passes with WARN | none | R06, R10, R11, R16 |
| *Pycnanthemum tenuifolium* | passes with WARN | none | R06, R11 SKIP, R15 |

No card fails. The card numbers for the other three are not stated in the sprite branch and are not assumed here (the pilot plan fixes only #57 and #60).

## Matrix (rule x card)

| Rule | Ceanothus | Boneset | Joe-Pye (Eutrochium) | Mountain mint | Black-eyed Susan |
|---|---|---|---|---|---|
| R01 module / fields | PASS | PASS | PASS | PASS | PASS |
| R02 id, filename, new | PASS | PASS | PASS | PASS | PASS |
| R03 canvas 32x28, shared | PASS | PASS | PASS | PASS | PASS |
| R04 frames, loop, fps | PASS | PASS | PASS | PASS | PASS |
| R05 three stages, 60/80% | PASS | PASS | PASS | PASS | PASS |
| R06 ground line | PASS | PASS | **WARN** | **WARN** | PASS |
| R07 nothing clipped at rest | PASS | PASS | PASS | PASS | PASS |
| R08 frame 0 connected | PASS | PASS | PASS | PASS | PASS |
| R09 face on face, all frames | PASS | PASS | PASS | PASS | PASS |
| R10 palette, face colours | PASS | PASS | **WARN** | PASS | PASS |
| R11 hue ownership | SKIP | PASS | **WARN** | SKIP | **WARN** |
| R12 badge fit | PASS | PASS | PASS | PASS | PASS |
| R13 unique personality | PASS | PASS | PASS | PASS | PASS |
| R14 gesture named, plant moves | PASS | PASS | PASS | PASS | PASS |
| R15 not a shared gesture | PASS | PASS | PASS | **WARN** | PASS |
| R16 no medicinal wording | PASS | **WARN** | **WARN** | PASS | **WARN** |
| R17 deterministic source | PASS | PASS | PASS | PASS | PASS |
| R18 manifest matches art | PASS | PASS | PASS | PASS | PASS |
| R19 build matches source | PASS | PASS | PASS | PASS | PASS |

All 19 rules ran for every card (R18 and R19 had a manifest and the built PNGs). Both rules checked every stage: the adult, `sprout` and `growing`.

## What was measured (all five)

- Canvas 32x28 on every stage, shipped frame 170x140, frames 14 / 8 / 10 for adult / sprout / growing (all in `SUPPORTED_FRAME_COUNTS`), adult loop 14 / 8 = 1.75 s (Rudbeckia 14 / 7 = 2.0 s).
- Stage heights (share of the adult's ink): Ceanothus 0.60 / 0.76, Boneset 0.615 / 0.769, Joe-Pye 0.60 / 0.80, Mountain mint 0.625 / 0.833, Black-eyed Susan 0.60 / 0.80. All inside 60% +/- 6 and 80% +/- 6 (Ceanothus's growing stage, 0.76, and Mountain mint's, 0.833, are within 0.03 of the limits).
- fps by stage sprout / growing / adult: 5/6/8 for four cards, **4/6/7** for Black-eyed Susan (its sprout sits on the floor of 4).
- Frame 0 is one connected piece at all three stages of all five. Features sit on the face in every frame of every stage. Face patches 7x6 to 11x4 px.
- The in-memory re-render of every sheet is pixel-identical to the supplied PNG (no stale build) and the manifest `content` boxes equal the re-measured frame-0 ink boxes.
- No frame-0 pixel is dropped off the canvas, and the avatar badge would crop nothing at `FRAME_FILL` 0.74, for all 15 sheets.
- Personality labels `jaunty`, `clasping`, `echoing`, `prickly`, `bristly` are unique across the 54 shipped labels and each other. Named gestures: THE RIPPLE, THE CLASP, KNOCKING, THE BRISTLE, THE PINWHEEL; every one moves a non-face part.

## WARNs and SKIPs, each with the evidence

- **R06 ground line (Joe-Pye, Mountain mint).** Joe-Pye's sprout and growing stages end 2 rows from the adult's lowest ink; Mountain mint's growing stage ends 2 rows off. The spec makes this a WARN, not a FAIL, because 8 of 54 shipped species do the same and only heights are pinned by `plant-sprites.test.ts`. Owner call: it shows as a plant sitting higher or lower in the Garden tile between stages.
- **R10 face colours (Joe-Pye).** The palette overrides `F` (a cool pale green face), `W` and `c`. The source comments `F` as "a cool pale green" but does not say it is a deliberate departure, and uses `W` for **both** the pink floret highlight and the eye glint, so the eye glint is no longer white. This departs from the shared five face colours that make 54 plants read as one deck. Owner call whether the departure is intended.
- **R11 hue (Joe-Pye, Black-eyed Susan; SKIP for Ceanothus and Mountain mint).**
  Joe-Pye's foliage (hue 153) is within 1.9 deg of shipped *Prunella vulgaris* on hue and within 0.03 on saturation (0.42 vs 0.44) and 0.04 on lightness (0.49 vs 0.45): the same green the deck was once rebuilt to avoid; the flower gap is 163 deg and fine.
  Black-eyed Susan has a mid-lightness colour (`r`, the ray mid) over saturation 0.85, which the spec flags as risking a neon read (**proposal** threshold); its foliage (114) sits 0.2 deg from shipped *Achillea millefolium* but is far less saturated (0.38 vs 0.62), so it is not flagged as a twin.
  Boneset passes (leaf 89, flower 48, gap 40 deg, above the 34 deg floor, though only 6 deg above it) and its foliage is 0.5 deg from shipped *Hamamelis* but differs in saturation (0.51 vs 0.33), so it is not flagged as a twin.
  Ceanothus and Mountain mint: the leaf and flower colours cannot be identified from the palette comments, so the 34 deg floor was **not measured**; look at these two by eye.
- **R15 gesture (Mountain mint).** Its only gesture variant (`out`) is also the vocabulary of shipped *Galium aparine* and *Monarda fistulosa*. Choreography is not identical (that would FAIL), so this is a request for a human to confirm the three gestures read differently, not a finding that they match. Separately worth an eye: Black-eyed Susan declares it is the deck's coneflower anatomy again (ray ring with a raised disc, "drawn as the flower-head generator run twice") but deliberately not the same creature; automated QA found its choreography and label distinct.
- **R16 medicinal wording (Boneset, Joe-Pye, Black-eyed Susan).** Hits are all negations in the source ("Nothing here illustrates a medicinal effect or a use"; "DELIBERATELY NOT THE HEALING TRAITS"), the same shape as the shipped Self-heal and Silybum sources. They are WARNs so a person reads the lines: Boneset L12, Joe-Pye L11, Black-eyed Susan L12-13 and L341-343. No personality label contains a medicinal term (that would FAIL).

## What this report cannot tell you

- **Whether the art is right.** Not checked: the sprout is a sprout with no flower and the bud is a bud (spec section 10, item 1); that Boneset's perfoliate leaves and Joe-Pye's whorled leaves are drawn as such; that the pair of near-lookalikes and the deck's coneflower are told apart at 1x; that frame 0 reads as a dignified pose; that any gesture is legible.
- **Whether the cards may ship.** Boneset's card is HELD in the pilot plan pending safety review. A sprite set that passes automated QA does not change that, and a sprite is not a reason to release a held card.
- **Whether these cards should have Garden sprites at all.** The pilot plan keeps digital-only cards out of the Garden and the profile (section 5). The sets are checked here as drafts for that decision, not as a decision.
- **R11 on two cards** (see above) and **R06's tolerance**, which are judgement calls for the owner.

## Method notes

Rules R01-R19 and thresholds are in the spec; the 34 deg floor, 60/80% heights, 3 s loop, fps floor 4, `SUPPORTED_FRAME_COUNTS` and `FRAME_FILL` are existing repository rules re-read from source; the 0.85 saturation cap, the 2 deg / 0.05 / 0.05 "same green" test and the 1-row ground-line tolerance are **proposals** calibrated on the shipped deck. The full machine-readable result (`--out`) was produced for this run and is not committed.
