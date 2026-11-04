# The botanical catalog

**Three layers, one of which is allowed to be slow.**

`supabase/migrations/0010_botanical_catalog.sql` · `scripts/ingest_species.py` ·
`src/lib/catalog-schema.ts` · `.github/workflows/ingest-species.yml`

---

## Why three layers

A species carries three kinds of fact with three different evidence bars:

| Layer | Tables | Bar | Cost |
|---|---|---|---|
| **A — botanical** | `catalog_species`, `catalog_synonyms`, `catalog_regions`, `catalog_species_regions` | A database somebody else maintains says so | Minutes, automatable |
| **B — collectible** | `collectible_cards`, `card_renders` | Our own decision; no external truth to get wrong | Minutes |
| **C — medicinal** | `medicinal_claims` | A human opened a source and judged it | **Hours, per species** |

**A species may be catalogued with no card, and made collectible with no medicinal CLAIMS.**
Collapsed into one table, every one of 2,000 species would need a full safety review before
it could be listed at all, and the catalog would never grow past what one person can read.

**But it may not be collectible without medicinal ELIGIBILITY**, and that distinction is the
product. Plantdex is a medicinal-plant deck: a species with no documented medicinal relevance
is a Seed Shelf find, not a card. Eligibility is one species-level determination with sources
and a named reviewer; claims are the dozen individual Healing Traits, compounds and
preparations that arrive afterwards, one review at a time. A card needs the first and can
ship without any of the second.

Measured, in this repository: `src/lib/trait-evidence.ts` holds trait-level medicinal
evidence for **one species**; `src/data/sources.json` holds 154 references, 127 verified,
across 45. That is the real rate. Layer C is sized to it; Layers A and B are not.

## What the database refuses

These are constraints, not conventions. `supabase/tests/0010_botanical_catalog.test.sql`
exercises each against a real PostgreSQL.

**The eligibility gate** (`enforce_collectible_eligibility`, a trigger — a CHECK may not
query another table):

- **Publishing a card for a species that is not `eligible`.** Refused.
- **Withdrawing eligibility from a species that has a published card.** Refused until the
  card is unpublished. Without this direction the gate would hold for one instant.
- **Making a genus-derived record eligible.** Refused. "Solidago has been used medicinally"
  says nothing about *Solidago altissima*, and reasoning that way manufactures eligibility
  for whole genera at a stroke — the cheapest possible route to a fabricated 2,000.
- **An eligibility decision — either way — with no named reviewer and date.** `pending`
  carries nothing, which is what makes it the honest default.
- **`eligible` with no relevance kind, basis and source.**

Historical or traditional use is **sufficient** for eligibility and is **never** evidence the
use worked or that the plant is safe. `medicinal_relevance_kind` records which was found;
there is deliberately no efficacy column on Layer A for anyone to fill in, and a test fails if
one appears.

Everything else:

- **An approved claim with no named reviewer and date.**
- **An approved claim with no citation.**
- **An AI-drafted claim that is approved.** `drafted_by = 'ai-assisted'` and
  `review_status = 'approved'` cannot coexist in a row. A model's output may never *be* the
  published state; a human has to re-author it. Agreement between models reaches nothing.
- **A toxicity note that forgot to be high-risk.** `high_risk` is derived from `kind` by a
  trigger, because the row that most needs the flag is the one most likely to be missing it.
- **`occurrence = 'unlikely'` with no source.** Absence of records is not absence of the
  plant; `insufficient` is the honest default and needs nothing.
- **An image with no licence and attribution.**
- **A synonym that does not name what it is a synonym of.**
- **A `printed` card with no deck number.**

Unapproved content is also **unreadable by the client roles**, not merely unrendered: RLS
restricts `medicinal_claims` to `review_status = 'approved'`, `catalog_species` to approved
rows, and `catalog_sources` to `verified`. A UI bug cannot leak a draft, and neither can a
hand-written PostgREST query. No table in 0010 has an insert, update or delete policy for
any client role.

## Withdrawing eligibility

One call, because the gate makes two statements out of one decision and two PostgREST
requests can half-succeed:

```sql
select * from public.withdraw_medicinal_eligibility(
  'mentha piperita', 'lillian', 'Species-level relevance could not be confirmed on review.');
```

It unpublishes every card for the species and sets eligibility to `ineligible`, in that
order, inside one transaction — so no other session ever sees an intermediate state. It
refuses a withdrawal with no named reviewer or no stated reason, and errors rather than
silently doing nothing for a species that is not in the catalog. It returns how many cards
it unpublished.

`EXECUTE` is revoked from `anon` and `authenticated`; only the service role may call it. It
is `security invoker`, so it holds no privilege of its own — it buys atomicity and ordering,
nothing else.

## Why `eligible` cannot just be typed

Five things must be true at once, and the last is the one that makes the rest mean
something:

1. `medicinal_relevance_kind` is set — historical use, traditional use or scientific study.
2. `eligibility_basis` says why, in at least 20 characters.
3. `eligibility_sources` is non-empty.
4. `eligibility_reviewed_by` and `eligibility_reviewed_on` name a person and a date.
5. **Every cited source exists in `catalog_sources` and is `verified`** — checked by a
   trigger, because an array cannot carry a foreign key. Without it `array['looks-medicinal']`
   would satisfy 1–4, and the citation requirement would be decorative, which is worse than
   absent because it reads as rigour.

`verified` means a human opened the source and confirmed it supports the claim. An
unverified row is a candidate, and a candidate backing an eligibility decision is the
AI-suggested-citation failure arriving one table to the left.

## What review means — and what the database cannot check

The triggers check that a cited source **exists** and is **verified**. They cannot check
that it is **about this species**, or that it supports a *medicinal* determination. A
verified reference about a different plant entirely satisfies every constraint in the
schema.

That is not a gap to be closed by a better constraint. Existence and verification are
properties of a source row; relevance is a judgement about a *pairing*, and no database can
make it. Treating a green check as proof of relevance would be exactly the false confidence
this layer exists to prevent.

**So the human step is load-bearing, and these are its rules:**

1. Open every source. Not the abstract, not a search summary — the source.
2. Confirm it is about **this accepted species**, not its genus, not a relative. A
   genus-level source is recorded with `eligibility_from_genus_record = true` and cannot
   make the species eligible.
3. Confirm it documents **medicinal use** — not that the plant is edible, not that it
   contains an interesting compound.
4. Write what each source actually says into `eligibility_basis`. That field is the record
   of the judgement; a reviewer who cannot write the sentence has not made it.
5. Sign it: `eligibility_reviewed_by`, `eligibility_reviewed_on`.

A reviewer who sets `eligible` because the trigger let them has not reviewed anything. The
constraint is a floor, not a verdict.

## Running an ingestion

```bash
# From the printed deck. No network; runs anywhere.
python3 scripts/ingest_species.py --source deck --out build/catalog --dry-run
python3 scripts/ingest_species.py --source deck --out build/catalog

# The identity rules the catalog keys on.
python3 scripts/ingest_species.py --self-test
```

GBIF needs a network the development sandbox does not have, so it runs in Actions:
**Actions → "Ingest species into the catalog" → source `gbif`**, with a names list and a
`limit`. The run uploads `species.ndjson`, `synonyms.ndjson`, `cards.ndjson`,
`failures.ndjson` and `upserts.sql` as an artifact.

**The script never connects to a database.** There is no `--apply`, no connection string and
no driver import — `catalog-schema.test.ts` fails if one appears. Applying `upserts.sql` is a
separate human act, and the file is idempotent: applying it twice is a no-op, and it never
downgrades a `review_status` a human has already set.

### The printed 45, and the nine genus cards

**The printed deck is preserved and is not re-litigated by this table.** Those cards are in
buyers' hands and on the live site; the catalog did not publish them and cannot unpublish
them. But "already shipped" is not a review. A `printed` card may be published while its
species is still `pending` **only by naming the outstanding review in
`eligibility_review_gap`** — a sentence somebody wrote, so the gap stays auditable instead of
becoming a silent permanent exemption.

**The nine genus cards are not catalog species at all.** `Rubus spp.` has no binomial, so
ingestion records it in `failures.ndjson` rather than inventing one. Under the genus rule they
are also exactly the thing that must not confer eligibility on their member species. A
genus-level collectible concept is a later decision, not a gap to paper over now.

### What the deck run produces today

36 species and 36 cards from the 45-card deck. The other **nine are genus cards**
(`Rubus spp.`, `Quercus spp.` …), which have no binomial and are therefore not catalog
species. They are written to `failures.ndjson` with reason `not-a-binomial` rather than
dropped — a record that cannot be ingested is a row, never a warning that scrolls past.

## Expanding

| Target | What changes | What does not |
|---|---|---|
| **100** | A names list, one Actions run, review the artifact | No code |
| **500** | Batched runs with `--limit` and `--checkpoint` | No code |
| **2,000** | The same, over weeks | No code |

**No code change is needed per species.** What does not scale is review, so plan it
explicitly:

- **Eligibility is its own review and its own bottleneck**, separate from both. It is far
  cheaper than full claim review — one determination per species, with a source saying the
  plant has documented medicinal use — but it is still a human reading something, and it
  gates every card. Estimate 10–20 minutes per species once a candidate list exists.
- **Layer A** can be accepted in bulk from GBIF, spot-checked. Promotion `draft → approved`
  is a human decision, but it is a cheap one: the claim is "this name exists and GBIF says
  this about it".
- **Layer C is the ceiling.** At roughly 1.5–2 h per species for identification, lookalikes
  and two verified sources, 100 species is 150–200 hours. Budget it as a permanent part-time
  job, not a project, and prefer 300 species maintained well to 2,000 maintained badly.

### What requires a human, always

1. Setting `medicinal_eligibility` to anything but `pending` — this is what makes a species
   collectible, and no pipeline can do it.
2. Setting `review_status = 'approved'` on anything.
3. Setting `verified = true` on a source — meaning *you opened it and it supports the claim*.
4. Any `toxicity`, `contraindication` or `lookalike-hazard` claim.
5. Resolving a `conflicting` taxonomy status.
6. Publishing a card.

## What is deliberately not built yet

Stage 1 is schema, pipeline and tests. There is **no catalog UI, no renderer, no regional
board and no application of these tables to a Supabase project.** `src/lib/catalog-schema.ts`
is vocabulary and types only — it opens no client and runs no query, because building a read
model against a schema no real ingestion has exercised is how you ship the wrong schema
twice.
