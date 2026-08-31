/**
 * What the deck's "Signature Compounds" actually ARE.
 *
 * 45 cards print 82 distinct compound strings between them, and they are not all the same
 * kind of thing. "Quercetin" is one molecule. "Flavonoids" is a family of thousands.
 * "Inulin" is a polymer of variable length. "Citral" is a mixture of two isomers.
 * "Silica" is a compound, not the element silicon. Drawing one benzene ring for all five
 * would be a scientific lie told in a nice typeface, so this module classifies first and
 * the plate draws second.
 *
 * The rule the renderer must keep: a mixture, a polymer, a family or a mineral compound may
 * NEVER render as a single named molecule. `compounds.test.ts` pins that.
 *
 * `herbs.json` is untouched — this is a curated layer over it, the same pattern as
 * `card-issues.ts` and `card-field-notes.ts`. Card wording is what the reader sees; this
 * only decides what is drawn beside it and what caption goes underneath.
 */

export type CompoundKind =
  | 'molecule'
  | 'chemical-class'
  | 'polymer'
  | 'mixture'
  /** An element: Ca, Fe, Mg, K. */
  | 'mineral'
  /** A mineral COMPOUND, e.g. silica (SiO2). Never rendered as an element tile. */
  | 'mineral-compound';

export interface CompoundEntry {
  /** Case- and whitespace-normalised slug of the card's own wording. */
  id: string;
  kind: CompoundKind;
  /** The precise reading, where it differs from what the card prints. */
  subtitle?: string;
  /** Key into `STRUCTURES`. Absent means no drawing — the plate stays pending. */
  structure?: string;
  /** For mixtures and ambiguous names: what it is actually made of. */
  components?: string[];
  /** Element symbol and atomic number, for `mineral`. */
  symbol?: string;
  atomicNumber?: number;
  /** For `mineral-compound`: the formula, rendered as such. */
  formula?: string;
  /** One honest sentence. Never an effect claim — the test forbids the vocabulary. */
  note?: string;
}

function normalise(printed: string): string {
  return printed.trim().toLowerCase().replace(/\s+/g, ' ');
}

const molecule = (structure?: string, subtitle?: string): Omit<CompoundEntry, 'id'> => ({
  kind: 'molecule',
  ...(structure ? { structure } : {}),
  ...(subtitle ? { subtitle } : {}),
});

const family = (note: string): Omit<CompoundEntry, 'id'> => ({
  kind: 'chemical-class',
  note,
});

const element = (symbol: string, atomicNumber: number): Omit<CompoundEntry, 'id'> => ({
  kind: 'mineral',
  symbol,
  atomicNumber,
});

const TABLE: Record<string, Omit<CompoundEntry, 'id'>> = {
  // ── Molecules with a structure drawn ────────────────────────────────────────
  quercetin: molecule('quercetin', 'A flavonol'),
  kaempferol: molecule('kaempferol', 'A flavonol'),
  menthol: molecule('menthol', 'A monoterpene alcohol'),
  menthone: molecule('menthone', 'A monoterpene ketone'),
  limonene: molecule('limonene', 'A cyclic monoterpene'),
  thymol: molecule('thymol', 'A monoterpene phenol'),
  carvacrol: molecule('carvacrol', 'Isomer of thymol'),
  'gallic acid': molecule('gallic-acid', 'A phenolic acid'),
  'oxalic acid': molecule('oxalic-acid', 'A dicarboxylic acid'),
  'fumaric acid': molecule('fumaric-acid', 'A dicarboxylic acid'),
  'vitamin c': molecule('ascorbic-acid', 'Ascorbic acid'),
  allantoin: molecule('allantoin'),
  choline: molecule('choline'),
  histamine: molecule('histamine', 'A biogenic amine'),
  tyramine: molecule('tyramine', 'A biogenic amine'),

  // ── Molecules whose drawing is not shipped yet ──────────────────────────────
  // Named and captioned honestly; the plate simply carries no structure, and the reader
  // cannot tell which these are.
  rutin: molecule(undefined, 'Quercetin bound to the disaccharide rutinose'),
  taraxasterol: molecule(undefined, 'A pentacyclic triterpene'),
  resveratrol: molecule('resveratrol', 'A stilbenoid'),
  lawsone: molecule('lawsone', 'A naphthoquinone'),
  emodin: molecule('emodin', 'An anthraquinone'),
  'rosmarinic acid': molecule('rosmarinic-acid', 'A phenolic acid'),
  'chlorogenic acid': molecule('chlorogenic-acid', 'A phenolic acid'),
  'ellagic acid': molecule(undefined, 'A polyphenol'),
  'ursolic acid': molecule(undefined, 'A pentacyclic triterpenoid'),
  allicin: molecule(undefined, 'An organosulfur compound'),
  genistein: molecule('genistein', 'An isoflavone'),
  aucubin: molecule(undefined, 'An iridoid glycoside'),
  arctiin: molecule(undefined, 'A lignan glycoside'),
  sinigrin: molecule(undefined, 'A glucosinolate'),
  hypericin: molecule(undefined, 'A naphthodianthrone'),
  hyperforin: molecule(undefined, 'A phloroglucinol derivative'),
  achilleine: molecule(undefined, 'An alkaloid named on the card'),
  azulene: molecule('azulene', 'A bicyclic hydrocarbon'),
  citronellal: molecule('citronellal', 'A monoterpene aldehyde'),
  salicortin: molecule(undefined, 'A salicylate glycoside'),
  tremulacin: molecule(undefined, 'A salicylate glycoside'),
  // The card prints "Sallicin". It is transcribed as printed and recorded in
  // KNOWN_CARD_ISSUES; here it simply resolves to the compound the card means.
  sallicin: molecule('salicin', 'Salicin, a salicylate glycoside'),
  salicin: molecule(undefined, 'A salicylate glycoside'),
  geraniin: molecule(undefined, 'An ellagitannin'),
  harmine: molecule('harmine', 'A beta-carboline alkaloid'),
  harmaline: molecule('harmaline', 'A beta-carboline alkaloid'),
  vitexin: molecule(undefined, 'A flavone glycoside'),
  verbascoside: molecule(undefined, 'A phenylethanoid glycoside'),
  quebecol: molecule(undefined, 'A polyphenol first described in maple syrup'),
  sucrose: molecule(undefined, 'A disaccharide'),
  lactucin: molecule(undefined, 'A sesquiterpene lactone'),
  lactucopicrin: molecule(undefined, 'A sesquiterpene lactone'),

  // ── Families, not molecules ─────────────────────────────────────────────────
  flavonoids: family('A large family of plant polyphenols, not a single molecule.'),
  tannins: family('A group of plant polyphenols that bind proteins, not one compound.'),
  saponins: family('A group of glycosides that foam in water, not one compound.'),
  anthocyanins: family('A group of pigment flavonoids, not one compound.'),
  polyphenols: family('A very broad group of plant compounds, not one molecule.'),
  phenolics: family('A very broad group of plant compounds, not one molecule.'),
  'phenolic acid': family('A group of phenolic compounds, not one molecule.'),
  coumarins: family('A group of benzopyrone compounds, not one molecule.'),
  iridoids: family('A group of monoterpenoids, not one molecule.'),
  catechins: family('A group of flavan-3-ols, not one molecule.'),
  'sesquiterpene lactones': family('A group of terpenoid lactones, not one molecule.'),
  lactones: family('A structural class of cyclic esters, not one molecule.'),
  anthraquinones: family('A group of quinone compounds, not one molecule.'),
  glucosinolates: family('A group of sulfur-containing glycosides, not one molecule.'),
  isothiocyanates: family('A group of sulfur compounds, not one molecule.'),
  isoflavones: family('A group of flavonoids, not one molecule.'),
  glycosides: family('Any compound bound to a sugar — a structural class, not a molecule.'),
  alkaloids: family('A broad group of nitrogen-containing compounds, not one molecule.'),
  lignans: family('A group of plant polyphenols, not one molecule.'),
  terpenes: family('A very large family of plant hydrocarbons, not one molecule.'),
  carotenoids: family('A group of pigment terpenoids, not one molecule.'),
  betalains: family('A group of nitrogen-containing pigments, not one molecule.'),
  'sulfur compounds': family('A grouping by element, not a single compound.'),
  'omega-3': family('A group of fatty acids defined by where a double bond sits.'),
  // Chlorophyll a and b are DIFFERENT molecules and the card does not say which.
  chlorophyll: family('The chlorophyll family — a and b differ, and the card does not specify.'),

  // ── Polymers ────────────────────────────────────────────────────────────────
  inulin: {
    kind: 'polymer',
    subtitle: 'Fructan polymer — chain length varies',
    note: 'A chain of fructose units of no fixed length, so it has no one structure to draw.',
  },
  mucilage: {
    kind: 'polymer',
    subtitle: 'Polysaccharide mixture',
    note: 'A heterogeneous mixture of polysaccharides, not a single compound.',
  },

  // ── Mixtures and ambiguous names ────────────────────────────────────────────
  citral: {
    kind: 'mixture',
    subtitle: 'Geranial and neral',
    components: ['Geranial (E)', 'Neral (Z)'],
    note: 'A mixture of two isomers, so no single molecule stands for it.',
  },
  pinene: {
    kind: 'mixture',
    subtitle: 'Alpha- and beta-pinene',
    components: ['alpha-Pinene', 'beta-Pinene'],
    note: 'Alpha- and beta-pinene are different molecules, and the card does not say which.',
  },
  'volatile oils': {
    kind: 'mixture',
    subtitle: 'Essential oil fraction',
    note: 'The aromatic fraction of the plant — many compounds together, not one.',
  },

  // ── Minerals ────────────────────────────────────────────────────────────────
  calcium: element('Ca', 20),
  iron: element('Fe', 26),
  magnesium: element('Mg', 12),
  potassium: element('K', 19),
  // NOT an element tile: silica is silicon dioxide, not elemental silicon.
  silica: {
    kind: 'mineral-compound',
    subtitle: 'Silicon dioxide',
    formula: 'SiO2',
    note: 'A compound of silicon and oxygen, not elemental silicon.',
  },
};

export function compoundFor(printed: string): CompoundEntry | null {
  const id = normalise(printed);
  const entry = TABLE[id];
  return entry ? { id, ...entry } : null;
}

/** Every id the table knows, for tests. */
export function knownCompoundIds(): string[] {
  return Object.keys(TABLE);
}

/**
 * Plate order: the most specific content first. A reader who sees "Quercetin" and
 * "Flavonoids" side by side should meet the one that says something particular first.
 */
const KIND_ORDER: CompoundKind[] = [
  'molecule',
  'mixture',
  'polymer',
  'chemical-class',
  'mineral-compound',
  'mineral',
];

export function sortForPlate(printed: string[]): string[] {
  return [...printed].sort((a, b) => {
    const ea = compoundFor(a);
    const eb = compoundFor(b);
    const ka = ea ? KIND_ORDER.indexOf(ea.kind) : KIND_ORDER.length;
    const kb = eb ? KIND_ORDER.indexOf(eb.kind) : KIND_ORDER.length;
    if (ka !== kb) return ka - kb;
    // Within a kind, drawn structures lead — the plate should open with its best material.
    const sa = ea?.structure ? 0 : 1;
    const sb = eb?.structure ? 0 : 1;
    if (sa !== sb) return sa - sb;
    return 0;
  });
}
