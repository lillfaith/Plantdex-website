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
 * A plant that thrives in both is filed by where a searcher should be sent first, which is
 * not always what the prose names first — see the rule on `HabitatAssignment`.
 */
export const HABITAT_DISAMBIGUATION =
  'Garden is tended ground; Wayside is untended disturbed ground.';

/**
 * WHAT PRIMARY MEANS.
 *
 * The habitat class that is both ECOLOGICALLY DEFENSIBLE and MOST USEFUL for telling a
 * player where they are most characteristically likely to encounter or search for the
 * plant in the real world.
 *
 * It explicitly does NOT mean "the first habitat phrase in the prose". That mechanical
 * rule was the first version of this table, and it failed the same way three times: it
 * promoted whichever setting the sentence happened to open with, even where the sentence's
 * own summarizing clause pointed elsewhere. Self-heal went to Garden because "Lawns" came
 * first, when a mown lawn is a subset of the meadow it belongs to; dandelion to Garden
 * when the prose's one emphatic clause is "especially tolerant of compacted soils"; maypop
 * to Woodland when the prose closes on "disturbed sunny areas".
 *
 * SECONDARY is the next genuinely important encounter environment — not merely the second
 * class the prose mentions, and omitted entirely where naming one would be a guess.
 *
 * Both stay grounded in the cited prose. The rule changes how that prose is READ; it never
 * licenses a habitat the prose does not support.
 */
export interface HabitatAssignment {
  primary: HabitatClass;
  /** Omitted when one class genuinely covers the species. Never equal to `primary`. */
  secondary?: HabitatClass;
  /**
   * Recorded wherever the call was a judgement rather than a reading.
   *
   * Names the alternative considered and why it lost, so the decision can be re-examined
   * without reconstructing it. Present on every genus card — whose own prose says ecology
   * varies by species, so any single class flattens something true — and on the species
   * where two classes were both defensible.
   */
  judgement?: string;
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
 * DERIVED, ONE SPECIES AT A TIME, FROM THE CITED HABITAT PROSE — not from memory, and read
 * under the rule on `HabitatAssignment`: primary is where a player is most
 * characteristically likely to meet the plant, not whichever setting the sentence opens
 * with. Grouped by primary, deck order within each group.
 *
 * Two recurring reasons an entry carries `judgement`:
 *
 *  • The card names a GENUS (`spp.`). The prose then says outright that ecology varies by
 *    species, and any single class flattens that — an oak can be a bottomland tree or a
 *    dry ridge tree. These are filed by where the genus is most often met.
 *  • Two classes were both defensible. The note records the loser and why.
 *
 * ONE DISTINCTION DOES A LOT OF WORK, so it is stated once here rather than in five notes:
 * a LIGHT-DEMANDING SCRAMBLER cannot persist in shade, so for brambles and maypop the
 * woodland interior is excluded outright and "woodland edge" is really the sunny margin —
 * both are filed under Wayside. A TREE is different: a mulberry or a maple belongs to
 * woodland ecologically even when the specimen you meet is standing on a verge.
 */
export const HABITAT_ASSIGNMENTS: Record<string, HabitatAssignment> = {
  // ── Woodland: shade, and the line where shade meets light ────────────────────
  'alliaria-petiolata': {
    primary: 'woodland',
    secondary: 'wayside',
    judgement:
      'Woodland edges and shaded woods lead, and unlike the light-demanding scramblers this one ' +
      'genuinely occupies shade — it is the classic invasive of shaded woodland. Trails and ' +
      'hedgerows give the Wayside secondary; floodplains were considered and lost to them.',
  },
  'viola-sororia': { primary: 'woodland', secondary: 'garden' },
  'galium-aparine': {
    primary: 'woodland',
    secondary: 'wayside',
    judgement:
      'Genuinely spans four classes. Woodlands and thickets lead, and cleavers characteristically ' +
      'scrambles through hedgerow and woodland-edge vegetation rather than standing in open ' +
      'ground. Fence rows give the Wayside secondary.',
  },
  'acer-spp': {
    primary: 'woodland',
    secondary: 'garden',
    judgement:
      'Genus card; the prose says habitat varies substantially. Woodland is unambiguous for a ' +
      'forest tree. Garden secondary stands in for the explicitly named \"urban landscapes\", which ' +
      'is how most people meet a maple; floodplains lost the secondary to it.',
  },
  'rosa-spp': {
    primary: 'woodland',
    secondary: 'meadow',
    judgement:
      'Genus card, explicitly \"depending on species\". Thickets and forest edges lead and are ' +
      'where a wild rose characteristically grows as a shrub. Fields take the secondary over ' +
      'roadsides because the prose names them first among the open habitats; dunes and stream ' +
      'margins fit no secondary and are not represented.',
  },
  'geranium-maculatum': { primary: 'woodland' },
  'lonicera-japonica': { primary: 'woodland', secondary: 'wayside' },
  'pinus-spp': {
    primary: 'woodland',
    judgement:
      'Genus card; the prose says \"highly variable\" and names ridges, dry uplands, sandy soils, ' +
      'wetlands and cultivated landscapes. Woodland is the only safe primary for a forest conifer, ' +
      'and NO SECONDARY IS HONEST — choosing one would rank settings the prose leaves unranked.',
  },
  'morus-spp': {
    primary: 'woodland',
    secondary: 'wayside',
    judgement:
      'Genus card, and the closest call among the trees: the prose closes on \"readily naturalise\" ' +
      'and names roadsides, fence lines and urban areas, so Wayside primary was seriously ' +
      'considered. It was rejected because a mulberry is a TREE and belongs to woodland ' +
      'ecologically even when the specimen you meet is standing on a verge — the distinction that ' +
      'separates it from the brambles above. Wayside takes the secondary and carries the ' +
      'naturalised habit.',
  },
  'quercus-spp': {
    primary: 'woodland',
    judgement:
      'Genus card; the prose says \"extremely diverse\" and names bottomlands, dry uplands, ' +
      'wetlands and urban landscapes. Woodland is the only safe primary and NO SECONDARY IS HONEST.',
  },

  // ── Meadow: open, sunny, undug ───────────────────────────────────────────────
  'rumex-obtusifolius': { primary: 'meadow', secondary: 'wayside' },
  'solidago-canadensis': { primary: 'meadow', secondary: 'wayside' },
  'trifolium-pratense': { primary: 'meadow', secondary: 'wayside' },
  'rumex-acetosella': { primary: 'meadow', secondary: 'wayside' },
  'prunella-vulgaris': {
    primary: 'meadow',
    secondary: 'garden',
    judgement:
      'Prose opens on lawns, but a mown lawn is a subset of the moist open grassland self-heal ' +
      'actually belongs to, and \"meadows\" and \"moist open ground\" both appear in the same ' +
      'sentence. Garden keeps the secondary: a lawn is a real and very common encounter.',
  },
  'allium-vineale': {
    primary: 'meadow',
    secondary: 'garden',
    judgement:
      'Genus-level prose (\"varies by species\") naming lawns, meadows, open woods and fields. ' +
      'Meadow leads because Allium vineale is a pasture and field weed — the common name is Field ' +
      'Garlic — and a lawn is the mown version of the same grassland. Garden secondary.',
  },
  'fragaria-virginiana': { primary: 'meadow', secondary: 'woodland' },
  'hypericum-perforatum': { primary: 'meadow', secondary: 'wayside' },
  'achillea-millefolium': { primary: 'meadow', secondary: 'wayside' },
  'monarda-fistulosa': { primary: 'meadow', secondary: 'woodland' },

  // ── Wetland: ground that stays wet ───────────────────────────────────────────
  'urtica-dioica': {
    primary: 'wetland',
    secondary: 'woodland',
    judgement:
      'The prose is organised by one clause — \"moist nutrient-rich soil:\" — and everything after ' +
      'it is an example of that. Its first two examples are streambanks and floodplains. Woodland ' +
      'openings is explicitly named and pairs coherently. Wayside (farms, fence lines) stays ' +
      'defensible and is the alternative if this is revisited.',
  },
  'mentha-canadensis': { primary: 'wetland', secondary: 'meadow' },
  'equisetum-arvense': { primary: 'wetland', secondary: 'wayside' },
  'sambucus-spp': {
    primary: 'wetland',
    secondary: 'woodland',
    judgement:
      'Genus card. Streambanks, wet thickets and ditches dominate the prose, and damp ground is ' +
      'the most useful thing to tell a searcher looking for elder. Woodland margins are named and ' +
      'take the secondary.',
  },
  'impatiens-capensis': { primary: 'wetland', secondary: 'woodland' },
  'salix-spp': { primary: 'wetland' },

  // ── Wayside: untended disturbed ground ───────────────────────────────────────
  'taraxacum-officinale': {
    primary: 'wayside',
    secondary: 'garden',
    judgement:
      'Lawns are named first, but the prose\'s one emphatic clause is \"especially tolerant of ' +
      'compacted soils\" — a wayside signature, not a garden one — and \"paths, roadsides\" follow ' +
      'immediately. Garden takes the secondary because a lawn is where many people first notice it.',
  },
  'ambrosia-artemisiifolia': { primary: 'wayside', secondary: 'garden' },
  'plantago-major': { primary: 'wayside', secondary: 'garden' },
  'rubus-spp': {
    primary: 'wayside',
    secondary: 'woodland',
    judgement:
      'Genus card. The prose closes on \"disturbed sunny ground\" and names fence rows and ' +
      'roadsides; a bramble is light-demanding, so the woodland interior is excluded and ' +
      '\"woodland edge\" here is really the sunny margin. Meadow was considered and rejected: ' +
      'brambles occupy edges and disturbed ground, not open sward.',
  },
  'rhus-spp': {
    primary: 'wayside',
    secondary: 'woodland',
    judgement:
      'Genus card. The prose leads with \"dry open places\" and names roadsides and disturbed ' +
      'slopes; sumac is light-demanding and roadside colonies are the characteristic encounter. ' +
      'Woodland edges give the secondary.',
  },
  'cichorium-intybus': { primary: 'wayside', secondary: 'meadow' },
  'arctium-lappa': { primary: 'wayside', secondary: 'meadow' },
  'verbascum-thapsus': { primary: 'wayside', secondary: 'meadow' },
  'passiflora-incarnata': {
    primary: 'wayside',
    secondary: 'woodland',
    judgement:
      'Open woods lead the prose, but it closes on \"disturbed sunny areas\" and names fields, ' +
      'roadsides and fence lines. Maypop is a sun-loving vine that scrambles on fence rows, so a ' +
      'player should check margins and verges rather than woodland interior. Woodland stays ' +
      'secondary because open woods and woodland edges are genuinely named.',
  },
  'lactuca-serriola': { primary: 'wayside', secondary: 'meadow' },

  // ── Garden: tended ground ────────────────────────────────────────────────────
  'chenopodium-album': { primary: 'garden', secondary: 'wayside' },
  'portulaca-oleracea': { primary: 'garden', secondary: 'wayside' },
  'oxalis-stricta': { primary: 'garden', secondary: 'wayside' },
  'lamium-purpureum': { primary: 'garden', secondary: 'wayside' },
  'stellaria-media': { primary: 'garden', secondary: 'wayside' },
  'glechoma-hederacea': { primary: 'garden', secondary: 'woodland' },
  'nepeta-cataria': { primary: 'garden', secondary: 'wayside' },
  'capsella-bursa-pastoris': { primary: 'garden', secondary: 'wayside' },
  'melissa-officinalis': { primary: 'garden', secondary: 'wayside' },
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

/** Every assignment that rested on a judgement rather than a plain reading, in deck order. */
export function judgementCalls(): {
  herbId: string;
  assignment: HabitatAssignment;
  judgement: string;
}[] {
  return HERBS.flatMap((herb) => {
    const assignment = HABITAT_ASSIGNMENTS[herb.id];
    return assignment?.judgement
      ? [{ herbId: herb.id, assignment, judgement: assignment.judgement }]
      : [];
  });
}
