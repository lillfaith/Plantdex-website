# Measuring the identifier

Two exercises, in this order. The first is cheap, repeatable and wrong in a known direction.
The second is expensive, unrepeatable and the only one that describes what a player meets.

Neither tunes anything. Every threshold in this system — `confidenceBand`, the
`IDENTIFY_PROFILE` edge, whether the third photograph is worth asking for, whether
`MIN_IMAGES` should be two — is a number these exercises exist to inform. Changing one
before the measurement is how the last three wrong numbers got in.

---

## 1. The automated benchmark

`scripts/identify_web_images.py` in benchmark mode, scored by
`benchmark/report.bench.test.ts` with the real `matchScientificName` and `outcomeFor`.

### What it can answer

| Axis | How |
| --- | --- |
| 1 vs 2 vs 3 photographs | The same set at each count. Needs `MIN_IMAGES` below 2 for the 1-photo arm — see **The one blocker** below. |
| PlantNet vs plant.id | Comparison mode: one request from an allow-listed account asks both and records both. The same photographs, same request, same scoring code. |
| Slot 3 tagged `auto` vs tagged truthfully | `p3auto` against `p3tag`. One word changes; nothing else does. |

### What it cannot answer, and must say so

- **Commons photographs are cleaner than what a player sends.** Framed, in focus, usually by
  somebody who already knew the species. Every rate is an **upper bound** on field
  performance, not an estimate of it.
- **A category returns different individuals.** Three photographs from a category are three
  plants, not three views of one — which is exactly what the photo-count axis is trying to
  measure. The manifest carries `sameIndividual` per set and the report prints how many sets
  had it; a run of all-false may flatter three photographs (more variation for the model) or
  penalise them (a blended answer). Fixing it means hand-picking a photo series by one
  photographer into `files`, which `RESOLVE=1` exists to help with and which spends nothing.
- **Ground truth is the Commons category name.** A miscategorised file scores as a provider
  failure.
- **The sample is small.** Every rate is printed with a 95% Wilson interval. Two rates whose
  intervals overlap have not been shown to differ. The paired counts are what make a small
  run worth running at all: comparing two rates of twelve throws away the pairing, while
  counting the sets where two conditions *disagree* uses it.

### What it reports

Four separate numbers that must never be summed into an "accuracy":

- **provider led with the right species** — a question about PlantNet or plant.id, nothing to
  do with the deck.
- **Plantdex offered the right outcome** — for a deck species, the expected card, confirmable,
  first. For a species with no card, the opposite: no card offered at all, because the Seed
  Shelf is the correct answer.
- **right card anywhere in the list** — the ceiling the UI could reach by ranking better.
- **WRONG card offered in first place** — the one that matters. A miss sends somebody to the
  shelf; this writes a false discovery into their collection from one tap.

Plus the outcome distribution, `confidenceBand` and `speciesConfidence` distributions, the
leading-score spread, a per-set table, and a tally of repeated confusions.

### Cost

One PlantNet identification per request. A request made with the **comparison account's**
token asks both providers, so it also costs one plant.id (Kindwise) credit — which is how
the whole provider axis costs one credit per set instead of doubling the run.

`DRY_RUN=1` prints the exact budget and sends nothing. Run it first, every time.

### Quotas

5/day for an anonymous caller per IP, 30/day signed in, 450/day globally. The anonymous
bucket is what makes a run take a week, so the unpaid conditions should go out as a
**second, ordinary account that is not on the comparison allow-list** — `PLAIN_USER_EMAIL` /
`PLAIN_USER_PASSWORD`. That buys the 30/day bucket and spends no credit.

### The one blocker

The endpoint refuses fewer than two images (`MIN_IMAGES = 2`), so the 1-photograph arm
cannot run against any current deployment. Sending the same photograph twice is not a
substitute — the provider treats the set as one individual and two identical views is a
different request from one view.

Answering it needs `MIN_IMAGES` to become an env-overridden floor, defaulted to 2 and set
only on the **test** project. That is a real change to a shared function and is not made
here. Until it is, `p1` is left out of the default conditions and a run that includes it
records the 400 rather than a result.

### Running it

```bash
# 1. Budget. Sends nothing.
DRY_RUN=1 MANIFEST=scripts/benchmark/sets.json \
  PROJECT_REF=... ANON_KEY=... python3 scripts/identify_web_images.py

# 2. Which Commons files a set would use. Sends nothing.
RESOLVE=1 MANIFEST=scripts/benchmark/sets.json ... python3 scripts/identify_web_images.py

# 3. The run. This spends.
MANIFEST=scripts/benchmark/sets.json PROJECT_REF=... ANON_KEY=... \
  USER_EMAIL=... USER_PASSWORD=...            # the allow-listed comparison account \
  PLAIN_USER_EMAIL=... PLAIN_USER_PASSWORD=... # an ordinary second account \
  python3 scripts/identify_web_images.py

# 4. Read the alternate provider's rows back. Spends nothing.
COMPARISONS=1 PROJECT_REF=... ANON_KEY=... USER_EMAIL=... USER_PASSWORD=... \
  python3 scripts/identify_web_images.py

# 5. Score it with the real matcher.
npx vitest run --config vitest.bench.config.ts
```

A 429 stops the run and leaves the JSONL valid; `ONLY=set-a,set-b` resumes it.

---

## 2. The field protocol

30 to 50 scans with an ordinary phone, outdoors, by somebody who is not looking at the code.
This is the measurement that counts. The benchmark above tells you which way to lean; this
tells you whether the thing works.

### The rule that makes it valid

**Write down what the plant was BEFORE reading what the app said.** A ground truth recorded
after seeing the answer is not a ground truth — it is agreement with the answer, and it will
report near-perfect accuracy every time. Note the species (or "unsure", which is a legitimate
and useful entry) in a notebook, then tap.

Where you are unsure, photograph it well enough to settle later and mark the row
`truth: pending`. Rows that stay pending are dropped, not guessed.

### What to record per scan

The database already holds most of it. `scans` carries the provider's leading answer, the
candidate the player confirmed, the rank, the eligibility and the species confidence, and
`identification_comparisons` carries both providers' full lists when the account is
allow-listed. What it cannot hold is the two things only the person standing there knows:

| Column | Why the app cannot supply it |
| --- | --- |
| `truth` | Nothing in Plantdex verifies that anybody went outside. Progression is self-declared, by design. |
| `difficulty class` | The reason this scan is in the sample. |

Keep a sheet with: local time, truth, difficulty class, how many photographs, which organs,
and one free-text line on what happened on screen. Local time is enough to join it to the
`scans` row afterwards.

### Composition

Aim for roughly this shape. The point is not a representative sample of the world — it is
coverage of the ways this can go wrong.

| Class | Count | Why |
| --- | --- | --- |
| Easy deck species, good photographs | 6 | The control. If these move, nothing else is readable. |
| Deck species, **leaves only, no flower** | 6 | The commonest real scan and the hardest. Most of the deck is identified off its flower. |
| Deck species, **partial plant** — one leaf, a trodden rosette, a seedling | 5 | What a plant in a pavement crack actually offers. |
| Deck species, **poor angle or light** — backlit, overhead, in shade, wet | 5 | Ordinary phone conditions. |
| **Lookalike pairs**, both members | 6 | Including at least one hazardous pair. Wild carrot and poison hemlock; the two deck *Rumex*; *Capsella bursa-pastoris* and *rubella*. This is where a wrong confident answer costs something. |
| **Off-deck species**, common ones | 6 | The Seed Shelf rate is a measurement, not an assumption. The deck's 45 were chosen around plants people meet, so how often a scan lands on a card is genuinely open. |
| **Same individual, 1 vs 2 vs 3 photographs** | 4 individuals x up to 3 scans | The field version of the benchmark's weakest axis, and the only one where "same individual" is guaranteed. Budget for these: they are several scans each. |
| **Not a plant** — a rock, a fence, a photograph of a card | 3 | `isPlant` is `boolean \| null` and only an explicit `false` blocks. Worth knowing what actually happens. |

That lands around 45 scans plus the repeats. At 30/day signed in it is two sessions.

### What to read out of it

The same four numbers as the benchmark, plus three the benchmark cannot produce:

- **The Seed Shelf share.** How often an ordinary scan finds no card. Assume nothing here.
- **Where the wrong confident answers cluster.** One `WRONG card offered in first place` in a
  lookalike pair is worth more attention than five misses everywhere else.
- **Whether the confidence bands mean anything.** `confidenceBand` cuts at 0.7 and 0.35 and
  those numbers were chosen, not measured. Do the `strong` answers turn out right more often
  than the `moderate` ones? If the bands do not separate, they are decoration on a page about
  telling plants apart.

### What not to do with the result

Do not tune a threshold on the same scans that measured it. If the field run suggests a
change, the change gets its own confirming run — otherwise the number is fitted to forty-five
photographs of one person's neighbourhood in one season.
