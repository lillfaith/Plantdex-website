import { PRINTED_CARDS } from './deck.ts';
import { CATALOGUE } from './catalogue.ts';
import { scopeFor, type TaxonRank } from './card-coverage.ts';

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

export type MatchKind =
  | 'exact'
  | 'genusCard'
  /**
   * A species inside a card's DECLARED coverage that is not the card's own binomial — the
   * goldenrod case. Confirmable, and deliberately distinct from `genusCard`: that one means
   * the card itself prints `Genus spp.`, this one means the card prints a binomial and the
   * owner has declared the card broader. Two different facts about why a name is accepted.
   */
  | 'acceptedScope'
  /**
   * Claimable by MORE THAN ONE card, so the app refuses to pick. Not confirmable — awarding
   * the wrong card is worse than awarding none, and silently choosing the first would make
   * the wrongness invisible. `relatedHerbIds` carries every claimant.
   */
  | 'ambiguous'
  | 'sameGenus'
  | 'none';

/**
 * WHY AN OBSERVATION QUALIFIES FOR A CARD — which is a different question from what the
 * plant is, and a different question again from how sure we are of the species.
 */
export type Eligibility =
  /** The card's own binomial, or a checked nomenclatural synonym of it. */
  | 'exact'
  /** A researched member of the card's curated accepted group. */
  | 'acceptedGroup'
  /** The card itself prints `Genus spp.`, so the genus is its stated scope. */
  | 'genusCard'
  /** Inside a `pendingCuration` genus override. Temporary — see `card-coverage.ts`. */
  | 'legacyGenus'
  | 'ambiguous'
  | 'related'
  | 'none';

/** Strength of the SPECIES-level identification. Independent of card eligibility. */
export type SpeciesConfidence = 'high' | 'moderate' | 'low' | 'unresolved';

/**
 * WHAT THE PROVIDER ACTUALLY SAID.
 *
 * Never rewritten to the card's primary binomial. An observation of `Solidago altissima`
 * that qualifies for the Goldenrod card is `Solidago altissima` for ever; the card is
 * recorded separately, in `herbId`.
 *
 * `providerName` is the provider's ORIGINAL string, authorship and all. `name` is the
 * cleaned display form and `key` the lookup form — normalisation is for finding things, and
 * must never become the historical record of what was returned.
 */
export interface ObservedTaxon {
  readonly providerName: string;
  readonly name: string;
  readonly key: string;
  readonly rank: TaxonRank;
}

export interface PlantMatch {
  kind: MatchKind;
  /** Why this observation qualifies for `herbId`. */
  eligibility: Eligibility;
  /** What the provider named. Absent only when nothing was supplied. */
  observedTaxon?: ObservedTaxon;
  /** The card this maps to. Absent only for `none`. */
  herbId?: string;
  /**
   * Whether this may be offered as a discovery of that card.
   *
   * True for `exact`, `genusCard` and `acceptedScope`; FALSE for `ambiguous` and for
   * `sameGenus`, which is a related card rather
   * than this plant. That distinction is the point of the type.
   */
  confirmable: boolean;
  /**
   * EVERY deck card in this genus, for `sameGenus` only.
   *
   * `herbId` alone was `SPECIES_BY_GENUS.get(genus)[0]` — the first card in DECK ORDER — and
   * the deck holds two Rumex species. So `Rumex acetosa`, which is the close relative of the
   * Sheep's Sorrel card, was offered Broadleaf Dock, and every other Rumex was too: a coin
   * flip that always landed the same way. Naming one card confidently is only honest when
   * there is one to name, so the caller gets the whole list and can say "two cards" when
   * there are two.
   */
  relatedHerbIds?: string[];
}

const NO_MATCH: PlantMatch = { kind: 'none', eligibility: 'none', confirmable: false };

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
  /*
   * `taraxacum sect` USED TO LIVE HERE AND DID NOT BELONG. A synonym says two names denote
   * THE SAME PLANT; a section is a rank ABOVE the species, so the entry was asserting that
   * `Taraxacum sect. <anything>` and `Taraxacum officinale` are the same taxon. It is now an
   * accepted-group member on the Dandelion card in `card-coverage.ts`, where breadth is
   * curated and where a section can stay a section. Taxonomic synonyms and accepted-card
   * taxa are two different ideas and this table holds only the first.
   */
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
   *
   * IT ALSO HAS TO KEEP THE SECTION'S OWN EPITHET, AND FOR A WHILE IT DID NOT. This returned
   * `genus + rank word`, so `Taraxacum sect. Ruderalia`, `sect. Erythrosperma` and
   * `sect. Palustria` ALL became the single key `taraxacum sect` — and that key sat in the
   * synonym table pointing at Dandelion as an `exact`, confirmable match. Three different
   * sections, one of them containing `Taraxacum erythrospermum`, a species this deck
   * deliberately REFUSES as unconfirmable. The species was refused and its own section was
   * accepted as an exact match for the card's primary binomial: the table contradicting
   * itself, and a supra-specific name silently promoted to a species identification.
   *
   * The epithet is capitalised (`Ruderalia`), which is exactly why the lowercase-epithet
   * finder above skips it — so it has to be picked up here, by position: the word after the
   * rank marker. `taraxacum sect ruderalia` is now distinct from `taraxacum sect palustria`,
   * and a section can only reach a card by being curated into that card's accepted group.
   *
   * A rank marker with nothing after it ("Taraxacum sect.") names no section, so it stays
   * `genus rank` — a key that identifies nothing and therefore matches nothing, which is the
   * honest outcome for a name that did not say which section it meant.
   */
  const groupAt = words
    .slice(1)
    .findIndex((word) => INFRAGENERIC.has(word.replace(/\.$/, '').toLowerCase()));
  if (groupAt === -1) return genus.toLowerCase();
  const rank = words[groupAt + 1]!.replace(/\.$/, '').toLowerCase();
  const sectionEpithet = words[groupAt + 2];
  return sectionEpithet
    ? `${genus.toLowerCase()} ${rank} ${sectionEpithet.replace(/\.$/, '').toLowerCase()}`
    : `${genus.toLowerCase()} ${rank}`;
}

/**
 * The RANK a provider's name actually claims — which is not always species.
 *
 * `observedTaxon.rank` exists so a section can be recorded as a section. Before this, a
 * supra-specific answer was flattened into the card's binomial and the distinction was gone
 * by the time anything was written down. `TaxonRank` itself lives in `card-coverage.ts`,
 * which `AcceptedTaxon` needs it for — importing it the other way round would be a cycle.
 */
const INFRAGENERIC_RANK: Record<string, TaxonRank> = {
  sect: 'section',
  subsect: 'subsection',
  subg: 'subgenus',
  subgen: 'subgenus',
  ser: 'series',
};

/** What rank `raw` names. Reads the provider's own words; never guesses from the card. */
export function taxonRank(raw: string): TaxonRank {
  const key = normalizeName(raw);
  const parts = key.split(' ');
  if (parts.length >= 2) {
    const asRank = INFRAGENERIC_RANK[parts[1]!];
    if (asRank) return asRank;
    return 'species';
  }
  return 'genus';
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

/**
 * The name as it should be SHOWN — rebuilt from the normalised key, never from the raw.
 *
 * Rebuilding guarantees the displayed name and the looked-up name are the same taxon, which
 * a separate cleaning pass could not promise. Authorship is dropped because it is not part
 * of the name a player is reading, and the provider's exact original survives untouched in
 * `ObservedTaxon.providerName` — normalisation is for finding things, and must never become
 * the historical record of what the provider actually returned.
 */
export function displayName(raw: string): string {
  const parts = normalizeName(raw).split(' ').filter(Boolean);
  if (parts.length === 0) return '';
  const [genus, second, third] = parts;
  const capitalised = genus!.charAt(0).toUpperCase() + genus!.slice(1);
  if (!second) return capitalised;
  // A rank marker prints with its point, and the taxon it introduces is capitalised.
  if (INFRAGENERIC.has(second)) {
    return third
      ? `${capitalised} ${second}. ${third.charAt(0).toUpperCase()}${third.slice(1)}`
      : `${capitalised} ${second}.`;
  }
  return `${capitalised} ${second}`;
}

/**
 * How sure we are of the SPECIES, which is not how sure we are of the card.
 *
 * A supra-specific name is `unresolved` WHATEVER its score: a provider can be entirely
 * confident that it is looking at a section and still have said nothing about which species
 * within it. Collapsing that into a high species confidence is precisely the rewrite this
 * model exists to prevent — so rank is checked before the number is even read.
 *
 * Reuses `confidenceBand` rather than restating its thresholds, so species confidence and
 * the confidence shown beside a candidate can never drift apart.
 */
export function speciesConfidenceFor(rank: TaxonRank, score: number): SpeciesConfidence {
  if (rank !== 'species') return 'unresolved';
  const band = confidenceBand(score);
  return band === 'strong' ? 'high' : band === 'moderate' ? 'moderate' : 'low';
}

/** `Taraxacum officinale` -> `taraxacum`. */
export function genusOf(raw: string): string {
  return normalizeName(raw).split(' ')[0] ?? '';
}

/**
 * Built once, FROM THE WHOLE CATALOGUE — the printed 45 AND the Field Cards.
 *
 * IT USED TO BE THE PRINTED DECK ONLY, AND THAT TOLD PLAYERS SOMETHING FALSE. Witch Hazel is
 * Field Card 1. Scanning a real `Hamamelis virginiana` found no match, so the scan said the
 * deck had no card for it and offered the Seed Shelf — for a species you can open at
 * `/herbdex/hamamelis-virginiana`. Two subsystems then compounded it: `isShelfEligible` is
 * defined as "no confirmable match", so a species Plantdex HAS a card for was ruled shelf
 * material, against the shelf's own stated premise of "a real species you photographed that
 * has no card yet".
 *
 * THE OLD COMMENT HERE DEFENDED THAT SCOPE, AND ITS ARGUMENT DOES NOT SURVIVE THE FACTS. It
 * warned that widening would make an already-shelved species ineligible and that "players
 * would watch entries leave a shelf they had collected". Entries do not leave: shelf rows are
 * write-once and nothing deletes them, `isShelfEligible` is checked only when a row is
 * CREATED, and an entry whose species gains a card SPROUTS — which is the moment the Seed
 * Shelf was built for and the mechanism CLAUDE.md describes as needing no migration. The
 * failure it predicted was the opposite of what widening does, and it was written while
 * `DIGITAL_ONLY_ENTRIES` was still empty, so nothing had ever exercised it.
 *
 * WHAT `confirmable` MEANS IS UNCHANGED IN SPIRIT AND BROADER IN FACT: "Plantdex has a card
 * that is this species". It still says nothing about whether the player may READ that card —
 * a Field Card below its XP threshold is recognised here and still gated by
 * `LockedFieldCard` — and nothing about XP, which resolves through the printed deck alone,
 * so a Field Card discovery still pays zero.
 *
 * `Acer spp.` normalises to the bare genus `acer`, which is exactly what we want.
 */
const BY_BINOMIAL = new Map<string, string>();
const GENUS_CARDS = new Map<string, string>();
const SPECIES_BY_GENUS = new Map<string, string[]>();

for (const herb of CATALOGUE) {
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
 * Every card claiming this name through DECLARED COVERAGE — never through its own binomial.
 *
 * Returns all claimants rather than the first, because the caller has to be able to tell one
 * from several. Scope is read from `card-coverage.ts`, so widening a card is a data edit
 * there and not a new branch here — the difference between a declarative model and the pile
 * of string special-cases this replaced.
 */
function cardsCoveringByScope(name: string, genus: string): string[] {
  const claimed: string[] = [];
  /*
   * PRINTED_CARDS, deliberately, while the index above is the whole catalogue. Declared
   * coverage answers "the owner widened this PRINTED card beyond the binomial it prints",
   * which is a statement about physical artwork somebody is holding. No Field Card prints a
   * binomial at all, every one is species-scoped, and `scopeFor` would hand them the
   * `species` default this loop skips on the next line — so iterating the catalogue here
   * would add a pass over nine entries to reach the identical answer.
   */
  for (const herb of PRINTED_CARDS) {
    const scope = scopeFor(herb.id);
    if (!scope || scope.type === 'species') continue;
    if (scope.type === 'genus') {
      if (genusOf(herb.scientificName) !== genus) continue;
      if (scope.excluded?.some((one) => normalizeName(one) === name)) continue;
      claimed.push(herb.id);
    } else if (scope.accepted.some((one) => normalizeName(one.scientificName) === name)) {
      claimed.push(herb.id);
    }
  }
  return claimed;
}

/**
 * Map one scientific name from an identification provider onto a card.
 *
 * Order matters: an exact species card beats the genus card that would also accept it, so a
 * result of "Rubus fruticosus" prefers a Blackberry species card over "Rubus spp." if both
 * ever existed.
 *
 * SCOPE: THE WHOLE CATALOGUE — printed cards and Field Cards alike. See the index above for
 * why this changed and why the argument that kept it narrow did not hold. A match here means
 * "Plantdex has a card that is this species", never "the player may read it" and never "this
 * is worth XP".
 */
export function matchScientificName(scientificName: string): PlantMatch {
  const name = normalizeName(scientificName);
  if (!name) return NO_MATCH;

  /*
   * BUILT ONCE, AT THE TOP, AND ATTACHED TO EVERY OUTCOME BELOW — including the ones that
   * match nothing. What the provider said is true regardless of whether Plantdex has a card
   * for it, and the branch that finds no card is exactly the one a Seed Shelf entry is built
   * from, so dropping the taxon there would lose it where it is most needed.
   */
  const observedTaxon: ObservedTaxon = {
    providerName: scientificName,
    name: displayName(scientificName),
    key: name,
    rank: taxonRank(scientificName),
  };
  const withTaxon = (match: Omit<PlantMatch, 'observedTaxon'>): PlantMatch => ({
    ...match,
    observedTaxon,
  });

  const exact = BY_BINOMIAL.get(name);
  if (exact) return withTaxon({ kind: 'exact', eligibility: 'exact', herbId: exact, confirmable: true });

  // A different name for the same plant is the same plant: `exact`, and confirmable.
  const synonym = ACCEPTED_NAME_SYNONYMS[name];
  if (synonym) {
    return withTaxon({ kind: 'exact', eligibility: 'exact', herbId: synonym, confirmable: true });
  }

  const genus = genusOf(scientificName);

  /*
   * DECLARED COVERAGE, and the specificity rule that keeps it from swallowing anything.
   *
   * An exact binomial has already returned above, so a card that prints this very species
   * always beats a broader card that merely contains it — which is what stops Goldenrod's
   * genus scope claiming a species another card names outright, and what would keep the two
   * Rumex cards intact if either were ever broadened.
   *
   * MORE THAN ONE CLAIMANT IS AN AMBIGUITY, NOT A TIE TO BREAK. Two cards declaring
   * overlapping scope is a classification mistake, and the honest response is to say so
   * rather than award whichever happened to be first in deck order. `coverage.test.ts`
   * fails the build on one, so this branch should be unreachable — it exists because
   * "unreachable" is a property of today's data, not of the code.
   */
  const claimants = cardsCoveringByScope(name, genus);
  if (claimants.length === 1) {
    const herbId = claimants[0]!;
    // The nine `Genus spp.` cards keep their own kind: the card says what it covers, and a
    // reader is owed that distinction from a card the owner widened after printing.
    const kind: MatchKind = GENUS_CARDS.get(genus) === herbId ? 'genusCard' : 'acceptedScope';
    /*
     * THREE WAYS TO QUALIFY, AND THEY ARE NOT THE SAME CLAIM.
     *
     *   genusCard     the card prints `Genus spp.` — its own stated scope.
     *   acceptedGroup a researched member of a curated list.
     *   legacyGenus   a `pendingCuration` override. Temporary, and named so it can be
     *                 found and removed rather than blending into the other two.
     */
    const scope = scopeFor(herbId);
    const eligibility: Eligibility =
      kind === 'genusCard'
        ? 'genusCard'
        : scope?.type === 'acceptedGroup'
          ? 'acceptedGroup'
          : 'legacyGenus';
    return withTaxon({ kind, eligibility, herbId, confirmable: true });
  }
  if (claimants.length > 1) {
    return withTaxon({
      kind: 'ambiguous',
      eligibility: 'ambiguous',
      herbId: claimants[0],
      relatedHerbIds: claimants,
      confirmable: false,
    });
  }

  // A different species in a genus the deck covers. Related, and worth showing so the player
  // can see why it came up — but never confirmable as that card.
  const related = SPECIES_BY_GENUS.get(genus);
  if (related?.length) {
    return withTaxon({
      kind: 'sameGenus',
      eligibility: 'related',
      herbId: related[0],
      relatedHerbIds: related,
      confirmable: false,
    });
  }

  return withTaxon({ kind: 'none', eligibility: 'none', confirmable: false });
}

/** One ranked result from the provider, after matching. */
export interface ScanCandidate {
  scientificName: string;
  commonName?: string;
  /** Provider score, 0–1. */
  score: number;
  /**
   * Taxonomy identifiers the provider attached, when it did.
   *
   * Passed through untouched and used for nothing here — matching is by name, through the
   * normaliser above, exactly as it was. They exist so a Seed Shelf entry can be recognised
   * later against a source of truth rather than by string comparison, and they are optional
   * because a provider that stops sending them must not break a scan.
   */
  gbifId?: string;
  powoId?: string;
  /**
   * The signed candidate `identify-plant` issued for this identity, when the deployment has
   * an attestation secret. OPAQUE HERE and used for nothing in this module — matching is by
   * name exactly as it always was. It is relayed to `seed-packet`, which is the only thing
   * that can read it, and which will not create a new canonical row without one.
   */
  attestation?: string;
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
  if (confirmable.length === 0) {
    return candidates.some((candidate) => candidate.match.herbId) ? 'relatedOnly' : 'noMatch';
  }
  /*
   * RANK, NOT AN ABSOLUTE SCORE.
   *
   * This used to read `score >= 0.35`, a threshold I invented. Five real photographs of
   * broad-leaved dock put Rumex obtusifolius top every time, at 0.616, 0.481, 0.438, 0.341
   * and 0.303 — so that number cut a single species' own distribution almost in half, and
   * two of the five were headed "Not sure about this one" over the words "nothing scored
   * well enough to suggest", while the deck's own card sat underneath with a confirm button.
   * That is what "it will not identify dock" turned out to mean.
   *
   * A provider's absolute score is not comparable between species anyway: it falls as the
   * genus gets bigger, because the confidence is divided among congeners. Twenty Rumex
   * species means a lower number for the same quality of photograph. What IS comparable is
   * rank — whether the identifier's leading answer is a card you can log.
   *
   * So `matched` means the top-ranked candidate is that card, and `uncertain` means one is
   * in the list but the identifier's best guess is something else. Neither changes what may
   * be logged; both show the score and the band; the caution above them is unconditional.
   */
  return candidates[0]?.match.confirmable ? 'matched' : 'uncertain';
}
