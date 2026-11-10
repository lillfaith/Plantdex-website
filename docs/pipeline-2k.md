# Generating 2,000+ cards: proposed end-to-end workflow

Status: **proposal**. Nothing in here is built beyond the pilot described at the end, and
nothing runs at catalogue scale without a separate explicit approval.

Every number below is measured from the seven species already retrieved, not estimated.

---

## 1. The shape of it

```
  (1) RETRIEVE          up to 96 CC0 originals          TEMPORARY  — CI runner disk
  (2) SCREEN            botanical brief + scoring        no storage
  (3) SEGMENT           BiRefNet on the top ~20          TEMPORARY
  (4) VISION            3 images per candidate           ~$0.013/candidate
  (5) SHORTLIST         THREE DISTINCT originals         held until the card is approved
  (6) REVIEW            art-direction gallery            owner: approve / reject / more
  (7) RENDER            the card                         on the approved original
  (8) ARCHIVE           original + cutout + card + provenance   DURABLE
  (9) DISCARD           the other 93 candidates          after (5) succeeds
```

Stages 1–5 happen inside one CI job on one runner. The 96 originals never enter git and
never leave the runner except as the three that survive.

## 2. Where each thing lives, and why

| Artefact | Lives in | Lifetime |
|---|---|---|
| Code, workflows | git | forever |
| Species manifest, provenance, licence, hashes | git (JSON) | forever |
| Decision history (`human-decisions.json`) | git | forever, append-only |
| Processing status | git (JSON) | forever |
| 96 retrieved originals | CI runner tmp | one job |
| **3 shortlisted originals** | durable store, written **inside the job that made them** | **until the card is approved — never discarded early** |
| Approved original, cutout, rendered card | durable archive | forever |
| Review gallery images | git (small JPEG) | until superseded |

Rule 8 of the brief, restated as the thing the layout enforces: **text and image bytes never
share a store.** Every JSON file above is readable, diffable and small; no binary over
~200 KB is committed except a gallery sheet.

### Durability is a step in the job, not a later tidy-up

The shortlisted originals are the one artefact nothing else can regenerate: the cutout and
the card are derived from them, the 96-photo pool is discarded at the end of the same job,
and the runner's disk does not outlive it. So `photo-candidates.yml` now hashes and
preserves them *before* it commits, and a verification step fails the job if any
shortlisted original is missing, unhashed, or does not match its recorded hash. A retry or
a later session finds the three originals, their provenance and their hashes already there.

**The repository is the interim fallback, not the destination.** Committing originals keeps
CI durable and recreates the growth it was meant to solve: 8 MB a species in flight is 16 GB
of git at 2,000, and git keeps every version forever — this repo already carries 1.41 GB of
photo blobs across 963 versions from the pool-in-git era.

`scripts/asset_store.py` is the destination. The split is the whole design:

* **in git** — `evidence/assets.json`: for every asset its sha256, size, species, photo id,
  licence, photographer, source URL, which backend holds it and under what key. Text,
  diffable, a few hundred bytes an asset. This is the half that cannot be regenerated.
* **outside git** — the bytes.

An asset is identified by the sha256 of its contents, so a re-upload of identical bytes is
a no-op, a corrupted download is detectable, and the index can be checked against the store
without either being authoritative about the other. The candidates workflow uploads when a
backend is configured and falls back to committing with a loud warning when none is — losing
the originals is worse than committing them, so the fallback does not fail the job.

## 3. "Three distinct originals" — what distinct means

Distinctness is checked in this order, and each rule exists because of a case already seen:

1. **One photograph per observation.** Elderberry's current shortlist offers 424182823 and
   424182835 as separate options; they are the same observation, same day, same place in
   Mississauga — two photographs of one plant. That is one option, not two.
2. **A different photographer is preferred, not required.** One contributor often uploads
   the best several photographs of a species — different specimens, different growth stages
   — and a hard rule throws those away for a tidiness nobody asked for. A same-photographer
   candidate is taken only after every distinct-photographer one has been, and the gallery
   marks which options share a contributor.
3. **Perceptual distance.** A difference hash over the downscaled source, rejecting any
   candidate within a small Hamming radius of one already chosen, which catches near
   duplicates uploaded as separate observations.
4. **Prefer different months** where the brief allows, so a fruiting and a flowering option
   can both appear rather than three frames of one stage.

If fewer than three distinct candidates survive, the species is shortlisted with what there
is and flagged `needs_more_options` rather than padded.

## 4. Segmentation-quality preview (brief item 4)

Each shortlisted candidate carries two numbers computed from its own source and cutout, no
model required and no extra cost:

* `green_kept` — of the foliage-coloured pixels in the source, what share survived the cut.
* `thin_kept` — survival of thin structures only (source mask eroded, then subtracted),
  which is where stems and petioles live.

These do not gate anything. They are printed beside each option in the gallery so the art
director can see *before* choosing that a candidate's cutout has lost its stem — which is
exactly what happened to mullein 21260078, elderberry 424182823/835 and dandelion 152340494
and was invisible at contact-sheet size.

## 5. Approvals and retries

The gallery writes one row per species. Four verdicts, all append-only, all revisable:

**Choosing the photograph and approving the card are two decisions**, made at different
times on different evidence, and they can disagree: the right photograph can still render
into a card that does not work, and rendering is how you find that out. Collapsing them
would make every photo pick a silent sign-off on art nobody has seen.

| Verdict | Effect |
|---|---|
| `photo_selected` | **triggers segmentation and rendering. Approves no artwork.** The species stays under review; all three originals are still held. |
| `card_approved` | signs off the RENDERED CARD. Only this reaches `HUMAN_APPROVED`, archives the card, and releases the two alternatives. |
| `preferred` | a leaning short of a selection: pin it, render nothing |
| `rejected` (one option) | that photograph is never offered again, the other two stand |
| `more_options` | re-run retrieval for this species EXCLUDING every id ever rejected |

`approved` is the legacy spelling of `card_approved`: still read, no longer offered, because
a verdict already in the ledger may never be rewritten.

A retry is not a re-run of the same thing: `photo_pipeline.py` already excludes rejected ids
from the pool, so "more options" genuinely offers new photographs or reports that the CC0
pool is exhausted. Nothing is overwritten — `decisions.py` keeps every verdict ever given
and the newest is the one in force, so changing your mind is one `"revise": true` away and
the earlier reading stays readable.

**No automatic promotion exists.** `AUTO_APPROVED` still requires a genuine API vision
verdict, and even that only reaches `NEEDS_REVIEW` in this workflow: a card is approved by a
person or not at all.

## 6. Storage and cost, measured

**Measured on the pilot — five species, three options each — not projected.**

| | measured |
|---|---|
| Retrieved pool (discarded) | 194 MB |
| 3 shortlisted originals | 3.69 MB |
| 3 cutouts | 3.33 MB |
| 3 card renders | 0.75 MB |
| Manifest + gates + candidate JSON | 0.26 MB |
| **Working set per species in flight** | **8.03 MB** |
| **Archive after approval** (1 original + 1 cutout + 1 card + JSON) | **2.85 MB** |

Pilot total on disk: **50.5 MB** for five species, which includes 1.6 MB of shared review
sheets, 6.7 MB of three-stage strips and 2.1 MB of segmentation diagnostics — the last of
which is deletable once the model question is settled.

| Scale | Archive | In flight | Vision |
|---|---|---|---|
| 5 species (pilot) | 14 MB | 40 MB | $0.25 |
| 100 species | 0.29 GB | 0.80 GB | $5 |
| 2,000 species | **5.7 GB** | bounded by batch, not catalogue | **~$101** |

An earlier draft of this document said 2.53 MB per species and 5.1 GB at 2,000. That figure
was the ARCHIVE only and was quietly standing in for the working set, which is three times
larger while a species is in review. Both numbers are above, named.

In-flight storage is bounded by how many species are awaiting review at once, not by the
catalogue: a 25-species review batch holds ~95 MB.

CI time is 116–237 s per species (mean 178 s) for 96 scored and ~20 segmented. 2,000 species
is ~99 hours serial, ~5 hours on a 20-way matrix.

## 7. Durable store: Dropbox vs object storage

The archive is **5.1 GB at 2,000 species**, which is small enough that cost is not the
deciding factor. What differs is how it is reached.

| Option | Cost for 5 GB | CI access | Owner can browse |
|---|---|---|---|
| **Cloudflare R2** | $0 (10 GB free, then $0.015/GB-mo) | S3 API, one key | via a URL, not a file manager |
| **Backblaze B2** | $0 (10 GB free, then $0.006/GB-mo) | S3 API, one key | web UI |
| **Dropbox** | $0 only if an existing paid plan has room; 2 GB free tier does not fit | OAuth app + refresh token, more moving parts | **yes, natively in Finder** |
| Supabase Storage | ~$0.08/mo beyond the 1 GB free tier | already configured in this project | web UI |

Both are implemented behind one interface and neither is configured. R2 needs four
repository secrets (`PLANTDEX_ASSET_ENDPOINT`, `_BUCKET`, `_KEY_ID`, `_SECRET`) and boto3;
Dropbox needs one (`PLANTDEX_DROPBOX_TOKEN`) and no dependency.

**Recommendation: Dropbox if you want to open the archive like a folder, R2 otherwise.**
Dropbox's advantage is real and not technical — an art director flipping through approved
originals in Finder is worth more than four cents a month. Its costs are a paid plan if you
have not got one, an OAuth app, and a refresh token stored as a repository secret.

Either way the archive is **write-once from CI and never read by the website**: the site
ships rendered cards in `public/`, so the archive is provenance and raw material, not a
runtime dependency. That is what keeps the choice cheap to reverse.

Nothing is uploaded anywhere until you pick one. No large batch goes up regardless.

## 8. What is deliberately NOT in this proposal

* No history rewrite, no force-push. `.git` stays 1.33 GiB; the pool bytes already in
  history stay there until a separate, explicitly approved operation.
* No deletion of any further photo pool. `achillea_millefolium` and `plantago_major` have
  never been through the pipeline and keep their pools.
* No orphan deletion. Five files under `pinus_strobus` have no manifest entry; provenance
  can be recovered by querying iNaturalist by photo id, which needs a CI run, not a cleanup.
* No change to the printed 45. No regeneration, no overwrite, ever.
* No catalogue-scale run. The pilot is five species.

---

## 9. Blockers to the FIRST complete, human-approved generated card

Measured against `evidence/drafts/matricaria_chamomilla.json` and the renderer's own
requirements, as of this commit. Chamomile is the furthest-along species and is the one
this list is about.

### Front — artwork
| # | Blocker | Owner | Unblocked by |
|---|---|---|---|
| 1 | Photograph is `preferred`, not `photo_selected`. A leaning is not a selection and does not trigger a render. | owner | one gallery decision |
| 2 | No genuine vision verdict exists for any candidate, so nothing can pass the botanical, cropping, segmentation or orientation checks automatically | owner | `ANTHROPIC_API_KEY` secret |
| 3 | Orientation is deferred to the vision pass by design; with no vision it is simply unanswered | follows #2 | — |
| 4 | The pipeline now fails closed with no asset backend, so no species can be processed at all | owner | R2 secrets |

### Front — printed data (every field below is ABSENT from the draft)
| # | Field | Why it is not filled in |
|---|---|---|
| 5 | `card_number` | The printed deck is 01–47. A generated card must not claim a printed number, and no numbering scheme for generated cards has been decided. |
| 6 | `scientific_name` styling | Title Case on artwork versus lowercase in the database is still an open decision from earlier in this work. |
| 7 | `environmental_indicators` (water, sun, temperature) | No credible source chosen. The renderer draws these from the field; inventing them is prohibited. |
| 8 | `season` | Same: unsourced. |
| 9 | `encounter_rate` | Deliberately null until the occurrence-count mapping is a made product decision. Only `encounter_rate_provisional` renders, and its review flag stays a blocker. |
| 10 | `use_icons` | An icon asserts a use. Cannot be chosen before the back content is approved. |
| 11 | `rarity` | A designer's judgement, not derivable from data. |
| 12 | `pixel.png` | Every one of the 45 sprites is an authored module in `scripts/sprite_sources/`. A generated species has none, and this is the steepest per-species cost in the whole programme. |

### Back — content
| # | Blocker |
|---|---|
| 13 | 12 claims sit at `citation-checked` with **0 human-reviewed**. `approved` additionally requires the cited source to be `verified: true` — a person having opened the document. Nothing may print until both happen, per `generated-card.ts`. |
| 14 | Migration 0010 and the medicinal eligibility system are excluded from the Georgia release by instruction, so the database path for claims is parked. |

### Provenance — largely solved
| # | State |
|---|---|
| 15 | Licence, photographer, observation URL, dimensions and retrieval date are recorded per photograph; sha256 is recorded for retained originals. |
| 16 | The decision ledger is append-only with full history and is never rewritten. |
| 17 | Open: five orphan files under `pinus_strobus` have no manifest entry. Provenance is recoverable by querying iNaturalist by photo id, which needs a CI run. |

### Storage
| # | State |
|---|---|
| 18 | R2 architecture approved and implemented; `evidence/assets.json` is empty until the first verified upload. |
| 19 | Pending: bucket, four repository secrets, then a one-species `--roundtrip` test. |

### The shortest path to card one
Items 1, 2, 4, 13 and the front-data decisions 5–11. Of these, **#13 is the only one that
cannot be shortened by tooling** — a person has to read twelve claims beside their quotes.
Everything else is a decision or a secret.
