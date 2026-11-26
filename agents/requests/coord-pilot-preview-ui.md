# Shared Change Request: UI gaps found by the pilot preview

- From lane: coordinator    Task: protected pilot preview (docs/expansion/pilot/preview-status.md)    Needs: UI lane (herbdex/**, SpeciesHero, ScanOutcome, card-art)

Found by rendering the five held cards at 390px (screenshots in docs/expansion/pilot/preview/). Not edited here.
1. Herbdex grid shows no expansion tile and no "of 85" denominator; the collection id `herbdex-expansion` is a proposal awaiting the owner.
2. Card page: no approved art, so a text plate stands in; `SpeciesHero` leaves an empty island gap with no sprite; `ScanOutcome` and the locked journey panels leave an empty column (see missing-sprite-state.md).
3. The preview label is carried through `Herb.warning`, which is meant for a warning printed on a physical card; a dedicated PREVIEW banner would be cleaner.
4. Locked copy reads "earn +0 XP" for a card that pays nothing.
