import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  LEGAL_REVIEWED,
  LEGAL_STATUS,
  OWNER_INPUTS,
  blockingOwnerInputs,
  ownerInput,
} from './legal';

const PRIVACY = 'src/app/privacy/page.tsx';
const TERMS = 'src/app/terms/page.tsx';
const PAGES = [PRIVACY, TERMS];
const read = (path: string) => readFileSync(path, 'utf8');

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

  it('marks the pages as a draft while anything blocking is outstanding', () => {
    // The banner is driven by this, so the two cannot disagree.
    expect(LEGAL_STATUS).toBe(blockingOwnerInputs().length > 0 ? 'draft' : 'published');
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

  it('claims no analytics, cookies or tracking while none exist', () => {
    /*
     * The privacy page states as fact that there are no cookies, no analytics and no
     * third-party requests. That is true of this build — and it is exactly the kind of claim
     * that silently becomes false the day a provider is added. This fails first if it does.
     */
    const appSource = [
      'src/app/layout.tsx',
      'src/lib/supabase-client.ts',
      'src/state/AuthProvider.tsx',
    ]
      .map(read)
      .join('\n');
    expect(appSource, 'a cookie is now set — update the privacy page').not.toMatch(
      /document\.cookie/,
    );
    expect(appSource, 'an analytics provider was added — update the privacy page').not.toMatch(
      /gtag|googletagmanager|plausible\.io|posthog|mixpanel|segment\.com|amplitude/i,
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
