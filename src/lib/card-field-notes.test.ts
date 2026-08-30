import { describe, expect, it } from 'vitest';

import { FIELD_NOTES, fieldNotesFor, isGenusCard, GENUS_CARD_NOTICE } from './card-field-notes';
import { HERBS, isHerbId } from './deck';
import { getSource } from './sources';

/**
 * Field notes are the one part of a plant page that is NOT transcribed from the card, and
 * lookalikes are the most dangerous content a foraging site can carry. These tests are
 * about that: that a hazard cannot quietly become a nicety, and that a genus notice cannot
 * drift away from what the deck actually prints.
 */

/** The six pairs where mistaking one plant for the other actually matters. */
const MUST_CARRY_RISK = [
  'portulaca-oleracea', // purslane / spurge
  'rhus-spp', //           sumac / poison sumac
  'allium-vineale', //     Allium / death camas
  'sambucus-spp', //       elderberry / pokeweed
  'achillea-millefolium', // yarrow / white-umbel carrot family
  'pinus-spp', //          pine / yew
];

describe('field notes', () => {
  it('covers every card in the deck', () => {
    const missing = HERBS.filter((herb) => fieldNotesFor(herb) === null).map((herb) => herb.id);
    expect(missing, `no field notes for: ${missing.join(', ')}`).toEqual([]);
  });

  it('only names real herbs', () => {
    for (const id of Object.keys(FIELD_NOTES)) {
      expect(isHerbId(id), `${id} is not a deck herb`).toBe(true);
    }
  });

  it('gives every trait row both a label and a detail', () => {
    for (const [id, notes] of Object.entries(FIELD_NOTES)) {
      for (const row of notes.identification ?? []) {
        expect(row.trait.trim(), `${id}: empty trait`).not.toBe('');
        expect(row.detail.trim(), `${id}: empty detail for "${row.trait}"`).not.toBe('');
      }
    }
  });

  it('gives every lookalike a discriminating character', () => {
    // A lookalike with no `distinguishBy` is worse than no lookalike: it names a dangerous
    // confusion and then declines to resolve it.
    for (const [id, notes] of Object.entries(FIELD_NOTES)) {
      for (const look of notes.lookalikes ?? []) {
        expect(look.commonName.trim(), `${id}: unnamed lookalike`).not.toBe('');
        expect(look.distinguishBy.trim(), `${id}: "${look.commonName}" has no discriminator`)
          .not.toBe('');
      }
    }
  });
});

describe('hazards', () => {
  it('keeps a risk on every one of the six dangerous confusions', () => {
    // THE REGRESSION THIS CATCHES: an edit that tidies a `risk` away, downgrading
    // "this is not proof the plant is safe to eat" to ordinary body text. Death camas and
    // poison sumac do not become less dangerous because a sentence read as repetitive.
    for (const id of MUST_CARRY_RISK) {
      const notes = FIELD_NOTES[id];
      expect(notes, `${id} has no field notes at all`).toBeDefined();
      const risks = (notes!.lookalikes ?? []).filter((look) => look.risk?.trim());
      expect(risks.length, `${id}: no lookalike carries a risk`).toBeGreaterThan(0);
    }
  });

  it('never lets a risk imply the trait above proves safety', () => {
    const forbidden = /\b(safe to eat|proves|guarantees|confirms it is safe)\b/i;
    for (const [id, notes] of Object.entries(FIELD_NOTES)) {
      for (const look of notes.lookalikes ?? []) {
        if (!look.risk) continue;
        // "safe to eat" is allowed only in the negative — which is the whole point of it.
        const affirmative = forbidden.test(look.risk) && !/\b(not|never|must not|do not)\b/i.test(look.risk);
        expect(affirmative, `${id}: "${look.risk}"`).toBe(false);
      }
    }
  });
});

describe('genus handling', () => {
  const genusCards = HERBS.filter(isGenusCard);

  it('is derived from the deck, not from a hand-kept list', () => {
    // Nine cards print `spp.`. Deriving it means the notice can never claim a card is
    // genus-level when the card in the player's hand names a species.
    expect(genusCards.map((herb) => herb.id).sort()).toEqual([
      'acer-spp',
      'morus-spp',
      'pinus-spp',
      'quercus-spp',
      'rhus-spp',
      'rosa-spp',
      'rubus-spp',
      'salix-spp',
      'sambucus-spp',
    ]);
    expect(genusCards).toHaveLength(9);
  });

  it('does not call a species-named card genus-level', () => {
    // These four print a species on the card while the traits shown are genus-wide. They
    // get the accurate caveat instead; saying "Plantdex represents this card at genus
    // level" would misdescribe the deck.
    for (const id of ['mentha-canadensis', 'allium-vineale', 'monarda-fistulosa', 'lonicera-japonica']) {
      const herb = HERBS.find((candidate) => candidate.id === id)!;
      expect(isGenusCard(herb), `${id} is not an spp. card`).toBe(false);
      const note = FIELD_NOTES[id]?.genusTraitsNote;
      expect(note, `${id}: no genus-traits caveat`).toBeDefined();
      expect(note).not.toContain(GENUS_CARD_NOTICE);
      expect(note!.toLowerCase()).toContain('confirm the species');
    }
  });

  it('never gives an spp. card the species-level caveat as well', () => {
    for (const herb of genusCards) {
      expect(FIELD_NOTES[herb.id]?.genusTraitsNote, `${herb.id}`).toBeUndefined();
    }
  });
});

describe('sources', () => {
  it('only cites ids that exist in the registry', () => {
    // Unverified sources are dropped by `resolveRefs` and never render, but a citation
    // pointing at an id that does not exist at all is a different thing: it means nobody
    // can check it even by hand.
    for (const [id, notes] of Object.entries(FIELD_NOTES)) {
      for (const sourceId of notes.sourceIds) {
        expect(getSource(sourceId), `${id} cites unknown source "${sourceId}"`).toBeDefined();
      }
    }
  });

  it('cites a source for every dangerous confusion', () => {
    for (const id of MUST_CARRY_RISK) {
      expect(FIELD_NOTES[id]!.sourceIds.length, `${id} has a risk but no source`)
        .toBeGreaterThan(0);
    }
  });
});
