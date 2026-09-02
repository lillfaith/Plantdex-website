import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * ONE PLACE DECIDES WHICH JOURNAL A PLAYER IS READING.
 *
 * `sightings.ts` (localStorage + IndexedDB) and `remote-sightings.ts` (Supabase) have the
 * same shape on purpose, which is exactly what makes reaching past the facade so easy to
 * do and so hard to see: the page renders, the types check, and it silently shows the
 * wrong player's journal.
 *
 * THE BUG THIS CATCHES, found in a real signed-in session: `/journal` called `useSightings`
 * from `sightings.ts` directly. A signed-in player with three sightings on the server was
 * told "Your journal is empty" — while the field log on the plant's own page, which does go
 * through the facade, showed all three. On a device that had been played signed out it was
 * worse than empty: it showed that device's sightings to whoever was signed in.
 */

const roots = ['src/components', 'src/app'];

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...tsxFiles(path));
    else if (/\.tsx?$/.test(entry) && !entry.endsWith('.test.ts')) out.push(path);
  }
  return out;
}

describe('the sightings facade', () => {
  it('is the only way a component reads a journal', () => {
    // Constants and types from `sightings.ts` are fine — GROWTH_STAGE_LABEL is shared
    // vocabulary. It is the HOOKS that pick a backend, and those belong to the facade.
    const hooks = /\buse(Sightings|SightingCounts)\b/;
    const offenders: string[] = [];

    for (const root of roots) {
      for (const file of tsxFiles(root)) {
        const source = readFileSync(file, 'utf8');
        for (const match of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*'@\/lib\/sightings'/g)) {
          if (hooks.test(match[1]!)) offenders.push(file);
        }
      }
    }

    expect(
      offenders,
      `these read the local journal directly instead of through sightings-store: ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  it('still exists to be reached through', () => {
    // Guards the guard: if the facade is renamed and this file's rule silently matches
    // nothing, the test above would pass for the wrong reason.
    const facade = readFileSync('src/lib/sightings-store.ts', 'utf8');
    expect(facade).toMatch(/export function useSightingCounts/);
    expect(facade).toMatch(/export function useSightingsStore/);
    expect(facade, 'the facade must be the one that branches on auth').toMatch(/useAuth\(\)/);
  });
});
