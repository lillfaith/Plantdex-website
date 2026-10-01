# Internet-sourced validation set

Three documented iNaturalist observations, standing in for the three specimens that were
blocking the production-readiness verdict: two common dandelions and one goldenrod. They are
**not** a substitute for phone photographs taken in the field — they answer the taxonomy
questions sooner, and the phone set still has to happen.

**The ground truth below was written down before anything was sent to PlantNet.** That order
is the whole point: an identification recorded after seeing the provider's answer is agreement
with the answer, not evidence about it.

## Why iNaturalist and not an image search

The user's source order was herbarium/specimen-backed, then research-grade iNaturalist, then
Wikimedia/database records tied to an explicit taxon, then anything else with documented
provenance. The pilot had already run on Wikimedia Commons categories and recorded its own
fatal limitation: `sameIndividual: 0 of 24`. A Commons category is photographs of *different
plants* by *different people*, so "do three views beat two" was being asked of three
specimens rather than three views, and the photo-count axis was unreadable.

An iNaturalist **observation** is by construction one organism at one place and time. Its
photographs are the same individual by definition rather than by hope. That single property is
what makes these records usable where a category was not.

Research grade means the community converged: at least two thirds of identifiers agree, and
the record carries a date, a location and a photograph. It is a determination somebody else
can check — not a fact, and not this benchmark's opinion.

## The three specimens

Slots were assigned **by looking at every candidate photograph**. iNaturalist photo order is
whatever the observer uploaded, and photo 1 alone *is* the single-photograph condition, so a
close-up sitting in that position would have measured something else entirely.

### spec-001 — *Taraxacum officinale*

| | |
|---|---|
| Observation | [107290092](https://www.inaturalist.org/observations/107290092) |
| Taxon as determined | *Taraxacum officinale*, rank **species** |
| Verification | **specimen-backed** |
| Community | 2 agree / 0 disagree, research grade |
| Observed | 2021-04-28, Lincoln County, Oregon |
| Same individual | yes |
| Licence | CC BY-NC |

The strongest record of the three. Among the observation's own photographs is a **bagged,
labelled voucher** (a specimen bag marked `BB4`) — the plant was collected, not just
photographed, which is the top of the requested source order rather than the second rung. The
reflexed outer phyllaries are visible on both the bud and the open head; that is the character
separating sect. *Taraxacum* (= *Ruderalia*, the common dandelion group) from the sections
Plantdex deliberately refuses.

| Slot | Organ | Photo | What it shows |
|---|---|---|---|
| 1 | habit | 180418445 | whole plant in turf, flower head and seed head together |
| 2 | leaf | 180418543 | runcinate pinnatifid leaves held in hand, filling the frame |
| 3 | flower | 180418496 | head in side view, outer phyllaries reflexed |

### spec-002 — *Taraxacum officinale*

| | |
|---|---|
| Observation | [156701280](https://www.inaturalist.org/observations/156701280) |
| Taxon as determined | *Taraxacum officinale*, rank **species** |
| Verification | research-grade |
| Community | 1 agree / 0 disagree |
| Observed | 2023-04-25, Washington, US |
| Same individual | yes |
| Licence | CC BY |

A second, independent dandelion — a different observer, state, year and season-point, which is
what makes it a second data point rather than a second look at the first.

**Its weakest photograph is slot 1**, and that is recorded rather than hidden: the observation
has no single whole-plant shot, so slot 1 is a step-back of the clump in seed. If this specimen
underperforms at p1 specifically, that is the reason to reach for before any claim about
dandelions.

| Slot | Organ | Photo | What it shows |
|---|---|---|---|
| 1 | habit | 270994516 | step-back of the clump, several seed heads on scapes |
| 2 | leaf | 270994524 | runcinate leaf, clean, filling the frame |
| 3 | flower | 270994499 | open head in bright sun |

### spec-003 — *Solidago canadensis*

| | |
|---|---|
| Observation | [132077681](https://www.inaturalist.org/observations/132077681) |
| Taxon as determined | *Solidago canadensis*, rank **species** |
| Verification | research-grade |
| Community | 1 agree / 0 disagree |
| Observed | 2022-08-23, Wakelee Field, Demarest, New Jersey |
| Same individual | yes |
| Licence | CC BY |

**Its ground truth is `probable`, not `certain`, and the limitation is the point.** The leaves
are triple-nerved and lanceolate and the inflorescence is a secund plume — *Solidago* subsect.
*Triplinerviae* beyond reasonable doubt. *S. altissima* is **not excluded**: the
*canadensis*/*altissima* pair is genuinely unsettled in the north-east, and this record rests
on a single agreeing identifier.

That is exactly the ambiguity the Goldenrod scope decision (A vs B) is about, so it is written
into the ground truth rather than smoothed over. A run where PlantNet leads with
*S. altissima* on this specimen is **not** automatically a provider error, and the report must
not be read as if it were.

| Slot | Organ | Photo | What it shows |
|---|---|---|---|
| 1 | habit | 224867042 | upper plant: flowering plume, stem, cauline leaves |
| 2 | leaf | 224867079 | triple-nerved lanceolate leaves on the stem |
| 3 | flower | 224867106 | yellow plume close-up, secund branches |

## What this set can and cannot answer

**Can.** Whether PlantNet returns out-of-scope Alpine or microspecies names on *independently
documented* common dandelions — the question the pilot raised when *T. officinale* came back
as *T. mattmarkense* (sect. *Alpina*), which Plantdex correctly refused. Whether PlantNet's
leading answer on a documented *S. canadensis* is a species, the bare genus, or something
subsect. *Triplinerviae* — which is the evidence the A-vs-B decision has been waiting on.

**Cannot.** Anything about how the app performs on photographs a player takes. These were
taken to document a plant. Treat every rate as an upper bound, and keep the phone set coming.

**Must not.** Be pooled with the phone set. `field-run.yml` takes the set as a choice input and
derives the manifest, the JSONL, the report and the artifact name from it, so a single number
averaged over two kinds of photograph is unrepresentable rather than merely discouraged.

## Reproducing it

```
# CI only — the iNaturalist API is not reachable from a sandbox; the photo bucket is.
gh workflow run inat-resolve.yml -f taxon="Taraxacum officinale" -f place_id=1
python3 scripts/check_field_set.py field-inat/     # validates and writes the manifest
gh workflow run field-run.yml -f set=field-inat -f max_requests=9 -f account_email=...
```

Nine PlantNet identifications, zero Kindwise credits: `run_field()` refuses a `SIGNED_IN`
value outright, so no plant.id request is reachable from this mode at all.
