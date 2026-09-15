import type { Herb } from './types';

/**
 * What kind of support a printed healing trait actually has.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS, AND WHY IT IS NOT A SOFTENING OF THE CARD.
 *
 * A card prints four healing traits as four equal words. Card #56 prints "Insect repellent"
 * beside "Fever aid", and those two are not the same KIND of claim: one has identified leaf
 * constituents and published laboratory bioassay work behind it, the other is ethnobotanical
 * record. Rendering them as four identical chips is accurate to the card and silently
 * levels them, which is the one thing a page about plants people take outdoors should not do.
 *
 * So the transcription is untouched — the chips still read exactly as printed — and this
 * layer sits UNDER them saying which is which. Same split the provenance chip draws between
 * card data and Plantdex field data, applied to the evidence behind a trait rather than to
 * the source of a sentence.
 *
 * LABORATORY IS NOT CLINICAL, and the vocabulary keeps them apart rather than blurring into
 * "studies show". `clinical` exists in the type and is deliberately UNUSED today: nothing in
 * this deck has human clinical evidence anybody here has verified, and a standing nobody can
 * claim is more useful present and empty than absent and assumed.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * NO CITATIONS YET, BY THE SAME RULE AS EVERYTHING ELSE. `resolveRefs()` drops anything not
 * in `sources.json` with `verified: true`, and nothing here has been opened and read in this
 * environment — candidates are parked in `docs/source-candidates.md`. The wording is
 * therefore hedged to what it can support: what has been STUDIED, never what is proven.
 */
export type EvidenceStanding = 'traditional' | 'laboratory' | 'clinical';

export const STANDING_LABEL: Record<EvidenceStanding, string> = {
  traditional: 'Traditional use',
  laboratory: 'Laboratory evidence',
  clinical: 'Clinical evidence',
};

export interface TraitEvidence {
  /** Must be a trait the card actually prints — `trait-evidence.test.ts` enforces it. */
  trait: string;
  standing: EvidenceStanding;
  detail: string;
}

export interface CardEvidence {
  /** One paragraph qualifying the whole set, rendered above the rows. */
  summary: string;
  traits: TraitEvidence[];
}

const EVIDENCE: Record<string, CardEvidence> = {
  'callicarpa-americana': {
    summary:
      'Beautyberry has a history of traditional use, and several constituents have been studied in laboratory or insect-repellent research. That does not mean every traditional use or card trait is clinically proven in people. Concentrated extracts are not equivalent to casual exposure, and the berries being eaten by wildlife says nothing about safety for humans. Confirm the species independently before preparing or using a wild plant.',
    traits: [
      {
        trait: 'Insect repellent',
        standing: 'laboratory',
        detail:
          'The leaf constituents callicarpenal and intermedeol have been isolated from this species and studied for mosquito bite-deterrent and tick-repellent activity in laboratory bioassays. Crushed leaves are also recorded as a traditional field deterrent, long before those compounds were identified.',
      },
      {
        trait: 'Antibacterial',
        standing: 'laboratory',
        detail:
          'Clerodane diterpenes isolated from the leaves have been studied for growth-inhibiting and antibiotic-resensitising activity against bacteria in laboratory work. That is constituent-level evidence in the lab, not evidence that beautyberry acts on an infection in a person.',
      },
      {
        trait: 'Fever aid',
        standing: 'traditional',
        detail:
          'Recorded in the ethnobotanical literature among traditional uses of the roots, leaves and branches. No species-specific human clinical evidence is cited here.',
      },
      {
        trait: 'Skin care',
        standing: 'traditional',
        detail:
          'General traditional and topical use. No particular supported application is claimed for it here.',
      },
    ],
  },
};

export function evidenceFor(herb: Herb): CardEvidence | null {
  return EVIDENCE[herb.id] ?? null;
}

export function cardsWithEvidence(): string[] {
  return Object.keys(EVIDENCE);
}
