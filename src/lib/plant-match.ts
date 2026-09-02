import { HERBS } from './deck';

/**
 * MAPPING AN IDENTIFICATION RESULT ONTO THE DECK.
 *
 * An identification provider answers with scientific names. Plantdex herb ids are derived
 * from scientific names (CLAUDE.md: "Herb ids come from the scientific name, never the
 * common name"), so this is a lookup rather than a guess — which is the whole reason that
 * rule is worth having.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FOUR OUTCOMES, AND THE DIFFERENCE BETWEEN THEM MATTERS.
 *
 *   exact       Taraxacum officinale  ->  the Dandelion card. Same species.
 *   genusCard   Quercus robur         ->  the "Quercus spp." card. The card is ABOUT the
 *                                         genus, so a species within it is a real match and
 *                                         not a weaker one. Nine cards are like this.
 *   sameGenus   Taraxacum erythrospermum -> Dandelion is Taraxacum OFFICINALE. Related, not
 *                                         the same plant. Offered as "related card", never
 *                                         as the identification, because a player logging it
 *                                         as a Dandelion discovery would be recording
 *                                         something untrue about their own collection.
 *   none        Most photographs. The deck holds 45 species out of a world of them, so this
 *               is the COMMON case and has to be a designed state, not a failure.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Nothing here says anything about safety. A match is "this looks like that card", never
 * "this is safe" — see `plant-id-safety.test.ts`.
 */

export type MatchKind = 'exact' | 'genusCard' | 'sameGenus' | 'none';

export interface PlantMatch {
  kind: MatchKind;
  /** The card this maps to. Absent only for `none`. */
  herbId?: string;
  /**
   * Whether this may be offered as a discovery of that card.
   *
   * True for `exact` and `genusCard`; FALSE for `sameGenus`, which is a related card rather
   * than this plant. That distinction is the point of the type.
   */
  confirmable: boolean;
}

const NO_MATCH: PlantMatch = { kind: 'none', confirmable: false };

/**
 * NAMES THAT MEAN A DECK CARD, SPELT DIFFERENTLY.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS EXISTS BECAUSE THE FEATURE FAILED ON ITS MOST OBVIOUS CASE.
 *
 * A live call with a photograph of a dandelion came back with, in order:
 *
 *     Taraxacum campylodes        0.454
 *     Taraxacum sect. Taraxacum   0.221
 *     Taraxacum pubescens         0.023
 *
 * Not one of them is the string the card prints. Every one resolved to `sameGenus` —
 * correctly, by the rule below — so the whole result set was unconfirmable and the player
 * was told "not one of the 45 cards" for the single commonest plant in the deck.
 *
 * The unit tests all passed, because they tested names I had imagined rather than names the
 * provider actually emits. Only the live call found it.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * EVERY ENTRY IS A CHECKED NOMENCLATURAL FACT, NOT A GUESS. A synonym here says "these two
 * names denote the same plant", which is exactly the kind of claim AGENTS.md forbids
 * inventing. Each carries its source. When a provider name is a genuinely DIFFERENT species
 * it does not belong here — Taraxacum erythrospermum is a distinct species and stays
 * unconfirmable, which is the whole point of keeping the two ideas apart.
 */
const ACCEPTED_NAME_SYNONYMS: Record<string, string> = {
  // POWO treats Taraxacum campylodes G.E.Haglund as a synonym of T. officinale.
  // https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:252973-1
  'taraxacum campylodes': 'taraxacum-officinale',
  // The section containing the common dandelion; PlantNet returns it for aggregate matches.
  // https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:254151-1
  'taraxacum sect': 'taraxacum-officinale',
  // Older basionym and a long-used synonym, both for the same plant.
  'leontodon taraxacum': 'taraxacum-officinale',
  'taraxacum vulgare': 'taraxacum-officinale',
  /*
   * GBIF backbone: Viola papilionacea Pursh is a SYNONYM whose accepted name is
   * Viola sororia Willd. (matchType EXACT, confidence 98). Checked against the API from a
   * runner rather than recalled — see scripts/check_synonyms.py and the "Check plant name
   * synonyms" workflow, which prints the verdict in its log.
   *
   * The same run REFUSED Viola riviniana, V. odorata, V. canina and V. septentrionalis:
   * GBIF reports each as an accepted species in its own right, so none of them is here.
   * That is the point of asking rather than pattern-matching on "it is also a violet".
   */
  'viola papilionacea': 'viola-sororia',
};

/**
 * A scientific name reduced to `Genus species`, lowercased.
 *
 * Providers return names carrying authorship ("Taraxacum officinale F.H.Wigg."), infraspecific
 * ranks ("Achillea millefolium subsp. millefolium"), and hybrid markers ("Mentha × piperita").
 * All of them have to collapse onto the same key as the plain binomial or an exact match
 * silently degrades to no match — which would look like a broken scanner rather than a
 * parsing bug.
 */
export function normalizeName(raw: string): string {
  const cleaned = raw
    .normalize('NFKD')
    // Escapes rather than the literal glyphs: U+00D7 MULTIPLICATION SIGN and U+2715
    // MULTIPLICATION X, both of which appear in hybrid names like "Mentha x piperita".
    .replace(/[\u00d7\u2715]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(' ');
  const genus = words[0] ?? '';
  // The first word after the genus that reads as an epithet — lowercase letters, possibly
  // hyphenated. Skips rank markers and authorship, which are capitalised or punctuated.
  const epithet = words.slice(1).find((word) => /^[a-z][a-z-]+$/.test(word) && !RANKS.has(word));
  if (epithet) return `${genus.toLowerCase()} ${epithet}`;
  /*
   * No epithet. An infrageneric name like "Taraxacum sect. Taraxacum" keeps its rank word so
   * the synonym table can address it — collapsing it to the bare genus would make it
   * indistinguishable from the genus card "Quercus spp.", which means something different.
   */
  const group = words.slice(1).find((word) => INFRAGENERIC.has(word.replace(/\.$/, '')));
  return group ? `${genus.toLowerCase()} ${group.replace(/\.$/, '')}` : genus.toLowerCase();
}

const RANKS = new Set(['subsp', 'ssp', 'var', 'subvar', 'f', 'forma', 'cv', 'sp', 'spp', 'agg']);

/**
 * Ranks that name a GROUP INSIDE a genus, and so mean something narrower than the genus.
 *
 * `spp.` and `sp.` are deliberately absent: they mean "the genus, species unspecified",
 * which is exactly what a "Quercus spp." card is, so they must collapse to the bare genus.
 * `sect.` does not — "Taraxacum sect. Taraxacum" is one section among several and is
 * addressed by name in the synonym table.
 */
const INFRAGENERIC = new Set(['sect', 'subg', 'subgen', 'ser', 'subsect']);

/** `Taraxacum officinale` -> `taraxacum`. */
export function genusOf(raw: string): string {
  return normalizeName(raw).split(' ')[0] ?? '';
}

/** Built once. `Acer spp.` normalises to the bare genus `acer`, which is exactly what we want. */
const BY_BINOMIAL = new Map<string, string>();
const GENUS_CARDS = new Map<string, string>();
const SPECIES_BY_GENUS = new Map<string, string[]>();

for (const herb of HERBS) {
  const key = normalizeName(herb.scientificName);
  const genus = genusOf(herb.scientificName);
  if (/\bspp?\.?$/i.test(herb.scientificName.trim())) {
    // "Quercus spp." — a card about the whole genus.
    GENUS_CARDS.set(genus, herb.id);
  } else {
    BY_BINOMIAL.set(key, herb.id);
    SPECIES_BY_GENUS.set(genus, [...(SPECIES_BY_GENUS.get(genus) ?? []), herb.id]);
  }
}

/**
 * Map one scientific name from an identification provider onto the deck.
 *
 * Order matters: an exact species card beats the genus card that would also accept it, so a
 * result of "Rubus fruticosus" prefers a Blackberry species card over "Rubus spp." if both
 * ever existed.
 */
export function matchScientificName(scientificName: string): PlantMatch {
  const name = normalizeName(scientificName);
  if (!name) return NO_MATCH;

  const exact = BY_BINOMIAL.get(name);
  if (exact) return { kind: 'exact', herbId: exact, confirmable: true };

  // A different name for the same plant is the same plant: `exact`, and confirmable.
  const synonym = ACCEPTED_NAME_SYNONYMS[name];
  if (synonym) return { kind: 'exact', herbId: synonym, confirmable: true };

  const genus = genusOf(scientificName);

  const genusCard = GENUS_CARDS.get(genus);
  if (genusCard) return { kind: 'genusCard', herbId: genusCard, confirmable: true };

  // A different species in a genus the deck covers. Related, and worth showing so the player
  // can see why it came up — but never confirmable as that card.
  const related = SPECIES_BY_GENUS.get(genus)?.[0];
  if (related) return { kind: 'sameGenus', herbId: related, confirmable: false };

  return NO_MATCH;
}

/** One ranked result from the provider, after matching. */
export interface ScanCandidate {
  scientificName: string;
  commonName?: string;
  /** Provider score, 0–1. */
  score: number;
  match: PlantMatch;
}

/**
 * How sure the provider is, as a label rather than a number.
 *
 * The UI shows the number too, but a bare "0.42" invites a reader to round it up in their
 * head. These thresholds are presentation only and are deliberately NOT used to gate the
 * safety caution — that is unconditional. See `plant-id-safety.test.ts`.
 */
export type ConfidenceBand = 'strong' | 'moderate' | 'weak';

export function confidenceBand(score: number): ConfidenceBand {
  if (score >= 0.7) return 'strong';
  if (score >= 0.35) return 'moderate';
  return 'weak';
}

/**
 * The overall shape of a result set, which is what the UI branches on.
 *
 * `uncertain` is a first-class outcome, not a degraded `matched`: when nothing clears the
 * bar, presenting a ranked list with no highlighted answer is the honest rendering.
 */
export type ScanOutcome = 'matched' | 'uncertain' | 'relatedOnly' | 'noMatch';

/*
 * `relatedOnly` EXISTS BECAUSE THE OLD ANSWER WAS FALSE.
 *
 * A violet photographed in the field came back as five Viola species, none of them the
 * `Viola sororia` the Wild Violet card prints. Every one resolved to `sameGenus`, nothing
 * was confirmable, and the player was told "not one of the 45 cards" — while this very
 * function was holding `viola-sororia` for all five of them. The deck HAS a violet. Saying
 * it does not is not a conservative answer, it is a wrong one.
 *
 * So the two ideas are separated. `noMatch` means the deck has nothing like this.
 * `relatedOnly` means the deck has a card for this genus but not for this species: worth
 * showing, worth reading, and still NOT loggable — which is the same refusal as before,
 * just no longer dressed up as ignorance.
 */
export function outcomeFor(candidates: readonly ScanCandidate[]): ScanOutcome {
  const confirmable = candidates.filter((candidate) => candidate.match.confirmable);
  if (confirmable.length > 0) {
    return confirmable.some((candidate) => candidate.score >= 0.35) ? 'matched' : 'uncertain';
  }
  return candidates.some((candidate) => candidate.match.herbId) ? 'relatedOnly' : 'noMatch';
}
