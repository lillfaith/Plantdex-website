/**
 * WHICH SOURCE SUPPORTS WHICH CLAIM, for the Boss Form review packet.
 *
 * NOT SHIPPED TO THE SERVER. The server scores indices and never needs a bibliography, so this
 * stays out of the edge-shared set.
 *
 * `basis` is the honest part. `read` means a person opened the page and found the claim in it.
 * Nothing here is `read`: the drafting environment cannot reach these hosts, so every
 * cat's-ear mapping rests on a search summary at best, and `unsourced` marks a claim for which
 * no source has been seen at all. A reviewer upgrades a row after opening the page; no
 * code path trusts these rows, and none of the sources is `verified: true` in the registry.
 */
export type ClaimBasis = 'read' | 'search-summary' | 'unsourced' | 'editorial';

export interface ClaimSource {
  readonly id: string;
  /** The claim, in the words the questions use. */
  readonly claim: string;
  readonly sourceIds: readonly string[];
  readonly basis: ClaimBasis;
  /** What the drafter actually saw, or why there is nothing. */
  readonly note: string;
  /** Question ids this claim is used by. */
  readonly usedBy: readonly string[];
}

export const CATS_EAR_CLAIMS: readonly ClaimSource[] = [
  {
    id: 'name',
    claim: 'Hypochaeris radicata L. is an accepted species in the daisy family (Asteraceae).',
    sourceIds: ['wfo-hypochaeris-radicata'],
    basis: 'search-summary',
    note: 'A search summary of the World Flora Online page says accepted species, Asteraceae. Page not opened.',
    usedBy: [],
  },
  {
    id: 'branched',
    claim: 'Cat’s-ear flowering stems are usually branched.',
    sourceIds: ['wsu-hosted-usfs-treatment-guide'],
    basis: 'search-summary',
    note: 'Seen only in a search summary of a US Forest Service guide hosted by WSU ("branched flowering stems", compared with dandelion). The WSU HortSense page was not seen to say this. Neither page opened.',
    usedBy: ['cp.single', 'cp.branch', 'cp.forks', 'tr.single', 'tr.branch'],
  },
  {
    id: 'leafless-bracts',
    claim: 'Cat’s-ear stems are largely leafless, with small bracts.',
    sourceIds: ['wfo-hypochaeris-radicata'],
    basis: 'unsourced',
    note: 'The World Flora Online summary calls it a "scapose" herb, which points at a leafless flowering stem, but no page seen mentions small bracts. This wording comes from the preliminary reviewer, not from a source the drafter read.',
    usedBy: ['curated note (lookalikes)'],
  },
  {
    id: 'leaves-habitat',
    claim: 'Cat’s-ear has a rosette of hairy, lobed leaves and grows in disturbed ground such as lawns.',
    sourceIds: ['wsu-hortsense-catsear'],
    basis: 'search-summary',
    note: 'A search summary of the WSU HortSense page. Not used by any question yet.',
    usedBy: [],
  },
  {
    id: 'bracts-vs-dandelion',
    claim: 'Cat’s-ear flower-head bracts do not bend backward the way dandelion’s do.',
    sourceIds: ['wsu-hosted-usfs-treatment-guide'],
    basis: 'search-summary',
    note: 'Search summary only. A possible extra clue for a later question. Not used.',
    usedBy: [],
  },
  {
    id: 'clue-not-proof',
    claim: 'Branching is a useful clue, not definitive proof of species identity.',
    sourceIds: [],
    basis: 'editorial',
    note: 'Plantdex’s own caution, requested by the preliminary reviewer. It is a limit on what the question claims, so it needs no citation.',
    usedBy: ['cp.single', 'cp.branch', 'cp.forks', 'tr.single', 'tr.branch', 'curated note (lookalikes)'],
  },
];
