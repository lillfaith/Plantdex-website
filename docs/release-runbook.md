# Production deployment runbook — identification release

**Nothing in this release is deployed.** Everything below is the plan.

TEST project `vgjehmwcpavflbfhbbrp` · PRODUCTION project `vygiamigomwlvnwkryyl`.

> **Merging IS deploying the frontend.** `deploy.yml` runs on push to the default branch
> (`claude/planning-session-61zwro`). The merge is step 6 and must not happen earlier.

---

## Release gate — run immediately before step 0

| Check | Result |
| --- | --- |
| `npm run verify` (lint, typecheck, test, build) | **1260 passed / 85 files** |
| `npm run check:edge` (4 Deno entrypoints) | **clean** |
| Card-scope audit | 43 exact · **1 curated equivalent** · 1 complex · 9 genus · **0 unclassified** |
| Identification audit (314 probes, 54 cards) | **0** non-confirmable probes reaching `matched` |
| Progression / XP integrity | **0** digital-only cards paying XP · **0** tracking mastery |
| Unresolved scopes | **0** |
| `pendingCuration` entries | **0** |
| New `legacyGenus` issuance | **0** |
| Mixed-rank accepted groups | **0** |

The gate is these numbers, not a green tick: if any is non-zero, stop.

---

## Step 0 — checkpoint and rollback tag

**Before any schema change.** This is the only step that cannot be done afterwards.

1. Confirm **PITR is enabled** on PRODUCTION, or take an on-demand backup, and **record the
   timestamp**. 0006 and 0007 are additive, but "additive" is a property of the SQL, not of
   the run.
2. Tag the current production commit so a frontend rollback needs no archaeology:
   ```
   git tag -a pre-identification-$(date +%Y%m%d) <current default-branch sha>
   git push origin pre-identification-$(date +%Y%m%d)
   ```
3. Record the currently deployed function versions (`seed-packet`, `identify-plant`), so
   step 7 has something concrete to roll back to.

## Step 1 — migration 0006 (`0006_identification.sql`)

Adds the observed-taxon columns to `sightings` and the identification-comparison table.
**Additive and nullable**: nothing backfills, and a sighting logged by hand from a card page
still has no observed taxon, which is correct rather than missing.

Verify after applying:
```sql
select column_name from information_schema.columns
 where table_name = 'sightings'
   and column_name in ('observed_taxon_provider_name','observed_taxon_name',
                       'observed_taxon_key','observed_taxon_rank','eligibility',
                       'species_confidence','identification_provider');
-- expect 7 rows
```

## Step 2 — migration 0007 (`0007_unlock_bases.sql`)

Widens the `sightings.eligibility` CHECK to admit **`synonym`** and **`curatedEquivalent`**.
Widening only; no row is read, written or rewritten.

### THE ONE BLOCKING VERIFICATION IN THIS RUNBOOK

**0007 must be live before any function or frontend that can write those values.** A CHECK
narrower than the code does not degrade: Postgres refuses the insert and **the sighting is
lost**. Run this against PRODUCTION and read the output — do not infer it from a green
migration log:

```sql
select pg_get_constraintdef(oid)
  from pg_constraint
 where conrelid = 'public.sightings'::regclass
   and conname  = 'sightings_eligibility_check';
```

**Proceed only if the printed definition contains both `'synonym'` and `'curatedEquivalent'`.**
If it does not, stop: steps 3-6 all ship code that can emit them.

Belt and braces, on a throwaway row in a scratch schema or against TEST first:
```sql
-- must succeed under 0007 and fail under 0006
select 'curatedEquivalent'::text in ('exact','synonym','acceptedGroup','curatedEquivalent',
       'genusCard','legacyGenus','ambiguous','related','none');
```

## Step 3 — `seed-packet`

```
npm run sync:edge-shared          # must be clean: `edge-shared.test.ts` already enforces it
npm run check:edge
supabase functions deploy seed-packet --project-ref vygiamigomwlvnwkryyl
```

**Before `identify-plant`, deliberately.** It applies `isShelfEligible` server-side, and this
release narrows what is confirmable — Goldenrod's genus override is gone, and seven names are
excluded. Deploying the shelf's view of eligibility first means a species that stops resolving
to a card can be shelved from the moment the scanner stops resolving it, with no window where
it is neither.

## Step 4 — `identify-plant`

```
supabase functions deploy identify-plant --project-ref vygiamigomwlvnwkryyl
```

Confirm production secrets are **unchanged**: `PLANT_IDENTIFICATION_PROVIDER` unset or
`plantnet`, `IDENTIFY_MIN_IMAGES` **unset** (production keeps the 2-photo floor; only TEST
ever had it at 1). plant.id is not involved in this release.

## Step 5 — post-function smoke, before the frontend

The functions are live and the old frontend still calls them. Verify the seam:
- one scan through the deployed TEST frontend against PRODUCTION functions, or
- `check_live_scan.py` with the production ref typed in deliberately.

Confirm a sighting row writes with a non-null `eligibility`. **This is the step that would
catch a missed 0007**, while the only thing deployed is reversible in one command.

## Step 6 — frontend merge and push

```
git checkout claude/planning-session-61zwro
git merge --no-ff claude/plantdex-v0-3-supabase-verify-iic8pz
git push origin claude/planning-session-61zwro      # this deploys
```

`deploy.yml` builds and publishes to Pages; `check_live_site.py` runs automatically after and
asserts **which Supabase project the deployed bundle points at** — a live site writing into
the test project looks like it is working and is worse than no backend.

## Step 7 — rollback

| Failure | Action |
| --- | --- |
| Frontend broken | revert the merge commit, push — Pages redeploys from the tag in step 0 |
| Function misbehaving | redeploy the version recorded in step 0 |
| Schema | **do not roll back 0006/0007.** Both are additive and widening; reverting a CHECK would make rows written since then unreadable. Fix forward. |
| Data corruption | PITR to the step-0 timestamp. This is the only path that loses writes, so it is last. |

---

## Remaining pre-merge decisions

### Genuinely unresolved — these need you

**1 · Does this release ship without the full provider benchmark?**
The pilot and two field runs happened; the full PlantNet-vs-plant.id matrix did not, and
plant.id stays benchmark-only by your decision. **Still a judgement call**, unchanged by any
work since: the question is whether PlantNet's measured behaviour is enough to launch on.

**2 · When is the custom domain cut over?**
`SITE_DOMAIN` is unset, so the site ships on github.io with the `/Plantdex-website` base path.
`docs/custom-domain.md` is the runbook and its fourth step is in a dashboard no test can reach
(Supabase's redirect allow-list). **Independent of this release** — do it before or after, not
during.

### Resolved since you last asked

**3 · `e15e4d3` — RESOLVED, and my recommendation is unchanged: exclude it.** Scope and
dependency, not convenience: nothing in this release imports it, and it would widen the merge
for no identification benefit.

**4 · Migration ordering — RESOLVED.** It was open because only 0006 existed. There are two
now and the order is fixed above, with the 0007-before-functions check as the one blocking
gate.

**5 · Goldenrod scope — RESOLVED.** Anchor *S. canadensis* + `curatedEquivalent`
*S. gigantea*, approved and frozen.

**6 · Elderberry / Pine safety text — RESOLVED.** Both cautions approved and frozen; the
*S. ebulus* exclusion and the digital-correction layer ship with them.

### Deliberately deferred, not blocking

- `eligibility` → `unlockBasis` rename. **Semantic correctness is done**; the rename is
  cosmetic and would touch a column, two adapters and the tests for no behavioural gain.
  Post-launch, or never.
- The six curated-equivalent candidates (Burdock, Wood Sorrel, Strawberry, Lamb's Quarters,
  Chickweed, Mallow) — frozen until after this release.
- *S. altissima* — insufficient evidence, non-confirmable, revisit only with new evidence.
- Maple's **Leaf** claim and the four ambiguous `Pinus` strings — card-content and
  unresolvable-name questions respectively; neither is a scope or safety blocker.

---

## Post-release infrastructure tasks

Recorded during step 0, deliberately **not** done during this release.

**`deploy.yml` has no `paths` filter**, so every push to the default branch rebuilds and
redeploys Pages — including commits that touch only CI workflows or scripts. Three such
commits triggered production deploys during release preparation. No application source
changed, so the deployed bundle was identical each time and `check-live-site` passed, but they
were production deploys all the same.

The fix is a `paths-ignore` (or a `paths` allowlist) that excludes workflow-and-script-only
changes while still deploying anything touching `src/`, `public/`, `next.config.ts`,
`package.json` or the deploy workflow itself. **Not done now**, because changing the
deployment mechanism immediately before a release is the wrong moment to find out the filter
is too narrow — a missed deploy is harder to notice than an extra one.

---

## Pre-migration production baseline — recorded 2026-10-02, before migration 0006

**Backup.** Local logical dump `~/plantdex-backup-20261002T033033Z` (owner's machine, off-repo).
`roles.sql` 7.0K `c1e874aee5c139d29772555ab8a1f585e1e6c21bf073b04cb386c97eb4195d13` ·
`schema.sql` 307K `b9e2dc23a4f9e9a14ea56ca68cc9afc77e1cb54dc130f7eea8804d0007e67853` ·
`data.sql` 96K `5c52c328b897acfd32c2a3fda58a49f1479e9c80f5882e0462d8bac1a554fbeb`.
**Logical dump, not PITR; database only, no Storage objects.** PITR is disabled by decision.

**Rollback tag.** `pre-identification-20261002` → annotated `227805ca…` →
commit `2943b438c32b3b585f2e0177cefcc45871aacef6`.
App-content baseline, recorded separately: `5000daf13f4bfd24abb26bc939e51d1c68ffa02a`.

**Edge functions.** A step-0 re-check found every version +3 against the first reading
(13/15/11/9 → 16/18/14/12) with `updated_at` byte-identical on all four. Investigated
read-only: no CI deploy in the window, function ids and `created_at` unchanged, and
`seed-packet`'s entrypoint path still named its version-9 extraction directory. The dashboard
then showed `identify-plant`'s last deployment as **19 days ago**, which settles it: the
counter moved for a platform reason and the code did not.

| function | baseline version | `ezbr_sha256` |
| --- | --- | --- |
| `delete-account` | 16 | (not captured at this reading) |
| `herbdex-action` | 18 | `71b0c99f00f518e5fa4cbac6517f2677cfaf14c54772a472b71e8a15fe2db912` |
| `identify-plant` | 14 | `cb888321bc1a751ae4ce80cdf20ff7232898008d3835704c81eb9817f12a7ca2` |
| `seed-packet` | 12 | `e10d9ce23db6fb67a773881123e07a968b4cd50e4de4de1c8b8afc3c49b13901` |

**A VERSION COUNTER IS NOT A DEPLOYMENT RECORD, and this cost an hour to establish.** The
first checkpoint stored version, status and `updated_at` and no bundle hash, so when the
counter moved there was nothing to diff and the question could only be answered sideways.
`scripts/function_identity.py` captures `ezbr_sha256` for exactly this reason; the hashes above
are the baseline, and any future drift is now provable rather than arguable.

**Rows before 0006:** `sightings 3 · discoveries 27 · profiles 2 · seed_shelf 16 ·
species_packets 16`.
