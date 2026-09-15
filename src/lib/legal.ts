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
   * WHY THIS ANSWER STILL WANTS A LAWYER, when it has one.
   *
   * Some questions here are answerable in the owner's own words and still not SETTLED by
   * them: "which privacy regimes apply" and "how far may liability be excluded" both depend
   * on facts and law outside this repository, so a careful draft is the right thing to
   * publish and the wrong thing to call final.
   *
   * It is a separate axis from `value` on purpose. Without it the only two states are
   * "missing" and "done", so a considered draft has to be recorded as done — and the day the
   * last genuinely-missing answer lands, the draft banner disappears from wording nobody has
   * reviewed. `LEGAL_STATUS` reads this too, so an outstanding review keeps the pages in
   * draft rather than merely noting a regret in a comment.
   */
  reviewRecommended?: string;
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
    label: 'Supabase project region',
    why: 'The app stores accounts and photos in Supabase. Where those servers physically sit determines what has to be disclosed about international transfers, and the repository only holds the project URL.',
    kind: 'operational',
    blocking: true,
    /*
     * READ OFF THE DASHBOARD, not inferred. A `cf-ray` header from a request to the project
     * names the Cloudflare edge that answered it, which is where the CALLER is, not where the
     * database sits — so the one piece of evidence reachable from here is the one that looks
     * authoritative and is not. The owner read this from Project Settings.
     */
    value: 'East US (North Virginia), in the United States',
  },
  {
    /*
     * SPLIT OUT OF `data-region`, WHICH WAS TWO QUESTIONS SHARING A SENTENCE. The region is a
     * fact anybody with the dashboard can read; whether an agreement is in place is a
     * determination about how a published document is entered into. Gluing them together meant
     * the known half could not be disclosed until the unknown half was settled — the same
     * reason `shipping-policy` became five ids.
     */
    id: 'data-processing-agreement',
    label: 'Whether a data processing agreement with Supabase is in place',
    why: 'A privacy page that names a processor holding account data and photographs has to say what governs that arrangement. Supabase publishes an addendum; what is not established is whether this account has accepted it, which is what would put it in force.',
    kind: 'legal',
    blocking: true,
    /*
     * THIS WAS BRIEFLY MARKED ANSWERED, AND SHOULD NOT HAVE BEEN. The addendum's own opening
     * says it "supplements and forms part of the Supabase Terms of Service … effective as of
     * the Effective Date of the Agreement", and that was read as meaning acceptance of the
     * terms is acceptance of the addendum. It does not follow, and the currently published
     * wording the owner then checked is narrower still: it dates the addendum from when the
     * customer "signs or otherwise agrees to" it. Two readings of a document neither of us
     * can bind, and the question is not which reading is better — it is whether THIS ACCOUNT
     * agreed, which no clause can answer and no dashboard page showed.
     *
     * An effective-date clause tells you WHEN an agreement starts once it exists. It is not
     * evidence that it exists. The page may say Supabase publishes an addendum, because that
     * is observable; it may not say one is in force here, because that is not.
     *
     * HOW TO ACTUALLY CLOSE IT. Supabase offers a DPA to customers who ask, from the
     * organisation-level Security area of the dashboard, and the document carries customer
     * fields and signature lines — it takes effect when the customer signs or otherwise
     * agrees to it. So this becomes answerable by EXECUTING it, not by reading it again.
     * Record the date it was accepted as the value.
     */
  },
  {
    id: 'audience-scope',
    label: 'Which privacy regimes apply — UK/EU GDPR, CCPA, others',
    why: 'This depends on where users and the business are, not on the code. It changes which rights must be listed and whether a lawful-basis statement is required.',
    kind: 'legal',
    blocking: true,
    /*
     * THE ANSWER IS A POSTURE, NOT A RULING, and the wording is the owner's own.
     *
     * "US only, GDPR does not apply" would have been the easy sentence and it is a claim
     * this repository cannot support: the app is publicly reachable, and whether a regime
     * applies turns on facts well beyond where the shop ships. So the page says where
     * Plantdex is operated and who it is directed to — both observable — and commits to
     * honouring rights where law gives them, without asserting that any particular law does
     * or does not reach a given reader.
     *
     * Read inline: "/privacy" carries the full statement as prose; this summary completes
     * the cross-reference on "/returns", which asks only which regime governs a refund.
     */
    value:
      'primarily the United States, where Plantdex is operated and to whose users it is ' +
      'directed \u2014 it is not specifically marketed to the EU or UK, and no blanket GDPR or ' +
      'CCPA compliance claim is made, but rights under any law that does apply to you are ' +
      'honoured as that law requires',
    reviewRecommended:
      'Which regimes legally reach a publicly accessible service is a question of fact and ' +
      'law, not of copy. The wording claims no more than it can support, which is the point ' +
      'of it, but a lawyer should confirm the posture before the pages come out of draft.',
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
    /*
     * ANSWERED IN THE OWNER'S OWN WORDS, and the full clause is PROSE ON "/terms" rather
     * than a string here. That is not a departure from "the answer lives in one place": what
     * lives in one place is the ANSWER to a question six sentences reference, and this
     * answer is four paragraphs of operative text that appears exactly once, on the page it
     * governs. A clause is the policy, not a fact quoted by it.
     *
     * This summary is what the two CROSS-REFERENCES need — "/terms-of-sale" states the sale
     * position and points at the Terms for the clause itself.
     *
     * DELIBERATELY NO DOLLAR CAP. "Liability limited to the purchase price" is the obvious
     * next clause and the owner ruled it out pending review: enforceability varies and this
     * is a product where somebody may eat a plant. Do not add one here.
     */
    value:
      'set out in full under Responsibility in the Terms of Use \u2014 in short, Plantdex is ' +
      'educational and is not professional foraging, medical or toxicological advice; no ' +
      'warranty is given that any identification suggestion or plant description is complete, ' +
      'current or error-free; and liability is excluded to the fullest extent the law permits, ' +
      'with nothing excluded that cannot lawfully be excluded',
    reviewRecommended:
      'The clause is deliberately firm rather than aggressive and preserves consumer rights ' +
      'that cannot be waived, but its scope and any statutory carve-outs are a legal ' +
      'decision on a product that carries ingestion risk. A lawyer should confirm it before ' +
      'the pages come out of draft.',
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
 * Answers that are written but not yet professionally reviewed.
 *
 * Separate from `blockingOwnerInputs()` because they fail differently: a blocking input has
 * a HOLE in the page, visible to any reader. These have finished sentences that read as
 * settled, which is exactly why they need a second signal — nothing about the page itself
 * would tell you the wording is a considered draft.
 */
export function reviewOutstanding(): readonly OwnerInput[] {
  return OWNER_INPUTS.filter((input) => input.reviewRecommended);
}

/**
 * Whether the pages are finished.
 *
 * `'draft'` while any blocking input is outstanding, OR while any answer is still awaiting
 * review. The pages say so at the top, because a visitor reading a policy is entitled to
 * know it is incomplete — and because a draft that looks finished is how a placeholder
 * ships.
 *
 * REVIEW COUNTS TOWARDS DRAFT, and that is the whole reason the flag is a field rather than
 * a comment. Two of these answers are careful drafts of clauses whose SCOPE is a legal
 * question — which regimes reach a public website, how far liability may be excluded on a
 * product somebody may eat. Counted only as "answered", the day the last genuinely-missing
 * fact landed the banner would vanish from wording nobody had reviewed, and the pages would
 * present themselves as in force. A label that changes nothing is a label nobody acts on.
 *
 * So this flips to `'published'` only when the gaps are filled AND the reviews are cleared,
 * and clearing one is deleting its `reviewRecommended` — a deliberate edit by somebody who
 * knows what it means.
 */
export const LEGAL_STATUS: 'draft' | 'published' =
  blockingOwnerInputs().length > 0 || reviewOutstanding().length > 0 ? 'draft' : 'published';

/**
 * The date the *described behaviour* was last checked against the code.
 *
 * Not a "last updated" vanity stamp: it is the day someone verified that the pages still
 * describe what the app does. Update it when the data handling changes, not when a typo is
 * fixed.
 */
export const LEGAL_REVIEWED = '2026-09-13';
/*
 * MOVED BECAUSE THE DATA HANDLING CHANGED, which is the only thing that moves it. A photo the
 * browser cannot re-encode is now REFUSED rather than stored as the camera original, so there
 * is no longer any path that keeps EXIF and its GPS — that is a different description of the
 * application from the one 2026-08-31 was checked against, and leaving the date would have
 * understated a real change on the page whose whole job is describing what the app does.
 */
