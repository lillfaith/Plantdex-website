import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { cardSupport, combinedSupport } from './card-support';

const UI = readFileSync('src/components/scan/CollectibleBelowLeader.tsx', 'utf8');

const card = (scientificName: string, score: number, herbId: string) => ({
  scientificName,
  score,
  match: { confirmable: true, herbId },
});
const other = (scientificName: string, score: number) => ({
  scientificName,
  score,
  match: { confirmable: false },
});

/**
 * The real shape behind this, from the deck's own stored provider response for a dandelion:
 * two names, one card, and a leading row that reads 45% while 68% of the ranking points at
 * that card.
 */
const DANDELION = [
  card('Taraxacum campylodes', 0.454, 'taraxacum-officinale'),
  card('Taraxacum sect. Taraxacum', 0.221, 'taraxacum-officinale'),
  other('Taraxacum pubescens', 0.023),
  other('Taraxacum erythrospermum', 0.02),
];

describe('cardSupport', () => {
  it('adds the shares of every name pointing at one card', () => {
    const [top] = cardSupport(DANDELION);
    expect(top?.herbId).toBe('taraxacum-officinale');
    expect(top?.share).toBeCloseTo(0.675, 3);
    expect(top?.names).toEqual(['Taraxacum campylodes', 'Taraxacum sect. Taraxacum']);
  });

  // The number a reader sees goes from 45 to 68 without anything being invented.
  it('reports more than the leading name alone', () => {
    const [top] = cardSupport(DANDELION);
    expect(Math.round((top?.share ?? 0) * 100)).toBe(68);
    expect(top?.share).toBeGreaterThan(DANDELION[0]!.score);
  });

  /*
   * A `sameGenus` relative is a DIFFERENT SPECIES, not the card. Folding its share in would
   * be the exact overclaim this module exists to remove.
   */
  it('counts only confirmable matches', () => {
    expect(cardSupport([other('Taraxacum palustre', 0.47)])).toEqual([]);
    const [top] = cardSupport([card('A', 0.2, 'x'), other('B', 0.6)]);
    expect(top?.share).toBeCloseTo(0.2, 5);
  });

  it('keeps separate cards separate, strongest first', () => {
    const byCard = cardSupport([card('A', 0.2, 'x'), card('B', 0.5, 'y'), card('C', 0.1, 'x')]);
    expect(byCard.map((entry) => entry.herbId)).toEqual(['y', 'x']);
    expect(byCard[1]?.share).toBeCloseTo(0.3, 5);
  });

  // A provider that overshoots must not print "112%".
  it('clamps a total at the whole ranking', () => {
    const [top] = cardSupport([card('A', 0.8, 'x'), card('B', 0.8, 'x')]);
    expect(top?.share).toBe(1);
  });

  it('ignores rubbish scores rather than poisoning the total', () => {
    const [top] = cardSupport([
      card('A', Number.NaN, 'x'),
      card('B', -5, 'x'),
      card('C', 0.3, 'x'),
    ]);
    expect(top?.share).toBeCloseTo(0.3, 5);
  });

  it('bands the combined share, not the leading one', () => {
    // 0.454 alone is 'moderate'; combined 0.675 is still moderate but materially higher.
    const [top] = cardSupport(DANDELION);
    expect(top?.band).toBe('moderate');
    expect(cardSupport([card('A', 0.5, 'x'), card('B', 0.3, 'x')])[0]?.band).toBe('strong');
  });

  it('says nothing about an empty list', () => {
    expect(cardSupport([])).toEqual([]);
  });
});

describe('combinedSupport', () => {
  it('names the card when several names point at it', () => {
    expect(combinedSupport(DANDELION)?.herbId).toBe('taraxacum-officinale');
  });

  // With one name the combined figure is that row's own score repeated.
  it('stays silent when only one name points at the card', () => {
    expect(combinedSupport([card('A', 0.9, 'x'), other('B', 0.05)])).toBeNull();
    expect(combinedSupport([])).toBeNull();
  });
});

describe('what the line is allowed to claim', () => {
  // The caveat travels with the number rather than sitting in grey text below the list.
  it('keeps the not-a-probability caveat beside the figure', () => {
    const prose = UI.replace(/\s+/g, ' ');
    expect(prose).toMatch(/rather than a calibrated probability/);
    expect(prose).toMatch(/checking the plant against the card/);
  });

  it('changes no ranking and no outcome', () => {
    const code = UI.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const forbidden of ['outcomeFor', 'confirm', 'discover(']) {
      expect(code.includes(forbidden), `the line uses ${forbidden}`).toBe(false);
    }
  });
});
