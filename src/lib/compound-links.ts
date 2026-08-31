import type { Herb } from './types';

/**
 * How a compound the card names connects to the rest of that same card.
 *
 * A plate of skeletal formulas is inert on its own. What makes it worth reading is that
 * the card ALREADY says mint tastes cooling and dock tastes astringent — and these are the
 * molecules that are why. This layer joins the two.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE HONESTY MECHANIC IS IN `linksFor`, NOT IN THE DATA.
 *
 * A link surfaces only when THIS herb's card prints both the compound and the term. So the
 * feature can never introduce a claim — it can only join two things the card already says
 * next to each other. On a card that names Menthol but not "Cooling", nothing renders.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT MAY BE LINKED, AND WHAT MAY NOT. Taste and aroma are sensory facts: a person can
 * check them with their own mouth. Healing traits are almost all physiological claims, and
 * "Salicin is why willow relieves pain" is exactly the medical claim AGENTS.md forbids and
 * the deck itself does not make. So healing traits are restricted to `LINKABLE_HEALING` —
 * five entries that name a PHYSICAL or COMPOSITIONAL property rather than an effect on the
 * body. `compound-links.test.ts` fails the build if anything else appears here.
 */

export type LinkField = 'taste' | 'aromatic' | 'healingTraits';

/**
 * The only healing traits a compound may be connected to.
 *
 *  - Astringent — protein binding, a mouthfeel, not a treatment.
 *  - Cooling    — a cold-receptor signal; the sensation, not a therapy.
 *  - Mineral-rich / Nutrient-rich / Vitamin-rich — statements of composition.
 *
 * Everything else the deck prints under Healing Traits (diuretic, expectorant, pain relief,
 * anti-inflammatory…) is a physiological claim and is permanently out of scope here.
 */
export const LINKABLE_HEALING = [
  'Astringent',
  'Cooling',
  'Mineral-rich',
  'Nutrient-rich',
  'Vitamin-rich',
] as const;

export interface CompoundLink {
  field: LinkField;
  /** Card wording this connects to. Matched case-insensitively against what is printed. */
  term: string;
  /** One sentence, physical or chemical. Never an effect claim. */
  because: string;
  sourceIds?: string[];
}

/** Keyed by the normalised compound wording, same rule as `compounds.ts`. */
export const COMPOUND_LINKS: Record<string, CompoundLink[]> = {
  menthol: [
    {
      field: 'taste',
      term: 'Cool',
      because:
        'Menthol opens TRPM8, the nerve channel that also reports cold, so the coolness is a signal rather than a drop in temperature.',
      sourceIds: ['pmc-11296349'],
    },
    { field: 'taste', term: 'Minty', because: 'Menthol is the mint note itself.' },
    {
      field: 'aromatic',
      term: 'Cooling',
      because: 'The same TRPM8 signal, reaching the nose rather than the tongue.',
      sourceIds: ['pmc-11296349'],
    },
    { field: 'aromatic', term: 'Minty', because: 'Menthol is the mint note itself.' },
    {
      field: 'healingTraits',
      term: 'Cooling',
      because:
        'The card lists cooling as a trait; menthol is the compound behind the sensation, which is a nerve response and not a change in body temperature.',
      sourceIds: ['pmc-11296349'],
    },
  ],
  menthone: [
    { field: 'taste', term: 'Minty', because: 'A second mint ketone alongside menthol, sharper and less cooling.' },
    { field: 'aromatic', term: 'Minty', because: 'A second mint ketone alongside menthol, sharper and less cooling.' },
  ],
  tannins: [
    {
      field: 'taste',
      term: 'Astringent',
      because:
        'Tannins bind and precipitate the proline-rich proteins in saliva, stripping its lubricating film — astringency is that dryness, not a flavour.',
      sourceIds: ['pmc-4982662', 'pmc-10969767'],
    },
    {
      field: 'taste',
      term: 'Slightly astringent',
      because: 'The same protein binding, at a lower tannin load.',
      sourceIds: ['pmc-4982662'],
    },
    { field: 'taste', term: 'Dry', because: 'The dryness is saliva losing its lubricating film, not a lack of moisture.', sourceIds: ['pmc-10969767'] },
    {
      field: 'healingTraits',
      term: 'Astringent',
      because:
        'The deck lists astringency as a trait; it is a physical effect on tissue proteins, which is why tannins are what produce it.',
      sourceIds: ['pmc-4982662'],
    },
  ],
  catechins: [
    {
      field: 'taste',
      term: 'Astringent',
      because: 'Catechins are flavan-3-ols — the smaller tannins, binding salivary proteins the same way.',
      sourceIds: ['pmc-9585572'],
    },
  ],
  'gallic acid': [
    { field: 'taste', term: 'Astringent', because: 'A building block of hydrolysable tannins, and astringent in its own right.', sourceIds: ['pmc-4982662'] },
  ],
  'ellagic acid': [
    { field: 'taste', term: 'Astringent', because: 'Released from ellagitannins, the tannin class that gives many fruits their pucker.', sourceIds: ['pmc-4982662'] },
  ],
  geraniin: [
    { field: 'taste', term: 'Astringent', because: 'An ellagitannin — a large polyphenol that precipitates salivary proteins.', sourceIds: ['pmc-4982662'] },
  ],
  citral: [
    { field: 'taste', term: 'Lemony', because: 'Geranial and neral together are the lemon note.' },
    { field: 'taste', term: 'Citrus', because: 'Geranial and neral together are the lemon note.' },
    { field: 'aromatic', term: 'Citrus', because: 'Geranial and neral together are the lemon note.' },
    { field: 'aromatic', term: 'Zesty', because: 'Geranial and neral together are the lemon note.' },
  ],
  citronellal: [
    { field: 'taste', term: 'Lemony', because: 'A second citrus aldehyde, softer and greener than citral.' },
    { field: 'aromatic', term: 'Citrus', because: 'A second citrus aldehyde, softer and greener than citral.' },
    { field: 'aromatic', term: 'Fresh', because: 'A second citrus aldehyde, softer and greener than citral.' },
  ],
  limonene: [
    { field: 'taste', term: 'Citrus', because: 'The terpene that makes citrus peel smell of citrus.' },
    { field: 'aromatic', term: 'Citrus', because: 'The terpene that makes citrus peel smell of citrus.' },
    { field: 'aromatic', term: 'Zesty', because: 'The terpene that makes citrus peel smell of citrus.' },
  ],
  thymol: [
    { field: 'taste', term: 'Pungent', because: 'A monoterpene phenol — the sharp, medicinal thyme note.' },
    { field: 'taste', term: 'Sharp', because: 'A monoterpene phenol — the sharp, medicinal thyme note.' },
    { field: 'aromatic', term: 'Pungent', because: 'A monoterpene phenol — the sharp, medicinal thyme note.' },
    { field: 'aromatic', term: 'Sharp', because: 'A monoterpene phenol — the sharp, medicinal thyme note.' },
  ],
  carvacrol: [
    { field: 'taste', term: 'Pungent', because: "Thymol's isomer, and the oregano side of the same sharpness." },
    { field: 'aromatic', term: 'Pungent', because: "Thymol's isomer, and the oregano side of the same sharpness." },
  ],
  allicin: [
    { field: 'taste', term: 'Garlic', because: 'Formed the moment the tissue is crushed; allicin is the garlic smell itself.' },
    { field: 'taste', term: 'Pungent', because: 'Formed the moment the tissue is crushed; allicin is the garlic smell itself.' },
    { field: 'aromatic', term: 'Pungent', because: 'Formed the moment the tissue is crushed; allicin is the garlic smell itself.' },
    { field: 'aromatic', term: 'Sulfurous', because: 'An organosulfur compound — the sulfur is the smell.' },
  ],
  'sulfur compounds': [
    { field: 'aromatic', term: 'Sulfurous', because: 'Named by the element that carries the smell.' },
    { field: 'taste', term: 'Pungent', because: 'Named by the element that carries the smell.' },
  ],
  glucosinolates: [
    { field: 'taste', term: 'Pungent', because: 'Broken down on damage into isothiocyanates — the mustard-and-horseradish bite.' },
    { field: 'taste', term: 'Sharp', because: 'Broken down on damage into isothiocyanates — the mustard-and-horseradish bite.' },
  ],
  isothiocyanates: [
    { field: 'taste', term: 'Pungent', because: 'The mustard-family bite, released only once the tissue is damaged.' },
    { field: 'taste', term: 'Sharp', because: 'The mustard-family bite, released only once the tissue is damaged.' },
  ],
  sinigrin: [
    { field: 'taste', term: 'Pungent', because: 'The glucosinolate that becomes the mustard bite when the leaf is crushed.' },
  ],
  lactucin: [
    { field: 'taste', term: 'Bitter', because: 'A sesquiterpene lactone in the milky latex — the bitterness of the lettuce tribe.' },
    { field: 'taste', term: 'Very bitter', because: 'A sesquiterpene lactone in the milky latex — the bitterness of the lettuce tribe.' },
  ],
  lactucopicrin: [
    { field: 'taste', term: 'Bitter', because: 'The more bitter of the two lactones in the same latex.' },
    { field: 'taste', term: 'Very bitter', because: 'The more bitter of the two lactones in the same latex.' },
  ],
  'sesquiterpene lactones': [
    { field: 'taste', term: 'Bitter', because: 'The compound class the daisy family is bitter with.' },
  ],
  'oxalic acid': [
    { field: 'taste', term: 'Sour', because: 'A dicarboxylic acid — the sharp sourness of sorrel leaves.' },
    { field: 'taste', term: 'Slightly sour', because: 'A dicarboxylic acid — the sharp sourness of sorrel leaves.' },
    { field: 'taste', term: 'Tart', because: 'A dicarboxylic acid — the sharp sourness of sorrel leaves.' },
    { field: 'taste', term: 'Slightly tart', because: 'A dicarboxylic acid — the sharp sourness of sorrel leaves.' },
    { field: 'taste', term: 'Mildly tart', because: 'A dicarboxylic acid — the sharp sourness of sorrel leaves.' },
  ],
  sucrose: [
    { field: 'taste', term: 'Sweet', because: 'Ordinary table sugar — the sweetness is literally this molecule.' },
    { field: 'taste', term: 'Sugary', because: 'Ordinary table sugar — the sweetness is literally this molecule.' },
  ],
  inulin: [
    { field: 'taste', term: 'Slightly sweet', because: 'A fructose polymer: mildly sweet, and the reason the root tastes faintly so.' },
    { field: 'taste', term: 'Mildly sweet', because: 'A fructose polymer: mildly sweet, and the reason the root tastes faintly so.' },
  ],
  alkaloids: [{ field: 'taste', term: 'Bitter', because: 'Bitterness is the taste most alkaloids share.' }],
  achilleine: [{ field: 'taste', term: 'Bitter', because: 'An alkaloid, and bitter as most are.' }],
  // Keyed on the card's own wording. Card #38 prints "Sallicin" — a known typo, recorded in
  // KNOWN_CARD_ISSUES and transcribed as printed — so a `salicin` key here would be dead.
  sallicin: [{ field: 'taste', term: 'Bitter', because: 'Willow bark is bitter, and this glycoside is much of why.' }],
  pinene: [
    { field: 'aromatic', term: 'Resinous', because: 'The terpene pair that makes a conifer smell like a conifer.' },
    { field: 'taste', term: 'Resinous', because: 'The terpene pair that makes a conifer smell like a conifer.' },
  ],
  terpenes: [{ field: 'aromatic', term: 'Resinous', because: 'The volatile class that carries most plant scent.' }],
  'volatile oils': [{ field: 'aromatic', term: 'Strong', because: 'The aromatic fraction is what a plant smells of at all.' }],
  calcium: [{ field: 'healingTraits', term: 'Mineral-rich', because: 'An element the card counts toward that description.' }],
  iron: [{ field: 'healingTraits', term: 'Mineral-rich', because: 'An element the card counts toward that description.' }],
  magnesium: [{ field: 'healingTraits', term: 'Mineral-rich', because: 'An element the card counts toward that description.' }],
  potassium: [{ field: 'healingTraits', term: 'Mineral-rich', because: 'An element the card counts toward that description.' }],
  silica: [
    { field: 'healingTraits', term: 'Mineral-rich', because: 'Silicon dioxide, the mineral that stiffens horsetail stems.' },
    { field: 'taste', term: 'Mineral', because: 'Silicon dioxide, the mineral that stiffens horsetail stems.' },
  ],
  'vitamin c': [
    { field: 'healingTraits', term: 'Vitamin-rich', because: 'Ascorbic acid is the vitamin the description refers to.' },
    { field: 'taste', term: 'Tart', because: 'Ascorbic acid is an acid, and contributes to the tartness.' },
  ],
};

function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Links for one compound ON ONE CARD.
 *
 * Returns a link only if this card prints the term as well as the compound. That gate is
 * what keeps the feature from ever asserting something the deck does not: it rearranges the
 * card's own words, and adds an explanation of the chemistry joining them.
 */
export function linksFor(herb: Herb, printedCompound: string): CompoundLink[] {
  const candidates = COMPOUND_LINKS[normalise(printedCompound)];
  if (!candidates) return [];
  const printed: Record<LinkField, Set<string>> = {
    taste: new Set(herb.back.taste.map(normalise)),
    aromatic: new Set(herb.back.aromatic.map(normalise)),
    healingTraits: new Set(herb.back.healingTraits.map(normalise)),
  };
  const seen = new Set<string>();
  const out: CompoundLink[] = [];
  for (const link of candidates) {
    if (!printed[link.field].has(normalise(link.term))) continue;
    const key = `${link.field}:${normalise(link.term)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(link);
  }
  return out;
}
