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
  /**
   * The owner's answer, once given. Absent means still outstanding.
   *
   * THE ANSWER LIVES HERE AND NOWHERE ELSE. `legal-entity` renders in three sentences and
   * `contact-email` in six, so writing an answer into the copy means writing it six times and
   * hoping all six stay in step. `OwnerGap` reads this field instead: one answer, one place,
   * no drift. It is also what lets `LEGAL_STATUS` flip on its own when the last blocking
   * value lands, rather than needing somebody to remember a second edit.
   */
  value?: string;
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
    /*
     * THE ADDRESS THE OWNER GAVE, and the reason this field exists rather than six pasted
     * copies: this one renders on /privacy, /returns (three times), /shipping and
     * /terms-of-sale. A template placeholder arrived here twice before the real address did,
     * and both times it would have shipped as a policy nobody could act on.
     */
    value: 'bboymont@gmail.com',
  },
  {
    id: 'governing-law',
    label: 'Governing law and jurisdiction for the Terms',
    why: 'The Terms describe obligations but cannot say which law interprets them, or where a dispute would be heard.',
    kind: 'legal',
    blocking: true,
    value: 'the law of the State of Georgia, USA, with any dispute heard in the courts of Georgia',
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
    value: '13 years old',
  },
  {
    id: 'retention',
    label: 'How long data is kept after an account is closed',
    why: 'Deleting an account now erases every row and every photograph immediately, so the app-level answer is "nothing is kept". What survives in the provider\'s own backups, and for how long, is a question about the Supabase plan rather than about this code.',
    kind: 'operational',
    blocking: false,
    /*
     * THE APP-LEVEL TRUTH, WHICH IS ALREADY TRUE IN CODE, and deliberately no number for the
     * provider's backups. Inventing "30 days" would be a claim about somebody else's
     * infrastructure; saying the window is Supabase's rather than ours is simply accurate.
     */
    value:
      "governed by Supabase's own backup schedule rather than by Plantdex \u2014 nothing is kept in the application itself, and no copy is made anywhere else",
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
    value: '$24.99 USD, before tax and shipping',
  },
  /*
   * SHIPPING IS FIVE FACTS, NOT ONE. A single `shipping-policy` entry fed six render sites
   * that ask five different questions, so one string could not serve them — "United States
   * only" would have appeared in the Postage cost row. Each fact gets its own id and its own
   * answer. Every value here came from the owner: AGENTS.md prohibits fabricated shipping
   * claims outright, so a plausible default is the one thing that may never be written here.
   */
  {
    id: 'shipping-destinations',
    label: 'Countries shipped to',
    why: 'The checkout enforces this, not the page — so the page must describe what the Payment Link is actually configured to allow.',
    kind: 'business',
    blocking: false,
    value: 'the United States only',
  },
  {
    id: 'shipping-dispatch',
    label: 'Time from payment to dispatch',
    why: 'A promise to a buyer, and one this repository cannot derive. It is also distinct from transit time, which the page prints separately.',
    kind: 'business',
    blocking: false,
    value: '3-5 business days',
  },
  {
    id: 'shipping-delivery',
    label: 'Carrier transit time after dispatch',
    why: 'Buyers read the SUM of this and the dispatch window, so the two are stated separately and must both be honest.',
    kind: 'business',
    blocking: false,
    value: '3-7 business days after dispatch',
  },
  {
    id: 'shipping-postage',
    label: 'Postage cost and how it is charged',
    why: 'The page states this is added at checkout before payment, so it has to match how the Stripe Payment Link is configured — which cannot be read from this repository.',
    kind: 'business',
    blocking: false,
    value: 'A flat $5.99 USD per order.',
  },
  {
    id: 'shipping-tracking',
    label: 'Whether tracking is provided',
    why: 'The page has a Tracking row, and an unanswered one implies nothing rather than saying so.',
    kind: 'business',
    blocking: false,
    value: 'Every order ships tracked, and the tracking number is sent to you.',
  },
  /*
   * RETURNS IS THREE FACTS, split for the same reason shipping is. These govern VOLUNTARY
   * returns only: a damaged, faulty, wrong or undelivered order is already stated on the page
   * as always covered at the seller's cost, and that is not an owner input.
   *
   * `kind: 'legal'` on each, because a policy may EXTEND statutory rights and never reduce
   * them — the page says in words that the law wins on conflict.
   */
  {
    id: 'returns-window',
    label: 'How long a buyer has to start a voluntary return',
    why: 'A commercial choice the owner is free to make more generous than the law, and not free to make less.',
    kind: 'legal',
    blocking: false,
    value: '30 days from delivery',
  },
  {
    id: 'returns-condition',
    label: 'Condition a returned deck must be in',
    why: 'Printed cards can be read, photographed or copied and then returned, so the condition bar is a real commercial decision rather than boilerplate.',
    kind: 'legal',
    blocking: false,
    value: 'Opened is fine — it must be complete, with all cards present, and undamaged.',
  },
  {
    id: 'returns-postage',
    label: 'Who pays return postage on a voluntary return',
    why: 'Distinct from a damaged or wrong order, where the page already promises the cost is never the buyer\'s.',
    kind: 'legal',
    blocking: false,
    value: 'You do, on a change-of-mind return. We pay it when the deck was damaged, faulty or wrong.',
  },
  {
    id: 'tax-registration',
    label: 'Where the business is registered to collect sales tax or VAT',
    why: 'Stripe Tax can calculate and monitor thresholds, but calculating tax is not the same as being registered to collect it. Collecting in a jurisdiction where the business is not registered is a compliance problem, not a settings toggle.',
    kind: 'operational',
    blocking: false,
    /*
     * CHECKOUT BEHAVIOUR ONLY — this sentence deliberately makes NO claim about where the
     * seller is registered to collect. Stripe Tax is enabled while the seller holds no
     * registrations, which is exactly the situation the `why` above warns about; describing
     * the checkout is truthful, describing a registration would not be.
     */
    value:
      'Calculated and added by Stripe at checkout, based on your delivery address. The price above is before tax.',
  },
];

const BY_ID = new Map(OWNER_INPUTS.map((input) => [input.id, input]));

export function ownerInput(id: string): OwnerInput | undefined {
  return BY_ID.get(id);
}

export function blockingOwnerInputs(): readonly OwnerInput[] {
  // An answered entry is no longer outstanding, whatever its `blocking` flag says — the flag
  // records that the answer MATTERS, not that it is missing.
  return OWNER_INPUTS.filter((input) => input.blocking && !input.value);
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
