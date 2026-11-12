# Boss Form and the expanded plant profile — audit and proposal

**Status: proposal. No code written, nothing deployed.**

## 1. What exists today (audit)

| Area | Today | Source |
|---|---|---|
| Progression | Three stages, forwards only: discovered, learned, mastered. Mastered = discovered + learned + at least one logged sighting (`SIGHTINGS_FOR_MASTERY = 1`). Recorded once, never revoked. | `mastery.ts` |
| Learned | Passing a 4-question card check, drawn only from what the card prints. The check may never ask about identification, edibility or safety. | `knowledge-check.ts` |
| Scope | Learning and mastery are **printed-deck only** (45 species). The 9 Field Cards cannot reach learned or mastered. | `tracksMastery()` |
| Garden | Three growth stages, each mapped 1:1 to a mastery stage, with a pinned exact inverse. No clock. | `garden.ts` |
| Sprites | 54 species, three stage sheets each (sprout, growing, flowering). Built from per-species authored modules; stages are recipes. Frame counts must be in `SUPPORTED_FRAME_COUNTS`. | `build_sprites.py`, `creature-stages.md` |
| Profile page | One route, `/herbdex/[herbId]` (`generateStaticParams` from `CATALOGUE`). 12 bands in a fixed order set by the owner: healing, compounds, field-data, identification, lookalikes, parts, preparations, habitat, taste, sightings, mastery, sources. `sightings` and `mastery` require discovery; the rest are `always`. | `profile-sections.ts`, `HerbDetail.tsx` |
| Undiscovered | `LockedHerb` shows a silhouette and the site caution only; reading is possible through the separate `reveals` store. | `LockedHerb.tsx`, `reveals.ts` |
| Field identification data | Curated and cited per species: 54 entries, each with lookalikes. Site cautions and a card warning exist separately. | `card-field-notes.ts`, `card-cautions.ts` |
| Learn tab | Three destinations: Glossary, Preparation guides, Herbal safety. **There is no botanical library today.** | `app/learn/page.tsx` |
| Persistence | `HerbdexState` = discoveries, learned, mastered, research, achievements; `STORAGE_VERSION = 3`; additive-only migration is valid. Server tables have no update policy. | `herbdex-state.ts` |
| Evidence quality | Not a field today. Sources have a kind (deck, book, journal, database, web) and the page states what is *not* sourced. | `sources.json`, `SourcesSection` |

## 2. Findings that need an owner decision

1. **The knowledge-check rule conflicts with "identification challenges".** CLAUDE.md forbids
   asking about identification, edibility or safety because a wrong answer can matter outdoors.
   Mastery Challenges that test identification need a stated policy (see 5.3).
2. **Field Identification first reverses an owner-set order.** The current sandwich puts Healing
   Traits first and identification fourth.
3. **Ungating safety conflicts with the reveal mechanic.** Undiscovered cards hide name, art and
   content so the flip at discovery has something to reveal.
4. **There is no Learn library to link from.** It is a new index, not a second profile.
5. **Field Cards cannot have a Boss Form** while mastery stays printed-deck-scoped.

## 3. Four-stage progression

| Stage | Garden form | Earned by |
|---|---|---|
| Discovered | sprout | recording a find (unchanged) |
| Learned | growing | passing the card check (unchanged) |
| Mastered | flowering | learned plus a logged sighting (unchanged) |
| **Boss Form** | **boss** (new) | mastered **and** the profile's Mastery Challenges, ending in the Final Challenge |

Design choice: **Boss Form is a fourth form beside the three mastery stages, not a fourth
`MasteryStage`.** `MASTERY_STAGES`, the garden's exact-inverse map, `herbdex-action`'s
reconcile and the existing tests stay as they are. `bossForm` is a separate write-once record;
the garden resolves to `boss` when it exists for a mastered plant.

## 4. Persistence and migration

- New write-once record `bossForms: Record<herbId, Timestamp>` on `HerbdexState`, plus
  `challengeProgress` (per-activity completions, write-once).
- Additive: `STORAGE_VERSION` 3 to 4 **together with** `MIGRATABLE_VERSIONS`. Absence means "not
  earned", so **no existing player receives a Boss Form**. Nothing is derived from existing
  `learned` or `mastered`, so opening or completing a basic card cannot grant one.
- Server: one new migration (next number) adding `boss_forms` and `challenge_completions` with
  select/insert/delete policies only, added to `USER_TABLES`, the export, and account deletion
  (`account-security.test.ts` fails otherwise). **Test project first. Production only on your
  approval. Migration 0011 is still unapplied and must stay untouched.**
- XP: Boss Form pays **no XP** in the first version, so the level ladder and Field Card
  thresholds cannot move. A one-time **Boss badge** is a pure predicate of the new record, so
  it cannot unlock retroactively.
- Retroactivity: nothing to backfill, because the records start empty.

## 5. Mastery journey inside the expanded profile

1. Reading and opening never count. Only completed, scored activities write a record.
2. A Boss attempt requires `mastered` first.
3. Activity types (proposed): trait recall from the card, a preparations and parts check, a
   lookalike comparison, and a Final Challenge of mixed questions with a pass mark and
   re-draws on retry. **Identification activities are comparison-and-feedback, never
   certification**, ask nothing about edibility, dosage or whether something is safe to
   consume, and say so. Needs your approval because it relaxes the current rule.
4. Content is gated per species by a `bossReady` list (like `tracksMastery`), so "eventually
   every plant" does not block shipping a few.
5. Self-declared like all progression: the words are the safeguard, not detection.

## 6. One profile, two entry points

- **Canonical route stays `/herbdex/[herbId]`.** No second profile, no parallel data.
- Collection card links there (already true). New Learn tab index `/learn/plants` lists
  species and links to the same page, optionally with `?from=learn` for the breadcrumb only.
- Four sections, mapped from the existing bands so no content is duplicated:
  1. **Field Identification** (first, most prominent): identification, lookalikes, habitat,
     field-data, parts seen in the field, seasonality.
  2. **Herbal Knowledge**: healing traits (existing non-claim framing), compounds, preparations,
     taste, usable parts, sources and evidence quality, safety.
  3. **Mastery Challenges**: the card check plus the new activities.
  4. **Your Progress**: discovery and sightings history, sprite evolution, requirements, Boss
     progress.
- Section ids stay stable and `MasteryTrack` and its dialogs keep a fixed tree position
  (the repo has recorded that bug twice).

## 7. Undiscovered plants and safety

Recommended tiers: **Tier S, always visible, no discovery:** site caution, card warning,
lookalike list and the dangerous-lookalike notes, and "never eat from an app". **Tier F, field
identification:** visible in the Learn library and on the profile. **Collection art, card back
content, Healing Traits, sprite and rewards stay discovery-gated**, so the reveal keeps its
payoff. Discovery then unlocks personal progress and rewards, not safety. Needs your decision:
how much of Tier F shows on an undiscovered card inside Collection.

## 8. Visual asset needs

- Printed species only: **45 Boss sprites**, one animated sheet each. Field Cards excluded.
- Recipe, not a fresh character: same creature and face, a distinct silhouette (crown or aura
  layer, richer particles), more frames, and a signature gesture that belongs to the plant.
- Pipeline: extend `build_sprites.py` with a `boss` stage, add its frame count to
  `SUPPORTED_FRAME_COUNTS`, audit with `audit_sprites.py` (face placement, connectivity).
- Size: current 162 sheets are 1.5MB in total; 45 more of the same size is about 0.5MB, loaded
  only in the Garden and profile.

## 9. Staged plan (each stage needs its own approval)

1. Profile architecture: four sections, ungated Tier S/F, Learn index. No progression change.
2. Challenge engine and content for a pilot of 3 species, local only.
3. `bossForms` record, migration, achievement, tests against the test project.
4. Boss sprites for the pilot species and Garden rendering.
5. Remaining species in batches.

## 10. Open questions

See section 2 and 7.
