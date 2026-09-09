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
  /**
   * A CLASS's shared core skeleton — never a member of it.
   *
   * A flavonoid is DEFINED by its C6-C3-C6 core, so drawing that core is a true statement
   * about every flavonoid; drawing one flavonoid and labelling it "Flavonoids" would be
   * false. Kept as a field separate from `structure` on purpose: the rule that a
   * chemical-class may never carry a `structure` stays exactly as written and keeps failing
   * the build, and the renderer draws a scaffold ghosted and captioned "Shared core" so the
   * two can never be read as the same claim.
   *
   * ONLY for classes with one genuine defining skeleton. Tannins (hydrolysable versus
   * condensed), saponins (triterpenoid versus steroidal), alkaloids and glycosides have
   * none and deliberately get no scaffold — that restraint is what makes the rest credible.
   */
  scaffold?: string;
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

const family = (note: string, scaffold?: string): Omit<CompoundEntry, 'id'> => ({
  kind: 'chemical-class',
  note,
  ...(scaffold ? { scaffold } : {}),
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
  /*
   * Card #24's three, which arrived with the August reprint — until then Catnip printed
   * Sumac's back and named none of them. They shipped captioned-but-undrawn for one commit,
   * which put three placeholder boxes on the one card whose signature compound a reader
   * actually comes looking for, so the drawings followed. `citronellal` below is the
   * aldehyde and a different molecule; all three share one skeleton in the generator.
   */
  nepetalactone: molecule('nepetalactone', 'An iridoid lactone'),
  citronellol: molecule('citronellol', 'A monoterpene alcohol'),
  geraniol: molecule('geraniol', 'A monoterpene alcohol'),
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
  'ursolic acid': molecule('ursolic-acid', 'A pentacyclic triterpenoid'),
  allicin: molecule('allicin', 'An organosulfur compound'),
  genistein: molecule('genistein', 'An isoflavone'),
  aucubin: molecule('aucubin', 'An iridoid glycoside'),
  arctiin: molecule(undefined, 'A lignan glycoside'),
  sinigrin: molecule('sinigrin', 'A glucosinolate'),
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
  salicin: molecule('salicin', 'A salicylate glycoside'),
  geraniin: molecule(undefined, 'An ellagitannin'),
  harmine: molecule('harmine', 'A beta-carboline alkaloid'),
  harmaline: molecule('harmaline', 'A beta-carboline alkaloid'),
  vitexin: molecule('vitexin', 'Apigenin carrying a C-linked glucose'),
  verbascoside: molecule(undefined, 'A phenylethanoid glycoside'),
  quebecol: molecule(undefined, 'A polyphenol first described in maple syrup'),
  sucrose: molecule(undefined, 'A disaccharide'),
  lactucin: molecule('lactucin', 'A guaianolide sesquiterpene lactone'),
  // Lactucin esterified at C8 with 4-hydroxyphenylacetic acid: the same skeleton plus one
  // arm, drawn from the same builder rather than borrowing lactucin's plate.
  lactucopicrin: molecule('lactucopicrin', 'A guaianolide sesquiterpene lactone'),

  // ── Families, not molecules ─────────────────────────────────────────────────
  flavonoids: family(
    'The C6-C3-C6 core every flavonoid is built on. Individual compounds differ in how it is oxidised and hydroxylated.',
    'flavonoid-core',
  ),
  tannins: family('A group of plant polyphenols that bind proteins, not one compound.'),
  saponins: family('A group of glycosides that foam in water, not one compound.'),
  anthocyanins: family(
    'The flavylium core every anthocyanin shares; individual pigments differ in their sugars and hydroxyls. The charge on its oxygen is why the colour shifts with acidity.',
    'flavylium-core',
  ),
  polyphenols: family('A very broad group of plant compounds, not one molecule.'),
  phenolics: family('A very broad group of plant compounds, not one molecule.'),
  'phenolic acid': family('A group of phenolic compounds, not one molecule.'),
  coumarins: family(
    'The benzopyranone core every coumarin shares. Coumarin itself is the parent of the group.',
    'coumarin-core',
  ),
  iridoids: family(
    'The cyclopenta[c]pyran core every iridoid shares. Individual compounds differ around it.',
    'iridoid-core',
  ),
  catechins: family(
    'Every catechin is a flavan-3-ol — the name is the skeleton. Individual catechins differ '
      + 'in how the two rings are hydroxylated.',
    'catechin-core',
  ),
  'sesquiterpene lactones': family('A group of terpenoid lactones, not one molecule.'),
  lactones: family('A structural class of cyclic esters, not one molecule.'),
  anthraquinones: family(
    'The 9,10-anthraquinone core the group is named for. Individual compounds differ in what hangs off it.',
    'anthraquinone-core',
  ),
  glucosinolates: family(
    'Every glucosinolate is this thioglucoside and sulfonated oxime; individual '
      + 'glucosinolates differ only in the side chain drawn here as R. Sinigrin is this core '
      + 'with an allyl side chain.',
    'glucosinolate-core',
  ),
  isothiocyanates: family('A group of sulfur compounds, not one molecule.'),
  isoflavones: family('A group of flavonoids, not one molecule.'),
  glycosides: family('Any compound bound to a sugar — a structural class, not a molecule.'),
  alkaloids: family('A broad group of nitrogen-containing compounds, not one molecule.'),
  lignans: family('A group of plant polyphenols, not one molecule.'),
  terpenes: family('A very large family of plant hydrocarbons, not one molecule.'),
  carotenoids: family('A group of pigment terpenoids, not one molecule.'),
  betalains: family(
    'Every betalain is betalamic acid joined through this aldehyde to an amine; individual '
      + 'pigments differ in what it joins to, which is what makes some red and some yellow.',
    'betalain-core',
  ),
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
    // The SiO4 tetrahedron every silicate is built from — a structural depiction of a
    // mineral compound, which is what silica is. Still never an element tile.
    structure: 'silica-tetrahedron',
    note: 'Built from SiO4 tetrahedra sharing their oxygens. A compound of silicon and oxygen, not elemental silicon.',
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

/**
 * WHY A NAMED MOLECULE IS STILL NOT DRAWN.
 *
 * Every entry here is a specific compound — not a class — that the deck prints and this
 * module classifies as `molecule`, but which carries no `structure`. Leaving that
 * unexplained is how the list rots: the next person cannot tell a molecule nobody has got
 * to yet from one that was tried and rejected, so they either redraw a known failure or
 * treat a deliberate omission as a gap to be filled badly.
 *
 * Two reasons recur, and they are different:
 *
 *   LEGIBILITY — the connectivity is certain, but the plate is a scribble at the size it
 *   renders. `scripts/chemistry/mol.py`'s `legibility()` scores this; the drawn glycosides
 *   sit at 14–22 (salicin 15, vitexin 14.4), and the ones below are far larger. A scribble
 *   that claims to be a structure is worse than no structure, because a reader cannot tell
 *   the difference and it spends the credibility the accurate ones earn.
 *
 *   IDENTITY — the compound is not characterised well enough to draw at all. Drawing a
 *   guess would be inventing chemistry, which is the same offence as inventing botany.
 *
 * `compounds.test.ts` keeps this map and the real undrawn set equal in BOTH directions, so
 * a molecule that gains art must lose its entry here, and a newly undrawn one must gain one.
 */
export const UNDRAWN_MOLECULES: Record<string, string> = {
  taraxasterol:
    'LEGIBILITY. A pentacyclic triterpene like ursolic acid, but with no substituent to give ' +
    'the plate a focal point, so at plate size it reads as an undifferentiated raft of rings.',
  rutin:
    'LEGIBILITY. Quercetin plus a rutinose DISACCHARIDE — 43 heavy atoms, two sugars fanning ' +
    'twelve hydroxyls over the flavonol. Vitexin, drawn, is the same shape with one sugar.',
  'ellagic acid':
    'LEGIBILITY, and specifically a geometry this generator cannot build. Both lactone rings ' +
    'share the central biaryl bond, so the four rings are peri-fused rather than edge-fused; ' +
    'off a regular hexagon lattice the rings overlap and the bridges cut through them. It was ' +
    'attempted and rejected once already. Drawing it needs hand-placed coordinates, which is ' +
    'the one thing the chemistry generator does not permit.',
  quebecol:
    'IDENTITY. A triarylpropane first described in maple syrup; this codebase could not ' +
    'establish its substitution pattern from an authoritative source, and the databases that ' +
    'would settle it are unreachable from the build environment.',
  sucrose:
    'NOT YET DRAWN, and the only entry here with no objection to it. Glucose alpha-1,2 ' +
    'fructose needs a fructoFURANOSE, the one sugar ring `mol.py` has no helper for.',
  arctiin:
    'LEGIBILITY. Arctigenin plus a glucose: 38 heavy atoms, and the two benzyl arms hang off ' +
    'the lactone on rotatable bonds, so the 2D layout is arbitrary rather than determined by ' +
    'a rigid skeleton. This is why card #22 Burdock legitimately shows no structure.',
  verbascoside:
    'LEGIBILITY. 44 heavy atoms with TWO sugars, larger than rutin. This is why card #27 ' +
    'Mullein legitimately shows no structure.',
  hypericin:
    'LEGIBILITY. A naphthodianthrone: eight fused rings carrying eight substituents, which at ' +
    'plate size is a solid block of ink rather than a readable skeleton.',
  hyperforin:
    'IDENTITY. A bridged prenylated phloroglucinol whose stereochemistry and prenyl placement ' +
    'this codebase could not establish confidently enough to draw.',
  achilleine:
    'IDENTITY. Poorly characterised in the literature. The card names it, so the deck names ' +
    'it, but assigning it a skeleton would be inventing the compound.',
  salicortin:
    'LEGIBILITY. Salicin plus a cyclohexenone ester — substantially larger than the salicin ' +
    'that is drawn on the same card, which already carries #38 Willow.',
  tremulacin:
    'LEGIBILITY. Salicortin plus a benzoyl group, larger again — and on the same card as ' +
    'salicin, which is drawn and carries #38 Willow on its own.',
  geraniin:
    'LEGIBILITY. An ellagitannin at 68 heavy atoms; far beyond anything this plate can hold.',
};
