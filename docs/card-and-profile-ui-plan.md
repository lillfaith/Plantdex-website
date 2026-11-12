# Simplified card and expanded profile: UI plan for approval

**Status: plan only. No card or profile code has been changed.**

One route, `/herbdex/[herbId]`, two layers on the same page. No second profile, no copied data.

## 1. Card view (top of the page, one phone screen, game-like)

```
 #01  DANDELION            [Common]  [XP]
 ┌────────────────────────┐   ┌──────┐
 │   collectible card     │   │sprite│   (animated; Boss Form
 │   (tap to flip to back)│   └──────┘    when earned, pilot only)
 └────────────────────────┘
 [Anti-inflam.] [Liver support] [Digestive]     <- 3 medicinal highlights
 ☀☀☀  🌡🌡  Encounter: Common                    <- existing stat pips
 ⚠ safety strip (card warning / site caution)   <- never collapsed
 ●─────●─────○  · · ·  ◇ Boss Form (optional)   <- Discovered, Learned, Mastered
 [ ONE primary button for the next step ]
 [ Open full profile  ▾ ]
```

Primary button by state: undiscovered "Find it" (scanner and the existing discover panel);
discovered "Learn this card"; learned "Log a sighting"; mastered "Boss challenges" (pilot,
flag-gated). The stepper is a read-only view of existing progress; the one `MasteryTrack`
and its dialogs stay mounted at their fixed spot (the stable-position rule), and the button
scrolls to and opens them.

## 2. Where every existing piece goes

| Today (12 bands) | Card view | Expanded profile section |
|---|---|---|
| Healing Traits | top 3 as chips | Herbal Knowledge (full list) |
| Signature compounds | | Herbal Knowledge |
| Field data (sun, temperature, encounter, season) | stat pips | Field Identification (seasonality) |
| Identification | | **Field Identification** |
| Lookalikes | safety strip links here | **Field Identification** |
| Habitat | | **Field Identification** |
| Usable parts, Preparations, Taste | | Herbal Knowledge |
| Sources and evidence | | Herbal Knowledge (foot) |
| Safety notice, site caution, card warning | strip, always | Herbal Knowledge (full text) |
| Sightings (journal) | | Your Progress |
| Mastery track, card check | stepper and button | Mastery Challenges |
| New: challenges and Boss Form | Boss node on the stepper | Mastery Challenges and Your Progress |

## 3. Expanded profile (below the card view, accordion, ids unchanged)

1. **Field Identification** (first, open by default): reference photographs, distinguishing
   traits, leaves/stems/flowers, habitat, seasonality, lookalikes with how to tell them apart.
2. **Herbal Knowledge**: traditional uses (existing non-claim framing), compounds,
   preparations, parts, taste, evidence and sources, safety.
3. **Mastery Challenges**: the card check, then the three activities and the Boss Trial
   (each locked until mastered; unavailable, with the reason, until reviewed).
4. **Your Progress**: stage dates, sightings, sprite evolution strip with the Boss slot,
   requirements checklist.

Entry points: Collection opens the card view. Learn opens `/learn/plants`, a plain list of
species with a Field Identification link to the same page at `#field-identification` (a native
anchor, no extra route).

## 4. Before discovery

Always visible: the plant's name and scientific name in the profile, reference photographs,
field identification, lookalikes, habitat, season and every safety warning. Locked until
discovery: card artwork and back, Healing Traits chips and Herbal Knowledge content (except
safety), personal progress, Garden sprite, mastery rewards. The card view shows the locked
silhouette and "Find this plant to unlock the card". The Collection grid is unchanged.

## 5. Files affected

`HerbDetail.tsx` (layers), new `CardView.tsx` and `ProfileAccordion.tsx`, `profile-sections.ts`
(adds a grouping layer; ids and the dialog-owning section unchanged), `LockedHerb.tsx`
(shows the profile instead of hiding it), new `app/learn/plants/page.tsx`, `app/learn/page.tsx`
(one link), and their tests. No data files change.

## 6. Decisions needed

1. Healing Traits chips on the card: keep a short "Traditional use" label on them, or none?
2. Accordion (recommended: anchors and deep links work) or tabs?
3. Undiscovered profile shows the plant's name. Confirm.
