# Plantdex

Website and companion app for the **Plantdex** herbalism card deck — a 45-card illustrated
deck of common wild plants, plus a digital *Herbdex* for tracking the plants you find in
real life.

Current stage: **V0.2** — a working, mobile-first Herbdex prototype driven by the real deck
data, with discovery, XP, levels and achievements persisted in the browser. No backend yet.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

Requires Node 20+.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm test` | Vitest unit tests |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run verify` | All four — run this before pushing |
| `npm run build:deck -- --source <dir>` | Regenerate deck data and card art |

## How the app is put together

```
src/
  app/                     Routes: / , /herbdex , /herbdex/[herbId]
  components/herbdex/      Card grid, progress header, discovery flow, stat pips
  components/              SafetyNotice (shown on the Herbdex and every herb page)
  lib/
    types.ts               Domain types
    deck.ts                Loads generated deck data; display labels
    progression.ts         *** the only place XP and level thresholds exist ***
    achievements.ts        Achievement registry, keyed by stable id
    herbdex-reducer.ts     Pure state transitions; idempotent discovery
    storage.ts             Storage interface + localStorage adapter (the V0.3 seam)
  state/HerbdexProvider    React context wiring the above together
  data/herbs.json          GENERATED — do not hand-edit
scripts/build_deck.py      Generates herbs.json + public/cards from the print package
```

### Two design decisions worth knowing

**XP is derived, not stored.** The only things persisted are which herbs you discovered and
when. XP is recomputed by summing the discovered herbs' values. There is no XP counter to
increment twice, so replaying a discovery cannot inflate a total — the anti-farming rule is
a property of the data model rather than a check that could be bypassed.

**Deck data is generated, not written by hand.** `scripts/build_deck.py` holds a
transcription of the 45 card fronts and *re-derives the numeric stats from the card images
on every run*, failing loudly if the transcription and the artwork disagree. Regenerating
after a deck revision is one command.

## Regenerating deck data

The print package is not committed (large binaries). Point the script at a local copy:

```bash
pip3 install pillow pymupdf
npm run build:deck -- --source /path/to/card-pdfs
```

`--source` is a directory of two-page per-card PDFs (page 1 front, page 2 back), named so
the card number is the trailing number in the filename.

This rewrites `src/data/herbs.json` and `public/cards/`.

## Card content

Both faces of all 45 cards are transcribed. Fronts supply name, botanical name, encounter
rate, season, use icons and the 1-5 growing-condition pips; backs supply Healing Traits,
Signature Compounds, Taste and Aromatic Profile, Preparations and Usable Parts. Icon labels
and the disclaimer come from the deck's own Icon Cheat Sheet and Disclaimer cards.

Cards carrying a printed warning (currently only Yarrow's poisonous-lookalike note) surface
it above the discovery button.

Errors found on the printed cards are transcribed as-is and listed under `knownCardIssues`
in the generated data, so they are visible to fix in a future print run rather than being
silently patched here.

Accounts, checkout, QR scanning and AI identification are later roadmap stages (V0.3–V0.5).

## Deploying

The site is a static export, hosted on GitHub Pages:

**https://lillfaith.github.io/Plantdex-website/**

`.github/workflows/deploy.yml` rebuilds and redeploys on every push to the default
branch. It runs lint, typecheck and the test suite first, so a broken commit does not
reach the live site.

To reproduce the deployed build locally:

```bash
GITHUB_PAGES=true npm run build   # writes out/
npx serve out
```

`GITHUB_PAGES=true` switches on the `/Plantdex-website` base path that a GitHub Pages
*project* site is served from. Note that Next does **not** apply `basePath` to
`next/image` sources when `images.unoptimized` is set (which static export requires), so
image paths go through `assetPath()` in `src/lib/asset-path.ts`. Use it for anything you
reference out of `public/`, or it will 404 on the deployed site while working locally.

## Contributing

Read [`AGENTS.md`](./AGENTS.md) (the product spec and its safety rules) and
[`CLAUDE.md`](./CLAUDE.md) (the architecture rules that follow from it) before changing
anything. Run `npm run verify` before pushing.
