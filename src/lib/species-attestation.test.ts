import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  ATTESTATION_TTL_MS,
  attestIdentity,
  mintDecision,
  verifyAttestation,
  type CandidateRequest,
} from './species-attestation';
import { canonicalIdentity } from './species-identity';
import { isShelfEligible } from './seed-shelf';
import { packetRecipe } from './seed-packet';
import { mintablePacketInput } from './species-identity';

/**
 * THE SIGNED-CANDIDATE BOUNDARY.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Validation made the canon's SHAPE unforgeable. It could never establish CORRESPONDENCE: a
 * well-formed fictional species, or a real species wearing another species' GBIF id, passes
 * every check a validator can make and lands in a permanent, public, immutable row.
 *
 * So `identify-plant` — the only place that has seen PlantNet's own answer — signs the
 * canonical identity, and `seed-packet` verifies before creating. These tests drive
 * `mintDecision`, which IS the decision the deployed function makes: it calls this exact
 * function rather than restating the order, so nothing here is a parallel implementation
 * that happens to agree today.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SECRET = 'test-attestation-secret-not-a-real-one';
const OTHER_SECRET = 'a-different-deployment-secret';

/** A real species the deck has no card for, and its canonical identity. */
const SPECIES = {
  scientificName: 'Bellis perennis',
  gbifId: '3117424',
  powoId: '123456-1',
};

/** Shape-valid identifiers used purely as fixtures — no claim is made that they are correct. */
const identity = canonicalIdentity(SPECIES)!;

async function signedCandidate(
  overrides: Partial<CandidateRequest> = {},
  at = Date.now(),
): Promise<CandidateRequest> {
  return {
    scientificName: SPECIES.scientificName,
    gbifId: SPECIES.gbifId,
    powoId: SPECIES.powoId,
    attestation: await attestIdentity(identity, SECRET, at),
    ...overrides,
  };
}

/** The decision the live function makes, with the database answer supplied. */
function decide(candidate: CandidateRequest, exists = false, now?: number) {
  return mintDecision({ candidate, exists, eligible: isShelfEligible, secret: SECRET, now });
}

describe('a valid signed candidate mints', () => {
  it('creates canon for a real species the deck does not carry', async () => {
    const decision = await decide(await signedCandidate());
    expect(decision.action).toBe('mint');
    if (decision.action !== 'mint') return;
    expect(decision.identity.speciesKey).toBe('bellis perennis');
    expect(decision.identity.gbifId).toBe(SPECIES.gbifId);
    expect(decision.identity.powoId).toBe(SPECIES.powoId);
  });

  it('verifies against the identity, not merely against itself', async () => {
    // A signature that checks out but describes a different plant must not authorise this
    // one — otherwise yesterday's daisy token would mint anything at all.
    const token = await attestIdentity(identity, SECRET);
    expect(await verifyAttestation(token, identity, SECRET)).toEqual({ ok: true });
    const other = canonicalIdentity({ scientificName: 'Veronica persica' })!;
    expect(await verifyAttestation(token, other, SECRET)).toEqual({
      ok: false,
      reason: 'mismatch',
    });
  });
});

describe('changing any signed field breaks verification', () => {
  it('rejects a changed scientific name', async () => {
    // The token says Bellis perennis; the request says something else. The client may carry
    // the attestation and may not edit what it says.
    const decision = await decide(
      await signedCandidate({ scientificName: 'Veronica persica' }),
    );
    expect(decision).toMatchObject({ action: 'refuse', reason: 'mismatch' });
  });

  it('rejects a changed GBIF id', async () => {
    // Precisely the "real species wearing somebody else's identifier" attack.
    const decision = await decide(await signedCandidate({ gbifId: '9999999' }));
    expect(decision).toMatchObject({ action: 'refuse', reason: 'mismatch' });
  });

  it('rejects a changed POWO id', async () => {
    const decision = await decide(await signedCandidate({ powoId: '654321-2' }));
    expect(decision).toMatchObject({ action: 'refuse', reason: 'mismatch' });
  });

  it('rejects an identifier that is REMOVED as well as one that is swapped', async () => {
    // Dropping a signed field is a change too: the token asserted an id was present.
    expect(await decide(await signedCandidate({ gbifId: undefined }))).toMatchObject({
      action: 'refuse',
      reason: 'mismatch',
    });
    expect(await decide(await signedCandidate({ powoId: undefined }))).toMatchObject({
      action: 'refuse',
      reason: 'mismatch',
    });
  });

  it('rejects a token edited in place, and one signed by another deployment', async () => {
    const token = await attestIdentity(identity, SECRET);
    const [version, body, signature] = token.split('.');

    // Re-encode the payload with a different species, keeping the original signature.
    const forgedBody = btoa(JSON.stringify({ n: 'Veronica persica', g: null, p: null, iat: Date.now() }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(
      await verifyAttestation(`${version}.${forgedBody}.${signature}`, identity, SECRET),
    ).toMatchObject({ ok: false, reason: 'badSignature' });

    // A signature from a secret this deployment does not hold.
    const foreign = await attestIdentity(identity, OTHER_SECRET);
    expect(await verifyAttestation(foreign, identity, SECRET)).toMatchObject({
      ok: false,
      reason: 'badSignature',
    });

    // And structural nonsense, which must be a refusal rather than a crash.
    for (const junk of ['', 'not-a-token', 'v1.only-two', 'v2.a.b', `${version}..${signature}`]) {
      const result = await verifyAttestation(junk, identity, SECRET);
      expect(result.ok, `accepted ${JSON.stringify(junk)}`).toBe(false);
    }
  });
});

describe('the species key cannot influence canon, signed or not', () => {
  it('is derived on both sides and is not part of the signature', async () => {
    /*
     * The key is never an input and never signed — it is recomputed from the name on both
     * sides, so there is no second field that could contradict the first. A request naming
     * one species while keying as another simply keys as the species it named.
     */
    const decision = await decide(
      await signedCandidate({ speciesKey: 'quercus alba', species_key: 'quercus alba' } as Partial<CandidateRequest>),
    );
    expect(decision.action).toBe('mint');
    if (decision.action !== 'mint') return;
    expect(decision.identity.speciesKey).toBe('bellis perennis');
  });

  it('cannot be smuggled through the token either', async () => {
    // Even a payload carrying a key is ignored: `signingInput` covers name, gbif, powo and
    // the issue time, and verification compares those against the DERIVED identity.
    const token = await attestIdentity(identity, SECRET);
    const body = JSON.parse(atob(token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/')));
    expect(Object.keys(body).sort()).toEqual(['g', 'iat', 'n', 'p']);
  });
});

describe('an unattested species cannot create canon', () => {
  it('refuses a well-formed fictional species', async () => {
    /*
     * THE ATTACK THIS WHOLE MECHANISM EXISTS FOR. `Bellis fictus` is shaped exactly like a
     * real binomial and passes every validator in the project. Without a signature from
     * identify-plant, it does not enter the permanent canon.
     */
    const decision = await decide({ scientificName: 'Bellis fictus' });
    expect(decision).toMatchObject({ action: 'refuse', reason: 'missing' });
  });

  it('refuses a real species with no token, too', async () => {
    // Not a rule about plausibility — creation requires the signature, full stop.
    const decision = await decide({ scientificName: 'Bellis perennis', gbifId: '3117424' });
    expect(decision).toMatchObject({ action: 'refuse', reason: 'missing' });
  });

  it('refuses everything new when the deployment has no secret, rather than falling open', async () => {
    const decision = await mintDecision({
      candidate: await signedCandidate(),
      exists: false,
      eligible: isShelfEligible,
      secret: '',
    });
    expect(decision).toMatchObject({ action: 'refuse', reason: 'unconfigured' });
  });

  it('still lets an unconfigured deployment REUSE canon', async () => {
    // Degrades to "no new species", never to "no Seed Shelf".
    const decision = await mintDecision({
      candidate: { scientificName: 'Bellis perennis' },
      exists: true,
      eligible: isShelfEligible,
      secret: '',
    });
    expect(decision.action).toBe('reuse');
  });
});

describe('replay and expiry', () => {
  it('replaying a valid candidate reuses the row rather than minting again', async () => {
    /*
     * WHY THERE IS NO NONCE AND NO USED-TOKEN TABLE. An attestation authorises one outcome —
     * this species may enter the canon — and once it has, presenting the token again decides
     * `reuse`. Nothing is created twice, so replay buys an attacker exactly nothing.
     */
    const candidate = await signedCandidate();
    expect((await decide(candidate, false)).action).toBe('mint');
    expect((await decide(candidate, true)).action).toBe('reuse');
    expect((await decide(candidate, true)).action).toBe('reuse');
  });

  it('an expired candidate can still reuse an existing species', async () => {
    /*
     * The rule that keeps a long-dormant shelf working: the signature is required to CREATE
     * canon, not to read it. A player whose scan token expired months ago still sees the
     * canonical packet for any species somebody else has found.
     */
    const stale = await signedCandidate({}, Date.now() - ATTESTATION_TTL_MS - 60_000);
    expect(await decide(stale, false)).toMatchObject({ action: 'refuse', reason: 'expired' });
    expect((await decide(stale, true)).action).toBe('reuse');
  });

  it('accepts a candidate from well within the window, and refuses one past it', async () => {
    // The window is deliberately long because a signed-out player may shelve a plant and sign
    // in weeks later, and the IMPORT is what mints it. See `ATTESTATION_TTL_MS`.
    const thirtyDays = Date.now() - 30 * 24 * 60 * 60 * 1000;
    expect((await decide(await signedCandidate({}, thirtyDays))).action).toBe('mint');

    const justPast = Date.now() - ATTESTATION_TTL_MS - 1000;
    expect(await decide(await signedCandidate({}, justPast))).toMatchObject({
      action: 'refuse',
      reason: 'expired',
    });
  });

  it('refuses a token dated in the future', async () => {
    // A forward-dated token is a clock problem or a forgery; neither should mint.
    const ahead = await signedCandidate({}, Date.now() + 10 * 60_000);
    expect(await decide(ahead)).toMatchObject({ action: 'refuse', reason: 'expired' });
  });
});

describe('identity validation happens independently of the signature', () => {
  it('refuses a malformed name even when it is perfectly signed', async () => {
    /*
     * The two checks answer different questions and neither substitutes for the other. Here
     * the token is genuine — signed with this deployment's own secret over the exact string
     * being submitted — and the name is still refused, because it is not a botanical name.
     */
    for (const name of ['Notaplant', 'Zzz9 abcdef', 'Bellis <script>alert(1)</script>']) {
      const token = await attestIdentity(
        { scientificName: name, gbifId: null, powoId: null },
        SECRET,
      );
      const decision = await decide({ scientificName: name, attestation: token });
      expect(decision, `${name} was not refused`).toMatchObject({
        action: 'refuse',
        reason: 'invalidIdentity',
      });
    }
  });

  it('refuses a malformed name before it ever looks at the token', async () => {
    // No token at all, and the reason is still about the identity — validation runs first.
    expect(await decide({ scientificName: 'Notaplant' })).toMatchObject({
      action: 'refuse',
      reason: 'invalidIdentity',
    });
  });

  it('still drops a malformed identifier rather than the species', async () => {
    // The identifier is dropped by `canonicalIdentity`, so the signature must be over the
    // canonicalised identity — which is exactly what identify-plant signs.
    const bare = canonicalIdentity({ scientificName: 'Veronica persica', gbifId: '<script>' })!;
    expect(bare.gbifId).toBeNull();
    const decision = await decide({
      scientificName: 'Veronica persica',
      gbifId: '<script>',
      attestation: await attestIdentity(bare, SECRET),
    });
    expect(decision.action).toBe('mint');
  });
});

describe('what the attestation does not change', () => {
  it('leaves the common name display-only and out of the artwork', async () => {
    const decision = await decide(
      await signedCandidate({ commonName: 'White star heart clover gold' }),
    );
    expect(decision.action).toBe('mint');
    if (decision.action !== 'mint') return;
    expect(decision.identity.commonName).toBe('White star heart clover gold');
    expect(packetRecipe(mintablePacketInput(decision.identity))).toEqual(
      packetRecipe({ speciesKey: 'bellis perennis' }),
    );
  });

  it('does not make a deck species eligible', async () => {
    /*
     * A perfectly valid attestation for Oxalis stricta — PlantNet really does return it —
     * and it still cannot become a seed packet, because that plant has a card. Eligibility is
     * a content rule and the signature is an authenticity one; neither overrides the other.
     */
    const deckIdentity = canonicalIdentity({ scientificName: 'Oxalis stricta' })!;
    const decision = await decide({
      scientificName: 'Oxalis stricta',
      attestation: await attestIdentity(deckIdentity, SECRET),
    });
    expect(decision).toMatchObject({ action: 'refuse', reason: 'ineligible' });
  });

  it('does not make a close relative of a deck species ineligible', async () => {
    // The content rule is unchanged in the other direction too: the deck carries
    // Capsella bursa-pastoris, and Capsella rubella is a different species.
    const relative = canonicalIdentity({ scientificName: 'Capsella rubella' })!;
    const decision = await decide({
      scientificName: 'Capsella rubella',
      attestation: await attestIdentity(relative, SECRET),
    });
    expect(decision.action).toBe('mint');
  });
});

describe('the deployed functions use this, and use a dedicated secret', () => {
  const read = (fn: string) =>
    readFileSync(join(import.meta.dirname, '..', '..', 'supabase', 'functions', fn, 'index.ts'), 'utf8');

  it('identify-plant signs what it received from the provider', () => {
    const fn = read('identify-plant');
    expect(fn).toContain('attestIdentity(identity, ATTESTATION_SECRET)');
    // Signed over the CANONICAL identity, so both sides compare the same string.
    expect(fn).toContain('const identity = canonicalIdentity(candidate);');
  });

  it('seed-packet decides through mintDecision', () => {
    const fn = read('seed-packet');
    expect(fn).toContain('await mintDecision({');
    expect(fn).toContain('secret: ATTESTATION_SECRET');
  });

  it('neither uses the service-role key to sign', () => {
    for (const name of ['identify-plant', 'seed-packet']) {
      const fn = read(name);
      expect(fn, `${name} signs with the service-role key`).not.toMatch(
        /(?:attestIdentity|verifyAttestation|secret:)[^\n]*SERVICE_ROLE/,
      );
      expect(fn).toContain("Deno.env.get(ATTESTATION_SECRET_ENV)");
    }
  });

  it('uses a standard primitive rather than an invented one', () => {
    const source = readFileSync(join(import.meta.dirname, 'species-attestation.ts'), 'utf8');
    expect(source).toContain("{ name: 'HMAC', hash: 'SHA-256' }");
    // Verification goes through the platform, never a string comparison of signatures.
    expect(source).toContain('crypto.subtle.verify');
    expect(source).not.toMatch(/signature\s*===\s*/);
  });
});
