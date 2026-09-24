# Plantdex video

Data-driven Remotion system for 9:16 social ads built **only** from the real Plantdex ad
asset pack. Read [`CREATIVE_RULES.md`](./CREATIVE_RULES.md) before making anything.

A standalone package: it has its own `package.json` and `tsconfig.json`, and the website's
TypeScript, ESLint and build ignore this folder entirely.

## Setup (once per machine)

```bash
cd video
npm install
npm run assets -- path/to/plantdex-ad-assets-part1-sprites-ui.zip \
                  path/to/plantdex-ad-assets-part2-cards.zip \
                  path/to/plantdex-ad-assets-part3-screens.zip \
                  path/to/plantdex-ad-assets-part4-screens-desktop-full.zip
npm run manifest          # only needed when the pack itself changes
```

Owner-shot photos and video go in with `add_supplied.py`, then `npm run manifest`:

```bash
python3 scripts/add_supplied.py IMG_9519.mov deck-fan-on-grass IMG_1234.jpg box-front
```

It **re-encodes every file**, which removes the camera's GPS/location metadata before anything
can be uploaded. Video lands in `07-footage/` (H.264, capped at 2160 wide), photos in
`08-photos/`. `assets/sources.json` keeps each original's name and hash.

The ZIPs unpack into `assets/` (gitignored, 79MB). The manifest in `manifest/` IS
committed. It records each ZIP's SHA-256 and every file's hash, and QC checks renders
against it.

## Make an ad

```bash
npm run find -- dandelion       # search plants, cards, sprites, screens, UI parts
npm run studio                  # live preview in the browser
npm run produce                 # lint:ads → typecheck → render → qc
```

`produce` writes `exports/<id>.mp4` (H.264 yuv420p + AAC, 1080×1920, 30fps; ready for
Blotato, TikTok, Reels and Shorts). It also writes `exports/<id>.qc.json` and a contact sheet
at `exports/qc/<id>-contact.jpg`. **Look at the contact sheet before uploading.**

Stills only, for fast layout iteration:

```bash
node scripts/render.mjs wild-plant-appeared --stills 0,90,200
```

## How it fits together

| Path | What it is |
|---|---|
| `ads/*.json` | One spec per ad: its scenes, their timing, and which assets and captions each uses. List new files in `src/ads.ts`. |
| `src/Ad.tsx` | Renders any spec: scenes in a `TransitionSeries` with `fade` / `slide-up` / `wipe` entrances. |
| `src/scenes/Scenes.tsx` | The scene types: `hook`, `cardReveal`, `photo`, `footage` (owner-shot video), `screenDemo`, `uiCallout` and `cta`. |
| `src/components/` | Reusable parts: `SpriteAnimation` (real frame sequences at the manifest fps, integer nearest-neighbour scale), `PhysicalCard`/`CardReveal`, `PhoneFrame`/`ScreenshotView` (pan, zoom, highlight), `UiCallout`, `Caption`/`Kicker`/`SafetyLine`, `Backdrop`, `SparkBurst`/`RevealRing` (decorative). |
| `src/lib/assets.ts` | The only way to reach an image. Every lookup goes through the manifest and throws on anything not in the pack. |
| `src/lib/brand.ts` | Colour tokens from the pack's `palette.json`; Outfit and Fraunces from `fonts/`. |
| `scripts/lint-ads.mjs` | Pre-render rule check (see below). |
| `scripts/qc.mjs` | Post-render check (see below). |

### Swapping assets

Every asset is named by a manifest key, so a new version of an ad is a JSON edit:

- change `"plant"` to any printed card id to get that card, its sprite and its name;
- change `"screen"` to any key under `screens` in the manifest;
- change `"part"` to any key under `uiParts`.

Captions that show card facts use tokens (`{commonName}`, `{scientificName}`,
`{cardNumber}`, `{rarity}`), so they follow the plant automatically.

### Where on-screen text comes from

Every line declares `source`:

- `quote`: the app's own words. `lint:ads` finds them verbatim in the website's `src/`.
- `card`: filled from the card's data with tokens.
- `authored`: ad copy. It is scanned for banned claims and must be read by a person.

## The checks

**`lint:ads`** (before render) fails if any of these happen:
- an asset is not in the pack;
- a `quote` is not in the app's source;
- text contains a medical, edibility, commerce, scarcity, price, certainty or social-proof claim;
- the hero plant prints a warning, has a known card issue, or is a digital-only Field Card;
- an identification demo has no safety line;
- a sprite scale is not a whole number;
- the scenes don't add up to the declared length.

**`qc`** (after render):
- re-hashes every file the ad used against the manifest, and the ZIPs against their recorded hashes;
- checks every sprite sequence's frame count, ink and motion;
- checks the container: codec, pixel format, size, fps, frame count and audio track;
- decodes every frame, failing on any that is blank or flat, and requires a non-empty first frame (the thumbnail);
- confirms the hook sprite animates in the rendered video;
- builds the contact sheet.

Neither check can confirm image rights. The pack README says the photography on card fronts
and product shots has no recorded licence, so confirm that before any paid placement.

## Ads

### Wild Plant Appeared (`wild-plant-appeared`, 15s)

| Time | Scene | Assets | Text |
|---|---|---|---|
| 0–2.5s | hook | Dandelion adult sprite, 16 real frames @ 12fps, 4×: opens as a silhouette (the Herbdex's undiscovered look) and bursts into colour with a flash, shake and punch | "A wild **Dandelion** appeared!" (the name comes from the card) |
| 2.2–5s | card reveal | Card #01 front | "Collection 01 · Card #01" / "Every plant is a real, illustrated card." |
| 4.7–6.8s | footage | `07-footage/deck-fan-on-grass.mp4` (owner-shot 4K, Dandelion on top) with a slow push-in | "Now find them growing." / "Find plants outside. Scan them. Build your collection." (home and /start copy) |
| 6.5–10.5s | screen demo | `/scan` then `/herbdex/taraxacum-officinale` phone screenshots, joined by a push | scan and /start copy, plus the safety line "The answer is a suggestion to check, not a verdict." highlighted where the real page prints it |
| 10.2–12.3s | UI callout | `garden-grid` plus Dandelion's sprout, growing and adult sprites | Garden page copy: "Find it — sprout. Learn its card — growing. Find it again — flowering." |
| 12–15s | CTA | `02-product/deck-in-hand.jpg`, four real sprites | "Plantdex" / "The digital Plantdex is free." / "Link in bio" |

It has no music. The silent AAC track is deliberate: add a trending sound in-platform.

### Wild Plant Appeared: curiosity hook (`wild-plant-appeared-v2`, 16.5s)

Identical to the ad above except for the first two seconds. The silhouette holds for 2s while
"I turned finding wild plants into a *collecting game.*" builds word by word above it (the
first three words are already on screen at frame 0, the thumbnail). The reveal and
"A wild **Dandelion** appeared!" then land as the payoff. Driven by the hook's `teaser` field;
everything after the reveal is the same spec.

### Wild Plant Appeared: knowledge reward (`wild-plant-appeared-v3`, 18.2s)

Version 2 plus a 2s `knowledge` scene between the outdoor footage and the scan flow: the
Dandelion card centred, "Every plant unlocks *something real to learn.*", and four stat tags
popping in 5 frames apart. The tags are IDENTIFICATION (One flower per stalk), TRADITIONAL
USES (Tea · Roasted roots), NOTABLE COMPOUNDS (Inulin · Quercetin) and USABLE PARTS (Root ·
Leaf · Flower). Every value is lint-checked against the plant's data. USABLE PARTS stands in
for EDIBILITY because Dandelion's card doesn't carry the Edible icon (CREATIVE_RULES §0).
