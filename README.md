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
pip3 install pillow
npm run build:deck -- --source /path/to/plantdex_claude
```

This rewrites `src/data/herbs.json` and `public/cards/`.

## What is deliberately missing

Card-back content — habitat, identification notes, preparation, cautions — is **not** in the
app. It is printed on the card backs, which are not in the reference package, and inventing
botanical or safety text is prohibited by [`AGENTS.md`](./AGENTS.md). Those sections will
appear once the back content is supplied.

Accounts, checkout, QR scanning and AI identification are later roadmap stages (V0.3–V0.5).

## Contributing

Read [`AGENTS.md`](./AGENTS.md) (the product spec and its safety rules) and
[`CLAUDE.md`](./CLAUDE.md) (the architecture rules that follow from it) before changing
anything. Run `npm run verify` before pushing.
