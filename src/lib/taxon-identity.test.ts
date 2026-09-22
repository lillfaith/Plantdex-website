import { describe, expect, it } from 'vitest';

import { TAXON_RANKS } from './card-coverage';
import { parseScientificName } from './taxon-name';
import { displayName, normalizeName, speciesConfidenceFor, taxonRank } from './plant-match';

/**
 * `taxon-name.ts` — reading a provider's name as a taxon rather than reducing it to a key.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE TWO BUGS THIS FILE EXISTS FOR, BOTH OF WHICH SHIPPED.
 *
 * `displayName` was rebuilt FROM the normalised key. The key exists to find cards, so it drops
 * the hybrid sign and every infraspecific rank — and rebuilding from it wrote
 * `Mentha piperita` and `Quercus leana` into the record. Neither is a name. Dropping a hybrid
 * sign does not generalise a name, it INVENTS A SPECIES, in an app whose subject is telling
 * plants apart.
 *
 * `taxonRank` read the key too, so `Plantago major subsp. intermedia` reported rank `species`
 * — a subspecies silently promoted, the same shape of bug as a section becoming
 * `Taraxacum officinale`, and with the same consequence: a confident species-level confidence
 * for a name that never claimed one.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const X = '×';

describe('infraspecific ranks survive', () => {
  const cases = [
    ['Plantago major subsp. intermedia', 'Plantago major subsp. intermedia', 'subspecies'],
    ['Plantago major ssp. intermedia', 'Plantago major ssp. intermedia', 'subspecies'],
    ['Achillea millefolium var. occidentalis', 'Achillea millefolium var. occidentalis', 'variety'],
    ['Quercus robur f. fastigiata', 'Quercus robur f. fastigiata', 'form'],
    // Spelled out, so it prints spelled out: `forma.` is not a thing anybody writes.
    ['Quercus robur forma fastigiata', 'Quercus robur forma fastigiata', 'form'],
    ['Sambucus nigra subsp. canadensis (L.) R.Bolli', 'Sambucus nigra subsp. canadensis', 'subspecies'],
  ] as const;

  it.each(cases)('%s keeps its epithet and its rank', (raw, display, rank) => {
    const parsed = parseScientificName(raw);
    expect(parsed.display).toBe(display);
    expect(parsed.rank).toBe(rank);
    // The bug, stated directly: it must not come back as the bare binomial at species rank.
    expect(parsed.display).not.toBe(raw.split(' ').slice(0, 2).join(' '));
    expect(taxonRank(raw)).toBe(rank);
  });

  it('still resolves the species, because a subspecies of X is X', () => {
    // The mirror of the promotion bug: refusing these as `unresolved` would throw away a MORE
    // precise identification for being unusual.
    for (const rank of ['species', 'subspecies', 'variety', 'form'] as const) {
      expect(speciesConfidenceFor(rank, 0.9), rank).toBe('high');
      expect(speciesConfidenceFor(rank, 0.1), rank).toBe('low');
    }
  });

  it('keeps the key separate, and the key is still the binomial', () => {
    // The card is found through the binomial — a subspecies of Plantago major belongs on the
    // Plantago major card — so the LOOKUP must still collapse while the identity does not.
    expect(normalizeName('Plantago major subsp. intermedia')).toBe('plantago major');
    expect(displayName('Plantago major subsp. intermedia')).toBe(
      'Plantago major subsp. intermedia',
    );
  });

  it('reads a trailing `f.` as the author, not as forma', () => {
    // `f.` is *forma* after an epithet and *filius* after a name. Only a lowercase epithet
    // following it makes it a rank.
    expect(parseScientificName('Quercus robur f. Smith').rank).toBe('species');
    expect(parseScientificName('Quercus robur f. Smith').display).toBe('Quercus robur');
  });
});

describe('hybrid notation survives, in both spellings', () => {
  const cases = [
    [`Mentha ${X} piperita`, `Mentha ${X} piperita`],
    ['Mentha x piperita', `Mentha ${X} piperita`],
    [`Mentha ${X}piperita`, `Mentha ${X} piperita`],
    ['Quercus x leana', `Quercus ${X} leana`],
    [`Quercus ${X} leana`, `Quercus ${X} leana`],
  ] as const;

  it.each(cases)('%s keeps its hybrid sign', (raw, display) => {
    const parsed = parseScientificName(raw);
    expect(parsed.display).toBe(display);
    expect(parsed.hybrid).toBe(true);
    expect(parsed.rank).toBe('species');
    // The exact strings the old code produced. Neither is a taxon.
    expect(parsed.display).not.toBe('Mentha piperita');
    expect(parsed.display).not.toBe('Quercus leana');
    // The provider's own bytes are untouched whichever spelling arrived.
    expect(parsed.providerName).toBe(raw);
  });

  it('reads a nothogenus sign, before the genus', () => {
    for (const raw of [`${X} Triticosecale rimpaui`, `${X}Triticosecale rimpaui`]) {
      const parsed = parseScientificName(raw);
      expect(parsed.display, raw).toBe(`${X} Triticosecale rimpaui`);
      expect(parsed.hybrid, raw).toBe(true);
    }
  });

  it('does not invent a hybrid out of an epithet that starts with x', () => {
    /*
     * ASCII `x` counts only as a WHOLE WORD. `Quercus xalapensis` is a real species, and
     * guessing that a glued `x` is a sign would invent a hybrid — the same failure as dropping
     * one, pointing the other way.
     */
    const parsed = parseScientificName('Quercus xalapensis');
    expect(parsed.hybrid).toBe(false);
    expect(parsed.display).toBe('Quercus xalapensis');
  });

  it('carries the sign where the matching key cannot', () => {
    // The key has no room for it, which is exactly why `hybrid` is a field and not something
    // a reader is left inferring from punctuation.
    expect(normalizeName(`Mentha ${X} piperita`)).toBe('mentha piperita');
    expect(parseScientificName(`Mentha ${X} piperita`).hybrid).toBe(true);
  });
});

describe('an unhandled qualifier fails conservatively', () => {
  const unhandled = [
    'Rubus fruticosus agg.',
    'Brassica oleracea convar. capitata',
    'Rosa nothosubsp. something',
    'Taraxacum sect.',
  ];

  it.each(unhandled)('%s is `unknown`, never `species`', (raw) => {
    const parsed = parseScientificName(raw);
    expect(parsed.rank).toBe('unknown');
    // A promotion here would report a confident species-level identification for a name that
    // never claimed one.
    expect(speciesConfidenceFor(parsed.rank, 0.99)).toBe('unresolved');
  });

  it('keeps the qualifier visible rather than trimming it off', () => {
    // `Brassica oleracea convar.` would say LESS than the string it came from.
    expect(parseScientificName('Brassica oleracea convar. capitata').display).toBe(
      'Brassica oleracea convar. capitata',
    );
    expect(parseScientificName('Rubus fruticosus agg.').display).toBe('Rubus fruticosus agg.');
  });
});

describe('the ranks above the species', () => {
  it('reads each infrageneric marker', () => {
    expect(parseScientificName('Taraxacum sect. Ruderalia').rank).toBe('section');
    expect(parseScientificName('Carex subg. Vignea').rank).toBe('subgenus');
    expect(parseScientificName('Carex ser. Elongatae').rank).toBe('series');
    expect(parseScientificName('Carex subsect. Something').rank).toBe('subsection');
  });

  it('treats `sp.` and `spp.` as the genus, because that is what they mean', () => {
    // "This genus, species unspecified" IS the genus — and is exactly what a `Quercus spp.`
    // card is, which is why these must not become `unknown`.
    expect(parseScientificName('Trifolium sp.').rank).toBe('genus');
    expect(parseScientificName('Quercus spp.').rank).toBe('genus');
    expect(parseScientificName('Solidago').rank).toBe('genus');
  });

  it('resolves no species at any score', () => {
    for (const rank of ['genus', 'subgenus', 'section', 'subsection', 'series', 'unknown'] as const) {
      expect(speciesConfidenceFor(rank, 0.99), rank).toBe('unresolved');
    }
  });
});

describe('every rank the parser can produce is a declared rank', () => {
  it('never returns something outside TAXON_RANKS', () => {
    // The migration's CHECK constraint is built from this same list, and a rank outside it
    // would be REFUSED by Postgres — losing the whole sighting, not just its rank.
    const probes = [
      'Taraxacum officinale',
      'Plantago major subsp. intermedia',
      'Achillea millefolium var. occidentalis',
      'Quercus robur f. fastigiata',
      `Mentha ${X} piperita`,
      'Taraxacum sect. Ruderalia',
      'Carex subg. Vignea',
      'Carex ser. Elongatae',
      'Solidago',
      'Rubus fruticosus agg.',
      '',
      '   ',
      'x',
      `${X}`,
    ];
    for (const raw of probes) {
      expect(TAXON_RANKS as readonly string[], raw).toContain(parseScientificName(raw).rank);
    }
  });
});
