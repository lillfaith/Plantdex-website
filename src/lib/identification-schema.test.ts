import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { TAXON_RANKS } from './card-coverage';
import { SPECIES_CONFIDENCES } from './plant-match';

/**
 * `supabase/migrations/0006_identification.sql`, and the two seams it has to stay level with.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IS ACTUALLY AT RISK HERE.
 *
 * 0006 exists so that an observation of *Solidago altissima* that qualifies for the
 * Goldenrod card stops being stored as `solidago-canadensis` and nothing else. That only
 * holds while THREE things agree: the `Sighting` type, the columns, and the adapter that
 * moves one into the other. A field added to the type and forgotten in the adapter is
 * silently dropped on write — no error, no warning, the taxon simply is not there — and the
 * card is once again the only record of the plant. That is the failure this file is for, and
 * it is not one any type-checker can see, because the adapter builds a plain object.
 *
 * The rank and confidence CHECKs are the other half. A constraint listing fewer values than
 * the union does not degrade: Postgres REFUSES the insert, so the whole sighting fails on a
 * rank nobody thought about.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const MIGRATION = 'supabase/migrations/0006_identification.sql';
const sql = readFileSync(MIGRATION, 'utf8');
const remote = readFileSync('src/lib/remote-sightings.ts', 'utf8');
const sightings = readFileSync('src/lib/sightings.ts', 'utf8');
const exportSource = readFileSync('src/lib/export-account-data.ts', 'utf8');
const fn = readFileSync('supabase/functions/identify-plant/index.ts', 'utf8');

/** The optional observed-taxon block of `Sighting`, as the type declares it. */
const TAXON_FIELDS = [
  'observedTaxonProviderName',
  'observedTaxonName',
  // The matching key, stored as its own fact: it is HOW the card was found, and recomputing
  // it later would answer with the normaliser's rules of that day rather than of this one.
  'observedTaxonKey',
  'observedTaxonRank',
  // WHY the observation qualified — `exact` against `legacyGenus` is the whole difference
  // between a Solidago canadensis find and a Solidago altissima one on the same card.
  'eligibility',
  'speciesConfidence',
  'identificationProvider',
] as const;

/** camelCase → snake_case, the one naming rule every column in this project follows. */
const column = (field: string) => field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

describe('the observed taxon has somewhere to go', () => {
  it('declares every field of Sighting as a column', () => {
    for (const field of TAXON_FIELDS) {
      expect(sightings, `Sighting lost ${field}`).toContain(`${field}?:`);
      expect(sql, `0006 has no column for ${field}`).toContain(
        `add column if not exists ${column(field)} `,
      );
    }
  });

  it('adds them nullably, so nothing already stored is invalidated', () => {
    /*
     * Every sighting logged before this — and every sighting logged by hand from a card page,
     * which involves no identifier at all — has none of these. A `not null` here would make
     * the migration itself fail against real data.
     */
    for (const field of TAXON_FIELDS) {
      const declaration = new RegExp(`add column if not exists ${column(field)}[^;]*`, 'i');
      expect(sql.match(declaration)?.[0], `${column(field)} is not nullable`).not.toMatch(
        /not null/i,
      );
    }
  });

  it('backfills nothing — a sighting with no observed taxon never knew one', () => {
    expect(sql, '0006 writes values into existing rows').not.toMatch(/^\s*update public\./im);
  });

  it('reads and writes each one in the remote adapter, in both directions', () => {
    // The direction that fails silently is the WRITE: a missing key in the insert object is
    // a valid insert that simply stores null.
    for (const field of TAXON_FIELDS) {
      expect(remote, `${field} is never read back from a row`).toContain(`row.${column(field)}`);
      expect(remote, `${field} is never written to its column`).toMatch(
        new RegExp(`${column(field)}:\\s*sighting\\.${field}`),
      );
    }
  });

  it('carries each one into the data export', () => {
    for (const field of TAXON_FIELDS) {
      expect(exportSource, `the export drops ${field}`).toContain(`row.${column(field)}`);
    }
  });
});

describe('the rank and confidence checks match their unions exactly', () => {
  /** The quoted values inside one column's `in (...)` list. */
  function allowed(columnName: string): string[] {
    const block = new RegExp(`${columnName} in \\(([^)]*)\\)`).exec(sql)?.[1] ?? '';
    return [...block.matchAll(/'([^']+)'/g)].map(([, value]) => value!).sort();
  }

  it('parsed both lists — an empty one would pass every check below', () => {
    expect(allowed('observed_taxon_rank').length).toBeGreaterThan(0);
    expect(allowed('species_confidence').length).toBeGreaterThan(0);
  });

  it('accepts exactly the ranks TaxonRank defines', () => {
    // Narrower and a legitimate observation is refused; wider and the column admits a rank
    // nothing in the app can render.
    expect(allowed('observed_taxon_rank')).toEqual([...TAXON_RANKS].sort());
  });

  it('accepts exactly the bands SpeciesConfidence defines', () => {
    expect(allowed('species_confidence')).toEqual([...SPECIES_CONFIDENCES].sort());
  });

  it('never admits a supra-specific rank as though it were a species', () => {
    // The rank column is the thing that keeps `Taraxacum sect. Taraxacum` from reading back
    // as an exact identification of `Taraxacum officinale`.
    expect(allowed('observed_taxon_rank')).toContain('section');
    expect(allowed('observed_taxon_rank')).toContain('genus');
  });
});

describe('the comparison table holds answers, not people', () => {
  const table =
    /create table if not exists public\.identification_comparisons\s*\(([\s\S]*?)\n\);/.exec(sql)?.[1] ??
    '';
  const columns = [...table.matchAll(/^\s{2}([a-z_]+)\s+(uuid|text|timestamptz|numeric|jsonb)/gim)].map(
    ([, name]) => name!,
  );

  it('was parsed at all', () => {
    expect(columns).toContain('user_id');
    expect(columns.length).toBeGreaterThanOrEqual(8);
  });

  it('stores no photograph, address, location or quota bucket', () => {
    for (const word of ['photo', 'image', 'ip', 'bucket', 'location', 'region', 'email', 'salt']) {
      expect(
        columns.filter((name) => name.includes(word)),
        `identification_comparisons holds a ${word} column`,
      ).toEqual([]);
    }
  });

  it('grants select, insert and delete — and no update', () => {
    for (const action of ['select', 'insert', 'delete']) {
      expect(sql).toMatch(
        new RegExp(`on public\\.identification_comparisons\\s+for ${action}`, 'i'),
      );
    }
    // A record of what an identifier said on a day is history. `profiles` is the one
    // deliberately mutable table in this project and must stay the only one.
    expect(sql).not.toMatch(/on public\.identification_comparisons\s+for update/i);
  });

  it('is joinable without any mutable column', () => {
    /*
     * "Did this provider agree with what the player confirmed?" is answered by joining to
     * `scans.confirmed_herb_id` through the observation id — not by going back and updating a
     * comparison row, which there is deliberately no policy to do.
     */
    expect(sql).toContain('observation_id uuid not null');
    expect(sql).toContain('alter table public.scans add column if not exists identification_observation_id');
  });
});

describe('comparison mode is off unless two separate things say otherwise', () => {
  it('requires the flag AND the account to be named', () => {
    expect(fn).toMatch(/COMPARISON_ON\s*=\s*\(Deno\.env\.get\('IDENTIFICATION_COMPARISON'\)/);
    expect(fn).toMatch(/Deno\.env\.get\('IDENTIFICATION_COMPARISON_USER_IDS'\)/);
    // Both gates in the one expression that decides, plus a caller there is an id for.
    expect(fn).toMatch(
      /const comparing =\s*Boolean\(userId\) && COMPARISON_ON && COMPARISON_USER_IDS\.has\(userId!\);/,
    );
  });

  it('has no default that would switch it on', () => {
    // An unset flag must read as off, and an unset list must match nobody. A `?? 'on'` or a
    // list that falls back to anything non-empty would enrol people who never asked.
    expect(fn).toMatch(/Deno\.env\.get\('IDENTIFICATION_COMPARISON'\) \?\? ''/);
    expect(fn).toMatch(/Deno\.env\.get\('IDENTIFICATION_COMPARISON_USER_IDS'\) \?\? ''/);
  });

  it('never serves the alternate provider answer to the player', () => {
    /*
     * The alternate is recorded and dropped. If it ever reached the response, an allow-listed
     * account would silently be using a different identifier from everybody else — and the
     * comparison would be measuring the wrong thing.
     */
    expect(fn).not.toMatch(/return json\([^)]*\balternate\b/);
    expect(fn).toMatch(/candidates: attested\.filter/);
  });

  it('cannot fail a scan when the telemetry write fails', () => {
    // Detached and caught. Somebody standing in front of a plant must never be told the
    // identification failed because an evaluation row did.
    expect(fn).toMatch(/admin\.from\('identification_comparisons'\)\.insert\(rows\),\s*\)\.catch/);
  });

  it('records a provider failure rather than dropping the row', () => {
    // "plant.id refused the key" is the most useful result a comparison can have.
    expect(fn).toMatch(/isIdentificationFailure\(result\)[\s\S]{0,160}failure: result\.kind/);
  });
});

describe('a discovery stays card-level, and evidence stays one layer down', () => {
  /*
   * A SETTLED DECISION, PINNED SO IT CANNOT DRIFT BACK.
   *
   * `discoveries` asserts exactly one thing: this Plantdex card is unlocked for this player.
   * No taxon, no rank, no eligibility, no confidence, no provider — deliberately, and not as
   * an omission waiting to be filled in.
   *
   * WHY IT IS TEMPTING AND WRONG. Reading a collection back, "how sure was this find?" is a
   * natural question, and a `species_confidence` column here would answer it in one join
   * fewer. But XP, mastery, Field Research, the garden, the achievements and the completion
   * percentage all count DISCOVERIES, and all of them count cards — so a confidence column is
   * a value those systems could start reading, which is how a card-level record quietly turns
   * into a second, weaker species claim. And a discovery is reachable with no identifier at
   * all (two taps on a card page, no camera), so the column would be null for most real rows:
   * a field meaning "this one happened to come in through the scanner" is not evidence.
   *
   * The evidence exists, on `sightings` and `scans`, with its provenance attached.
   */
  const accounts = readFileSync('supabase/migrations/0001_accounts.sql', 'utf8');
  const table =
    /create table if not exists public\.discoveries\s*\(([\s\S]*?)\n\);/.exec(accounts)?.[1] ?? '';
  const columns = [...table.matchAll(/^\s{2}([a-z_]+)\s+(uuid|text|timestamptz|numeric|boolean|jsonb)/gim)].map(
    ([, name]) => name!,
  );

  it('parsed the table — an empty column list would pass everything below', () => {
    expect(columns).toEqual(['user_id', 'herb_id', 'discovered_at']);
  });

  it('holds no taxon, rank, eligibility, confidence or provider column', () => {
    for (const word of [
      'taxon',
      'rank',
      'eligibility',
      'confidence',
      'provider',
      'scientific',
      'species',
      'probability',
      'score',
    ]) {
      expect(
        columns.filter((name) => name.includes(word)),
        `discoveries grew a ${word} column — evidence belongs on sightings/scans`,
      ).toEqual([]);
    }
  });

  it('and neither does 0006, which is where such a column would most plausibly land', () => {
    expect(sql, '0006 alters the discoveries table').not.toMatch(
      /alter table public\.discoveries/i,
    );
  });

  it('keeps the client-side record a bare herb-id-to-timestamp map', () => {
    // `Record<string, Timestamp>` has nowhere to put a taxon. Widening it to an object is the
    // same decision as adding the column, made in TypeScript instead of SQL.
    const types = readFileSync('src/lib/types.ts', 'utf8');
    expect(types).toMatch(/discoveries:\s*Record<string, Timestamp>;/);
  });
});

describe('the function-secret check follows the provider, and never prints a value', () => {
  /*
   * `check_function_secrets.py` reads `GET /v1/projects/{ref}/secrets`, which returns each
   * secret's VALUE beside its name, into a workflow log anyone with repo access can read.
   * It now reads three of those values — to decide which provider key is required, and
   * whether comparison mode is actually configured — so the rule that none of them reaches
   * stdout stops being free and starts needing a guard.
   *
   * Source-level because `npm run verify` cannot run Python (the same reason
   * `audit_sprites.py` is a separate command), so the alternative is no check at all.
   */
  const script = readFileSync('scripts/check_function_secrets.py', 'utf8');
  const printed = [...script.matchAll(/print\(([\s\S]*?)\n(?=\S|\s{4}\S)/g)].map(([, body]) => body);

  it('parsed the script — an empty print list would pass everything below', () => {
    expect(script).toContain('def main()');
    expect(printed.length).toBeGreaterThan(5);
  });

  it('never interpolates a secret value into output', () => {
    // The three it reads. `provider` is the VALIDATED choice and is allowed; `raw_provider`
    // and any `values.get(...)` are the untrusted strings that came off the wire.
    for (const body of printed) {
      expect(body, 'a print() interpolates raw_provider').not.toMatch(/\braw_provider\b/);
      expect(body, 'a print() interpolates a secret value').not.toMatch(/values\.get\(/);
      expect(body, 'a print() interpolates the allow-list').not.toMatch(/\blisted\b(?!\))/);
    }
    // The allow-list is reported as a COUNT. It names accounts.
    expect(script).toContain('{len(listed)} account(s)');
  });

  it('requires the key for the SELECTED provider, not one named in advance', () => {
    /*
     * The mistake this mirrors: `identify-plant` read `PLANTNET_API_KEY` unconditionally and
     * would have refused every scan on a plant.id deployment while blaming the wrong secret.
     * A checker with a hard-coded required key reproduces that one layer up — it would pass
     * a plant.id deployment with no plant.id key, and fail a working one that has no PlantNet
     * key.
     */
    expect(script).toContain('def expected_secrets(provider: str)');
    expect(script).toMatch(/selected = PROVIDER_KEYS\.get\(provider/);
    expect(script).toMatch(/PROVIDER_KEYS = \{[^}]*"plantnet"[^}]*"plantid"[^}]*\}/);
  });

  it('treats an unrecognised provider as an error, never a fall back', () => {
    // Same rule the function follows: falling back would let a typo look like a working
    // deployment answering from a provider nobody chose.
    expect(script).toContain('if not known:');
    expect(script).toMatch(/::error::.*PLANT_IDENTIFICATION_PROVIDER is set to something/);
  });

  it('names every secret the identification path reads', () => {
    for (const secret of [
      'PLANTNET_API_KEY',
      'PLANT_ID_API_KEY',
      'PLANT_IDENTIFICATION_PROVIDER',
      'IDENTIFICATION_COMPARISON',
      'IDENTIFICATION_COMPARISON_USER_IDS',
      'SPECIES_ATTESTATION_SECRET',
      'SCAN_QUOTA_SALT',
    ]) {
      expect(script, `the check does not know about ${secret}`).toContain(secret);
    }
  });
});
