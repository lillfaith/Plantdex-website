import { describe, expect, it } from 'vitest';

import { foldSighting } from './remote-sightings';
import type { Sighting } from './sightings';

/**
 * The tab-level cache behind the signed-in journal.
 *
 * `remote-sightings.ts` needs a browser and a session for everything else it does, so the
 * one decision that can be wrong without the network being wrong is pulled out here: what
 * a newly written row is allowed to imply about the rest of the journal.
 */

function sighting(id: string): Sighting {
  return { id, herbId: 'taraxacum-officinale', date: '2026-05-01', createdAt: `2026-05-01T09:0${id}:00.000Z` };
}

describe('folding a new sighting into the cache', () => {
  it('appends to a journal that has actually been loaded', () => {
    const loaded = [sighting('1'), sighting('2')];
    const next = foldSighting({ cache: loaded, loadedForUser: 'alice' }, 'alice', sighting('3'));
    expect(next.loadedForUser).toBe('alice');
    expect(next.cache?.map((s) => s.id)).toEqual(['1', '2', '3']);
  });

  it('never lets one new row stand in for a journal that has not loaded', () => {
    /*
     * THE BUG, REPRODUCED IN THE BROWSER FIRST: an account with two sightings, one dropped
     * GET on the sightings table, then a third sighting logged. The field log read "1" and
     * stayed at 1 — the cache had been declared loaded with a single row in it, so nothing
     * fetched again and the two real sightings were invisible until a page reload.
     *
     * Both shapes of "not loaded" have to behave: nothing read yet, and a load that failed.
     */
    const fresh = foldSighting({ cache: null, loadedForUser: null }, 'alice', sighting('3'));
    expect(fresh.cache, 'a single row was presented as the whole journal').toBeNull();
    expect(fresh.loadedForUser, 'an unloaded cache was marked loaded').toBeNull();
  });

  it('never folds one account rows into another cached in the same tab', () => {
    // Sign out, sign in as somebody else, log a sighting before the new journal has loaded.
    const previous = { cache: [sighting('1')], loadedForUser: 'alice' };
    const next = foldSighting(previous, 'bob', sighting('2'));
    expect(next.cache, "Bob's sighting was appended to Alice's journal").toBeNull();
    expect(next.loadedForUser).toBeNull();
  });
});
