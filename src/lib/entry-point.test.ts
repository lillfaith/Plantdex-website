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

/**
 * The page with its comments removed.
 *
 * The call-site guard below asks "does this file CALL something that writes", and the answer
 * has to come from code rather than from prose. Explaining in a comment why `discover()` runs
 * on the player's tap and nowhere else tripped the guard on the word `discover(` — a guard its
 * own explanation can fail is a guard somebody deletes, which this repo has already learnt
 * once about the analytics schema. Block and line comments both go; JSX comments are block
 * comments inside braces, so the same strip catches them.
 */
const START_CODE = START_PAGE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

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
        START_CODE.includes(`from '@/lib/${forbidden}`) ||
          START_CODE.includes(`from '@/state/${forbidden}`),
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
      expect(START_CODE.includes(call), `/start calls ${call}`).toBe(false);
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

  it('names real routes, once each, with a label short enough to be a control', () => {
    for (const path of ENTRY_PATHS) {
      expect(path.href.startsWith('/'), path.href).toBe(true);
      expect(path.label.length, path.href).toBeGreaterThan(0);
      // A label long enough to be a sentence is a label that wraps inside a button.
      expect(path.label.length, path.href).toBeLessThanOrEqual(24);
    }
    expect(new Set(ENTRY_PATHS.map((p) => p.href)).size).toBe(ENTRY_PATHS.length);
  });

  it('gives the primary path one dominant control and the rest plain links', () => {
    /*
     * The hierarchy is the point of this page: a QR arrival has exactly one sensible next
     * step. Three equal blocks asked a stranger to choose instead of telling them what to do.
     * Bordered secondaries would put them back in competition, so the guard is that the
     * secondary branch draws no box.
     */
    const paths = readFileSync('src/components/start/EntryPaths.tsx', 'utf8');
    expect(paths).toContain('bg-gradient-to-r');
    const secondary = paths.slice(paths.indexOf('rest.map'));
    expect(secondary).not.toMatch(/\bborder\b/);
    expect(secondary).not.toMatch(/\brounded-2xl\b/);
    // Still real destinations, so still a real hit area.
    expect(secondary).toContain('min-h-11');
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

describe('the entry page does not overstate what a scan does', () => {
  it('says CONFIRM, not scan, as the thing that unlocks an entry', () => {
    /*
     * The identifier proposes; the player taps to confirm; `discover()` runs on that tap and
     * nowhere else. The whole scan screen is built on that separation — it is what keeps the
     * collection meaning "plants I actually identified" rather than "things a model guessed
     * at" — so the page that sends people to the scanner must not describe scanning itself as
     * the thing that unlocks a card.
     */
    expect(START_CODE).toContain('Confirm a match and its Plantdex entry');
    expect(/scan (?:one|it) and its Plantdex entry/i.test(START_CODE)).toBe(false);
  });

  it('promises the shelf only what `isShelfEligible` will actually accept', () => {
    /*
     * It said "anything you find outside these 45 is kept on your Seed Shelf". A photograph
     * that resolves to nothing, to a bare genus, or to something above species rank is not
     * shelved and cannot be: eligibility requires a valid species-level name with no
     * confirmable card. "Recognised species" is the honest subset.
     */
    expect(START_CODE).toContain('recognised species outside');
    for (const overclaim of [/anything you find outside/i, /everything you (?:find|scan)/i]) {
      expect(overclaim.test(START_CODE), `${overclaim} overstates what is stored`).toBe(false);
    }
  });

  it('keeps the same distinction in the outcomes captions', () => {
    // The lead sentence and the picture beneath it must not disagree about what unlocks a
    // card — two places saying different things is how one of them becomes the stale one.
    expect(START_CODE).toContain('Confirm the match and its Plantdex entry unlocks.');
    expect(START_CODE).toContain('If we recognise it');
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
      expect(claim.test(START_CODE), `${claim} appears on /start`).toBe(false);
    }
  });
});
