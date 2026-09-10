import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { EVENT_NAMES } from './analytics';
import { ENTRY_PATHS } from './entry-point';

/**
 * THE LAUNCH LOOP, CHECKED AS A LOOP.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Every piece of this journey already had its own tests, and the journey was still broken —
 * because what was wrong was never inside a piece. `/seed-shelf` worked perfectly and was
 * reachable from two places, neither of which a returning player would think to open. The
 * scanner worked and appeared in no navigation. The confirmation panel rendered correctly,
 * off the bottom of a phone. Each part passing is exactly what a broken seam looks like.
 *
 * So these tests assert the EDGES rather than the nodes: that the destinations exist, that
 * something links to them, and that each end of the loop hands the player somewhere to go.
 * They read source rather than rendering, which is a real limitation — a link can exist in a
 * file and be unreachable behind a condition — so they are a floor, not a proof, and the
 * browser pass at 390px is what checks the rest.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const read = (path: string) => readFileSync(path, 'utf8');

const NAV = read('src/components/SiteNav.tsx');
const START = read('src/app/start/page.tsx');
const SCAN_PANEL = read('src/components/scan/ScanPanel.tsx');
const SCAN_OUTCOME = read('src/components/scan/ScanOutcome.tsx');
const SAVE_TO_SHELF = read('src/components/seedshelf/SaveToSeedShelf.tsx');
const HERBDEX = read('src/app/herbdex/page.tsx');

describe('every destination in the loop exists as a route', () => {
  it('serves each page the loop sends people to', () => {
    // A static export turns each of these into a directory, so a typo'd href is a 404 that
    // no unit test would otherwise notice until somebody followed it on a phone.
    for (const route of [
      'start',
      'scan',
      'herbdex',
      'seed-shelf',
      'garden',
      'profile',
      'account',
    ]) {
      expect(existsSync(`src/app/${route}/page.tsx`), `/${route} has no page`).toBe(true);
    }
  });

  it('sends the entry point only at routes that exist', () => {
    for (const path of ENTRY_PATHS) {
      const route = path.href.replace(/^\//, '');
      expect(existsSync(`src/app/${route}/page.tsx`), path.href).toBe(true);
    }
  });
});

describe('the scanner is reachable from anywhere', () => {
  it('is in the primary navigation', () => {
    /*
     * THE DEAD END THIS CLOSES. Scan was reachable from the landing page, the Herbdex and the
     * Seed Shelf, and nowhere else — so a player anywhere else in the app who walked past a
     * plant had to navigate back to a hub first. It is the one destination in this app that is
     * about where somebody is standing.
     */
    expect(NAV).toContain("href: '/scan'");
  });

  it('keeps the bar to seven, because an eighth truncates labels at 390px', () => {
    const links = NAV.match(/href: '\/[a-z-]*'/g) ?? [];
    expect(links.length).toBeGreaterThanOrEqual(7);
    expect(links.length).toBeLessThanOrEqual(7);
  });
});

describe('the Seed Shelf is reachable without having just saved to it', () => {
  it('is linked from the collection page', () => {
    /*
     * Before this, `/seed-shelf` was linked from the Garden and from the moment a packet was
     * saved. A player who shelved something, closed the tab and came back had no route to it:
     * not the nav, not the collection page, not their profile. The find was kept and became
     * unfindable, which is worse than not keeping it — it is a promise the product quietly
     * failed to honour.
     */
    expect(HERBDEX).toContain('href="/seed-shelf"');
  });
});

describe('both branches of a scan end somewhere', () => {
  it('hands a found card its own Herbdex entry', () => {
    expect(SCAN_PANEL).toContain('kind="card"');
    expect(SCAN_PANEL).toContain('/herbdex/${herb.id}');
  });

  it('hands a shelved species the Seed Shelf', () => {
    expect(SAVE_TO_SHELF).toContain('kind="packet"');
    expect(SAVE_TO_SHELF).toContain('href="/seed-shelf"');
  });

  it('renders the outcome INSIDE the region the page scrolls to', () => {
    /*
     * THE BUG THIS PINS, precisely. The confirmation panel used to sit outside the answer
     * region, below everything, while the scroll effect watched only `result` and `problem`.
     * Confirming a find — the one action a first-time user takes — rendered its confirmation
     * under a list of candidates, off the bottom of a phone, behind the fixed nav, with
     * nothing bringing it into view. Every path rendered; the one that mattered was invisible.
     *
     * Two things have to hold: the outcome has a ref for the scroll to target, and `confirmed`
     * is a dependency of the effect that scrolls. Either alone leaves the panel unreachable.
     */
    expect(SCAN_PANEL).toContain('ref={outcomeRef}');
    expect(SCAN_PANEL).toMatch(/\}, \[result, problem, confirmed\]\)/);
  });

  it('offers exactly one onward link, so an answer does not become a decision', () => {
    const links = SCAN_OUTCOME.match(/<Link\b/g) ?? [];
    expect(links).toHaveLength(1);
  });
});

describe('the outcome tells the truth about what was recorded', () => {
  it('never claims a plant is safe', () => {
    // It is the loudest panel on screen at the moment somebody has just been told what a
    // plant is, which is exactly where a safety claim would be read into silence.
    for (const claim of [/\bsafe to\b/i, /\bedible\b/i, /\byou can eat\b/i, /\bharmless\b/i]) {
      expect(claim.test(SCAN_OUTCOME), `${claim} appears in the scan outcome`).toBe(false);
    }
  });

  it('says a packet earns nothing, on the packet branch', () => {
    // The Seed Shelf structurally cannot pay XP; the panel has to agree with the code, since
    // a "New seed packet" banner that looked like a reward would imply otherwise.
    expect(SCAN_OUTCOME).toContain('earns no XP');
  });

  it('shows a reward only when one was actually awarded', () => {
    // `discover()` is idempotent, so a plant found twice pays zero. Rendering the chip
    // unconditionally would claim a second reward for a repeat.
    expect(SCAN_OUTCOME).toContain('props.xpAwarded > 0');
  });

  it('prints the full binomial on both branches', () => {
    // A common name is the loose half of an identification, and this panel is the record of
    // what was found. Same argument the Seed Shelf makes about its own captions.
    expect(SCAN_OUTCOME).toContain('{props.scientificName}');
  });
});

describe('the funnel is instrumented end to end', () => {
  /*
   * A funnel with a missing step does not read as missing — it reads as a drop-off, which is
   * indistinguishable from people losing interest. So each stage of the loop is named here,
   * and a stage that stops being measured fails rather than quietly becoming a cliff on a
   * chart somebody will later try to explain.
   */
  const STAGES: readonly (typeof EVENT_NAMES)[number][] = [
    'start_opened',
    'start_path_scan',
    'scan_started',
    'scan_matched',
    'scan_no_match',
    'scan_confirmed',
    'seed_shelf_save_started',
    'seed_shelf_saved',
    'herbdex_opened_from_scan',
    'seed_shelf_opened_from_scan',
    'signup_started',
    'signup_completed',
  ];

  it('declares every stage of the journey', () => {
    for (const stage of STAGES) {
      expect(EVENT_NAMES, stage).toContain(stage);
    }
  });

  it('measures the entry page and each of its three exits', () => {
    expect(START).toContain('start_opened');
    const exits = EVENT_NAMES.filter((name) => name.startsWith('start_path_'));
    expect(exits).toHaveLength(ENTRY_PATHS.length);
  });

  it('pairs the shelf save attempt with its success, so failures are visible', () => {
    /*
     * Only the success used to be counted. The save is a network write to Supabase, so an
     * outage in the one write this loop depends on would have shown up as "nobody saved
     * anything" and been indistinguishable from nobody wanting to.
     */
    expect(SAVE_TO_SHELF).toContain("track('seed_shelf_save_started')");
    expect(SAVE_TO_SHELF).toContain("track('seed_shelf_saved')");
  });

  it('measures where the player went after each branch, separately', () => {
    // Distinct from `herbdex_opened` and the shelf's own page view: the question is not "was
    // this page visited" but "was it visited FROM the moment we explained the outcome".
    expect(SCAN_OUTCOME).toContain('herbdex_opened_from_scan');
    expect(SCAN_OUTCOME).toContain('seed_shelf_opened_from_scan');
  });
});
