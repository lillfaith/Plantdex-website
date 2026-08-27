# Replacing a card with a corrected one

The deck is printed, and some of it is wrong. Card 11 (Purple Dead Nettle) carries
Dandelion's back verbatim; 24 and 31 both carry Sumac's; 38 misspells Salicin. When a
corrected card is drawn, this is how it gets into the site.

**The short answer: edit two lines in `scripts/build_deck.py`, re-run it, and everything
downstream follows.** Nothing else in the repo needs to know a card changed. The rest of
this document is the detail behind that sentence, and the one case where it is not true.

---

## Why it is this easy

`src/data/herbs.json` is generated, and everything that isn't card data is joined onto it
by a **key that does not change when a card's content changes**:

| Layer | Keyed by | Regenerating a card touches it? |
|---|---|---|
| `src/data/herbs.json` | — | Regenerated wholesale |
| `public/cards/front`, `back` | card number | Regenerated wholesale |
| `card-issues.ts` (printing errors) | card number | No |
| `card-sources.ts` (citations, evidence grade) | card number | No |
| `card-cautions.ts` (site-added safety) | card number | No |
| `sprite_sources/` → animated portraits and their stages | herb id | No |
| Player progress (local + Supabase) | herb id | No |
| Sightings and their photos | herb id | No |
| Achievements | herb id (via predicates) | No |

A card number is printed on the card and a herb id is derived from the scientific name
(`slugify()` in `build_deck.py`) — precisely because AGENTS.md forbids identifying a plant
by its common name. **Correcting a card's text changes neither.** So a player who mastered
Purple Dead Nettle in 2026 still has it mastered after the card is reissued, their sighting
photos still hang off it, their citations still resolve, and their garden still grows the
same plant.

## The procedure

```bash
pip3 install pillow pymupdf                                   # dev-only, not shipped
python3 scripts/build_deck.py --source /path/to/card-pdfs     # regenerates herbs.json + art
npm run verify                                                # lint, typecheck, tests, build
```

1. **Edit the tables in `scripts/build_deck.py`.** They are the transcription, and they are
   the source of truth:
   - `DECK` — the front: `(number, commonName, scientificName, rarity, season, [uses],
     water, sun, temp)`
   - `BACKS` — the back: healing traits, compounds, taste, aroma, preparations, parts
   - `CARD_WARNINGS` — only warnings **printed on the card**
   - `KNOWN_CARD_ISSUES` — remove the entry for whatever the new card fixes
2. **Drop the new print PDF into the `--source` directory**, named so the card number is
   recoverable, two pages, front then back. If the artwork did not change, the old PDF is
   still correct and only the tables move.
3. **Run the build.** It re-renders the card images and re-counts the water/sun/temperature
   icons directly off the front, failing loudly if a count disagrees with your table — so a
   transcription slip in the stats cannot ship silently.
4. **Run `npm run verify`.** `deck.test.ts` and `card-sources.test.ts` will catch a card
   number that vanished or a citation that no longer points at a real card.

Never hand-edit `src/data/herbs.json`. It is overwritten on the next build, and a hand-edit
is a correction that quietly disappears.

## What to do about the curated layers

They are separate on purpose, and a card update usually means **deleting** from them rather
than adding:

- **Fixed on the new card → delete the `KNOWN_CARD_ISSUES` entry** in `build_deck.py`.
  `card-issues.ts` reads that table through the generated data, so the note stops rendering
  by itself.
- **Now printed on the card → move it out of `card-cautions.ts`** and into `CARD_WARNINGS`.
  A site-added caution exists only because the plates could not answer; once they do, the
  card should speak for itself and `SiteCaution`'s "Not printed on the card" prefix would
  become a lie.
- **`card-sources.ts` normally stays put.** Citations are about the plant, not the printing.
  Re-grade `evidence` only if the new card actually changes what is being claimed.

## The one case that is a migration

**If a card's scientific name changes, its herb id changes** — and the id is what every
piece of player progress is filed under, in `localStorage` and in Postgres alike. A rename
from `lamium-purpureum` to something else does not correct a card; it silently retires one
plant and introduces another, taking every discovery, sighting, mastery record and photo
with it.

That is a real migration and it needs a real plan: a map from old id to new, applied to
`discoveries`/`learned`/`mastered` in `parseState()` behind a `STORAGE_VERSION` bump (with
the new version added to `MIGRATABLE_VERSIONS` in the same commit — CLAUDE.md is explicit
that a bare bump wipes save data), and a matching backfill on the Supabase side. Do not
treat it as a content edit.

Correcting a *misspelling* of a scientific name is the same problem wearing a smaller hat.
Check whether the id changes before assuming it doesn't.

## Sprites

The portraits are not regenerated by `build_deck.py`, and do not need to be: they are keyed
by herb id and they are drawings of the plant, not of the card.

```bash
python3 scripts/build_sprites.py   # animated portraits, and their growth stages
python3 scripts/audit_sprites.py   # face placement, connectivity, stale builds
```

Redraw one only if the correction changes what the plant *is* — which, for a card that
printed the wrong plant's back, it does not. See `docs/creature-stages.md` for the growth
stages specifically.
