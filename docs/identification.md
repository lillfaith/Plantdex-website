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
provider actually returned.

### Two representations of one name, and why

`taxon-name.ts` builds the **identity**; `normalizeName` builds the **key**. They answer
different questions and neither substitutes for the other.

| Provider string | Identity (`observed_taxon_name`) | Key (`observed_taxon_key`) | Rank |
|---|---|---|---|
| `Taraxacum officinale F.H.Wigg.` | `Taraxacum officinale` | `taraxacum officinale` | species |
| `Plantago major subsp. intermedia` | `Plantago major subsp. intermedia` | `plantago major` | subspecies |
| `Mentha × piperita` | `Mentha × piperita` | `mentha piperita` | species |
| `Quercus x leana` | `Quercus × leana` | `quercus leana` | species |
| `Taraxacum sect. Ruderalia` | `Taraxacum sect. Ruderalia` | `taraxacum sect ruderalia` | section |
| `Rubus fruticosus agg.` | `Rubus fruticosus agg.` | `rubus fruticosus` | **unknown** |

The identity used to be rebuilt from the key, and that manufactured names: `Mentha piperita`
and `Quercus leana` are not taxa. **Dropping a hybrid sign does not generalise a name, it
invents a species** — on a product about telling plants apart. Both representations are stored,
because the key is also the *reason* a card was reached, and recomputing it later would answer
with the normaliser's rules of that day rather than of the day the observation was made.

**Ranks.** Above the species: `genus`, `subgenus`, `section`, `subsection`, `series` — none of
them resolves *which* species, whatever the score. At or below it: `species`, `subspecies`,
`variety`, `form` — all four settle the species, so all four give a real
`species_confidence`. And `unknown`, which is the **conservative failure**: a qualifier the
parser does not know (`agg.`, `convar.`, `grex`, `nothosubsp.`, a bare third epithet) is never
promoted to `species`. It resolves to `unresolved` confidence and the qualifier stays visible
in the identity.

### What a confirmed scan writes

Three records, and they are not the same fact:

| Record | Level | Holds |
|---|---|---|
| `discoveries` | **card** | that this Plantdex card is unlocked for this player, and nothing else |
| `sightings` | **evidence** | the observation — card, provider string, identity, key, rank, eligibility, species confidence, provider |
| `scans` | **evidence** | the provider's **top** candidate *and*, separately, the candidate the player **selected** |

### A discovery is a claim about the collection, not about the plant

`discoveries` is `{herbId: timestamp}`. It carries no taxon, no rank, no eligibility, no
confidence and no provider, and that is **deliberate and settled** — not an omission waiting
to be filled in.

- It is what XP, mastery, Field Research, the garden, the achievements and the collection
  percentage all count, and every one of them counts **cards**. A confidence column here
  would be a value those systems could start reading, which is how a card-level record
  quietly becomes a second, weaker species claim.
- It is reachable with no identifier at all — the card page records a find from two taps and
  no camera. A taxon field would be null for most real rows and present for the rest, and a
  field that means "this one happened to come in through the scanner" is not evidence.
- The evidence already exists one layer down, with its provenance attached.

**So a surface that needs to say how a card was earned reads the sightings for that
`herbId`** — where the taxon, the rank, the eligibility reason and the species confidence all
are. Do not add taxonomic or confidence columns to `discoveries`.

The sighting goes through `sightings-store.ts`, so a signed-out player's observation is kept in
localStorage by the same call that writes the Supabase row signed in — there is no second
anonymous history to keep in step. It does **not** master the card on its own:
`qualifiesForMastery` still requires `learned`, so this satisfies the sighting half and leaves
the knowledge check where it was.

`scans` holds both candidates because a player who scrolls past the leading answer and confirms
a lower one otherwise leaves a row reading `top = Oxalis dillenii 0.41` beside
`confirmed = Wood Sorrel`, with nothing saying `Oxalis dillenii` was **rejected**. That row
attributes a taxon to somebody who explicitly declined it.

**Card membership never promotes a candidate.** `outcomeFor` reads rank — whether the
provider's *own* leading answer is confirmable — and never a score and never "is one of these a
Plantdex card". A 0.09 deck species sitting below a 0.41 non-deck one leaves the outcome
`uncertain`, which is the honest rendering.

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

**There is exactly one, it is still open, and `observed-taxon.test.ts` fails if a second
appears.** It is Goldenrod (`solidago-canadensis`). Card #03 prints a binomial, not `spp.`, so
under the curated model it has no business claiming its whole genus — it holds that scope only
so live coverage does not narrow silently before the research is done. *Solidago* is a large,
taxonomically difficult genus, and the accepted species list is a botanical question, not an
implementation detail; inventing it here would be inventing botany, which this project does not
do anywhere else either.

**Status: TEMPORARY, pending botanical curation.** Every match through it is tagged
`eligibility: 'legacyGenus'` — never `acceptedGroup`, never `genusCard` — so the rows written
during this period are findable later by the reason they were written, and the observation is
never rewritten to *S. canadensis*.

Curating it means replacing the scope with an `acceptedGroup` whose members each carry a `note`
and a `source`. That is a content change with a data migration of zero rows: existing sightings
keep their own observed taxon and are unaffected either way. Until then: do not broaden it, do
not narrow it, and do not populate that list by reading a flora and guessing.

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
- `observation-persistence.test.ts` — the whole path from a provider string to a stored row, driving the real local and remote adapters
- `taxon-identity.test.ts` — ranks, hybrid notation in both spellings, conservative failure
- `observed-taxon.test.ts` — the three facts, kept apart
- `card-coverage.test.ts` — scopes and accepted-group curation rules; `observed-taxon.test.ts` holds `pendingCuration` to one entry
- `observation-photos.test.ts` — the 2/3 slot rules
- `edge-shared.test.ts` — the generated `_shared` copy matches source, and every specifier resolves under Deno

`npm run check:edge` type-checks the Deno half, which the rest of `verify` structurally
cannot: `supabase/functions/**` is excluded from this project's tsconfig and ESLint because it
is a different runtime. **It runs as part of `npm run verify`**, between `typecheck` and
`test`, so an edge-function change cannot pass verification without it. It fetches a Deno
toolchain on first run and is cached after.

**That gap was not theoretical.** Its first run reported 14 errors in `providers.ts`: the
`failure()` helper typed its `kind` parameter as
`IdentificationResult extends { kind: infer K } ? K : never`, which looks like it selects the
failure half of the union and does not — a conditional type distributes over a naked *type
parameter*, never over a concrete union alias — so it evaluated to `never` and every call site
was an error. 1,084 green unit tests could not see it.

What neither suite can check: that the **deployed** function is this checkout, and that a
**live** provider response matches the adapter. Step 4 above is the only way to find out.
