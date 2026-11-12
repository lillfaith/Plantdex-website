import { describe, expect, it } from 'vitest';
import { PART_ART, PREP_ART, glyphForTrait, ILLUSTRATIONS } from './pixel-icons';
import { PRINTED_CARDS } from './deck';

describe('Herbalism pixel icons', () => {
  it('gives every printed healing trait a specific icon, shared across plants', () => {
    const traits = new Set(PRINTED_CARDS.flatMap((c) => c.back.healingTraits));
    const missing = [...traits].filter((t) => !glyphForTrait(t));
    expect(missing).toEqual([]);
    expect(glyphForTrait('Mild diuretic')).toBe(glyphForTrait('Diuretic'));
  });
  it('illustrates every printed part and preparation', () => {
    for (const [key, rules] of [['usableParts', PART_ART], ['preparations', PREP_ART]] as const) {
      const words = new Set(PRINTED_CARDS.flatMap((c) => c.back[key]));
      const missing = [...words].filter((w) => !rules.some((r) => r.match.test(w)));
      expect(missing).toEqual([]);
    }
  });
  it('draws every illustration on one grid width', () => {
    for (const [name, rows] of Object.entries(ILLUSTRATIONS)) {
      expect(new Set(rows.map((r) => r.length)).size, name).toBe(1);
    }
  });
});
