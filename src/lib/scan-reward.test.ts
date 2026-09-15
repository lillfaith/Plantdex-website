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
const DISCOVER_PANEL = strip(readFileSync('src/components/herbdex/DiscoverPanel.tsx', 'utf8'));

/**
 * EVERY ENTRY POINT THAT WRITES A DISCOVERY SAYS WHAT A DISCOVERY IS.
 *
 * Progression in Plantdex is self-declared at every stage, deliberately: `DiscoverPanel`
 * records a find from two taps and no camera, and `SIGHTINGS_FOR_MASTERY` is 1 with
 * `photoId` optional. Nothing here verifies that anybody went outside, and nothing is meant
 * to — there is no leaderboard, no public profile and no economy for a false record to
 * cheat. See CLAUDE.md, "Progression is self-declared".
 *
 * What that makes load-bearing is the WORDS. The only thing standing between a player and a
 * collection that does not mean what it says is each confirmation stating what it records,
 * so a surface that writes a discovery without saying so is the actual regression here.
 *
 * The card page has carried its sentence from the beginning; the scanner shipped without
 * one for long enough that a deck owner photographing their own card to look it up was
 * handed a find they never made. These fail if either one loses it.
 */
describe('a confirmation says what it is recording', () => {
  /*
   * Whitespace-collapsed, because these sentences live in JSX text and Prettier is free to
   * break one across a line at any width. A guard that a reflow can silently switch off is
   * worse than no guard: it would still be green on the day the sentence was deleted.
   */
  const flat = (source: string) => source.replace(/\s+/g, ' ');
  const FIND_WORDS = /found it outdoors|met the plant outdoors/;

  it('qualifies the confirmation on the card page', () => {
    expect(flat(DISCOVER_PANEL)).toMatch(FIND_WORDS);
  });

  it('qualifies the confirmation on the scanner too', () => {
    expect(flat(SCAN_PANEL)).toMatch(FIND_WORDS);
  });

  it('names the card photograph, which is the case a stranger falls into', () => {
    /*
     * Not anti-cheat phrasing. The identifier answers a photograph of a card CORRECTLY —
     * it is a picture of the right species — so every other guard in this file passes and
     * the record is still false. Naming it is the only thing that tells somebody holding
     * the deck that looking a card up is not the same as finding the plant.
     */
    expect(flat(SCAN_PANEL)).toMatch(/Photographing one of your cards is not a find/);
  });

  it('keeps it a sentence rather than a second decision', () => {
    /*
     * `/start` sends a first-time visitor here for ONE action (`entry-point.ts`), and a
     * checkbox in front of the confirm button would make it two — while stopping nobody,
     * since the two-tap path on the card page has no camera in it at all. A guard, because
     * "make them tick a box" is the obvious next diff and it costs the launch loop more
     * than it buys.
     */
    const flatPanel = flat(SCAN_PANEL);
    const confirmArea = flatPanel.slice(flatPanel.indexOf('Photographing one of your cards'));
    expect(confirmArea).not.toMatch(/type="checkbox"/);
  });
});

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

describe('the celebration is the only place the reward is announced', () => {
  const OUTCOME = strip(readFileSync('src/components/scan/ScanOutcome.tsx', 'utf8'));

  /**
   * Just the compact branch, so a rule about what IT renders is not accidentally satisfied
   * (or broken) by the full panel below, which legitimately still prints XP and achievements.
   *
   * Bounded by the component's own top-level `return (` — the one at two-space indent, which
   * opens the full panel. An earlier version of this stopped at the first `return (` after the
   * guard, which is the receipt's OWN return, so the slice held the condition and none of the
   * JSX and every assertion passed vacuously.
   */
  const receiptBranch = (source: string) =>
    source.slice(
      source.indexOf("props.kind === 'card' && props.celebrated"),
      source.indexOf('\n  return ('),
    );

  it('collapses the outcome panel to a receipt once the dialog has spoken', () => {
    /*
     * The panel predates the celebration and used to be the ONLY thing that ever said a find
     * had paid anything, so it printed all of it. With the dialog in front of it, the XP, the
     * achievements and the "You found a Plantdex species" heading are a second telling of
     * something the player just watched — and the flatter one, since the dialog counts the XP
     * up and gives each achievement its own row.
     */
    expect(OUTCOME).toContain('props.kind === \'card\' && props.celebrated');
    expect(OUTCOME).toContain('added to your collection');

    // The receipt branch must return BEFORE the full panel, or it renders both.
    const receipt = OUTCOME.indexOf('props.kind === \'card\' && props.celebrated');
    const fullPanel = OUTCOME.indexOf('You found a Plantdex species');
    expect(receipt, 'the compact branch must short-circuit the full panel').toBeLessThan(fullPanel);
  });

  it('prints no XP and no achievement in the receipt', () => {
    // Slice the compact branch out and read it on its own: the rule is about what THAT
    // returns, and the full panel below it legitimately still prints both.
    const receipt = receiptBranch(OUTCOME);
    expect(receipt, 'the receipt repeats the XP the dialog already counted up').not.toMatch(/xpAwarded/);
    expect(receipt, 'the receipt repeats achievements the dialog already announced').not.toMatch(
      /newAchievementIds|getAchievement/,
    );
    expect(receipt, 'the receipt reuses "new discovery" language').not.toMatch(/You found a|New /);
  });

  it('keeps Field Research, which the celebration never showed', () => {
    /*
     * The one thing in this panel that is NOT a repeat. `DiscoveryCelebration` renders no
     * task rows and no counts, so a research task that moved is earned progress visible
     * nowhere else — removing it to make the receipt shorter would hide a reward rather than
     * de-duplicate one. It is silent when nothing moved, which is the common case.
     */
    const receipt = receiptBranch(OUTCOME);
    expect(receipt).toContain('<ScanResearchFeedback');
  });

  it('never calls a just-confirmed species one that was ALREADY held', () => {
    /*
     * `already` is `isDiscovered`, which flips true on the tap — so the row that offered the
     * find re-rendered as "Already in your collection" directly above a panel saying the
     * plant is in the collection NOW. Both true; together they describe one event in two
     * tenses. ALREADY means before this scan, and for the species just confirmed it is false.
     */
    /*
     * SLICED TO THE END OF THE TERNARY, NOT TO A FIXED 220 CHARACTERS. That window was long
     * enough for the two-arm version and stopped reaching the second arm the moment each arm
     * gained an ambiguous-name variant — so the guard failed while the rule it protects was
     * intact. A marker that has to be re-counted whenever the branch grows is measuring the
     * wrong thing; the closing tag is where this decision actually ends.
     */
    expect(SCAN_PANEL).toContain("confirmed?.herbId === herb.id");
    const opens = SCAN_PANEL.indexOf("confirmed?.herbId === herb.id");
    const branch = SCAN_PANEL.slice(opens, SCAN_PANEL.indexOf('</p>', opens));
    expect(branch).toMatch(/Added /);
    expect(branch).toMatch(/Already in your collection/);
    /*
     * BOTH ARMS, because there are now two of each. A row sharing a card name with a sibling
     * names the CARD in its marker — confirming Sambucus canadensis records the Elderberry
     * card, and the Sambucus nigra row beside it flips at the same instant, so a bare tick
     * under that binomial would read as "we recorded nigra". Every ADDED wording must still
     * precede every ALREADY wording, whichever arm it sits in.
     */
    const added = [...branch.matchAll(/Added /g)].map((hit) => hit.index);
    const alreadys = [...branch.matchAll(/[Aa]lready in your collection/g)].map((hit) => hit.index);
    expect(added.length, 'an ADDED wording went missing').toBeGreaterThan(0);
    expect(alreadys.length, 'an ALREADY wording went missing').toBeGreaterThan(0);
    expect(
      Math.max(...added),
      'the just-confirmed card must take the ADDED wording, not the ALREADY one',
    ).toBeLessThan(Math.min(...alreadys));
    // And it stays a MARKER: the receipt below carries the full sentence, so repeating it
    // here would print the same line twice on one screen.
    expect(branch, 'the candidate row echoes the receipt sentence').not.toMatch(
      /Added to your collection/,
    );
  });
});

describe('the reveal holds the card face down first', () => {
  const CELEBRATION_SRC = strip(
    readFileSync('src/components/herbdex/DiscoveryCelebration.tsx', 'utf8'),
  );

  it('starts face down, which is what there is to hold', () => {
    // `revealed` false is the mystery back; the flip class is only applied once it turns.
    expect(CELEBRATION_SRC).toContain('useState(false)');
    expect(CELEBRATION_SRC).toMatch(/revealed \? 'flip-card-revealed' : ''/);
  });

  it('waits long enough to be seen, and skips the wait under reduced motion', () => {
    /*
     * The beat existed and was 60ms — four frames, so the card appeared to arrive face up.
     *
     * The reduced-motion branch is the load-bearing half. This hold is a setTimeout, and the
     * global prefers-reduced-motion rule collapses CSS durations only — it cannot touch a JS
     * timer. Without the branch, somebody who asked for LESS motion would get MORE waiting:
     * half a second on a static back, then an instant snap with no turn to explain it.
     */
    expect(CELEBRATION_SRC).toContain('const FACE_DOWN_HOLD_MS = 520');
    expect(CELEBRATION_SRC).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')");
    expect(CELEBRATION_SRC).toMatch(/reduced \? 60 : FACE_DOWN_HOLD_MS/);
  });

  it('gives the hold something to watch, without moving the composition', () => {
    /*
     * A HALF SECOND OF A STILL PICTURE IS INDISTINGUISHABLE FROM A STALL. The beat above
     * buys the mystery back half a second on screen; frozen on frame 0 — which is right for
     * every other face-down card in the app — that half second reads as a dialog that has
     * not finished loading rather than as suspense.
     *
     * So the silhouette performs during the hold. Deliberately the SAME sprite the card back
     * already composed, opted into by a prop, and not a second element laid over it: the
     * number, the keyhole and the framing must be exactly where they are on every other
     * locked card, or the celebration is showing a different object from the one in the grid.
     */
    const mystery = strip(readFileSync('src/components/herbdex/MysteryCard.tsx', 'utf8'));
    expect(CELEBRATION_SRC).toMatch(/<MysteryCard herb=\{herb\} animated \/>/);
    /*
     * STATED AS "FREEZE ONLY WHEN NOBODY ASKED FOR MOTION", not as one exact expression.
     * This originally pinned `frozen={!animated}` literally and failed the moment the grid
     * gained its own one-shot mode — a guard tripping on a second legitimate caller rather
     * than on a regression. What it is actually protecting is that the card back holds
     * frame 0 by DEFAULT and gives that up only on an explicit opt-in, so it now asserts
     * both halves: `animated` must still lift the freeze, and the freeze must still be the
     * behaviour when no caller has asked for anything.
     */
    expect(mystery, 'the celebration no longer lifts the freeze').toMatch(
      /frozen=\{![\w\s!&]*animated[\w\s!&]*\}/,
    );
    expect(mystery, 'a face-down card no longer defaults to its resting frame').toMatch(
      /animated = false/,
    );
  });

  it('leaves every card that is merely at rest holding frame 0', () => {
    /*
     * THE DEFAULT IS THE LOAD-BEARING HALF. A locked Herbdex is mostly locked tiles, so an
     * always-on idle would make the grid forty-odd wriggling shadows — ambient motion, which
     * this app does not use, and a deck lying face down is exactly what it would stop looking
     * like. The two full-size locked pages are pages somebody READS; a moving shadow beside
     * the text is the same problem at a different size.
     *
     * Reduced motion needs no branch here and must not grow one: `.plant-sprite` is pinned in
     * the prefers-reduced-motion block in globals.css, so the opt-in above gives back the
     * still silhouette for anyone who asked for less motion.
     */
    const mystery = strip(readFileSync('src/components/herbdex/MysteryCard.tsx', 'utf8'));
    expect(mystery, 'the idle must be opt-in, or every locked tile plays it').toContain(
      'animated = false',
    );

    for (const file of [
      'src/components/herbdex/HerbCard.tsx',
      'src/components/herbdex/LockedHerb.tsx',
      'src/components/herbdex/LockedFieldCard.tsx',
    ]) {
      expect(
        strip(readFileSync(file, 'utf8')),
        `${file} animates a card that is simply sitting there`,
      ).not.toMatch(/<MysteryCard[^>]*animated/);
    }
  });

  it('leaves ordinary card flipping alone', () => {
    /*
     * `CardFlip` is the plant page's front/back toggle and is a different component with a
     * different job — it is turned by a button, in both directions, as many times as somebody
     * likes. A suspense beat there would delay a control the player just pressed.
     */
    const cardFlip = strip(readFileSync('src/components/herbdex/CardFlip.tsx', 'utf8'));
    expect(cardFlip).not.toContain('FACE_DOWN_HOLD_MS');
    expect(cardFlip).not.toContain('setTimeout');
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
