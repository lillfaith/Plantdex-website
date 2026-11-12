import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const CELEBRATION = readFileSync('src/components/herbdex/DiscoveryCelebration.tsx', 'utf8');
const CSS = readFileSync('src/app/globals.css', 'utf8');

/**
 * Comments stripped before matching, because a guard about CODE must not fire on PROSE.
 *
 * Both assertions below ban a spelling (`navigator.vibrate`, a third `haptic(` call) that
 * the code explaining the ban then has to NAME in order to explain it. This file failed on
 * its own documentation the first time it ran, which is a shape this repo has been bitten
 * by before — see the note in delete-account's USER_TABLES about a comment that could not
 * spell out the thing it was describing.
 */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}


/**
 * The reveal is ~1.5s, which is right the first time and wrong the twentieth. These pin the
 * skip control's contract — not that it exists, but that skipping LANDS the sequence rather
 * than discarding it, which is the part a future edit could quietly get wrong.
 */
describe('the discovery reveal can be skipped', () => {
  it('offers a skip control', () => {
    expect(CELEBRATION).toContain('skipToEnd');
    expect(CELEBRATION).toMatch(/>\s*Skip/);
  });

  // A skip that closed the dialog would throw away the XP, the level bar and the
  // achievement rows — the information the player opened it for.
  it('skips to the end state rather than dismissing the dialog', () => {
    expect(CELEBRATION).toMatch(/function skipToEnd\(\)[\s\S]{0,220}setBarPhase\(finalBarPhase\)/);
    expect(CELEBRATION).toMatch(/function skipToEnd\(\)[\s\S]{0,220}setRevealed\(true\)/);
    // It must not be a close button wearing a different label.
    expect(CELEBRATION).not.toMatch(/function skipToEnd\(\)[\s\S]{0,220}onClose\(\)/);
  });

  it('stops the timers instead of replaying the sequence over its own conclusion', () => {
    expect(CELEBRATION).toMatch(/if \(skipped\) return;/);
    expect(CELEBRATION).toMatch(/\}, \[leveledUp, skipped\]\);/);
  });

  // Setting `revealed` alone starts the 900ms spin rather than skipping it, so the card
  // would still take nearly a second to arrive — the one beat a skip must cut.
  it('zeroes the card turn, not just the hold', () => {
    expect(CELEBRATION).toContain('flip-card-instant');
    expect(CSS).toMatch(/@utility flip-card-instant \{[\s\S]*?transition-duration: 0s;/);
    // The shade travels with the card; left running it crosses a card already face up.
    expect(CSS).toMatch(/@utility flip-card-instant \{[\s\S]*?flip-shade[\s\S]*?transition-duration: 0s;/);
  });

  it('lands the counting numbers instantly too', () => {
    const counts = CELEBRATION.match(/durationMs=\{[^}]*\}/g) ?? [];
    expect(counts.length).toBeGreaterThanOrEqual(2);
    for (const count of counts) expect(count).toContain('skipped ? 0');
  });

  // A control that does nothing teaches a player not to trust the next one.
  it('hides itself once there is nothing left to skip', () => {
    expect(CELEBRATION).toMatch(/const settled = revealed && barPhase === finalBarPhase;/);
    expect(CELEBRATION).toMatch(/\{!settled && \(/);
  });

  /*
   * NOT HIDDEN UNDER REDUCED MOTION, and this is the assertion most likely to be "fixed"
   * by somebody who assumes it should be. That preference collapses CSS durations; the bar
   * beats here are setTimeout and are untouched by it, so a reduced-motion player still
   * waits out 700ms and 1500ms and is arguably the one who most wants a way past them.
   */
  it('keeps the control available under reduced motion', () => {
    // The control's visibility is gated on `settled` and on nothing else.
    expect(code(CELEBRATION)).not.toMatch(/reduced[\s\S]{0,80}settled/);
    expect(code(CELEBRATION)).toMatch(/\{!settled && \(/);
  });
});

describe('haptics in the reveal', () => {
  it('rides the existing beats and adds no third one', () => {
    expect(code(CELEBRATION).match(/haptic\(/g) ?? []).toHaveLength(2);
    expect(CELEBRATION).toContain("haptic('tap')");
    expect(CELEBRATION).toContain("haptic('success')");
  });

  it('goes through the platform-aware module, never navigator.vibrate', () => {
    expect(CELEBRATION).toContain("from '@/lib/haptics'");
    expect(code(CELEBRATION)).not.toMatch(/navigator\s*\.\s*vibrate/);
  });
});
