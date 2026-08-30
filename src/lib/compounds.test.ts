import { describe, expect, it } from 'vitest';

import { compoundFor, knownCompoundIds, sortForPlate } from './compounds';
import { STRUCTURES } from '@/components/chemistry/structures';
import { HERBS } from './deck';

/**
 * The compound layer decides what gets DRAWN beside a card's own wording, which makes it
 * the one place on a plant page where a rendering choice can state something false about
 * chemistry. These tests are about that, not about styling.
 */

const printed = [...new Set(HERBS.flatMap((herb) => herb.back.compounds))];

describe('compound classification', () => {
  it('resolves every compound string printed anywhere in the deck', () => {
    // An unresolved string still renders as itself, so this failing is not a crash — it is
    // a compound shipping with no statement of what kind of thing it is, on a page whose
    // whole point is to say so.
    const missing = printed.filter((name) => compoundFor(name) === null);
    expect(missing, `no entry for: ${missing.join(', ')}`).toEqual([]);
  });

  it('collapses case variants of the same compound to one entry', () => {
    // The deck prints both "Oxalic Acid" and "Oxalic acid" on different cards. They are the
    // same substance and must not become two different plates.
    expect(compoundFor('Oxalic Acid')!.id).toBe(compoundFor('oxalic acid')!.id);
    expect(compoundFor('  Vitamin   C ')!.id).toBe(compoundFor('Vitamin C')!.id);
  });

  it('points every declared structure at art that exists', () => {
    for (const id of knownCompoundIds()) {
      const entry = compoundFor(id)!;
      if (!entry.structure) continue;
      expect(STRUCTURES[entry.structure], `${id}: no art for "${entry.structure}"`).toBeDefined();
    }
  });

  it('never gives a family, mixture or polymer a single molecule to stand for it', () => {
    // THE FAILURE THIS EXISTS FOR. One `structure` on "Flavonoids" would silently tell every
    // reader that a family of thousands of compounds is one drawing, and it would look
    // exactly as convincing as the accurate plates beside it.
    for (const id of knownCompoundIds()) {
      const entry = compoundFor(id)!;
      if (entry.kind === 'molecule') continue;
      expect(entry.structure, `${id} (${entry.kind}) carries a single structure`).toBeUndefined();
    }
  });

  it('never claims an effect in a compound note', () => {
    // Naming a constituent is not a claim about what it does, and a caption is the easiest
    // place for one to creep in.
    const forbidden = /\b(treats?|cures?|heals?|relieves?|prevents?|remed(y|ies))\b/i;
    for (const id of knownCompoundIds()) {
      const entry = compoundFor(id)!;
      const text = `${entry.note ?? ''} ${entry.subtitle ?? ''}`;
      expect(forbidden.test(text), `${id}: "${text.trim()}"`).toBe(false);
    }
  });
});

describe('the six that must not be flattened', () => {
  it('treats silica as a compound, never as elemental silicon', () => {
    // Silica is SiO2. An `Si` periodic tile would state that the card names an element it
    // does not name — the single most concrete misstatement this plate could make.
    const silica = compoundFor('Silica')!;
    expect(silica.kind).toBe('mineral-compound');
    expect(silica.kind).not.toBe('mineral');
    expect(silica.symbol).toBeUndefined();
    expect(silica.atomicNumber).toBeUndefined();
    expect(silica.formula).toBe('SiO2');
  });

  it('keeps the real elements as elements', () => {
    for (const [name, symbol] of [
      ['Calcium', 'Ca'],
      ['Iron', 'Fe'],
      ['Magnesium', 'Mg'],
      ['Potassium', 'K'],
    ] as const) {
      const entry = compoundFor(name)!;
      expect(entry.kind, name).toBe('mineral');
      expect(entry.symbol).toBe(symbol);
      expect(entry.atomicNumber).toBeGreaterThan(0);
    }
  });

  it('treats inulin as a polymer of variable length', () => {
    const inulin = compoundFor('Inulin')!;
    expect(inulin.kind).toBe('polymer');
    expect(`${inulin.subtitle} ${inulin.note}`.toLowerCase()).toContain('varies');
  });

  it('treats mucilage as a mixture of polysaccharides, not one compound', () => {
    const mucilage = compoundFor('Mucilage')!;
    expect(mucilage.kind).toBe('polymer');
    expect(mucilage.note?.toLowerCase()).toContain('mixture');
    expect(mucilage.note?.toLowerCase()).toContain('not a single compound');
  });

  it('names both components of citral rather than picking one', () => {
    const citral = compoundFor('Citral')!;
    expect(citral.kind).toBe('mixture');
    expect(citral.components).toEqual(['Geranial (E)', 'Neral (Z)']);
  });

  it('keeps unqualified pinene ambiguous between its isomers', () => {
    // Alpha- and beta-pinene are different molecules and the card does not say which. One
    // of them drawn under the bare label "Pinene" would be a coin-flip presented as fact.
    const pinene = compoundFor('Pinene')!;
    expect(pinene.kind).toBe('mixture');
    expect(pinene.components).toHaveLength(2);
    expect(pinene.note?.toLowerCase()).toContain('does not say which');
  });

  it('keeps unqualified chlorophyll a family, since a and b differ', () => {
    const chlorophyll = compoundFor('Chlorophyll')!;
    expect(chlorophyll.kind).toBe('chemical-class');
    expect(chlorophyll.note?.toLowerCase()).toContain('does not specify');
  });
});

describe('plate order', () => {
  it('leads with the most specific content a card has', () => {
    // A reader meeting "Quercetin" and "Flavonoids" together should reach the one that says
    // something particular first.
    const order = sortForPlate(['Flavonoids', 'Iron', 'Quercetin', 'Inulin']);
    expect(order[0]).toBe('Quercetin');
    expect(order.indexOf('Inulin')).toBeLessThan(order.indexOf('Flavonoids'));
    expect(order.at(-1)).toBe('Iron');
  });

  it('keeps every compound it was given', () => {
    for (const herb of HERBS) {
      expect(sortForPlate(herb.back.compounds).sort()).toEqual([...herb.back.compounds].sort());
    }
  });
});
