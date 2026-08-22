/**
 * Core domain types for the Plantdex Herbdex.
 *
 * These shapes are intentionally the same ones a server would return in V0.3, so the
 * UI does not need to change when local storage is replaced by a real database.
 */

export const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic'] as const;
export type Rarity = (typeof RARITIES)[number];

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

/**
 * The twelve icons printed on the card fronts.
 *
 * Keys and labels come from the deck's own "Icon Cheat Sheet" (card 46) — these are the
 * deck's categories, not our invention. They describe traditional and historical use;
 * they are not medical claims. See SafetyNotice.
 */
export const USE_KEYS = [
  'digestive',
  'edible',
  'wound',
  'energy',
  'tea',
  'lungs',
  'topical',
  'calm',
  'bone',
  'heart',
  'immune',
  'urinary',
] as const;
export type UseKey = (typeof USE_KEYS)[number];

export interface HerbStats {
  /** Number of water droplets printed on the card (1-5). */
  water: number;
  /** Number of suns printed on the card (1-5). */
  sun: number;
  /** Number of thermometers printed on the card (1-5). */
  temperature: number;
}

/**
 * Content printed on the back of the card, section for section.
 *
 * Reproduced verbatim. Where a card's own text contains an error it is transcribed as
 * printed and recorded in `Deck.knownCardIssues` rather than quietly corrected.
 */
export interface HerbBack {
  /** "HEALING TRAITS" — the deck's own heading. Traditional use, not medical claims. */
  healingTraits: string[];
  /** "SIGNATURE COMPOUNDS" */
  compounds: string[];
  /** "TASTE PROFILE" */
  taste: string[];
  /** "AROMATIC PROFILE" */
  aromatic: string[];
  /** "PREPARATIONS" */
  preparations: string[];
  /** "USABLE PARTS" */
  usableParts: string[];
}

// --- Citations ---------------------------------------------------------------

export type SourceKind = 'deck' | 'book' | 'journal' | 'database' | 'web';

export interface Source {
  id: string;
  kind: SourceKind;
  title: string;
  author?: string;
  organization?: string;
  year?: number;
  publication?: string;
  url?: string;
  /** ISO date the URL was last checked. */
  accessed?: string;
  /**
   * True only when a human has opened this source and confirmed it supports what it is
   * cited for. Unverified entries are never rendered — see src/lib/sources.ts.
   */
  verified: boolean;
  note?: string;
}

/** A pointer from content to a registry source, optionally naming the exact place. */
export interface SourceRef {
  sourceId: string;
  detail?: string;
}

/**
 * The parts of a plant entry a citation can be attached to.
 *
 * A closed list rather than free-form strings, so `sectionSources` has a real contract:
 * a typo cannot silently create a section nothing renders, and the UI can state which
 * sections are still awaiting an independent source without guessing at the set.
 */
export const SOURCEABLE_SECTIONS = [
  'identification',
  'habitat',
  'facts',
  'growing',
  'traditionalUse',
  'preparations',
  'cautions',
] as const;
export type SourceableSection = (typeof SOURCEABLE_SECTIONS)[number];

export const SECTION_LABEL: Record<SourceableSection, string> = {
  identification: 'Identification',
  habitat: 'Habitat & range',
  facts: 'Botanical facts',
  growing: 'Growing conditions',
  traditionalUse: 'Traditional use',
  preparations: 'Preparation',
  cautions: 'Cautions',
};

// --- Per-part detail -----------------------------------------------------------
// Structure for information that varies by plant part. Every field is optional and
// absent unless a card or a curated, cited entry actually provides it — a species only
// shows the tabs it genuinely has content for, and nothing is invented to fill a gap.

export const HERB_PART_KEYS = ['leaf', 'flower', 'root', 'bark', 'seed', 'other'] as const;
export type HerbPartKey = (typeof HERB_PART_KEYS)[number];

export interface PartInfo {
  traditionalUses?: string[];
  historicalUses?: string[];
  scent?: string[];
  flavor?: string[];
  nutrients?: string[];
  dyeUses?: string[];
  topicalTraditions?: string[];
  repellentUses?: string[];
  preparations?: string[];
  sources?: SourceRef[];
}

export type HerbParts = Partial<Record<HerbPartKey, PartInfo>>;

export interface Herb {
  /** Stable id derived from the scientific name — never the common name. */
  id: string;
  /** Position in the physical deck, as printed (#01-#45). */
  cardNumber: number;
  /**
   * Which printed collection this card belongs to.
   *
   * Absent on Collection 01, whose cards predate the concept — `collectionOf()` in
   * src/lib/collection.ts falls back to the current collection, so a future deck can
   * declare itself without every existing card needing to be rewritten.
   */
  collectionId?: string;
  /** Card number within its own collection. Absent means it equals `cardNumber`. */
  cardNumberInCollection?: number;
  commonName: string;
  scientificName: string;
  rarity: Rarity;
  xp: number;
  season: Season;
  uses: UseKey[];
  stats: HerbStats;
  image: string;
  thumb: string;
  backImage: string;
  /** Pixel-art sprite cropped from the card front, used by My Garden. */
  sprite: string;
  back: HerbBack;
  /** A warning printed on the card itself (e.g. a poisonous lookalike). */
  warning?: string;

  // --- Fields the cards do not carry -------------------------------------------
  // Structure is in place so curated, cited content can be added later. Absent today
  // rather than filled with plausible-sounding text; the UI omits what is missing.
  habitat?: string;
  identification?: string[];
  facts?: string[];
  parts?: HerbParts;

  /** Provenance for this entry as a whole. */
  sources?: SourceRef[];
  /** Provenance for individual sections. Absent sections cite the card only. */
  sectionSources?: Partial<Record<SourceableSection, SourceRef[]>>;
}

export interface Disclaimer {
  main: string;
  availability: string;
  encounterRate: string;
}

export interface Deck {
  deckName: string;
  /** Which printed collection this deck is. Optional for decks generated before collections. */
  collectionId?: string;
  collectionName?: string;
  deckSize: number;
  nonHerbCards: { cardNumber: number; title: string }[];
  useLabels: Record<UseKey, string>;
  seasonLabels: Record<Season, string>;
  /** Verbatim text of the deck's own Disclaimer card (#47). */
  disclaimer: Disclaimer;
  /** Errors found on the printed cards, keyed by card number. Not shown to visitors. */
  knownCardIssues: Record<string, string>;
  herbs: Herb[];
}

/** ISO-8601 timestamp. */
export type Timestamp = string;

/**
 * Everything we persist about a player.
 *
 * Deliberately minimal: XP, level and progress are *derived* from `discoveries` rather
 * than stored, so they cannot drift out of sync and cannot be inflated by replaying a
 * discovery. See src/lib/progression.ts.
 */
export interface HerbdexState {
  version: number;
  /** Stage 1 — the player found this plant in the real world. */
  discoveries: Record<string, Timestamp>;
  /** Stage 2 — the player passed this card's knowledge check. */
  learned: Record<string, Timestamp>;
  /**
   * Stage 3 — recorded once the mastery predicate first holds.
   *
   * Stored rather than derived because mastery depends on sightings, which live in
   * another store, and because mastery is an achievement: once earned it is never
   * revoked, even if the player later deletes the sighting that earned it.
   */
  mastered: Record<string, Timestamp>;
  /**
   * Field Research tasks the player has completed, keyed by task id.
   *
   * Recorded rather than derived, for the same reason as `mastered`: a task's *progress*
   * is computed from current facts, but its completion is a thing that happened. A
   * seasonal challenge finished in spring must not un-finish itself in summer, and a task
   * completed by logging a sighting must survive that sighting being deleted.
   */
  research: Record<string, Timestamp>;
  achievements: Record<string, Timestamp>;
}

export interface DiscoveryResult {
  /** False when the herb was already discovered — no XP was awarded. */
  awarded: boolean;
  xpAwarded: number;
  newAchievementIds: string[];
}
