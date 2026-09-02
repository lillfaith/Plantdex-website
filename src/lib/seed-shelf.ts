import { getHerb } from './deck';
import { matchScientificName, normalizeName } from './plant-match';
import { packetRecipe, parseRecipe, type PacketRecipe } from './seed-packet';
import type { HerbdexState } from './types';

/**
 * THE SEED SHELF — real plants a player has found that the deck does not cover yet.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * A SHELF ENTRY IS NOT A DISCOVERY, AND CANNOT BECOME ONE BY ACCIDENT.
 *
 *   Plantdex card   one of the 45 collectibles. Discovering one awards XP, fills the
 *                   collection, grows a plant in the Garden.
 *   Seed Shelf      a species an identifier named that has no card. A RECORD OF SOMETHING
 *                   SEEN: no XP, no collection progress, no mastery, no garden bed.
 *
 * That is why this is its own store with its own key and touches `HerbdexState` nowhere —
 * the separation `reveals.ts` documents, for the same reason. XP is derived by summing over
 * the collection records (`progression.ts`), so a store the reducer cannot see is a store
 * that structurally cannot pay.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * IDENTITY IS TAXONOMIC, NEVER A COMMON NAME. Finds are keyed by the same normalised
 * binomial the deck matcher uses, so "Bellis perennis L." and "Bellis perennis" are one
 * species and "daisy" — which names dozens of unrelated plants — is never a key at all. Two
 * scientific names count as one plant only where `plant-match.ts` already holds a checked
 * synonym; nothing here invents one.
 *
 * IT SAYS NOTHING ABOUT SAFETY. A shelf entry means "an identifier thought this photograph
 * was this species", exactly as uncertain as the scan that produced it. It is not an
 * identification anybody confirmed, and never a claim that a plant is edible or medicinal.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WRITE-ONCE ROWS, DERIVED SHELF. A find is a row that is inserted and never edited; the
 * shelf is those rows grouped by species. So there is no `encounters` counter to replay, no
 * `first_found_at` that a later write could move, and — the part that matters most — NO
 * `promoted` FLAG. An entry has "grown into a card" when the deck has a card for its species
 * and that card is in the player's collection, which is two facts that already exist. That
 * is the same rule the whole app follows for XP, applied here so the Seed Shelf needs no
 * update policy on its table (CLAUDE.md: only `profiles` may grant one).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Exported so "Download my data" and account deletion read the same key this store writes. */
export const SEED_SHELF_STORAGE_KEY = 'plantdex.seed-shelf.v1';

/** One saved encounter. Written once, never edited. */
export interface SeedShelfFind {
  /** Client-generated, same shape as a scan or sighting id. */
  id: string;
  /** `normalizeName(scientificName)` — "genus species", lowercased. The identity. */
  speciesKey: string;
  /** As the provider spelt it, for display. Never used for matching. */
  scientificName: string;
  commonName?: string;
  /** Provider taxonomy ids, when the identification carried them. */
  gbifId?: string;
  powoId?: string;
  foundAt: string;
  /** The provider's score for this identification, 0–1. */
  confidence?: number;
  /** The scan this came from, so an entry links back to its own history row. */
  scanId?: string;
  /** Storage path of the scan photograph, when one was kept. */
  photoPath?: string;
  /**
   * The packet artwork, pinned at the moment of saving.
   *
   * Derivable from `speciesKey` alone — that is what makes two players' shelves agree — but
   * stored anyway, so a future change to the generator cannot redraw a packet somebody has
   * been looking at for a year. The stored recipe wins; the derivation is the fallback.
   */
  packet: PacketRecipe;
}

/** What a save needs. Everything else is derived or defaulted. */
export interface NewSeedShelfFind {
  scientificName: string;
  commonName?: string;
  gbifId?: string;
  powoId?: string;
  confidence?: number;
  scanId?: string;
  photoPath?: string;
}

/** One species on the shelf: every find of it, folded together. Derived, never stored. */
export interface SeedShelfEntry {
  speciesKey: string;
  scientificName: string;
  commonName?: string;
  gbifId?: string;
  powoId?: string;
  firstFoundAt: string;
  lastFoundAt: string;
  encounters: number;
  bestConfidence?: number;
  scanId?: string;
  photoPath?: string;
  packet: PacketRecipe;
}

/**
 * Whether a species belongs on the shelf at all.
 *
 * A name the deck already covers is a CARD, and offering to shelve it would invite somebody
 * to file a discovery in the wrong place. `confirmable` is the same test the scan screen
 * uses to decide what may be logged: `exact` and `genusCard` are the deck's plant;
 * `sameGenus` is a different species and so is genuinely shelf material.
 */
export function isShelfEligible(scientificName: string): boolean {
  const key = normalizeName(scientificName);
  // A bare genus does not identify a species, and a shelf of genera would collide with
  // future cards in ways nothing could resolve.
  if (!key || !key.includes(' ')) return false;
  return !matchScientificName(scientificName).confirmable;
}

function newFindId(): string {
  return `seed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Build the row for a save. Returns null when the species is not shelf material, so the one
 * eligibility rule is enforced at the only place a find is ever created.
 */
export function newFind(
  input: NewSeedShelfFind,
  at: string = new Date().toISOString(),
): SeedShelfFind | null {
  if (!isShelfEligible(input.scientificName)) return null;
  const speciesKey = normalizeName(input.scientificName);
  return {
    id: newFindId(),
    speciesKey,
    scientificName: input.scientificName.trim(),
    commonName: input.commonName,
    gbifId: input.gbifId,
    powoId: input.powoId,
    foundAt: at,
    confidence: input.confidence,
    scanId: input.scanId,
    photoPath: input.photoPath,
    packet: packetRecipe({
      speciesKey,
      scientificName: input.scientificName,
      commonName: input.commonName,
    }),
  };
}

export function parseFind(value: unknown): SeedShelfFind | null {
  if (typeof value !== 'object' || value === null) return null;
  const row = value as Record<string, unknown>;
  const text = (key: string): string | undefined =>
    typeof row[key] === 'string' && row[key] ? (row[key] as string) : undefined;

  const scientificName = text('scientificName');
  const foundAt = text('foundAt');
  if (!scientificName || !foundAt) return null;
  const speciesKey = text('speciesKey') ?? normalizeName(scientificName);
  if (!speciesKey) return null;

  const confidence = row.confidence;
  return {
    id: text('id') ?? newFindId(),
    speciesKey,
    scientificName,
    commonName: text('commonName'),
    gbifId: text('gbifId'),
    powoId: text('powoId'),
    foundAt,
    confidence:
      typeof confidence === 'number' && confidence >= 0 && confidence <= 1 ? confidence : undefined,
    scanId: text('scanId'),
    photoPath: text('photoPath'),
    // A stored recipe that no longer parses is not a broken entry — the name still generates
    // the same packet it always did.
    packet:
      parseRecipe(row.packet) ??
      packetRecipe({ speciesKey, scientificName, commonName: text('commonName') }),
  };
}

/**
 * Fold finds into one entry per species.
 *
 * THE EARLIEST FIND OWNS THE ENTRY: its date is the first-found date, and its packet is the
 * packet. Later finds only ever add — an encounter, a better score, a name or an identifier
 * the first scan happened not to carry. Nothing a later scan says can rewrite what the first
 * one recorded, which is what makes "found on this date" a fact rather than a field.
 */
export function mergeFinds(finds: readonly SeedShelfFind[]): SeedShelfEntry[] {
  const bySpecies = new Map<string, SeedShelfFind[]>();
  for (const find of finds) {
    bySpecies.set(find.speciesKey, [...(bySpecies.get(find.speciesKey) ?? []), find]);
  }

  const entries: SeedShelfEntry[] = [];
  for (const [speciesKey, group] of bySpecies) {
    // Oldest first, with the id as a fixed tie-break: two finds can share a timestamp, and
    // "whichever the map happened to hold first" would differ between a device and a reload.
    const ordered = [...group].sort(
      (a, b) => a.foundAt.localeCompare(b.foundAt) || a.id.localeCompare(b.id),
    );
    const first = ordered[0]!;
    const last = ordered[ordered.length - 1]!;
    const firstWith = <K extends keyof SeedShelfFind>(key: K): SeedShelfFind[K] | undefined =>
      ordered.find((find) => find[key])?.[key];

    entries.push({
      speciesKey,
      scientificName: first.scientificName,
      commonName: firstWith('commonName'),
      gbifId: firstWith('gbifId'),
      powoId: firstWith('powoId'),
      firstFoundAt: first.foundAt,
      lastFoundAt: last.foundAt,
      encounters: ordered.length,
      bestConfidence: ordered.reduce<number | undefined>(
        (best, find) =>
          typeof find.confidence === 'number' ? Math.max(best ?? 0, find.confidence) : best,
        undefined,
      ),
      scanId: firstWith('scanId'),
      photoPath: firstWith('photoPath'),
      packet: first.packet,
    });
  }
  return entries;
}

/**
 * The card a shelf entry is now eligible for, or null.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS IS THE WHOLE FUTURE-COLLECTION MECHANISM, and it is deliberately four lines.
 *
 * The shelf stores a scientific name; the deck matcher maps scientific names onto cards. So
 * when a future collection adds a species somebody already shelved, that entry starts
 * matching on its own — no migration, no backfill, no list of "species we might add later".
 * A card printed tomorrow makes every shelf holding it sprout the next time it is read.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `confirmable` only, exactly as the scan screen requires: `exact` and `genusCard` are this
 * plant; `sameGenus` is a relative. A shelf entry must never sprout into a card for a
 * different species — that would write something untrue into a collection, which is what the
 * matcher's four outcomes exist to prevent.
 */
export function cardFor(entry: Pick<SeedShelfEntry, 'scientificName'>): string | null {
  const match = matchScientificName(entry.scientificName);
  if (!match.confirmable || !match.herbId) return null;
  return getHerb(match.herbId) ? match.herbId : null;
}

/**
 * Where an entry stands.
 *
 *   waiting   the deck has no card for it. The ordinary state, and not a lesser one.
 *   sprouted  a card exists and has not been claimed. The moment the shelf is for.
 *   grown     the card exists and is in the collection. The packet stays, as history.
 *
 * Derived from the collection rather than stored, which is why claiming needs no write to
 * the shelf at all: `discover()` records the card, and this reads it back.
 */
export type ShelfStatus = 'waiting' | 'sprouted' | 'grown';

export function shelfStatus(entry: SeedShelfEntry, state: HerbdexState): ShelfStatus {
  const herbId = cardFor(entry);
  if (!herbId) return 'waiting';
  return state.discoveries[herbId] ? 'grown' : 'sprouted';
}

/**
 * Shelf order: what needs attention, then what is waiting, then what has grown.
 *
 * A sprouted packet is the one thing on this page somebody has to act on, so it comes first
 * however old it is. Everything else is newest first, with the species key as a fixed
 * tie-break for the same reason `mergeFinds` sorts by id.
 */
export function shelfOrder(entries: readonly SeedShelfEntry[], state: HerbdexState): SeedShelfEntry[] {
  const rank: Record<ShelfStatus, number> = { sprouted: 0, waiting: 1, grown: 2 };
  return [...entries].sort((a, b) => {
    const byStatus = rank[shelfStatus(a, state)] - rank[shelfStatus(b, state)];
    if (byStatus !== 0) return byStatus;
    return b.lastFoundAt.localeCompare(a.lastFoundAt) || a.speciesKey.localeCompare(b.speciesKey);
  });
}

export interface ShelfCounts {
  /** Distinct species on the shelf, grown ones included. */
  species: number;
  waiting: number;
  sprouted: number;
  grown: number;
  /** Every save, across every species. */
  encounters: number;
}

export function shelfCounts(entries: readonly SeedShelfEntry[], state: HerbdexState): ShelfCounts {
  const counts: ShelfCounts = {
    species: entries.length,
    waiting: 0,
    sprouted: 0,
    grown: 0,
    encounters: 0,
  };
  for (const entry of entries) {
    counts[shelfStatus(entry, state)] += 1;
    counts.encounters += entry.encounters;
  }
  return counts;
}
