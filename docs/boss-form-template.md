# Adding a plant to the Boss Form

The engine does not change when a plant is added. A plant is **content**: one file, one registry
line and one list entry.

## The shape every plant has

| Stage | Played | Pool the plant supplies | Pass |
|---|---|---|---|
| Part Spotter | 3 | 4 | 2 |
| Compare | 2 | 3 | 2 |
| Habitat | 2 | 3 | 2 |
| Boss Trial | 5 | 6 | 4 |

That is 16 active questions per plant, 12 played. The numbers live only in `STAGE_RULES`
(`src/lib/boss-form.ts`). A retry replays the whole stage and leaves out a different question each
time, so the pool is always larger than the number played.

## Checklist

1. **Choose the facts.** Pick botanical facts already in the plant's curated field notes
   (`card-field-notes.ts`). Each question names the phrase it tests (`fact`); a test fails if the
   phrase is not in the notes. Do not invent botany.
2. **Provide licensed photographs.** CC0 iNaturalist only. Register each in `boss-images.ts` with its
   photo id and licence; record provenance under `evidence/boss-form-photos/`. Crops keep the
   parent's id and say so.
3. **Write about 16 questions** in `src/lib/boss-species/<plant>.ts`: `active` (exactly the pool
   sizes above) and `archived` (anything else drafted). Spread the skills across a stage; make the
   Boss Trial the multi-clue stage; ask which *picture shows* something rather than what a photograph
   lacks; remind the player that one feature never identifies a species.
4. **Register it.** Add the species to `BOSS_SPECIES` (`challenge-bank.ts`) and the plant id to
   `BOSS_PILOT` (`boss-form.ts`), then run `npm run sync:edge-shared` and add the file to
   `PURE_MODULES` in `scripts/sync-edge-shared.mjs`. A test fails if the two lists differ.
5. **Run the structural check.** `speciesProblems(species, STAGE_RULES)` must return nothing (the
   engine test runs it). It checks pool sizes, ownership, unique ids, distinct answers and that no
   active question is gated.
6. **Botanical review.** A named reviewer and a date for every question in `CHALLENGE_REVIEWS`, and
   every asset a question `requires` in `READY_ASSETS`. Nothing is served or awardable until then.
7. **Appearance and reward.** A Boss Form is cosmetic: the plant's `boss` sprite stage and Garden
   plate. It pays no XP. Nothing in the engine changes for a new look.
8. **Review packet.** `scripts/build_reviewer_packet.mjs` builds the packet for the registered plant.

## What a plant must never do

Ask about eating, preparation, safety or medicine; present a photograph as proof of species; or
treat archiving, registering or listing as approval.
