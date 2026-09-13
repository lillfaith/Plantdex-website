import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * THE REWARD MOMENT ON THE SCAN SCREEN.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * The card page has celebrated a discovery since the beginning. The scanner — the route a
 * stranger from a vendor table actually takes — recorded the identical `DiscoveryResult` and
 * rendered it as two static chips beneath a paragraph. Same event, same data, no moment.
 *
 * These tests guard the two ways wiring the celebration into that path could go wrong, both
 * of which would look entirely reasonable in a diff.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

const SCAN_PANEL = strip(readFileSync('src/components/scan/ScanPanel.tsx', 'utf8'));
const CELEBRATION = strip(readFileSync('src/components/herbdex/DiscoveryCelebration.tsx', 'utf8'));

describe('a scan celebrates only what it actually awarded', () => {
  it('opens the dialog behind `awarded`, never on a bare confirmation', () => {
    /*
     * `discover()` is idempotent: a plant already in the collection comes back with
     * `awarded: false`, `xpAwarded: 0` and no achievement ids. Opening the celebration on
     * every confirmation would put a card flip and a "+0 XP" counter in front of somebody who
     * earned nothing — inventing a reward, which is the one thing this moment may never do.
     *
     * The dialog is opened by exactly one call, and it is inside the `awarded` branch.
     */
    expect(SCAN_PANEL).toContain('if (outcome.awarded) {');

    const guard = SCAN_PANEL.indexOf('if (outcome.awarded) {');
    const opens = [...SCAN_PANEL.matchAll(/celebrateRef\.current\?\.showModal\(\)/g)];
    expect(opens, 'the celebration must be opened in exactly one place').toHaveLength(1);
    const [opened] = opens;
    expect(
      opened?.index,
      'showModal() escaped the `awarded` guard — a repeat find would celebrate nothing as something',
    ).toBeGreaterThan(guard);
  });

  it('reads the reward off the reducer rather than recomputing it', () => {
    // The XP and the achievement ids come from `discover()`'s own return value, which is the
    // ledger's answer. A second derivation here would be free to disagree with the record
    // `ScanOutcome` prints directly underneath it.
    expect(SCAN_PANEL).toContain('const outcome = discover(herb);');
    expect(SCAN_PANEL).toContain('setCelebrating({ herbId: herb.id, result: outcome });');
    expect(SCAN_PANEL, 'the scan screen must not compute its own XP figure').not.toMatch(
      /xpFor|xpAwarded\s*[:=]\s*\d/,
    );
  });

  it('keeps the outcome record alive after the moment ends', () => {
    /*
     * Two lifetimes, two pieces of state. `confirmed` is the RECORD and stays for as long as
     * the player is on the page — `ScanOutcome` reads it. `celebrating` is the MOMENT and ends
     * when the dialog closes. Clearing one on close must not take the other with it, or
     * dismissing the celebration would erase the panel explaining where the find went.
     *
     * ASSERTED ON THE CLOSE HANDLER, NOT ON THE FILE. The first version of this test banned
     * `setConfirmed(null)` outright and failed honestly: picking a NEW photo clears the
     * previous outcome, which is correct and must keep working. The invariant is narrower than
     * "never reset" — it is that the dialog's own close handler resets the moment and nothing
     * else.
     */
    const handler = SCAN_PANEL.match(/const handleClose = \(\) => ([^;]+);/);
    expect(handler, 'the dialog needs a close handler to clear the moment').not.toBeNull();
    expect(handler![1]).toContain('setCelebrating(null)');
    expect(handler![1], 'closing the celebration must not clear the outcome panel').not.toContain(
      'setConfirmed',
    );
  });
});

describe('the celebration is one implementation, not two', () => {
  it('offers the mastery scroll only where a mastery track exists', () => {
    /*
     * THE BUG THIS PROP EXISTS TO PREVENT. The default primary control scrolls to
     * `#card-mastery`, an element that is on a plant page and nowhere else. Mounted unchanged
     * on /scan it would have been the loudest button on the dialog, pointing at nothing.
     *
     * So the scroll lives in the `next`-absent branch, and a caller on another screen supplies
     * its own onward step. The reward body above it stays shared — which is the entire reason
     * this is a prop rather than a second celebration component free to drift.
     */
    expect(CELEBRATION).toContain("getElementById('card-mastery')");

    const scroll = CELEBRATION.indexOf("getElementById('card-mastery')");
    const fallback = CELEBRATION.indexOf('{next ? (');
    expect(fallback, 'the footer must branch on `next`').toBeGreaterThan(-1);
    expect(
      scroll,
      'the mastery scroll must sit in the branch taken when no onward step was supplied',
    ).toBeGreaterThan(fallback);

    // And the scan screen must actually supply one, or it takes the card page's branch.
    expect(SCAN_PANEL).toContain("label: 'Open its card'");
  });

  it('reuses the existing analytics goal rather than minting one', () => {
    // `herbdex_opened_from_scan` already measures "the scan flow led to the card", and the
    // dialog's link is a second control doing exactly that. A new event name would need a new
    // Plausible goal to record anything at all.
    expect(SCAN_PANEL).toContain("track('herbdex_opened_from_scan')");
  });
});
