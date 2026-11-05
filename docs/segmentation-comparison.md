# Background removal: comparing six approaches

Run by `scripts/segment_compare.py` over the same 8 CC0 *Matricaria chamomilla* photographs,
all resized to the same 1200px working edge so runtimes are comparable, all measured
identically, all placed through the same `photo_pipeline` placement onto the real card.

## Result

| method | acceptable | mean s/image | what it does |
|---|---|---|---|
| **colour-grabcut** | **5/8** | 2.12 | colour-seeded GrabCut + region growing (current) |
| **u2net** | **0/8** | 0.64 | rembg / U²-Net salient-object matting |
| **isnet** | **1/8** | 1.21 | rembg / ISNet general-use matting |
| **sam-prompted** | **0/8** | 5.84 | SAM ViT-B (ONNX), prompted from plant-colour points |
| **hybrid** | **3/8** | 1.42 | AI matte as the core, colour growth to reclaim |
| **colour+ai-veto** | **4/8** | 3.00 | colour matte, AI used only to veto background |

**The current colour method wins, and the AI models lose badly.** That was not the expected
result, so it is worth being precise about why.

## Why salient-object matting fails on plants

U²-Net and ISNet are trained to find THE salient object. A plant is not one object — it is a
diffuse, multi-part subject with thin connecting structures, and the models resolve it to its
single most conspicuous blob. On the best photograph in the set, U²-Net kept **only the
yellow disc** and discarded every petal; ISNet kept the disc and a ghost of the stem; SAM,
prompted with twelve points sampled from the plant-colour core, returned **one petal**.

For a botanical card that is the worst possible failure, because the discarded structures —
petals, leaves, stems — are exactly what makes a plant identifiable.

The two combinations were no better. Using the AI matte as a core and growing outward by
colour (`hybrid`) reintroduced the structures but added dark halos and rectangular artefacts.
Using the AI only to veto background (`colour+ai-veto`) changed nothing measurable, for an
instructive reason: after region growing the background foliage is CONNECTED to the subject,
so there is no separate component left to veto. A pixel-level veto would work, except that
the models also score the subject's own petals near zero, so it would cut the plant.

## The real bug was not the model

The current method's cutouts were poor because of `largest_blob`, not because of the
algorithm. On the best photograph the plant-coloured core breaks into **41 components** —
the photographer's finger passes behind the stem and interrupts the green, so the flower head
is one component, the stem another, the bud a third. Keeping only the largest discarded
**61% of the plant-coloured pixels**, which is why the cutout was a flower head with no stem
and no bud.

Seeding region growing from every substantial plant-coloured piece fixes it, and the same
photograph now cuts as a complete specimen: full flower, stem, leaves and bud, finger gone.
See `evidence/segmentation/matricaria_chamomilla/best-cutout-650137635.png`.

## Dependencies and cost

`rembg` + `onnxruntime` install cleanly and run on CPU with no GPU and no paid API. Model
weights download once: U²-Net 176MB, ISNet ~170MB, SAM ViT-B encoder+decoder. Session init is
5–12s, then 0.6–1.2s per image for the matting models and ~6s for SAM. `torch` is NOT needed
and is NOT reachable from this sandbox anyway — `download.pytorch.org` is proxy-blocked, so
anything requiring it (CLIPSeg, HQ-SAM) would have to run in Actions.

None of that cost is worth paying, since the models perform worse than the method already in
the repository.

## What is still unsolved

Colour segmentation cannot separate the subject plant from **background plants of the same
colour**, and no method here solves it. On a dense colony every pixel is plant, so the cutout
is a rectangle; the pipeline rejects those rather than shipping them, which is correct but
shrinks the usable set.


## CC0 availability: Chamomile is not unusual, and the pool is not thin

`scripts/cc0_audit.py` counts, per species, what survives each gate. It downloads nothing.

| species | CC0 + research grade | sampled ≥900px |
|---|---|---|
| Achillea millefolium | 10,436 | 73/73 |
| Urtica dioica | 6,670 | 35/35 |
| Verbascum thapsus | 4,302 | 51/51 |
| Hypericum perforatum | 2,338 | 55/57 |
| Sambucus canadensis | 1,633 | 61/61 |
| **Matricaria chamomilla** | **484** | 56/56 |
| Echinacea purpurea | 338 | 58/58 |
| Actaea racemosa | 261 | 58/58 |

Across 17 species: **median 963, minimum 261, not one below 20.**

**So the earlier conclusion that "the CC0 pool is too small" was wrong.** Chamomile returned
eight photographs because `retrieve-evidence.yml` passed `--want 8` — a flag nobody had
re-read. It now fetches 32. CC0 stays as the licence policy and there is no case for CC-BY
on availability grounds.

`Mentha piperita` resolves to no exactly-matching active species taxon, because it is the
hybrid *M. × piperita*. That is the matcher behaving correctly, and a reminder that hybrid
species need explicit handling before the programme scales.
