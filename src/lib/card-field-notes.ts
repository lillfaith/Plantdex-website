import type { Herb, SourceableSection, SourceRef } from './types';

/**
 * Field notes the SITE adds: what a plant looks like, where it grows, and what it gets
 * mistaken for.
 *
 * WHY THIS IS NOT IN `herbs.json`. That file is generated from the physical cards by
 * `scripts/build_deck.py`, and its whole value is that every field in it was printed on a
 * card. None of the 45 cards prints identification, habitat or lookalikes — `Herb.habitat`
 * and `Herb.identification` are empty for all 45 — so putting this content there would
 * quietly break the one guarantee that makes the transcription worth trusting. It lives
 * here instead, the same curated-layer pattern as `card-issues.ts`, `card-cautions.ts` and
 * `card-sources.ts`, and it renders labelled as site-added.
 *
 * SAFETY. A lookalike is the most dangerous thing a foraging site can get wrong, so:
 *
 *  - `distinguishBy` names the ONE character that separates the two plants, not a general
 *    description of either. A description a reader has to weigh is not a discriminator.
 *  - `risk` is set wherever mistaking the pair actually matters, and the section renders it
 *    at hazard weight rather than as ordinary prose. Its job is to say plainly that the
 *    trait above is an aid, not a clearance to eat something.
 *  - Nothing here may imply a short trait list establishes edibility. That is what
 *    `IDENTIFICATION_CAVEAT` exists to say, once, where the traits are.
 */

export interface Lookalike {
  commonName: string;
  /** Absent where the note names a group ("other bedstraws") rather than one taxon. */
  scientificName?: string;
  /** The discriminating character. Never a description of either plant on its own. */
  distinguishBy: string;
  /** Set when mistaking it matters. Rendered at hazard weight, never as body text. */
  risk?: string;
}

export interface FieldNotes {
  /**
   * Compact trait rows rather than a paragraph: a short label, then the clause that
   * qualifies it. A wall of prose is the format people skim; this is the format they scan.
   */
  identification?: { trait: string; detail: string }[];
  habitat?: string;
  lookalikes?: Lookalike[];
  /**
   * For a card that names a SPECIES while the traits shown are genus-wide (#23, #29, #36,
   * #40). Distinct from the genus-level notice, which belongs only to cards whose own
   * scientific name is `spp.` — see `isGenusCard`.
   */
  genusTraitsNote?: string;
  /** Ids in `src/data/sources.json`. Unverified ids are dropped by `resolveRefs`. */
  sourceIds: string[];
}

/**
 * Said once, where the traits are. Deliberately short: a caveat people actually read beats
 * a longer one they have already scrolled past twice on this page.
 */
export const IDENTIFICATION_CAVEAT =
  'Field traits are an identification aid, not proof that a plant is safe to consume or use.';

export const GENUS_CARD_NOTICE =
  'Plantdex currently represents this card at genus level. Exact traits vary by species.';

/**
 * True when the DECK ITSELF prints `spp.` — derived, never a hand-kept list, so the notice
 * and the card can not drift apart. Nine cards qualify; the four species-named cards whose
 * traits are genus-wide carry `genusTraitsNote` instead, because telling a reader their
 * card is genus-level when it names a species would misdescribe the deck.
 */
export function isGenusCard(herb: Herb): boolean {
  return /\bspp\.$/.test(herb.scientificName.trim());
}

export const FIELD_NOTES: Record<string, FieldNotes> = {
  'taraxacum-officinale': {
    identification: [
      { trait: 'Basal rosette', detail: 'Low rosette of deeply toothed or lobed leaves.' },
      { trait: 'Backward lobes', detail: 'Leaf lobes commonly point back toward the centre of the rosette.' },
      { trait: 'One flower per stalk', detail: 'A bright yellow head grows singly on a leafless, hollow stalk.' },
      { trait: 'Milky latex', detail: 'Broken leaves or flower stalks release a milky sap.' },
      { trait: 'Seed head', detail: 'Mature flowers become round white wind-dispersed clocks.' },
    ],
    habitat:
      'Lawns, paths, roadsides, gardens, fields and other open sunny places on disturbed ground. Especially tolerant of compacted soils.',
    lookalikes: [
      {
        commonName: "Cat's-ear and other yellow-flowered daisy-family plants",
        distinguishBy:
          'Dandelion flower stalks are single, unbranched and hollow, rising straight from the basal rosette rather than from branched leafy flowering stems.',
      },
    ],
    sourceIds: ['wisc-dandelion', 'umn-dandelions'],
  },

  'rumex-obtusifolius': {
    identification: [
      { trait: 'Broad leaves', detail: 'Large oblong to broadly lance-shaped leaves.' },
      { trait: 'Wavy margins', detail: 'Leaf edges are often distinctly wavy.' },
      { trait: 'Stalked basal cluster', detail: 'Lower leaves form a basal cluster on long stalks.' },
      { trait: 'Rusty seed heads', detail: 'Tall branching stems carry many small greenish flowers that mature rusty brown.' },
      { trait: 'Papery node sheath', detail: 'A papery sheath surrounds the stem at each node — a buckwheat-family character.' },
    ],
    habitat:
      'Pastures, fields, gardens, riverbanks, roadsides, livestock areas and forest edges, on moist or disturbed ground that is often nitrogen-rich.',
    lookalikes: [
      {
        commonName: 'Curly dock',
        scientificName: 'Rumex crispus',
        distinguishBy:
          'Curly dock generally has narrower leaves with much more strongly crisped or curled margins.',
      },
      {
        commonName: 'Burdock (young plants)',
        scientificName: 'Arctium lappa',
        distinguishBy:
          'Young burdock looks superficially similar but later develops very large heart-shaped leaves and hooked burs.',
      },
    ],
    sourceIds: [],
  },

  'solidago-canadensis': {
    identification: [
      { trait: 'Upright perennial', detail: 'Many narrow alternate leaves run up the stem.' },
      { trait: 'Toothed lance leaves', detail: 'Leaves generally lance-shaped with toothed margins.' },
      { trait: 'Golden plumes', detail: 'Numerous tiny yellow heads form large branching, often arching plume-like clusters.' },
      { trait: 'Colony-forming', detail: 'Spreads by rhizomes as well as seed and may form colonies.' },
    ],
    habitat:
      'Meadows, old fields, roadsides, woodland edges and disturbed open sunny sites, often on moderately moist but well-drained soil.',
    lookalikes: [
      {
        commonName: 'Common ragweed',
        scientificName: 'Ambrosia artemisiifolia',
        distinguishBy:
          'Goldenrod produces conspicuous golden-yellow flower sprays; ragweed produces inconspicuous greenish flower spikes above deeply divided foliage.',
      },
    ],
    sourceIds: [],
  },

  'ambrosia-artemisiifolia': {
    identification: [
      { trait: 'Fern-like leaves', detail: 'Upright annual with deeply divided, fern-like foliage.' },
      { trait: 'Changing arrangement', detail: 'Lower leaves can be opposite while upper leaves become alternate.' },
      { trait: 'Hairy stems', detail: 'Stems often appear hairy.' },
      { trait: 'Greenish spikes', detail: 'Male flowers sit in slender greenish spikes at the tops of the stems.' },
      { trait: 'Never showy', detail: 'The flowers are inconspicuous rather than showy.' },
    ],
    habitat:
      'Disturbed soils, roadsides, vacant lots, gardens, crop fields and open waste places.',
    lookalikes: [
      {
        commonName: 'Mugwort',
        scientificName: 'Artemisia vulgaris',
        distinguishBy:
          'Mugwort commonly has noticeably pale or silvery-white leaf undersides; ragweed foliage is not strongly white beneath.',
      },
      {
        commonName: 'Goldenrod',
        scientificName: 'Solidago canadensis',
        distinguishBy:
          'Goldenrod is often blamed for ragweed pollen allergy, but goldenrod carries conspicuous yellow flower clusters and ragweed does not.',
      },
    ],
    sourceIds: [],
  },

  'chenopodium-album': {
    identification: [
      { trait: 'Variable leaf shape', detail: 'Triangular, diamond-shaped or lance-shaped alternate leaves.' },
      { trait: 'Irregular teeth', detail: 'Leaf margins are often irregularly toothed.' },
      { trait: 'Mealy coating', detail: 'Young leaves and growing tips frequently carry a pale grey-white mealy bloom.' },
      { trait: 'Clustered green flowers', detail: 'Tiny green flowers sit in dense clusters rather than showy blooms.' },
      { trait: 'Striped stems', detail: 'Stems may show reddish or pinkish striping.' },
    ],
    habitat:
      'Gardens, cultivated fields, farm ground, vacant lots, waste areas, riparian ground and newly disturbed soil. Often vigorous in fertile soils.',
    lookalikes: [
      {
        commonName: 'Other goosefoots and some pigweeds',
        distinguishBy:
          'The pale mealy coating on young growth is the useful character; leaf shape alone is too variable to separate them.',
      },
    ],
    sourceIds: [],
  },

  'portulaca-oleracea': {
    identification: [
      { trait: 'Spreading mat', detail: 'Low spreading habit; stems radiate outward and can mat over bare soil.' },
      { trait: 'Succulent leaves', detail: 'Smooth, fleshy, succulent leaves.' },
      { trait: 'Reddish stems', detail: 'Thick succulent stems, often reddish.' },
      { trait: 'Small yellow flowers', detail: 'Usually five petals.' },
    ],
    habitat:
      'Gardens, sidewalk cracks, cultivated beds, fields, roadsides and hot disturbed ground, especially in full sun.',
    lookalikes: [
      {
        commonName: 'Spotted or prostrate spurge',
        scientificName: 'Euphorbia maculata',
        distinguishBy:
          'Spurges have thinner, non-succulent foliage and exude milky latex when broken. Purslane has fleshy succulent leaves and stems and no milky sap.',
        risk: 'Do not treat this distinction on its own as proof that a plant is safe to eat.',
      },
    ],
    sourceIds: ['psu-purslane', 'wisc-spotted-spurge', 'ucipm-spotted-spurge', 'umn-foraging-backyard-weeds'],
  },

  'alliaria-petiolata': {
    identification: [
      { trait: 'First-year rosette', detail: 'Low rosettes of rounded, kidney- or heart-shaped leaves.' },
      { trait: 'Second-year stem', detail: 'Upright, with more triangular, coarsely toothed leaves.' },
      { trait: 'Four white petals', detail: 'Small white flowers arranged in a cross.' },
      { trait: 'Garlic smell', detail: 'Crushed foliage typically smells of garlic.' },
      { trait: 'Long thin pods', detail: 'Developing seedpods are long and narrow.' },
    ],
    habitat:
      'Woodland edges, shaded woods, trails, hedgerows, floodplains and moist or shaded disturbed places.',
    lookalikes: [
      {
        commonName: 'Violets and other low woodland rosettes',
        distinguishBy:
          'Mature garlic mustard develops four-petalled white mustard-family flowers, and crushed foliage commonly smells garlic-like.',
      },
    ],
    sourceIds: [],
  },

  'urtica-dioica': {
    identification: [
      { trait: 'Opposite serrated leaves', detail: 'Sharply serrated margins, pointed tips, prominent veining.' },
      { trait: 'Stinging hairs', detail: 'Stems and leaves bear true stinging hairs.' },
      { trait: 'Drooping flower clusters', detail: 'Tiny greenish flowers in drooping or branching clusters.' },
      { trait: 'Dense patches', detail: 'Often forms dense stands through rhizomes.' },
    ],
    habitat:
      'Moist nutrient-rich soil: streambanks, woodland openings, floodplains, farms, fence lines and disturbed areas.',
    lookalikes: [
      {
        commonName: 'Dead-nettles',
        scientificName: 'Lamium spp.',
        distinguishBy: 'Dead-nettles do not possess the true stinging hairs of Urtica dioica.',
      },
      {
        commonName: 'Wood nettle',
        distinguishBy:
          'Another stinging nettle relative; separating the two takes more detailed characters than these.',
      },
    ],
    sourceIds: [],
  },

  'oxalis-stricta': {
    identification: [
      { trait: 'Three heart-shaped leaflets', detail: 'Each leaf carries three distinctly heart-shaped leaflets.' },
      { trait: 'Yellow five-petalled flowers', detail: 'Small and bright.' },
      { trait: 'Cylindrical capsules', detail: 'Slender seed capsules stand up from the foliage.' },
      { trait: 'Folding leaflets', detail: 'Leaflets frequently fold downward at night or under stress.' },
    ],
    habitat:
      'Lawns, gardens, disturbed soils, fields, roadsides and other open ground, from dry to moderately moist.',
    lookalikes: [
      {
        commonName: 'White clover',
        scientificName: 'Trifolium repens',
        distinguishBy:
          'Wood sorrel has heart-shaped leaflets and yellow five-petalled flowers; white clover has more oval leaflets and rounded white flower heads.',
      },
    ],
    sourceIds: [],
  },

  'trifolium-pratense': {
    identification: [
      { trait: 'Three oval leaflets', detail: 'Broader and blunter than wood sorrel.' },
      { trait: 'Pale chevron', detail: 'Leaflets commonly show a pale V- or crescent-shaped marking.' },
      { trait: 'Rounded pink heads', detail: 'Pink to reddish-purple heads made of many small flowers.' },
      { trait: 'Upright habit', detail: 'Usually more upright than white clover.' },
      { trait: 'Slight hairiness', detail: 'Foliage and stems may be slightly hairy.' },
    ],
    habitat: 'Fields, pastures, roadsides, meadows, lawns and disturbed open ground.',
    lookalikes: [
      {
        commonName: 'White clover',
        scientificName: 'Trifolium repens',
        distinguishBy: 'White clover creeps low and carries white or cream flower heads.',
      },
      {
        commonName: 'Alsike clover',
        distinguishBy:
          'Alsike may have pinkish-white heads but generally lacks the strong pale chevron on the leaflets.',
      },
    ],
    sourceIds: [],
  },

  'lamium-purpureum': {
    identification: [
      { trait: 'Square stems', detail: 'A mint-family character.' },
      { trait: 'Opposite scalloped leaves', detail: 'Triangular to heart-shaped, with scalloped or toothed edges.' },
      { trait: 'Purple upper leaves', detail: 'Upper leaves often flush purple or reddish-purple.' },
      { trait: 'Tubular pink flowers', detail: 'Small, clustered around the upper stem.' },
      { trait: 'No sting', detail: 'Does not possess the painful stinging hairs of true stinging nettle.' },
    ],
    habitat:
      'Lawns, gardens, farm fields, sidewalk edges, roadsides and disturbed ground — often most visible in cool spring weather.',
    lookalikes: [
      {
        commonName: 'Henbit',
        scientificName: 'Lamium amplexicaule',
        distinguishBy:
          "Henbit's upper leaves are rounded and clasp the stem; purple dead nettle's upper leaves are more triangular and usually keep short petioles.",
      },
    ],
    sourceIds: [],
  },

  'viola-sororia': {
    identification: [
      { trait: 'Low perennial', detail: 'Arises from rhizomes and may form spreading colonies.' },
      { trait: 'Heart-shaped leaves', detail: 'Broad, with toothed margins.' },
      { trait: 'Five unequal petals', detail: 'Flowers usually violet to blue-purple.' },
      { trait: 'Everything from the base', detail: 'Flowers and leaves rise low from the base, not from tall leafy stems.' },
    ],
    habitat: 'Moist rich woods, stream areas, thickets, shaded lawns and partly shaded garden ground.',
    lookalikes: [
      {
        commonName: 'Other violets',
        scientificName: 'Viola spp.',
        distinguishBy:
          'Telling violets apart may need flower, leaf and hair characters together — not every violet-looking plant is Viola sororia.',
      },
    ],
    sourceIds: [],
  },

  'stellaria-media': {
    identification: [
      { trait: 'Mat-forming', detail: 'Low, with opposite oval leaves.' },
      { trait: 'One line of hairs', detail: 'Slender stems often carry a single distinctive line of hairs down one side.' },
      { trait: 'Split white petals', detail: 'Five deeply divided petals that can look like ten.' },
      { trait: 'Roots at the nodes', detail: 'Stems root where they touch soil.' },
    ],
    habitat: 'Gardens, fields, lawns and waste ground on moist to moderately moist disturbed soils.',
    lookalikes: [
      {
        commonName: 'Mouse-ear chickweeds',
        scientificName: 'Cerastium spp.',
        distinguishBy:
          'Cerastium is generally much hairier over leaves and stems; Stellaria media shows the single line of stem hairs.',
      },
    ],
    sourceIds: [],
  },

  'plantago-major': {
    identification: [
      { trait: 'Broad oval rosette', detail: 'Leaves form a basal rosette flat to the ground.' },
      { trait: 'Parallel veins', detail: 'Several strong, nearly parallel veins run from base to tip.' },
      { trait: 'Long leaf stalks', detail: 'Stalks emerge directly from the crown.' },
      { trait: 'Narrow flower spikes', detail: 'Leafless stalks carry spikes of tiny greenish or brownish flowers.' },
      { trait: 'Takes a trampling', detail: 'The low habit tolerates repeated foot traffic.' },
    ],
    habitat: 'Lawns, footpaths, compacted soils, roadsides, fields and heavily trampled places.',
    lookalikes: [
      {
        commonName: 'Narrowleaf plantain',
        scientificName: 'Plantago lanceolata',
        distinguishBy:
          'Narrowleaf plantain keeps the same rosette-and-spike form but has much narrower, lance-shaped leaves.',
      },
    ],
    sourceIds: [],
  },

  'galium-aparine': {
    identification: [
      { trait: 'Sprawling stems', detail: 'Weak, scrambling or climbing over other plants.' },
      { trait: 'Leaves in whorls', detail: 'Narrow leaves in whorls of commonly six to eight around the stem.' },
      { trait: 'Hooked bristles', detail: 'Backward-pointing hooks on stems and leaves.' },
      { trait: 'It clings', detail: 'The whole plant sticks readily to clothing and animal fur.' },
      { trait: 'Tiny white flowers', detail: 'Four petals; paired round fruits also develop hooked bristles.' },
    ],
    habitat:
      'Woodlands, thickets, fence rows, floodplains, meadows, field edges, cultivated ground and waste areas, particularly where moist and nutrient-rich.',
    lookalikes: [
      {
        commonName: 'Other bedstraws',
        scientificName: 'Galium spp.',
        distinguishBy:
          'Cleavers is distinctive for the density of its hooked bristles — it clings to clothing and fur far more strongly than its relatives.',
      },
    ],
    sourceIds: [],
  },

  'glechoma-hederacea': {
    identification: [
      { trait: 'Creeping and rooting', detail: 'Low stems root at the nodes as they run.' },
      { trait: 'Square stems', detail: 'A mint-family character.' },
      { trait: 'Round opposite leaves', detail: 'Kidney- to heart-shaped, with scalloped margins.' },
      { trait: 'Aromatic', detail: 'Foliage smells distinctly of mint family when crushed.' },
      { trait: 'Blue-violet flowers', detail: 'Small and tubular, in the leaf axils.' },
    ],
    habitat:
      'Lawns, shady yards, roadsides, woodland edges, thickets and moist disturbed ground — particularly vigorous in fertile moist shade.',
    lookalikes: [
      {
        commonName: 'Wild violets',
        scientificName: 'Viola spp.',
        distinguishBy: 'Ground ivy has square creeping stems and aromatic mint-family foliage; violets have neither.',
      },
      {
        commonName: 'Henbit and dead-nettles',
        scientificName: 'Lamium spp.',
        distinguishBy: 'Those tend to be more upright rather than creeping and rooting as they go.',
      },
    ],
    sourceIds: [],
  },

  'acer-spp': {
    identification: [
      { trait: 'Opposite twigs', detail: 'Leaves are arranged opposite each other on the twig.' },
      { trait: 'Often palmate', detail: 'Many maples have palmately lobed leaves, though leaf shape varies greatly across the genus.' },
      { trait: 'Paired samaras', detail: 'Fruit is a pair of winged samaras — the "helicopters".' },
      { trait: 'Woody habit', detail: 'Tree or shrub.' },
    ],
    habitat:
      'Varies substantially by species. Maples occur in forests, woodland edges, floodplains, moist uplands and urban landscapes across much of North America.',
    lookalikes: [
      {
        commonName: 'Depends on species',
        distinguishBy:
          'Opposite leaf arrangement combined with paired samaras recognises Acer far more reliably than leaf shape alone.',
      },
    ],
    sourceIds: [],
  },

  'rubus-spp': {
    identification: [
      { trait: 'Arching canes', detail: 'Trailing or arching, often armed with prickles.' },
      { trait: 'Compound leaves', detail: 'Commonly three to five toothed leaflets.' },
      { trait: 'Five-petalled flowers', detail: 'White to pale pink is common.' },
      { trait: 'Aggregate fruit', detail: 'Made of many drupelets, often maturing dark purple or black.' },
    ],
    habitat: 'Woodland edges, fence rows, fields, clearings, roadsides, thickets and disturbed sunny ground.',
    lookalikes: [
      {
        commonName: 'Black raspberries, dewberries and other brambles',
        scientificName: 'Rubus spp.',
        distinguishBy:
          'Separating Rubus species takes cane, fruit, leaflet and reproductive characters beyond what this genus-level card shows.',
      },
    ],
    sourceIds: [],
  },

  'rumex-acetosella': {
    identification: [
      { trait: 'Arrow-shaped leaves', detail: 'Two backward-pointing basal lobes — the strongest character here.' },
      { trait: 'Small and slender', detail: 'A small perennial with slender reddish or green stems.' },
      { trait: 'Basal and alternate', detail: 'Leaves occur both at the base and up the stem.' },
      { trait: 'Loose flower clusters', detail: 'Tiny greenish to reddish flowers in loose branched clusters.' },
    ],
    habitat:
      'Fields, pastures, meadows, lawns, roadsides and disturbed open places; frequently on acidic, relatively low-fertility soil.',
    lookalikes: [
      {
        commonName: 'Other docks and sorrels',
        scientificName: 'Rumex spp.',
        distinguishBy:
          'The small arrow-shaped leaves separate sheep sorrel clearly from broadleaf and curly docks.',
      },
    ],
    sourceIds: [],
  },

  'rhus-spp': {
    identification: [
      { trait: 'Shrub or small tree', detail: 'Woody, and may form colonies.' },
      { trait: 'Pinnate compound leaves', detail: 'Alternate on the stem.' },
      { trait: 'Red fruit clusters', detail: 'Common non-poisonous North American sumacs often carry dense clusters of red fruit.' },
      { trait: 'Twigs vary', detail: 'Some species have hairy twigs, others smooth twigs or winged leaf axes — not universal characters.' },
    ],
    habitat:
      'Many Rhus species grow in dry open places, woodland edges, roadsides, old fields and disturbed slopes, often forming colonies.',
    lookalikes: [
      {
        commonName: 'Poison sumac',
        scientificName: 'Toxicodendron vernix',
        distinguishBy:
          'Poison sumac grows in consistently wet or swampy habitat and bears pale or whitish fruits, rather than the dense red fruit clusters typical of the common sumacs.',
        risk: 'Do not treat this short comparison as a guarantee of safe identification.',
      },
    ],
    sourceIds: ['psu-spectacular-sumacs', 'fs-usda-rhus-typhina'],
  },

  'cichorium-intybus': {
    identification: [
      { trait: 'Coarse rosette', detail: 'The basal rosette can resemble a coarse dandelion.' },
      { trait: 'Stiff branching stems', detail: 'Mature plants send up wiry branched stems.' },
      { trait: 'Sky-blue heads', detail: 'Blue to blue-violet heads of strap-shaped ray flowers.' },
      { trait: 'Clasping upper leaves', detail: 'Upper leaves become small and may clasp the stem.' },
      { trait: 'Nearly leafless look', detail: 'From a distance the mature plant can appear almost bare.' },
    ],
    habitat: 'Roadsides, fields, pastures, waste ground and dry disturbed sunny sites.',
    lookalikes: [
      {
        commonName: 'Dandelion at the rosette stage',
        scientificName: 'Taraxacum officinale',
        distinguishBy:
          'Mature chicory carries multiple blue heads on branched stems; dandelion carries single yellow heads on separate hollow unbranched stalks.',
      },
    ],
    sourceIds: ['wisc-chicory'],
  },

  'arctium-lappa': {
    identification: [
      { trait: 'Very large leaves', detail: 'Broad, heart-shaped to ovate.' },
      { trait: 'Pale woolly underside', detail: 'Leaf undersides often paler, whitish and somewhat woolly.' },
      { trait: 'Thistle-like heads', detail: 'Tall flowering stems carry purple heads.' },
      { trait: 'Hooked burs', detail: 'Mature heads become round burs that attach readily to clothing and fur.' },
    ],
    habitat: 'Roadsides, farmyards, old fields, fence rows, waste places and rich disturbed soils.',
    lookalikes: [
      {
        commonName: 'Rhubarb and other large-leaved plants',
        distinguishBy: "Burdock's hooked burs are highly distinctive once the plant matures.",
      },
    ],
    sourceIds: [],
  },

  'mentha-canadensis': {
    identification: [
      { trait: 'Square stems', detail: 'Typically square in cross-section.' },
      { trait: 'Opposite leaves', detail: 'Often with toothed margins.' },
      { trait: 'Strongly aromatic', detail: 'Foliage smells distinctly minty when crushed.' },
      { trait: 'Clustered small flowers', detail: 'Small tubular flowers in clusters or spikes depending on species.' },
    ],
    habitat:
      'Many mints favour moist soils, stream margins, wet meadows, ditches and damp ground, though exact ecology varies by species.',
    lookalikes: [
      {
        commonName: 'Other mint-family plants',
        distinguishBy:
          'Square stems and opposite leaves establish the family; aroma and reproductive detail are what identify a mint.',
      },
    ],
    genusTraitsNote:
      'These traits are shared across the genus; confirm the species.',
    sourceIds: [],
  },

  'nepeta-cataria': {
    identification: [
      { trait: 'Square stems', detail: 'A mint-family character.' },
      { trait: 'Grey-green leaves', detail: 'Opposite, triangular-ovate to heart-shaped, coarsely round-toothed.' },
      { trait: 'Soft and downy', detail: 'Foliage soft or downy, and strongly aromatic.' },
      { trait: 'Spotted pale flowers', detail: 'Small white to pale-lavender tubular flowers, commonly purple-spotted.' },
    ],
    habitat: 'Gardens, roadsides, field edges, waste places and disturbed soils; also commonly cultivated.',
    lookalikes: [
      {
        commonName: 'Lemon balm',
        scientificName: 'Melissa officinalis',
        distinguishBy:
          'Catnip is greyer, softer and downier with its own characteristic odour; lemon balm is greener, wrinkled and strongly lemon-scented.',
      },
    ],
    sourceIds: [],
  },

  'capsella-bursa-pastoris': {
    identification: [
      { trait: 'Lobed basal rosette', detail: 'Leaves variably lobed.' },
      { trait: 'Four white petals', detail: 'Small mustard-family flowers on slender stems.' },
      { trait: 'Purse-shaped pods', detail: 'Flat triangular to heart-shaped seedpods along the stem — the strongest field character.' },
    ],
    habitat: 'Gardens, lawns, fields, sidewalk edges, roadsides, crop ground and disturbed open soil.',
    lookalikes: [
      {
        commonName: 'Other small mustard-family weeds',
        distinguishBy:
          'The triangular or heart-shaped seedpods separate shepherd’s purse from most similar small mustards.',
      },
    ],
    sourceIds: [],
  },

  'prunella-vulgaris': {
    identification: [
      { trait: 'Low mint-family perennial', detail: 'Square stems, opposite leaves, spreads into low patches.' },
      { trait: 'Club-like flower head', detail: 'Dense short terminal head of purple-violet tubular flowers among overlapping bracts.' },
      { trait: 'Browning head', detail: 'The head often turns brown as it matures.' },
    ],
    habitat: 'Lawns, meadows, woodland edges, roadsides, paths and moist open ground; tolerates partial shade.',
    lookalikes: [
      {
        commonName: 'Bugleweed and other low mint-family plants',
        scientificName: 'Ajuga spp.',
        distinguishBy:
          'Self-heal has a compact cylindrical or club-like terminal head with overlapping bracts.',
      },
    ],
    sourceIds: [],
  },

  'verbascum-thapsus': {
    identification: [
      { trait: 'Woolly basal rosette', detail: 'First year: a large rosette of thick grey-green leaves.' },
      { trait: 'Velvety texture', detail: 'Leaves densely covered in soft woolly hairs.' },
      { trait: 'Tall second-year spike', detail: 'A single upright flowering stalk.' },
      { trait: 'Dense yellow spike', detail: 'Numerous five-petalled yellow flowers along a terminal spike.' },
      { trait: 'Clasping upper leaves', detail: 'Upper leaves become smaller and partly clasp the stem.' },
    ],
    habitat: 'Roadsides, gravel, fields, waste places, recently burned sites and other dry disturbed soils.',
    lookalikes: [
      {
        commonName: 'Other mulleins',
        scientificName: 'Verbascum spp.',
        distinguishBy:
          'Very large woolly basal leaves together with a tall dense yellow spike is characteristic of common mullein.',
      },
    ],
    sourceIds: [],
  },

  'equisetum-arvense': {
    identification: [
      { trait: 'Jointed ridged stems', detail: 'Distinctly segmented, with ridges running the length.' },
      { trait: 'Bottle-brush whorls', detail: 'Green vegetative stems carry whorls of slender branches at the nodes.' },
      { trait: 'Sheaths, not leaves', detail: 'Tiny scale-like leaves form sheaths at the joints instead of broad leaves.' },
      { trait: 'Separate fertile shoots', detail: 'May emerge early, ending in cone-like spore structures.' },
      { trait: 'Rhizome colonies', detail: 'Spreads extensively underground.' },
    ],
    habitat: 'Moist soil, streambanks, ditches, roadsides, fields and disturbed areas; often persistent in damp ground.',
    lookalikes: [
      {
        commonName: 'Other horsetails and scouring rushes',
        scientificName: 'Equisetum spp.',
        distinguishBy:
          'Separating Equisetum species requires stem sheath, branch and reproductive characters.',
      },
    ],
    sourceIds: [],
  },

  'allium-vineale': {
    identification: [
      { trait: 'Grows from a bulb', detail: 'A bulb or bulb-like underground structure.' },
      { trait: 'Grass-like leaves', detail: 'Narrow, either flat or hollow depending on species.' },
      { trait: 'Rounded umbels', detail: 'Flowers usually in rounded heads.' },
      { trait: 'Onion or garlic odour', detail: 'True Allium foliage and bulbs release it when crushed.' },
    ],
    habitat:
      'Varies by species. Lawns, meadows, open woods, fields and disturbed ground are common habitats for wild North American Allium.',
    lookalikes: [
      {
        commonName: 'Death camas',
        scientificName: 'Toxicoscordion spp.',
        distinguishBy: 'Death camas does not have the characteristic onion or garlic odour of a true Allium.',
        risk: 'Odour alone must NOT be treated as proof that a wild plant is safe to eat. Verify the species independently before any consumption decision.',
      },
    ],
    genusTraitsNote:
      'These traits are shared across the genus; confirm the species.',
    sourceIds: ['osu-meadow-deathcamas', 'usu-foothill-deathcamas'],
  },

  'fragaria-virginiana': {
    identification: [
      { trait: 'Three toothed leaflets', detail: 'The basic strawberry leaf.' },
      { trait: 'Runners', detail: 'Spreads by above-ground stolons.' },
      { trait: 'White flowers', detail: 'Five white petals around a yellow centre.' },
      { trait: 'Achenes on the surface', detail: 'Small red fruit with the seeds visible over its surface.' },
    ],
    habitat: 'Meadows, open woods, forest edges, lawns and fields, in sun to partial shade.',
    lookalikes: [
      {
        commonName: 'Mock or Indian strawberry',
        scientificName: 'Potentilla indica',
        distinguishBy: 'Mock strawberry generally has yellow flowers; Fragaria virginiana has white ones.',
      },
    ],
    sourceIds: [],
  },

  'sambucus-spp': {
    identification: [
      { trait: 'Woody shrub or small tree', detail: 'Multi-stemmed and often wider than tall.' },
      { trait: 'Opposite leaves', detail: 'Arranged opposite each other on the stem.' },
      { trait: 'Pinnate compound', detail: 'Multiple serrated leaflets per leaf.' },
      { trait: 'Broad flower clusters', detail: 'Numerous small flowers in wide clusters.' },
      { trait: 'Berry-like fruit', detail: 'In clusters; colour and cluster form vary by species.' },
    ],
    habitat:
      'Many elderberries occur along streambanks, wet thickets, woodland margins and ditches, though ecology varies by species.',
    lookalikes: [
      {
        commonName: 'Pokeweed',
        scientificName: 'Phytolacca americana',
        distinguishBy:
          'Pokeweed has simple ALTERNATE leaves and dark fruits on elongated racemes; elderberry has opposite, pinnately compound leaves.',
        risk: 'Do not identify elderberry by flower or fruit colour alone. Some unrelated plants with white umbrella-like flowers are dangerous, and neither Sambucus species nor plant parts are interchangeable.',
      },
    ],
    sourceIds: ['psu-elderberry-garden-kitchen', 'fs-usda-sambucus-nigra', 'psu-common-pokeweed', 'fs-usda-phytolacca-americana'],
  },

  'hypericum-perforatum': {
    identification: [
      { trait: 'Upright and branching', detail: 'A perennial whose stems often redden with age.' },
      { trait: 'Stalkless opposite leaves', detail: 'Narrow-oblong, held close to the stem.' },
      { trait: 'Translucent oil glands', detail: 'Held to the light, the leaves show tiny dots that look like perforations.' },
      { trait: 'Yellow flowers, many stamens', detail: 'Five petals around a dense boss of stamens.' },
      { trait: 'Dark glandular dots', detail: 'Petal or leaf margins can show them.' },
    ],
    habitat: 'Fields, pastures, roadsides, open slopes and disturbed land on sunny, relatively dry sites.',
    lookalikes: [
      {
        commonName: "Dotted St. John's wort and other Hypericum",
        scientificName: 'Hypericum punctatum',
        distinguishBy:
          'Use gland pattern, stem characters and reproductive detail — yellow flower colour alone does not separate the species.',
      },
    ],
    sourceIds: [],
  },

  'achillea-millefolium': {
    identification: [
      { trait: 'Feathery leaves', detail: 'Finely divided, fern-like and aromatic.' },
      { trait: 'Upright stems', detail: 'Rising from spreading rhizomes; may form patches.' },
      { trait: 'Flat-topped clusters', detail: 'Numerous tiny white to pale-pink heads in a broad flat cluster.' },
    ],
    habitat:
      'Meadows, fields, roadsides, prairies, open woods and sunny disturbed ground; tolerant of dry, poor soils.',
    lookalikes: [
      {
        commonName: 'White-flowered carrot-family plants',
        distinguishBy:
          "Yarrow's foliage is finely divided and feather-like, and its flat cluster is made of many small daisy-family heads rather than a true carrot-family compound umbel.",
        risk: 'Do not treat flower-cluster shape on its own as sufficient identification.',
      },
    ],
    sourceIds: ['fs-usda-achillea-millefolium', 'psu-poison-hemlock-id', 'umn-poison-hemlock'],
  },

  'impatiens-capensis': {
    identification: [
      { trait: 'Juicy translucent stems', detail: 'Soft and succulent.' },
      { trait: 'Coarsely toothed leaves', detail: 'Alternate and oval.' },
      { trait: 'Hanging spotted flowers', detail: 'Orange to orange-yellow with reddish spotting.' },
      { trait: 'Curved nectar spur', detail: 'A distinctive hook at the back of the flower.' },
      { trait: 'Exploding pods', detail: 'Mature seedpods burst open when touched.' },
    ],
    habitat: 'Streambanks, floodplains, marsh edges, wet woods, swampy ground and shaded ditches.',
    lookalikes: [
      {
        commonName: 'Pale jewelweed',
        scientificName: 'Impatiens pallida',
        distinguishBy: 'Pale jewelweed generally bears pale yellow flowers; Impatiens capensis is typically orange and spotted.',
      },
    ],
    sourceIds: [],
  },

  'melissa-officinalis': {
    identification: [
      { trait: 'Square stems', detail: 'A mint-family character.' },
      { trait: 'Wrinkled opposite leaves', detail: 'Ovate to heart-shaped, with toothed or scalloped margins.' },
      { trait: 'Lemon fragrance', detail: 'Crushed foliage smells strongly of lemon.' },
      { trait: 'Pale axillary flowers', detail: 'Small white to pale flowers around the upper leaf axils.' },
    ],
    habitat:
      'Gardens and herb beds, but also naturalised along roadsides, disturbed areas and open ground, in sun to partial shade.',
    lookalikes: [
      {
        commonName: 'Catnip',
        scientificName: 'Nepeta cataria',
        distinguishBy: 'Lemon balm is greener and strongly lemon-scented; catnip is greyer, softer and downier.',
      },
    ],
    sourceIds: [],
  },

  'monarda-fistulosa': {
    identification: [
      { trait: 'Square stems', detail: 'A mint-family character.' },
      { trait: 'Opposite toothed leaves', detail: 'Aromatic when crushed.' },
      { trait: 'Shaggy terminal heads', detail: 'Dense rounded heads of tubular flowers, pom-pom-like.' },
      { trait: 'Colour varies', detail: 'Pink, lavender, purple or reddish shades depending on species.' },
    ],
    habitat:
      'Prairies, meadows, open woods, woodland edges and stream areas, in sun to partial shade.',
    lookalikes: [
      {
        commonName: 'Other bergamots and mint-family plants',
        scientificName: 'Monarda spp.',
        distinguishBy:
          'Flower colour alone does not identify a Monarda — it takes additional floral and vegetative characters.',
      },
    ],
    genusTraitsNote:
      'These traits are shared across the genus; confirm the species.',
    sourceIds: [],
  },

  'rosa-spp': {
    identification: [
      { trait: 'Prickled canes', detail: 'Woody shrubs or arching, climbing canes; prickle density varies.' },
      { trait: 'Pinnate compound leaves', detail: 'Alternate, with toothed leaflets.' },
      { trait: 'Five petals', detail: 'Wild-type roses commonly have five.' },
      { trait: 'Rose hips', detail: 'Flowers develop into fleshy hips.' },
    ],
    habitat:
      'Thickets, forest edges, fields, roadsides, dunes, stream margins and open habitats depending on species.',
    lookalikes: [
      {
        commonName: 'Blackberries and raspberries',
        scientificName: 'Rubus spp.',
        distinguishBy: 'Roses develop rose hips; Rubus develops aggregate blackberry- or raspberry-type fruit.',
      },
    ],
    sourceIds: [],
  },

  'salix-spp': {
    identification: [
      { trait: 'Woody shrub or tree', detail: 'Frequently with flexible twigs.' },
      { trait: 'Simple alternate leaves', detail: 'Many common willows are narrow and lance-shaped, but leaf shape varies considerably.' },
      { trait: 'Catkins', detail: 'Flowers occur in catkins.' },
      { trait: 'Water-loving', detail: 'Strongly associated with moist ground.' },
    ],
    habitat:
      'Streambanks, river margins, pond and lake edges, wetlands, floodplains and moist low ground. Exact preferences vary by species.',
    lookalikes: [
      {
        commonName: 'Narrow-leaved riparian shrubs',
        distinguishBy:
          'Narrow leaf shape alone is not proof of Salix; willows need leaves, stipules, catkins and further characters to name a species.',
      },
    ],
    sourceIds: [],
  },

  'geranium-maculatum': {
    identification: [
      { trait: 'Woodland perennial', detail: 'Generally around one to two feet tall.' },
      { trait: 'Palmate leaves', detail: 'Divided into five main lobes; upper leaves may have fewer.' },
      { trait: 'Coarse teeth', detail: 'Leaf margins coarsely toothed.' },
      { trait: 'Veined pink flowers', detail: 'Pink to lilac, five petals, with darker veins.' },
      { trait: 'Cranesbill fruit', detail: 'The long pointed beak characteristic of Geranium.' },
    ],
    habitat:
      'Rich deciduous woods, woodland edges and mesic forest, generally in light shade to partial sun on moderately moist soil.',
    lookalikes: [
      {
        commonName: 'Other cranesbills',
        scientificName: 'Geranium spp.',
        distinguishBy:
          'Separating Geranium species may need leaf dissection, flower size, hairs and fruit characters together.',
      },
    ],
    sourceIds: [],
  },

  'lonicera-japonica': {
    identification: [
      { trait: 'Shrub or vine', detail: 'Woody, with habit varying substantially between species.' },
      { trait: 'Opposite leaves', detail: 'Generally arranged opposite each other.' },
      { trait: 'Paired tubular flowers', detail: 'Often in pairs or clusters.' },
      { trait: 'Berry-like fruit', detail: 'Red, orange, black or other colours depending on species.' },
    ],
    habitat:
      'Woodland edges, thickets, forests, fence rows and disturbed areas, with substantial variation by species.',
    lookalikes: [
      {
        commonName: 'Other honeysuckles',
        scientificName: 'Lonicera spp.',
        distinguishBy:
          'Native and invasive honeysuckles differ substantially in growth habit and diagnostic characters; which one you have decides what is known about it.',
        risk: 'There is no blanket edibility statement for "honeysuckle". Lonicera species differ chemically and some fruits are not considered edible. Species-level identification is required before relying on any species-specific use information.',
      },
    ],
    genusTraitsNote:
      'These traits are shared across the genus; confirm the species.',
    sourceIds: [],
  },

  'pinus-spp': {
    identification: [
      { trait: 'Evergreen tree', detail: 'Woody, with resinous twigs and buds.' },
      { trait: 'Needles in bundles', detail: 'True pine needles grow in fascicles, usually of two to five depending on species.' },
      { trait: 'Woody cones', detail: 'Seed cones with overlapping scales.' },
      { trait: 'Counts matter', detail: 'Needle number, needle length and cone detail are the species-level characters.' },
    ],
    habitat:
      'Highly variable by species — forests, ridges, dry uplands, sandy soils, mountains, wetlands and cultivated landscapes.',
    lookalikes: [
      {
        commonName: 'Yew',
        scientificName: 'Taxus spp.',
        distinguishBy:
          'Yews carry individual flat needles attached singly, not bundled in fascicles, and female yews bear red fleshy arils rather than woody cones.',
        risk: 'Generic evergreen needles are not sufficient identification of a pine.',
      },
    ],
    sourceIds: ['wisc-pine-trees-101', 'psu-yew-toxicity'],
  },

  'morus-spp': {
    identification: [
      { trait: 'Deciduous tree', detail: 'Alternate, usually toothed leaves.' },
      { trait: 'Leaves vary on one tree', detail: 'Unlobed or deeply lobed, sometimes both on the same tree.' },
      { trait: 'Milky latex', detail: 'Broken young tissue may release it.' },
      { trait: 'Stretched-blackberry fruit', detail: 'Elongated aggregate clusters.' },
      { trait: 'Fruit colour varies', detail: 'Red, purple, black or pale depending on species or cultivar.' },
    ],
    habitat:
      'Woodland edges, roadsides, fence lines, disturbed ground, fields and urban areas. Some mulberries readily naturalise.',
    lookalikes: [
      {
        commonName: 'Red, white and hybrid mulberries; paper mulberry',
        distinguishBy:
          'These are difficult to separate, and paper mulberry also has variable lobed leaves — which is why this profile stays at genus level.',
      },
    ],
    sourceIds: [],
  },

  'passiflora-incarnata': {
    identification: [
      { trait: 'Climbing vine', detail: 'Herbaceous, with coiling tendrils, arising from persistent underground roots.' },
      { trait: 'Three-lobed leaves', detail: 'Alternate and typically deeply lobed.' },
      { trait: 'Fringed corona', detail: 'White and lavender petals and sepals around a purple-and-white fringe.' },
      { trait: 'Egg-shaped fruit', detail: 'Green, maturing yellowish.' },
    ],
    habitat:
      'Open woods, woodland edges, fields, roadsides, fence lines and disturbed sunny areas, especially in the southeastern United States.',
    lookalikes: [
      {
        commonName: 'Other passionflowers',
        scientificName: 'Passiflora spp.',
        distinguishBy:
          'The fringed flower is highly distinctive, but confirm the species using leaf, flower and fruit characters together.',
      },
    ],
    sourceIds: [],
  },

  'lactuca-serriola': {
    identification: [
      { trait: 'Prickly midrib', detail: 'A row of prickles runs along the underside of the central midrib — the key character.' },
      { trait: 'Bluish-green foliage', detail: 'Upright and branching.' },
      { trait: 'Deeply lobed leaves', detail: 'Alternate; upper leaves often clasp the stem.' },
      { trait: 'Pale yellow heads', detail: 'Small, on branching upper stems.' },
      { trait: 'Milky latex', detail: 'Broken tissue releases it; seeds develop white hair tufts like miniature dandelion clocks.' },
    ],
    habitat: 'Roadsides, fields, pastures, vacant lots and disturbed ground, often on nutrient-rich soils.',
    lookalikes: [
      {
        commonName: 'Sow-thistles and other daisy-family weeds',
        distinguishBy:
          'The row of prickles along the underside of the leaf midrib is the important Lactuca serriola character.',
      },
    ],
    sourceIds: [],
  },

  'quercus-spp': {
    identification: [
      { trait: 'Woody tree or shrub', detail: 'Alternate, simple leaves.' },
      { trait: 'Leaf form varies wildly', detail: 'Rounded lobes, pointed lobes, toothed or nearly entire margins depending on species.' },
      { trait: 'The acorn', detail: 'A nut partly enclosed by a scaly cup — the defining fruit.' },
      { trait: 'Species need more', detail: 'Bud, bark, leaf and acorn characters together identify an oak to species.' },
    ],
    habitat:
      'Extremely diverse — forests, woodlands, ridges, bottomlands, dry uplands, wetlands and urban landscapes across North America.',
    lookalikes: [
      {
        commonName: 'Beeches and chestnuts',
        distinguishBy: 'Neither produces acorns. The acorn is the strongest genus-level oak character.',
      },
    ],
    sourceIds: [],
  },
};

export function fieldNotesFor(herb: Herb): FieldNotes | null {
  return FIELD_NOTES[herb.id] ?? null;
}

/**
 * The field notes' own sources, in the shape `sectionCitations` and `countSources` already
 * take, so a plant page cites them through the existing citation path rather than a second
 * one beside it.
 *
 * WHY THIS MATTERS EVEN THOUGH NOTHING RENDERS TODAY. `SOURCEABLE_SECTIONS` already
 * contains `identification` and `habitat`, so the sources block was reporting both as "not
 * separately sourced yet" while this layer was carrying sources for exactly them. That is
 * true right now only because every field-note source is `verified: false` and `resolveRefs`
 * drops it. Routing them through here means the page tells the truth today AND keeps
 * telling it the moment somebody opens a source and flips the flag — with no second edit,
 * which is the edit that would have been forgotten.
 */
export function fieldNoteSectionSources(
  herb: Herb,
): Partial<Record<SourceableSection, SourceRef[]>> {
  const notes = fieldNotesFor(herb);
  if (!notes?.sourceIds.length) return {};
  const refs: SourceRef[] = notes.sourceIds.map((sourceId) => ({
    sourceId,
    detail: 'Field notes added by Plantdex',
  }));
  const out: Partial<Record<SourceableSection, SourceRef[]>> = {};
  if (notes.identification?.length || notes.lookalikes?.length) out.identification = refs;
  if (notes.habitat) out.habitat = refs;
  return out;
}
