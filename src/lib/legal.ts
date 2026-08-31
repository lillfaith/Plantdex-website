/**
 * WHAT THE LEGAL PAGES MAY AND MAY NOT SAY.
 *
 * A privacy policy is a factual description of a system. Every sentence on /privacy and
 * /terms has to be checkable against this repository, because a policy that overstates what
 * a product does is worse than no policy: it is a false statement about people's data, made
 * in the one document they are entitled to rely on.
 *
 * So the pages are written from the code — the tables in `supabase/migrations`, the storage
 * keys in `src/lib`, the auth calls in `AuthProvider` — and anything that cannot be
 * established from the repository is NOT WRITTEN. It is registered here and rendered as a
 * visible gap instead.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY A REGISTRY RATHER THAN "TODO" COMMENTS
 *
 * A TODO in a policy page is invisible to the person publishing it. These render on the
 * page itself, in a marked block, so the document cannot be mistaken for finished — the same
 * reasoning as `Source.verified`, where an unverified citation renders as nothing rather
 * than as a citation. `legal.test.ts` fails the build if a page uses a placeholder that is
 * not registered here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type OwnerInputKind = 'business' | 'legal' | 'operational';

export interface OwnerInput {
  /** Stable id, used as the placeholder token on the page. */
  id: string;
  /** What is missing, in the owner's words. */
  label: string;
  /** Why the policy cannot be completed without it. */
  why: string;
  kind: OwnerInputKind;
  /**
   * True when the pages should not be published until this is answered. A missing contact
   * address is blocking — a policy nobody can act on is not a policy. A retention period is
   * not, because the honest interim statement is that data is kept until deletion.
   */
  blocking: boolean;
}

/**
 * Everything the policies need that this repository cannot answer.
 *
 * Deliberately not guessed. "Delaware C-corp", "you may contact us at privacy@…" and
 * "governed by the laws of the State of …" are all plausible sentences and all inventions,
 * and each one is a legal claim made on the owner's behalf.
 */
export const OWNER_INPUTS: readonly OwnerInput[] = [
  {
    id: 'legal-entity',
    label: 'Legal entity name and trading address',
    why: 'A privacy policy has to name the party that decides how the data is used. "Plantdex" is a product name; the controller is a person or a company.',
    kind: 'business',
    blocking: true,
  },
  {
    id: 'contact-email',
    label: 'Contact address for privacy, data and support requests',
    why: 'Every right described on the privacy page — access, deletion, correction — needs somewhere to be exercised. There is no contact route anywhere in the app today.',
    kind: 'business',
    blocking: true,
  },
  {
    id: 'governing-law',
    label: 'Governing law and jurisdiction for the Terms',
    why: 'The Terms describe obligations but cannot say which law interprets them, or where a dispute would be heard.',
    kind: 'legal',
    blocking: true,
  },
  {
    id: 'data-region',
    label: 'Supabase project region, and whether a data processing agreement is in place',
    why: 'The app stores accounts and photos in Supabase. Where those servers physically sit determines what has to be disclosed about international transfers, and the repository only holds the project URL.',
    kind: 'operational',
    blocking: true,
  },
  {
    id: 'audience-scope',
    label: 'Which privacy regimes apply — UK/EU GDPR, CCPA, others',
    why: 'This depends on where users and the business are, not on the code. It changes which rights must be listed and whether a lawful-basis statement is required.',
    kind: 'legal',
    blocking: true,
  },
  {
    id: 'minimum-age',
    label: 'Minimum age for an account',
    why: 'The app asks for an email address and stores photographs, and nothing in it checks or mentions age. A deck about plants plausibly attracts children, which brings specific obligations.',
    kind: 'legal',
    blocking: true,
  },
  {
    id: 'retention',
    label: 'How long data is kept after an account is closed',
    why: 'The database cascades every row when a user is deleted, but nothing states a period, and Storage objects are not covered by that cascade.',
    kind: 'operational',
    blocking: false,
  },
  {
    id: 'liability',
    label: 'Warranty disclaimer and limitation of liability wording',
    why: 'Standard clauses, but their scope and any statutory carve-outs are a legal decision, and this is a product where a person may eat a plant.',
    kind: 'legal',
    blocking: true,
  },
  {
    id: 'commerce-terms',
    label: 'Deck price, shipping destinations, delivery times and returns policy',
    why: 'The Terms describe a site that does not sell anything yet. Commerce clauses are deliberately absent rather than drafted in advance.',
    kind: 'business',
    blocking: false,
  },
];

const BY_ID = new Map(OWNER_INPUTS.map((input) => [input.id, input]));

export function ownerInput(id: string): OwnerInput | undefined {
  return BY_ID.get(id);
}

export function blockingOwnerInputs(): readonly OwnerInput[] {
  return OWNER_INPUTS.filter((input) => input.blocking);
}

/**
 * Whether the pages are finished.
 *
 * `'draft'` while any blocking input is outstanding. The pages say so at the top, because a
 * visitor reading a policy is entitled to know it is incomplete — and because a draft that
 * looks finished is how a placeholder ships.
 */
export const LEGAL_STATUS: 'draft' | 'published' =
  blockingOwnerInputs().length > 0 ? 'draft' : 'published';

/**
 * The date the *described behaviour* was last checked against the code.
 *
 * Not a "last updated" vanity stamp: it is the day someone verified that the pages still
 * describe what the app does. Update it when the data handling changes, not when a typo is
 * fixed.
 */
export const LEGAL_REVIEWED = '2026-08-31';
