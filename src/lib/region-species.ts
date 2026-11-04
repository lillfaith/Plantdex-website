import type { RegionalSpecies } from './quest-board';

/**
 * Which deck species occur in each launched region, and which are featured on its board.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * REVIEWED DATA, NOT A QUERY RESULT.
 *
 * The occurrence classes come from `scripts/ga_occurrence.py`, which asked GBIF for
 * preserved-specimen and human-observation counts inside Georgia's GADM boundary and
 * applied one stated rule (>=5 specimens or >=100 observations => `confirmed`). The full
 * table, the rule and its caveats are in `docs/georgia-occurrence.md`.
 *
 * The survey proposes; a human decides. That is why this is a checked-in file rather than
 * something computed at runtime: the classification is a determination somebody made, and
 * it should change only when somebody changes it.
 *
 * THERE ARE NO `seasons` HERE, AND THAT IS DELIBERATE. The survey's month histogram
 * measures WHEN RECORDS WERE MADE, not when a plant is findable — 22 of the 24 best
 * candidates read "spring" because spring is when people in Georgia go out and record.
 * Driving availability from it would dress recording effort up as phenology. The
 * collection is year-round until somebody adds real phenology, and `inSeason` treats a
 * missing season list as year-round for exactly this reason.
 *
 * NOTHING HERE IS A MEDICINAL CLAIM, AND OCCURRENCE IS NOT ELIGIBILITY. Every species
 * below is an existing, published card from the printed deck. This file says where the
 * plant grows; it says nothing about what it does, and it does not re-try cards that are
 * already in people's hands.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface RegionEntry extends RegionalSpecies {
  /**
   * On the curated launch board. Featuring is an editorial choice about a good first
   * experience — habitat spread, a rarity pyramid, cards whose documentation is in good
   * order — and NEVER a statement that the others are unsuitable. Every findable species
   * is in the regional collection whether or not it is featured.
   */
  featured?: boolean;
}

/** Georgia, surveyed 2026-11-04. 31 confirmed, 4 likely, 1 insufficient. */
export const GEORGIA: readonly RegionEntry[] = [

  { herbId: 'taraxacum-officinale', occurrence: 'confirmed', featured: true },
  { herbId: 'rumex-obtusifolius', occurrence: 'confirmed' },
  { herbId: 'solidago-canadensis', occurrence: 'confirmed' },
  { herbId: 'ambrosia-artemisiifolia', occurrence: 'confirmed' },
  { herbId: 'chenopodium-album', occurrence: 'confirmed', featured: true },
  { herbId: 'portulaca-oleracea', occurrence: 'confirmed', featured: true },
    // At the edge of its range here; recorded, but not reliably met.
  { herbId: 'alliaria-petiolata', occurrence: 'likely' },
    // At the edge of its range here; recorded, but not reliably met.
  { herbId: 'urtica-dioica', occurrence: 'likely' },
  { herbId: 'oxalis-stricta', occurrence: 'confirmed' },
  { herbId: 'trifolium-pratense', occurrence: 'confirmed', featured: true },
  { herbId: 'lamium-purpureum', occurrence: 'confirmed', featured: true },
  { herbId: 'viola-sororia', occurrence: 'confirmed', featured: true },
  { herbId: 'stellaria-media', occurrence: 'confirmed', featured: true },
  { herbId: 'plantago-major', occurrence: 'confirmed', featured: true },
  { herbId: 'galium-aparine', occurrence: 'confirmed', featured: true },
  { herbId: 'glechoma-hederacea', occurrence: 'confirmed' },
  { herbId: 'rumex-acetosella', occurrence: 'confirmed' },
  { herbId: 'cichorium-intybus', occurrence: 'confirmed' },
    // At the edge of its range here; recorded, but not reliably met.
  { herbId: 'arctium-lappa', occurrence: 'likely' },
    // ZERO records in Georgia. The card names a largely northern species;
    // this is the one deck plant a Georgia collection must not offer.
  { herbId: 'mentha-canadensis', occurrence: 'insufficient' },
    // At the edge of its range here; recorded, but not reliably met.
  { herbId: 'nepeta-cataria', occurrence: 'likely' },
  { herbId: 'capsella-bursa-pastoris', occurrence: 'confirmed' },
  { herbId: 'prunella-vulgaris', occurrence: 'confirmed', featured: true },
  { herbId: 'verbascum-thapsus', occurrence: 'confirmed', featured: true },
  { herbId: 'equisetum-arvense', occurrence: 'confirmed' },
  { herbId: 'allium-vineale', occurrence: 'confirmed' },
  { herbId: 'fragaria-virginiana', occurrence: 'confirmed' },
  { herbId: 'hypericum-perforatum', occurrence: 'confirmed' },
  { herbId: 'achillea-millefolium', occurrence: 'confirmed', featured: true },
  { herbId: 'impatiens-capensis', occurrence: 'confirmed' },
  { herbId: 'melissa-officinalis', occurrence: 'confirmed' },
  { herbId: 'monarda-fistulosa', occurrence: 'confirmed' },
  { herbId: 'geranium-maculatum', occurrence: 'confirmed' },
  { herbId: 'lonicera-japonica', occurrence: 'confirmed' },
  { herbId: 'passiflora-incarnata', occurrence: 'confirmed', featured: true },
  { herbId: 'lactuca-serriola', occurrence: 'confirmed' },
];

export const REGION_SPECIES: Readonly<Record<string, readonly RegionEntry[]>> = {
  'us-ga': GEORGIA,
};

export function speciesForRegion(regionId: string | null | undefined): readonly RegionEntry[] {
  if (!regionId) return [];
  return REGION_SPECIES[regionId] ?? [];
}

/** The curated board set for a region. A subset of what is discoverable, never all of it. */
export function featuredForRegion(regionId: string | null | undefined): readonly RegionEntry[] {
  return speciesForRegion(regionId).filter((entry) => entry.featured);
}
