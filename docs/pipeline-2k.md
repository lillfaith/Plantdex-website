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
| **3 shortlisted originals** | durable archive | **until the card is approved — never discarded early** |
| Approved original, cutout, rendered card | durable archive | forever |
| Review gallery images | git (small JPEG) | until superseded |

Rule 8 of the brief, restated as the thing the layout enforces: **text and image bytes never
share a store.** Every JSON file above is readable, diffable and small; no binary over
~200 KB is committed except a gallery sheet.

## 3. "Three distinct originals" — what distinct means

Distinctness is checked in this order, and each rule exists because of a case already seen:

1. **One photograph per observation.** Elderberry's current shortlist offers 424182823 and
   424182835 as separate options; they are the same observation, same day, same place in
   Mississauga — two photographs of one plant. That is one option, not two.
2. **One photograph per photographer per species**, where provenance names one. Three
   frames of the same specimen from one visit is one angle on one plant.
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

| Verdict | Effect |
|---|---|
| `approved` | render, archive, discard the two alternatives, species done |
| `preferred` | pin as leader, keep all three, card not signed off |
| `rejected` (one option) | that photograph is never offered again, the other two stand |
| `more_options` | re-run retrieval for this species EXCLUDING every id ever rejected |

A retry is not a re-run of the same thing: `photo_pipeline.py` already excludes rejected ids
from the pool, so "more options" genuinely offers new photographs or reports that the CC0
pool is exhausted. Nothing is overwritten — `decisions.py` keeps every verdict ever given
and the newest is the one in force, so changing your mind is one `"revise": true` away and
the earlier reading stays readable.

**No automatic promotion exists.** `AUTO_APPROVED` still requires a genuine API vision
verdict, and even that only reaches `NEEDS_REVIEW` in this workflow: a card is approved by a
person or not at all.

## 6. Storage and cost, measured

Per species, from the five species with real shortlists:

| | measured |
|---|---|
| Retrieved pool (discarded) | 194 MB |
| Three shortlisted originals (held) | 4.8 MB |
| Archive after approval (original + cutout + card) | **2.53 MB** |

| Scale | Durable archive | In flight (3 originals × batch) | Vision |
|---|---|---|---|
| 5 species (pilot) | 13 MB | 24 MB | $0.25 |
| 100 species | 0.25 GB | 0.38 GB | $5 |
| 2,000 species | **5.1 GB** | bounded by batch size, not catalogue | **~$101** |

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
