import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ANALYTICS_PROVIDER, EVENT_NAMES, UNEMITTED_EVENTS } from './analytics';
import {
  LEGAL_REVIEWED,
  reviewOutstanding,
  LEGAL_STATUS,
  OWNER_INPUTS,
  blockingOwnerInputs,
  ownerInput,
} from './legal';

const PRIVACY = 'src/app/privacy/page.tsx';
const TERMS = 'src/app/terms/page.tsx';
/*
 * The commerce pages are held to exactly the same standard as the originals: every gap
 * registered, no unregistered placeholder, the draft banner, a link to /safety. They are the
 * likeliest place for an invented "ships in 3-5 days" to appear, so they are in PAGES from
 * the day they were created rather than added after somebody notices.
 */
const TERMS_OF_SALE = 'src/app/terms-of-sale/page.tsx';
const SHIPPING = 'src/app/shipping/page.tsx';
const RETURNS = 'src/app/returns/page.tsx';
const PAGES = [PRIVACY, TERMS, TERMS_OF_SALE, SHIPPING, RETURNS];
const read = (path: string) => readFileSync(path, 'utf8');

/** Every file under a directory, so a new provider cannot hide in a folder nobody listed. */
function readdirRecursive(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? readdirRecursive(path) : [path];
  });
}

/**
 * A page's VISIBLE prose — comments removed.
 *
 * A reader sees the JSX, not the docblock, and several guards here assert that a page does
 * or does not say something. Read raw, a comment EXPLAINING why wording was avoided
 * satisfies a "does it say it" check and trips a "does it not say it" check — both of which
 * happened while writing the two guards below: a note quoting the sentence "GDPR does not
 * apply" as the thing NOT to write failed the test forbidding it.
 */
function prose(path: string): string {
  return read(path).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
}

/** Every `<OwnerGap id="..." />` used across the legal pages. */
function gapsUsed(): { path: string; id: string }[] {
  return PAGES.flatMap((path) =>
    [...read(path).matchAll(/<OwnerGap id="([a-z-]+)"/g)].map((match) => ({
      path,
      id: match[1]!,
    })),
  );
}

describe('owner input registry', () => {
  it('gives every entry a label and a reason', () => {
    expect(OWNER_INPUTS.length).toBeGreaterThan(0);
    for (const input of OWNER_INPUTS) {
      expect(input.label.length, input.id).toBeGreaterThan(10);
      // The reason is what stops the list becoming a shrug. It has to say why the policy
      // cannot be finished without it.
      expect(input.why.length, input.id).toBeGreaterThan(40);
    }
  });

  it('uses unique ids', () => {
    const ids = OWNER_INPUTS.map((input) => input.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('stops counting an entry as outstanding once it carries an answer', () => {
    /*
     * `blocking` records that the answer MATTERS; `value` records that it has been given. The
     * two together are what let LEGAL_STATUS flip on its own when the last blocking answer
     * lands, instead of needing somebody to remember a second edit in a second file — which
     * is exactly the kind of edit that gets forgotten and ships a "draft" banner over a
     * finished policy, or worse, a finished-looking policy with a gap still in it.
     */
    const answered = OWNER_INPUTS.filter((input) => input.blocking && input.value);
    const outstanding = blockingOwnerInputs();

    for (const input of answered) {
      expect(
        outstanding.some((open) => open.id === input.id),
        `"${input.id}" has an answer and is still listed as outstanding`,
      ).toBe(false);
    }

    // And the other direction: everything still listed is blocking AND genuinely unanswered,
    // so a blank string cannot quietly retire an entry.
    for (const input of outstanding) {
      expect(input.blocking, input.id).toBe(true);
      expect(input.value, `"${input.id}" is listed as outstanding but carries a value`).toBe(
        undefined,
      );
    }
  });

  it('keeps an answer awaiting review out of "published"', () => {
    /*
     * THE FAILURE THIS EXISTS FOR IS SILENT AND IN THE FUTURE.
     *
     * Two answers here — the audience posture and the liability clause — are careful drafts
     * of wording whose SCOPE is a legal question. Counted only as "answered", the day the
     * last genuinely-missing fact lands (the legal entity, the Supabase DPA) the draft
     * banner would disappear from prose nobody has reviewed, and the pages would present
     * themselves as in force. Nothing on the page would look wrong; that is the problem.
     *
     * So a pending review holds the pages in draft on its own, with every blocking input
     * answered.
     */
    expect(reviewOutstanding().length).toBeGreaterThan(0);
    expect(LEGAL_STATUS).toBe('draft');
  });

  it('says why each review is still wanted, rather than just flagging one', () => {
    // A bare boolean would be a shrug. The sentence is what tells whoever clears it what
    // they are being asked to confirm.
    for (const input of reviewOutstanding()) {
      expect(input.reviewRecommended!.length, input.id).toBeGreaterThan(40);
    }
  });

  it('only recommends review for something that has an answer to review', () => {
    /*
     * `reviewRecommended` on an unanswered entry would be incoherent — there is no wording
     * to check — and would hold the pages in draft for a reason the banner cannot explain,
     * since the banner counts it separately from the visible holes.
     */
    for (const input of reviewOutstanding()) {
      expect(input.value, `"${input.id}" wants review but carries no answer`).toBeDefined();
    }
  });

  it('states the liability clause on the page, not in the registry', () => {
    /*
     * The registry holds FACTS many sentences reference. This is four paragraphs of
     * operative text that appears once, on the page it governs — pasted into a string it
     * would render as one undifferentiated run, and pasted into both /terms and
     * /terms-of-sale it would be two copies free to drift.
     *
     * Checked by its substance rather than its length: the clause has to actually say the
     * things that make it a disclaimer.
     */
    const terms = prose('src/app/terms/page.tsx');
    expect(terms).toMatch(/educational and\s+informational purposes only/);
    expect(terms).toMatch(/inherently uncertain/);
    expect(terms).toMatch(/merchantability, fitness for a particular purpose/);
    // The carve-out is what stops the rest reading as an attempt to exclude the unexcludable.
    expect(terms).toMatch(/cannot lawfully be excluded or limited/);
  });

  it('adds no monetary liability cap anywhere', () => {
    /*
     * "Liability limited to the purchase price" is the obvious next clause and was ruled out
     * pending legal review: enforceability varies, and this is a product where somebody may
     * eat a plant. A guard rather than a comment, because the comment is in a file nobody
     * reads while drafting the next paragraph.
     */
    for (const path of PAGES) {
      expect(prose(path), `${path}: monetary liability cap`).not.toMatch(
        /liability[^.]{0,80}(limited|capped)[^.]{0,80}(\$|purchase price|amount (you )?paid)/i,
      );
    }
  });

  it('claims no blanket GDPR or CCPA compliance, and denies no regime either', () => {
    /*
     * BOTH DIRECTIONS ARE WRONG AND THEY FAIL DIFFERENTLY. Claiming compliance with a regime
     * nobody has verified is a false statement in the document a reader is entitled to rely
     * on. Categorically denying one — "GDPR does not apply" — is a claim this repository
     * cannot support either: the app is publicly reachable and applicability turns on facts
     * well past where the shop ships.
     *
     * The published posture is narrower than both: where Plantdex is operated and who it is
     * directed to (observable), plus a commitment to honour rights where law gives them.
     */
    const privacy = prose('src/app/privacy/page.tsx');
    expect(privacy).not.toMatch(/(GDPR|CCPA)[^.]{0,40}(compliant|compliance)/i);
    expect(privacy).not.toMatch(/(GDPR|CCPA|General Data Protection)[^.]{0,30}does not apply/i);
    expect(privacy).toMatch(/not specifically marketed to residents of the\s+European Union/);
    // The sentence that keeps the two above it from reading as a contracting-out.
    expect(privacy).toMatch(/waive rights that cannot legally be waived/);
  });

  it('marks the pages as a draft while anything at all is outstanding', () => {
    /*
     * BOTH HALVES, and this guard knew only one of them until the day it mattered.
     *
     * It read `blockingOwnerInputs().length > 0 ? 'draft' : 'published'`, which was the whole
     * rule when it was written and stopped being so the moment `reviewRecommended` started
     * feeding LEGAL_STATUS. It kept passing anyway — with a blocking gap still open both
     * sides said 'draft' and agreed for the wrong reason — and only failed when the last
     * blocking answer landed and the reviews were left holding the draft on their own. Which
     * is precisely the state the review flag exists to produce.
     *
     * A test that agrees with the code for a reason that is about to expire is worse than no
     * test: it reports green right up to the moment it is needed. The banner is driven by
     * this, so the two cannot disagree.
     */
    const outstanding = blockingOwnerInputs().length > 0 || reviewOutstanding().length > 0;
    expect(LEGAL_STATUS).toBe(outstanding ? 'draft' : 'published');
  });

  it('is held in draft by the reviews alone, with every blocking gap answered', () => {
    /*
     * The state the guard above missed, pinned directly rather than left implied. If a future
     * edit made LEGAL_STATUS read only `blockingOwnerInputs()` again, this is the test that
     * says so in words instead of failing somewhere vague.
     */
    expect(blockingOwnerInputs()).toHaveLength(0);
    expect(reviewOutstanding().length).toBeGreaterThan(0);
    expect(LEGAL_STATUS).toBe('draft');
  });

  it('dates the review, and does not date it in the future', () => {
    expect(LEGAL_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(LEGAL_REVIEWED).getTime()).toBeLessThanOrEqual(Date.now());
  });
});

describe('legal pages', () => {
  it('only uses placeholders that are registered', () => {
    // An unregistered id would render a bare "awaiting owner input" with no explanation of
    // what is missing, and would not appear on the owner's list.
    for (const { path, id } of gapsUsed()) {
      expect(ownerInput(id), `${path} uses unregistered gap "${id}"`).toBeDefined();
    }
  });

  it('actually uses every blocking input it declares', () => {
    /*
     * The registry is not a wishlist. If something is blocking publication, the sentence it
     * blocks must exist on a page — otherwise the reader never learns the policy is
     * incomplete on that point, which is the whole purpose of the mechanism.
     */
    const used = new Set(gapsUsed().map((gap) => gap.id));
    for (const input of blockingOwnerInputs()) {
      expect(used.has(input.id), `blocking input "${input.id}" appears on no page`).toBe(true);
    }
  });

  it('invents no contact route, entity or jurisdiction', () => {
    /*
     * THE TEST THAT MATTERS. A policy that names a support address nobody monitors, or a
     * governing law nobody chose, is a false statement in the one document a reader is
     * entitled to rely on. These patterns are how such a sentence would look.
     */
    for (const path of PAGES) {
      const source = read(path);
      expect(source, `${path}: invented email address`).not.toMatch(
        /[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
      );
      expect(source, `${path}: invented postal address`).not.toMatch(
        /\b\d{1,5}\s+[A-Z][a-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Suite)\b/,
      );
      expect(source, `${path}: invented jurisdiction`).not.toMatch(
        /laws of the (State|Commonwealth|Province) of|courts of England|Delaware|jurisdiction of the courts/i,
      );
      expect(source, `${path}: invented company form`).not.toMatch(
        /\b(LLC|Inc\.|Ltd\.|GmbH|Pty|S\.A\.|C-corp)\b/,
      );
    }
  });

  it('sets no cookie, so the page may keep saying so', () => {
    const appSource = [
      'src/app/layout.tsx',
      'src/lib/supabase-client.ts',
      'src/state/AuthProvider.tsx',
      'src/components/analytics/PlausibleScript.tsx',
      'src/lib/analytics.ts',
    ]
      .map(read)
      .join('\n');
    // The absence of a consent banner rests on this. A cookie means a banner and a rewritten
    // privacy page, in the same change.
    expect(appSource, 'a cookie is now set — update the privacy page').not.toMatch(
      /document\.cookie/,
    );
  });

  it('keeps the analytics disclosure in step with the analytics that exist', () => {
    /*
     * THIS GUARD USED TO SAY "no analytics provider exists". It now says something stronger
     * and longer-lived: whatever measurement the app performs, the privacy page describes
     * *that* measurement and no other.
     *
     * The failure mode it exists for is not adding analytics — that is a deliberate act. It
     * is adding a second provider, or swapping the first, and leaving a page that still
     * describes the old one. A policy is only worth anything while it is current.
     */
    /*
     * Comments are stripped first. Without that, the requirement "the page names the
     * provider" is satisfiable by the file's own header comment — which it was, until this
     * test was checked against a page whose visible prose had been renamed. A reader sees
     * the JSX, not the docblock.
     */
    const privacy = read(PRIVACY).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

    // 1. The page names the provider the code actually loads.
    expect(privacy, `privacy page does not name ${ANALYTICS_PROVIDER}`).toContain(
      ANALYTICS_PROVIDER,
    );
    expect(read('src/components/analytics/PlausibleScript.tsx')).toContain('plausible.io');

    // 2. No SECOND provider has appeared anywhere in the app.
    const appSource = readdirRecursive('src')
      .filter((path) => /\.tsx?$/.test(path) && !path.endsWith('.test.ts'))
      .map(read)
      .join('\n');
    expect(appSource, 'a second analytics provider was added — update the privacy page').not.toMatch(
      /gtag|googletagmanager|posthog|mixpanel|segment\.com|amplitude|hotjar|fullstory|clarity\.ms/i,
    );

    // 3. The page no longer makes the two claims that adding analytics falsified. Both were
    //    literally on this page before, and both would now be untrue.
    expect(privacy, 'privacy page still claims there is no analytics provider').not.toMatch(
      /There is no analytics provider/i,
    );
    expect(privacy, 'privacy page still claims no page contacts a third party').not.toMatch(
      /Loading a page contacts no one but our own host/i,
    );

    /*
     * 4. The page's central analytics promise, checked in BOTH directions.
     *
     * The page says each counted action "carries no attached data whatsoever". That is only
     * true while `track()` takes one parameter, so this asserts the prose and the signature
     * together — a page saying it, and code that could not do otherwise. Adding a properties
     * argument back would fail here as well as in `analytics.test.ts`, which is the point:
     * the sentence a reader trusts and the code that honours it cannot drift apart.
     */
    const emittable = EVENT_NAMES.filter((name) => !UNEMITTED_EVENTS[name]);
    expect(emittable.length, 'events exist but none are described').toBeGreaterThan(0);
    expect(privacy, 'privacy page dropped the "nothing is attached" promise').toMatch(
      /carries no attached data/i,
    );
    const signature = read('src/lib/analytics.ts').match(/export function track\(([^)]*)\)/);
    expect(
      signature![1]!.split(',').length,
      'track() gained a parameter — the privacy page now overpromises',
    ).toBe(1);

    // 5. And the three refusals that make the measurement acceptable at all.
    for (const promise of [/no email address/i, /never sent to the analytics service/i, /No coordinates/i]) {
      expect(privacy, `privacy page dropped the promise ${promise}`).toMatch(promise);
    }
  });

  it('sends people to the page that actually holds the delete button', () => {
    /*
     * THE SAME FAILURE, FIFTH TIME OF ASKING — and the most consequential yet.
     *
     * /privacy tells people WHERE to delete their account. When identity and data moved from
     * /account to /profile, that sentence became a set of directions to a page that no longer
     * has the button. Wrong prose about a shop is embarrassing; wrong prose about the only
     * irreversible control in the app is somebody concluding they cannot delete their data.
     *
     * So the page must name the profile, and must not still name the account page, and there
     * must be exactly one component in the codebase that renders the control.
     */
    const privacy = read(PRIVACY).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    expect(privacy, 'privacy still sends people to the account page to delete').not.toMatch(
      /On the account page, under/i,
    );
    expect(privacy, 'privacy does not say where deletion lives').toMatch(
      /On your profile page, under/i,
    );
  });

  it('gives account deletion exactly one home', () => {
    /*
     * An irreversible action offered in two places is one somebody meets twice and trusts
     * less each time — and two copies drift, so one of them ends up being the stale warning.
     * `AccountDataSection` owns both the export and the delete, so counting its callers
     * counts the homes.
     */
    const callers = readdirRecursive('src')
      .filter((path) => /\.tsx$/.test(path) && !/\.test\.tsx?$/.test(path))
      .filter((path) =>
        readFileSync(path, 'utf8').includes("from '@/components/auth/AccountDataSection'"),
      );
    expect(callers, 'account deletion must be offered in exactly one place').toHaveLength(1);
    expect(callers[0]).toMatch(/ProfileView\.tsx$/);
  });

  it('keeps the privacy disclosure in step with the profile that exists', () => {
    /*
     * THE SAME FAILURE, FOURTH TIME OF ASKING.
     *
     * /privacy said "There is no username, display name, avatar, date of birth or profile of
     * any kind, because the application has no such fields." True when written, and false the
     * moment /profile shipped — in a commit with no reason to open a legal page. So the
     * existence of the route is checked against the prose that denies it, and against the
     * disclosure that must now be there.
     */
    const profileExists = existsSync('src/app/profile/page.tsx');
    expect(profileExists, 'this test assumes /profile — update it if the profile was removed').toBe(
      true,
    );

    const privacy = read(PRIVACY).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    for (const denial of [
      /no username, display name, avatar/i,
      /no display name/i,
      /profile of\s+any kind/i,
      /has no such fields\.\s*<\/p>/i,
    ]) {
      expect(privacy, `Privacy still denies the profile that exists: ${denial}`).not.toMatch(denial);
    }

    // And it says what the profile actually stores, including the thing that makes it safe:
    // choices only, no derived progression, and owner-only.
    expect(privacy, 'privacy page does not disclose profile settings').toMatch(
      /Profile settings/i,
    );
    expect(privacy, 'privacy page does not say the profile is private').toMatch(
      /visible only to you/i,
    );
  });

  it('keeps the commerce disclosure in step with the commerce that exists', () => {
    /*
     * THE SAME FAILURE, THIRD TIME OF ASKING.
     *
     * /privacy once said "there is no analytics provider" after Plausible shipped. /terms then
     * said "there is no shop, no checkout and no payment processing anywhere in the
     * application" after /shop shipped. Both were true when written and both became false in a
     * commit that had no reason to touch them — which is exactly the failure mode a legal page
     * has, because nobody re-reads one while building a feature.
     *
     * So the existence of the route is checked against the prose that denies it.
     */
    const shopExists = existsSync('src/app/shop/page.tsx');
    expect(shopExists, 'this test assumes /shop — update it if the shop was removed').toBe(true);

    const terms = read(TERMS).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    for (const denial of [
      /Nothing is sold through this site/i,
      /no shop, no checkout/i,
      /there is no shop/i,
      /nothing for sale/i,
    ]) {
      expect(terms, `Terms still denies the shop that exists: ${denial}`).not.toMatch(denial);
    }

    // And it points at the document that actually governs a sale, rather than promising to
    // grow one later — the sale terms live on their own page.
    expect(terms, 'Terms does not link to the terms of sale').toContain('/terms-of-sale');

    /*
     * The shop must never claim a price the code cannot produce. Both env vars gate it, so a
     * hard-coded figure in the JSX would be a price nobody set — the commerce equivalent of an
     * invented delivery estimate.
     */
    const shop = read('src/app/shop/page.tsx').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    expect(shop, '/shop hard-codes a price instead of reading displayPrice()').not.toMatch(
      /[$£€]\s?\d+[.,]\d{2}/,
    );
  });

  it('points at the safety page rather than replacing it', () => {
    // Terms and Privacy sit beside the herbal safety information; neither absorbs it.
    for (const path of PAGES) {
      expect(read(path) + read('src/components/legal/LegalPage.tsx')).toContain('/safety');
    }
  });

  it('is reachable from every page', () => {
    const footer = read('src/components/SiteFooter.tsx');
    for (const href of ['/safety', '/privacy', '/terms']) {
      expect(footer, `footer does not link ${href}`).toContain(`href="${href}"`);
    }
    expect(read('src/app/layout.tsx'), 'footer is not in the layout').toContain('<SiteFooter />');
  });
});
