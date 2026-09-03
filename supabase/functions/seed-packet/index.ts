import { createClient } from 'npm:@supabase/supabase-js@2';
import { isShelfEligible } from '../_shared/herbdex/seed-shelf.ts';
import { packetRecipe, PACKET_VERSION } from '../_shared/herbdex/seed-packet.ts';
import { mintablePacketInput, type CanonicalIdentity } from '../_shared/herbdex/species-identity.ts';
import {
  ATTESTATION_SECRET_ENV,
  mintDecision,
  type CandidateRequest,
} from '../_shared/herbdex/species-attestation.ts';

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
 * THE PACKET IS GENERATED HERE, NEVER ACCEPTED FROM THE CLIENT — AND NEVER FROM WORDS THE
 * CLIENT CHOSE. A caller-supplied recipe would obviously let one player pick the artwork
 * everybody else sees, but so would a caller-supplied COMMON NAME, because `packetRecipe`
 * reads descriptive words out of the names it is handed. The mint is therefore seeded by the
 * species key and the rebuilt binomial only (`mintablePacketInput`), both of which are
 * derived here from validated Latin. Anybody can recompute a canonical packet from its
 * species key and check it.
 *
 * THE IDENTITY IS REBUILT, NOT SANITISED. `canonicalIdentity` discards whatever it was sent
 * and reconstructs `Genus epithet` from parts it has validated, derives the species key from
 * that (so a forged key has nothing to disagree with), and drops any common name or taxonomy
 * id that is not shaped like the real thing.
 *
 * AND THE IDENTITY MUST BE ATTESTED BEFORE IT CAN CREATE CANON. Shape alone could never
 * establish correspondence: a well-formed fictional species, or a real species wearing
 * another species' GBIF id, passes every check a validator can make. So a NEW row requires a
 * signature from `identify-plant`, which is the one place that has seen PlantNet's answer.
 * The client relays the token and cannot edit what it says — altering the name or either
 * identifier invalidates it (`species-attestation.ts`).
 *
 * READING AND REUSING CANON NEEDS NO ATTESTATION. The signature authorises CREATION only, so
 * a species somebody else has already found is available to every shelf, including one whose
 * own token has long since expired. That is also what makes replay a no-op: presenting a
 * valid token twice mints nothing the second time.
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

/**
 * The attestation signing secret — the SAME dedicated secret `identify-plant` signs with, and
 * deliberately not the service-role key above.
 *
 * Unset, `mintDecision` refuses every new species with `unconfigured` and nothing is minted.
 * That is the intended failure: a missing secret must never silently return the registry to
 * accepting whatever an authenticated client asserts. Reuse of species already in the canon
 * keeps working, so an unconfigured deployment degrades to "no new species" rather than to
 * "no Seed Shelf".
 */
const ATTESTATION_SECRET = Deno.env.get(ATTESTATION_SECRET_ENV) ?? '';

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

  let body: { species?: CandidateRequest[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Expected a JSON body.' }, 400);
  }

  const requested = Array.isArray(body.species) ? body.species.slice(0, MAX_SPECIES) : [];
  if (requested.length === 0) return json({ packets: [], refused: [] });

  /*
   * Normalise, filter and de-duplicate before touching the database.
   *
   * `isShelfEligible` refuses a bare genus and any species the deck has a confirmable card
   * for, exactly as the client does — the server re-checking is what makes it a rule rather
   * than a UI convention.
   */
  /*
   * Canonicalise and de-duplicate before touching the database, so one round trip answers for
   * the whole request. The decision itself comes later, once we know what already exists —
   * because an existing species needs no attestation at all.
   */
  const wanted = new Map<string, CandidateRequest>();
  for (const entry of requested) {
    const identity = canonicalIdentity(entry);
    if (!identity || wanted.has(identity.speciesKey)) continue;
    wanted.set(identity.speciesKey, entry);
  }
  if (wanted.size === 0) return json({ packets: [], refused: [] });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const keys = [...wanted.keys()];

  // What already exists is left completely alone — this is the rule that makes a generator
  // change unable to redraw a packet anybody has seen, and the reason reuse asks for nothing.
  const { data: existing, error: readError } = await admin
    .from('species_packets')
    .select('species_key')
    .in('species_key', keys);
  if (readError) {
    return json({ error: `Could not read the packet registry: ${readError.message}` }, 500);
  }
  const known = new Set((existing ?? []).map((row: { species_key: string }) => row.species_key));

  /*
   * The whole rule lives in `mintDecision` — validate, then eligibility, then reuse if the
   * species is already canon, and only then require an attestation. Calling it here rather
   * than restating the order means the unit tests exercise this exact decision.
   */
  const toMint: CanonicalIdentity[] = [];
  const refused: { speciesKey: string | null; reason: string }[] = [];
  for (const key of keys) {
    const decision = await mintDecision({
      candidate: wanted.get(key)!,
      exists: known.has(key),
      eligible: isShelfEligible,
      secret: ATTESTATION_SECRET,
    });
    if (decision.action === 'mint') toMint.push(decision.identity);
    else if (decision.action === 'refuse') {
      refused.push({ speciesKey: decision.speciesKey, reason: decision.reason });
    }
  }

  const rows = toMint
    .map((entry) => {
      return {
        species_key: entry.speciesKey,
        scientific_name: entry.scientificName,
        common_name: entry.commonName,
        gbif_id: entry.gbifId,
        powo_id: entry.powoId,
        /*
         * Seeded by the species key and the rebuilt binomial, and by NOTHING the caller
         * phrased. The common name above is stored for display and deliberately does not
         * reach this call — see `mintablePacketInput`.
         */
        packet: packetRecipe(mintablePacketInput(entry)),
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

  /*
   * Every requested species that DOES have a row comes back, attested or not — reuse is not
   * gated. `refused` names what did not make it and why, so a client can tell "nobody has
   * found this yet and your scan token has expired" from "that plant has a card".
   */
  return json({ packets: packets ?? [], refused });
});
