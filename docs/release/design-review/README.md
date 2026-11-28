# PlantDex game-UI review (2026-11-28): audit, proposal, first three pages built (nothing merged)

Method: every page was loaded from the real build at 320, 375, 390 and 1280 (viewport, not stitched), signed out with a local collection and signed in on the TEST project with a real throwaway account, DOM-measured for overlap with the floating marks and the bottom nav, tiny text, overflow and contrast, and read against its source. No paid provider call was made. Habitats shows 404 only because its route is deliberately `notFound()` unless `NEXT_PUBLIC_GEORGIA_QUEST_PREVIEW=on` (`src/app/quests/habitats/page.tsx`): intentional flag behaviour, not a broken exposed route, and it is not linked from anywhere while the flag is off.

Priorities: **P0** broken/unreadable/blocked, **P1** hierarchy, engagement and coherence, **P2** polish. "Style" = achievable with styling and hierarchy alone; "Defer" = needs a feature or backend change.

## Shared findings (all lavender pages)
- **P0 (fixed in `ui/game-ui-pass`)** Home's eyebrow ("45 ILLUSTRATED SPECIES") ran under the Sign in/trophy marks at 390px; titles at 320px ran under them elsewhere (fixed earlier in #129/#131).
- **P0 (fixed in `ui/game-ui-pass`)** Software keyboard: the fixed bottom nav could sit over the field being typed into. The nav now steps aside while a text field has focus (phones only).
- **P1 (open)** Large text: at 125% root size the seven-tab nav clips "Collection" at every phone width (`navScroll` true at 375/390). The six-tab layout (`NEXT_PUBLIC_NAV_LAYOUT=six`, already built) removes the problem; this needs the owner's nav decision. Touch targets are 45-51 x 48px (fine); safe-area padding is in place.
- **P1** Cards everywhere are the same rounded rectangle. The new `.pd-panel` / `.pd-tile` / `.pd-badge` / `.pd-btn` set (merged in #129) gives the shared grammar; pages need to use it with character (tones, a real pixel illustration at the top, one primary action) instead of repeating one box. Seasons, Field Board and Account are the first pages rebuilt that way.
- **P1** Secondary text at 11.5px remains on Collection (89 instances), Profile (51) and Home (4). Plant detail was raised to 13px; the same one-line rule can be applied to Collection and Profile.
- **P2** Footers are plain text links on every page; a pixel-forest strip exists (`pixelForest()`) and could sit above the footer on the lavender pages.

## Page by page
**Home.** Works: logo, creature stage, one dominant "See the deck" action, Identify/Explore pair, regional-quest door. Out of place: eyebrow collision (fixed). Gameplay: a signed-in player gets no "continue where you left off" (next action, level progress) above the fold; defer? No: Style+existing data (level, next Field Card, a daily task) can be shown; new rules none. Weak: 2832px tall for a landing page; the "Healing traits" carousel competes with the CTA. P1: promote the player's next action; P2: shorten.
**Scan.** Works: one camera tile, optional tiles, consent and recovery. Weak: the XP bar, daily goal, step trail, notice, intro line and three safety panels all precede or surround the one action. P1 (style): collapse the two safety notices into one expandable strip below the action; keep consent wording. P2: animate the camera glyph once.
**Collection.** Works: stat tiles, recent finds, grid. Weak: 11,994px; the grid is 45 identical cards with the filter bar scrolling away. P1: sticky filter/tab row; "Found" first when the player has finds. 89 pieces of 11.5px text. Defer: nothing.
**Plant detail** (Identify, Herbalism, Challenges, Progress). Works after #129. P1 remaining: the hero card plus sprite showcase plus tabs plus mastery rail is four systems; the "Keep growing" badge and "Explore full plant profile" button are two actions with the same destination in spirit. Style only.
**Garden.** Works: stage glows, "How plants grow". Weak: the bed is a large empty frame with three sprites at small size, and the two link rows below read as ordinary list items. P1: link rows become pd-tiles with art; empty beds invite a find ("3 of 45 planted; scan one to plant the next"). Defer: the customisable Garden/World (explicitly not started).
**Quests.** Works: region picker, honest copy. Weak: first screen is a paragraph and a dropdown, with no sense of the player's progress in that region. P1: region summary tile (found / total for the printed cards recorded there) once a region is chosen; data already exists. Defer: new quest mechanics.
**Habitats (flag).** 404 by design (see above); verified, not a defect. When enabled it already uses the lavender attributes.
**Journal.** Works: clear empty state. Weak: 844px of very little; the empty state is text only. P1: use a pixel illustration and a single "Log a sighting from a card" action; P2 only otherwise.
**Learn.** Works: four illustrated tiles. Weak: 918px, inconsistent tile heights; the Herbal Safety tile duplicates the safety footer. P2.
**Profile.** Works: hero, field record, habitat bars. Weak: blank avatar frame when no avatar is chosen looks broken; "Unnamed". P1: a prompt tile ("Choose your first avatar") using the sprites the player has unlocked, no new data.
**Seasons (built: `agent/quests/seasons-game`).** Before: one 45-row list, four identical sections, no link to the collection. After: caveat kept, four tabs each showing collected/total derived only from `discoveries`, a season-tinted progress rail, readable rows (card crop, common name, scientific name, #, Collected / To find), every row a real link. Defer: month-level phenology (no cited data).
**Field Board (built: `agent/discoveries/board-scoreboard`).** Before: trophy, numbers and button floating on a blank page. After: title plate with the trophy, provisional notice, a scoreboard (total + species/entries/challenges tiles showing what each is worth, from `SCORING_RULES`), a truthful signed-out panel, panelled membership, scope control and empty state. Unchanged: opt-in, scoring, permissions, the podium (shown only when real rows exist; verified signed in on TEST). Defer: avatars of other players (needs its own consent).
**Account (built: `coord/account-passport`).** Before: two stacked forms, two sign-in buttons. After: one tabbed panel (Sign in / Create account), show-password control, labelled fields and alert-role errors, forgot-password kept, `autocomplete` tokens unchanged; signed in becomes a passport (avatar, name, title, level, cards collected) with plain link rows to Profile (data, sign out, deletion stay there), Field Board and Privacy. Defer: email/password change screens (no such feature exists).

## Remaining routes: migration plan (no automatic recolouring)
| Route | Plan |
|---|---|
| Seed Shelf | Keep the wooden wall as a themed exception; only the empty-state box and link text get pd styling. |
| Shop | Keep the physical deck photography as the hero; light body sections under a dark hero band; wording, price and Stripe link behaviour untouched. |
| Order thanks | Light lavender success tile, numbered "what happens next" as pd-tiles; no delivery promise added. |
| Start (QR landing) | Keep the dark dramatic top band; the single "Scan a plant" button becomes `.pd-btn`; trust-level rules untouched. |
| Safety, Privacy, Terms, Terms of sale, Returns, Shipping | A "document" skin: lavender ground, one white reading panel (max 65ch), deep-plum text, clear heading scale, a contents chip row on the long ones (Privacy is 11,936px). Every legal word and link preserved; no game mechanics. |
| Habitats | Unchanged until the flag is intentionally enabled. |
The operator's name and contact address appear in Privacy and Terms; confirm that is meant to be public.

## Branches (nothing merged; each in its own lane)
`agent/quests/seasons-game`, `agent/discoveries/board-scoreboard`, `coord/account-passport`, `ui/game-ui-pass`. Preview used for the screenshots: `preview/design` (all four on integration, TEST-configured build). Full vitest on it: 2710 passed.
