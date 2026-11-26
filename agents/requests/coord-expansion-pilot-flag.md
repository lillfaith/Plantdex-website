# Shared Change Request: default NEXT_PUBLIC_EXPANSION_PILOT to 'off' in next.config.ts

- From lane: coordinator (catalog integration)      Task: expansion pilot importer (docs/expansion/pilot/importer.md)
- Needs: contract (`next.config.ts` is shared; this task may not edit it)

## Why
`src/lib/expansion-pilot-flag.ts` tests `process.env.NEXT_PUBLIC_EXPANSION_PILOT === 'on'`. Unset, that is already false, so behaviour is
unchanged. But only a variable defined in the `env` block of `next.config.ts` becomes the literal `'off'` at build time, which is what lets the
bundler delete a gated import entirely (the `NEXT_PUBLIC_BOSS_FORMS` pattern). Nothing imports the pilot data today, so this is needed only
before the first reader of it is written, and that reader must not land before this line does.

## Exact proposal
In the `env` block of `next.config.ts`, beside `NEXT_PUBLIC_BOSS_FORMS`:
```ts
NEXT_PUBLIC_EXPANSION_PILOT: process.env.NEXT_PUBLIC_EXPANSION_PILOT ?? 'off',
```
Do not set the variable in any workflow, environment or `.env` file.

## Who else depends on it
`src/lib/expansion-pilot-flag.ts` (no importers yet); `src/lib/expansion-pilot-bundle.test.ts`, whose built-export scan runs with the flag off.
Optionally pin it with a config assertion in the style of `boss-form-bundle.test.ts` once the line exists.

## Risk and rollback
None while `'off'`. Revert the line.

## Second request, same owner: where the generated file lives
`src/data/**` is human-owned (tier 0), so an agent branch cannot commit `src/data/expansion-pilot.generated.json`. The generator defaults to that
path for the owner to run (`node scripts/expansion/generate_pilot.mjs`); the reviewed copy lives at `docs/expansion/pilot/expansion-pilot.generated.json`
and a test pins the two to the same bytes if both exist. Either approve the owner running it, or add `scripts/expansion/` output to a writable rule.

## Does this need the owner? (coordinator fills in)
The `next.config.ts` line: no, while it defaults to 'off'. Enabling the flag, or placing generated data under `src/data/`: yes.
