import { HERBS } from './deck';
import { FIELD_NOTES } from './card-field-notes';

/**
 * HABITAT CLASSES.
 *
 * Five classes, one required primary per species and an optional secondary. This is the
 * axis the Herbdex filters, Field Research, habitat achievements, Garden grouping,
 * creature classification, profile stats and (later) location-aware suggestions all hang
 * off, so it is deliberately small and deliberately not a free-text field.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS A CLASSIFICATION, NOT A SECOND COPY OF THE HABITAT PROSE
 *
 * Every species already has a cited habitat sentence in `card-field-notes.ts`. That prose
 * is the source; this is a *classification of* it. The prose is never restated here —
 * `habitatProseFor()` reads it back from the one place it lives, so the two cannot drift
 * and there is exactly one thing to re-verify when a source is checked.
 *
 * Nothing here comes from the printed cards. The 45 cards print an Encounter Rate, a
 * season and three growing-condition stats; they print no habitat at all. So unlike
 * `Herb.rarity` this is site-authored data, and it says so — see `HABITAT_DATA_STATUS`.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The classes are not balanced and must not be. Forcing equal rosters would mean moving a
 * species away from where it actually grows to even out a chart, which is inventing
 * botany by a slower route. The deck is a *backyard* deck, so Garden and Woodland are
 * large and Wetland is small; that is a true fact about the deck.
 */

export const HABITATS = ['woodland', 'meadow', 'wetland', 'wayside', 'garden'] as const;
export type HabitatClass = (typeof HABITATS)[number];

export const HABITAT_LABEL: Record<HabitatClass, string> = {
  woodland: 'Woodland',
  meadow: 'Meadow',
  wetland: 'Wetland',
  wayside: 'Wayside',
  garden: 'Garden',
};

/**
 * What each class means, in the words a person standing outside would use.
 *
 * These are "where to look" definitions rather than ecological ones on purpose: the class
 * has to be usable by someone deciding which way to walk, not just correct.
 */
export const HABITAT_BLURB: Record<HabitatClass, string> = {
  woodland: 'Woods, woodland edges, thickets and hedgerows — shade, or the line where shade meets light.',
  meadow: 'Meadows, old fields, pastures and prairie — open, sunny, and not recently dug.',
  wetland: 'Streambanks, floodplains, ditches, marsh edges and pond margins — ground that stays wet.',
  wayside: 'Roadsides, paths, vacant lots and waste ground — disturbed, untended, often trampled.',
  garden: 'Lawns, beds, allotments and cultivated ground — soil somebody looks after.',
};

/**
 * The line between Wayside and Garden, since it decides more calls than any other.
 *
 * Both are disturbed ground; the difference is whether anybody tends it. A lawn is mown,
 * a bed is dug, an allotment is weeded — that is Garden. A roadside verge, a gravel lot
 * and a trampled footpath are disturbed by traffic rather than by care — that is Wayside.
 * A plant that thrives in both takes whichever the field-note prose names first as its
 * primary, and the other as secondary.
 */
export const HABITAT_DISAMBIGUATION =
  'Garden is tended ground; Wayside is untended disturbed ground.';

export interface HabitatAssignment {
  primary: HabitatClass;
  /** Omitted when one class genuinely covers the species. Never equal to `primary`. */
  secondary?: HabitatClass;
  /**
   * Set when the call is genuinely contestable, saying why in one line.
   *
   * Present on an entry means "a person should look at this before it is treated as
   * settled" — `assignmentsUnderReview()` returns exactly these. Absent means the prose
   * pointed one way clearly, not that the entry is beyond question.
   */
  review?: string;
}

/**
 * Whether these assignments have been reviewed by a person.
 *
 * `'proposed'` while they are a derivation waiting on sign-off; `'confirmed'` once
 * reviewed. `habitat-data.test.ts` fails the build if any component or route consumes
 * habitat data while this reads `'proposed'` — so the taxonomy can be built, tested and
 * refined without a single unreviewed classification reaching a reader.
 */
export const HABITAT_DATA_STATUS: 'proposed' | 'confirmed' = 'proposed';

/**
 * Primary and optional secondary habitat for every species in the deck.
 *
 * DERIVED, ONE SPECIES AT A TIME, FROM THE CITED HABITAT PROSE — not from memory. Where
 * that prose lists several settings the first-named wins the primary, because the field
 * notes were written most-characteristic-first.
 *
 * Two recurring reasons an entry carries `review`:
 *
 *  • The card names a GENUS (`spp.`). The prose then says outright that ecology varies by
 *    species, and any single class flattens that — an oak can be a bottomland tree or a
 *    dry ridge tree. These are classified by where the genus is most often met, and every
 *    one is flagged.
 *  • Garden versus Wayside. See `HABITAT_DISAMBIGUATION`. For a weed that grows in both,
 *    the call is a judgement about which a reader should be sent to first.
 */
export const HABITAT_ASSIGNMENTS: Record<string, HabitatAssignment> = {
  // ── Garden: tended ground ───────────────────────────────────────────────────
  'taraxacum-officinale': {
    primary: 'garden',
    secondary: 'wayside',
    review: 'Lawns are named first and are where most people meet it, but dandelion is equally the archetypal roadside weed. Wayside primary is defensible.',
  },
  'chenopodium-album': { primary: 'garden', secondary: 'wayside' },
  'portulaca-oleracea': { primary: 'garden', secondary: 'wayside' },
  'oxalis-stricta': { primary: 'garden', secondary: 'wayside' },
  'lamium-purpureum': { primary: 'garden', secondary: 'wayside' },
  'stellaria-media': { primary: 'garden', secondary: 'wayside' },
  'glechoma-hederacea': { primary: 'garden', secondary: 'woodland' },
  'nepeta-cataria': { primary: 'garden', secondary: 'wayside' },
  'capsella-bursa-pastoris': { primary: 'garden', secondary: 'wayside' },
  'prunella-vulgaris': {
    primary: 'garden',
    secondary: 'meadow',
    review: 'Prose leads with lawns, but self-heal is a meadow plant that tolerates mowing. Meadow primary is arguably the more honest ecology.',
  },
  'allium-vineale': {
    primary: 'garden',
    secondary: 'meadow',
    review: 'The card names a species but the prose covers wild North American Allium generally and says habitat varies. Lawns lead the list; open woods are also named.',
  },
  'melissa-officinalis': { primary: 'garden', secondary: 'wayside' },

  // ── Woodland: shade, and the edge of it ─────────────────────────────────────
  'alliaria-petiolata': {
    primary: 'woodland',
    secondary: 'wayside',
    review: 'Woodland edges lead, but trails, hedgerows and floodplains are all named — a case could be made for Wayside or Wetland secondary.',
  },
  'viola-sororia': { primary: 'woodland', secondary: 'garden' },
  'galium-aparine': {
    primary: 'woodland',
    secondary: 'wayside',
    review: 'The prose names woodlands, thickets, fence rows, floodplains AND meadows. Cleavers genuinely spans four of the five classes; woodland-edge scrambling is the most characteristic.',
  },
  'acer-spp': {
    primary: 'woodland',
    secondary: 'garden',
    review: 'Genus card. Prose says habitat varies substantially by species — floodplain maples and street maples are both common. Garden secondary stands in for "urban landscapes".',
  },
  'rubus-spp': {
    primary: 'woodland',
    secondary: 'wayside',
    review: 'Genus card. Woodland-edge bramble is the classic picture, but fields, clearings and roadsides are all named and Meadow is defensible.',
  },
  'rosa-spp': {
    primary: 'woodland',
    secondary: 'meadow',
    review: 'Genus card, explicitly "depending on species". Thickets and forest edges lead; dunes and stream margins are also named and fit no secondary well.',
  },
  'geranium-maculatum': { primary: 'woodland' },
  'lonicera-japonica': { primary: 'woodland', secondary: 'wayside' },
  'pinus-spp': {
    primary: 'woodland',
    secondary: undefined,
    review: 'Genus card, prose says "highly variable" and names ridges, dry uplands, sandy soils, wetlands and cultivated landscapes. No secondary is honest; Woodland is the only safe primary.',
  },
  'morus-spp': {
    primary: 'woodland',
    secondary: 'wayside',
    review: 'Genus card. Woodland edges lead, but roadsides, fence lines and urban areas are where most people actually meet a mulberry.',
  },
  'passiflora-incarnata': {
    primary: 'woodland',
    secondary: 'wayside',
    review: 'Open woods and woodland edges lead the prose, but maypop is very often a fence-row and field-edge vine. Wayside primary is defensible.',
  },
  'quercus-spp': {
    primary: 'woodland',
    secondary: undefined,
    review: 'Genus card, prose says "extremely diverse" and names bottomlands, dry uplands, wetlands and urban landscapes. No secondary is honest.',
  },

  // ── Meadow: open, sunny, undug ──────────────────────────────────────────────
  'rumex-obtusifolius': { primary: 'meadow', secondary: 'wayside' },
  'solidago-canadensis': { primary: 'meadow', secondary: 'wayside' },
  'trifolium-pratense': { primary: 'meadow', secondary: 'wayside' },
  'rumex-acetosella': { primary: 'meadow', secondary: 'wayside' },
  'fragaria-virginiana': { primary: 'meadow', secondary: 'woodland' },
  'hypericum-perforatum': { primary: 'meadow', secondary: 'wayside' },
  'achillea-millefolium': { primary: 'meadow', secondary: 'wayside' },
  'monarda-fistulosa': { primary: 'meadow', secondary: 'woodland' },

  // ── Wetland: ground that stays wet ──────────────────────────────────────────
  'urtica-dioica': {
    primary: 'wetland',
    secondary: 'woodland',
    review: 'Prose leads "moist nutrient-rich soil: streambanks… floodplains", which is Wetland. But nettle is just as strongly a farmyard and fence-line plant, so Wayside primary is defensible.',
  },
  'mentha-canadensis': { primary: 'wetland', secondary: 'meadow' },
  'equisetum-arvense': { primary: 'wetland', secondary: 'wayside' },
  'sambucus-spp': {
    primary: 'wetland',
    secondary: 'woodland',
    review: 'Genus card. Streambanks and wet thickets lead, but elderberry is also a straightforward woodland-margin shrub.',
  },
  'impatiens-capensis': { primary: 'wetland', secondary: 'woodland' },
  'salix-spp': { primary: 'wetland' },

  // ── Wayside: untended disturbed ground ──────────────────────────────────────
  'ambrosia-artemisiifolia': { primary: 'wayside', secondary: 'garden' },
  'plantago-major': { primary: 'wayside', secondary: 'garden' },
  'rhus-spp': {
    primary: 'wayside',
    secondary: 'woodland',
    review: 'Genus card. Roadside sumac colonies are how most people meet it, but the prose leads with "dry open places" and names woodland edges and old fields.',
  },
  'cichorium-intybus': { primary: 'wayside', secondary: 'meadow' },
  'arctium-lappa': { primary: 'wayside', secondary: 'meadow' },
  'verbascum-thapsus': { primary: 'wayside', secondary: 'meadow' },
  'lactuca-serriola': { primary: 'wayside', secondary: 'meadow' },
};

export function habitatOf(herbId: string): HabitatAssignment | undefined {
  return HABITAT_ASSIGNMENTS[herbId];
}

/**
 * Both classes a species belongs to, primary first, as a plain list.
 *
 * The shape filters and counters want: "is this herb in Woodland" is a membership
 * question, and asking it should not mean knowing which slot the answer is in.
 */
export function habitatsOf(herbId: string): HabitatClass[] {
  const entry = HABITAT_ASSIGNMENTS[herbId];
  if (!entry) return [];
  return entry.secondary ? [entry.primary, entry.secondary] : [entry.primary];
}

export function isInHabitat(herbId: string, habitat: HabitatClass): boolean {
  return habitatsOf(herbId).includes(habitat);
}

/** Herb ids in a habitat, counting secondary membership. Deck order. */
export function herbIdsInHabitat(habitat: HabitatClass): string[] {
  return HERBS.filter((herb) => isInHabitat(herb.id, habitat)).map((herb) => herb.id);
}

/**
 * How many species sit in each class, by primary only and counting secondaries.
 *
 * Both numbers matter: primary counts are what a "one species from every habitat"
 * achievement should measure, while inclusive counts are what a filter will show.
 */
export function habitatCounts(): Record<HabitatClass, { primary: number; inclusive: number }> {
  const counts = Object.fromEntries(
    HABITATS.map((habitat) => [habitat, { primary: 0, inclusive: 0 }]),
  ) as Record<HabitatClass, { primary: number; inclusive: number }>;
  for (const herb of HERBS) {
    const entry = HABITAT_ASSIGNMENTS[herb.id];
    if (!entry) continue;
    counts[entry.primary].primary += 1;
    for (const habitat of habitatsOf(herb.id)) counts[habitat].inclusive += 1;
  }
  return counts;
}

/** The cited habitat sentence an assignment was derived from. Read, never copied. */
export function habitatProseFor(herbId: string): string | undefined {
  return FIELD_NOTES[herbId]?.habitat;
}

/** Every assignment a person still needs to look at, in deck order. */
export function assignmentsUnderReview(): {
  herbId: string;
  assignment: HabitatAssignment;
  review: string;
}[] {
  return HERBS.flatMap((herb) => {
    const assignment = HABITAT_ASSIGNMENTS[herb.id];
    return assignment?.review
      ? [{ herbId: herb.id, assignment, review: assignment.review }]
      : [];
  });
}
