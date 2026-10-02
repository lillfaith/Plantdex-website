import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATALOGUE } from './catalogue';
import {
  REGIONAL_STATUS,
  badgeExplanation,
  badgeFor,
  statusesFor,
  type RangeStatus,
} from './invasive-status';

const SOURCE = readFileSync('src/lib/invasive-status.ts', 'utf8');

/**
 * The module with its comments removed.
 *
 * THE SHAPE GUARDS BELOW MUST READ CODE, NOT PROSE, and the first run proved why: the file's
 * own header says "there is no `invasive: boolean` here, and there must never be one", and the
 * guard matched that sentence and failed. A check that cannot tell a prohibition from its own
 * description would force the documentation to stop naming the thing it forbids, which is
 * exactly the comment worth keeping.
 */
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
const ids = new Set(CATALOGUE.map((card) => card.id));

describe('the model refuses to be a universal boolean', () => {
  it('has no bare invasive flag anywhere in the module', () => {
    // The whole reason this file exists. `Solidago canadensis` is native here and a serious
    // invader in Europe; `Lonicera japonica` is the reverse. A boolean has to write one of
    // those down as the other.
    expect(CODE).not.toMatch(/\binvasive\s*[:?]\s*boolean/);
    expect(CODE).not.toMatch(/\binvasive\s*[:=]\s*(true|false)\b/);
    expect(CODE).not.toMatch(/\bisInvasive\b/);
  });

  it('gives every claim a region, and no claim a default region', () => {
    for (const [herbId, claims] of Object.entries(REGIONAL_STATUS)) {
      for (const claim of claims) {
        expect(claim.region, `${herbId} has a claim with no region`).toBeTruthy();
        expect(claim.regionId, `${herbId} has a claim with no regionId`).toBeTruthy();
      }
    }
  });

  it('keeps native, introduced and invasive as three separate statuses', () => {
    const allowed: RangeStatus[] = ['native', 'introduced', 'invasive', 'watchlist'];
    for (const claims of Object.values(REGIONAL_STATUS)) {
      for (const claim of claims) expect(allowed).toContain(claim.status);
    }
    // And the type admits all three, so nothing can quietly collapse to a two-state field.
    expect(CODE).toContain("'native' | 'introduced' | 'invasive' | 'watchlist'");
  });
});

describe('every claim is evidenced', () => {
  it('names a source with a URL and a date it was checked', () => {
    for (const [herbId, claims] of Object.entries(REGIONAL_STATUS)) {
      for (const claim of claims) {
        expect(claim.source.name, `${herbId}: source has no name`).toBeTruthy();
        expect(claim.source.url, `${herbId}: source has no url`).toMatch(/^https:\/\//);
        expect(claim.source.checkedOn, `${herbId}: source has no date`).toMatch(
          /^\d{4}-\d{2}-\d{2}$/,
        );
      }
    }
  });

  it('is evidenced from the primary list, not from summaries of it', () => {
    // The audit's purpose. A search summary got two of these wrong — `Alliaria petiolata`'s
    // category, and a Category 1 for `Lonicera japonica` that no document carried.
    for (const [herbId, claims] of Object.entries(REGIONAL_STATUS)) {
      for (const claim of claims) {
        expect(claim.verification, `${herbId} is not primary-source`).toBe('primary-source');
      }
    }
  });

  it('records the authority\u2019s own wording, never a translated category number', () => {
    // GISC is mid-transition between RIPSA (Priority 1/2/Watchlist) and the older GA-EPPC
    // categories, and its plant list prints neither against each species. Writing either here
    // would assert a classification the current page does not publish.
    for (const claims of Object.values(REGIONAL_STATUS)) {
      for (const claim of claims) {
        if (claim.category) {
          expect(claim.category).not.toMatch(/Category\s*[1-4]\b/i);
          expect(claim.category).not.toMatch(/Priority\s*[12]\b/i);
        }
      }
    }
  });

  it('declares how well each claim is evidenced, per claim', () => {
    // Recorded per claim rather than for the file, so upgrading one entry to a read primary
    // document does not quietly upgrade the others.
    for (const claims of Object.values(REGIONAL_STATUS)) {
      for (const claim of claims) {
        expect(['primary-source', 'search-attested']).toContain(claim.verification);
      }
    }
  });

  it('names the taxon the claim is about, which is not always the card', () => {
    for (const [herbId, claims] of Object.entries(REGIONAL_STATUS)) {
      for (const claim of claims) {
        expect(claim.taxon, `${herbId}: claim names no taxon`).toMatch(/^[A-Z][a-z]+ [a-z-]+$/);
      }
    }
  });

  it('only records claims against cards that exist', () => {
    for (const herbId of Object.keys(REGIONAL_STATUS)) expect(ids.has(herbId)).toBe(true);
  });
});

describe('a plant without a verified invasive status gets no badge', () => {
  it('returns null for every card with no entry at all', () => {
    const unlisted = CATALOGUE.filter((card) => !(card.id in REGIONAL_STATUS));
    expect(unlisted.length).toBeGreaterThan(40); // most of the deck, as it should be
    for (const card of unlisted) {
      expect(badgeFor(card.id), `${card.id} should have no badge`).toBeNull();
      expect(statusesFor(card.id)).toEqual([]);
    }
  });

  it('returns null for an id that is not a card at all', () => {
    expect(badgeFor('not-a-card')).toBeNull();
    expect(badgeFor('')).toBeNull();
  });

  it('never badges a species the authority says is not yet here', () => {
    // `Alliaria petiolata` is under GISC's "Species of Concern": not yet found in Georgia.
    // `appliesToCard` is TRUE for it, so only the status withholds the badge — which is the
    // independence of the two conditions doing its job.
    const [claim] = statusesFor('alliaria-petiolata');
    expect(claim).toBeDefined();
    expect(claim!.status).toBe('watchlist');
    expect(claim!.appliesToCard).toBe(true);
    expect(badgeFor('alliaria-petiolata')).toBeNull();
  });

  it('withholds a badge when the authority\u2019s tier cannot be read', () => {
    // `Allium vineale` is on the list and the card taxon matches, but the page prints no
    // definition for its tier. Ambiguous evidence, so no badge.
    const [claim] = statusesFor('allium-vineale');
    expect(claim).toBeDefined();
    expect(claim!.appliesToCard).toBe(true);
    expect(claim!.status).not.toBe('invasive');
    expect(badgeFor('allium-vineale')).toBeNull();
  });

  it('NEVER badges a plant merely for being introduced', () => {
    // The failure this test exists for. Most of this deck arrived with Europeans — dandelion,
    // plantain, chickweed, clover — and badging them invasive would put a marker on nine
    // tenths of the cards while saying nothing true.
    const introduced = Object.entries(REGIONAL_STATUS).filter(([, claims]) =>
      claims.some((claim) => claim.status === 'introduced'),
    );
    expect(introduced.length).toBeGreaterThan(0); // there are such entries to get wrong
    for (const [herbId, claims] of introduced) {
      const hasInvasiveClaim = claims.some((claim) => claim.status === 'invasive');
      if (!hasInvasiveClaim) {
        expect(badgeFor(herbId), `${herbId} is introduced, not invasive`).toBeNull();
      }
    }
  });

  it('does not badge any genus card for an invasive member', () => {
    // Four of them, and the mechanical audit found two the search-attested draft had missed
    // entirely: Rubus and Quercus. Every one records a real listing and must render nothing.
    for (const herbId of ['rosa-spp', 'morus-spp', 'rubus-spp', 'quercus-spp']) {
      const claims = statusesFor(herbId);
      expect(claims.length, `${herbId} has no recorded claim`).toBeGreaterThan(0);
      expect(claims.some((claim) => claim.status === 'invasive'), herbId).toBe(true);
      expect(badgeFor(herbId), `${herbId} must not badge`).toBeNull();
      for (const claim of claims.filter((one) => !one.appliesToCard)) {
        expect(claim.whyNotTheCard, `${herbId}: a withheld badge must say why`).toBeTruthy();
      }
    }
  });

  it('requires all four conditions, so no partial claim can render', () => {
    for (const card of CATALOGUE) {
      const badge = badgeFor(card.id);
      if (!badge) continue;
      expect(badge.status).toBe('invasive');
      expect(badge.appliesToCard).toBe(true);
      expect(badge.region).toBeTruthy();
      expect(badge.source.url).toMatch(/^https:\/\//);
    }
  });
});

describe('the badge that does render', () => {
  it('is exactly one card in the catalogue today', () => {
    // Pinned as a NUMBER so broadening the deck's markers is a deliberate edit to this test
    // rather than something that happens quietly alongside a data change.
    const badged = CATALOGUE.filter((card) => badgeFor(card.id));
    expect(badged.map((card) => card.id)).toEqual(['lonicera-japonica']);
  });

  it('is scoped to Georgia and says so', () => {
    const claim = badgeFor('lonicera-japonica');
    expect(claim).not.toBeNull();
    expect(claim!.regionId).toBe('us-ga');
    expect(claim!.region).toBe('Georgia');
    expect(badgeFor('lonicera-japonica', 'us-ga')).not.toBeNull();
    // Asking about another region returns nothing rather than the Georgia claim.
    expect(badgeFor('lonicera-japonica', 'us-or')).toBeNull();
  });

  it('reports a listing rather than making its own determination', () => {
    const claim = badgeFor('lonicera-japonica')!;
    const text = badgeExplanation(claim);
    expect(text).toContain('is considered invasive in Georgia');
    expect(text).not.toMatch(/\bis invasive\b/);
  });

  it('tells the reader what to do, and does not state the law', () => {
    const text = badgeExplanation(badgeFor('lonicera-japonica')!);
    expect(text).toContain('Harvest responsibly where legal');
    expect(text).toContain('avoid spreading seeds, roots, fruit, or other reproductive material');
    // Legality varies by land and is not ours to assert.
    expect(text).not.toMatch(/\bis illegal\b|\bmust not\b|\brequired by law\b/);
  });

  it('names the region in the explanation, not only in the chip', () => {
    for (const card of CATALOGUE) {
      const claim = badgeFor(card.id);
      if (claim) expect(badgeExplanation(claim)).toContain(claim.region);
    }
  });
});

describe('it stays out of the identification architecture', () => {
  it('imports nothing from the matcher, the scopes or the reducer', () => {
    for (const forbidden of [
      'plant-match',
      'card-coverage',
      'herbdex-reducer',
      'progression',
      'mastery',
      'seed-shelf',
    ]) {
      expect(CODE, `invasive-status must not import ${forbidden}`).not.toContain(
        `from './${forbidden}'`,
      );
    }
  });

  it('is not reachable from the edge function bundle', () => {
    // The reducer is copied into `supabase/functions/_shared`. A regional badge is presentation
    // and has no business on the server, so it must never join `PURE_MODULES`.
    const sync = readFileSync('scripts/sync-edge-shared.mjs', 'utf8');
    expect(sync).not.toContain('invasive-status');
  });
});

describe('how the badge renders', () => {
  const BADGE = readFileSync('src/components/herbdex/InvasiveBadge.tsx', 'utf8');
  const DETAIL = readFileSync('src/components/herbdex/HerbDetail.tsx', 'utf8');
  /*
   * MARKUP ONLY. Same trap as `CODE` above, hit twice more: the component's header explains
   * that `stat-temp` is reserved for hazards, and the guard matched the explanation. A check
   * that forces a file to stop naming what it avoids is a check that deletes the reason.
   */
  const BADGE_MARKUP = BADGE.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');

  it('is gated on badgeFor, so the data decides and not the component', () => {
    expect(DETAIL).toContain('badgeFor(herb.id)');
    // Rendered only when there is a claim. Without the guard every card would mount an empty
    // aside, and 53 of 54 pages would carry a blank bordered box.
    expect(DETAIL).toMatch(/\{invasive && \(/);
  });

  it('appears exactly once, and only in the full card view', () => {
    const uses = DETAIL.match(/<InvasiveBadge /g) ?? [];
    expect(uses).toHaveLength(1);
    // A locked page deliberately shows nothing that would spoil the card. The badge is card
    // content about a plant the reader has not found, not a safety warning about one they are
    // holding — `SiteCaution` is the thing that legitimately crosses that line.
    const locked = DETAIL.indexOf('<LockedHerb');
    const badge = DETAIL.indexOf('<InvasiveBadge');
    expect(locked).toBeGreaterThan(-1);
    expect(badge).toBeGreaterThan(locked);
  });

  it('carries the region in the chip, not only in the sentence', () => {
    // An unqualified `INVASIVE` chip is the universal claim the data model exists to prevent,
    // and the chip is the half that gets skimmed.
    expect(BADGE).toMatch(/Invasive &mdash; \{claim\.region\}/);
  });

  it('does not borrow the hazard colour reserved for risks in the plant', () => {
    // Red is spent on four blocks, every one a hazard to the reader. Being invasive is not one:
    // it changes how somebody harvests, not whether the plant will hurt them.
    expect(BADGE_MARKUP).not.toContain('stat-temp');
    expect(BADGE_MARKUP).toContain('border-violet-600/70');
  });

  it('names and links the listing authority', () => {
    expect(BADGE).toContain('claim.source.url');
    expect(BADGE).toContain('claim.source.name');
    expect(BADGE).toContain('rel="noopener noreferrer"');
  });

  it('prints the listed taxon, which on a genus card is not the card', () => {
    expect(BADGE).toContain('claim.taxon');
  });

  it('stays compact: no hero, no full-width panel, no heading above xs', () => {
    /*
     * "Compact and not dominating the page" as a property of the markup rather than a hope.
     * `text-sm` IS ALLOWED, and the first draft of this test wrongly banned it: the icon is
     * sized with it, and an icon is not type. What must not appear is body or display type at
     * `text-base` and above, which is where a block starts competing with the card's own
     * sections for the reader.
     */
    expect(BADGE_MARKUP).not.toMatch(/text-(base|lg|xl|2xl|3xl|4xl)\b/);
    expect(BADGE_MARKUP).not.toContain('font-display');
    expect(BADGE_MARKUP).not.toContain('panel');
    // Every piece of text in it is `text-xs`; only the icon takes `text-sm`.
    expect(BADGE_MARKUP).toContain('text-xs');
  });

  it('is not rendered anywhere outside the plant profile', () => {
    // Tests excluded: this file names the component in its own assertions, which is not a
    // render. Only shipped source counts.
    const everywhere = sourceFilesUnder('src')
      .filter((path) => !/\.test\.tsx?$/.test(path))
      .filter((path) => readFileSync(path, 'utf8').includes('<InvasiveBadge'));
    expect(everywhere).toEqual(['src/components/herbdex/HerbDetail.tsx']);
  });
});

function sourceFilesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFilesUnder(path);
    return /\.(ts|tsx)$/.test(path) ? [path] : [];
  });
}
