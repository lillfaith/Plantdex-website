import type { TaxonRank } from './card-coverage.ts';

/**
 * READING A SCIENTIFIC NAME AS A TAXON, rather than reducing it to a lookup key.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS A SECOND PASS OVER THE SAME STRING, AND NOT `normalizeName`.
 *
 * `normalizeName` answers "which card does this name reach", and to do that it has to
 * DISCARD things: authorship, infraspecific rank, the hybrid sign. `Plantago major subsp.
 * intermedia` must reach the Plantago major card, and `Mentha × piperita` must reach the
 * same key as `Mentha x piperita`, so both collapse. That is correct for matching and
 * catastrophic as a record.
 *
 * It WAS the record, and it produced two wrong answers:
 *
 *   `Plantago major subsp. intermedia` was written down as `Plantago major`, rank `species`
 *   — a subspecies observation silently promoted to a species identification, the same shape
 *   of bug as a section becoming `Taraxacum officinale`.
 *
 *   `Quercus x leana` was written down as `Quercus leana` and `Mentha × piperita` as
 *   `Mentha piperita`. NEITHER OF THOSE IS A NAME. Dropping the hybrid sign does not
 *   generalise a name, it invents one: it asserts a species that does not exist, on a page
 *   about telling plants apart.
 *
 * So there are two representations and they answer different questions. This module builds
 * the IDENTITY — what the provider said, tidied but never generalised. `normalizeName` builds
 * the KEY. Nothing derived from the key may be stored as the record.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * FAILING CONSERVATIVELY IS THE WHOLE POINT OF `unknown`. A rank marker this module does not
 * know — `convar.`, `grex`, `nothosubsp.`, `agg.` — used to fall through to `species`, which
 * is a promotion: it would let `speciesConfidenceFor` report a confident species-level
 * identification for a name that never claimed one. An unrecognised qualifier now yields
 * `unknown`, which resolves to `unresolved` confidence, and the qualifier is kept in the
 * display name so a reader can see what it actually said.
 */

/** U+00D7 MULTIPLICATION SIGN and U+2715 MULTIPLICATION X, the two glyphs providers use.
 *  Written as escapes rather than the characters themselves: the no-emoji guard reads this
 *  file and U+2715 is inside the range it sweeps. */
const HYBRID_GLYPHS = /[\u00d7\u2715]/;

/**
 * Markers naming a group INSIDE a genus — above the species, below the genus.
 *
 * `sp.`/`spp.` are deliberately absent: they mean "this genus, species unspecified", which
 * is the genus, and is exactly what a `Quercus spp.` card is.
 */
const INFRAGENERIC_RANK: Record<string, TaxonRank> = {
  sect: 'section',
  subsect: 'subsection',
  subg: 'subgenus',
  subgen: 'subgenus',
  ser: 'series',
};

/**
 * Markers naming a group INSIDE a species.
 *
 * All of these still RESOLVE the species — a subspecies of *Plantago major* is *Plantago
 * major* — which is why `speciesConfidenceFor` treats them as species-level and why they must
 * not be flattened away: the rank is the difference between "we know which subspecies" and
 * "we did not say".
 *
 * `f` is here and is the one that needs care: after an epithet it is *forma*, after a name it
 * is *filius* (the author's son). The parser only reads it as a rank when a LOWERCASE epithet
 * follows, which `Smith f.` never has.
 */
const INFRASPECIFIC_RANK: Record<string, TaxonRank> = {
  subsp: 'subspecies',
  ssp: 'subspecies',
  var: 'variety',
  f: 'form',
  fo: 'form',
  forma: 'form',
};

/** "The genus, species unspecified." Not a narrowing, so it resolves to the genus itself. */
const GENUS_MARKERS = new Set(['sp', 'spp']);

export interface ParsedTaxon {
  /** Exactly what was passed in. The record; never rebuilt, never tidied. */
  readonly providerName: string;
  /** The tidied identity: authorship dropped, everything that narrows the name kept. */
  readonly display: string;
  readonly rank: TaxonRank;
  /** True when the name carries a hybrid sign at genus or species position. */
  readonly hybrid: boolean;
}

const strip = (token: string) => token.replace(/\.$/, '');

/**
 * A rank marker printed the way the provider wrote it.
 *
 * Echoing its punctuation rather than always appending a point, because `forma` is a whole
 * word and `forma.` is not a thing anybody writes. Abbreviations arrive with their point and
 * keep it; spelled-out ranks arrive without one and stay that way.
 */
const marked = (token: string) => (/\.$/.test(token) ? `${strip(token).toLowerCase()}.` : strip(token).toLowerCase());
const isEpithet = (token: string) => /^[a-z][a-z-]+$/.test(token);
const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

/**
 * A standalone hybrid sign. ASCII `x` counts ONLY as a whole word.
 *
 * `Quercus x leana` is a real spelling and has to be read. `Quercus xalapensis` is a real
 * species, so an `x` glued to the front of an epithet cannot be assumed to be a sign — and
 * guessing wrong there would invent a hybrid rather than lose one. The × glyph is
 * unambiguous and is stripped wherever it appears.
 */
const isHybridMark = (token: string) => token === 'x' || /^[\u00d7\u2715]$/.test(token);

/** Whatever is left of a malformed tail, kept verbatim so a reader sees what was said. */
function tail(words: readonly string[], from: number): string {
  return words
    .slice(from)
    .filter((word) => /^[a-z][a-z-]*\.?$/.test(word))
    .join(' ');
}

/**
 * Read a provider's scientific name.
 *
 * Reads the RAW string, token by token, and stops at authorship. Everything it does not
 * understand becomes `unknown` rather than an assumption.
 */
export function parseScientificName(raw: string): ParsedTaxon {
  const words = raw.normalize('NFKD').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const unparsed: ParsedTaxon = { providerName: raw, display: '', rank: 'unknown', hybrid: false };
  if (words.length === 0) return unparsed;

  let index = 0;
  /*
   * TWO POSITIONS, TRACKED SEPARATELY, because they print in different places. A nothogenus
   * carries its sign before the GENUS (`× Triticosecale`); a nothospecies carries it before
   * the EPITHET (`Mentha × piperita`). One boolean could not tell them apart, and the first
   * version re-derived the position by re-testing `words[0]` at the point of printing —
   * which is the same fact computed twice and free to disagree.
   */
  let genusHybrid = false;
  let speciesHybrid = false;

  if (isHybridMark(words[0]!)) {
    genusHybrid = true;
    index += 1;
  }
  let head = words[index];
  // Glued: `×Triticosecale`. The sign is stripped and the word continues to read as a genus.
  if (head && HYBRID_GLYPHS.test(head)) {
    genusHybrid = true;
    head = head.replace(HYBRID_GLYPHS, '');
  }
  if (!head) return unparsed;
  const genus = capitalise(head);
  const genusDisplay = genusHybrid ? `\u00d7 ${genus}` : genus;
  index += 1;

  // ── Infrageneric: `Taraxacum sect. Ruderalia` ────────────────────────────
  const marker = words[index] ? strip(words[index]!).toLowerCase() : '';
  if (marker && INFRAGENERIC_RANK[marker]) {
    const epithet = words[index + 1];
    // A rank marker with nothing after it named no group. It is not the genus either — the
    // name meant to narrow and failed to say how — so it is `unknown`, not `genus`.
    if (!epithet) {
      return {
        providerName: raw,
        display: `${genusDisplay} ${marked(words[index]!)}`,
        rank: 'unknown',
        hybrid: genusHybrid,
      };
    }
    return {
      providerName: raw,
      display: `${genusDisplay} ${marked(words[index]!)} ${capitalise(strip(epithet))}`,
      rank: INFRAGENERIC_RANK[marker]!,
      hybrid: genusHybrid,
    };
  }

  // ── A species hybrid sign sits between genus and epithet ─────────────────
  if (words[index] && isHybridMark(words[index]!)) {
    speciesHybrid = true;
    index += 1;
  }
  let epithetWord = words[index];
  // Glued: `Mentha ×piperita`. `isHybridMark` deliberately matches the sign ALONE, so this
  // token is not mistaken for a standalone mark and skipped — which is exactly what happened
  // and left the whole epithet behind.
  if (epithetWord && HYBRID_GLYPHS.test(epithetWord)) {
    speciesHybrid = true;
    epithetWord = epithetWord.replace(HYBRID_GLYPHS, '');
  }

  if (!epithetWord || !isEpithet(epithetWord)) {
    // `Trifolium sp.` and a bare `Solidago` are both the genus. Anything else after the genus
    // that is not an epithet is authorship, which says nothing about rank.
    const trailing = epithetWord ? strip(epithetWord).toLowerCase() : '';
    if (trailing && !GENUS_MARKERS.has(trailing) && /^[a-z]+$/.test(trailing)) {
      // A lowercase qualifier we do not recognise. Keep it and everything after it visible,
      // and refuse to guess what rank it names.
      const rest = tail(words, index + 1);
      return {
        providerName: raw,
        display: `${genusDisplay} ${marked(epithetWord!)}${rest ? ` ${rest}` : ''}`,
        rank: 'unknown',
        hybrid: genusHybrid || speciesHybrid,
      };
    }
    return {
      providerName: raw,
      display: genusDisplay,
      rank: 'genus',
      hybrid: genusHybrid || speciesHybrid,
    };
  }
  index += 1;

  const epithet = strip(epithetWord).toLowerCase();
  const speciesDisplay = speciesHybrid
    ? `${genusDisplay} \u00d7 ${epithet}`
    : `${genusDisplay} ${epithet}`;

  // ── Below the species ────────────────────────────────────────────────────
  const hybrid = genusHybrid || speciesHybrid;
  const asSpecies: ParsedTaxon = {
    providerName: raw,
    display: speciesDisplay,
    rank: 'species',
    hybrid,
  };

  const next = words[index];
  if (!next) return asSpecies;

  const nextKey = strip(next).toLowerCase();
  // Capitalised or initials — authorship. It qualifies nothing and stops the walk.
  if (!/^[a-z]+$/.test(nextKey) || next[0] !== next[0]!.toLowerCase()) return asSpecies;

  const below = INFRASPECIFIC_RANK[nextKey];
  if (below) {
    let at = index + 1;
    let infraHybrid = false;
    if (words[at] && isHybridMark(words[at]!)) {
      infraHybrid = true;
      at += 1;
    }
    const infra = words[at];
    // `f.` with no lowercase epithet after it is *filius*, not *forma*.
    if (!infra || !isEpithet(strip(infra))) return asSpecies;
    return {
      providerName: raw,
      display: `${speciesDisplay} ${marked(next)} ${infraHybrid ? '\u00d7 ' : ''}${strip(infra).toLowerCase()}`,
      rank: below,
      hybrid: hybrid || infraHybrid,
    };
  }

  /*
   * A lowercase word we do not recognise, sitting where a rank marker sits: `agg.`,
   * `convar.`, `grex`, `nothosubsp.`, or a bare third epithet with no marker at all. Every
   * one of them says the name is NOT a plain species, and none of them says what it is — so
   * the honest rank is `unknown`, and the qualifier AND whatever it introduced are both kept
   * where a reader can see them. Dropping the epithet would leave `Brassica oleracea convar.`
   * — a name that says less than the string it came from.
   */
  const rest = tail(words, index + 1);
  return {
    providerName: raw,
    display: `${speciesDisplay} ${marked(next)}${rest ? ` ${rest}` : ''}`,
    rank: 'unknown',
    hybrid,
  };
}
