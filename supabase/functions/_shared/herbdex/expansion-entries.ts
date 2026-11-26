import type { Herb } from './types.ts';

/**
 * EXPANSION ENTRIES: the cards of the Herbdex Expansion that the catalogue serves. EMPTY, always, in
 * the committed tree and in every production build.
 *
 * This file is the single seam the protected pilot preview plugs into. `catalogue.ts` spreads it into
 * `DIGITAL_ONLY_ENTRIES` and `collection.ts` registers the Expansion collection only when it is
 * non-empty. A preview build is made from a STAGED COPY of the repository in which this one file is
 * replaced by `expansion-entries.preview.ts` (`scripts/build-pilot-preview.mjs`); nothing in the real
 * checkout is switched, so there is no flag a deploy could set by accident and nothing for the bundler
 * to leave behind. `expansion-pilot-preview.test.ts` pins that this stays `[]`.
 *
 * It travels to the edge functions with `catalogue.ts`, deliberately as an empty list: the server does
 * not learn about preview cards (no discovery enforcement, no scan RPC, no migration).
 */
export const EXPANSION_ENTRIES: readonly Herb[] = [];

/**
 * The collection the entries declare, or null. Lives here (not in collection.ts) so that its NAME is
 * absent from a default build: the first version defined it in collection.ts and "Herbdex Expansion"
 * shipped in the production bundle, which `expansion-pilot-preview.test.ts` caught.
 */
export const EXPANSION_COLLECTION: {
  id: string; name: string; shortName: string; size: number; current: boolean; medium: 'digital';
} | null = null;
