import type { Herb } from './types.ts';

/**
 * FIELD CARDS — the digital-only set unlocked by XP.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NINE CARDS THAT ARE NOT PART OF COLLECTION 01. They are earned by playing rather than
 * bought, printed or found, and the whole point of this file is that those are four
 * different things which must never be allowed to collapse into one another:
 *
 *   XP UNLOCK  ≠  PHYSICAL OWNERSHIP    nobody posted you a Field Card.
 *   XP UNLOCK  ≠  REAL-WORLD DISCOVERY  unlocking Spicebush is not finding Spicebush.
 *   XP UNLOCK  ≠  MASTERY               a Field Card starts unmastered, like any other.
 *
 * The last two are the ones that would quietly rot the product. `discoveries` means "plants
 * I identified outdoors" — it is the only thing it means, it is what mastery and Field
 * Research are derived from, and it is what makes the collection worth anything. So an
 * unlock writes to `unlockedFieldCards` and NEVER to `discoveries`, and a Field Card is
 * absent from `PRINTED_CARDS`, from `RESEARCH_POOL`, and from Collection 01's completion
 * percentage. `field-cards.test.ts` attacks each of those separately.
 *
 * HOW THEY REACH THE APP. Through `DIGITAL_ONLY_ENTRIES` in `catalogue.ts` — the seam built
 * before any digital card existed, precisely so the first one could not silently enter the
 * deck's counts. Every entry here carries `collectionId: FIELD_CARDS_COLLECTION_ID`, which
 * `catalogue.test.ts` already requires, because `collectionOf()` falls back to Collection 01
 * for a card that declares nothing and that fallback is exactly the trap.
 *
 * WHY THE NUMBERING RUNS 48-51. The physical deck is 47 cards: 45 species plus the icon
 * cheat sheet (#46) and the disclaimer (#47). These were authored as #48 onward and print
 * that number on their face, so `cardNumber` reproduces what the artwork says. Their
 * position WITHIN Field Cards is `cardNumberInCollection`, which is what the UI shows.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The collection id every Field Card declares. Never Collection 01's. */
export const FIELD_CARDS_COLLECTION_ID = 'field-cards';

/** What the set is called where a player sees it. */
export const FIELD_CARDS_NAME = 'Field Cards';

/** How many Field Cards will exist when the set is complete. */
export const FIELD_CARDS_TOTAL = 9;

/**
 * One rung of the ladder.
 *
 * `card` is absent for a slot whose species has been chosen but whose card has not been
 * finished. That is a REAL state rather than a placeholder hack: the threshold is decided,
 * the reward is not yet drawable, and the UI says "another Field Card" instead of inventing
 * a name. Inventing botanical data for an unfinished card is the one thing this file may
 * never do — it is the same rule that keeps `herbs.json` generated from the print masters.
 */
export interface FieldCardSlot {
  /** Position in the set, 1-9. Stable: this is what an unlock record refers to. */
  readonly ordinal: number;
  /** Total XP at which this card unlocks. */
  readonly xp: number;
  /** The finished card, or `undefined` while the slot is still being authored. */
  readonly card?: Herb;
}

/* ── The four finished cards ──────────────────────────────────────────────────
 *
 * TRANSCRIBED FROM THE CARD ARTWORK, front and back, exactly as `build_deck.py` transcribes
 * the printed 45 — same fields, same rules, same refusal to improve on what is printed.
 * Stats are the droplet / sun / thermometer counts on the face; `uses` are the two icons
 * beside the binomial; `season` is the icon in the Encounter Rate bar, confirmed by the
 * card's author rather than read off a glyph by me.
 *
 * THREE PRINTED ERRORS ARE REPRODUCED HERE AND RECORDED IN `FIELD_CARD_ISSUES` BELOW.
 * Correcting them silently would make the app disagree with a card somebody is holding,
 * which is the rule `KNOWN_CARD_ISSUES` exists to enforce for the printed deck.
 */

const CONEFLOWER: Herb = {
  id: 'echinacea-purpurea',
  cardNumber: 48,
  collectionId: FIELD_CARDS_COLLECTION_ID,
  cardNumberInCollection: 1,
  commonName: 'Purple Coneflower',
  scientificName: 'Echinacea purpurea',
  rarity: 'Uncommon',
  xp: 250,
  season: 'summer',
  uses: ['immune', 'lungs'],
  stats: { water: 2, sun: 5, temperature: 3 },
  image: '/cards/echinacea-purpurea.webp',
  thumb: '/cards/thumb/echinacea-purpurea.webp',
  backImage: '/cards/back/echinacea-purpurea.webp',
  sprite: '/cards/sprite/echinacea-purpurea.webp',
  back: {
    healingTraits: ['Anti-inflam.', 'Immune aid', 'Respiratory support'],
    compounds: ['Alkamides', 'Cichoric acid', 'Polysaccharides', 'Caffeic acid'],
    taste: ['Bitter', 'Pungent', 'Tingling'],
    aromatic: ['Earthy', 'Herbal', 'Mild'],
    preparations: ['Tea', 'Tincture', 'Decoction', 'Extract'],
    usableParts: ['Root', 'Leaf', 'Flower', 'Stem'],
  },
};

const CATTAIL: Herb = {
  id: 'typha-latifolia',
  cardNumber: 49,
  collectionId: FIELD_CARDS_COLLECTION_ID,
  cardNumberInCollection: 2,
  commonName: 'Broadleaf Cattail',
  scientificName: 'Typha latifolia',
  rarity: 'Common',
  xp: 150,
  season: 'summer',
  uses: ['wound', 'heart'],
  stats: { water: 5, sun: 5, temperature: 3 },
  image: '/cards/typha-latifolia.webp',
  thumb: '/cards/thumb/typha-latifolia.webp',
  backImage: '/cards/back/typha-latifolia.webp',
  sprite: '/cards/sprite/typha-latifolia.webp',
  back: {
    // "Hemeostatic" is what the card prints. See FIELD_CARD_ISSUES.
    healingTraits: ['Digestive support', 'Wound support', 'Antiseptic', 'Hemeostatic'],
    compounds: ['Polysaccharides', 'Phytosterols', 'Linoleic acid', 'β-Sitosterol'],
    taste: ['Mild', 'Starchy', 'Nutty'],
    aromatic: ['Mild', 'Green', 'Earthy'],
    preparations: ['Cooked', 'Roasted', 'Flour'],
    usableParts: ['Shoot', 'Rhizome', 'Flower', 'Pollen'],
  },
};

const EVENING_PRIMROSE: Herb = {
  id: 'oenothera-biennis',
  cardNumber: 50,
  collectionId: FIELD_CARDS_COLLECTION_ID,
  cardNumberInCollection: 3,
  commonName: 'Evening Primrose',
  scientificName: 'Oenothera biennis',
  rarity: 'Rare',
  xp: 350,
  season: 'summer',
  uses: ['wound', 'digestive'],
  stats: { water: 2, sun: 5, temperature: 3 },
  image: '/cards/oenothera-biennis.webp',
  thumb: '/cards/thumb/oenothera-biennis.webp',
  backImage: '/cards/back/oenothera-biennis.webp',
  sprite: '/cards/sprite/oenothera-biennis.webp',
  back: {
    healingTraits: ['Skin care', 'Anti-inflam.', 'Wound support', 'Hormone support'],
    // "Campestrol" is what the card prints. See FIELD_CARD_ISSUES.
    compounds: ['Linoleic acid', 'Omega-6', 'Campestrol', 'GLA'],
    taste: ['Mild', 'Nutty', 'Earthy'],
    aromatic: ['Light', 'Green', 'Mild'],
    preparations: ['Seed oil', 'Poultice', 'Cooked', 'Syrup'],
    usableParts: ['Seed', 'Root', 'Leaf', 'Shoot'],
  },
};

const SPICEBUSH: Herb = {
  id: 'lindera-benzoin',
  cardNumber: 51,
  collectionId: FIELD_CARDS_COLLECTION_ID,
  cardNumberInCollection: 4,
  commonName: 'Spicebush',
  scientificName: 'Lindera benzoin',
  rarity: 'Rare',
  xp: 350,
  season: 'spring',
  uses: ['digestive', 'lungs'],
  stats: { water: 4, sun: 3, temperature: 3 },
  image: '/cards/lindera-benzoin.webp',
  thumb: '/cards/thumb/lindera-benzoin.webp',
  backImage: '/cards/back/lindera-benzoin.webp',
  sprite: '/cards/sprite/lindera-benzoin.webp',
  back: {
    healingTraits: ['Fever aid', 'Digestive support', 'Antiparasitic', 'Warming'],
    // "caryophyllene" is printed lowercase and unprefixed. See FIELD_CARD_ISSUES.
    compounds: ['Eucalyptol', 'Sulcatone', 'Phellandrene', 'caryophyllene'],
    taste: ['Spicy', 'Peppery', 'Warm'],
    aromatic: ['Spicy', 'Citrusy', 'Woody'],
    preparations: ['Tea', 'Infusion', 'Spice', 'Decoction'],
    usableParts: ['Leaf', 'Twig', 'Bark', 'Fruit'],
  },
};

/**
 * Errors the Field Card artwork itself contains, by card number.
 *
 * Same contract as `KNOWN_CARD_ISSUES` for the printed deck: the transcription above stays
 * exactly as printed, and the correction is stated here rather than applied there. An entry
 * is removed only when the artwork is genuinely redrawn, in the same edit as the new
 * transcription — removing one to tidy the list would have the app deny an error that is
 * still on the card a player is looking at.
 *
 * None of these is a hazard, so none needs a `SITE_CAUTIONS` entry: they are spellings, not
 * a claim that something unsafe is usable.
 */
export const FIELD_CARD_ISSUES: Readonly<Record<number, string>> = {
  49: '“Hemeostatic” is a misspelling of “Hemostatic”.',
  50: '“Campestrol” is a misspelling of “Campesterol”.',
  51: '“caryophyllene” is printed lowercase and without its β- prefix.',
};

/**
 * THE LADDER.
 *
 * Thresholds are TOTAL XP, and the first five land exactly on existing level boundaries
 * (600 = Backyard Forager, 1200 = Field Explorer, 2200 = Plant Collector, 3600 = Field
 * Botanist, 5500 = Master Herbalist). That is deliberate: the unlock and the level-up become
 * ONE moment rather than two competing ones, and the ladder that was already tuned does the
 * pacing, which is what keeps this from being a second progression system.
 *
 * 8750 is not a round number either — it is exactly the XP of discovering all 45 printed
 * cards, so a player who only ever discovers tops out precisely there and earns the seventh
 * card. 14000 sits under both Plantdex Grandmaster (15000) and the 19250 non-daily ceiling,
 * so the ninth is reachable without grinding dailies.
 *
 * Ordinals 5-9 have approved thresholds and no card yet. They stay `card: undefined` until
 * finished artwork and a transcription arrive.
 */
export const FIELD_CARD_SLOTS: readonly FieldCardSlot[] = [
  { ordinal: 1, xp: 600, card: CONEFLOWER },
  { ordinal: 2, xp: 1_200, card: CATTAIL },
  { ordinal: 3, xp: 2_200, card: EVENING_PRIMROSE },
  { ordinal: 4, xp: 3_600, card: SPICEBUSH },
  { ordinal: 5, xp: 5_500 },
  { ordinal: 6, xp: 7_000 },
  { ordinal: 7, xp: 8_750 },
  { ordinal: 8, xp: 11_000 },
  { ordinal: 9, xp: 14_000 },
];

/** The finished cards, in ladder order. This is what `DIGITAL_ONLY_ENTRIES` is built from. */
export const FIELD_CARDS: readonly Herb[] = FIELD_CARD_SLOTS.map((slot) => slot.card).filter(
  (card): card is Herb => card !== undefined,
);

const BY_ID = new Map(FIELD_CARDS.map((card) => [card.id, card]));
const SLOT_BY_ID = new Map(
  FIELD_CARD_SLOTS.filter((slot) => slot.card).map((slot) => [slot.card!.id, slot]),
);

/** True when this id is a Field Card. Cheap enough to call from a render. */
export function isFieldCard(herbId: string): boolean {
  return BY_ID.has(herbId);
}

/** The Field Card with this id, or undefined. */
export function getFieldCard(herbId: string): Herb | undefined {
  return BY_ID.get(herbId);
}

/** The XP a given Field Card unlocks at, or undefined if it is not one. */
export function unlockXpFor(herbId: string): number | undefined {
  return SLOT_BY_ID.get(herbId)?.xp;
}

/**
 * Which slots an XP total has reached.
 *
 * PURE, AND DERIVED — never read from stored state. That is what makes an unlock survive a
 * reload, a sync and a sign-in on another device without anything being written: the same XP
 * always yields the same set. `unlocked-field-cards.ts` records WHEN each first happened, for
 * the reasons set out there, but the answer to "is it unlocked" comes from here.
 */
export function slotsUnlockedAt(xp: number): readonly FieldCardSlot[] {
  return FIELD_CARD_SLOTS.filter((slot) => xp >= slot.xp);
}

/** The next slot a player has not reached, or null when all nine are unlocked. */
export function nextSlotAfter(xp: number): FieldCardSlot | null {
  return FIELD_CARD_SLOTS.find((slot) => xp < slot.xp) ?? null;
}

/**
 * Progress toward the next Field Card.
 *
 * Measured from the PREVIOUS threshold rather than from zero, so the bar fills across the
 * gap a player is actually crossing instead of creeping from the start of the game — the
 * same reason `progressFromXp` measures within a level rather than against the ladder's top.
 */
export interface FieldCardProgress {
  next: FieldCardSlot | null;
  /** 0-1 across the current gap. 1 when every card is unlocked. */
  fraction: number;
  /** XP still needed. 0 when every card is unlocked. */
  remaining: number;
  unlockedCount: number;
}

export function fieldCardProgress(xp: number): FieldCardProgress {
  const unlocked = slotsUnlockedAt(xp);
  const next = nextSlotAfter(xp);
  if (!next) {
    return { next: null, fraction: 1, remaining: 0, unlockedCount: unlocked.length };
  }
  const floor = unlocked.length > 0 ? unlocked[unlocked.length - 1]!.xp : 0;
  const span = next.xp - floor;
  return {
    next,
    fraction: span > 0 ? Math.min(1, Math.max(0, (xp - floor) / span)) : 0,
    remaining: Math.max(0, next.xp - xp),
    unlockedCount: unlocked.length,
  };
}
