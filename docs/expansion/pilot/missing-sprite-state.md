# The missing-sprite state (PROPOSAL for the owner and the UI session)

Status: a proposal and a map of today's behaviour. Nothing here is implemented; no UI, component, test or `src/` file was changed. It answers pilot-plan gate 5
("a defined missing-sprite state for cards without an approved sprite set") and exists because the pilot cards #67 and #68 have no sprite by design, and #57-61 have
no *approved* set. Observations are from reading the code at this commit; items marked **verify** were not rendered in a browser and need a 390px screenshot before anyone relies on them.

## 1. What happens today

### The data layer (`src/lib/plant-sprites.ts`)
- `spriteFor(herbId, stage)` returns **`null`** when the id has no key in `src/data/sprites.json`. Otherwise it returns `entry.stages?.[stage] ?? entry`.
- `hasSprite(herbId)` is `herbId in SPRITES`; `hasStageArt(herbId, stage)` is true only if that stage's entry exists.
- Three *partial* states are already defined and handled, and they are not the missing-sprite state: an entry with no `stages` resolves every stage to the adult (and `GrowthSprite` rescales it by `STAGE_SCALE`); an entry with no `still` makes a frozen sprite hold frame 0 of the sheet; an entry with no `content` box makes `contentFit` return "unchanged".
- A card with **no entry at all** is the state this document is about. Today it cannot occur for any catalogue card: all 45 printed cards and the nine Field Cards have all three stages (54 entries). The expansion cards would be the first catalogue entries with none.

### The renderer (`src/components/PlantSprite.tsx`)
`const sprite = spriteFor(herbId, stage); if (!sprite) return null;` It renders **nothing at all**: no element, no box, no alt text. That was a deliberate choice ("pages can mount it unconditionally without guarding"), which is why a missing sprite is silent rather than an error.

### What guards it
- `plant-sprites.test.ts` requires a sprite for every **printed** card and requires every manifest id to be a real catalogue id. Nothing requires, or forbids, a *catalogue* card without a sprite, so a card missing one is currently an unguarded accident rather than a declared state. (This is the one test-shaped gap; see section 4.)

### Surface by surface

| Surface | File | Behaviour with no sprite | Status |
|---|---|---|---|
| Herbdex grid, locked tile | `herbdex/MysteryCard.tsx` | `hasSprite` false renders the `locked` keyhole icon | **handled** (designed) |
| Locked card art (not a button) | `herbdex/LockedCardArt.tsx` | `!hasSprite` returns the plain frame, not a "replay animation" button | **handled** (designed) |
| Discovery celebration | `herbdex/DiscoveryCelebration.tsx` | `hasIntro = hasSprite && !reducedMotion`, so the sprite reveal is skipped and the intro starts `done` | **handled** |
| **Card page hero** | `game/SpeciesHero.tsx`, rendered on every card page | the sprite wrapper (`w-[125%] -mb-[22%]`) is empty above the `PixelIsland`; the island and the negative margin remain. Layout effect **verify** | **GAP** |
| **Scan outcome, card branch** | `scan/ScanOutcome.tsx` | an empty 56-64px column (`w-16`/`w-14`) beside the text the first time a stranger resolves a find to this card | **GAP** |
| Journey panels (locked) | `herbdex/JourneyPanels.tsx` `Silhouette` | an empty `w-32` wrapper above the heading; the same panel's line "Each stage grows it in your Garden" is untrue for a digital-only card (a content issue beside the sprite one, **verify**) | **GAP** |
| Garden tile | `garden/GrowthSprite.tsx` | returns `null`, but the Garden lists `printedCardsInDeckOrder()` only | unreachable today |
| Profile avatar, sidekick, featured | `profile/EditProfilePanel.tsx`, `player-profile.ts` | choosers list printed cards only and `resolveProfile` uses `getPrintedCard`. **Latent:** `ProfileAvatar` renders an empty circle if given a herb id with no sprite (its fallback icon is only for a null id) | unreachable today |
| Recent finds | `profile/RecentFinds.tsx` | skips ids with no printed card | unreachable today |
| Mastery track | `herbdex/MasteryTrack.tsx` | draws nothing for a card outside `tracksMastery` | unreachable today |
| Landing hero, welcome scenes, walkthrough, boss form | `CardShowcase`, `WelcomeScenes`, `AppWalkthrough`, `challenges/*` | fixed or caller-supplied deck ids (`CardShowcase` takes a `cards` prop: **verify** the caller passes the printed deck) | out of scope |

So the exposure for a discovered or revealed expansion card is concentrated in three places: the card page hero, the scan outcome and the locked journey panels. The silent failure is worst in the scan outcome, because that is the screen a first-time user lands on after the one action `/start` asks of them.

## 2. What a placeholder would need to be

These are constraints drawn from rules the repository already holds, not new design:

1. **Static.** No loop and no new keyframes (the Motion section: nothing repeats forever; a placeholder is not a one-shot moment either). A held frame, so it also needs nothing under `prefers-reduced-motion`.
2. **Not a species.** The Seed Shelf's decorative pots are "deliberately not recognisable plants" because a drawing shaped like a real species reads as a claim about it. A placeholder for *Rumex crispus* must not look like a dock or like any other card's sprite. A generic form (a seed packet silhouette, a plain sprout glyph from `PlantdexIcon`) only.
3. **Not the keyhole.** The keyhole means "locked" and `MysteryCard` already uses it for exactly that. A discovered or revealed card with no art is not locked; reusing it would tell the reader something untrue.
4. **Same box as a real sprite.** Same aspect ratio (170:140, `fit` width) as the frame it stands in for, so the page does not reflow when a real sprite later appears.
5. **No promise.** No "coming soon", no date, no count, no scarcity (`CLAUDE.md`: foreshadowing copy may never invent a date or claim anything about a future collection). If it carries words at all they say what is true now.
6. **Decorative to assistive tech** (`aria-hidden`), because the plant's name is already on the page, the same reason the Garden tile and `MysteryCard` sprites hide.
7. **Built only from existing tokens and assets**, never from a new colour and never from new artwork; this proposal asks for no sprite design.
8. **Grants nothing and records nothing.** It is presentation only: no XP, no discovery, no mastery and no entry in any store.
9. **One predicate.** `hasSprite` already is the predicate every handled surface uses. A placeholder is rendered where `hasSprite` is false, never by sniffing for `null` in a second place.

## 3. Proposed options

- **Option A (recommended): keep `PlantSprite` returning `null`, and give the three GAP surfaces one shared, static placeholder.** One small presentational component, mounted only by `SpeciesHero`, `ScanOutcome` and the journey `Silhouette` when `!hasSprite`. Everything already handled stays exactly as it is, and `PlantSprite` keeps its "mount unconditionally" contract. In the scan outcome and the journey panels the better behaviour may simply be to **omit the column** rather than draw a stand-in (one fewer element to explain), which is a UI decision.
- **Option B: absence everywhere.** Add no placeholder; make the three GAP surfaces collapse their sprite box cleanly when `!hasSprite` (no empty column, no empty island gap). The cheapest and the least to explain, at the cost of the card page looking plainer than every other card's.
- **Option C: a placeholder inside `PlantSprite`.** Rejected as the default: it would change the behaviour of all 24 mount points at once, including the unreachable ones (a placeholder in an avatar circle is wrong), and it removes the property that a missing sprite is visible in one place.

Whichever is chosen, two guard-rail changes belong to the same piece of work and are not UI:
- A catalogue-wide test: every catalogue id either has a manifest entry or is named on an explicit allowlist ("cards with no sprite set"), so a missing sprite is a declared state and a card cannot lose one by accident. Today's test covers printed cards only.
- A browser check (390px screenshot, as the performance notes require) of the card page and scan outcome for one sprite-less card.

## 4. Decisions needed

| # | Question | Recommendation |
|---|---|---|
| 1 | Placeholder (A), or collapse the box (B)? | A on the card page hero, B on the scan outcome and journey panels. |
| 2 | Wording, if any? | None on the card page. If the scan outcome needs a line, say only what is true: that the card has no portrait. No date, no promise. |
| 3 | May a sprite-less card be chosen as avatar, sidekick or featured card? | No. Filter the chooser on `hasSprite` and keep `resolveProfile` dropping it. Today they are printed-only, so this is a rule to write down before anyone widens them, not a fix. |
| 4 | Fix the journey panels' "grows it in your Garden" line for digital-only cards? | Yes, separately: it is untrue for a card with no mastery track and is a copy decision for the owner and UI lane. |
| 5 | Declare the sprite-less set as a test allowlist? | Yes (section 3). |

## 5. What this does not do
It implements no component, adds no test and touches no file under `src/`. It does not decide whether any expansion card gets a Garden sprite (pilot plan section 5 keeps them out of the Garden), and a placeholder is never a stand-in for owner approval of a sprite set: the five draft sets remain unapproved (`sprite-qa-report.md`).
