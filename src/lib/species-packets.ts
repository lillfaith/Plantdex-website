'use client';

import { useSyncExternalStore } from 'react';
import { supabase } from './supabase-client';
import { normalizeName } from './plant-match';
import { packetRecipe, parseRecipe, type PacketRecipe } from './seed-packet';
import { mintablePacketInput } from './species-identity';

/**
 * THE CANONICAL SEED PACKET REGISTRY, client side.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE PACKET PER SPECIES, FOR EVERYBODY, FOREVER.
 *
 * The generator is deterministic, so for a while regenerating looked like enough: two
 * strangers computing the same recipe from the same name get the same bag. It stops being
 * enough the moment the generator changes. Whoever saved a species under version 1 keeps
 * that artwork; the next player to save the SAME species is handed a version 2 — and the
 * shelves quietly disagree about what a Bellis perennis packet looks like.
 *
 * So the packet is written down once, the first time Plantdex sees the species, into
 * `public.species_packets` (migration 0005). This module reads that table — which is public,
 * because the row holds nothing about anybody — and asks the `seed-packet` edge function to
 * create the row when a species is new.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * NO CLIENT CAN WRITE IT. There is no insert, update or delete policy on that table for any
 * role, so the only writer is the function, under the service role. A player therefore
 * cannot create a packet for a species they have not found, redraw one somebody else is
 * looking at, or delete one — and nobody gains a cross-user write surface in the process.
 *
 * WHAT IS NOT IN IT. No user id, no scan, no photograph, no location, no confidence, no
 * discovery date. `first_seen_at` records that PLANTDEX met the species on a date; it names
 * nobody, and each player's own first-found date stays in their private shelf row.
 */

export interface CanonicalPacket {
  speciesKey: string;
  scientificName: string;
  commonName?: string;
  gbifId?: string;
  powoId?: string;
  packet: PacketRecipe;
  packetVersion: number;
  /** When Plantdex first met this species. Not who found it. */
  firstSeenAt: string;
}

/** What the registry needs to mint a species. Deliberately nothing personal. */
export interface SpeciesRequest {
  scientificName: string;
  commonName?: string;
  gbifId?: string;
  powoId?: string;
  /**
   * The signed candidate from the scan that produced this identity. Required to CREATE a
   * canonical row and irrelevant to reusing one, so a shelf full of species other people have
   * already found works without a single token.
   */
  attestation?: string;
}

const cache = new Map<string, CanonicalPacket>();
/** Species keys already asked about, so a miss is not re-fetched on every render. */
const asked = new Set<string>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function rowToCanonical(row: Record<string, unknown>): CanonicalPacket | null {
  const speciesKey = typeof row.species_key === 'string' ? row.species_key : '';
  const scientificName = typeof row.scientific_name === 'string' ? row.scientific_name : '';
  const packet = parseRecipe(row.packet);
  if (!speciesKey || !scientificName || !packet) return null;
  const text = (value: unknown): string | undefined =>
    typeof value === 'string' && value ? value : undefined;
  return {
    speciesKey,
    scientificName,
    commonName: text(row.common_name),
    gbifId: text(row.gbif_id),
    powoId: text(row.powo_id),
    packet,
    packetVersion:
      typeof row.packet_version === 'number' ? row.packet_version : packet.version,
    firstSeenAt: typeof row.first_seen_at === 'string' ? row.first_seen_at : '',
  };
}

function remember(rows: CanonicalPacket[]): void {
  for (const row of rows) {
    cache.set(row.speciesKey, row);
    asked.add(row.speciesKey);
  }
  if (rows.length > 0) emit();
}

/**
 * Read the canonical packets for a set of species.
 *
 * One query for the whole shelf rather than one per packet, and only for keys not already
 * known. A failure is not an error state: the shelf falls back to the preview it can derive
 * from the name, which is the same artwork unless the generator has moved on.
 */
export async function loadCanonicalPackets(speciesKeys: readonly string[]): Promise<void> {
  if (!supabase) return;
  const wanted = [...new Set(speciesKeys)].filter((key) => key && !asked.has(key));
  if (wanted.length === 0) return;
  // Marked asked BEFORE the round trip, so a shelf rendering twice does not fetch twice.
  for (const key of wanted) asked.add(key);

  const { data, error } = await supabase
    .from('species_packets')
    .select('*')
    .in('species_key', wanted);
  if (error || !data) {
    // Allow a retry: an unknown species and a failed request are not the same thing, and
    // only one of them should be remembered as "asked".
    for (const key of wanted) asked.delete(key);
    console.warn('[plantdex] could not read the canonical packets', error);
    return;
  }
  remember(
    (data as Record<string, unknown>[])
      .map(rowToCanonical)
      .filter((row): row is CanonicalPacket => row !== null),
  );
}

/**
 * Ensure Plantdex has a canonical packet for each species, and return them.
 *
 * The function generates and inserts only what is missing, with `on conflict do nothing`, so
 * two players saving the same new species at the same moment cannot create competing
 * packets: one insert wins and both read the winner back.
 *
 * Requires a signed-in caller — the registry is global, and an unauthenticated write path
 * into a global table is exactly what this design is avoiding. A signed-out player keeps the
 * preview their own device derived; the canonical row is created when they sign in and their
 * shelf is imported, or by whoever saves that species next.
 */
export async function ensureCanonicalPackets(
  species: readonly SpeciesRequest[],
): Promise<CanonicalPacket[]> {
  if (!supabase || species.length === 0) return [];
  const { data, error } = await supabase.functions.invoke('seed-packet', {
    body: { species: species.map((entry) => ({ ...entry })) },
  });
  if (error) {
    console.warn('[plantdex] could not register a canonical packet', error);
    return [];
  }
  const rows = ((data as { packets?: Record<string, unknown>[] } | null)?.packets ?? [])
    .map(rowToCanonical)
    .filter((row): row is CanonicalPacket => row !== null);
  remember(rows);
  return rows;
}

/** The canonical packet for a species, if this tab has read it. */
export function canonicalPacketFor(speciesKey: string): PacketRecipe | undefined {
  return cache.get(speciesKey)?.packet;
}

export function canonicalRecordFor(speciesKey: string): CanonicalPacket | undefined {
  return cache.get(speciesKey);
}

/**
 * Subscribe to the registry so a shelf re-renders when canonical packets arrive.
 *
 * The snapshot is the cache's version counter rather than its contents: `useSyncExternalStore`
 * requires a stable value, and a Map is a new reference on every read.
 */
let version = 0;
listeners.add(() => {
  version += 1;
});

export function useCanonicalPackets(): number {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );
}

/**
 * The packet a species would get if it were minted right now.
 *
 * Used for the preview on the scan screen, before anything is saved. It is the same call the
 * SERVER makes when it mints one, so what somebody is shown before saving is what they get —
 * unless the species is already in the registry under an older generator, in which case the
 * canonical one is shown instead, which is the correct answer.
 */
export function previewPacket(input: SpeciesRequest): PacketRecipe {
  const speciesKey = normalizeName(input.scientificName);
  return (
    canonicalPacketFor(speciesKey) ??
    // `mintablePacketInput` and nothing else: the server refuses to let a common name reach
    // the generator, so a preview that fed it one would show a bag the registry never mints.
    packetRecipe(mintablePacketInput({ speciesKey, scientificName: input.scientificName }))
  );
}

/** Testing only: forget everything this tab has read. */
export function __resetCanonicalCache(): void {
  cache.clear();
  asked.clear();
}
