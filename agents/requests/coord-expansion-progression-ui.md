# Shared Change Request: UI and Tier 0 copy that the expansion's progression inheritance depends on

From: coordinator (progression design lane). **Nothing here is requested for now**; it is the list of files the design in
`docs/expansion/progression-inheritance.md` would touch, so the owners of those files are not surprised later. No edits were made.

## UI lane (`src/components/herbdex/**`, `src/app/herbdex/**`, `src/app/page.tsx`, garden and profile surfaces)
1. **Per-collection counts.** "N of 45 planted" (`GardenView`), the profile's completion ring and `ProgressHeader` stay on Collection 01; the
   Expansion needs its own "N of 85" line. No blended figure unless the owner decides one (decision D4).
2. **Missing-sprite state** for expansion cards with no approved sprite set (80 of 85 today), as the pilot plan's gate 5 already requires.
3. **Home page copy** (`src/app/page.tsx`): "`${PRINTED_DECK_SIZE}` species have a card. Everything else becomes a seed packet." is already
   untrue (54 cards exist) and must say what the number counts. "The first Plantdex collection begins with 45 plants" is a statement
   about the physical deck and stays true if it says so.
4. **Display lookups** (avatar, sidekick, featured card, recent finds, task rows, habitat rows) resolve through the catalogue rather than
   the printed deck, so a held-then-released expansion card is nameable wherever a record of it appears.
5. The Herbdex grid lists `PRINTED_CARDS` plus the Field Card strip; the expansion needs a place in it. Design is the UI lane's.

## Tier 0 (owner)
6. `/safety` builds its cautions list from `PRINTED_CARDS`; expansion cards that carry cautions (for example #57's pyrrolizidine
   alkaloids) need to appear there before they are released.
7. Per-card rarity ratification for the 85 (decision D3): the draft rarities are the XP.
