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

### The pilot

Six sets, marked `pilot` in the manifest and selected with `PILOT=1`: two easy deck species
(*Plantago major*, *Taraxacum officinale*), two known-hard deck species (*Rumex obtusifolius*
— the 0.616-to-0.303 spread that made `outcomeFor` read rank rather than a score; *Viola
sororia* — the `relatedOnly` case), one easy off-deck species (*Bellis perennis*) and one
off-deck species that is a lookalike of a deck card (*Capsella rubella* against the deck's
*C. bursa-pastoris*).

A spread of **difficulty**, not of coverage. The first thing a six-set run can tell you is
whether an aggregate is broad or is being carried by one or two hard species, and that needs
both ends of the range present. The genus-card and Field Card paths are deliberately out:
each exercises one eligibility branch, and neither is where the accuracy question lives.

Four conditions x six sets = 24 requests, **6 Kindwise credits**. Read it per set first and
in aggregate second — six sets is not enough for the aggregate to be the interesting number.

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

### The 1-photograph arm

It exists to answer one question: **does the second photograph buy enough accuracy to
justify making every player take it?** That is a requirement the product imposes on
everybody, chosen from an argument rather than a measurement, and it cannot be evaluated by
a harness bound by the very floor it is evaluating.

So `identify-plant` reads `IDENTIFY_MIN_IMAGES` (`src/lib/observation-bounds.ts`). It is set
**only on the test project**. Unset — which is what production is, and stays — the floor is
`MIN_IMAGES`, and the endpoint behaves exactly as before.

The resolver fails safe asymmetrically, which is why it is a function rather than a
`Number()` call: a typo that *raises* the floor costs one scan, loudly, while a typo that
removes it (`0`, `-1`, `''`, `two`, `1.5`, a stray quote from a dashboard field) silently
turns off a check on a public endpoint. Anything that is not a positive integer is the
fallback; anything above `MAX_IMAGES` is clamped, because a floor above the ceiling would
refuse every request that could ever be made. `observation-bounds.test.ts` pins all of it,
including the regression that would otherwise typecheck, deploy, pass everything and do
nothing — adding the override while leaving the comparison on `MIN_IMAGES`.

Sending the same photograph twice is **not** a substitute. Both providers treat the set as
one individual, so two identical views is a different request from one view.

`p1` stays out of the default conditions: against a deployment that has not set the variable
every p1 request is a 400, and spending quota to record the same refusal is measuring the
floor rather than the photographs.

### Running it

```bash
# 1. Budget. Sends nothing.
DRY_RUN=1 MANIFEST=scripts/benchmark/sets.json \
  PROJECT_REF=... ANON_KEY=... python3 scripts/identify_web_images.py

# 2. Which Commons files a set would use. Sends nothing.
RESOLVE=1 MANIFEST=scripts/benchmark/sets.json ... python3 scripts/identify_web_images.py

# 3. The run. This spends. PILOT=1 selects the six sets the manifest marks.
PILOT=1 CONDITIONS=p1,p2,p3auto,p3tag SIGNED_IN=p3auto \
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

## What the Commons pilot established

Two findings, both closed, both preserved here because the temptation on each is to
"fix" it by weakening a taxonomy rule that is working correctly.

### `Capsella rubella` -> `C. bursa-pastoris` was a PROVIDER misidentification

Traced through the real modules. PlantNet was shown *Capsella rubella* and answered
*Capsella bursa-pastoris* — the binomial the deck card prints. `BY_BINOMIAL` hit on the
first branch and returned `exact` / confirmable, which is the only correct response to that
input. The card's scope is `{"type":"species"}`, the narrowest setting there is; nothing
broadened, no synonym, no genus rule, no accepted group. Had the provider been right,
`Capsella rubella` resolves to `sameGenus` / `related` / **not confirmable** and goes to the
Seed Shelf, exactly as intended.

**Plantdex contributed no error.** No setting of the matching code prevents this, because
the input string was the deck's own species name. Any remedy is about PRESENTING provider
uncertainty — not about tightening taxonomy, and not about an absolute confidence floor:
this false card scored 0.635-0.877, HIGHER than most correct matches in the same run, so a
floor would refuse more true finds than false ones.

### `Taraxacum officinale` -> `T. mattmarkense` was ALSO a provider misidentification

`Taraxacum mattmarkense` Soest is in **`T.` sect. *Alpina***, not sect. *Taraxacum*. Its
protologue (van Soest 1959, *Acta Botanica Neerlandica* 8: 86, "Alpine species of
Taraxacum") describes it as "a remarkable member of *T.* sect. *Alpina*, confined to the
western part of the Alps"; Euro+Med gives its range as Austria, Bulgaria, France, Italy and
Switzerland. It is accepted (IPNI 253957-1, GBIF 5697122).

The Dandelion card's accepted group is `Taraxacum` sect. *Taraxacum* (IPNI 254151-1, syn.
sect. *Ruderalia*). **A different section.** So the refusal was CORRECT: adding
*T. mattmarkense* would assert that a western-Alpine endemic is the common dandelion
aggregate.

This looked like a curation gap and is not one. It is the Capsella failure pointing the
other way — one over-matches, one under-matches, both because the provider named the wrong
species. **No Dandelion scope change was made and none is warranted on this evidence.**
Curating sect. *Taraxacum* microspecies speculatively, with no evidence the provider ever
returns them, would add false-positive surface to solve a problem nobody has demonstrated.

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

**`confidenceBand`'s 0.70 and 0.35 are not moved on pilot evidence.** Six sets cannot
separate a band from noise: a 24-request run puts a handful of answers in each band, and
every rate it produces carries an interval tens of points wide. Calibration observations get
written down — which band each answer landed in, and whether it turned out right — and the
thresholds wait for substantially more data. A threshold moved on six sets is a threshold
fitted to six sets.
