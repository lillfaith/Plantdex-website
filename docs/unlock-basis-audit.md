# Where synonym identity is lost, and the smallest way to get it back

**Nothing here is implemented.** This is the trace and the plan.

## 1. The loss is at ONE site, and it is one line

`src/lib/plant-match.ts`, in `matchScientificName`:

```ts
const exact = BY_BINOMIAL.get(name);
if (exact) return withTaxon({ kind: 'exact', eligibility: 'exact', herbId: exact, confirmable: true });

// A different name for the same plant is the same plant: `exact`, and confirmable.
const synonym = ACCEPTED_NAME_SYNONYMS[name];
if (synonym) {
  return withTaxon({ kind: 'exact', eligibility: 'exact', herbId: synonym, confirmable: true });
}
```

**Two branches, each of which knows exactly which one fired, and both write the same literal.**
The information is not missing upstream and is not lost gradually — it is discarded at the
return statement, in the second branch, in the word `'exact'`. That is the whole of it.

The comment above it is not wrong: *a different name for the same plant is the same plant*. It
justifies `kind: 'exact'`, which should stay. What it silently also decided was the **record**.

**Downstream is pure propagation.** `confirmScan` writes `match.eligibility` into
`sightings.eligibility` and `scans.confirmed_eligibility`. No other site derives or rewrites it,
so fixing the return fixes the record everywhere.

**`MatchKind` should NOT gain a `synonym` member.** It drives what the UI says, and for a
synonym the UI's claim — *this is the card's species* — is true. Two vocabularies answer two
questions: `kind` is how to talk about the match, `eligibility`/`unlockBasis` is what happened.
Only the second needs the new value.

## 2. The schema

| | Today | Needs changing? |
| --- | --- | --- |
| `sightings.eligibility` | `text`, CHECK with 7 values (`0006`:66-69) | **Yes** — widen to admit `synonym` |
| `scans.confirmed_eligibility` | `text`, **no CHECK at all** (`0006`:137) | No, and that asymmetry is worth a look on its own |

### The real defect is one layer up, and it predates this question

`Eligibility` is a **bare type union**. `TAXON_RANKS` and `SPECIES_CONFIDENCES` are **arrays with
their types derived**, and CLAUDE.md says why in as many words: *the database repeats both as
CHECK constraints and a union gives nothing to compare a migration against.*
`identification-schema.test.ts` holds both of those equal to the migration's CHECK — **and does
not do it for `eligibility`**, which appears in that file only in a column-name list.

So today: add `'synonym'` to the type, forget the migration, and **nothing fails**. The build is
green, the app emits the value, Postgres rejects the insert, and the sighting is lost — the exact
failure CLAUDE.md describes for a constraint narrower than its union. **Fix that before anything
else**, because it is what makes every later step safe rather than lucky.

## 3. Rows

**No row needs migrating, and none should be.**

A backfill is *computable* — `observed_taxon_key` is stored, and a row whose key is in
`ACCEPTED_NAME_SYNONYMS` with `eligibility = 'exact'` was a synonym match. **Do not do it.** That
key is stored rather than recomputed precisely because the normaliser's and the synonym table's
rules are free to move; recomputing would answer with today's rules and silently rewrite why a
past observation reached a card. A row recorded as `exact` accurately records what the code
asserted when it was written.

**Historical rows stay untouched and readable.** `legacyGenus` stays in the CHECK permanently —
readable, never newly issued — for the same reason: deleting a value makes old rows unreadable,
and the only way to "fix" them would be to rewrite history.

**Observed taxon is not touched by any of this.** `observed_taxon_provider_name`, `_name`, `_key`
and `_rank` are a separate set of columns answering a separate question, and no step below reads
or writes them.

## 4. Smallest safe plan

Five steps, in this order. **The ordering is the safety property**, not a preference.

1. **Make `Eligibility` an array + derived type, and pin it to the CHECK** in
   `identification-schema.test.ts`, exactly as `TAXON_RANKS` is. **Zero behaviour change**, and
   from here a forgotten migration fails in `npm test` instead of in production.
2. **Migration `0007`: widen the CHECK** to admit `synonym`. Widening only — no row is read,
   written or rewritten. **Deploy this before step 3.**
3. **Change the one return site** to `eligibility: 'synonym'`. `kind` stays `'exact'`.
   `card-coverage.ts` and `plant-match.ts` are both in `PURE_MODULES`, so this needs
   `npm run sync:edge-shared` and a redeploy of the functions that import the matcher.
4. **Rename `eligibility` → `unlockBasis` separately, or not at all.** It is a pure rename across
   the type, the column, both adapters and the tests; bundled with step 3 a reviewer cannot see
   which change is which. It buys clarity, not correctness.
5. **`curatedEquivalent` arrives with the first curated equivalent**, never before. Adding a value
   nothing can emit is a vocabulary nobody can check.

**The one real sequencing risk:** if step 3 ships before step 2, every synonym match becomes a
rejected insert and a lost sighting. Step 1 is what makes that impossible to do by accident.
