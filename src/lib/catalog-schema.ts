/**
 * The vocabularies the botanical catalog is built from.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ARRAYS WITH TYPES DERIVED FROM THEM, NEVER BARE UNIONS — and the reason is the database.
 *
 * `supabase/migrations/0010_botanical_catalog.sql` repeats every one of these as a CHECK
 * constraint. A union type gives a test nothing to compare a migration against, so the two
 * drift and the failure arrives from the far side: a constraint NARROWER than the type does
 * not degrade gracefully, Postgres REFUSES the insert, and a whole ingestion run dies on a
 * value nobody thought about. `identification-schema.test.ts` exists because 0006 had the
 * same seam; `catalog-schema.test.ts` holds this one.
 *
 * NOTHING HERE READS THE DATABASE. This module is vocabulary and shape only — no client, no
 * query, no fetch. The app has no catalog UI yet, and inventing one before Stage 3 would be
 * building against a schema that has never been exercised by a real ingestion.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { HABITATS } from './habitat';
import { RARITIES, SEASONS } from './types';

/**
 * Where a record is in its life.
 *
 * `draft` IS WHERE EVERYTHING STARTS AND WHERE INGESTION LEAVES IT. The pipeline cannot
 * promote a row; promotion is a human act, and for Layer C the database refuses an approval
 * that does not name its reviewer and cite a source.
 */
export const REVIEW_STATUSES = ['draft', 'in_review', 'approved', 'rejected'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/**
 * How settled a name is. `unresolved` and `conflicting` are ordinary answers from a
 * taxonomic backbone, and forcing either into `accepted` would invent a determination
 * nobody made — the same failure `pendingCuration` exists to avoid on the card side.
 */
export const TAXONOMY_STATUSES = ['accepted', 'synonym', 'unresolved', 'conflicting'] as const;
export type TaxonomyStatus = (typeof TAXONOMY_STATUSES)[number];

/**
 * THE FOUR OCCURRENCE CLASSES, AND THE ONE THAT CARRIES THE WHOLE IDEA.
 *
 * `insufficient` is the default and means "nobody knows". It is NOT `unlikely`, which is a
 * positive claim that an authority excludes the species from this region and which the
 * migration refuses without a source. Observation density tracks where iNaturalist users
 * live, not where plants grow, so a county with no records is usually a statement about
 * people.
 */
export const OCCURRENCE_CLASSES = ['confirmed', 'likely', 'insufficient', 'unlikely'] as const;
export type OccurrenceClass = (typeof OCCURRENCE_CLASSES)[number];

/** How it got there. Separate from occurrence, and from whether anybody has listed it. */
export const NATIVITY_CLASSES = ['native', 'introduced', 'cryptogenic'] as const;
export type NativityClass = (typeof NATIVITY_CLASSES)[number];

/**
 * A JURISDICTION'S LISTING, not an opinion about the plant — the distinction
 * `invasive-status.ts` already makes and the reason there is no `invasive: boolean`
 * anywhere in this codebase. `not-listed` is a meaningful answer, not a gap.
 */
export const INVASIVE_LISTINGS = ['listed', 'watchlist', 'not-listed'] as const;
export type InvasiveListing = (typeof INVASIVE_LISTINGS)[number];

/** How likely a walker is to meet it. Independent of all three above. */
export const ENCOUNTER_RATES = ['abundant', 'frequent', 'occasional', 'rare'] as const;
export type EncounterRate = (typeof ENCOUNTER_RATES)[number];

/** Drives the procedural sprite archetype. Null until somebody looks — never guessed. */
export const GROWTH_FORMS = [
  'rosette', 'erect-herb', 'vine', 'shrub', 'tree', 'grass', 'fern', 'succulent', 'aquatic',
] as const;
export type GrowthForm = (typeof GROWTH_FORMS)[number];

/**
 * THE PRINTED 45 ARE THEIR OWN TIER AND THE RENDERER MUST BE ABLE TO REFUSE THEM.
 *
 * `printed` art comes from a designer's two-page PDF (`scripts/build_deck.py`) and cannot be
 * regenerated — there is no program that produces it. A generated renderer that touched one
 * would destroy an asset with no source. The migration requires a `card_number` on this tier
 * for the same reason: a printed card's identity is its place in the physical deck.
 */
export const CARD_TIERS = ['printed', 'generated'] as const;
export type CardTier = (typeof CARD_TIERS)[number];

export const UNLOCK_BASES = ['field-discovery', 'xp-threshold', 'purchase'] as const;
export type UnlockBasis = (typeof UNLOCK_BASES)[number];

/** Layer C. Three of these are high risk, and the database derives that rather than trusting it. */
export const CLAIM_KINDS = [
  'traditional-use', 'studied-property', 'compound', 'plant-part',
  'preparation', 'toxicity', 'contraindication', 'lookalike-hazard',
] as const;
export type ClaimKind = (typeof CLAIM_KINDS)[number];

/** The kinds whose body could hurt somebody. Must equal the trigger in 0010. */
export const HIGH_RISK_CLAIM_KINDS = ['toxicity', 'contraindication', 'lookalike-hazard'] as const;

/** The same three-way standing `trait-evidence.ts` uses. Traditional use is not pharmacology. */
export const EVIDENCE_STANDINGS = ['traditional', 'laboratory', 'clinical'] as const;
export type EvidenceStanding = (typeof EVIDENCE_STANDINGS)[number];

/**
 * Who wrote the draft, kept forever.
 *
 * An `ai-assisted` row may never be `approved` — the migration refuses the combination
 * outright, so "a model drafted this" cannot quietly become "this is published" after one
 * edit. A human re-authoring it changes the row's `drafted_by`, which is a deliberate act
 * somebody has to perform and can be audited later.
 */
export const DRAFT_ORIGINS = ['human', 'ai-assisted', 'import'] as const;
export type DraftOrigin = (typeof DRAFT_ORIGINS)[number];

export const SOURCE_KINDS = [
  'occurrence-database', 'taxonomic-backbone', 'flora', 'field-guide',
  'ethnobotany', 'peer-reviewed', 'government', 'other',
] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export const REGION_KINDS = ['country', 'state', 'ecoregion', 'county'] as const;
export type RegionKind = (typeof REGION_KINDS)[number];

/** Re-exported so the catalog's own vocabulary is one import, and so the parity test can
 *  assert the catalog did not quietly fork its own copy of either. */
export { HABITATS, RARITIES, SEASONS };

/** Layer A. Makes no medical claim and must never gain a field that does. */
export interface CatalogSpecies {
  speciesKey: string;
  acceptedName: string;
  family?: string;
  commonNames: string[];
  gbifId?: string;
  taxonomyStatus: TaxonomyStatus;
  acceptedSpeciesKey?: string;
  growthForm?: GrowthForm;
  habitatClasses: (typeof HABITATS)[number][];
  seasons: (typeof SEASONS)[number][];
  medicinallyRelevant: boolean;
  /** Required by the database whenever `medicinallyRelevant` is true. */
  medicinalBasis?: string;
  reviewStatus: ReviewStatus;
  sourceIds: string[];
}

/** Layer B. A species may be collectible with no Layer C content at all. */
export interface CollectibleCard {
  speciesKey: string;
  tier: CardTier;
  cardNumber?: number;
  rarity: (typeof RARITIES)[number];
  xp: number;
  unlockBasis: UnlockBasis;
  published: boolean;
}

/** Layer C. One claim, one evidence standing, one review decision. */
export interface MedicinalClaim {
  speciesKey: string;
  kind: ClaimKind;
  body: string;
  standing: EvidenceStanding;
  highRisk: boolean;
  sourceIds: string[];
  reviewStatus: ReviewStatus;
  draftedBy: DraftOrigin;
}
