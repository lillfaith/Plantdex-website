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

/**
 * What a species is doing in a place. Four separate facts, never collapsed.
 *
 * `watchlist` WAS ADDED BY THE PRIMARY AUDIT, not designed up front. GISC's current list ends
 * with a "Species of Concern" section defined as a species **not yet found in Georgia**, and
 * `Alliaria petiolata` is in it. None of native / introduced / invasive describes that: the
 * plant is not established here at all, and the draft recorded it as `introduced` — which was
 * the right non-badge outcome reached through a wrong fact. Collapsing a watch-for species
 * into "introduced" would assert a presence the authority explicitly denies.
 */
export type RangeStatus = 'native' | 'introduced' | 'invasive' | 'watchlist';

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
 * WHAT THE AUTHORITY'S CURRENT LIST ACTUALLY PUBLISHES, read from the page itself by
 * `scripts/ga_invasive_audit.py` rather than from a summary of it.
 *
 * GISC has adopted the RIPSA protocol — Priority 1 / Priority 2 / Watchlist — and its list
 * index explains those terms. But the PLANT LIST page does not print a priority against each
 * species. It prints tiers as unlabelled blocks, and only the first tier's definition survives
 * in the page text:
 *
 *   "Exotic plants that are a serious problem in Georgia natural areas by extensively
 *    invading native plant communities and displacing native species."
 *
 * followed by a "Species of Concern" section: "A species that is not yet found in [Georgia]".
 *
 * SO THIS FILE RECORDS THE AUTHORITY'S SENTENCE, NOT A NUMBER. Writing "Category 1" or
 * "Priority 1" here would be translating between two vocabularies the authority is itself
 * mid-transition between, and asserting a classification its current page does not print.
 * `category` holds the tier's definition verbatim where it is readable, and is ABSENT where
 * it is not — which is also what withholds a badge, since an unreadable tier is ambiguous
 * evidence by definition.
 *
 * THE OLD CATEGORY NUMBERS ARE DELIBERATELY GONE. The draft carried them from search
 * summaries and two of them were wrong: `Alliaria petiolata` was recorded as Category 3 when
 * GISC in fact lists it as not yet present in the state, and `Lonicera japonica` carried a
 * Category 1 that no primary document confirmed. Neither number is replaced by a better
 * number; both are replaced by what the source says.
 */
const GISC: StatusSource = {
  name: 'Georgia Invasive Species Council invasive plant list',
  url: 'https://gainvasivespeciescouncil.org/list/invasive-plants/',
  checkedOn: '2026-10-02',
};

/**
 * Claims by card id. A card absent from this table has no verified status and gets no badge —
 * which is the correct rendering of "we did not find evidence", and is most of the deck.
 */
export const REGIONAL_STATUS: Record<string, readonly RegionalStatus[]> = {
  // ── THE ONE BADGE IN THE DECK ──
  // The card's taxon IS the listed taxon, and it sits in the top tier — the one whose
  // definition the page prints. Nothing else in the catalogue meets both.
  'lonicera-japonica': [
    {
      ...GA,
      status: 'invasive',
      taxon: 'Lonicera japonica',
      category:
        'Exotic plants that are a serious problem in Georgia natural areas by extensively ' +
        'invading native plant communities and displacing native species',
      source: GISC,
      verification: 'primary-source',
      note: 'Climbs and smothers saplings and shrubs, and spreads from both runners and bird-carried fruit.',
      appliesToCard: true,
    },
  ],

  // ── GENUS CARDS: RECORDED, NEVER BADGED ──
  // The listed species are real and the listings are top-tier in two cases. The CARD is wider
  // than the listing, so badging it would tell somebody holding a native rose, mulberry,
  // blackberry or oak that their plant is an invader.
  'rosa-spp': [
    {
      ...GA,
      status: 'invasive',
      taxon: 'Rosa multiflora',
      category:
        'Exotic plants that are a serious problem in Georgia natural areas by extensively ' +
        'invading native plant communities and displacing native species',
      source: GISC,
      verification: 'primary-source',
      note: 'Forms impenetrable thickets in fields and forest edges.',
      appliesToCard: false,
      whyNotTheCard:
        'The Wild Rose card is Rosa spp. and covers roses native to Georgia. Badging the card would tell somebody holding a native rose that their plant is an invader.',
    },
    {
      ...GA,
      status: 'invasive',
      taxon: 'Rosa laevigata',
      source: GISC,
      verification: 'primary-source',
      note: 'Cherokee rose. Listed in a lower tier whose definition the page does not print.',
      appliesToCard: false,
      whyNotTheCard: 'Same genus-card scope as Rosa multiflora above.',
    },
  ],
  'morus-spp': [
    {
      ...GA,
      status: 'invasive',
      taxon: 'Morus alba',
      source: GISC,
      verification: 'primary-source',
      note: 'Hybridises with the native red mulberry, which is the concern more than spread. Listed in a lower tier whose definition the page does not print.',
      appliesToCard: false,
      whyNotTheCard:
        'The Mulberry card is Morus spp. and covers the native Morus rubra as well.',
    },
  ],
  'rubus-spp': [
    {
      ...GA,
      status: 'invasive',
      taxon: 'Rubus armeniacus',
      source: GISC,
      verification: 'primary-source',
      note: 'Himalayan blackberry. Found by the mechanical audit; the search-attested draft missed it entirely.',
      appliesToCard: false,
      whyNotTheCard:
        'The Blackberry card is Rubus spp. and covers blackberries native to Georgia.',
    },
    {
      ...GA,
      status: 'invasive',
      taxon: 'Rubus phoenicolasius',
      source: GISC,
      verification: 'primary-source',
      note: 'Wine raspberry.',
      appliesToCard: false,
      whyNotTheCard: 'Same genus-card scope as Rubus armeniacus above.',
    },
  ],
  'quercus-spp': [
    {
      ...GA,
      status: 'invasive',
      taxon: 'Quercus acutissima',
      source: GISC,
      verification: 'primary-source',
      note: 'Sawtooth oak. Found by the mechanical audit; the draft missed it.',
      appliesToCard: false,
      whyNotTheCard:
        'The Oak card is Quercus spp. and Georgia has many native oaks.',
    },
  ],

  // ── ON THE LIST, CARD TAXON MATCHES, AND STILL NO BADGE ──
  // `appliesToCard` is true here and the badge is still withheld, because the TIER is what is
  // missing. The page prints no definition for the block this species sits in, so what the
  // authority is asserting about it cannot be read — and an unreadable tier is ambiguous
  // evidence, which is the one thing a badge may never be built on.
  'allium-vineale': [
    {
      ...GA,
      status: 'introduced',
      taxon: 'Allium vineale',
      source: GISC,
      verification: 'primary-source',
      note: 'On the Georgia invasive plant list, in a lower tier whose definition the published page does not carry. Recorded as introduced rather than invasive for that reason.',
      appliesToCard: true,
    },
  ],

  // ── NOT ESTABLISHED IN GEORGIA AT ALL ──
  // The draft had this as `introduced` with a Category 3 from a search summary. The primary
  // list places it under "Species of Concern": a species NOT YET FOUND in Georgia. Right
  // outcome, wrong fact — and the fact is the part that would have aged badly.
  'alliaria-petiolata': [
    {
      ...GA,
      status: 'watchlist',
      taxon: 'Alliaria petiolata',
      category: 'Species of Concern — a species that is not yet found in Georgia',
      source: GISC,
      verification: 'primary-source',
      note: 'A serious invader further north. Georgia lists it as one to watch for rather than one that is here.',
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
