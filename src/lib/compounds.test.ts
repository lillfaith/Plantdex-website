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
    // exactly as convincing as the accurate plates beside it. Same for a mixture, where one
    // isomer would stand in for two, and a polymer, where one unit would stand in for a
    // chain of unfixed length.
    //
    // `mineral-compound` is deliberately NOT in this list. Silica is ONE compound with one
    // structure — the SiO4 tetrahedron — so drawing it misrepresents nothing. The rule is
    // about names that cover MANY substances, not about every non-molecule.
    const cannotHaveOne = ['chemical-class', 'mixture', 'polymer'];
    for (const id of knownCompoundIds()) {
      const entry = compoundFor(id)!;
      if (!cannotHaveOne.includes(entry.kind)) continue;
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

describe('class scaffolds', () => {
  /**
   * A scaffold is the CORE SKELETON that defines a class, drawn instead of a member of it.
   * That is a true statement — every flavonoid really is built on the C6-C3-C6 core — and it
   * is the only way a card printing nothing but class names can show any chemistry at all.
   *
   * It is a separate field from `structure` precisely so the guard above keeps working: a
   * class still may never carry a `structure`, and adding scaffolds did not relax that.
   */

  /** Classes with ONE genuine defining skeleton. Nothing else may claim a core. */
  const HAS_A_REAL_CORE = [
    'flavonoids', 'coumarins', 'iridoids', 'anthraquinones', 'anthocyanins',
    // A catechin IS a flavan-3-ol and a glucosinolate IS a thioglucoside sulfonated oxime;
    // in both the class name names the skeleton, which is exactly the test for a scaffold.
    'catechins', 'glucosinolates', 'betalains',
  ];

  /**
   * Classes that must NEVER get one, because no single skeleton defines them:
   * hydrolysable and condensed tannins are different molecules; saponins are triterpenoid
   * or steroidal; "alkaloid" only means nitrogen-containing; "glycoside" only means bound
   * to a sugar; lignans share one BOND, not one skeleton, so their subtypes look nothing
   * alike. Drawing a core for any of these would invent a shared structure.
   */
  const HAS_NO_CORE = [
    'tannins', 'saponins', 'alkaloids', 'glycosides', 'polyphenols', 'phenolics',
    'terpenes', 'lignans', 'carotenoids', 'lactones',
    'sulfur compounds', 'omega-3', 'chlorophyll', 'isothiocyanates',
    'phenolic acid', 'isoflavones', 'sesquiterpene lactones',
  ];

  it('only draws a core for a class that genuinely has one', () => {
    for (const id of HAS_A_REAL_CORE) {
      const entry = compoundFor(id)!;
      expect(entry.kind, id).toBe('chemical-class');
      expect(entry.scaffold, `${id} should have a core`).toBeDefined();
    }
  });

  it('never invents a shared core for a class that has none', () => {
    // The regression this catches: someone lighting up the remaining grey plates by giving
    // "Tannins" a drawing. That would assert a skeleton the group does not share.
    for (const id of HAS_NO_CORE) {
      const entry = compoundFor(id);
      if (!entry) continue;
      expect(entry.scaffold, `${id} must not claim a shared core`).toBeUndefined();
    }
  });

  it('only puts a scaffold on a class, never on anything else', () => {
    for (const id of knownCompoundIds()) {
      const entry = compoundFor(id)!;
      if (!entry.scaffold) continue;
      expect(entry.kind, `${id} has a scaffold but is not a class`).toBe('chemical-class');
    }
  });

  it('points every scaffold at art that exists', () => {
    for (const id of knownCompoundIds()) {
      const entry = compoundFor(id)!;
      if (!entry.scaffold) continue;
      expect(STRUCTURES[entry.scaffold], `${id}: no art for "${entry.scaffold}"`).toBeDefined();
    }
  });

  it('says in words that members differ, wherever a core is drawn', () => {
    // The drawing alone could be read as "this is the compound". The caption is what stops
    // that, so a scaffold without one is not shippable.
    for (const id of knownCompoundIds()) {
      const entry = compoundFor(id)!;
      if (!entry.scaffold) continue;
      expect(entry.note, `${id} has no note`).toBeDefined();
      expect(
        /differ|individual|parent of the group/i.test(entry.note!),
        `${id}: "${entry.note}" does not say members differ`,
      ).toBe(true);
    }
  });
});
