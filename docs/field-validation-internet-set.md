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

---

# Results

Run [36926501768](https://github.com/lillfaith/Plantdex-website/actions/runs/36926501768),
TEST project, PlantNet only. 9 identifications, **0 Kindwise credits** — the budget assertion
passed, and `run_field()` makes a comparison request unreachable from this mode.

## Goldenrod — the scope question is answered, and the answer is worse than expected

**PlantNet never once led with *Solidago canadensis*.** It led with ***S. gigantea*** in all
three conditions, with *S. canadensis* second every time:

| | 1st | 2nd | 3rd | 4th | 5th |
|---|---|---|---|---|---|
| **p1** | *S. gigantea* **0.318** | *S. canadensis* 0.203 | *S. rugosa* 0.184 | *S. juncea* 0.100 | *S. altissima* 0.016 |
| **p2** | *S. gigantea* **0.236** | *S. canadensis* 0.150 | *S. rugosa* 0.136 | *S. juncea* 0.074 | *Euthamia graminifolia* 0.053 |
| **p3auto** | *S. gigantea* **0.354** | *S. canadensis* 0.167 | *S. rugosa* 0.115 | *S. juncea* 0.062 | *Euthamia graminifolia* 0.045 |

Every candidate came back at **rank `species`**. The matcher's verdict on each:

```
Solidago gigantea     CONFIRMABLE -> solidago-canadensis (legacyGenus)
Solidago canadensis   CONFIRMABLE -> solidago-canadensis (exact)
Solidago rugosa       CONFIRMABLE -> solidago-canadensis (legacyGenus)
Solidago juncea       CONFIRMABLE -> solidago-canadensis (legacyGenus)
Solidago altissima    CONFIRMABLE -> solidago-canadensis (legacyGenus)
Euthamia graminifolia none
```

Three facts follow, and they point in different directions.

**1. PlantNet answers goldenrod at SPECIES level, not genus.** This is what specimen 7 of the
phase-2 set existed to establish. **Bare `Solidago` never appeared** — not once, at any
condition, at any position in the list. Making a bare-genus answer non-confirmable therefore
costs no measurable coverage on this evidence. (Flagged here explicitly because the standing
instruction was to report a bare-genus answer separately rather than let it broaden the card.)

**2. The current scope is unlocking Goldenrod from species outside the card's own group.**
*S. rugosa* is subsect. ***Venosae***; *S. juncea* is subsect. ***Junceae***. Neither is in
subsect. *Triplinerviae* at all, and both are `CONFIRMABLE -> solidago-canadensis` today. This
is no longer a hypothetical from a probe sweep — it is what the deployed system did with a
photograph of a real, documented goldenrod.

**3. The leading answer is a species the standing constraints exclude.** *S. gigantea* leads
all three conditions and is on the do-not-add list. So **a scope that excludes *S. gigantea*
makes PlantNet's top answer on this specimen non-confirmable**, and the card would then be
reached only via the second candidate — which `outcomeFor` does not do, because it reads the
LEADING candidate's rank, never "is one of these a Plantdex card". That is the rule protecting
the collection from being overruled by itself, and it is not a thing to weaken here.

**This is the trade, stated plainly: tightening the scope to exclude *S. gigantea* means this
specimen stops unlocking the Goldenrod card at all.** Not "unlocks it more slowly" —
`uncertain`, and a Seed Shelf offer. Whether that is the right price is the A-vs-B decision,
and it is not mine to make.

Two cautions about reading the scored summary for this specimen:

- It reports `matched / ok` at all three conditions. That is **correct and misleading**: the
  card resolved, via `legacyGenus`, from a species that is not the card's species.
- It reports `WRONG card offered in first place: 0%`. True, and **structurally guaranteed**:
  the deck holds exactly one *Solidago* card, so no *Solidago* answer can ever offer a wrong
  one. The metric cannot detect this failure mode. `provider led with the right species — 33%`
  is the line that does.

## Dandelion — the Alpine failure did NOT repeat

The pilot had PlantNet answer *T. mattmarkense* (sect. *Alpina*, western Alps) on Commons
images. On two independently documented North American observations it **never led**:

| | spec-001 (vouchered) | spec-002 |
|---|---|---|
| **p1** | *T. officinale* **0.390** `exact` | *T.* sect. *Taraxacum* **0.268** `acceptedGroup` |
| **p2** | *T. officinale* **0.289** `exact` | *T.* sect. *Taraxacum* **0.198** `acceptedGroup` |
| **p3auto** | *T. officinale* **0.297** `exact` | *T. campylodes* **0.368** `exact` |

*T. mattmarkense* appears twice in the whole run, both on spec-001, at **rank 4 (0.028)** and
**rank 5 (0.021)** — present in the tail, nowhere near leading, and correctly refused as
`sameGenus` rather than confirmable. Other microspecies in the tail (*T. dissectum*,
*T. erythrospermum*, *T. palustre*, *T. rubicundum*, *T. pubescens*) were refused the same way.

**The Taraxacum curation is doing exactly what it was built to do, on live data:**

- `Taraxacum sect. Taraxacum` → `acceptedGroup` → unlocks the card. The leading answer on
  spec-002 at two of three conditions is a **section**, and it resolves correctly. Had
  `normalizeName` still collapsed every `Taraxacum sect. X` onto one key, sect. *Erythrosperma*
  would resolve here too; it does not.
- `Taraxacum campylodes` → `exact`. The synonym table carries it, so the p3auto leader on
  spec-002 is read as *T. officinale* rather than as an unknown species.
- Every out-of-scope microspecies → `sameGenus`, non-confirmable.

**This closes the Taraxacum question in the direction of leaving it alone.** Nothing here
argues for a scope change; the two conclusions preserved from the pilot stand — *Capsella
rubella* → *C. bursa-pastoris* and *T. officinale* → *T. mattmarkense* were both provider
misidentifications, and Plantdex's refusal of the sect. *Alpina* species was correct.

## Photo count — no signal, and the sample cannot produce one

```
p1 vs p2       over 3 sets:  both right 3   both wrong 0   only p1 0   only p2 0
p2 vs p3auto   over 3 sets:  both right 3   both wrong 0   only p2 0   only p3auto 0
```

Zero discordant pairs. Every specimen reached the same card at one, two and three photographs,
so **this set says nothing about the minimum photo count in either direction.** Three specimens
could not have, and `MIN_OBSERVATION_PHOTOS` should not move on it.

The leading SCORES did move, and not monotonically — p1 median 0.32, p2 median **0.24**,
p3auto median 0.35. p2 was the weakest condition on every single specimen. That rhymes with
phase 1's magnolia (confident at one photograph, nothing at two and three) and with the
upload-size measurement, where scores moved both ways. Three specimens is not evidence for
anything; it is a reason to keep the axis in the phone set rather than to act now.

## What this set does NOT license

- **It is not phone validation.** These photographs were taken to document a plant. Every rate
  above is an upper bound, and the real-phone set still has to happen.
- **It is not pooled with phase 1.** Separate manifest, JSONL, report and artifact, enforced by
  the workflow rather than by convention.
- **n = 3.** Every interval in the report spans most of the possible range. The Goldenrod
  finding is strong because it is a *structural* observation — which species are confirmable —
  not because 3 specimens established a rate.
