# CLAUDE.md

**Read [`AGENTS.md`](./AGENTS.md) first.** It is the authoritative product spec — goals,
roadmap, safety rules and hard prohibitions — and it governs every change to this repo.
This file only adds the mechanics of working in this codebase.

## Current stage

**V0.2 complete**, plus three-stage card mastery and Field Research. The Herbdex prototype
is functional against real deck data with local persistence. Not yet built: accounts
(V0.3), commerce (V0.4), QR (V0.5).

## Commands

```bash
npm run dev        # dev server
npm run verify     # lint + typecheck + test + build — run before pushing
npm test           # vitest
npm run build:deck -- --source /path/to/card-pdfs   # regenerate deck data + art
```

## Architecture rules

These exist because AGENTS.md requires them. Breaking one is a bug, not a style choice.

- **XP and level thresholds live only in `src/lib/progression.ts`.** Components must read
  `progressFromState()` / `progressFromXp()` and never contain a threshold literal.
- **XP is derived, never stored.** Persisted state is only
  `{discoveries, learned, mastered, achievements}`; XP is summed from those records. This
  is what makes repeat-XP structurally impossible rather than merely guarded — do not add
  an XP counter to stored state.
- **Every stage transition is idempotent.** `applyDiscovery()`, `applyLearned()` and
  `reconcileMastery()` each return the *same object* when there is nothing new to record.
  Covered by `src/lib/herbdex-reducer.test.ts` and `src/lib/mastery.test.ts`; keep those
  tests green.
- **A card has three stages, and they only ever go forwards** (`src/lib/mastery.ts`):
  discovered → learned → mastered. Discovery is never gated behind the other two —
  AGENTS.md requires finding a plant to unlock its card immediately. Mastery is *recorded*
  rather than recomputed, so deleting the sighting that earned it can never take it back.
- **The knowledge check may only ask what a card prints.** `src/lib/knowledge-check.ts`
  draws the answer from the card in hand and every distractor from other real cards. It
  must never ask about identification, edibility or safety, where a wrong answer could
  matter outdoors. `src/lib/knowledge-check.test.ts` enforces both rules across all 45
  cards.
- **Field Research derives progress and records completion** (`src/lib/research.ts`). A
  step measures itself from the current world; no task stores a counter. Completion is
  written down once and never revoked, so a challenge finished in spring does not un-finish
  in summer and a task completed by logging a sighting survives that sighting's deletion.
- **A research task may only group cards by something printed on them** — season, encounter
  rate, card number. This is why there is no Pollinator Challenge despite AGENTS.md
  suggesting one: the cards carry no pollinator data, so choosing the species would be
  inventing botany. Pinned by `src/lib/research.test.ts`.
- **No research task may be impossible.** The deck holds exactly one winter card, so every
  target is sized against real deck supply. `research.test.ts` masters the whole deck and
  asserts every standing task then reports itself complete.
- **A daily only pays once it has been offered.** `reconcileResearch` takes the *active*
  tasks, not the registry — otherwise every eligible daily would silently complete the
  moment its condition happened to be true.
- **The garden mirrors mastery; it is not a second progression system.** `src/lib/garden.ts`
  maps each mastery stage to exactly one growth stage and reads no clock at all, which is
  what structurally rules out the watering meters, timers and idle growth AGENTS.md forbids.
- **Extend the level ladder upwards; never re-tune existing thresholds.** Raising one
  demotes players whose XP has not changed. Pinned by `src/lib/progression.test.ts`.
- **Bump `STORAGE_VERSION` only together with adding it to `MIGRATABLE_VERSIONS` in
  `parseState()`.** An unrecognised version degrades to an empty collection, so a bare bump
  silently wipes real save data. The single-pass migration there is only valid while schema
  changes stay purely additive; the first rename or reshape needs a real per-version branch.
- **`HerbdexState` holds only what XP is derived from, plus achievements.** Reveals, field
  sightings and the daily research board award nothing, so they live in their own stores
  with their own keys — which is also what keeps the V0.3 server's surface small.
- **Herb ids come from the scientific name, never the common name.**
- **Achievements are keyed by stable `id`**, and predicates are pure functions of state so
  they can be re-evaluated from scratch (this is what makes retroactive unlocks work).
- **Deck data is generated.** Edit the `DECK` table in `scripts/build_deck.py` and re-run;
  never hand-edit `src/data/herbs.json`.
- **No invented botany.** Every herb field must come from the physical card — fronts and
  backs are both transcribed in `scripts/build_deck.py`. Where a card contains an error,
  transcribe it faithfully and record it in `KNOWN_CARD_ISSUES`; never silently correct it.
- **Icon labels and disclaimer text are the deck's own**, taken from the Icon Cheat Sheet
  (card 46) and Disclaimer (card 47). Change them in the build script, not in components.
- **"Healing Traits" must always render with its non-claim framing.** It is the deck's
  heading for traditional use, not a statement that a plant treats anything.
- **A warning printed on a card (`herb.warning`) must render above the discovery CTA**,
  never collapsed behind an interaction.
- **Reveal is not discovery.** `src/lib/reveals.ts` is a *separate* store with its own
  storage key and never touches `HerbdexState`. Revealing shows a plant's entry for
  reading; it awards no XP, does not count toward the collection, and leaves the card a
  silhouette in the grid. Keep them separate — the V0.3 server owns discoveries and must
  never learn about reveals.
- **A `<dialog>` that reports the result of an action must outlive the state change that
  action causes.** This has bitten twice. The discovery celebration lives in `HerbDetail`,
  not `DiscoverPanel`, because discovering swaps the locked view for the full one.
  `KnowledgeCheck` is rendered unconditionally by `MasteryTrack` and hides only its trigger
  button, because passing the check advances the stage and re-renders the branch it would
  otherwise have been mounted inside. Both must also keep a *stable position* in the tree,
  or React recreates the `<dialog>` underneath itself.
- **`SafetyNotice` appears on the Herbdex and every herb page.** Do not remove it, and do
  not soften traditional-use wording into medical claims.

## When adding a backend (V0.3)

`src/lib/storage.ts` is the seam. Read the comment block at the top of that file before
writing any server code — it lists the four non-negotiables (session-derived user, DB-layer
authorization, server-side XP recomputation, uniqueness constraint on discoveries).

The same four apply to `learned` and `mastered`: one row per (user, herb, stage), XP
recomputed server-side from those rows, and mastery re-derived by the server from its own
sighting records rather than trusted from the client.
