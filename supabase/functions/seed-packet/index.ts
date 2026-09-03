import { createClient } from 'npm:@supabase/supabase-js@2';
import { normalizeName } from '../_shared/herbdex/plant-match.ts';
import { isShelfEligible } from '../_shared/herbdex/seed-shelf.ts';
import { packetRecipe, PACKET_VERSION } from '../_shared/herbdex/seed-packet.ts';

/**
 * seed-packet — mints a species' CANONICAL Seed Shelf packet, once, for everybody.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY A FUNCTION AND NOT A CLIENT INSERT.
 *
 * `public.species_packets` is global: one row per species, read by every shelf. A client
 * insert policy on a global table is a cross-user write surface — one player could mint a
 * packet for a species nobody has found, or race to define the artwork everybody else then
 * sees. So that table has NO insert, update or delete policy for any role (migration 0005),
 * and this function is the only writer, under the service role.
 *
 * It is the same shape `delete-account` uses: the caller's identity comes from their own
 * token, the privileged client that follows is used for exactly one narrow operation, and
 * nothing from the request body can widen it.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT WILL NOT WRITE. The row it creates holds a species and its artwork. There is no
 * user id, no scan, no photograph, no location, no confidence and no discovery date in the
 * table at all, so no amount of extra JSON in the request can put one there — the insert
 * below names its columns.
 *
 * THE PACKET IS GENERATED HERE, NEVER ACCEPTED FROM THE CLIENT. A caller-supplied recipe
 * would let one player choose the artwork every other player sees. The generator is the
 * shared, deterministic one (`_shared/herbdex/seed-packet.ts`, synced verbatim from
 * `src/lib`), so what the client previewed and what this mints are the same bag.
 *
 * ELIGIBILITY IS RE-CHECKED HERE. `isShelfEligible` is the same function the UI uses, so a
 * species the deck already has a confirmable card for cannot be minted into the registry by
 * a hand-made request — that plant is a discovery, not a packet.
 *
 * SIMULTANEOUS FIRST SIGHTINGS ARE SAFE. `species_key` is the primary key and the insert is
 * `on conflict do nothing`, so two players saving the same new species at the same instant
 * both end up reading the one row that won. There is no path that creates two packets for
 * one species, and no path that overwrites an existing one — this function issues no update.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** One request may introduce this many species. A shelf import is the big case. */
const MAX_SPECIES = 100;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

interface SpeciesRequest {
  scientificName?: unknown;
  commonName?: unknown;
  gbifId?: unknown;
  powoId?: unknown;
}

/** Trimmed, length-capped text, or null. Keeps a hostile body from writing an essay. */
function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  /*
   * A SIGNED-IN CALLER IS REQUIRED, and the identity is only used as a gate.
   *
   * Nothing about who they are reaches the table — there is no column for it. Requiring a
   * session keeps an anonymous, unauthenticated write path out of a global table, and gives
   * the registry the same footing as every other server-side write in this app. A signed-out
   * player loses nothing: their device draws the same packet from the same name, and the
   * canonical row is created when they sign in and import, or by the next player to find it.
   */
  const authHeader = req.headers.get('Authorization') ?? '';
  const asCaller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await asCaller.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: 'You must be signed in to add a species to the Seed Shelf.' }, 401);
  }

  let body: { species?: SpeciesRequest[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Expected a JSON body.' }, 400);
  }

  const requested = Array.isArray(body.species) ? body.species.slice(0, MAX_SPECIES) : [];
  if (requested.length === 0) return json({ packets: [] });

  /*
   * Normalise, filter and de-duplicate before touching the database.
   *
   * `isShelfEligible` refuses a bare genus and any species the deck has a confirmable card
   * for, exactly as the client does — the server re-checking is what makes it a rule rather
   * than a UI convention.
   */
  const wanted = new Map<string, { key: string; scientificName: string; commonName: string | null; gbifId: string | null; powoId: string | null }>();
  for (const entry of requested) {
    const scientificName = text(entry.scientificName, 200);
    if (!scientificName || !isShelfEligible(scientificName)) continue;
    const key = normalizeName(scientificName);
    if (!key || wanted.has(key)) continue;
    wanted.set(key, {
      key,
      scientificName,
      commonName: text(entry.commonName, 200),
      gbifId: text(entry.gbifId, 64),
      powoId: text(entry.powoId, 64),
    });
  }
  if (wanted.size === 0) return json({ packets: [] });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const keys = [...wanted.keys()];

  // What already exists is left completely alone — this is the rule that makes a generator
  // change unable to redraw a packet anybody has seen.
  const { data: existing, error: readError } = await admin
    .from('species_packets')
    .select('species_key')
    .in('species_key', keys);
  if (readError) {
    return json({ error: `Could not read the packet registry: ${readError.message}` }, 500);
  }
  const known = new Set((existing ?? []).map((row: { species_key: string }) => row.species_key));

  const rows = keys
    .filter((key) => !known.has(key))
    .map((key) => {
      const entry = wanted.get(key)!;
      return {
        species_key: key,
        scientific_name: entry.scientificName,
        common_name: entry.commonName,
        gbif_id: entry.gbifId,
        powo_id: entry.powoId,
        // Generated here, from the species key alone. Never read from the request.
        packet: packetRecipe({
          speciesKey: key,
          scientificName: entry.scientificName,
          commonName: entry.commonName ?? undefined,
        }),
        packet_version: PACKET_VERSION,
      };
    });

  if (rows.length > 0) {
    // `ignoreDuplicates` is `on conflict do nothing`: the loser of a race writes nothing and
    // reads the winner below. Never an upsert that overwrites — a canonical packet is
    // written once and is not ours to change afterwards.
    const { error: insertError } = await admin
      .from('species_packets')
      .upsert(rows, { onConflict: 'species_key', ignoreDuplicates: true });
    if (insertError) {
      return json({ error: `Could not register the species: ${insertError.message}` }, 500);
    }
  }

  const { data: packets, error: finalError } = await admin
    .from('species_packets')
    .select('*')
    .in('species_key', keys);
  if (finalError) {
    return json({ error: `Could not read the packet registry: ${finalError.message}` }, 500);
  }

  return json({ packets: packets ?? [] });
});
