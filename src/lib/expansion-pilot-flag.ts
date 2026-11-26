/**
 * THE EXPANSION PILOT FLAG. Read as `=== 'on'` and nothing else: unset, 'off', 'true', '1' and 'ON' are all off.
 *
 * Nothing imports this yet, on purpose. The pilot data (`src/data/expansion-pilot.generated.json`) is not
 * reachable from any live module, so the flag has nothing to switch; it exists so the first reader has one
 * agreed name and one agreed comparison. For the bundler to drop a gated import, the variable must also default
 * to the literal 'off' in next.config.ts (see agents/requests/coord-expansion-pilot-flag.md) - the same
 * mechanism NEXT_PUBLIC_BOSS_FORMS uses. Do not set it in any workflow or environment.
 */
export const EXPANSION_PILOT_ON = process.env.NEXT_PUBLIC_EXPANSION_PILOT === 'on';
