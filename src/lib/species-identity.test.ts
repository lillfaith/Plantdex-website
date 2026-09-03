import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { canonicalBinomial, canonicalIdentity, mintablePacketInput } from './species-identity';
import { normalizeName } from './plant-match';
import { packetRecipe } from './seed-packet';
import { newFind } from './seed-shelf';

/**
 * CAN A SIGNED-IN PLAYER POISON THE PERMANENT CANON?
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `species_packets` rows are global, public, and immutable — nothing in the application can
 * edit or delete one. So the interesting question is not "who may write" (nobody: only the
 * service-role function) but "what may that function be persuaded to write".
 *
 * These are the attacks, written as the request bodies somebody would actually send.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Built from escapes so the hostile strings are visible in the source rather than pasted. */
const CYRILLIC_BELLIS = 'Вellis perennis';
const NBSP_BINOMIAL = 'Bellis perennis';
const ZERO_WIDTH_BINOMIAL = 'Bellis​ perennis';

describe('a name is rebuilt, never sanitised', () => {
  it('accepts a real binomial and returns it capitalised', () => {
    expect(canonicalBinomial('Bellis perennis')).toBe('Bellis perennis');
    expect(canonicalBinomial('Capsella bursa-pastoris')).toBe('Capsella bursa-pastoris');
    // The genus must be capitalised as botany writes it — this is an identity, not a search box.
    expect(canonicalBinomial('  bellis   perennis  ')).toBeNull();
  });

  it('drops authorship and rank noise rather than storing it', () => {
    // The canon holds the species. "L." is a botanist, not part of the identity, and a
    // subspecies is finer than this table is keyed.
    expect(canonicalBinomial('Bellis perennis L.')).toBe('Bellis perennis');
    expect(canonicalBinomial('Trifolium repens var. giganteum')).toBe('Trifolium repens');
    expect(canonicalBinomial('Mentha × piperita')).toBe('Mentha piperita');
  });

  it('refuses everything that is not shaped like a botanical name', () => {
    for (const attack of [
      '',
      '   ',
      'Bellis', // a bare genus is not a species
      'bellis perennis', // uncapitalised genus
      'B perennis', // genus too short to be real
      'Zzz9 abcdef', // digits in the genus
      'Bellis 12345',
      'Bellis <script>alert(1)</script>',
      "Robert'); DROP TABLE species_packets;--",
      'Bellis\nperennis',
      'Bellis\tperennis',
      'BELLIS PERENNIS',
      '../../etc/passwd',
      '{"$ne": null}',
      NBSP_BINOMIAL,
      ZERO_WIDTH_BINOMIAL,
    ]) {
      expect(canonicalBinomial(attack), `accepted ${JSON.stringify(attack)}`).toBeNull();
    }
  });

  it('refuses a homoglyph of a real genus', () => {
    /*
     * THE ONE WORTH NAMING. A Cyrillic capital Ve renders identically to a Latin B in every
     * UI in this app. Accepted, it would mint a SECOND canonical row for a species that
     * already has one — two packets, one plant, and no way to see the difference on screen.
     */
    expect(CYRILLIC_BELLIS).not.toBe('Bellis perennis');
    expect(CYRILLIC_BELLIS.length).toBe('Bellis perennis'.length);
    expect(canonicalBinomial(CYRILLIC_BELLIS)).toBeNull();
  });

  it('caps length instead of truncating into something plausible', () => {
    expect(canonicalBinomial(`Bellis ${'a'.repeat(200)}`)).toBeNull();
    expect(canonicalBinomial(`${'B'.repeat(200)} perennis`)).toBeNull();
  });
});

describe('the species key cannot be forged or mismatched', () => {
  it('is derived from the name, so a supplied key has nothing to disagree with', () => {
    // The attack: claim to be one species while keying as another, so the row everybody
    // reads for Quercus alba is really the Bellis packet.
    const identity = canonicalIdentity({
      scientificName: 'Bellis perennis',
      speciesKey: 'quercus alba',
      species_key: 'quercus alba',
    } as Record<string, unknown>)!;
    expect(identity.speciesKey).toBe('bellis perennis');
    expect(identity.scientificName).toBe('Bellis perennis');
  });

  it('always agrees with the matcher the rest of the app keys on', () => {
    for (const name of ['Bellis perennis L.', 'Capsella rubella', 'Mentha × piperita']) {
      const identity = canonicalIdentity({ scientificName: name })!;
      expect(identity.speciesKey).toBe(normalizeName(identity.scientificName));
      expect(identity.speciesKey).toBe(identity.scientificName.toLowerCase());
    }
  });
});

describe('taxonomy identifiers are shape-checked, and that is all shape can do', () => {
  const of = (gbifId?: string, powoId?: string) =>
    canonicalIdentity({ scientificName: 'Bellis perennis', gbifId, powoId })!;

  it('keeps identifiers that look like the real thing', () => {
    expect(of('3117424').gbifId).toBe('3117424');
    expect(of(undefined, '123456-1').powoId).toBe('123456-1');
    expect(of(undefined, 'urn:lsid:ipni.org:names:123456-1').powoId).toBe(
      'urn:lsid:ipni.org:names:123456-1',
    );
  });

  it('drops the field rather than the species when an identifier is malformed', () => {
    // A bad identifier is not a reason to lose a real plant from the canon — but it is
    // absolutely a reason not to write it down.
    for (const bad of ['abc', '-1', '3117424; drop table', '<script>', '9'.repeat(20), ' ']) {
      expect(of(bad).gbifId, `kept gbif ${bad}`).toBeNull();
      expect(of(undefined, bad).powoId, `kept powo ${bad}`).toBeNull();
    }
    expect(of('abc').scientificName).toBe('Bellis perennis');
  });

  it('accepts any well-formed identifier — VALIDATION alone cannot judge the pairing', () => {
    /*
     * This module checks shape and nothing else, and both of these pass. What stops an
     * identifier being moved from one species to another is not here: it is the SIGNATURE
     * (`species-attestation.ts`), which binds the ids to the name PlantNet returned them
     * with. The two mechanisms answer different questions and this test marks the seam.
     */
    expect(of('1').gbifId).toBe('1');
    expect(of('999999999').gbifId).toBe('999999999');
  });

  it('states the resulting trust model in the documented boundary', () => {
    /*
     * The honest claim after signed candidates, kept in one place and pinned here so it
     * cannot quietly become a stronger one. Plantdex trusts what identify-plant received; it
     * does not prove biology and does not reconcile external taxonomies.
     */
    const doc = readFileSync(
      join(import.meta.dirname, '..', '..', 'docs', 'registry-trust.md'),
      'utf8',
    );
    expect(doc).toMatch(/trusts what `identify-plant` received from PlantNet/i);
    // The claim wraps across a blockquote line, so the marker is part of the gap.
    expect(doc).toMatch(/does not independently[\s>]+prove biological truth/i);
    expect(doc).toMatch(/reconcile external taxonomies/i);
    // And the mechanism that makes the pairing binding rather than asserted.
    expect(doc).toMatch(/HMAC-SHA-256/);
    expect(doc).toMatch(/creates canon; it does not read it/i);
  });
});

describe('a common name may not steer the permanent artwork', () => {
  /*
   * THE BUG THIS CLOSES. `packetRecipe` reads descriptive words out of the names it is given,
   * and the mint was handing it the CALLER'S common name — arbitrary free text. So the first
   * player to find a species could choose the bag everybody else would ever see for it.
   */
  it('was a real lever, not a theoretical one', () => {
    const plain = packetRecipe({ speciesKey: 'bellis perennis' });
    const steered = packetRecipe({
      speciesKey: 'bellis perennis',
      commonName: 'White star heart clover',
    });
    expect(steered, 'the generator no longer reads a common name at all').not.toEqual(plain);
  });

  it('is excluded from what the mint is allowed to see', () => {
    const identity = canonicalIdentity({
      scientificName: 'Bellis perennis',
      commonName: 'White star heart clover',
    })!;
    expect(Object.keys(mintablePacketInput(identity)).sort()).toEqual([
      'scientificName',
      'speciesKey',
    ]);
    expect(packetRecipe(mintablePacketInput(identity))).toEqual(
      packetRecipe({ speciesKey: 'bellis perennis' }),
    );
  });

  it('is recomputable by anyone from the species key alone', () => {
    // The property that makes an immutable public row auditable rather than merely fixed.
    for (const name of ['Bellis perennis', 'Capsella rubella', 'Trifolium repens']) {
      const identity = canonicalIdentity({ scientificName: name, commonName: 'Anything At All' })!;
      expect(packetRecipe(mintablePacketInput(identity))).toEqual(
        packetRecipe({ speciesKey: identity.speciesKey }),
      );
    }
  });

  it('still stores a sensible nickname, and refuses a hostile one', () => {
    expect(
      canonicalIdentity({ scientificName: 'Bellis perennis', commonName: 'Common daisy' })!
        .commonName,
    ).toBe('Common daisy');
    // The last one is a legitimate accented nickname, and it is DROPPED — an accepted cost:
    // the field is display-only, the scientific name always shows, and admitting non-ASCII
    // here would admit the homoglyphs the name check exists to refuse.
    for (const bad of ['<b>daisy</b>', '9', 'x'.repeat(200), '\u00e9toile']) {
      expect(
        canonicalIdentity({ scientificName: 'Bellis perennis', commonName: bad })!.commonName,
        `kept ${bad}`,
      ).toBeNull();
    }
  });

  it('draws the same bag on a device as the server will mint', () => {
    /*
     * A local preview seeded differently from the mint would mean the packet visibly changed
     * when somebody signed in. `newFind` is the signed-out path.
     */
    const find = newFind({ scientificName: 'Bellis perennis', commonName: 'White star clover' })!;
    expect(find.packet).toEqual(packetRecipe({ speciesKey: 'bellis perennis' }));
  });
});

describe('the database repeats every rule the validator applies', () => {
  const sql = readFileSync(
    join(import.meta.dirname, '..', '..', 'supabase', 'migrations', '0005_species_packets.sql'),
    'utf8',
  );

  it('constrains the key and the name to a binomial shape', () => {
    // Belt and braces: a future code path that forgets `canonicalIdentity` still cannot write
    // a malformed canon, because the table refuses it.
    expect(sql).toMatch(/species_key text primary key\s+check \(species_key ~ '\^\[a-z\]/);
    expect(sql).toMatch(/scientific_name text not null\s+check \(scientific_name ~ '\^\[A-Z\]/);
  });

  it('constrains both taxonomy identifiers', () => {
    expect(sql).toMatch(/gbif_id text check \(gbif_id is null or gbif_id ~ '\^\[0-9\]/);
    expect(sql).toMatch(/powo_id is null or powo_id ~/);
  });

  it('constrains the common name and the version', () => {
    expect(sql).toMatch(/common_name is null or common_name ~/);
    expect(sql).toMatch(/packet_version integer not null check \(packet_version > 0\)/);
  });
});

describe('the minting function uses all of it', () => {
  const fn = readFileSync(
    join(import.meta.dirname, '..', '..', 'supabase', 'functions', 'seed-packet', 'index.ts'),
    'utf8',
  );

  it('validates before it checks eligibility', () => {
    /*
     * The order moved into `mintDecision` when signed candidates arrived, so this asserts the
     * function DELEGATES to it rather than restating the sequence inline — a second copy of
     * the order is exactly how the two would drift. `species-attestation.test.ts` proves the
     * order itself, against the same function the deployed code calls.
     */
    expect(fn).toContain('await mintDecision({');
    expect(fn).toContain('eligible: isShelfEligible');
    expect(fn).toContain('canonicalIdentity(entry)');
  });

  it('writes only derived values', () => {
    expect(fn).toContain('species_key: entry.speciesKey');
    expect(fn).toContain('packet: packetRecipe(mintablePacketInput(entry))');
  });

  it('has no path that passes a common name to the generator', () => {
    expect(fn).not.toMatch(/packetRecipe\([^)]*commonName/s);
  });
});
