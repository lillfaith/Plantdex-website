import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  ENTRY_PATH,
  ENTRY_PATHS,
  ENTRY_COLLECTION_ID,
  GENERIC_ENTRY,
  REQUIRES_REDEMPTION,
  isSafeGenericGrant,
  type EntryGrant,
} from './entry-point';
import { COLLECTION_01, getCollection } from './collection';

/**
 * THE PRINTED ENTRY POINT, AND THE LINE IT MUST NOT CROSS.
 *
 * `/start` is the address on a QR code, and a QR code is a public string: it can be
 * photographed across a vendor table, cropped out of a listing photo, or posted. So the only
 * thing opening it can honestly establish is that somebody saw a code.
 *
 * Every test here exists because the tempting version of this feature — "they scanned the
 * deck's code, so give them the deck" — is one line of code away at all times, and it would
 * quietly turn a photograph of a box into ownership, and eventually into cards nobody found.
 */

const START_PAGE = readFileSync('src/app/start/page.tsx', 'utf8');

describe('a generic printed code grants nothing', () => {
  it('confers only browsing, which everybody already has', () => {
    expect(GENERIC_ENTRY.kind).toBe('generic');
    expect(GENERIC_ENTRY.capabilities).toEqual(['browse']);
    expect(isSafeGenericGrant(GENERIC_ENTRY)).toBe(true);
  });

  it('refuses every capability that would need a redemption', () => {
    // Each of these is a claim about the physical world or about work done outdoors, and a
    // string printed identically on every box is evidence of neither.
    for (const capability of REQUIRES_REDEMPTION) {
      const forged: EntryGrant = {
        ...GENERIC_ENTRY,
        capabilities: [...GENERIC_ENTRY.capabilities, capability],
      };
      expect(isSafeGenericGrant(forged), capability).toBe(false);
    }
  });

  it('keeps ownership, verification and progression on the redemption side', () => {
    // Named individually rather than only iterated, so removing one from the list is a
    // deliberate edit to a test that says why it was there.
    expect(REQUIRES_REDEMPTION).toContain('ownership');
    expect(REQUIRES_REDEMPTION).toContain('verifiedSighting');
    expect(REQUIRES_REDEMPTION).toContain('progression');
    expect(REQUIRES_REDEMPTION).not.toContain('browse');
  });

  it('points at the one collection that has actually been printed', () => {
    expect(ENTRY_COLLECTION_ID).toBe(COLLECTION_01.id);
    expect(getCollection(ENTRY_COLLECTION_ID)?.medium).toBe('printed');
  });
});

/**
 * THE STRUCTURAL HALF, WHICH IS THE ONE THAT ACTUALLY HOLDS.
 *
 * The tests above check a data structure, and a data structure can be bypassed by a component
 * that simply does the write itself. These read the route's own source, the same argument
 * `seed-shelf.test.ts` makes about the shelf being unable to pay XP: a module that cannot
 * import the reducer cannot call it.
 */
describe('the /start route cannot write anything', () => {
  const FORBIDDEN = [
    // The collection reducer and everything that awards.
    'herbdex-reducer',
    'progression',
    'useHerbdex',
    'HerbdexProvider',
    // Stores that persist a player's own records.
    'seed-shelf-store',
    'sightings-store',
    'player-profile',
    'herbdex-store',
    // Anything that would let it write directly.
    'supabase',
  ];

  it('imports no store, reducer or progression module', () => {
    // Not named `module`: Next's lint forbids assigning that identifier, and a loop variable
    // trips it just the same.
    for (const forbidden of FORBIDDEN) {
      expect(
        START_PAGE.includes(`from '@/lib/${forbidden}`) ||
          START_PAGE.includes(`from '@/state/${forbidden}`),
        `/start imports ${forbidden} — it must not be able to write anything`,
      ).toBe(false);
    }
  });

  it('calls nothing that records a find, a card or a level', () => {
    // Function names rather than module paths, so a re-export or a barrel file cannot
    // smuggle one past the import check above.
    for (const call of [
      'discover(',
      'applyDiscovery',
      'applyLearned',
      'reconcileMastery',
      'reconcileResearch',
      'reconcileAchievements',
      'addSighting',
      'markLearned',
    ]) {
      expect(START_PAGE.includes(call), `/start calls ${call}`).toBe(false);
    }
  });

  it('is a server component, so it ships no interactive write path at all', () => {
    // The measurement island is a separate client component. If this file ever gains
    // `'use client'` the reason should be examined, because the page is a list of links.
    expect(START_PAGE.startsWith("'use client'")).toBe(false);
  });
});

describe('the three ways in', () => {
  it('offers exactly three, because a menu is what a stranger bounces off', () => {
    expect(ENTRY_PATHS).toHaveLength(3);
  });

  it('leads with the one that needs you to be standing outdoors', () => {
    // The order is the argument, not a detail: scanning is what makes this a field guide
    // rather than a website, and it is the only path somebody can act on where they stand.
    expect(ENTRY_PATHS[0]!.href).toBe('/scan');
  });

  it('names real routes and says what each one does', () => {
    for (const path of ENTRY_PATHS) {
      expect(path.href.startsWith('/'), path.href).toBe(true);
      expect(path.label.length, path.href).toBeGreaterThan(0);
      // A blurb that is really a second call to action helps nobody choose.
      expect(path.blurb.length, path.href).toBeGreaterThan(20);
    }
    expect(new Set(ENTRY_PATHS.map((p) => p.href)).size).toBe(ENTRY_PATHS.length);
  });

  it('does not send a first-time visitor at an account wall', () => {
    // Curiosity before authentication: an account earns its keep once there is progress
    // worth carrying between devices, not before a stranger has seen a single plant.
    for (const path of ENTRY_PATHS) {
      expect(path.href).not.toBe('/account');
    }
    expect(START_PAGE.includes('Sign in to')).toBe(false);
  });

  it('agrees with the path the route is actually served at', () => {
    // If these drift, printed artwork points somewhere that does not exist and cannot be
    // reprinted. Cheap to check, and impossible to notice by reading either file alone.
    expect(ENTRY_PATH).toBe('/start');
  });
});

describe('the entry page carries its safety weight', () => {
  it('uses the standard notice, not the brief one', () => {
    // It sends people to a camera and tells them to identify living plants, which is exactly
    // the risk `standard` exists for — CLAUDE.md is explicit that choosing `brief` on such a
    // page is a safety regression rather than a design tweak.
    expect(START_PAGE).toContain('variant="standard"');
    expect(START_PAGE).not.toContain('variant="brief"');
  });

  it('names its own risk rather than repeating the general disclaimer', () => {
    expect(START_PAGE).toContain('context=');
  });

  it('claims nothing about safety, edibility or medical use', () => {
    for (const claim of [/\bsafe to eat\b/i, /\bedible\b/i, /\btreats?\b/i, /\bcures?\b/i, /\bremedy\b/i]) {
      expect(claim.test(START_PAGE), `${claim} appears on /start`).toBe(false);
    }
  });
});
