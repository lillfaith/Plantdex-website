import { canonicalIdentity, type CanonicalIdentity } from './species-identity';

/**
 * SIGNED CANDIDATES — how Plantdex knows an identity came from PlantNet and not from a form.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE GAP THIS CLOSES. `species-identity.ts` made the canon's SHAPE unforgeable: a name is
 * rebuilt from validated Latin, the species key is derived rather than accepted, and a
 * malformed identifier is dropped. What shape could never establish is CORRESPONDENCE — a
 * signed-in player could still mint a perfectly well-formed species that does not exist
 * (`Bellis fictus`), or pair a real species with another species' correctly-shaped GBIF id,
 * and the permanent public row would carry it forever.
 *
 * So the identity is now signed where Plantdex actually receives it. `identify-plant` holds
 * the provider key, calls PlantNet, and is the one place in the system that has seen the
 * provider's own answer. It canonicalises each candidate and issues an ATTESTATION over that
 * canonical identity. The browser relays the token; `seed-packet` verifies it before creating
 * a row. Changing any signed field invalidates the signature, so the client can carry the
 * attestation and cannot edit what it says.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IS SIGNED, AND WHAT IS NOT.
 *
 *   Signed      the canonical scientific name, the GBIF id and the POWO id — exactly the
 *               three fields that assert what this organism IS.
 *   Not signed  the common name (display only, and deliberately barred from the packet
 *               generator), the score, the photograph, the scan id, and anything about the
 *               person. Nothing here identifies a user, and nothing here is stored: the
 *               attestation is verified and discarded, and `species_packets` gains no column.
 *
 * The species key is not signed either — it is DERIVED on both sides from the name, so a
 * forged key has nothing to disagree with. Signing it would only create a second thing that
 * could contradict the first.
 *
 * REPLAY IS NOT A THREAT HERE, and that is why there is no nonce, no used-token table, and
 * no new persistence of any kind. An attestation authorises exactly one outcome: "this
 * species may enter the canon". Presenting it twice mints nothing the second time, because
 * the insert is `on conflict do nothing` and the row is already there. A stolen attestation
 * lets somebody create the row for a real species PlantNet really returned — which is the
 * thing it is for.
 *
 * WHICH IS WHY THE TTL IS LONG, AND WHY IT ONLY BINDS CREATION. See `ATTESTATION_TTL_MS`.
 */

/**
 * The signing secret's environment variable. A DEDICATED secret, deliberately not the
 * service-role key: that key can read and write every table in the project, and a signing
 * secret is handled differently — it is used on every scan, it is compared against
 * attacker-supplied input, and it should be rotatable without touching database access.
 */
export const ATTESTATION_SECRET_ENV = 'SPECIES_ATTESTATION_SECRET';

/**
 * NINETY DAYS, and the reasoning matters more than the number.
 *
 * The obvious short TTL breaks a first-class flow. A signed-out player scans a plant, shelves
 * it on their device, and may sign in days or weeks later; the import is what mints the
 * species. A fifteen-minute token would make that scan permanently unmintable, and the
 * player would never know why their packet stayed a local preview.
 *
 * A long window costs almost nothing because replay is not a threat (see the header): the
 * only thing an old token can do is create a row for a species PlantNet really named. What
 * expiry actually buys is a bound on how long tokens signed by a leaked or rotated secret
 * stay useful — a rotation concern, not an authorisation one — so ninety days is generous to
 * the player and still finite.
 *
 * AND EXPIRY ONLY BINDS CREATION. Reusing a canonical row needs no attestation at all, valid
 * or otherwise, so a species somebody else has already found is always available to a shelf
 * whose own token went stale. The worst an expired token can do is leave one species
 * unminted until the next person finds it.
 */
export const ATTESTATION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/** Version prefix, so a future format change is a rejection rather than a misparse. */
const VERSION = 'v1';

/** What the signature covers. Short keys because this rides in every scan response. */
interface AttestationPayload {
  /** Canonical scientific name, as `canonicalBinomial` rebuilt it. */
  n: string;
  /** GBIF id, or null. Signed so it cannot be swapped for another species'. */
  g: string | null;
  /** POWO id, or null. Same. */
  p: string | null;
  /** Issued at, epoch milliseconds. */
  iat: number;
}

export type AttestationFailure =
  | 'missing'
  | 'unconfigured'
  | 'malformed'
  | 'badSignature'
  | 'expired'
  | 'mismatch';

export type AttestationResult = { ok: true } | { ok: false; reason: AttestationFailure };

const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
    // Allocated explicitly rather than via `Uint8Array.from`, whose inferred buffer type is
    // `ArrayBufferLike` and so cannot be handed to `crypto.subtle` as a `BufferSource`.
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

/**
 * HMAC-SHA-256 through Web Crypto — the standard primitive, in the runtime's own
 * implementation. Nothing here is hand-rolled, and verification goes through
 * `crypto.subtle.verify` rather than comparing strings, so the comparison is the platform's.
 */
async function keyFor(secret: string, usage: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usage,
  );
}

/**
 * The exact bytes signed. Built from the payload's fields in a fixed order rather than from
 * `JSON.stringify` of an object literal, so a runtime with different key ordering — or a
 * caller who adds a field — cannot change what the signature covers.
 */
function signingInput(payload: AttestationPayload): string {
  return [VERSION, payload.n, payload.g ?? '', payload.p ?? '', String(payload.iat)].join('\n');
}

/**
 * Issue an attestation for an identity Plantdex has just received from the provider.
 *
 * Called only by `identify-plant`, which is the one place that has seen PlantNet's own
 * answer. The identity passed in must already be canonical — sign what will be compared, or
 * the two sides will disagree about a name that only differs in authorship.
 */
export async function attestIdentity(
  identity: Pick<CanonicalIdentity, 'scientificName' | 'gbifId' | 'powoId'>,
  secret: string,
  now: number = Date.now(),
): Promise<string> {
  const payload: AttestationPayload = {
    n: identity.scientificName,
    g: identity.gbifId ?? null,
    p: identity.powoId ?? null,
    iat: now,
  };
  const key = await keyFor(secret, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput(payload)));
  const body = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  return `${VERSION}.${body}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/**
 * Verify an attestation against the identity the caller is asking to mint.
 *
 * TWO CHECKS, AND BOTH MATTER. The signature proves the payload is one this deployment
 * issued; the field comparison proves the payload describes THE SPECIES BEING MINTED. Without
 * the second, a valid attestation for one plant would authorise a row for another — the
 * client would simply present yesterday's daisy token beside a request for a fictional
 * species, and the signature would check out perfectly.
 */
export async function verifyAttestation(
  token: string | undefined | null,
  identity: Pick<CanonicalIdentity, 'scientificName' | 'gbifId' | 'powoId'>,
  secret: string,
  now: number = Date.now(),
): Promise<AttestationResult> {
  if (!secret) return { ok: false, reason: 'unconfigured' };
  if (typeof token !== 'string' || !token) return { ok: false, reason: 'missing' };

  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== VERSION) return { ok: false, reason: 'malformed' };

  const bodyBytes = base64UrlDecode(parts[1]!);
  const signatureBytes = base64UrlDecode(parts[2]!);
  if (!bodyBytes || !signatureBytes) return { ok: false, reason: 'malformed' };

  let payload: AttestationPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(bodyBytes)) as AttestationPayload;
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (
    typeof payload?.n !== 'string' ||
    typeof payload.iat !== 'number' ||
    !Number.isFinite(payload.iat) ||
    (payload.g !== null && typeof payload.g !== 'string') ||
    (payload.p !== null && typeof payload.p !== 'string')
  ) {
    return { ok: false, reason: 'malformed' };
  }

  const key = await keyFor(secret, ['verify']);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    signatureBytes,
    encoder.encode(signingInput(payload)),
  );
  if (!valid) return { ok: false, reason: 'badSignature' };

  // A token from the future is as wrong as one from the past; both mean a clock or a forgery.
  if (payload.iat > now + 60_000) return { ok: false, reason: 'expired' };
  if (now - payload.iat > ATTESTATION_TTL_MS) return { ok: false, reason: 'expired' };

  if (
    payload.n !== identity.scientificName ||
    (payload.g ?? null) !== (identity.gbifId ?? null) ||
    (payload.p ?? null) !== (identity.powoId ?? null)
  ) {
    return { ok: false, reason: 'mismatch' };
  }

  return { ok: true };
}

/** One species as it arrives in a `seed-packet` request. */
export interface CandidateRequest {
  scientificName?: unknown;
  commonName?: unknown;
  gbifId?: unknown;
  powoId?: unknown;
  /** The token `identify-plant` issued for this identity. Opaque to the client. */
  attestation?: unknown;
}

export type MintDecision =
  | { action: 'reuse'; identity: CanonicalIdentity }
  | { action: 'mint'; identity: CanonicalIdentity }
  | { action: 'refuse'; speciesKey: string | null; reason: 'invalidIdentity' | 'ineligible' | AttestationFailure };

/**
 * WHAT SHOULD HAPPEN TO ONE REQUESTED SPECIES — the whole rule, in one place.
 *
 * `seed-packet` calls this rather than reimplementing the order, so the tests below exercise
 * the real decision the deployed function makes rather than a parallel copy that happens to
 * agree today.
 *
 * THE ORDER IS THE DESIGN:
 *
 *   1. Identity validation FIRST, and independently of any signature. A malformed name is
 *      refused whether or not it arrives signed — the two checks answer different questions
 *      and neither substitutes for the other.
 *   2. Eligibility, unchanged: a species the deck has a confirmable card for is a discovery,
 *      not a packet, and no attestation makes it one.
 *   3. If the species is already in the canon, REUSE it and ask for nothing. The attestation
 *      creates canon; it is not a licence to read it. This is what keeps a shelf working when
 *      its own token has expired, and what makes replay a no-op rather than a risk.
 *   4. Only a NEW species needs a valid, unexpired attestation binding this exact identity.
 */
export async function mintDecision(input: {
  candidate: CandidateRequest;
  /** True when `species_packets` already holds a row for the derived species key. */
  exists: boolean;
  eligible: (scientificName: string) => boolean;
  secret: string;
  now?: number;
}): Promise<MintDecision> {
  const identity = canonicalIdentity(input.candidate);
  if (!identity) return { action: 'refuse', speciesKey: null, reason: 'invalidIdentity' };

  if (!input.eligible(identity.scientificName)) {
    return { action: 'refuse', speciesKey: identity.speciesKey, reason: 'ineligible' };
  }

  if (input.exists) return { action: 'reuse', identity };

  const verified = await verifyAttestation(
    typeof input.candidate.attestation === 'string' ? input.candidate.attestation : undefined,
    identity,
    input.secret,
    input.now,
  );
  if (!verified.ok) {
    return { action: 'refuse', speciesKey: identity.speciesKey, reason: verified.reason };
  }

  return { action: 'mint', identity };
}
