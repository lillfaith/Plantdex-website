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
    why: 'Deleting an account now erases every row and every photograph immediately, so the app-level answer is "nothing is kept". What survives in the provider\'s own backups, and for how long, is a question about the Supabase plan rather than about this code.',
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
  /*
   * COMMERCE. These are marked non-blocking because they gate SELLING, not publishing the
   * privacy and terms pages — /shop renders an honest "not on sale yet" state without them,
   * so the site is publishable while they are outstanding. They are all blocking for a
   * launch, which is a different question from whether the policies can go up.
   */
  {
    id: 'commerce-terms',
    label: 'Deck price and currency',
    why: 'A price is an offer. Stripe holds the real one on the Payment Link, and the page prints whatever NEXT_PUBLIC_DECK_PRICE is set to — so the two have to be set together, by the owner, from a landed cost that is known.',
    kind: 'business',
    blocking: false,
  },
  {
    id: 'shipping-policy',
    label: 'Countries shipped to, dispatch time, delivery estimate and postage cost',
    why: 'Every one of these is a promise to a buyer and none of them can be derived from this repository. A plausible "ships in 3-5 days" is a fabricated shipping claim, which AGENTS.md prohibits outright.',
    kind: 'business',
    blocking: false,
  },
  {
    id: 'returns-policy',
    label: 'Return window, condition required, and who pays return postage',
    why: 'Consumers in the UK and EU have statutory cancellation rights that a policy may extend but never reduce, so the wording is a legal decision rather than a preference. It also depends on where the seller is established.',
    kind: 'legal',
    blocking: false,
  },
  {
    id: 'tax-registration',
    label: 'Where the business is registered to collect sales tax or VAT',
    why: 'Stripe Tax can calculate and monitor thresholds, but calculating tax is not the same as being registered to collect it. Collecting in a jurisdiction where the business is not registered is a compliance problem, not a settings toggle.',
    kind: 'operational',
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
