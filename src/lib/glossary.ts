import glossaryJson from '@/data/glossary.json';

/**
 * Herbal terminology index.
 *
 * These define what words mean — "an astringent substance makes tissue contract" — and
 * never what a plant does. Where a term is itself a traditional-use category (diuretic,
 * expectorant), the definition says so explicitly rather than implying an effect.
 */

export interface GlossaryTerm {
  id: string;
  term: string;
  short: string;
  long: string;
  related: string[];
  /** True when this word actually appears on a Plantdex card. */
  appearsOnCards: boolean;
}

interface GlossaryFile {
  terms: GlossaryTerm[];
}

export const GLOSSARY: GlossaryTerm[] = (glossaryJson as unknown as GlossaryFile).terms;

const BY_ID = new Map(GLOSSARY.map((t) => [t.id, t]));
const BY_TERM = new Map(GLOSSARY.map((t) => [t.term.toLowerCase(), t]));

export function getTerm(id: string): GlossaryTerm | undefined {
  return BY_ID.get(id);
}

/** Look a word up by how it is written on a card, e.g. "Decoction". */
export function findTerm(word: string): GlossaryTerm | undefined {
  return BY_TERM.get(word.trim().toLowerCase());
}

export function searchGlossary(query: string): GlossaryTerm[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return GLOSSARY;
  return GLOSSARY.filter(
    (t) =>
      t.term.toLowerCase().includes(needle) ||
      t.short.toLowerCase().includes(needle) ||
      t.long.toLowerCase().includes(needle),
  );
}

export function alphabetical(terms: GlossaryTerm[] = GLOSSARY): GlossaryTerm[] {
  return [...terms].sort((a, b) => a.term.localeCompare(b.term));
}
