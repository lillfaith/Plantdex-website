# Five-card pilot: can it be tested end to end today? (2026-11-25)

Short answer: **no.** The pieces exist as validated data, a gate and a checker, but no pilot card is registered in the live catalogue, so every step below that depends on a card existing does not happen.
Nothing was activated to make this look further along. Evidence is from the merged audits (`docs/expansion/audit/`), the importer (#62) and CLAUDE.md.

| Step | Today | Why | What is needed (owner gate in brackets) |
|---|---|---|---|
| Scan | Works for the 45 + 9 cards | The scanner matches against `CATALOGUE` only | Pilot cards registered in the catalogue behind `NEXT_PUBLIC_EXPANSION_PILOT` (coordinator code) |
| Identify | Pilot species resolve as "no card" and are offered to the Seed Shelf | Not in `CATALOGUE`, so `confirmable` is false | Same registration; exact-binomial-only rule for #67 (Rumex) and relatives, with the refusal test rewritten, not deleted |
| Discover | Signed-out (local) would work once registered; **signed-in is refused by the database** | `is_catalogue_herb` is a hard-coded 54-id list (migration 0013) | A reviewed migration listing the new ids: drafted by E1, TEST only, [owner approval before any apply] |
| Collect (Herbdex tile) | Not shown | No collection id declared; card would silently join `collection-01` | Declare the digital collection `Herbdex Expansion` (own id) [owner confirms the id] |
| View profile | Not generated | `generateStaticParams` reads `CATALOGUE`; and every pilot card is **HELD** by the publication gate (unreviewed caution, AI-derived image, unverified taxon, search-link citations, unapproved assets) | Botanist review of the five cards' safety questions [owner/botanist]; sourced content only; held cards show only in a protected preview, never to live players |
| Progress | Would pay 0 XP, no mastery track, no knowledge check (Field Card precedent) | `applyDiscovery` pays from the printed deck table only | Inherit existing XP/mastery rules without new values: E1's proposal [owner decision] |
| Garden | Not shown | Garden is printed-deck scoped; 80 of 85 cards have no sprite; #57-61 sprites are unapproved | Approved sprites [owner visual approval]; missing-sprite state defined in `missing-sprite-state.md` |

## What a protected preview needs
Nothing is deployed. The proposal: an agent registers the pilot entries behind the flag with an explicit preview-only override that lets HELD cards render, builds locally in the agent's sandbox, and captures screenshots of every step for the owner. The flag stays OFF in every deployed environment, the preview override is not compiled into a production build, and a test pins both. Unapproved sprites show their defined missing-sprite state, not the draft art.

## What already works and is merged
Importer and publication gate (all five HELD with machine-readable reasons), collision and hash checks, deterministic generation, isolation tests proving no live module reads the pilot data, sourced research for the five cards with NOT FOUND marked, sprite spec and checker, written sprite proposals.
