import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { mergeFinds, newFind, type SeedShelfFind } from './seed-shelf';
import { packetRecipe, type PacketRecipe } from './seed-packet';

/**
 * THE CANONICAL PACKET REGISTRY.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BUG THIS REPLACES. The first version had no registry: every client regenerated the
 * packet from the species name, and cross-user agreement rested entirely on the generator
 * being deterministic. It is — until it changes. Then the player who saved a species under
 * version 1 keeps that artwork, stored with their find, while everybody who saves the SAME
 * species afterwards is handed a version 2. Two shelves, one plant, two different bags, and
 * nothing in the system able to notice.
 *
 * So a species' packet is written down once, globally, the first time Plantdex sees it. The
 * generator is now how a packet is CREATED, not what keeps the world consistent afterwards.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * These guards cover the two halves that can go wrong quietly: the resolution order in the
 * client, and what the global row is allowed to contain.
 */

const migrations = join(import.meta.dirname, '..', '..', 'supabase', 'migrations');
const registry = readFileSync(join(migrations, '0005_species_packets.sql'), 'utf8');
const shelf = readFileSync(join(migrations, '0004_seed_shelf.sql'), 'utf8');
const fn = readFileSync(
  join(import.meta.dirname, '..', '..', 'supabase', 'functions', 'seed-packet', 'index.ts'),
  'utf8',
);

/** Column names declared in a `create table` block. */
function declaredColumns(sql: string, table: string): string[] {
  const body = sql.split(new RegExp(`create table if not exists public\\.${table}\\s*\\(`, 'i'))[1] ?? '';
  const columns: string[] = [];
  for (const line of body.split('\n')) {
    if (/^\s*\)\s*;/.test(line)) break;
    const match = /^\s{2}([a-z_]+)\s+(uuid|text|timestamptz|integer|boolean|numeric|jsonb)/.exec(line);
    if (match) columns.push(match[1]!);
  }
  return columns;
}

describe('the canonical species record', () => {
  const columns = declaredColumns(registry, 'species_packets');

  it('parsed the migration — an empty column list would pass everything below', () => {
    expect(columns).toContain('species_key');
    expect(columns.length).toBeGreaterThanOrEqual(7);
  });

  it('is keyed by the species and nothing else', () => {
    // The primary key is what makes two simultaneous first sightings safe: one insert wins,
    // both callers read the winner, and no second packet for one species can exist.
    expect(registry).toMatch(/species_key text primary key/);
  });

  it('holds the artwork and the version that made it', () => {
    expect(columns).toContain('packet');
    expect(columns).toContain('packet_version');
    expect(columns).toContain('first_seen_at');
  });

  it('holds nothing about a person', () => {
    /*
     * THE WHOLE REASON THIS ROW CAN BE PUBLIC. It describes a species. Who found it, when
     * they found it, what they photographed and where all stay in `seed_shelf`, private
     * under RLS. A column here named for any of those would leak from a global table.
     */
    for (const forbidden of [
      'user_id',
      'user',
      'email',
      'scan_id',
      'photo_path',
      'photo',
      'confidence',
      'region',
      'location',
      'latitude',
      'longitude',
      'found_by',
      'discovered_by',
      'first_found_by',
    ]) {
      expect(columns, `species_packets holds ${forbidden}`).not.toContain(forbidden);
    }
    // And nothing that merely *contains* those words either — `first_seen_by_user` would
    // pass the exact-match list above.
    for (const column of columns) {
      for (const word of ['user', 'email', 'photo', 'scan', 'location', 'ip']) {
        expect(column.includes(word), `species_packets.${column} names ${word}`).toBe(false);
      }
    }
  });

  it('records that Plantdex met the species, not who met it', () => {
    // The concept is worth keeping — a species entered the world on a date — and it costs
    // nothing as long as it names nobody.
    expect(registry).toMatch(/first_seen_at timestamptz not null default now\(\)/);
  });
});

describe('who may write the registry', () => {
  it('lets anyone read it', () => {
    // A shelf has to draw packets for species other people introduced, and there is nothing
    // personal in the row to protect.
    expect(registry).toMatch(/for select using \(true\)/);
  });

  it('grants no client any write, of any kind', () => {
    /*
     * The security posture in one assertion. No insert, update or delete policy exists for
     * any role, so no player can mint a packet for a species they never found, redraw one
     * somebody else is looking at, or remove one — and nobody gains a cross-user write
     * surface. The only writer is the service-role function.
     */
    expect(registry, 'the registry grants an insert').not.toMatch(/create policy[\s\S]*?for insert/i);
    expect(registry, 'the registry grants an update').not.toMatch(/create policy[\s\S]*?for update/i);
    expect(registry, 'the registry grants a delete').not.toMatch(/create policy[\s\S]*?for delete/i);
    expect(registry, 'the registry uses for all').not.toMatch(/create policy[\s\S]*?for all/i);
    expect(registry).toMatch(/enable row level security/);
  });
});

describe('the minting function', () => {
  it('requires a signed-in caller', () => {
    // Not because the identity is stored — there is nowhere to store it — but because an
    // unauthenticated write path into a global table is the thing this design avoids.
    expect(fn).toContain('await asCaller.auth.getUser()');
    expect(fn).toMatch(/401/);
  });

  it('generates the packet itself and never accepts one', () => {
    /*
     * A client-supplied recipe would let one player choose the artwork every other player
     * sees for that species. The generator runs here, seeded by the species key.
     */
    expect(fn).toContain('packet: packetRecipe({');
    expect(fn, 'the function reads a packet from the request').not.toMatch(
      /packet:\s*(?:entry|body|request)\./,
    );
  });

  it('re-checks eligibility server-side', () => {
    // The same rule the UI applies, so a hand-made request cannot mint a species the deck
    // already has a confirmable card for.
    expect(fn).toContain('isShelfEligible(scientificName)');
  });

  it('never overwrites a packet that already exists', () => {
    /*
     * `ignoreDuplicates` is `on conflict do nothing`. With no update anywhere in the
     * function, a generator change cannot reach a species anybody has already saved — which
     * is the property the registry exists to provide.
     */
    expect(fn).toMatch(/ignoreDuplicates:\s*true/);
    expect(fn, 'the function issues an update against the registry').not.toMatch(
      /from\('species_packets'\)[\s\S]{0,80}\.update\(/,
    );
  });
});

describe('the private shelf row', () => {
  it('no longer carries a packet of its own', () => {
    // A per-user copy is exactly what allowed two users to disagree about one species.
    const columns = declaredColumns(shelf, 'seed_shelf');
    expect(columns, 'seed_shelf still stores a packet').not.toContain('packet');
  });

  it('still keeps everything that IS personal', () => {
    const columns = declaredColumns(shelf, 'seed_shelf');
    for (const column of ['user_id', 'species_key', 'found_at', 'confidence', 'scan_id', 'photo_path']) {
      expect(columns).toContain(column);
    }
  });
});

describe('which packet an entry draws', () => {
  const find = (name: string): SeedShelfFind => {
    const made = newFind({ scientificName: name });
    if (!made) throw new Error(`${name} was refused`);
    return made;
  };

  const canonical: PacketRecipe = {
    ...packetRecipe({ speciesKey: 'bellis perennis' }),
    // A packet minted by an older generator: deliberately different from what today's
    // generator would produce for the same species.
    version: 0,
    shape: 'notched',
    motif: 'cone',
    paper: 'gold-300',
  };

  it('prefers the canonical packet over anything derived locally', () => {
    const entry = mergeFinds([find('Bellis perennis')], () => canonical)[0]!;
    expect(entry.packet).toEqual(canonical);
    expect(entry.canonicalPacket).toBe(true);
  });

  it('says plainly when it is only a local preview', () => {
    const entry = mergeFinds([find('Bellis perennis')])[0]!;
    expect(entry.canonicalPacket).toBe(false);
    expect(entry.packet).toEqual(packetRecipe({ speciesKey: 'bellis perennis' }));
  });

  it('keeps an older canonical packet even when the generator has moved on', () => {
    /*
     * THE POINT OF THE WHOLE CHANGE, as a test: the canonical record was minted by a
     * generator that no longer exists, and it still wins. Two players — one who saved this
     * species last year and one saving it today — see the same bag.
     */
    const today = packetRecipe({ speciesKey: 'bellis perennis' });
    expect(canonical).not.toEqual(today);
    const entry = mergeFinds([find('Bellis perennis')], () => canonical)[0]!;
    expect(entry.packet.version).toBe(0);
    expect(entry.packet.shape).toBe('notched');
  });

  it('falls back to the name when a device has no preview and no registry', () => {
    // Corrupted local storage, or a row read before the registry answered. The name has
    // always been the seed, so there is always an answer.
    const stripped = { ...find('Bellis perennis'), packet: undefined };
    const entry = mergeFinds([stripped])[0]!;
    expect(entry.packet).toEqual(packetRecipe({ speciesKey: 'bellis perennis' }));
  });
});

describe('account deletion and the registry', () => {
  it('never deletes the canonical record with a user', () => {
    /*
     * A canonical packet is not the property of whoever saved the species first. Deleting it
     * with their account would take the artwork off every other shelf holding that plant.
     */
    const deleteFn = readFileSync(
      join(import.meta.dirname, '..', '..', 'supabase', 'functions', 'delete-account', 'index.ts'),
      'utf8',
    );
    const tables = /const USER_TABLES = \[([\s\S]*?)\] as const;/.exec(deleteFn)?.[1] ?? '';
    expect(tables, 'the delete function no longer declares USER_TABLES').toContain('seed_shelf');
    expect(tables, 'account deletion would erase the shared packet registry').not.toContain(
      'species_packets',
    );
  });

  it('deletes the private shelf rows', () => {
    const deleteFn = readFileSync(
      join(import.meta.dirname, '..', '..', 'supabase', 'functions', 'delete-account', 'index.ts'),
      'utf8',
    );
    expect(/const USER_TABLES = \[([\s\S]*?)\] as const;/.exec(deleteFn)?.[1]).toContain(
      "'seed_shelf'",
    );
  });
});
