# Plantdex ad creative rules

Permanent rules for every video made with this system. They are derived from `AGENTS.md`
(the product spec) and `CLAUDE.md` (how the product is built) and carry the same weight: a
video that breaks one is wrong, not merely off-brand. Where a rule can be checked by a
machine, `npm run lint:ads` or `npm run qc` checks it; the rest are on the person making
the video.

---

## 0. The core message: real plants, real knowledge

**This is Plantdex's most important selling point, and every ad should carry it.** The plants
are not random collectibles. They are real backyard and wild plants, and each one comes with
real things to learn: how to recognise it, what it has traditionally been used for, the
compounds it contains, which parts are used, and, for some cards, whether the card marks it
edible. The viewer should leave thinking: *"I'm collecting plants, but I'm also learning what
they actually are and why people care about them."*

- **Reveal knowledge as the reward for discovering a plant**, periodically, like game stats
  being unlocked. The `knowledge` scene does exactly this. Every value it shows is checked by
  `lint:ads` against that plant's own data (`herbs.json` card backs,
  `src/lib/card-field-notes.ts` identification traits), so a tag can never show something
  the app does not teach.
- **Preferred wording** (all `authored`, all still scanned for banned claims):
  - "Learn what this plant has traditionally been used for."
  - "Discover the compounds inside it."
  - "Learn how to recognize it in the wild."
  - "Every card teaches you something real about the plant."
  - "Every plant unlocks something real to learn."
  - "These aren't fictional collectibles. They're real plants growing around you."
  - "Collect plants you can actually find outside."
  - "Learn whether it's edible." (**only** under the edibility rule below)
- **Never say or imply** that a plant cures, treats, prevents, heals, replaces medication or
  guarantees a health benefit. "Traditional uses" means what the card prints as traditional
  preparation (Tea, Roasted roots), not what it does to a body. Don't feature "Healing traits"
  items (Anti-inflam., Liver support…) as ad copy.
- **Edibility is card-specific.** The app never declares a plant safe to eat. An EDIBILITY tag
  or "learn whether it's edible" may appear only for a card that prints the **Edible** use
  icon: Purslane (#6), Maple (#17), Blackberry (#18), Sumac (#20), Chicory (#21), Field
  Garlic (#29), Wild Strawberry (#30), Passion Flower (#43), Prickly Lettuce (#44). Never
  Elderberry (#31), whose card carries a hazard caution. An edibility beat always needs an
  on-screen identify-first line (e.g. "Never eat a wild plant you haven't positively
  identified."). **Owner decision:** a card without the icon may still carry an EDIBILITY tag
  when its value is what the card PRINTS about eating it: an eaten preparation or part from
  its back (Dandelion: "Fresh greens"). Never a value from anywhere else. `lint:ads` enforces
  all of it: the value from the card, the identify-first line in the scene, and never Elderberry.

## 1. Only real assets

- **Every pixel of product imagery comes from the ad asset pack** (including owner-shot
  footage and photos added with `scripts/add_supplied.py`), as indexed in
  `manifest/assets.json`. Cards, sprites, screenshots, UI components, product photography,
  the app icon and the colour tokens. `lint:ads` fails on any image path that is not in
  the manifest, and `qc` re-hashes every file a render used against the manifest.
- **Never invent** a card, a card face, a card back, a sprite, a sprite frame, a screen, a
  UI component, a gameplay mechanic, a feature, a reward, a number or a plant fact. If an
  ad needs something the pack does not contain, the ad changes — the pack does not.
- **No AI-generated stand-ins** for any Plantdex object. Generative imagery may never
  depict a card, the app, a sprite or the deck.

## 2. What you may do to a real asset

Allowed: move, scale, rotate, tilt in 3D, crop to a region, mask with rounded corners, add
a drop shadow, fade, blur a *background* plate, pan and zoom, sequence frames, place assets
side by side, put a device frame around a screenshot.

Also allowed, because the app itself does it:

- **A sprite as a silhouette, revealed.** Undiscovered plants are silhouettes in the Herbdex
  grid, so a dark silhouette that bursts into the real sprite mirrors real behaviour. The
  outline must be the real frame's (`SpriteAnimation silhouette`), never a drawn shape.
- **Gradient emphasis on caption words** (`*word*` in a spec). It changes colour only;
  `lint:ads` strips the markers before checking a quote, so emphasis can't alter wording.

Not allowed:

- **Changing proportions.** No non-uniform scaling. Card aspect 800:1295 stays 800:1295.
- **Changing wording.** Never retype, edit, cover or re-letter text that is on a card or a
  screenshot. Captions sit *beside* or *over empty space*, never over printed words.
- **Recolouring, filtering or restyling** a card, sprite or screenshot (no hue shifts,
  duotones, "glow-up" filters). Brightness/blur is allowed only on a background plate.
- **Smooth-scaling pixel art.** Sprites are authored on a small grid and must be scaled by
  whole numbers with nearest-neighbour (`image-rendering: pixelated`). `SpriteAnimation`
  enforces integer scale.
- **Faking a sprite's motion.** A sprite animates only by playing its real frames in order,
  at the fps in the manifest (from `src/data/sprites.json`). You may move the whole sprite
  (enter, bob, scale in) — you may not warp, squash or re-time individual frames.
- **Showing a card back that carries "Healing Traits"** without the product's non-claim
  framing. The per-card backs (`01-cards/back-800`) print traditional-use headings; an ad
  cannot carry the framing the app gives them, so ads use card fronts only.

- **Full-bleed means sharp.** A full-screen scene uses footage or an image at least
  1080×1920; the 1100px product photos are inset-only, since full-bleed they upscale ~1.5×
  and go soft. The box back prints "medicinal" and "Healing traits": show the box as an
  object, never feature that copy.

## 3. Gameplay and features — say only what exists

- **Every statement about the app must be true of the shipped app today.** The safest
  source for wording is the app's own copy, visible in the screenshots. Prefer quoting it.
- **Decorative motion graphics are allowed** (sparkles, glows, wipes, light sweeps,
  background particles) but must never look like app UI or be presented as a feature.
  If a viewer could reasonably think "the app does that", it is not decorative.
- **A screenshot is shown as a screenshot.** Pan, zoom and highlight it; never animate
  elements *inside* it as if the app were running, and never composite a state the app
  did not render (e.g. a different XP number, a different card in a slot).
- **The three stages are discovered → learned → mastered.** Don't rename, skip or reorder
  them, and don't imply XP comes from anything other than those records and Field Research.
- **Field Cards (#48+) are digital-only**, earned by XP. Never show one as part of the
  physical deck or imply it can be bought.
- **The scan screen's creature (the "scout") is dressing, not a species.** Never label it.
- **"A wild X appeared" is a hook line, not a feature.** There are no random encounters,
  spawns or battles in Plantdex. Hooks may play with the phrase; no scene may depict it as
  an app mechanic.

## 4. Plants, safety and claims

- **No medicinal, health or treatment claims.** Not in captions, voiceover or on-screen
  text. The deck's framing is *traditional use*, never treatment. No "heals", "cures",
  "treats", "boosts immunity", "detox", "remedy", "medicine".
- **No edibility or safety claims.** Never "safe to eat", "edible", "forage this", or
  anything implying the app confirms what a plant is. Identification is *a suggestion to
  check, not a verdict* — that is the app's own line; use it.
- **Every ad that shows identification carries a safety line** on screen, at a readable
  size, for at least 1.5 seconds. `lint:ads` fails a spec with a `screenDemo` of `scan` and
  no safety line.
- **Prefer hero cards with no printed warning and no known card issue** (see the Flags
  column in `manifest/ASSETS.md`). Card #31 (Elderberry) carries a hazard caution; do not
  use it as a hero.
- **Plant names are the card's**: the common name as printed, scientific name as the app
  writes it (`Taraxacum officinale`), never a name derived from a file stem.

## 5. Commerce and trust

- **No third-party trademarks on screen** — no "Pokémon", "Pokédex" or similar, even as a
  comparison. It reads as an affiliation and platforms reject or limit it. Name the genre
  instead ("a collecting game"). `lint:ads` enforces a list.

- **Never claim the deck is on sale, or give a price, shipping time, stock level,
  discount, deadline or scarcity** unless the owner has confirmed it for that campaign.
  As of the pack's screenshots the site says: *"The digital Plantdex is free. The physical
  deck is optional — and not on sale yet."* Default CTAs point at the free app.
- **No fabricated testimonials, reviews, user counts, ratings or press.**
- **No countdowns or "limited" language.**
- **Photography rights are unconfirmed.** The card fronts and product photos contain
  photography whose licensing is not recorded. Confirm before any *paid* placement.

## 6. Brand look

- Palette: only the tokens in `00-brand/palette.json` (`src/lib/brand.ts` exposes them).
  Ground is `plum-950`/`plum-900`; headings `gold-400`; accents `mystery-pink`/`violet-400`.
- Type: **Outfit** for UI and captions, **Fraunces** italic for scientific names —
  the two families the site loads.
- Feel: premium, playful collectible, botanical. Avoid childish, clinical, cluttered,
  generic-SaaS or obviously-AI-generated looks. Generous spacing, subtle motion.
- 9:16 at 1080×1920, 30 fps. Keep captions inside the safe zone (top 220px and bottom
  380px are covered by platform UI on TikTok/Reels/Shorts).
- Motion is purposeful and finite: no infinite pulsing, no strobing.

## 7. Before an ad ships

1. `npm run lint:ads` — every asset in the manifest; banned-claim scan; safety line present.
2. `npm run render` — MP4 to `exports/`.
3. `npm run qc` — asset hashes, sprite frames advance, no blank/missing frames, and a
   contact sheet in `exports/qc/` that a human looks at before upload.
4. A person reads every caption against the card and the screenshot it sits beside.
