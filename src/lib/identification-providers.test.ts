import { describe, expect, it } from 'vitest';
import { parsePlantIdResponse } from './plantid-normalize';
import { parsePlantNetResponse } from './plantnet-normalize';
import { isIdentificationFailure, type NormalizedIdentification } from './identification-types';
import { speciesConfidenceForProvider, thresholdsFor } from './identification-confidence';

/**
 * PROVIDER NORMALIZATION, AGAINST HAND-WRITTEN MOCKS.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EVERY FIXTURE BELOW IS A TEST MOCK, NOT A CAPTURED RESPONSE. They contain the minimum
 * documented structure each parser reads and nothing more. No real plant.id response is
 * committed here and none was invented to look like one: the primary documentation was
 * unreachable from this environment, so a fixture presented as real would be a fabrication
 * dressed as evidence. A sanitised regression fixture gets captured from a live call once
 * `PLANT_ID_API_KEY` is configured.
 *
 * Nothing here touches the network, so `npm test` spends no plant.id credits — which is a
 * property of the design rather than a promise: the parsers are pure functions of a body.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** MOCK. Minimum documented plant.id v3 shape. */
const plantIdMock = (overrides: Record<string, unknown> = {}) => ({
  result: {
    is_plant: { binary: true },
    classification: {
      suggestions: [
        {
          name: 'Taraxacum officinale',
          probability: 0.82,
          details: {
            common_names: ['Common dandelion', 'Blowball'],
            taxonomy: { genus: 'Taraxacum', family: 'Asteraceae', class: 'Magnoliopsida' },
          },
        },
        { name: 'Taraxacum erythrospermum', probability: 0.11, details: {} },
      ],
    },
    ...overrides,
  },
});

/** MOCK. Minimum PlantNet v2 shape. */
const plantNetMock = () => ({
  results: [
    {
      score: 0.74,
      species: {
        scientificNameWithoutAuthor: 'Taraxacum officinale',
        scientificName: 'Taraxacum officinale F.H.Wigg.',
        commonNames: ['Common dandelion'],
        genus: { scientificNameWithoutAuthor: 'Taraxacum' },
        family: { scientificNameWithoutAuthor: 'Asteraceae' },
      },
      gbif: { id: 3129096 },
      powo: { id: 'urn:lsid:ipni.org:names:250779-2' },
    },
    { score: 0.04, species: { scientificNameWithoutAuthor: '' } },
  ],
});

const ok = (value: ReturnType<typeof parsePlantIdResponse>): NormalizedIdentification => {
  expect(isIdentificationFailure(value), 'expected a normalized result').toBe(false);
  return value as NormalizedIdentification;
};

describe('plant.id v3 normalization', () => {
  it('reads only the verified surface and normalizes it', () => {
    const result = ok(parsePlantIdResponse(plantIdMock()));
    expect(result.provider).toBe('plantid');
    expect(result.isPlant).toBe(true);
    expect(result.candidates).toHaveLength(2);
    const [top] = result.candidates;
    expect(top!.scientificName).toBe('Taraxacum officinale');
    expect(top!.probability).toBeCloseTo(0.82);
    expect(top!.commonNames).toEqual(['Common dandelion', 'Blowball']);
    expect(top!.genus).toBe('Taraxacum');
    expect(top!.family).toBe('Asteraceae');
    expect(top!.rank).toBe('species');
  });

  it('preserves taxonomy whole rather than destructuring an unverified shape', () => {
    const result = ok(parsePlantIdResponse(plantIdMock()));
    // `class` is not a field this app reads; it must still survive untouched.
    expect(result.candidates[0]!.taxonomy).toMatchObject({ class: 'Magnoliopsida' });
  });

  it('returns null identifiers, because the documented details carry none', () => {
    const result = ok(parsePlantIdResponse(plantIdMock()));
    expect(result.candidates[0]!.gbifId).toBeNull();
    expect(result.candidates[0]!.powoId).toBeNull();
  });

  it('records a supra-specific answer at its real rank', () => {
    const body = plantIdMock({
      classification: {
        suggestions: [{ name: 'Taraxacum sect. Ruderalia', probability: 0.9, details: {} }],
      },
    });
    const result = ok(parsePlantIdResponse(body));
    expect(result.candidates[0]!.rank).toBe('section');
    expect(result.candidates[0]!.scientificName).toBe('Taraxacum sect. Ruderalia');
  });

  it('reports is_plant false without inventing a "yes" when the field is missing', () => {
    expect(ok(parsePlantIdResponse(plantIdMock({ is_plant: { binary: false } }))).isPlant)
      .toBe(false);
    /*
     * Absent is `null`, NOT true. A consumer that treated a missing gate as permission would
     * be the whole point of the gate, undone.
     */
    expect(ok(parsePlantIdResponse(plantIdMock({ is_plant: undefined }))).isPlant).toBeNull();
  });

  it('FAILS CLOSED on anything outside the verified shape', () => {
    const cases: [string, unknown][] = [
      ['not an object', 'nope'],
      ['no result', {}],
      ['no classification', { result: {} }],
      ['suggestions not an array', { result: { classification: { suggestions: {} } } }],
      [
        'suggestion with no name',
        { result: { classification: { suggestions: [{ probability: 0.5 }] } } },
      ],
      [
        'suggestion with a non-numeric probability',
        { result: { classification: { suggestions: [{ name: 'X y', probability: 'high' }] } } },
      ],
    ];
    for (const [label, body] of cases) {
      const result = parsePlantIdResponse(body);
      expect(isIdentificationFailure(result), label).toBe(true);
      if (isIdentificationFailure(result)) expect(result.kind, label).toBe('schema');
    }
  });

  it('treats an empty suggestion list as a real answer, not a failure', () => {
    // "I looked and found nothing" is information; a schema error is not.
    const result = ok(parsePlantIdResponse(plantIdMock({ classification: { suggestions: [] } })));
    expect(result.candidates).toEqual([]);
  });

  it('clamps a probability outside 0–1 rather than trusting it', () => {
    const body = plantIdMock({
      classification: { suggestions: [{ name: 'Urtica dioica', probability: 4.2, details: {} }] },
    });
    expect(ok(parsePlantIdResponse(body)).candidates[0]!.probability).toBe(1);
  });
});

describe('PlantNet normalization', () => {
  it('produces the same shape from a different provider', () => {
    const result = ok(parsePlantNetResponse(plantNetMock()));
    expect(result.provider).toBe('plantnet');
    const [top] = result.candidates;
    expect(top!.scientificName).toBe('Taraxacum officinale');
    expect(top!.probability).toBeCloseTo(0.74);
    expect(top!.gbifId).toBe('3129096');
    expect(top!.powoId).toBe('urn:lsid:ipni.org:names:250779-2');
    expect(top!.family).toBe('Asteraceae');
  });

  it('reports isPlant as null, which is not the same as true', () => {
    /*
     * PlantNet has no `is_plant`. Null says so. Were this `true`, switching providers would
     * silently remove a gate plant.id provides — a safety regression disguised as a default.
     */
    expect(ok(parsePlantNetResponse(plantNetMock())).isPlant).toBeNull();
  });

  it('skips a nameless result instead of refusing the whole batch', () => {
    // Verified shape, known-ordinary occurrence — unlike plant.id, where an unexpected field
    // is evidence the schema is not what we think.
    expect(ok(parsePlantNetResponse(plantNetMock())).candidates).toHaveLength(1);
  });

  it('fails closed when the envelope is wrong', () => {
    for (const body of [null, 'x', {}, { results: 'nope' }]) {
      expect(isIdentificationFailure(parsePlantNetResponse(body))).toBe(true);
    }
  });
});

describe('confidence is per provider, and rank outranks the number', () => {
  it('keeps PlantNet on its live-tuned thresholds', () => {
    expect(thresholdsFor('plantnet')).toEqual({ high: 0.7, moderate: 0.35 });
  });

  it('gives plant.id its own constants, so tuning one cannot move the other', () => {
    const before = thresholdsFor('plantid');
    expect(before).not.toBe(thresholdsFor('plantnet'));
  });

  it('bands a species by probability', () => {
    expect(speciesConfidenceForProvider('plantid', 'species', 0.9)).toBe('high');
    expect(speciesConfidenceForProvider('plantid', 'species', 0.5)).toBe('moderate');
    expect(speciesConfidenceForProvider('plantid', 'species', 0.1)).toBe('low');
  });

  it('returns unresolved above species rank at ANY probability, for either provider', () => {
    for (const provider of ['plantnet', 'plantid'] as const) {
      for (const score of [0, 0.5, 0.99, 1]) {
        expect(speciesConfidenceForProvider(provider, 'section', score), `${provider} ${score}`)
          .toBe('unresolved');
      }
    }
  });
});
