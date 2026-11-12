# Boss Form and expanded profile: implementation plan for approval

**Status: plan only. No code, no migration, no deploy. Migration 0011 is untouched and separate.**
Builds on [`boss-form-and-expanded-profile.md`](./boss-form-and-expanded-profile.md), with the owner decisions of this round.

## 1. The existing quiz safeguard, exactly

Three places state it, and all three stay:

- `CLAUDE.md`: "The knowledge check may only ask what a card prints. ... It must never ask about identification, edibility or safety, where a wrong answer could matter outdoors."
- `src/lib/knowledge-check.ts` header: "It never asks anything a wrong answer could make dangerous — no identification questions, no edibility questions, no 'which of these treats X'. Passing it means the player read their card, and that is all it is allowed to mean."
- `src/lib/knowledge-check.test.ts`: every prompt of every printed card must not match `/heal|treat|cure|remed|safe|edible|eat|dose|medic|identif|poison/i`, and no option may be one of the card's Healing Traits.

### Proposed narrow exception (nothing above is edited or loosened)

1. `knowledge-check.ts` and its test are **not touched**. The card check, the "learned" gate, keeps the full rule.
2. A **separate module** `mastery-challenges.ts` (its own builder, its own test) may ask exactly one extra class of question: **visual or trait comparison between a plant and its curated lookalikes**, drawn only from `card-field-notes.ts` (traits, `distinguishBy`, habitat) and curated, licensed reference photographs. Every question gives immediate explanatory feedback quoting the curated note.
3. It has its **own** forbidden list, enforced by its own test over every prompt, option and feedback string: `/edib|eat|ate|consum|safe|dose|dosage|treat|cure|remed|medic|poison|toxic|forag|harvest|taste|tea|tincture|ingest/i`. No edibility, dosage, treatment, preparation or "is this safe" question can be written.
4. Fixed copy on every challenge screen and result: "Passing this means you studied this guide. It does not mean you can identify or use this plant outdoors."
5. A test fails if either module imports the other, so the exception cannot leak into the learned gate.
6. `CLAUDE.md` gains one added scoping sentence naming the exception; the original rule stays word for word.

## 2. Challenge mechanics (Dandelion pilot)

Prerequisite for everything: the card is **mastered**. Reading or opening a profile records nothing.

| Activity | Id | What the player does | Pass |
|---|---|---|---|
| Part Spotter | `part-spotter` | 4 rounds. A reference photo of one part (rosette leaf, flower head, stalk, seed head); pick the curated trait it shows from 4 options (3 distractors from other species' traits). | 4 of 4 |
| Compare | `compare` | 3 rounds. Dandelion and a curated lookalike side by side; pick the feature that separates them (the real `distinguishBy`, with 3 distractors from other species). | 3 of 3 |
| Habitat and Season | `habitat-season` | 3 rounds. Match the curated habitat and printed season for observing the plant. | 3 of 3 |
| **Boss Trial** | `boss-trial` | 10 mixed questions of the three types. Unlocked only after the three above. | 9 of 10 |

- Every answer gets immediate feedback with the curated explanation. Wrong answers are never penalised beyond the retry.
- Unlimited retries. Each attempt draws a deterministic set from its attempt number, so a retry is a different set of equal difficulty, not a reroll for an easier one.
- Passing the Trial writes the Boss Form. Nothing awards XP. A one-time **"First Boss Form" achievement** is a pure predicate of the new record, so it cannot unlock retroactively.
- Self-declared like all progression: the words are the safeguard, and the plan says so on screen.

## 3. Persistence schema

**Client** (`HerbdexState`, additive):

```
challenges: Record<herbId, Partial<Record<ActivityId, Timestamp>>>   // write-once
bossForms:  Record<herbId, Timestamp>                                 // write-once
```

- `STORAGE_VERSION` 3 to 4 **together with** `MIGRATABLE_VERSIONS`; both fields default to `{}`. Absent means not earned.
- `MASTERY_STAGES`, the garden's exact-inverse map and `progression.ts` are unchanged. XP is still derived only from the old records.

**Server** (one migration, next number after 0011 is not assumed; it is numbered at write time):

```
challenge_completions(user_id, herb_id, activity_id text check in (...), completed_at,
                      primary key (user_id, herb_id, activity_id))
boss_forms(user_id, herb_id, earned_at, primary key (user_id, herb_id))
```

- RLS: select, insert, delete on own rows only. **No update policy**, same as every progression table.
- `boss_forms` insert policy also requires, in the same statement, a `mastered` row for that herb and all three prerequisite completions. The order of facts cannot be forged against the other recorded facts. (The scores themselves are client-claimed, as everywhere in this product.)
- Added to `USER_TABLES`, the account export and account deletion (`account-security.test.ts` fails otherwise).
- No edge-function logic. The shared pure modules (`types.ts`, `herbdex-state.ts`, `achievements.ts`) change, so `npm run sync:edge-shared` runs and `herbdex-action` is redeployed for consistency.

## 4. Migration plan

1. Write and review the migration. Apply to the **test project only**, via the existing run-migration workflow.
2. Run `npm run verify:supabase` plus new cross-user tests (a user cannot insert a Boss Form without mastery or prerequisites, cannot update, cannot touch another user's rows).
3. **Production only on your explicit approval.** 0011 stays separate and unapplied until you decide.
4. Rollout is dark: everything is behind `BOSS_PILOT = ['taraxacum-officinale']`, so production behaves as today for every other plant. A migration is additive, so rollback is to stop reading the new tables.

## 5. Garden and sprite integration

- `GardenStage` stays three values. A separate `SpriteStage = GardenStage | 'boss'` is used only by the sprite lookup and the Garden tile; `MASTERY_BY_GARDEN_STAGE` and its pinned inverse are untouched.
- A Garden tile for a plant with a Boss Form shows the boss sprite and a "Boss Form" chip; its mastery word stays "Mastered".
- Avatar and sidekick keep resolving to flowering at most until you decide otherwise.
- Pausing offscreen, reduced-motion freeze and frame-0 resting pose all apply.

## 6. Dandelion prototype requirements

**Sprite**: `taraxacum-officinale-boss`, the same creature and face as the open flower, same 230x160 frame.
- Botanically honest evolution: the open flower's final life-cycle stage, a **seed head ("clock") crown** with seed parachutes drifting up and away, signature full spin kept.
- 18 frames at 12 fps (already in `SUPPORTED_FRAME_COUNTS`), ink height up to about 108% of the adult (the build check currently enforces 60/80/100; it is extended for `boss` only). Frame 0 is a complete resting pose and one connected piece; `audit_sprites.py` must pass.
- Palette: the existing five shared face colours untouched; a warm gold and white shift.
- Cost: about the size of one existing adult sheet (about 15KB).

**Reference photographs**: **none exist in the repo today.**
- Need 6: rosette leaf, flower head, stalk and latex, seed head, plus a lookalike pair.
- The curated Dandelion lookalike entry names a group ("Cat's-ear and other yellow-flowered daisy-family plants") with no species. A photo pair needs a named, cited species; adding one is a curation edit that must be sourced, not guessed.
- Proposal: Wikimedia Commons only, CC0 or CC BY or CC BY-SA, each license verified and recorded in `sources.json`, attribution shown on the profile, resized to about 640px WebP (about 240KB for six), self-hosted and lazy-loaded, never hot-linked.

**Profile**: Field Identification first (photos, traits, lookalike, habitat, season, and the always-visible safety block), then Herbal Knowledge, Mastery Challenges, Your Progress.

## 7. Expanded profile and access

- One route stays: `/herbdex/[herbId]`. Collection links to it; a new `/learn/plants` index links to the same pages (optional `?from=learn` for the breadcrumb only). No copied content, no second data source.
- **Always visible, before discovery:** Field Identification (traits, photographs, lookalikes, habitat, season), site caution, printed warning, lookalike safety notes, the profile's name and scientific name.
- **Locked until discovery:** collectible card artwork, card back and its Healing Traits, compounds, preparations and taste sections, personal progress, Garden sprite, mastery rewards. The Collection grid still shows an undiscovered card as a mystery.
- Collectible card layout is unchanged.
- Section ids stay stable and `MasteryTrack` and its dialogs keep a fixed tree position.

## 8. Website and iOS compatibility

- All challenge logic is pure TypeScript with no DOM access, behind the existing storage interface, so it ports to a native shell unchanged.
- Assets are static WebP and PNG sheets; no hover-only interaction; 44px tap targets; haptics stay optional.
- Additive only. No existing route, record or threshold changes.

## 9. Open items for approval

1. The exception wording and forbidden list in section 1.
2. The activity set and pass marks in section 2.
3. The photo licence policy, and permission to add one cited lookalike species to Dandelion's curated notes.
4. The schema and the "insert requires mastery and prerequisites" policy in section 3.
5. Whether a Boss Form should ever change the avatar or sidekick.
