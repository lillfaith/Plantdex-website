import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  FIELD_NOTES,
  fieldNoteSectionSources,
  fieldNotesFor,
  pageSourceCount,
  isGenusCard,
  GENUS_CARD_NOTICE,
} from './card-field-notes';
import { PRINTED_CARDS } from './deck';
import { DIGITAL_ONLY_ENTRIES, getCatalogueEntry } from './catalogue';
import { getSource, sectionCitations } from './sources';
import { iconForTrait } from './trait-icons';

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
    const missing = PRINTED_CARDS.filter((herb) => fieldNotesFor(herb) === null).map((herb) => herb.id);
    expect(missing, `no field notes for: ${missing.join(', ')}`).toEqual([]);
  });

  /*
   * SCOPED TO THE CATALOGUE, NOT THE PRINTED DECK — and it was the printed deck until the
   * Field Cards got notes. The check's job is to catch a TYPO'D OR PHANTOM id, not to say
   * which collection may have notes, and `PRINTED_CARDS` only did both jobs while the two
   * sets were the same set. A Field Card is a real herb with a real page, so citing the
   * deck here would have made the honest entry indistinguishable from the mistake.
   */
  it('only names real herbs', () => {
    for (const id of Object.keys(FIELD_NOTES)) {
      expect(getCatalogueEntry(id), `${id} is not a herb in the catalogue`).toBeDefined();
    }
  });

  /*
   * THE FIELD CARDS GET THE SAME DEPTH, and this is what says so in a way that a thin entry
   * cannot pass. Four sections on their pages were empty — Identification, Lookalikes,
   * Habitat and Sources — purely because this file had 45 entries and not 49.
   *
   * The floor is measured against the printed deck rather than typed: a literal here would
   * drift the day somebody trims a printed entry, and the claim being made is PARITY, not a
   * particular number.
   */
  it('gives every Field Card the same kind of entry a printed card gets', () => {
    const printedRows = PRINTED_CARDS.map((herb) => fieldNotesFor(herb)?.identification?.length ?? 0);
    const floor = Math.min(...printedRows);

    for (const herb of DIGITAL_ONLY_ENTRIES) {
      const notes = fieldNotesFor(herb);
      expect(notes, `no field notes for Field Card ${herb.id}`).not.toBeNull();
      expect(notes!.identification?.length ?? 0, `${herb.id} has fewer traits than the thinnest printed card`)
        .toBeGreaterThanOrEqual(floor);
      expect(notes!.habitat, `${herb.id} has no habitat sentence`).toBeTruthy();
      expect(notes!.lookalikes?.length ?? 0, `${herb.id} names no lookalike`).toBeGreaterThan(0);
    }
  });

  /*
   * A Field Card's sources are UNVERIFIED CANDIDATES sitting in docs/source-candidates.md,
   * because this environment cannot open the extension and flora pages they were written
   * against. `resolveRefs` would drop an unverified id anyway and render nothing — so an id
   * here would buy no citation while implying somebody had checked. Empty is the honest
   * state, and `sectionCitations` says so on the page.
   *
   * This fails the moment somebody adds an id without verifying it, which is the mistake
   * worth catching; a VERIFIED id is allowed through, since that is the intended end state.
   */
  it('never lets a Field Card cite a source nobody has opened', () => {
    for (const herb of DIGITAL_ONLY_ENTRIES) {
      const notes = fieldNotesFor(herb);
      for (const id of [...(notes?.sourceIds ?? []), ...(notes?.habitatSourceIds ?? [])]) {
        expect(getSource(id)?.verified, `${herb.id} cites unverified source ${id}`).toBe(true);
      }
    }
  });

  /*
   * THE PROVENANCE SENTENCE MUST NOT PROMISE A LIST THAT IS NOT THERE. It read "added here
   * from the sources listed at the foot of this page" unconditionally — correct for every
   * printed card, and false for a Field Card, whose sources are all unverified candidates so
   * `SourcesSection` renders nothing at all.
   *
   * Asserted on the NUMBER both the sentence and the section now read, and on both branches
   * being reachable: a test that only checked the Field Cards would pass against a component
   * that had simply deleted the sentence.
   */
  it('only claims a foot-of-page source list on pages that have one', () => {
    for (const herb of DIGITAL_ONLY_ENTRIES) {
      expect(pageSourceCount(herb), `${herb.id} would promise sources it does not list`).toBe(0);
    }
    const dandelion = PRINTED_CARDS.find((herb) => herb.id === 'taraxacum-officinale')!;
    expect(pageSourceCount(dandelion), 'the other branch is now unreachable').toBeGreaterThan(0);

    const view = readFileSync('src/components/herbdex/FieldNotesSections.tsx', 'utf8');
    expect(view, 'the sentence is unconditional again').not.toMatch(
      /These notes are not printed on your card\.\s*They were added here from the sources/,
    );
    expect(view).toContain('pageSourceCount(herb) > 0');
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
  const genusCards = PRINTED_CARDS.filter(isGenusCard);

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
      const herb = PRINTED_CARDS.find((candidate) => candidate.id === id)!;
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

describe('trait rows and the icons drawn beside them', () => {
  // Imports the REAL rule list, so this fails on a reordering. Restating the patterns here
  // would prove nothing: the defects were bugs of order, and a copy cannot be misordered
  // the way the original was.
  const traits = [
    ...new Set(
      Object.values(FIELD_NOTES).flatMap((notes) =>
        (notes.identification ?? []).map((row) => row.trait),
      ),
    ),
  ];

  it('never illustrates a trait with the very part it says is absent', () => {
    // "Sheaths, not leaves" (horsetail) and "Nearly leafless look" (chicory) were both
    // drawn with a leaf, contradicting the sentence beside them.
    const denials = traits.filter((trait) => /leafless|not leaves/i.test(trait));
    expect(denials.length, 'no denial traits found — has the wording changed?')
      .toBeGreaterThan(0);
    for (const trait of denials) {
      expect(iconForTrait(trait), `"${trait}" must not be given an icon`).toBeUndefined();
    }
  });

  it('reads a seed head as fruit, not as a flower', () => {
    // `head` lives in the flower pattern, so rule order is the entire fix.
    const seedHeads = traits.filter((t) => /seed/i.test(t) && /head/i.test(t));
    expect(seedHeads.length).toBeGreaterThan(0);
    for (const trait of seedHeads) {
      expect(iconForTrait(trait), `"${trait}"`).toBe('fruit');
    }
  });

  it('keeps every genuine flower head on the flower icon', () => {
    // The other half of that reordering: putting fruit first must not drag real flower
    // heads with it.
    const flowerHeads = traits.filter(
      (t) => /head|petal|umbel|catkin/i.test(t) && !/seed/i.test(t),
    );
    expect(flowerHeads.length).toBeGreaterThan(5);
    for (const trait of flowerHeads) {
      expect(iconForTrait(trait), `"${trait}"`).toBe('flower');
    }
  });

  it('gives every rooting trait the same icon', () => {
    // "Roots at the nodes" was drawn as a stem while "Creeping and rooting" was a root,
    // because `node` sits in the stem pattern.
    const rooting = traits.filter((t) => /\broot|rhizome|bulb/i.test(t));
    expect(rooting.length).toBeGreaterThan(1);
    for (const trait of rooting) {
      expect(iconForTrait(trait), `"${trait}"`).toBe('root');
    }
  });

  it('falls through to no icon rather than guessing', () => {
    // Every icon is decorative and the label says the same thing in words, so no icon is
    // always safe and a wrong one never is.
    expect(iconForTrait('Takes a trampling')).toBeUndefined();
    expect(iconForTrait('Colour varies')).toBeUndefined();
  });
});

describe('field-note citations', () => {
  it('offers identification sources to the identification section', () => {
    const dandelion = PRINTED_CARDS.find((herb) => herb.id === 'taraxacum-officinale')!;
    const sections = fieldNoteSectionSources(dandelion);
    expect(sections.identification!.length).toBeGreaterThan(0);
    expect(sections.identification!.every((ref) => typeof ref.sourceId === 'string')).toBe(true);
  });

  it('never cites the habitat sentence with an identification source', () => {
    /*
     * THIS TEST REPLACES ONE THAT ASSERTED THE OPPOSITE. The old behaviour attributed the
     * whole `sourceIds` list to habitat as well as identification — but those entries are
     * lookalike-safety references (death camas, poison hemlock, pokeweed, spotted spurge,
     * yew). Presenting a "how to tell field garlic from death camas" page as support for
     * where field garlic grows is a citation that does not say what it is cited for.
     *
     * It rendered nothing either way, because none of those ids is verified — so this was
     * a latent wrong attribution rather than a live one, and it would have gone live the
     * moment somebody verified a lookalike source. Habitat now cites `habitatSourceIds`
     * and nothing else.
     */
    for (const herb of PRINTED_CARDS) {
      const notes = FIELD_NOTES[herb.id];
      const sections = fieldNoteSectionSources(herb);
      if (!sections.habitat) continue;
      const cited = sections.habitat.map((ref) => ref.sourceId);
      expect(cited, `${herb.id}: habitat cites an identification source`).toEqual(
        notes?.habitatSourceIds ?? [],
      );
    }
  });

  it('reports habitat as awaiting a source while no habitat source is verified', () => {
    // The honest state today: every habitat sentence is curated but not independently
    // sourced, and the page says so rather than borrowing a citation.
    const withHabitatRefs = PRINTED_CARDS.filter((herb) => fieldNoteSectionSources(herb).habitat);
    expect(withHabitatRefs).toEqual([]);
  });

  it('offers nothing for a card whose notes cite nothing', () => {
    const uncited = PRINTED_CARDS.find((herb) => FIELD_NOTES[herb.id]?.sourceIds.length === 0)!;
    expect(uncited, 'expected at least one uncited card').toBeDefined();
    expect(fieldNoteSectionSources(uncited)).toEqual({});
  });

  it('never surfaces an unverified source through the citation path', () => {
    // The verified-only rule is the whole citation system. Routing field notes through
    // `sectionCitations` must not become a side door around it.
    for (const herb of PRINTED_CARDS) {
      for (const refs of Object.values(fieldNoteSectionSources(herb))) {
        for (const ref of refs) {
          const source = getSource(ref.sourceId);
          expect(source, `${herb.id} cites unknown "${ref.sourceId}"`).toBeDefined();
        }
      }
    }
    const { cited } = sectionCitations(
      fieldNoteSectionSources(PRINTED_CARDS.find((h) => h.id === 'taraxacum-officinale')!),
    );
    // Every field-note source ships verified:false today, so nothing resolves. If this
    // starts failing, sources were verified — which is good, and the wording above it
    // updates itself.
    expect(cited).toEqual([]);
  });
});
