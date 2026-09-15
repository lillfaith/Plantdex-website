import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { cardsWithEvidence, evidenceFor, STANDING_LABEL } from './trait-evidence';
import { getCatalogueEntry } from './catalogue';

const BACK_DETAILS = readFileSync('src/components/herbdex/CardBackDetails.tsx', 'utf8');

describe('the trait evidence layer', () => {
  it('only describes traits the card actually prints', () => {
    /*
     * THE WHOLE POINT OF THE LAYER IS THAT IT DOES NOT EDIT THE CARD. It sits under the
     * transcription saying what stands behind each word. A row naming a trait the card does
     * not print would be this layer inventing a healing claim and dressing it as commentary
     * on one — which is worse than the flat chips it exists to qualify.
     */
    for (const id of cardsWithEvidence()) {
      const herb = getCatalogueEntry(id);
      expect(herb, `${id} has evidence but is not in the catalogue`).toBeDefined();
      for (const row of evidenceFor(herb!)!.traits) {
        expect(
          herb!.back.healingTraits,
          `${id}: "${row.trait}" is not printed on the card`,
        ).toContain(row.trait);
      }
    }
  });

  it('claims no treatment anywhere in it', () => {
    // Same forbidden list `compounds.test.ts` applies to a caption. A layer written to be
    // MORE cautious than the card is the last place a cure should be able to appear.
    const forbidden = /\b(treats?|cures?|heals?|relieves?|prevents?|remed(y|ies))\b/i;
    for (const id of cardsWithEvidence()) {
      const evidence = evidenceFor(getCatalogueEntry(id)!)!;
      const text = [evidence.summary, ...evidence.traits.map((r) => r.detail)].join(' ');
      expect(text, `${id} claims a treatment`).not.toMatch(forbidden);
    }
  });

  it('never files a trait as clinical without human evidence to point at', () => {
    /*
     * `clinical` exists in the type and is deliberately unused. Nothing in this deck has
     * human clinical evidence anybody here has opened and read, and the standing that would
     * carry the most weight is the one easiest to reach for. If this ever fails, the fix is
     * a verified source in `sources.json` — not deleting the assertion.
     */
    for (const id of cardsWithEvidence()) {
      for (const row of evidenceFor(getCatalogueEntry(id)!)!.traits) {
        expect(row.standing, `${id}: "${row.trait}" claims clinical standing`).not.toBe(
          'clinical',
        );
      }
    }
  });

  it('keeps laboratory and clinical separate in the words a reader sees', () => {
    expect(STANDING_LABEL.laboratory).toBe('Laboratory evidence');
    expect(STANDING_LABEL.clinical).toBe('Clinical evidence');
    expect(STANDING_LABEL.traditional).toBe('Traditional use');
  });

  it('renders under the printed chips, attributed to Plantdex rather than the card', () => {
    // The framing is the site's judgement. Labelling it card data would borrow the
    // transcription's authority for something the card never said.
    const block = BACK_DETAILS.slice(BACK_DETAILS.indexOf('function TraitEvidenceNote'));
    expect(block).toContain('<ProvenanceChip source="plantdex" />');
    expect(BACK_DETAILS.indexOf('<ChipRow>')).toBeLessThan(
      BACK_DETAILS.indexOf('<TraitEvidenceNote'),
    );
  });

  it('is absent from every card that has no entry', () => {
    // 54 cards exist; one has evidence. The block returns null for the rest, so no other
    // page gains a section it was not authored for.
    expect(cardsWithEvidence()).toEqual(['callicarpa-americana']);
  });
});
