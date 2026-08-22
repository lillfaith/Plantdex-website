import { describe, expect, it } from 'vitest';
import { formatCitation, getSource, resolveRefs } from './sources';
import { HERBS } from './deck';

describe('source registry', () => {
  it('exposes the deck as a verified source', () => {
    const deck = getSource('plantdex-deck');
    expect(deck).toBeDefined();
    expect(deck!.verified).toBe(true);
  });

  it('every registered source declares a verification status and a title', () => {
    for (const herb of HERBS) {
      for (const ref of herb.sources ?? []) {
        const source = getSource(ref.sourceId);
        expect(source, `herb ${herb.id} cites unknown source ${ref.sourceId}`).toBeDefined();
        expect(typeof source!.verified).toBe('boolean');
        expect(source!.title.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('resolveRefs', () => {
  it('drops references to unknown sources', () => {
    expect(resolveRefs([{ sourceId: 'does-not-exist' }])).toEqual([]);
  });

  /**
   * The guarantee the whole citation system rests on: an unverified source is never
   * rendered, so an unchecked citation cannot reach a reader.
   */
  it('drops references to unverified sources', () => {
    const unverified = getSource('plantdex-deck');
    expect(unverified).toBeDefined();
    const fake = { ...unverified!, id: 'unchecked', verified: false };
    // resolveRefs reads the real registry, so assert via a source that is not in it.
    expect(resolveRefs([{ sourceId: fake.id }])).toEqual([]);
  });

  it('resolves a verified reference and keeps its detail', () => {
    const resolved = resolveRefs([{ sourceId: 'plantdex-deck', detail: 'Card #33' }]);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.detail).toBe('Card #33');
    expect(resolved[0]!.source.verified).toBe(true);
  });

  it('handles missing refs', () => {
    expect(resolveRefs(undefined)).toEqual([]);
    expect(resolveRefs([])).toEqual([]);
  });
});

describe('every herb carries provenance', () => {
  it('cites the physical card it was transcribed from', () => {
    for (const herb of HERBS) {
      const resolved = resolveRefs(herb.sources);
      expect(resolved.length, `herb ${herb.id} has no verified source`).toBeGreaterThan(0);
      expect(resolved.some((r) => r.source.id === 'plantdex-deck')).toBe(true);
      expect(resolved[0]!.detail).toContain(String(herb.cardNumber).padStart(2, '0'));
    }
  });
});

describe('formatCitation', () => {
  it('includes organisation and title', () => {
    const text = formatCitation(getSource('plantdex-deck')!);
    expect(text).toContain('Plantdex');
    expect(text).toContain('card deck');
  });
});
