# Herbdex Expansion (#57-141): how the 85 digital cards inherit progression

**Status: DESIGN FOR OWNER REVIEW. Nothing here is active.** No `src/` logic, reducer, UI, workflow, flag, generated data or database was
changed. The only code added is a read-only numbers script, a draft migration that nothing reads, and its schema test. Owner direction of
2026-11-25 is applied: the 85 cards are digital-only at first, named **Herbdex Expansion**, carry their own internal digital collection id, sit
inside the ONE Herbdex, and are not permanently limited to zero XP, no mastery and no Garden. They take part in the same systems as the
original cards **without new XP values and without disturbing anyone's existing progress.**

Inputs: `CLAUDE.md`, `agents/README.md`, `agents/ownership.json`, `docs/expansion/pilot-plan.md`, the two audits (`integration-map.md`,
`field-matrix.csv`, `inventory.csv`), and the code named in each row. Every number below is reproduced by
`python3 scripts/expansion-audit/progression_numbers.py`, which reads the constants out of the TypeScript sources and the card data out of
`herbs.json` and `inventory.csv`, and exits non-zero rather than guess.

## 0. The answer in one screen

**Inherits cleanly (REUSE EXISTING RULE, no new value):** the discovery XP table (Common 100 / Uncommon 175 / Rare 300 / Epic 500), the flat
50 and 100 for learning and mastery, `SIGHTINGS_FOR_MASTERY = 1`, the knowledge-check rule, idempotent stage transitions, the garden's
mastery-to-growth map (no clock), the 25 / 250 / 500 research table, the daily-task templates, the board's 50 / 15 / 100, the free-collection
cap, derived XP, achievement thresholds that count cards (10, 25, 5 Rare), frames and titles that count mastery (10, 15), scanner matching by
exact binomial, and the Seed Shelf's "grown into a card" derivation. Not one row of any existing player's data has to change.

**Needs an owner decision (section 6):** whether Field Card unlocks share the one XP pool (the design default) or stay calibrated to the
printed deck; what sits above Level 11; ratifying each card's draft rarity before release (it is XP, and XP is derived); whether to show a
blended "of 130"; whether the expansion gets standing research tasks of its own; how a daily is weighted across 130 cards; whether expansion
discoveries score on the Field Board from day one; and any expansion-only achievement, frame or title.

**Would invent a new value, so refused (section 7):** an XP figure for any expansion card, a different mastery or learning award, level
thresholds above 15,000, new Field Card thresholds, any board point value, habitat or season assignments, and a "Collection 02".

**Would break an existing player's progress if done naively (section 8):** swapping `getPrintedCard` for the catalogue (Field Cards would
start paying 2,550 XP between them and fund their own next unlock), moving the denominator from 45 to 130 (a finished printed deck reads 35%),
pooling the research supply (the winter task's targets double for anyone mid-way), counting every discovery toward "Complete Collection"
(**already true today for Field Cards**), tying counting to a flag or removing a released id (XP, derived, would fall), and editing a card's
rarity after release.

## 1. The collection: `herbdex-expansion`

Proposed id **`herbdex-expansion`**, name "Herbdex Expansion", short name "Expansion". Checked against `src/lib/collection.ts` and its tests:

| Rule in the code | Result for `herbdex-expansion` |
|---|---|
| `collectionOf()` falls back to Collection 01 when a card names none, "right for the printed 45, and silently wrong for a digital card"; `catalogue.test` fails any digital entry that omits `collectionId` or names one that does not resolve | Every one of the 85 must declare it. Verified in the audit (A1 vs A2 runs): without it the card silently joins the physical deck. |
| `COLLECTIONS` must contain it for `getCollection()` to resolve | One added entry: `{ id, name, shortName, size: 85, current: false, medium: 'digital' }`. |
| `PRINTED_COLLECTIONS` is the set "nothing may claim a second collection exists" governs, and `collection.test` pins it at one | `medium: 'digital'` keeps it out. Same precedent as `field-cards` (size 9, `current: false`). |
| `size` is "the shape of the set, not a count of what has been drawn" | 85 from day one, so a player holding two reads "2 of 85". Pinned against the inventory the way `FIELD_CARDS_TOTAL` is pinned against its slots. |
| `cardNumberInCollection` defaults to `cardNumber`; the pilot plan reserves 57-141 and forbids renumbering | Labels read "Expansion · Card #57" (the Field Cards read #48-56 the same way). Restarting at #01 is possible through the existing field but is a numbering decision, listed in section 6. |
| No second printed collection may be claimed; copy may not invent a date, size or price | The name never contains "Collection 02", and `shortName` must not. |
| Database | No table holds a collection id (grepped across 0001-0013), so naming it needs no migration. |
| Id shape | Kebab-case, distinct from `collection-01` and `field-cards`. |

**Verdict: the id is valid and costs one registry entry plus the per-card declaration. REUSE EXISTING RULE.**

## 2. The one mechanism everything else hangs from: participation is a property of the collection

Today three different questions are all answered by `getPrintedCard`:

1. *Is this a card in the box somebody bought?* (shop, `/start`, the home page, "of 45")
2. *Does this card take part in progression?* (XP, learning, mastery, achievements, research, garden, profile, frames, titles)
3. *Can I show a name and picture for this id?* (avatar, recent finds, task rows)

The Field Cards already proved they are different questions: they answer **yes to 3, yes to discovery, no to 2, no to 1.** The smallest
design is to give question 2 its own single predicate instead of widening any existing one:

- `participates(herb)`: true for printed cards, true for a card in a digital collection that declares full participation
  (`herbdex-expansion`), false for `field-cards`. One definition in one coordinator-owned module; XP, mastery, achievements, research, garden,
  profile and titles call it. `getPrintedCard` stays exactly as it is and keeps answering question 1.
- **Why not "everything in the catalogue":** `getPrintedCard(id)?.xp` is the only reason a Field Card pays zero. Widened to the catalogue it
  would pay the numbers stamped on the artwork (250, 150, 350, 350, 350, 250, 250, 250, 350 = **2,550 XP**), which can cross the next
  Field Card threshold, which is the runaway the code says it prevents.
- **Counting must not depend on a flag, and a released id can never leave.** XP is derived from records; if the function that prices a
  record could be switched off, turning it off would demote a player whose records had not changed. So the flag controls *offering and
  recording* (what the catalogue serves), never *counting*; and an id that has been released stays in the participating set permanently.
  A safety hold on a released card is done by suppressing its content, not by removing the id.
- **A card participates only if it is released**, meaning it is in `CATALOGUE`. The importer already gates that (`publicationGate`
  READY/HELD, and it checks `rarity`, `xp`, `season` and stats against the deck's own tables). A HELD card is not in the catalogue, so it
  cannot be recorded, cannot appear as a daily, and cannot appear as a quiz distractor.
- **Per-system data completeness gates the system, not the card.** A card with no habitat assignment is not in any habitat task (it is not
  guessed into one); with no sprite it renders the pilot's defined missing-sprite state; with no six back fields it offers no knowledge check.
  This is how the 85 can enter in batches without any system inventing a missing fact.

**Two flags, not one.** `NEXT_PUBLIC_EXPANSION_PILOT` (exists on `coord/pilot-flag-and-board`, defaults to `off`) decides whether the
catalogue serves the cards. A second, **`NEXT_PUBLIC_EXPANSION_PROGRESSION`** (proposed, default `off`), decides whether they are *offered* XP,
learning and mastery. Both only gate what is shown and written; neither is read by anything that derives a total. A card readable and
scannable but not yet earning is the state the pilot plan already describes for "digital-only, zero XP", and it is the safe first state.

## 3. Audit and proposal, system by system

Tags: **REUSE** = existing rule, no new value. **DECISION** = needs the owner. **INVENT** = would need a value that does not exist; refused.
"Naive" means "append the 85 and let the code inherit by accident".

### 3.1 Economy

| # | System | Rule and source | What naive inheritance does (numbers from the real tables) | Proposal | Tag |
|---|---|---|---|---|---|
| 1 | **Discovery XP** | `XP_BY_RARITY` 100/175/300/500 (`progression.ts`); `xpForDiscoveries` prices through `getPrintedCard`; `applyDiscovery` returns `getPrintedCard(id)?.xp` | The drafts are 47 Common, 23 Uncommon, 10 Rare, 5 Epic = **14,225 XP**. Discovery XP 8,750 → **22,975** (×2.63). Printed cards: 18 / 14 / 10 / 3. Combined 65 / 37 / 20 / 8. | Price expansion cards from `XP_BY_RARITY[herb.rarity]` through `participates`. A test asserts every participating card's stamped `xp` equals the table (the importer already enforces it; the audit confirmed all 85). | REUSE |
| 1b | **Draft rarity is unreviewed** | Rarity is "the Encounter Rate printed on the card"; for these it is an editorial draft. XP is derived, so changing a rarity after release rewrites every holder's XP | n/a | Ratify each card's rarity before release and snapshot it in a test; after release a rarity is frozen (same family of rule as "never re-tune a threshold"). | DECISION |
| 2 | **Learning, mastery** | `XP_FOR_LEARNING` 50, `XP_FOR_MASTERY` 100 (flat, "effort is the same for every card"); `SIGHTINGS_FOR_MASTERY = 1`; `tracksMastery` = printed only | +85 × 150 = **12,750**; ceiling (`MAX_COLLECTION_XP`) 15,500 → **42,475** | Participating cards get the same three stages. No new number. | REUSE |
| 3 | **Levels** | `LEVELS`, 11 entries, L11 at 15,000, "anchored to `MAX_COLLECTION_XP`" so the ladder is "climbable by collecting" | L11 sits at **96.8%** of today's ceiling; of the combined ceiling it is **35.3%** (65.3% of discovery alone). A fully discovered printed deck is L8 (8,750); printed + all 85 discovered is **L11** with room to spare. No existing player moves: levels are derived and nobody holds an expansion record. | Extend **upward only** (append entries, never re-tune; `progression.test` pins this). The thresholds themselves are numbers that do not exist. Option (a): leave L11 as the top and correct the doc comment that says it is "just short of a fully mastered deck". Option (b): the owner supplies appended thresholds. | **DECISION; the values would be INVENT** |
| 4 | **Field Card unlocks** | `FIELD_CARD_SLOTS` 600, 1,200, 2,200, 3,600, 5,500, 7,000, 8,750, 11,000, 14,000; derived from XP, recorded as a ratchet (`unlocked-field-cards.ts`, keyed by account) | As a share of the printed ceiling the thresholds run 3.9% to 90.3%; of the combined ceiling, **1.4% to 33.0%**. Slots 8 and 9 (11,000 and 14,000) need 2,250 and 5,250 XP beyond a fully discovered printed deck today; with the expansion, discovery alone reaches both (printed + expansion discovery = 22,975). 6 expansion Commons reach slot 1 exactly as 6 printed Commons do. Nobody loses a card: derived ∪ recorded. | **A (default, no code):** one XP pool; expansion collectors unlock sooner. **B:** Field Cards read an XP figure computed over the printed deck only, so the ladder keeps its calibration, at the cost of a second XP number (CLAUDE.md: "one number is going up"). **C:** append new slots, which needs new thresholds (INVENT). | **DECISION (A recommended)** |
| 5 | **Mastery track, knowledge check** | `KNOWLEDGE_CHECK_POOL = PRINTED_CARDS`; questions come "from the card in hand", distractors from other real cards; both drawn with `seeded(hash(herb.id))`; never asks about identification, edibility or safety | Pooling the 130 changes the distractors, therefore the questions, of **every existing card** (no record changes, but the quiz a player knows is different) and could show an unreleased card's text as a wrong answer. | Distractors come from the card's **own collection**, so Collection 01's 45 quizzes stay byte-identical (snapshot test). A card offers the check only when its six back fields are present and released. `knowledge-check.test`'s two rules run over every participating card. | REUSE |
| 6 | **Garden** | `garden.ts`: mastery stage maps to growth stage, reads no clock; `GardenView` iterates `printedCardsInDeckOrder()` and prints "N of 45 planted" | Expansion plants appear as their cards are discovered. Sprite sets are approved for **5 of 85** (inventory), so 80 plants have no art. | Mirrors mastery for participating cards (no new growth rule, no timer; the owner's 2026-11-19 reaffirmation stands). Cards without a set use the pilot's missing-sprite state. "N of 45" stays on Collection 01; the Expansion gets its own count. UI lane request. | REUSE |
| 7 | **Completion and denominators** | `PRINTED_DECK_SIZE` read by `profile-stats` (`completionPct`), `HerbdexProvider` (`deckSize`), `GardenView`, `achievements`; `Collection.size` already exists per collection | Naive 130: a finished printed deck reads **35%**; 36/45 reads 28% instead of 80%; 22/45 reads 17% instead of 49%. Every player appears to regress overnight. | Each collection reports its own `size`. Collection 01's 45 remains the headline everybody already sees; the Expansion shows "N of 85". A blended figure is not shown unless the owner asks. | REUSE (per-collection); blended: DECISION |

### 3.2 Challenges

| # | System | Rule and source | Naive | Proposal | Tag |
|---|---|---|---|---|---|
| 8 | **Standing Field Research** | 12 tasks: `seasonal:{4}` 500 XP each, `collection:backyard` (5 fixed Common ids), `collection:hard-to-find`, `collection:habitat-{5}` at 250. Every target is `min(n, supply)` over `RESEARCH_POOL = PRINTED_CARDS`. "No task may be impossible." Completion recorded once, never revoked. | Pooled supply with the draft seasons: spring 14→37, summer 22→67, autumn 8→24, **winter 1→2**. Spring/summer/autumn targets stay 3/2/1, but **winter's become discover 2, learn 2, master 1, from 1/1/1**: a player who had found and learned the one winter card is moved from 1 of 1 to 1 of 2. Hard to Find supply Rare 10→20, Epic 3→8 (targets stay 5 and 1). Backyard is five fixed ids and does not move. | Keep all 12 **defined over Collection 01 exactly as they are** (each task takes its collection as its pool; a snapshot test pins every target and id). The expansion joins research through the daily board only (next row). | REUSE |
| 8b | **Expansion-specific standing tasks** | Reward kinds are fixed (`RESEARCH_XP` 25/250/500). Any `seasonal:` or `collection:` id **scores 100 board points** (`SCORING_TASK_PREFIXES`; `is_scoring_task` lists ids), and `seasonal-sweep` counts every id that starts with `seasonal:` (≥ 4) | A new `seasonal:expansion-*` id would let the "Four Seasons" badge unlock from a mixture and would pay 100 board points. | Not proposed. If the owner wants them: new ids need `is_scoring_task`, `seasonal-sweep` must name its four ids, and each pays an existing table value. | **DECISION** |
| 9 | **Daily board** | 3 a day from `RESEARCH_POOL` × 4 templates, seeded by the date, 25 XP each; `daily:{find,learn,revisit,master}:<id>` | If the pool is 130, the "find" daily names a printed card only **35%** of the time (45/130) instead of 100%: the board mostly names cards a player has not met (the other three templates need a held card, so they dilute only for players who hold expansion cards). Server side, `herbdex-action` resolves daily ids from its bundled `research.ts`, so a stale bundle rejects the new ids. | Pool = participating released cards, same templates, same 25 XP. Whether to weight toward cards a player already holds is a small owner call. | REUSE; weighting DECISION |
| 10 | **Achievements** | `discoveredCount()` is `Object.keys(state.discoveries).length`, **every key**; `complete-collection` is `>= PRINTED_DECK_SIZE`; `epic-finder` is `>= 3` (literal); `rare-finder` 5 via `getPrintedCard` | **Existing defect, reproduced:** a state with 36 printed cards and the 9 Field Cards discovered unlocks `first-find, forager-10, explorer-25, complete-collection` and all six habitat badges. With 130 discoverable ids it becomes ordinary: any 45 of them is "Complete Collection", and through it the `starlight` frame and the `curator` title. Widening the pool also lets any 3 of 8 Epics satisfy "every Epic in the deck". | Count-based predicates (10, 25, 5 Rare) count participating discoveries: REUSE, same thresholds. The two that mean *the deck* (`complete-collection`, `epic-finder`) are scoped to Collection 01 with the denominator **read from the collection**, not a literal. Recorded achievements are never revoked, so the fix stops future false unlocks and takes nothing back. An expansion-completion badge is a new id and is optional. | REUSE; new badge DECISION |
| 11 | **Frames and titles** | `field-frames.ts`, `field-titles.ts`: pure predicates; `masteredCount` through `getPrintedCard`; bloom 10, cardwright 15; starlight/curator via `complete-collection` | Same as row 10. | Mastery counts use `participates` (same 10 and 15). Starlight and curator follow Collection 01's completion, unchanged. | REUSE |
| 12 | **Seasons, habitats, quests, findability** | `habitat.ts` assignments are site-authored and keyed to printed ids; `quest-board`, `findability`, `regional-nearby` read printed cards plus regional occurrence data; season comes from the card | The 85 have **no habitat assignments** and no regional occurrence data. Season exists on the drafts (spring 23, summer 45, autumn 16, winter 1). | A card joins a habitat, quest or regional list when and only when that data has been researched for it. Nothing is inferred from genus, season or a neighbour. Regions are not a prerequisite (pilot plan). | REUSE (data-gated); assigning without research is INVENT |

### 3.3 Scanning, shelf, board, cap, copy

| # | System | Rule and source | Naive | Proposal | Tag |
|---|---|---|---|---|---|
| 13 | **Scanner and Seed Shelf** | `plant-match.ts` indexes `CATALOGUE`; `confirmable` = exact or genus card; `isShelfEligible` = "no confirmable card for this species"; "grown into a card" is derived from the collection; claiming calls the ordinary `discover()` with `at` = the date it was found | The 85 become `exact` matches. Four share a genus with live cards (*Rumex crispus*, *Plantago lanceolata*, *Trifolium repens*, *Echinacea angustifolia*). Four tests change (section 5). A shelved packet of any of the 85 begins to sprout the next time it is read. | Exact binomial and checked synonyms only (pilot plan 4). Claiming a sprouted packet pays the card's rarity XP once, through the existing idempotent `discover()`. That is the one place existing players can gain XP without a new find, and it is an explicit tap by design. | REUSE |
| 14 | **Field Board** | 50 per species, 15 per journal species, 100 per challenge, UTC daily cap 4; `is_catalogue_herb` (0013) lists **54** ids and refuses any other on `discoveries`, `learned`, `mastered`, `sightings`; standings count only listed ids | A discovery of any of the 85 is **refused by the database today**. Once allowed, species that can score go 54 → **139** (2,700 → **6,950** discovery points available). Existing standings do not move until a record is written. Because discovery is self-declared (CLAUDE.md), one tap per species is 4,250 more points within reach than before. | Migration **0015** (drafted, section 4) adds the ids. Whether they score from day one, or only once competitive discoveries need in-app capture (owner direction 2026-11-19, not active), is a decision; holding them out of scoring but not out of recording would need a second id function, which is not drafted. | **DECISION** |
| 15 | **Free-collection cap** | `enforce_discovery_limit` (0008) counts rows in `discoveries` for the user, limit 10, flag `collection_paywall_enabled` default false, grandfathered accounts | Structurally every id counts, Field Cards already do. | Unchanged. The expansion shares the same slots. | REUSE |
| 16 | **Shop, `/start`, home copy** | `DECK_CARD_COUNT = PRINTED_DECK_SIZE` (45); home: "`${PRINTED_DECK_SIZE}` species have a card. Everything else becomes a seed packet."; "The first Plantdex collection begins with 45 plants" | The shop must stay 45: $/card and the physical product. The home sentence is already untrue (54 cards exist) and would be untrue by 85 more. | Physical statements keep reading the printed deck. Any "N species have a card" sentence must say what N counts. UI-owned; filed as a request, not edited. `/safety` lists cautions from `PRINTED_CARDS`: expansion cautions need a home there (Tier 0, human). | REUSE; copy is UI/owner |
| 17 | **Profile, export, deletion, storage** | `resolveProfile` validates avatar/sidekick/featured through the deck; state is `{discoveries, learned, mastered, research, achievements}`; `STORAGE_VERSION` 3 | A profile selection of an expansion card silently falls back. No new stored field exists, so no export or deletion change. | Selections resolve through the catalogue for display and through `participates` for earning. No `STORAGE_VERSION` bump (additive ids only; `parseState` filters nothing by id). | REUSE |

## 4. The database side (drafted, not applied)

The only server-side refusal of a new card id is `public.is_catalogue_herb()` (0013): five `NOT VALID` CHECK constraints and
`leaderboard_standings()` call it. Everything else was checked: `scans.confirmed_herb_id` and 0014's `confirm_scan` accept any text;
`boss_forms` only requires non-empty; `seed_shelf`, `species_packets`, `profiles` and the entitlement tables hold no card-id list.

| File | What |
|---|---|
| `supabase/migrations/0015_expansion_catalogue_ids.sql` | **DRAFT, NOT APPLIED.** Replaces the one function: 0013's 54 ids verbatim, then the 85 in card-number order. Changes no constraint, grant, policy or row. Numbered 0015 because 0014 is held by `coord/confirm-scan-rpc`. |
| `src/lib/expansion-ids-schema.test.ts` | 15 tests, same style as `confirm-scan-schema.test.ts`: the 54 are an untouched prefix; added ids come from the inventory, in order, equal to the lowercase hyphenated scientific name, none duplicated or already present; `CATALOGUE ⊆ list`; no other migration redefines the function; the file contains exactly one statement; the rollback restores 0013 and pre-checks. |
| `docs/agent-workflow/migration-0015-rollback.sql` | Pre-check (four counts, all must be 0), 0013 body restored, confirmation. Not under `supabase/migrations/`. |
| `docs/agent-workflow/migration-0015-test-verification.sql` | Self-rolling-back `DO` block, 17 checks; ends by raising an exception whose text is the report. |
| `docs/agent-workflow/migration-0015-test-plan.md` | TEST-only apply plan, rollback, and what was and was not exercised. |

Found while drafting, and recorded in the test plan: **a listed id is an id any signed-in client can record**, so unreleased or HELD cards
must not be in the list when it is applied (trim block 2 to the released batch); and the function is executable by `anon` through PostgREST
(0013's posture, unchanged), so the list is probeable.

**Order of operations when the time comes (each step inert until the next):** 0015 on TEST → `npm run sync:edge-shared` and deploy
`herbdex-action` (it recomputes mastery and research from its bundled copy of the reducer, and is the only writer of `mastered`; a stale
bundle silently never records an expansion mastery) → `npm run check:edge` → the catalogue flag → the progression flag. Reversing the first two
is not inert: a client that records a new id against an unaware database gets a CHECK violation.

## 5. Invariants, and the tests that must change

**Invariants the implementation must keep (each becomes a test):**
1. **Parity.** For every state built only from today's 54 ids and today's research ids, `xpForState`, `progressFromState`, `slotsUnlockedAt`
   and the achievements are identical before and after. (This is the "do not disturb existing players" property, stated so it can be run.)
2. Field Cards still price at exactly 0 and a Field Card unlock never funds another.
3. Counting is independent of every flag; the released-id set is append-only (a committed snapshot).
4. The level ladder and Field Card slots are append-only; no existing threshold changes.
5. Collection 01's research targets, task ids and 45 quizzes are byte-identical to today's.
6. Denominators are per collection; `PRINTED_DECK_SIZE` is read only by statements about the physical deck.
7. Every participating card's `xp` equals `XP_BY_RARITY[rarity]`, and its rarity matches the ratified snapshot.
8. `PRINTED_COLLECTIONS` stays at one; every expansion card declares `herbdex-expansion`.
9. No achievement, task or title counts "every key of `discoveries`" for a statement about a particular collection.
10. Nothing new is stored: no XP counter, no per-collection ledger, no flag in state.

**Existing tests that change when the implementation lands, and why** (none changes in this PR):

| Test | Why |
|---|---|
| `catalogue.test` "holds the Field Cards, and they widen the catalogue without widening the deck" | asserts the digital set is exactly nine; becomes per-collection |
| `field-cards.test` "is reachable through the catalogue" | literal 54 |
| `leaderboard-integrity.test` "every catalogue card, and nothing else, is a valid herb id" | reads 0013; must read the latest definition (0015) or assert `CATALOGUE ⊆ list` |
| `edge-shared.test` | mirrored modules drift until `npm run sync:edge-shared` |
| `plant-match.live.test` (two Rumex cases), `card-coverage.test` "keeps the two Rumex cards separate and refuses a third dock" | *R. crispus* becomes exact; rewrite to say exactly the pilot rule (exact and checked synonyms confirm; hybrids and relatives never do), do not delete |
| `seed-shelf.test` "accepts a close relative of a card" | *Plantago lanceolata* stops being a relative; needs another example species |
| `achievements.test` (epic-finder, complete-collection) | denominators from the collection; add the Field-Card leak as a regression |
| `progression.test` "caps out at MAX_COLLECTION_XP when every card is fully mastered" | "every card" must mean every participating card |
| `profile-stats` / `HerbdexProvider` deck-size tests | per-collection |
| `card-art.test`, `card-field-notes.test` | art variants and field notes must exist **before** merge (audit A2) |
| `knowledge-check.test` | rules run over every participating card; add the 45-quiz snapshot |
| `research.test` | add the frozen-targets snapshot; "masters the whole deck, every standing task completes" stays as is |

**Tests that must keep passing untouched, because they are what makes this safe:** `deck.test`, `shop.test`, the `PRINTED_COLLECTIONS`
assertion, `herbdex-reducer.test` idempotence, `mastery.test` stage ordering, `field-cards.test` threshold pins, `profile-schema.test`,
`leaderboard-schema.test`, `legal.test`.

## 6. Decisions for the owner

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Do Field Card unlocks share the one XP pool? | A single pool; B keep the printed-deck calibration (a second XP figure); C append slots (invents thresholds) | **A.** It is what "same progression systems" says, and nothing can be taken back. The cost is that expansion collectors unlock the nine cards sooner (discovery supply is ×2.63). |
| D2 | What is above Level 11? | leave L11 as the top; or the owner supplies appended thresholds | Owner's call; no value is proposed. |
| D3 | Ratify the 85 rarities and freeze them | per card, before release | Required before the progression flag, not before the catalogue flag. |
| D4 | Blended "of 130" on any surface | never; or on the profile only | Per-collection only until asked. |
| D5 | Expansion standing research tasks | none (daily only); or define them (each scores 100 on the board and needs the `seasonal-sweep` fix) | None for now. |
| D6 | Daily weighting across 130 | flat; or weighted toward cards a player holds | Flat. |
| D7 | Do expansion discoveries score on the Field Board from day one? | yes; or only after capture validation (needs a second id function) | Decide before 0015 is applied anywhere real; the default is "yes", which widens the self-declared surface 2.6×. |
| D8 | Expansion-only achievement, frame or title | none; or add (new ids, `is_achievement` migration) | None for now. |
| D9 | Card numbering in labels | "#57-141" as reserved; or restart at #01 within the collection | "#57-141", the Field Cards' precedent. |

## 7. Refused: what would invent a value

New XP for any expansion card or stage; a per-card or per-collection multiplier; Level 12+ thresholds; additional Field Card thresholds; any
change to 50 / 100 / 25 / 250 / 500 or to the board's 50 / 15 / 100; `SIGHTINGS_FOR_MASTERY` above 1; habitat, season or regional
assignments not present in researched data; a free-cap different from 10; a size for any collection but the counted 85; a date, price or
"Collection 02". Also refused: reading EXIF or inferring presence to gate expansion (owner direction 2026-11-19), and treating several photos
as proof of presence.

## 8. What would break an existing player's progress if done naively

1. **Widening `getPrintedCard` instead of adding `participates`.** Field Cards start paying 2,550 XP and can fund their own next unlock.
2. **Moving the denominator 45 → 130.** A finished printed deck reads 35%.
3. **Pooling the research supply.** The winter task's targets go 1/1/1 → 2/2/1 under players already partway through it.
4. **Counting every key of `discoveries` for deck-wide predicates.** Already wrong for Field Cards today; with 130 ids it is routine.
5. **Making counting depend on a flag, or removing a released id.** Derived XP falls; levels fall; the board changes; nothing was deleted.
6. **Editing a card's rarity after release.** Rewrites every holder's XP.
7. **Pooling the quiz.** Every existing card's quiz changes; an unreleased card's text can appear as a wrong answer.
8. **Wrong rollout order.** Flag before 0015 → CHECK violation on every new discovery; flag before the edge sync → mastery never recorded; 0015
   listing unreleased ids → anyone can record a held card; rollback after players hold new ids → they drop out of the standings (reproduced: 100 → 50).
9. **Omitting `collectionId`.** The card silently joins Collection 01, and the shop's 45 and the "of 45" with it.
10. **Adding `seasonal:` or `collection:` task ids.** They pay 100 board points each and fold into "Four Seasons".
11. **Bumping `STORAGE_VERSION`.** Not needed (additive ids), and a bare bump wipes collections.

## 9. Out of scope, and noted

CLAUDE.md says Common is 21 of the 45 cards; the data has **18** (14 / 10 / 3 for the rest). Not a progression issue; not edited.
Home-page and `/safety` copy, the Garden and profile surfaces, and the missing-sprite state are UI/Tier 0 files and are filed in
`agents/requests/coord-expansion-progression-ui.md` rather than edited. Production is not discussed here.

## Appendix A: where each `getPrintedCard` / `PRINTED_CARDS` use falls

| Question it answers | Sites | After |
|---|---|---|
| 1. The physical box | `shop.ts`, `app/start/page.tsx`, `app/page.tsx`, `WelcomeScenes`, `safety/page.tsx` (cautions list needs expansion cautions added by the owner) | unchanged |
| 2. Takes part in progression | `progression.ts` (`xpForDiscoveries`, `countPrintedCards`), `herbdex-reducer.ts` (award), `mastery.ts` (`tracksMastery`, `masteryTotals`), `achievements.ts`, `field-frames.ts`, `field-titles.ts`, `profile-stats.ts`, `research.ts` (pool, dailies), `knowledge-check.ts`, `habitat.ts`, `quest-board.ts`, `findability.ts`, `regional-nearby.ts`, `GardenView`, `HerbdexProvider` | `participates` |
| 3. Show a name and picture | `AccountBadge`, `ProfileHero`, `RecentFinds`, `FieldRecord`, `GardenPreview`, `EditProfilePanel`, `TaskCard`, `NearbyByHabitat`, `QuestBoardPanel`, `player-profile.ts` | catalogue |
| Declared taxonomic coverage | `card-coverage.ts` (`PRINTED_CARDS` deliberately; the 85 are all binomials, none `spp.`) | unchanged |

## Appendix B: the numbers

Run `python3 scripts/expansion-audit/progression_numbers.py`. Its output is the source for every figure above; a retuned table changes the
output rather than this document going stale unnoticed.
