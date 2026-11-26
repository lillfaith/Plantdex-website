# Pilot preview status: five cards #57, #60, #67, #68, #80 (2026-11-26)

**Verdict: the pilot is NOT playable end to end.** Discovery, the card page and the progression guard-rails work; the Herbdex grid, Garden, Profile, mastery and Field Research do not include these cards, the scan outcome was not exercised in a browser, and no art is approved. Every card is still HELD, nothing is published, and nothing here is deployed.

## How to reproduce (local only)
```
node scripts/build-pilot-preview.mjs      # stages a COPY of the repo, swaps one file, builds to out-pilot-preview/ (git-ignored)
cd out-pilot-preview && python3 -m http.server 4173
```
The real checkout is never switched: `src/lib/expansion-entries.ts` is an empty list in the tree, in every production build and in every workflow, and the script refuses when `CI`, `GITHUB_ACTIONS`, `GITHUB_PAGES` or `SITE_DOMAIN` is set. `NEXT_PUBLIC_EXPANSION_PILOT` stays `?? 'off'` in `next.config.ts`; no workflow mentions it. Every card carries `PREVIEW - UNREVIEWED` plus its publication-gate reasons on the card's own warning line, a text-only placeholder plate (no plant drawn, no approved art used) and `xp: 0`. Screenshots are 390px wide in `preview/`; raw text of each page is in `preview-observations.json`.

## Steps
Tests named below are in `src/lib/expansion-pilot-preview-behaviour.test.ts` (B) or `src/lib/expansion-pilot-preview.test.ts` (P).

| Step | Class | Evidence |
|---|---|---|
| **Scan: screen** | WORKING (for the existing cards) | `preview/01-scan-page.png` |
| **Scan: provider call and result panel for a pilot species** | DISABLED in this sandbox | No identifier credentials or network by rule; the result/`ScanOutcome` screen was **not** rendered for a pilot card. No Scan RPC flag was touched. |
| **Identify: matcher** | WORKING | B: "resolves to its own card, confirmably" for all five; "no longer offers these species to the Seed Shelf"; siblings (*Rudbeckia laciniata*, *Plantago rugelii*) stay `sameGenus`, not confirmable; "Rumex x acutus is only related". A subspecies of an exact species resolves, which is the existing rule for every card. |
| **Discover** (signed out) | WORKING | `preview/05-discover-*.png`, `06-card-*-discovered.png`; B: "records a discovery", idempotent. First Find and the Amber Ring frame unlocked on a pilot discovery (existing predicates count any discovery). |
| **Discover** (signed in, server) | DISABLED | Not attempted. The database refuses these ids (`is_catalogue_herb`, migration 0013, a hard-coded 54-id list); a reviewed migration is an owner gate. No discovery enforcement added. |
| **Collect: Herbdex grid / collection tile** | MISSING IMPLEMENTATION | `03-herbdex-before.png`, `07-herbdex-after-two-discoveries.png`: neither shows an expansion card; the grid is printed-deck scoped (UI lane). No "of 85" denominator is shown anywhere. |
| **Collect: card page** | WORKING, with gaps | `04-card-*-locked.png`, `06-card-*-discovered.png`: renders from the catalogue, label `Expansion · Card #n`, warning above the CTA. Gaps: no approved art (placeholder plate), empty hero island without a sprite, locked copy says "earn +0 XP", back text is the owner's unreviewed sheet. No caution is shown because none is reviewed. |
| **Profile** | MISSING IMPLEMENTATION | `08-profile.png`: collection stays 0/45, recent finds and garden strip show nothing for pilot finds; avatar/sidekick choosers are printed-only. |
| **Progress: XP and level** | WORKING (pays nothing) | B: "pays 0 XP, and 0 XP in total for all five"; celebration shows `+0 XP`. |
| **Progress: 45-card percentages** | WORKING (unchanged) | B: "does not move the 45-card collection counts"; `08-profile.png` 0/45. |
| **Progress: mastery, knowledge check** | MISSING IMPLEMENTATION | B: `tracksMastery` false; `applyLearned` and `reconcileMastery` change nothing. Needs the progression-inheritance decision (owner). |
| **Progress: Field Research** | MISSING IMPLEMENTATION | B: no task completes or counts them; `09-research-progress.png` lists printed cards only. |
| **Field Board** | WORKING (contributes nothing) | B: "scores expansion discoveries at 0"; `11-field-board.png` 0 species. Found by the test: `scoreFromRecords` counted them (+50 each) before this branch; fixed with `isExpansionEntry` in `leaderboard.ts` (a discoveries-lane file, flagged in the PR). |
| **Garden** | MISSING IMPLEMENTATION | B: Garden page lists the printed deck only; `10-garden.png` 0 of 45. Latent: `stageForState` alone answers "sprout" for an expansion id; nothing renders it. |
| **Missing-sprite state** | AWAITING OWNER APPROVAL | B: `hasSprite` false for all five, so existing handling applies; the card-page hero and scan-outcome gaps from `missing-sprite-state.md` are UI-lane (`agents/requests/coord-pilot-preview-ui.md`). |
| **Sprites and card art** | AWAITING OWNER APPROVAL | Nothing generated or copied. |
| **Publication** | WORKING (held) | P: "keeps the generated pilot data HELD for all five"; every page carries `PREVIEW - UNREVIEWED`. |
| **Collection id `herbdex-expansion`** | AWAITING OWNER APPROVAL | Registered only in the preview (`EXPANSION_COLLECTION`); `PRINTED_COLLECTIONS` stays at one (B). |

## Production guarantees
P: committed seam empty; no live module imports the preview module or generated file; `next.config.ts` has no preview logic; no workflow sets the flag or runs the script; the script refuses CI; and, with a default `out/` (`REQUIRE_EXPANSION_BUNDLE=1`), none of the five common names, `Rudbeckia hirta`, `Eupatorium perfoliatum`, the ids, the label, the collection name or the plate text is in any built file. That scan caught one real leak in the first draft (the collection name in `collection.ts`), now fixed. Not searched, and why: the six back fields (shared deck vocabulary) and the binomials `Rumex crispus`, `Plantago lanceolata`, `Trifolium repens`, which the matcher's existing tables already name in every build.

## Findings
1. The Field Board mirror counted expansion discoveries: fixed here.
2. A pilot discovery unlocks First Find and Amber Ring (existing predicates). It changes no XP, but the owner should know achievements count it.
3. The scan outcome end to end remains unproven for a pilot species (needs a provider fixture or credentials).
