# Plant identification

How a photograph becomes a card, a Seed Shelf packet, or an honest "we are not sure" — and
which of the three distinct facts along the way live where.

Plantdex talks to one of two providers, chosen by a **server-side** environment variable.
Neither key ever reaches the browser: the browser posts images to
`supabase/functions/identify-plant`, and that function is the only thing in this project that
knows a provider's hostname.

---

## The three facts that must not be collapsed

This is the whole design, and every bug this system has had was two of these being treated as
one.

| Fact | Where it lives | What it means |
|---|---|---|
| **The observed taxon** | `PlantMatch.observedTaxon`, `sightings.observed_taxon_*`, `scans.top_scientific_name` | What the provider said this plant **is**, at whatever rank it said it |
| **Card eligibility** | `PlantMatch.eligibility`, `CardScope` in `card-coverage.ts` | Which Plantdex card, if any, this observation **qualifies for**, and why |
| **Species confidence** | `PlantMatch.speciesConfidence`, `sightings.species_confidence` | How strong the **species-level** identification is — `unresolved` above species rank, whatever the score |

A card is not a taxon. The Goldenrod card's binomial is *Solidago canadensis*, and an
observation of *Solidago altissima* can qualify for it. Before the observed taxon existed as
its own record, that observation was stored as `solidago-canadensis` and the real name
survived nowhere the player could see — **the card had become the record of the plant.** It
must not do that again.

A supra-specific taxon is not a species. `Taraxacum sect. Taraxacum` qualifies for the
Dandelion card; it is never rewritten to *Taraxacum officinale*, and its species confidence is
`unresolved` at any score, because a section that certainly is a section still has not told
you which of its species you are looking at.

**The provider's own string is the historical record.** `normalizeName()` drops authorship,
folds synonymous section names onto one key, and its rules are free to change — so it is a
**lookup key** and never the thing we remember. `observed_taxon_provider_name` holds what the
provider actually returned; everything else may be recomputed from it.

---

## Card coverage

`src/lib/card-coverage.ts` decides what a card accepts. Three scopes:

| Scope | Meaning |
|---|---|
| `species` | The card accepts exactly its own binomial (plus checked synonyms). The default, and most of the deck. |
| `acceptedGroup` | The card accepts an **explicitly curated** list of taxa, each with a `note` saying why and a `source`. A member may be supra-specific. |
| `genus` | The card accepts the genus. Only legitimate with `pendingCuration` — see below. |

**An accepted group is research, not inference.** Nothing derives accepted taxa from genus
membership. A card that accepts three species accepts them because somebody looked each one
up and wrote down why; the note is what makes that decision re-readable six months later, and
these decisions touch what somebody might eat.

### `pendingCuration`

A `genus` scope is a placeholder, not a design. It says: this card behaved as genus-wide
before the accepted-group model existed, the botany has not been curated yet, and the
behaviour is held unchanged rather than silently narrowed or broadened under somebody.

**There is exactly one, and `observed-taxon.test.ts` fails if a second appears.** It is
Goldenrod (`solidago-canadensis`). *Solidago* is a large, taxonomically difficult genus, and
the accepted species list is a botanical question, not an implementation detail — inventing it
here would be inventing botany, which this project does not do anywhere else either.

Curating it means replacing the scope with an `acceptedGroup` whose members are researched and
sourced. That is a content change with a data migration of zero rows: existing sightings keep
their own observed taxon and are unaffected either way.

---

## The provider seam

```
browser ──images──► identify-plant ──► PlantNet   ─┐
                         │                         ├─► NormalizedIdentification
                         └───────────► plant.id   ─┘
                                                        │
                        browser ◄── candidates ─────────┘
                                       │
                                       ▼
                         plant-match.ts  (matching happens on the CLIENT)
```

`PLANT_IDENTIFICATION_PROVIDER` selects the adapter. **Unset means `plantnet`**, which
reproduces today's behaviour exactly, so deploying the seam changes nothing until somebody
chooses. An **unknown** value is a configuration error and refuses the request — falling back
to the default would let a typo look like a working deployment while answering from a provider
nobody selected.

Both adapters return the same `NormalizedIdentification`:

```ts
{ provider, isPlant: boolean | null, candidates: IdentificationCandidate[] }
```

`isPlant` is `null` for PlantNet, which does not answer that question. **Only an explicit
`false` blocks a scan** — `null` must never be read as a yes.

Parsing is **fail-closed**: a response that does not match the shape the adapter expects
produces a `schema` failure rather than a partial or invented result. Nothing fabricates a
taxonomy structure a provider did not send.

### The observation: two to three photographs

Both providers treat a submitted set as **one individual plant**. The browser asks for:

| Slot | Organ tag | |
|---|---|---|
| 1 | `habit` | Whole plant — **required** |
| 2 | `leaf` | Close-up — **required** |
| 3 | `auto` | Identifying feature — optional, recommended |

Below two, the Identify button is disabled; the endpoint refuses independently, because it is
reachable without the button and the count is the entire basis of the answer. Above three, it
refuses too. Every image goes through `prepareImage` with `IDENTIFY_PROFILE` — re-encoded, so
EXIF and its GPS are gone, with **no path that returns original bytes**.

---

## Configuring plant.id

Nothing below is done for you, and **plant.id must not be switched on without a real key and
one validated real response.**

1. **Get a key** from Kindwise (plant.id v3). Keep it out of the repository — there is no
   `.env` file in git that should ever hold it, and `shop.test.ts`/`account-security.test.ts`
   fail the build on key-shaped literals in source.
2. **Set the secrets** on the Supabase project:
   ```
   supabase secrets set PLANT_ID_API_KEY=...
   ```
   Leave `PLANT_IDENTIFICATION_PROVIDER` alone for now — the key being present changes
   nothing while PlantNet is still selected.
3. **Deploy the function**: `supabase functions deploy identify-plant`. The shared modules
   under `supabase/functions/_shared/herbdex/` are generated — run `npm run sync:edge-shared`
   first if anything in `PURE_MODULES` changed, or the deployed copy drifts from this
   checkout.
4. **Validate against one real response, before switching anybody over.** Turn on comparison
   mode for your own account only (below) and scan two or three real plants. That runs
   plant.id alongside PlantNet on the same photographs, records both answers, and **serves the
   player PlantNet's** — so a broken adapter cannot reach anybody. Read the rows:
   ```sql
   select observation_id, provider, top_scientific_name, top_probability, failure
   from identification_comparisons order by created_at desc;
   ```
   A `failure` of `auth` means the key is wrong. A `failure` of `schema` means the adapter and
   the live API disagree about the response shape, and **that is the one thing you cannot find
   out from documentation** — it is the reason this step exists.
5. **Only then** set `PLANT_IDENTIFICATION_PROVIDER=plantid` and redeploy.
6. **Roll back** by unsetting it. There is no data migration either way: the provider is
   recorded per scan row, and old rows keep saying what actually answered them.

---

## Comparison mode

Off by default, and it takes **two** switches plus an explicit account:

```
IDENTIFICATION_COMPARISON=on
IDENTIFICATION_COMPARISON_USER_IDS=<uuid>,<uuid>
```

A flag alone would mean "every signed-in player is now in an experiment". It doubles the
shared API spend, and it keeps a record of somebody's scans for a purpose they had no part in.
The list holds the ids of whoever is running the evaluation; an anonymous caller is never in
it, because there is no id to match and no account for the row to belong to.

When active, both providers are called **in parallel** (so the wait is the slower of the two,
not their sum) and one row per provider is written to `identification_comparisons`, sharing an
`observation_id`. The alternate's answer is **recorded and dropped** — it never reaches the
response, or an allow-listed account would silently be using a different identifier from
everybody else and the comparison would be measuring the wrong thing.

The write is detached and caught. Telemetry that fails is a missing row, which is the correct
way for it to fail; somebody standing in front of a plant must never be told identification
failed because an evaluation row did.

**What the table holds:** the names, ranks and scores each provider returned, capped at five
candidates, plus a failure kind. **No photograph, no photo path, no IP, no quota bucket, no
location.** It is user-scoped, so it is in the data export and in `USER_TABLES` — telemetry
somebody cannot download or delete is not telemetry, it is a record kept about them.

**Confirmation is a join, not an update.** `scans.identification_observation_id` carries the
same id, and `scans.confirmed_herb_id` already holds what the player confirmed:

```sql
select c.provider, c.top_scientific_name, s.confirmed_herb_id
from identification_comparisons c
join scans s on s.identification_observation_id = c.observation_id
where s.confirmed_herb_id is not null;
```

That shape is deliberate. There is no update policy on either table, by design — a record of
what an identifier said on a given day is history — so anything that would need one is the
wrong design.

---

## Environment variables

| Name | Where | Unset means |
|---|---|---|
| `PLANTNET_API_KEY` | Supabase function secret | PlantNet cannot be used; a scan on `plantnet` returns `unconfigured` |
| `PLANT_ID_API_KEY` | Supabase function secret | plant.id cannot be used; a scan on `plantid` returns `unconfigured` |
| `PLANT_IDENTIFICATION_PROVIDER` | Supabase function secret | `plantnet` |
| `IDENTIFICATION_COMPARISON` | Supabase function secret | off |
| `IDENTIFICATION_COMPARISON_USER_IDS` | Supabase function secret | nobody |
| `SPECIES_ATTESTATION_SECRET` | Both `identify-plant` and `seed-packet` | Scanning works; **no new species mints** (fails closed — see `registry-trust.md`) |
| `SCAN_QUOTA_SALT` | `identify-plant` | Derived from the service-role key; not a hole, but set it so the salt can rotate independently |

The key gate follows the **selected** provider. It used to read `PLANTNET_API_KEY`
unconditionally, which on a plant.id deployment would have refused every scan as unconfigured
and blamed a provider nobody was using.

---

## Testing

`npm test` never spends a provider credit. The adapters are exercised against **hand-written**
fixtures describing only fields confirmed from Kindwise's own maintained examples — there is
no captured real API response committed here, and nothing in the suite makes a network call.

- `identification-providers.test.ts` — normalisation, fail-closed parsing, confidence bands
- `identification-schema.test.ts` — 0006 against the types it has to stay level with, and the two comparison gates
- `observed-taxon.test.ts` — the three facts, kept apart
- `card-coverage.test.ts` — scopes and accepted-group curation rules; `observed-taxon.test.ts` holds `pendingCuration` to one entry
- `observation-photos.test.ts` — the 2/3 slot rules
- `edge-shared.test.ts` — the generated `_shared` copy matches source, and every specifier resolves under Deno

What the suite **cannot** check: that the deployed function is this checkout, and that a live
provider response matches the adapter. Step 4 above is the only way to find out.
