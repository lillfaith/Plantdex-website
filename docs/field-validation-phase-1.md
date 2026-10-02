# Field validation, phase 1 — ten plants

The point of these ten is **not** to measure accuracy. It is to prove the collection protocol
and the ingest pipeline work, before anybody spends a weekend photographing fifty plants and
discovers the filenames cannot be parsed or the ground truth was recorded after reading the
answer.

Ten specimens is also exactly one day's signed-in quota: **10 x 3 conditions = 30 requests**,
against `USER_DAILY_LIMIT = 30`. No quota change, no new infrastructure, no Kindwise credits
(the photo-count question needs PlantNet only, so it runs on the ordinary account).

---

## The one rule that makes the data valid

**Write down what the plant is BEFORE you scan it, or before you look at any answer.**

Ground truth recorded after seeing the app's answer is not ground truth, it is agreement with
the answer, and it will report near-perfect accuracy every time. If you are not sure what a
plant is, write `unsure` — that is a legitimate and useful row. Guessing to fill a cell is the
one thing that silently ruins the set.

---

## The ten specimens

Chosen for **information value in late September**, and so that a non-botanist can be certain
of the ground truth. Each row is one individual physical plant. Where a species appears twice,
that is deliberate: the question is robustness across real plants, not taxonomic coverage.

| # | Specimen | Why this one |
| --- | --- | --- |
| 1 | **Common plantain** (*Plantago major*) | The control. Scored 0.877-0.945 in every pilot condition. If this fails, the pipeline is broken, not the model. Seed spikes are up now. |
| 2 | **Dandelion** (*Taraxacum officinale*) — individual A | The pilot's headline miss. PlantNet answered *T. mattmarkense* every time; plant.id answered at section rank and matched. |
| 3 | **Dandelion** (*Taraxacum officinale*) — individual B, a different plant | Same species, different plant. The whole reason for same-individual design: does the microspecies answer follow the species or the specimen? |
| 4 | **Broad-leaved or curly dock** (*Rumex obtusifolius* / *crispus*) | The species whose 0.616-to-0.303 score spread is why `outcomeFor` reads rank rather than an absolute score. Brown seed stalks now give an unambiguous fruit photo. Note which of the two you think it is — both are informative, for opposite reasons. |
| 5 | **Yarrow** (*Achillea millefolium*) | **The highest-stakes card in the deck** — the only one printing "Beware: this plant has a poisonous lookalike". A wrong answer here matters more than anywhere else. |
| 6 | **Goldenrod** (*Solidago* sp.) | The single `pendingCuration` card, in peak bloom right now. Genus-level ground truth is fine and honest here: *Solidago* is genuinely difficult and the card is deliberately genus-wide meanwhile. |
| 7 | **White clover** (*Trifolium repens*) | **A direct Capsella-shape test you can be certain about.** The deck carries *T. pratense* (red clover); white clover is a different species in the same genus, so the correct outcome is `relatedOnly` and NOT a confirmable red-clover card. White heads and pale leaf chevrons make this unmistakable. |
| 8 | **Any aster** (*Symphyotrichum* sp. or similar) | Blooming now, no card, no deck congener. The plain Seed Shelf outcome — the one a stranger scanning their own garden is most likely to meet. Genus- or family-level truth is fine. |
| 9 | **Leaves only** — a rosette or foliage patch with no flower or fruit, ideally of #1 or #4 | The commonest real scan and the hardest. Most of the deck is identified off its flower. Give this its own specimen id even if it is the same plant as another row, and say so in `notes`. |
| 10 | **A lawn or roadside grass** | No card, not a congener of one. Tests the `noMatch` path and gives one honest "the deck has nothing like this" row. Truth can be `Poaceae`. |

**Substitutions are fine.** If you cannot find yarrow, any plant with a genuinely dangerous
lookalike serves the same purpose. If you cannot find a dandelion in flower, a seed head or a
bare rosette is still a dandelion — note it. A row you are certain about beats a row from this
list that you are guessing at.

---

## The three photographs

Same plant, same session, **in this order** — the order is what the conditions are built from.
Photo 1 alone is the `p1` condition, photos 1-2 are `p2`, all three are `p3auto`.

1. **Whole plant in context.** Step back. Include the ground, the neighbours, the growth habit.
   This is the one that has to carry a single-photo identification on its own.
2. **Leaf and stem detail.** Fill the frame. Show the leaf margin, how it attaches, and the
   stem — square, round, hairy, ridged.
3. **Flower, fruit or seed head.** The reproductive structure, as close as your phone will
   focus. If the plant has none, take only two and record `organ3: none`.

Ordinary phone camera. **No editing, no cropping, no filters, no zoom-and-crop afterwards** —
the pipeline re-encodes at 1024px exactly as the app does, and a pre-cropped photo measures
your cropping rather than the identifier.

Mixed conditions are a feature, not a problem: overcast and bright, morning and evening, wet
and dry. Every photograph taken in perfect light is a photograph that flatters the result.

---

## Recording ground truth

One row per specimen in `field-truth.csv`, filled in **before** scanning:

```csv
specimen_id,date,truth_name,truth_rank,my_certainty,class,organ3,habitat,notes
spec-001,2026-09-30,Plantago major,species,certain,easy-deck,flower,lawn edge,seed spikes up
spec-002,2026-09-30,Taraxacum officinale,species,certain,aggregate,flower,lawn,in flower
spec-003,2026-09-30,Taraxacum officinale,species,certain,aggregate,fruit,verge,seed head only
spec-004,2026-09-30,Rumex crispus,species,probable,hard-deck,fruit,roadside,brown seed stalk
spec-005,2026-09-30,Achillea millefolium,species,certain,high-stakes,flower,meadow,
spec-006,2026-09-30,Solidago,genus,certain,pending-curation,flower,field margin,peak bloom
spec-007,2026-09-30,Trifolium repens,species,certain,off-deck-congener,flower,lawn,white heads
spec-008,2026-09-30,Symphyotrichum,genus,probable,off-deck,flower,garden,purple rays
spec-009,2026-09-30,Plantago major,species,certain,leaves-only,none,lawn,same plant as spec-001
spec-010,2026-09-30,Poaceae,family,certain,no-match,flower,lawn,
```

Field notes:

- **`truth_rank`** is `species`, `genus` or `family`. Genus-level truth is honest and useful —
  *Solidago* and asters genuinely cannot be settled from a phone photo, and pretending
  otherwise would put a guess in the denominator.
- **`my_certainty`** is `certain`, `probable` or `unsure`. `unsure` rows are kept and reported
  separately, never silently dropped and never counted as a provider failure.
- **`habitat`** is coarse on purpose — "lawn", "roadside verge", "wood edge". **Do not record
  coordinates.** The app re-encodes every photograph specifically to drop EXIF and its GPS, and
  a benchmark that wrote the location back into a spreadsheet would undo that by hand.
- **`class`** is what the row is testing, from the table above. It is what lets the report say
  "the high-stakes rows behaved like this" rather than only giving one aggregate.

---

## Naming and organising the files

```
field/
  field-truth.csv
  spec-001/
    spec-001_1-habit.jpg
    spec-001_2-leaf.jpg
    spec-001_3-flower.jpg
  spec-002/
    spec-002_1-habit.jpg
    spec-002_2-leaf.jpg
    spec-002_3-flower.jpg
  spec-009/
    spec-009_1-habit.jpg
    spec-009_2-leaf.jpg          <- only two: organ3 is `none`
  ...
```

The rules, all four enforced by `scripts/check_field_set.py`:

1. One directory per specimen, named exactly `spec-NNN`, matching a `specimen_id` in the CSV.
2. Filename is `spec-NNN_<position>-<organ>.jpg`, position `1`, `2` or `3`.
3. `<organ>` is one of PlantNet's own words: `habit`, `leaf`, `flower`, `fruit`, `bark`, `auto`.
   Position 1 should be `habit`; position 3 should say what it actually is.
4. `.jpg`, `.jpeg` or `.png`. Whatever the phone produced, unedited.

Why the organ is in the filename when the `p3auto` condition tags photo 3 as `auto` anyway:
the tag sent is a property of the condition, the organ photographed is a property of the
record. Keeping both is what would let the `p3tag` question be reopened later without
recollecting anything.

**Keep the camera originals somewhere off the repository.** The pipeline re-encodes to 1024px
before sending — about 200KB a photograph — and it is the re-encoded copies that a benchmark
needs. Committing 150 camera originals would put several hundred megabytes in git history for
files nothing reads twice.

---

## Checking it before you send it

```bash
python3 scripts/check_field_set.py field/
```

It reads the directory and the CSV, fails on every rule above, and on the two mismatches that
matter more: a specimen in the CSV with no photographs, and photographs with no CSV row. It
writes `field/manifest.json` when everything passes, which is what the benchmark harness will
read — so a set that passes this check is a set that can be ingested without anybody touching
it again.

It makes no network calls and spends nothing.

---

## After phase 1

What phase 1 is allowed to conclude: whether the protocol is followable, whether the files
parse, whether the harness runs against them, and whether the report reads sensibly. **Ten
specimens cannot decide the photo-count question** — that needs the fifty, and the reason is in
`docs/identification-benchmark.md`: a sign test on discordant pairs cannot reach significance
below about thirty specimens even when every discordant pair points the same way.

The quota question for the fifty, without weakening normal TEST behaviour:

- **Five days, ten specimens a day**, resumable with `ONLY`. Costs nothing and changes nothing.
- **Or five disposable accounts**, one day. Each account has its own ordinary 30/day bucket, so
  this uses more users rather than giving any user more — `USER_DAILY_LIMIT` is untouched and
  the 450/day global backstop is never approached. The account workflow already mints them.

Neither needs a code change. The second is preferable and is the one to reach for.
