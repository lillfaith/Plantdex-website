/**
 * A GENERATED card, and the five states its medicinal content passes through.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FIVE STATES, BECAUSE COLLAPSING ANY TWO OF THEM TURNS A SEARCH HIT INTO A
 * MEDICAL CLAIM.
 *
 *   retrieved         Bytes came back from a named endpoint at a recorded time. Nothing
 *                     has been read, judged or attributed.
 *   ai-extracted      A model proposed a claim, pointing at a retrieved passage.
 *   citation-checked  A DETERMINISTIC validator confirmed the claim's quote is a verbatim
 *                     substring of the passage it cites, and that it cites that passage's
 *                     source. A MACHINE did this.
 *   human-reviewed    A named person read the claim beside its quote and voted.
 *   approved          `human-reviewed` with an `approve` verdict, AND the cited source is
 *                     `verified` in `sources.json`.
 *
 * `citation-checked` IS NOT `verified`, AND NOTHING MAY RENDER IT AS IF IT WERE.
 * `verified` goes on meaning exactly what `src/data/sources.json` has always made it mean:
 * a human opened the document. The citation check proves a sentence was COPIED ACCURATELY
 * out of a paper nobody has read. Those are different acts, and a surface that prints one
 * where the other belongs is the whole failure this file exists to prevent — the same
 * reason `resolveRefs()` drops anything not `verified: true` rather than showing it dimmed.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * AN ARRAY WITH THE TYPE DERIVED FROM IT, not a bare union: `scripts/check_citations.py`
 * repeats this list, and a union gives nothing to compare a script against. Same shape as
 * `TAXON_RANKS` and `SPECIES_CONFIDENCES`, for the same reason.
 */
export const PIPELINE_STATES = [
  'retrieved',
  'ai-extracted',
  'citation-checked',
  'human-reviewed',
  'approved',
] as const;

export type PipelineState = (typeof PIPELINE_STATES)[number];

/** `medicinal_claims.kind` in migration 0010, verbatim. */
export const CLAIM_KINDS = [
  'traditional-use',
  'studied-property',
  'compound',
  'plant-part',
  'preparation',
  'toxicity',
  'contraindication',
  'lookalike-hazard',
] as const;

export type ClaimKind = (typeof CLAIM_KINDS)[number];

/**
 * The three kinds that `set_medicinal_claim_risk()` marks high risk, restated.
 *
 * DERIVED, NEVER TYPED BY AN AUTHOR — the same rule the database trigger enforces, because
 * left to an author the one row that most needs the flag is the one most likely to be
 * missing it.
 */
export const HIGH_RISK_KINDS: readonly ClaimKind[] = [
  'toxicity',
  'contraindication',
  'lookalike-hazard',
];

export function isHighRisk(kind: ClaimKind): boolean {
  return HIGH_RISK_KINDS.includes(kind);
}

/**
 * THE CARD BASE HAS SIX BACK PANELS AND A STATS GAUGE, AND A GENERATED CARD KEEPS THEM ALL.
 *
 * `docs/assets/cardbase.pdf` is the blank template: the front carries a title bar, a card
 * number, the artwork window with its gold corners, a vertical gauge and an encounter-rate
 * strip; the back carries HEALING TRAITS, SIGNATURE COMPOUNDS, TASTE PROFILE, AROMATIC
 * PROFILE, PREPARATIONS and USABLE PARTS.
 *
 * THE FIRST DESIGN DROPPED THE PANELS IT COULD NOT FILL, AND THAT WAS WRONG IN BOTH
 * DIRECTIONS. A card missing two of its six panels is not recognisably a Plantdex card --
 * and silently removing a heading is a quieter lie than leaving it empty, because a reader
 * who never sees "Taste profile" never learns that the deck has one and this card has
 * nothing for it.
 *
 * So every panel is PRESENT and each carries an availability:
 *
 *   sourced       Filled from approved, human-verified claims.
 *   unavailable   Structurally unobtainable for a generated species, with the reason
 *                 printed in the panel. Taste and aroma were tasted and smelled by a
 *                 person holding the plant; the water/sun/temperature gauge is COUNTED OFF
 *                 THE PRINTED ARTWORK by `build_deck.py`, and there is no printed artwork
 *                 to count. None of the three may be guessed, and a fictional gameplay
 *                 number in a botanical slot is the specific thing that must never happen.
 *   pending       Obtainable, but no claim has cleared review yet.
 *
 * `unavailable` is a statement about the method, `pending` is a statement about progress,
 * and collapsing them would turn "nobody has done this yet" into "this cannot be known".
 */
export const CARD_PANELS = [
  'healingTraits',
  'compounds',
  'taste',
  'aromatic',
  'preparations',
  'usableParts',
] as const;

export type CardPanel = (typeof CARD_PANELS)[number];

export type PanelAvailability = 'sourced' | 'unavailable' | 'pending';

export const PANEL_LABEL: Record<CardPanel, string> = {
  healingTraits: 'Healing Traits',
  compounds: 'Signature Compounds',
  taste: 'Taste Profile',
  aromatic: 'Aromatic Profile',
  preparations: 'Preparations',
  usableParts: 'Usable Parts',
};

/** Panels a generated species can never fill, with the reason the card prints. */
export const UNAVAILABLE_PANELS: Partial<Record<CardPanel, string>> = {
  taste: 'Tasted by a person holding the plant. Not in the literature, and not guessed.',
  aromatic: 'Smelled by a person holding the plant. Not in the literature, and not guessed.',
};

/** The front gauge is the same case, and it is not a panel. */
export const GAUGE_UNAVAILABLE =
  'Water, sun and temperature are counted off the printed card artwork. '
  + 'This species has no printed card, so the gauge is blank rather than invented.';

/** Which claim kinds feed which panel. A panel with no mapped kind stays `pending`. */
export const PANEL_SOURCES: Partial<Record<CardPanel, readonly ClaimKind[]>> = {
  healingTraits: ['traditional-use', 'studied-property'],
  compounds: ['compound'],
  preparations: ['preparation'],
  usableParts: ['plant-part'],
};

export function panelAvailability(
  panel: CardPanel,
  approvedKinds: readonly ClaimKind[],
): PanelAvailability {
  if (panel in UNAVAILABLE_PANELS) return 'unavailable';
  const feeds = PANEL_SOURCES[panel] ?? [];
  return feeds.some((kind) => approvedKinds.includes(kind)) ? 'sourced' : 'pending';
}

export interface GeneratedClaim {
  claimId: string;
  kind: ClaimKind;
  /** The three-way standing `trait-evidence.ts` already uses. */
  standing: 'traditional' | 'laboratory' | 'clinical';
  /** The sentence the card would print. */
  body: string;
  /** Verbatim, from the cited passage. The citation check compares this byte for byte. */
  quote: string;
  passageId: string;
  sourceIds: string[];
  /** Derived from `kind`, never supplied. */
  highRisk: boolean;
  state: PipelineState;
  citationCheck: { ok: boolean; reason: string | null };
  review: {
    verdict: 'approve' | 'reject' | 'revise' | null;
    by: string | null;
    on: string | null;
    note: string | null;
  };
}

export interface GeneratedCard {
  speciesKey: string;
  acceptedName: string;
  commonNames: string[];
  family: string | null;
  gbifId: string | null;
  /** `collectionId` is always this. It is NOT a second printed deck. */
  collectionId: 'generated';
  tier: 'generated';
  conservation: {
    iucnCategory: string | null;
    atRisk: boolean;
    /** False unless an explicit low-concern assessment exists. Missing data is not abundance. */
    promotable: boolean;
    note: string;
  };
  claims: GeneratedClaim[];
  sprite: { method: string; recipe: unknown; anchors: unknown } | null;
  /** Content and artwork are voted SEPARATELY and neither implies the other. */
  review: {
    content: 'approve' | 'reject' | 'revise' | null;
    artwork: 'approve' | 'reject' | 'regenerate' | null;
    by: string | null;
    on: string | null;
  };
}

/**
 * A card may be published only when BOTH verdicts are `approve`, every printed claim is
 * approved, and every cited source is verified.
 *
 * Deliberately a pure predicate over the record rather than a stored flag: a `published`
 * boolean is a thing that can be set, and this is a thing that has to be true. Same
 * reasoning as XP being derived rather than stored.
 */
export function canPublish(
  card: GeneratedCard,
  isSourceVerified: (sourceId: string) => boolean,
): { ok: boolean; blockers: string[] } {
  const blockers: string[] = [];

  if (card.review.content !== 'approve') blockers.push('medicinal content is not approved');
  if (card.review.artwork !== 'approve') blockers.push('artwork is not approved');

  const printable = card.claims.filter((claim) => claim.review.verdict !== 'reject');
  if (printable.length === 0) blockers.push('no claim survived review');

  for (const claim of printable) {
    if (!claim.citationCheck.ok) {
      blockers.push(`${claim.claimId}: failed the citation check`);
    }
    if (claim.review.verdict !== 'approve') {
      blockers.push(`${claim.claimId}: no human approval`);
    }
    if (claim.state !== 'approved') {
      blockers.push(`${claim.claimId}: state is ${claim.state}, not approved`);
    }
    for (const sourceId of claim.sourceIds) {
      if (!isSourceVerified(sourceId)) {
        // THE LOAD-BEARING LINE. A citation-checked claim cites a paper nobody has
        // opened; printing it would make `verified` mean "a machine matched a string".
        blockers.push(`${claim.claimId}: source ${sourceId} is not verified by a human`);
      }
    }
  }

  return { ok: blockers.length === 0, blockers };
}
