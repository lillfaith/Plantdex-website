# Expansion importer: draft record to gated catalogue entry

Status: built and tested, NOTHING imported. No live module reads any of this; the flag is off. Reused unchanged for the other 80 cards.

## The flow
```
draft branch (read only)  --snapshot_draft.mjs-->  scripts/expansion/data/pilot-source.json   (text only, no images)
pilot-reviews.json (evidence, empty today)  +  snapshot  --validate_record.mjs-->  errors + gate (READY | HELD, reasons)
                                                          --generate_pilot.mjs-->   expansion-pilot.generated.json
```
| Step | Command | Writes |
|---|---|---|
| Snapshot | `node scripts/expansion/snapshot_draft.mjs [--ids a,b,c]` | `scripts/expansion/data/pilot-source.json` |
| Validate | `node scripts/expansion/validate_record.mjs` | nothing; prints errors and HELD reasons; exits 1 on any error |
| Generate | `node scripts/expansion/generate_pilot.mjs [--out F] [--check]` | `src/data/expansion-pilot.generated.json` (owner-run, tier 0) |
| Tests | `npx vitest run src/lib/expansion-pilot.test.ts` | |

The snapshot reads the draft with `git show <ref>:<path>` and never checks it out. It records, per asset and per source file, the sha256 the draft CLAIMS and the sha256 of the
blob actually at that ref, so the check works without any image in this repo. It also applies the owner's `text-overrides.json` (the draft keeps owner edits outside the record, and the
record alone is stale: #57 reads "Bitter tonic" where the owner approved "Digestive aid"). To widen: pass `--ids`, re-run, review the diff.

## Two questions, kept apart
**`validateRecord` (errors, the record is rejected):** unique id (and equal to the slug of the scientific name); unique card number in 57-141 that collides with no printed card, Field Card or non-herb
card; no species or `spp.`-genus collision with integration (read from `herbs.json` and `field-cards.ts`, never restated); species-level identity (hybrids, infraspecifics, `spp.` refused);
rarity, XP, season, use icons and 1-5 stats checked against the deck's own tables (`build_deck.py`, `herbs.json`) and against the supplied sheet; all six back fields present; every source-file
and per-asset sha256 present, well-formed and equal to the blob at the ref.

**`publicationGate` (HELD or READY):** READY only if every one holds, and each has exactly one way to pass:
| Gate | Passes only with | HELD reason codes |
|---|---|---|
| Sourced caution reviewed | a `caution` review: signer, date, species-specific text, at least one real citation | `caution_unreviewed`, `caution_review_unsigned`, `caution_text_missing`, `caution_generic`, `caution_unsourced` |
| Image provenance | origin recorded as non-AI (`photograph`, `hand_drawn`, `licensed_illustration`), or an `image` review with `botanicallyReviewed: true` | `image_ai_derivative_unreviewed`, `image_origin_unrecorded`, `image_provenance_missing` |
| Taxon identity | a `taxon` review: authority, date, URL, rank `species`, accepted name equal to the record | `taxon_identity_unverified`, `taxon_review_incomplete`, `taxon_name_mismatch` |
| Citations | at least one `isCitation` link that is a document (PubMed id, PMC article, DOI, PDF), not a query | `citations_only_search_links`, `citations_missing` |
| Approved assets | owner approval recorded for the main image and the pixel icon | `asset_not_approved` (detail: role) |

A pending status, an absent review, a generic line ("Identify positively...", "Daisy-family allergy possible"), a search link labelled as a citation, and an unrecorded image origin are never evidence.
A sprite is not a gate: the plan defines a missing-sprite state, and #57-61's sprites are not treated as approved, so `sprite` is always `null`.

## Recording a review
Add to `scripts/expansion/data/pilot-reviews.json` (absent today; the validator treats a missing file as no reviews), keyed by id:
```json
{ "eupatorium-perfoliatum": {
  "caution": { "text": "...", "sources": ["https://pubmed.ncbi.nlm.nih.gov/..."], "reviewedBy": "name", "reviewedAt": "YYYY-MM-DD" },
  "image":   { "botanicallyReviewed": true, "reviewedBy": "name", "reviewedAt": "YYYY-MM-DD" },
  "taxon":   { "authority": "WCVP", "acceptedName": "Eupatorium perfoliatum", "rank": "species", "checkedAt": "YYYY-MM-DD", "url": "https://..." } } }
```
These are evidence a botanist supplies. The importer never writes them and never fills one in from the draft.

## What the generated file contains
Only validated fields, plus an explicit `null` for anything without a source: `identification`, `lookalikes`, `habitat`, `sprite`, `collectionId` (an owner decision, plan section 3) and `caution`
(the reviewed text or null; the draft's unreviewed line is dropped). The six back fields are carried with `reviewed: false` and their source, because they are the owner's sheet and not verified botany.
Assets are recorded by sha256, origin and approval; `publishedPath` is `null`, because no image is copied. Output is canonical (sorted keys, no clock, no float, ASCII-escaped, trailing newline),
so it is the same bytes on every machine; `--check` and a test pin the committed copy. `src/data/**` is human-owned, so the reviewed copy is
`docs/expansion/pilot/expansion-pilot.generated.json` and the owner runs the generator to place it at `src/data/`.

## Keeping it off
`NEXT_PUBLIC_EXPANSION_PILOT` is read as `=== 'on'` only (`src/lib/expansion-pilot-flag.ts`). `next.config.ts` still needs the default `'off'` line: see `agents/requests/coord-expansion-pilot-flag.md`.
`src/lib/expansion-pilot.test.ts` proves no live module imports the generated file or the importer, none reads the flag, the draft cautions occur nowhere in `src/`, and (after a flag-off
`next build`, or always with `REQUIRE_EXPANSION_BUNDLE=1`) that the built `out/` holds none of the pilot content.

## Before the other 80
Each needs identification features, lookalikes and habitat (all MISSING in the draft), a reviewed caution, a real citation and a verified taxon; and the integration changes in `integration-map.md`
(collection id, `is_catalogue_herb`, edge-function sync) are separate Shared Change Requests. Batch by readiness; the validator is the gate for every batch.
