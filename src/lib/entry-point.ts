import { COLLECTION_01 } from './collection';

/**
 * THE PHYSICAL → DIGITAL ENTRY POINT.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `/start` is the address printed on a Collection 01 insert, sticker, receipt or vendor-table
 * QR. It is the first Plantdex surface a stranger meets, and its entire job is to explain the
 * premise and offer three ways in.
 *
 * WHAT IT IS NOT: proof of anything. A printed QR is a public string. It can be photographed
 * across a table, posted, or read off a picture of the box in a listing — so possessing it
 * establishes that somebody saw a code, and nothing else at all.
 *
 * THE FIVE TRUST LEVELS, WHICH MUST NEVER COLLAPSE INTO ONE ANOTHER:
 *
 *   1. VISITED A URL          anyone with a camera or a link. What `/start` establishes.
 *   2. OWNS A DECK            somebody paid for a physical object. Unproven today.
 *   3. FOUND A PLANT          somebody was outdoors in front of a living thing.
 *   4. VERIFIED A SIGHTING    a third party corroborated 3. Does not exist today.
 *   5. MASTERED A CARD        earned through the collection's own rules.
 *
 * Every one of those is strictly harder than the one above it, and a static QR sits at the
 * top. If arriving here granted level 2, then a photograph of a box would be a deck; if it
 * granted 3 or 5, the collection would stop meaning "plants I actually found", which is the
 * only thing it means. So a generic entry grants NOTHING — see `GENERIC_ENTRY`.
 *
 * HOW THIS STAYS TRUE RATHER THAN BEING PROMISED. `/start` is a static page of links. It
 * imports no store, no reducer and no progression module, so there is no code path from
 * opening it to writing a discovery, a sighting, mastery, research or XP — the same structural
 * argument that keeps the Seed Shelf unable to pay XP. `entry-point.test.ts` reads the route's
 * own source and fails if it ever gains one.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The route a printed code points at. Named once so print artwork and tests agree. */
export const ENTRY_PATH = '/start';

/** Which collection a printed entry is for. One deck exists, so one entry point does. */
export const ENTRY_COLLECTION_ID = COLLECTION_01.id;

/**
 * Everything an entry could ever confer, as a closed set.
 *
 * Enumerated rather than left implicit so that adding a capability is a deliberate edit to a
 * named list, reviewed against the trust levels above, rather than a quiet extra field on
 * whatever a future claim endpoint happens to return.
 */
export type EntryCapability =
  /** May read the collection, the guides and the scanner. True for everybody, code or not. */
  | 'browse'
  /** Plantdex accepts that this person holds a physical deck. Nothing issues this today. */
  | 'ownership'
  /** A sighting corroborated by something other than the player's own tap. */
  | 'verifiedSighting'
  /** Cards, XP, mastery or research written on arrival rather than earned. */
  | 'progression';

export interface EntryGrant {
  /**
   * `generic` — a code every deck in the print run shares. Unforgeable only in the sense that
   * there is nothing to forge; it says "a Collection 01 thing exists and you looked at it".
   *
   * `claimed` — a future per-deck or per-card token, redeemed once, server-side. Named here so
   * the shape exists before the system does; nothing constructs one.
   */
  kind: 'generic' | 'claimed';
  collectionId: string;
  capabilities: readonly EntryCapability[];
}

/**
 * What opening `/start` gets you: permission to look round, which you already had.
 *
 * `browse` is deliberately listed rather than the array left empty. An empty array reads as
 * "not filled in yet" and invites somebody to fill it in; a single honest entry says the set
 * was considered and this is its whole content.
 */
export const GENERIC_ENTRY: EntryGrant = {
  kind: 'generic',
  collectionId: ENTRY_COLLECTION_ID,
  capabilities: ['browse'],
};

/**
 * Capabilities no entry may confer without a redemption a server performed.
 *
 * The list is the argument: each of these is a claim about the physical world or about work
 * somebody did outdoors, and a string printed identically on every box is evidence of neither.
 */
export const REQUIRES_REDEMPTION: readonly EntryCapability[] = [
  'ownership',
  'verifiedSighting',
  'progression',
];

/** True when a grant stays inside what a public printed string can honestly support. */
export function isSafeGenericGrant(grant: EntryGrant): boolean {
  return (
    grant.kind === 'generic' &&
    !grant.capabilities.some((capability) => REQUIRES_REDEMPTION.includes(capability))
  );
}

/**
 * The three ways in, in the order a first-time visitor should meet them.
 *
 * Held here rather than inline in the page so the count and the destinations can be asserted:
 * "approximately three obvious paths" is a design decision that degrades the moment a fourth
 * is added casually, and a page of links is exactly where that happens.
 *
 * ORDER IS THE ARGUMENT, and `[0]` is the PRIMARY. Scanning is first because it is the only
 * one that requires being outdoors, and it is what makes this a field guide rather than a
 * website — somebody holding a phone at a vendor table can do it standing there. Browsing is
 * second, for the person who just opened the box. "How it works" is third because it is the
 * one a curious reader will scroll to anyway and nobody needs before the other two.
 *
 * `EntryPaths` renders `[0]` as a key and the rest as links: three equal buttons is a menu,
 * and a menu is what a stranger holding a deck bounces off.
 */
export interface EntryPath {
  href: string;
  label: string;
}

/*
 * NO BLURBS. Each path used to carry a sentence explaining its destination, which was the
 * right answer while all three were equal-weight blocks and somebody had to choose between
 * them. They are now one key and two links, so there is nothing to choose between and the
 * sentences were three lines of copy defending a decision the layout already makes.
 */
export const ENTRY_PATHS: readonly EntryPath[] = [
  { href: '/scan', label: 'Scan a plant' },
  { href: '/herbdex', label: 'Explore the Herbdex' },
  { href: '/learn', label: 'How Plantdex works' },
];
