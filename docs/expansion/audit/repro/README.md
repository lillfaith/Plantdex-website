# Reproducing the audit measurements

Nothing here touches `src/`. The numbers in `../profile-structure.md` and `../integration-map.md` were taken in a
**scratch copy** of the repository (tracked files only, `node_modules` symlinked), never in the working tree.

```bash
# 1. scratch copy
mkdir /tmp/sim && git ls-files | grep -vE '^(evidence|field|field-inat|iCloud|product-source)/' | tar -cf - -T - | tar -xf - -C /tmp/sim
ln -s "$PWD/node_modules" /tmp/sim/node_modules
# 2. the draft data, read from the card-production branch (never modified)
mkdir /tmp/sim/src/audit
git show origin/claude/plantdex-v0-3-supabase-verify-iic8pz:src/data/expansion-cards.json > /tmp/sim/src/audit/expansion-cards.json
cp docs/expansion/audit/repro/expansion-herbs.ts.txt /tmp/sim/src/audit/expansion-herbs.ts
cp docs/expansion/audit/repro/extract.test.ts.txt     /tmp/sim/src/audit/extract.test.ts   # per-card matrix of the 54 live cards
cp docs/expansion/audit/repro/draft.test.ts.txt       /tmp/sim/src/audit/draft.test.ts     # 85 drafts against today's tables
# 3. the simulated import: three one-line edits, in the COPY only
#    catalogue.ts : DIGITAL_ONLY_ENTRIES = [...FIELD_CARDS, ...EXPANSION_HERBS]        (SIM_MODE=digital)
#    deck.ts      : PRINTED_CARDS        = [...DECK.herbs, ...EXPANSION_HERBS]          (SIM_MODE=printed)
#    collection.ts: add a digital collection `expansion` to COLLECTIONS                 (SIM_COLLECTION=declared)
cd /tmp/sim && SIM_MODE=digital SIM_COLLECTION=none     npx vitest run   # A1
              SIM_MODE=digital SIM_COLLECTION=declared npx vitest run   # A2
              SIM_MODE=printed SIM_COLLECTION=none     npx vitest run   # B
```

`expansion-herbs.ts` maps each draft card to a minimal `Herb` (identity, front, back, the conventional art paths) and
invents nothing else: no field notes, habitat, sources, sprite or artwork. That is the point of the measurement.
The `.txt` suffix keeps these files out of the repo's own `tsc`, ESLint and vitest globs.
