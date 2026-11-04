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

**A species may be catalogued with no card, and made collectible with no medicinal content
at all.** That is the entire point. Collapsed into one table, every one of 2,000 species
would need a safety review before it could be listed, and the catalog would never grow past
what one person can read.

Measured, in this repository: `src/lib/trait-evidence.ts` holds trait-level medicinal
evidence for **one species**; `src/data/sources.json` holds 154 references, 127 verified,
across 45. That is the real rate. Layer C is sized to it; Layers A and B are not.

## What the database refuses

These are constraints, not conventions. `supabase/tests/0010_botanical_catalog.test.sql`
exercises each against a real PostgreSQL.

- **An approved claim with no named reviewer and date.**
- **An approved claim with no citation.**
- **An AI-drafted claim that is approved.** `drafted_by = 'ai-assisted'` and
  `review_status = 'approved'` cannot coexist in a row. A model's output may never *be* the
  published state; a human has to re-author it. Agreement between models reaches nothing.
- **A toxicity note that forgot to be high-risk.** `high_risk` is derived from `kind` by a
  trigger, because the row that most needs the flag is the one most likely to be missing it.
- **`medicinally_relevant` with no stated basis and source.** A catalog that cannot say why
  something is in it is a list somebody made up.
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

- **Layer A** can be accepted in bulk from GBIF, spot-checked. Promotion `draft → approved`
  is a human decision, but it is a cheap one: the claim is "this name exists and GBIF says
  this about it".
- **Layer C is the ceiling.** At roughly 1.5–2 h per species for identification, lookalikes
  and two verified sources, 100 species is 150–200 hours. Budget it as a permanent part-time
  job, not a project, and prefer 300 species maintained well to 2,000 maintained badly.

### What requires a human, always

1. Setting `review_status = 'approved'` on anything.
2. Setting `verified = true` on a source — meaning *you opened it and it supports the claim*.
3. Any `toxicity`, `contraindication` or `lookalike-hazard` claim.
4. Setting `medicinally_relevant`, with a basis and a citation.
5. Resolving a `conflicting` taxonomy status.
6. Deciding a species becomes collectible.

## What is deliberately not built yet

Stage 1 is schema, pipeline and tests. There is **no catalog UI, no renderer, no regional
board and no application of these tables to a Supabase project.** `src/lib/catalog-schema.ts`
is vocabulary and types only — it opens no client and runs no query, because building a read
model against a schema no real ingestion has exercised is how you ship the wrong schema
twice.
