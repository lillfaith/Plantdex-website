import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { collectibleBelowLeader } from './scan-summary';
import { matchScientificName } from './plant-match';

const HINT = readFileSync('src/components/scan/CollectibleBelowLeader.tsx', 'utf8');

const card = (herbId: string) => ({ match: { confirmable: true, herbId } });
const plain = () => ({ match: { confirmable: false } });

/**
 * The real scan behind this: a dandelion photographed badly returned marsh dandelion in
 * front, with `Taraxacum campylodes` — the conserved name for *T. officinale* — third at 9%.
 */
describe('collectibleBelowLeader', () => {
  it('points at the first card below a leader that has none', () => {
    expect(collectibleBelowLeader([plain(), plain(), card('taraxacum-officinale')])).toBe(2);
  });

  // The list already leads with the collectible; there is nothing to look past.
  it('says nothing when the leader carries the card', () => {
    expect(collectibleBelowLeader([card('taraxacum-officinale'), plain()])).toBeNull();
    expect(collectibleBelowLeader([card('a'), card('b')])).toBeNull();
  });

  it('says nothing when no candidate carries a card', () => {
    expect(collectibleBelowLeader([plain(), plain(), plain()])).toBeNull();
  });

  it('says nothing about a single candidate or an empty list', () => {
    expect(collectibleBelowLeader([])).toBeNull();
    expect(collectibleBelowLeader([plain()])).toBeNull();
  });

  // A confirmable flag with no card to open is not something to point at.
  it('ignores a confirmable candidate with no herb id', () => {
    expect(collectibleBelowLeader([plain(), { match: { confirmable: true } }])).toBeNull();
  });

  it('takes the highest-ranked card, not the last', () => {
    expect(collectibleBelowLeader([plain(), card('b'), card('c')])).toBe(1);
  });
});

/**
 * THE INVARIANT THIS MUST NOT BREAK. `outcomeFor` reads RANK, never score and never "is one
 * of these a Plantdex card" — a low-scored deck species below a high-scored non-deck one
 * leaves the outcome uncertain, because reversing it lets the collection overrule the
 * identifier. This is a signpost to a row that already exists, and nothing more.
 */
describe('the hint promotes nothing', () => {
  it('reorders nothing and confirms nothing', () => {
    const code = HINT.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const forbidden of ['sort(', 'confirm', 'discover(', 'outcomeFor', 'setState']) {
      expect(code.includes(forbidden), `the hint uses ${forbidden}`).toBe(false);
    }
  });

  // It must never read as an identification the provider did not make.
  it('says the card is a lower-ranked suggestion, not the answer', () => {
    expect(HINT).toContain('not the');
    expect(HINT).toMatch(/leading answer/);
    expect(HINT).toMatch(/before you record anything/);
  });

  it('sends the player to compare against the card', () => {
    expect(HINT).toContain('/herbdex/');
  });
});

// The species that prompted this: the conserved name must still resolve to card #01.
describe('the dandelion case', () => {
  it('still treats Taraxacum campylodes as an exact match for the Dandelion card', () => {
    const match = matchScientificName('Taraxacum campylodes');
    expect(match.herbId).toBe('taraxacum-officinale');
    expect(match.kind).toBe('exact');
  });

  // A genuinely different species in the same genus must NOT become the card.
  it('does not turn marsh dandelion into the Dandelion card', () => {
    const match = matchScientificName('Taraxacum palustre');
    expect(match.kind).not.toBe('exact');
    expect(match.confirmable).toBeFalsy();
  });
});
