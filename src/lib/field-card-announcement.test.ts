import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FIELD_CARD_SLOTS, slotsCrossedBetween, slotsUnlockedAt } from './field-cards';
import {
  clearFieldCardUnlocks,
  consumeJustUnlocked,
  fieldCardUnlockState,
  recordUnlocks,
} from './unlocked-field-cards';

const CELEBRATION = readFileSync('src/components/herbdex/DiscoveryCelebration.tsx', 'utf8');

function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const T1 = FIELD_CARD_SLOTS[0]!.xp; // 600
const T2 = FIELD_CARD_SLOTS[1]!.xp; // 1,200

afterEach(() => clearFieldCardUnlocks());

/**
 * The bug: `recordUnlocks` ran in the provider (every page) but `justUnlocked` was read by
 * `FieldCardReward` (one page). Crossing a threshold on /scan granted the card in silence.
 */
describe('a Field Card unlocked while scanning is announced there', () => {
  it('reports the slot a discovery crossed', () => {
    const crossed = slotsCrossedBetween(T1 - 50, T1 + 10);
    expect(crossed.map((slot) => slot.ordinal)).toEqual([1]);
  });

  it('reports nothing when the gain crossed no threshold', () => {
    expect(slotsCrossedBetween(T1 + 10, T1 + 60)).toEqual([]);
  });

  // REPEAT SCAN. A repeat discovery awards 0 XP, so both totals are equal — there is no
  // second announcement to suppress, because the difference is empty by construction.
  it('announces nothing on a repeat, where the award is zero', () => {
    expect(slotsCrossedBetween(T1 + 10, T1 + 10)).toEqual([]);
    expect(slotsCrossedBetween(0, 0)).toEqual([]);
  });

  // SIMULTANEOUS UNLOCKS. One gain can span two thresholds; that is one event naming both,
  // never two modals.
  it('returns every threshold a single gain crossed, in order', () => {
    const crossed = slotsCrossedBetween(T1 - 1, T2 + 1);
    expect(crossed.map((slot) => slot.ordinal)).toEqual([1, 2]);
  });

  it('can span the whole ladder without duplicating a slot', () => {
    const crossed = slotsCrossedBetween(0, 1_000_000);
    const ordinals = crossed.map((slot) => slot.ordinal);
    expect(new Set(ordinals).size).toBe(ordinals.length);
    expect(ordinals).toEqual(slotsUnlockedAt(1_000_000).map((slot) => slot.ordinal));
  });

  /*
   * EXISTING USERS. The failure mode to avoid is a returning player being shown cards they
   * earned weeks ago as though they were new. A celebration only opens on a fresh
   * discovery, and the difference spans that discovery's own award — so everything already
   * held sits below `xpBefore` and cannot appear.
   */
  it('never re-announces a card the player already held', () => {
    const veteran = 12_000;
    expect(slotsUnlockedAt(veteran).length).toBeGreaterThan(4);
    // A 250 XP find at 12,000 XP crosses nothing already held.
    const crossed = slotsCrossedBetween(veteran, veteran + 250);
    for (const slot of crossed) expect(slot.xp).toBeGreaterThan(veteran);
    const held = new Set(slotsUnlockedAt(veteran).map((slot) => slot.ordinal));
    for (const slot of crossed) expect(held.has(slot.ordinal)).toBe(false);
  });

  it('sweeps the ladder and never reports a threshold at or below the starting XP', () => {
    for (const slot of FIELD_CARD_SLOTS) {
      for (const before of [slot.xp - 1, slot.xp, slot.xp + 1]) {
        for (const slot2 of slotsCrossedBetween(before, before + 300)) {
          expect(slot2.xp).toBeGreaterThan(before);
        }
      }
    }
  });

  // XP never falls during play, so a descending pair means a caller is confused; announcing
  // nothing is the safe answer.
  it('announces nothing when XP did not rise', () => {
    expect(slotsCrossedBetween(T2, T1)).toEqual([]);
  });
});

/**
 * ROUTE CHANGES. The celebration announces at the moment of earning; the /herbdex/research
 * reveal must then not say it again in the same session. Only the pending flag is consumed
 * — the written record is what lets a player see earned rewards later.
 */
describe('consuming the pending reveal', () => {
  it('clears an announced ordinal so the research panel does not repeat it', () => {
    recordUnlocks(T1 + 10, 'test-scope');
    expect(fieldCardUnlockState('test-scope').justUnlocked).toContain(1);
    consumeJustUnlocked([1]);
    expect(fieldCardUnlockState('test-scope').justUnlocked).not.toContain(1);
  });

  it('leaves an unannounced ordinal pending', () => {
    recordUnlocks(T2 + 10, 'test-scope');
    const pending = [...fieldCardUnlockState('test-scope').justUnlocked];
    expect(pending).toEqual([1, 2]);
    consumeJustUnlocked([1]);
    expect([...fieldCardUnlockState('test-scope').justUnlocked]).toEqual([2]);
  });

  // THE RATCHET IS UNTOUCHABLE FROM HERE. "Already announced" and "no longer owned" are
  // different facts, and this may only ever assert the first.
  it('never removes the written record, so the card is still held', () => {
    recordUnlocks(T1 + 10, 'test-scope');
    const before = { ...fieldCardUnlockState('test-scope').record };
    consumeJustUnlocked([1]);
    expect(fieldCardUnlockState('test-scope').record).toEqual(before);
    expect(Object.keys(fieldCardUnlockState('test-scope').record)).toContain('1');
  });

  it('is a no-op when called early, twice, or with nothing', () => {
    expect(() => consumeJustUnlocked([])).not.toThrow();
    expect(() => consumeJustUnlocked([7])).not.toThrow();
    recordUnlocks(T1 + 10, 'test-scope');
    consumeJustUnlocked([1]);
    expect(() => consumeJustUnlocked([1])).not.toThrow();
    expect(fieldCardUnlockState('test-scope').justUnlocked).not.toContain(1);
  });
});

describe('the announcement is in the sequence, not on top of it', () => {
  // The brief's rule, and simply correct: one moment, not two dialogs to dismiss.
  it('adds no second dialog', () => {
    const dialogs = code(CELEBRATION).match(/<dialog/g) ?? [];
    expect(dialogs).toHaveLength(0);
  });

  it('renders the unlock as a row beside the achievements', () => {
    expect(code(CELEBRATION)).toMatch(/unlockedNow\.length > 0 && \(\s*<ul/);
    expect(code(CELEBRATION)).toContain('animate-toast-in');
  });

  // A second live region would interrupt the first mid-sentence.
  it('folds into the single existing screen-reader announcement', () => {
    expect(code(CELEBRATION).match(/role="status"/g) ?? []).toHaveLength(1);
    expect(code(CELEBRATION)).toMatch(/unlockedNow[\s\S]{0,200}commonName/);
  });

  it('derives the crossing instead of subscribing to a flag', () => {
    expect(code(CELEBRATION)).toContain('slotsCrossedBetween(xpBefore, xpAfter)');
  });

  // An XP unlock is not a find. The dialog must not blur them in the same breath as a real
  // discovery.
  it('says the card was earned with XP rather than found', () => {
    expect(CELEBRATION).toMatch(/Earned with XP, not found outdoors/);
  });
});
