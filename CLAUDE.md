# CLAUDE.md

**Read [`AGENTS.md`](./AGENTS.md) first.** It is the authoritative product spec — goals,
roadmap, safety rules and hard prohibitions — and it governs every change to this repo.
This file only adds the mechanics of working in this codebase.

## Current stage

**V0.2 complete.** The Herbdex prototype is functional against real deck data with local
persistence. Not yet built: accounts (V0.3), commerce (V0.4), QR (V0.5).

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
- **XP is derived, never stored.** Persisted state is only `{discoveries, achievements}`;
  XP is summed from discovered herbs. This is what makes repeat-XP structurally
  impossible rather than merely guarded — do not add an XP counter to stored state.
- **Discovery is idempotent.** `applyDiscovery()` returns the *same object* if the herb is
  already discovered. Covered by `src/lib/herbdex-reducer.test.ts`; keep those tests green.
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
- **`SafetyNotice` appears on the Herbdex and every herb page.** Do not remove it, and do
  not soften traditional-use wording into medical claims.

## When adding a backend (V0.3)

`src/lib/storage.ts` is the seam. Read the comment block at the top of that file before
writing any server code — it lists the four non-negotiables (session-derived user, DB-layer
authorization, server-side XP recomputation, uniqueness constraint on discoveries).
