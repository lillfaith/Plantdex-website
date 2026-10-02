/**
 * Where a plant STANDS in a place — native, introduced, or invasive.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THERE IS NO `invasive: boolean` HERE, AND THERE MUST NEVER BE ONE.
 *
 * "Invasive" is not a property of a species. It is a relationship between a species and a
 * place, asserted by somebody, on a date. *Solidago canadensis* is native across the eastern
 * United States and a serious invader in Europe and China; *Lonicera japonica* is the reverse.
 * A boolean forces one of those two truths to be written down as the other, and whichever way
 * it is set the card is wrong for half the people reading it.
 *
 * So every claim carries its region, its status, its source and the date it was checked, and
 * `invasive-status.test.ts` fails if a bare boolean or a region-free field appears.
 *
 * THE THREE STATUSES ARE SEPARATE AND ONE DOES NOT IMPLY THE NEXT. Most of this deck is
 * edible weeds, and most of those arrived with Europeans: dandelion, plantain, chickweed,
 * lamb's quarters, red clover, purslane, shepherd's purse. Every one is introduced. Not one is
 * on Georgia's invasive list, and labelling them invasive because they are not native would
 * put a scary badge on nine tenths of the deck while saying nothing true. Georgia's own list
 * also deliberately excludes plants that are only a problem in farmland and pasture, which is
 * most of a forager's deck — so "not listed" is a meaningful answer here, not a gap.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A BADGE NEEDS MORE THAN A STATUS. `badgeFor` requires all four of: status `invasive`, a
 * region, a source, and `appliesToCard`. That last one is what keeps a genus card honest:
 * *Rosa multiflora* is invasive in Georgia and the Wild Rose card is `Rosa spp.`, which also
 * covers roses native to Georgia. Badging the card would tell somebody holding a native
 * swamp rose that their plant is an invader. The claim is recorded, with the reason it does
 * not reach the badge, so the next person to read this file finds the decision rather than an
 * absence.
 *
 * NOTHING HERE TOUCHES IDENTIFICATION. No scope, no matcher, no eligibility, no unlock. A
 * card's taxonomy is settled elsewhere and this file only reads ids.
 */

/** What a species is doing in a place. Three separate facts, never collapsed. */
export type RangeStatus = 'native' | 'introduced' | 'invasive';

/**
 * How well a claim is evidenced.
 *
 * `primary-source` means the listing document itself was read. `search-attested` means a
 * search engine's summary of it was, with the document's URL recorded but not fetched — which
 * is the honest grade for anything established from a sandbox that cannot reach
 * gainvasivespeciescouncil.org, se-eppc.org, invasive.org or bugwoodcloud.org. It is recorded
 * per claim rather than assumed for the file, so upgrading one entry does not quietly upgrade
 * the rest. `scripts/ga_invasive_audit.py` is what turns the former into the latter.
 */
export type Verification = 'primary-source' | 'search-attested';

export interface StatusSource {
  /** The listing authority, named as it names itself. */
  name: string;
  url: string;
  /** ISO date this entry was last checked against that source. */
  checkedOn: string;
}

export interface RegionalStatus {
  /** Stable key for the region. Never absent, never a default. */
  regionId: string;
  /** How the region is named to a reader. Appears verbatim in the badge. */
  region: string;
  status: RangeStatus;
  /**
   * The taxon the claim is about, which is NOT always the card. A genus card's claim names the
   * species that was actually listed.
   */
  taxon: string;
  /** The authority's own category wording, verbatim and optional — never a number we invented. */
  category?: string;
  source: StatusSource;
  verification: Verification;
  note?: string;
  /**
   * Whether the claim is true of the whole card. False when the card's scope is wider than the
   * listed taxon, in which case `whyNotTheCard` must say so and no badge renders.
   */
  appliesToCard: boolean;
  whyNotTheCard?: string;
}

const GA = {
  regionId: 'us-ga',
  region: 'Georgia',
} as const;

/**
 * GA-EPPC, now continuing as the Georgia Invasive Species Council. Its categories are what the
 * threshold below is built on, quoted so a reader can see why Category 3 does not qualify:
 *
 *   Category 1  a serious problem in Georgia natural areas, extensively invading native plant
 *               communities and displacing native species
 *   Category 2  a moderate problem, invading and displacing, to a lesser degree than 1
 *   Category 3  a MINOR problem in Georgia natural areas, OR NOT YET KNOWN TO BE A PROBLEM IN
 *               GEORGIA but known to be a problem in adjacent states
 *   Category 4  naturalized but generally not a problem in Georgia natural areas
 *
 * Only 1 and 2 assert that the plant is actually invading Georgia. Category 3 explicitly
 * covers plants that are not known to be a problem here, and Category 4 says they are not —
 * so neither can carry a badge reading "invasive in Georgia" without the badge saying
 * something the source does not.
 */
const GA_EPPC: StatusSource = {
  // SHORT ENOUGH TO BE ATTRIBUTION. The full title ran to two wrapped lines in the badge and
  // became the loudest thing in it, which puts the citation above the claim it supports.
  name: 'Georgia Invasive Species Council (GA-EPPC list)',
  url: 'https://gainvasivespeciescouncil.org/list/',
  checkedOn: '2026-10-02',
};

/**
 * Claims by card id. A card absent from this table has no verified status and gets no badge —
 * which is the correct rendering of "we did not find evidence", and is most of the deck.
 */
export const REGIONAL_STATUS: Record<string, readonly RegionalStatus[]> = {
  // ── THE ONE BADGE IN THE DECK TODAY ──
  // The card's taxon IS the listed taxon, the region is defined, and the listing is the
  // strongest category Georgia publishes. Nothing else in the catalogue meets all three.
  'lonicera-japonica': [
    {
      ...GA,
      status: 'invasive',
      taxon: 'Lonicera japonica',
      category: 'Category 1 — a serious exotic plant problem in Georgia natural areas',
      source: GA_EPPC,
      verification: 'search-attested',
      note: 'Climbs and smothers saplings and shrubs, and spreads from both runners and bird-carried fruit.',
      appliesToCard: true,
    },
  ],

  // ── RECORDED, AND DELIBERATELY NOT BADGED ──
  // Each of these is here so the reason is findable. An empty entry would read as "nobody
  // looked".
  'rosa-spp': [
    {
      ...GA,
      status: 'invasive',
      taxon: 'Rosa multiflora',
      // No category number: published copies of the list disagree between 1 and 2, and a
      // number this file cannot verify is not one it should print.
      source: GA_EPPC,
      verification: 'search-attested',
      note: 'Forms impenetrable thickets in fields and forest edges.',
      appliesToCard: false,
      whyNotTheCard:
        'The Wild Rose card is Rosa spp. and covers roses native to Georgia as well. Badging the card would tell somebody holding a native rose that their plant is an invader.',
    },
  ],
  'morus-spp': [
    {
      ...GA,
      status: 'introduced',
      taxon: 'Morus alba',
      category: 'Category 3 — a minor problem, or not yet known to be a problem in Georgia',
      source: GA_EPPC,
      verification: 'search-attested',
      note: 'Hybridises with the native red mulberry, which is the concern more than spread.',
      appliesToCard: false,
      whyNotTheCard:
        'Category 3 does not assert that the plant is invading Georgia, and the Mulberry card covers the native Morus rubra as well.',
    },
  ],
  'alliaria-petiolata': [
    {
      ...GA,
      status: 'introduced',
      taxon: 'Alliaria petiolata',
      category: 'Category 3 — a minor problem, or not yet known to be a problem in Georgia',
      source: GA_EPPC,
      verification: 'search-attested',
      note: 'A serious invader further north. Georgia lists it at the category meaning "not yet known to be a problem here".',
      appliesToCard: true,
      // `appliesToCard` is true and there is STILL no badge, because the status is not
      // `invasive`. The two conditions are independent on purpose.
    },
  ],
  'allium-vineale': [
    {
      ...GA,
      status: 'introduced',
      taxon: 'Allium vineale',
      category: 'Category 3 — a minor problem, or not yet known to be a problem in Georgia',
      source: GA_EPPC,
      verification: 'search-attested',
      appliesToCard: true,
    },
  ],
};

/** Every claim on record for a card, in any region. */
export function statusesFor(herbId: string): readonly RegionalStatus[] {
  return REGIONAL_STATUS[herbId] ?? [];
}

/**
 * The claim a badge should render, or null.
 *
 * FOUR CONDITIONS, ALL REQUIRED. Status is `invasive`; a region is named; a source is
 * attached; and the claim is true of the card rather than of one species inside it. Any one
 * missing and the answer is null — there is no partial badge, because a badge that renders
 * from an incomplete claim is a claim nobody made.
 */
export function badgeFor(herbId: string, regionId?: string): RegionalStatus | null {
  const claims = statusesFor(herbId).filter(
    (claim) =>
      claim.status === 'invasive' &&
      claim.appliesToCard &&
      Boolean(claim.region) &&
      Boolean(claim.regionId) &&
      Boolean(claim.source?.url),
  );
  const scoped = regionId ? claims.filter((claim) => claim.regionId === regionId) : claims;
  return scoped[0] ?? null;
}

/**
 * What the badge says in words.
 *
 * Built here rather than in the component so the sentence is testable and cannot drift between
 * two renderers. It says "is considered invasive" rather than "is invasive": the badge is
 * reporting a listing by a named authority, not making its own determination, and the region
 * is in the sentence as well as in the chip because the chip is the part people skim.
 *
 * The second half is the part a forager can act on. Legality varies by land and is not ours to
 * state, so it says "where legal" and leaves the reader to check — the same reason /safety
 * says foraging rules vary by country, state and site rather than summarising them.
 */
export function badgeExplanation(claim: RegionalStatus): string {
  return (
    `This species is considered invasive in ${claim.region}. ` +
    'Harvest responsibly where legal, and avoid spreading seeds, roots, fruit, or other ' +
    'reproductive material.'
  );
}
