import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { matchScientificName, outcomeFor, speciesConfidenceFor, type ScanCandidate } from './plant-match';

/**
 * THE WHOLE PATH FROM A PROVIDER'S STRING TO A STORED ROW.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EVERY OTHER TEST IN THIS REPO CHECKS ONE LINK. This one checks that the taxon survives all
 * of them, because every loss so far happened at a JOIN rather than inside a function:
 *
 *   `matchScientificName` reported the observed taxon correctly — and the scan path never
 *   wrote a sighting at all, so it reached nothing.
 *   `Sighting` grew four correct fields — and the remote adapter's insert object did not name
 *   them, which is a valid insert that silently stores null.
 *   `scans` recorded the provider's TOP candidate and the confirmed CARD — and nothing said
 *   the top candidate had been rejected, so the row attributed a taxon to a player who had
 *   explicitly declined it.
 *
 * So these tests drive the real adapters and read the payload that would reach the database.
 * A unit test of either end passes while the middle drops everything.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const candidateFor = (scientificName: string, score: number): ScanCandidate => ({
  scientificName,
  score,
  match: matchScientificName(scientificName),
});

/* ── local storage, for the signed-out half ──────────────────────────────── */

function stubStorage(seed?: unknown): void {
  const store = new Map<string, string>();
  if (seed !== undefined) store.set('plantdex.sightings.v1', JSON.stringify(seed));
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  });
}

/** A fresh module instance — the local store memoises into a module-level cache. */
async function localSightings(seed?: unknown) {
  vi.resetModules();
  stubStorage(seed);
  return import('./sightings');
}

/* ── a Supabase stand-in that records what it was asked to write ─────────── */

interface Captured {
  sightings: Record<string, unknown>[];
  scans: Record<string, unknown>[];
}

/**
 * Enough of PostgREST's builder to drive the real adapters.
 *
 * Deliberately not a mock of `addRemoteSighting` — mocking the thing under test is how a
 * suite ends up proving that its own stub sets the fields. The adapter builds the insert
 * object; this records it.
 */
function fakeSupabase(captured: Captured, existingScan: Record<string, unknown> | null = null) {
  const thenable = (value: unknown) => ({
    // Every terminal in these chains is awaited, and PostgREST builders are thenables.
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(value).then(resolve),
    eq: () => thenable(value),
    maybeSingle: () => Promise.resolve(value),
  });
  return {
    from(table: string) {
      return {
        insert: (row: Record<string, unknown>) => {
          if (table === 'sightings') captured.sightings.push(row);
          if (table === 'scans') captured.scans.push(row);
          return Promise.resolve({ error: null });
        },
        select: () => thenable({ data: existingScan, error: null }),
        delete: () => thenable({ error: null }),
      };
    },
  };
}

async function remoteSightings(captured: Captured) {
  vi.resetModules();
  vi.doMock('./supabase-client', () => ({ supabase: fakeSupabase(captured) }));
  return import('./remote-sightings');
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.doUnmock('./supabase-client');
});

/* ─────────────────────────────────────────────────────────────────────────── */

describe('what a confirmed candidate records', () => {
  it('keeps an exact species AS that species', async () => {
    const { observedTaxonFields } = await import('./scans');
    const fields = observedTaxonFields(candidateFor('Oxalis stricta', 0.8), 'plantnet');
    expect(fields.observedTaxonName).toBe('Oxalis stricta');
    expect(fields.observedTaxonRank).toBe('species');
    expect(fields.eligibility).toBe('exact');
    expect(fields.speciesConfidence).toBe('high');
    expect(fields.identificationProvider).toBe('plantnet');
  });

  it('logs the CARD while leaving an accepted-group species unchanged', async () => {
    const { observedTaxonFields } = await import('./scans');
    /*
     * The Goldenrod card prints `Solidago canadensis`. `Solidago altissima` qualifies for it
     * and IS NOT IT. This is the original bug: the card became the record of the plant.
     */
    const candidate = candidateFor('Solidago altissima', 0.6);
    expect(candidate.match.herbId).toBe('solidago-canadensis');
    const fields = observedTaxonFields(candidate);
    expect(fields.observedTaxonName).toBe('Solidago altissima');
    expect(fields.observedTaxonName).not.toBe('Solidago canadensis');
    expect(fields.eligibility).toBe('legacyGenus');
    expect(fields.observedTaxonRank).toBe('species');
  });

  it('keeps a Dandelion SECTION a section, with the species unresolved', async () => {
    const { observedTaxonFields } = await import('./scans');
    const candidate = candidateFor('Taraxacum sect. Ruderalia', 0.99);
    expect(candidate.match.herbId).toBe('taraxacum-officinale');
    expect(candidate.match.confirmable).toBe(true);
    const fields = observedTaxonFields(candidate);
    expect(fields.observedTaxonName).toBe('Taraxacum sect. Ruderalia');
    expect(fields.observedTaxonName).not.toBe('Taraxacum officinale');
    expect(fields.observedTaxonRank).toBe('section');
    expect(fields.eligibility).toBe('acceptedGroup');
    // 0.99 and still unresolved: certainty about a SECTION says nothing about which species.
    expect(fields.speciesConfidence).toBe('unresolved');
  });

  it('keeps a subspecies at subspecies rank, and still resolves the species', async () => {
    const { observedTaxonFields } = await import('./scans');
    const fields = observedTaxonFields(candidateFor('Plantago major subsp. intermedia', 0.8));
    expect(fields.observedTaxonName).toBe('Plantago major subsp. intermedia');
    expect(fields.observedTaxonRank).toBe('subspecies');
    // A subspecies of Plantago major IS Plantago major, so the species is settled.
    expect(fields.speciesConfidence).toBe('high');
    // The matching key is the binomial, and is stored as a SEPARATE fact from the identity.
    expect(fields.observedTaxonKey).toBe('plantago major');
    expect(fields.observedTaxonKey).not.toBe(fields.observedTaxonName);
  });

  it('keeps a hybrid marker, in both notations', async () => {
    const { observedTaxonFields } = await import('./scans');
    for (const raw of ['Mentha × piperita', 'Mentha x piperita', 'Mentha ×piperita']) {
      const fields = observedTaxonFields(candidateFor(raw, 0.8));
      expect(fields.observedTaxonName, raw).toBe('Mentha × piperita');
      // Dropping the sign does not generalise a name, it invents a species.
      expect(fields.observedTaxonName, raw).not.toBe('Mentha piperita');
      expect(fields.observedTaxonProviderName, raw).toBe(raw);
    }
    const ascii = observedTaxonFields(candidateFor('Quercus x leana', 0.8));
    expect(ascii.observedTaxonName).toBe('Quercus × leana');
    expect(ascii.observedTaxonName).not.toBe('Quercus leana');
  });

  it('never lets an unhandled qualifier become a species identification', async () => {
    const { observedTaxonFields } = await import('./scans');
    for (const raw of [
      'Rubus fruticosus agg.',
      'Brassica oleracea convar. capitata',
      'Rosa nothosubsp. something',
    ]) {
      const fields = observedTaxonFields(candidateFor(raw, 0.99));
      expect(fields.observedTaxonRank, raw).toBe('unknown');
      expect(fields.speciesConfidence, raw).toBe('unresolved');
      // And the qualifier stays visible rather than being quietly trimmed off.
      expect(fields.observedTaxonName, raw).not.toBe(raw.split(' ').slice(0, 2).join(' '));
    }
  });
});

describe('the provider leading answer and the chosen one are different facts', () => {
  /*
   * The exact shape the model exists to prevent:
   *
   *   top      Oxalis dillenii  0.41   the provider's best guess — NOT a Plantdex card
   *   selected Oxalis stricta   0.09   what the player actually tapped
   *   card     Wood Sorrel
   */
  const top = candidateFor('Oxalis dillenii', 0.41);
  const selected = candidateFor('Oxalis stricta', 0.09);

  it('sets the scene: the leading answer is not confirmable and the chosen one is', () => {
    expect(top.match.confirmable).toBe(false);
    expect(top.match.eligibility).toBe('related');
    expect(selected.match.confirmable).toBe(true);
    expect(selected.match.herbId).toBe('oxalis-stricta');
  });

  it('writes the chosen candidate onto the scan row without touching the top one', async () => {
    const captured: Captured = { sightings: [], scans: [] };
    vi.resetModules();
    const existing = {
      id: 'scan_1',
      user_id: 'u1',
      top_scientific_name: top.scientificName,
      confidence: top.score,
      outcome: 'uncertain',
    };
    vi.doMock('./supabase-client', () => ({ supabase: fakeSupabase(captured, existing) }));
    const { confirmScan } = await import('./scans');

    expect(await confirmScan('u1', 'scan_1', 'oxalis-stricta', selected)).toBe(true);
    const row = captured.scans[0]!;
    // The leading answer is carried through UNCHANGED — it is a record of what came back.
    expect(row.top_scientific_name).toBe('Oxalis dillenii');
    expect(row.confidence).toBe(0.41);
    // And the selection is its own set of facts beside it.
    expect(row.confirmed_herb_id).toBe('oxalis-stricta');
    expect(row.confirmed_scientific_name).toBe('Oxalis stricta');
    expect(row.confirmed_probability).toBe(0.09);
    expect(row.confirmed_eligibility).toBe('exact');
    expect(row.confirmed_taxon_rank).toBe('species');
    // Nothing anywhere in the row says the player confirmed Oxalis dillenii.
    expect(row.confirmed_scientific_name).not.toBe('Oxalis dillenii');
  });

  it('records the CHOSEN taxon on the sighting, not the leading one', async () => {
    const { observedTaxonFields } = await import('./scans');
    const fields = observedTaxonFields(selected);
    expect(fields.observedTaxonProviderName).toBe('Oxalis stricta');
    expect(fields.observedTaxonName).not.toBe('Oxalis dillenii');
    // 0.09 is a weak identification and is recorded as one. Being a Plantdex card does not
    // make a candidate a confident one.
    expect(fields.speciesConfidence).toBe('low');
  });

  it('does not let card membership promote a low-ranked candidate to the leading answer', () => {
    /*
     * `outcomeFor` reads RANK, never a score and never "is one of these a card". With the
     * provider's own best guess unconfirmable, the honest outcome is `uncertain` — a list
     * with nothing preferred — even though a perfectly confirmable Plantdex card sits below
     * it at 0.09. Reversing that would let card membership overrule the identifier.
     */
    expect(outcomeFor([top, selected])).toBe('uncertain');
    expect(outcomeFor([selected, top])).toBe('matched');
    // And confidence stays a property of the score, not of the card.
    expect(speciesConfidenceFor('species', 0.09)).toBe('low');
  });
});

describe('the signed-out journal keeps the observation', () => {
  it('stores every taxon field on a local sighting and reads them back', async () => {
    const { addSighting, getAllSightings } = await localSightings([]);
    const { observedTaxonFields } = await import('./scans');
    const fields = observedTaxonFields(candidateFor('Solidago altissima', 0.6), 'plantnet');

    addSighting({ herbId: 'solidago-canadensis', date: '2026-09-22', ...fields });
    const [stored] = getAllSightings();

    expect(stored!.herbId).toBe('solidago-canadensis');
    expect(stored!.observedTaxonProviderName).toBe('Solidago altissima');
    expect(stored!.observedTaxonName).toBe('Solidago altissima');
    expect(stored!.observedTaxonKey).toBe('solidago altissima');
    expect(stored!.observedTaxonRank).toBe('species');
    expect(stored!.eligibility).toBe('legacyGenus');
    expect(stored!.speciesConfidence).toBe('moderate');
    expect(stored!.identificationProvider).toBe('plantnet');
  });

  it('still loads a legacy sighting that has no taxon fields at all', async () => {
    /*
     * Every sighting recorded before these existed, and every one logged by hand from a card
     * page, has none of them. `isSighting` must not require them: doing so would filter real
     * history out of somebody's journal on read — the guard's own failure, from the other
     * direction.
     */
    const legacy = {
      id: 'sighting_legacy',
      herbId: 'taraxacum-officinale',
      date: '2025-04-01',
      createdAt: '2025-04-01T09:00:00.000Z',
    };
    const { getAllSightings } = await localSightings([legacy]);
    const kept = getAllSightings();
    expect(kept).toHaveLength(1);
    expect(kept[0]!.id).toBe('sighting_legacy');
    expect(kept[0]!.observedTaxonName).toBeUndefined();
    expect(kept[0]!.eligibility).toBeUndefined();
  });
});

describe('the signed-in journal keeps the same observation', () => {
  it('names every taxon column in the insert it sends', async () => {
    const captured: Captured = { sightings: [], scans: [] };
    const { addRemoteSighting } = await remoteSightings(captured);
    const { observedTaxonFields } = await import('./scans');
    const fields = observedTaxonFields(candidateFor('Taraxacum sect. Ruderalia', 0.99), 'plantid');

    await addRemoteSighting('u1', {
      herbId: 'taraxacum-officinale',
      date: '2026-09-22',
      ...fields,
    });

    const row = captured.sightings[0]!;
    expect(row.herb_id).toBe('taraxacum-officinale');
    expect(row.observed_taxon_provider_name).toBe('Taraxacum sect. Ruderalia');
    expect(row.observed_taxon_name).toBe('Taraxacum sect. Ruderalia');
    expect(row.observed_taxon_key).toBe('taraxacum sect ruderalia');
    expect(row.observed_taxon_rank).toBe('section');
    expect(row.eligibility).toBe('acceptedGroup');
    expect(row.species_confidence).toBe('unresolved');
    expect(row.identification_provider).toBe('plantid');
    // The card is recorded, and the card is NOT the plant.
    expect(row.observed_taxon_name).not.toBe('Taraxacum officinale');
  });

  it('sends explicit nulls for a hand-logged sighting rather than omitting the keys', async () => {
    const captured: Captured = { sightings: [], scans: [] };
    const { addRemoteSighting } = await remoteSightings(captured);
    await addRemoteSighting('u1', { herbId: 'urtica-dioica', date: '2026-09-22' });
    const row = captured.sightings[0]!;
    for (const column of [
      'observed_taxon_provider_name',
      'observed_taxon_name',
      'observed_taxon_key',
      'observed_taxon_rank',
      'eligibility',
      'species_confidence',
      'identification_provider',
    ]) {
      // Present and null, not absent: a column nothing ever names looks identical to a
      // column nobody added.
      expect(Object.hasOwn(row, column), `${column} is missing from the insert`).toBe(true);
      expect(row[column], column).toBeNull();
    }
  });

  it('round-trips a stored row back to the same identity', async () => {
    const captured: Captured = { sightings: [], scans: [] };
    vi.resetModules();
    const { observedTaxonFields } = await import('./scans');
    const fields = observedTaxonFields(candidateFor('Mentha × piperita', 0.8), 'plantnet');
    vi.doMock('./supabase-client', () => ({ supabase: fakeSupabase(captured) }));
    const { addRemoteSighting } = await import('./remote-sightings');

    const written = await addRemoteSighting('u1', {
      herbId: 'mentha-canadensis',
      date: '2026-09-22',
      ...fields,
    });
    const row = captured.sightings[0]!;

    // What the adapter returned to the UI and what it sent to the database are the same
    // taxon — including the hybrid sign, which the matching key cannot carry.
    expect(written.observedTaxonName).toBe('Mentha × piperita');
    expect(row.observed_taxon_name).toBe('Mentha × piperita');
    expect(row.observed_taxon_key).toBe('mentha piperita');
  });
});

describe('the scan screen actually calls the path above', () => {
  /*
   * THE JOIN IS THE THING THAT WAS MISSING, AND NO UNIT TEST COULD SEE IT.
   *
   * Every piece above was correct in isolation while the scan screen wrote only a discovery:
   * `confirmScan` had NO CALLER AT ALL — the module's own doc said "what the UI calls after
   * an explicit tap" and nothing called it — and no sighting was ever created, so the taxon
   * reached none of the columns it has. Source-level, because the alternative is mounting the
   * whole scan screen with a camera, a provider and an auth session to assert one call.
   */
  const panel = readFileSync('src/components/scan/ScanPanel.tsx', 'utf8');

  it('logs a sighting when a candidate is confirmed', () => {
    expect(panel).toContain('void addSighting({');
    /*
     * `result?.provider`, optionally chained, because the confirm handler is now a
     * component-level `useCallback` shared by the leading candidate's one-tap confirm and by
     * the comparison panel's deliberate one. It is only ever reached from a row inside the
     * result branch, so the value is always there — but the compiler cannot see that from
     * where the callback is declared, and widening the type to pretend otherwise would be
     * worse than a question mark. The assertion is unchanged in substance: the taxon fields
     * come from the candidate and the provider, together, at this one call site.
     */
    expect(panel).toMatch(/\.\.\.observedTaxonFields\(candidate, result\??\.provider\)/);
    // Through the facade, so signed out writes localStorage by the same call.
    expect(panel).toContain("import { useSightingsStore } from '@/lib/sightings-store';");
  });

  it('dates the sighting where the player is, never in UTC', () => {
    expect(panel).toContain('date: localDateKey()');
    expect(panel, 'a UTC date would log tomorrow west of UTC').not.toMatch(
      /date:\s*new Date\(\)\.toISOString\(\)/,
    );
  });

  it('records which candidate was confirmed, not just which card', () => {
    expect(panel).toMatch(/confirmScan\(user\.id, scanId, herb\.id, candidate\)/);
  });

  it('never fails the confirm because the journal write failed', () => {
    // The discovery is already recorded by the time the sighting is attempted. Throwing out
    // of the handler would lose the larger record to save the smaller one.
    expect(panel).toMatch(/\}\)\.catch\(\(error: unknown\) => \{/);
    expect(panel).toContain('journalled: false');
  });

  it('says so on screen when the journal entry did not save', () => {
    expect(panel).toContain('could not be saved to');
    expect(panel).toContain('{!confirmed.journalled && (');
  });
});

describe('every write path names every field of a Sighting', () => {
  /*
   * THE FAILURE MODE HERE IS A SUCCESSFUL WRITE.
   *
   * Three places build a row out of a `Sighting` BY HAND — the remote adapter's insert, the
   * local-progress import's upsert, and (read side) the export. A field left out of one of
   * them is not an error and not a warning: it is a valid statement that stores null. The
   * import was exactly that, and it is the path where it would hurt most — a signed-out
   * player scanning for weeks, then making an account, with the import the ONLY thing
   * carrying those observations across. The card would arrive and the plant would not.
   *
   * So the guard is derived from the type rather than from a list somebody remembers to
   * extend: read `Sighting`'s own fields and require each to appear in each writer.
   */
  const sightingSource = readFileSync('src/lib/sightings.ts', 'utf8');
  const body = /export interface Sighting \{([\s\S]*?)\n\}/.exec(sightingSource)?.[1] ?? '';
  const fields = [...body.matchAll(/^ {2}(\w+)\??:/gm)].map(([, name]) => name!);

  /** Columns whose name is not the snake_case of the field. */
  const COLUMN: Record<string, string> = {
    id: 'id',
    herbId: 'herb_id',
    photoId: 'photo_path',
    createdAt: 'created_at',
  };
  const column = (field: string) =>
    COLUMN[field] ?? field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

  it('parsed the interface — an empty field list would pass everything below', () => {
    expect(fields).toContain('herbId');
    expect(fields).toContain('observedTaxonName');
    expect(fields.length).toBeGreaterThanOrEqual(16);
  });

  it.each([
    ['the remote adapter', 'src/lib/remote-sightings.ts'],
    ['the local-progress import', 'src/lib/import-local-progress.ts'],
  ])('%s writes a column for each one', (_label, path) => {
    const source = readFileSync(path, 'utf8');
    for (const field of fields) {
      expect(source, `${path} never writes ${column(field)}`).toMatch(
        new RegExp(`${column(field)}:`),
      );
    }
  });

  it('the export reads a column for each one', () => {
    const source = readFileSync('src/lib/export-account-data.ts', 'utf8');
    for (const field of fields) {
      // `id`, `date` and the rest are read through `String(row.…)`; all that matters is that
      // the column name appears at all.
      expect(source, `the export never reads ${column(field)}`).toMatch(
        new RegExp(`row\\.${column(field)}`),
      );
    }
  });
});
