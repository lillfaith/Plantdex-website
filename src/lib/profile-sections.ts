/**
 * THE ORDER OF A PLANT PROFILE.
 *
 * Previously this was JSX literals interleaved with width and spacing classes inside one
 * 296-line component, which made "move Signature Compounds up" a delicate edit rather than
 * a one-line one. The order, the measure each band is set at, and what each band requires
 * now live here as data; `HerbDetail` owns only the rendering.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS A HYBRID, AND WHY IT MUST STAY ONE
 *
 * Two `<dialog>` elements on this page report the result of an action that re-renders the
 * thing that triggered it, and both have broken before by being moved:
 *
 *  • The DISCOVERY CELEBRATION lives directly in `HerbDetail`, below the ordered content,
 *    because discovering swaps the locked view for the full one — a dialog owned by
 *    `DiscoverPanel` would be unmounted mid-animation by the very action it announces.
 *  • The KNOWLEDGE CHECK is rendered unconditionally by `MasteryTrack` with only its
 *    trigger hidden, because passing it advances the stage and re-renders the branch it
 *    would otherwise have been mounted inside.
 *
 * So NEITHER DIALOG IS IN THIS LIST. This list orders content bands only; the dialogs sit
 * outside it at fixed positions in the tree and are not reorderable. That is the whole
 * point of the split — a section can move without anyone having to remember the dialogs,
 * because the dialogs are not sections. `profile-sections.test.ts` pins it.
 *
 * The bands themselves are rendered from this array with a STABLE KEY per id, so React
 * reconciles by identity rather than by position. `MasteryTrack` moving down the page
 * therefore does not remount it, and the knowledge check inside it keeps its dialog.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Ids are stable: they key React nodes and are what the ordering test asserts against. */
export const PROFILE_SECTION_IDS = [
  'identification',
  'lookalikes',
  'compounds',
  'healing',
  'parts',
  'preparations',
  'habitat',
  'field-data',
  'taste',
  'sightings',
  'mastery',
  'sources',
] as const;

export type ProfileSectionId = (typeof PROFILE_SECTION_IDS)[number];

/**
 * How wide a band is set.
 *
 * Not decoration: the page this replaced was eight identical full-width rectangles, so
 * nothing on it read as more important than anything else. `reading` is a prose measure,
 * `wide` is the full canvas, `split` is a two-column pair on large screens.
 */
export type SectionMeasure = 'wide' | 'reading' | 'narrow' | 'split';

/** What has to be true before a band appears at all. */
export type SectionRequirement = 'always' | 'discovered';

export interface ProfileSection {
  id: ProfileSectionId;
  measure: SectionMeasure;
  requires: SectionRequirement;
  /** Why it sits where it sits. Read this before moving one. */
  rationale: string;
}

/**
 * The order, top to bottom.
 *
 * The shape of it: recognise the plant, understand what is in it, learn what it has been
 * used for and how, then where and when to find it, then your own record of it, then the
 * provenance for all of it.
 *
 * A band renders nothing when it has no content — `HerbDetail`'s section components each
 * return null on empty data — so this order never manufactures an empty heading to satisfy
 * itself.
 */
export const PROFILE_SECTIONS: readonly ProfileSection[] = [
  {
    id: 'identification',
    measure: 'wide',
    requires: 'always',
    rationale: 'Recognising the plant comes before anything you might do with it.',
  },
  {
    id: 'lookalikes',
    measure: 'wide',
    requires: 'always',
    rationale:
      'Immediately after identification: a discriminating character is only useful beside the thing it discriminates from.',
  },
  {
    id: 'compounds',
    measure: 'wide',
    requires: 'always',
    rationale:
      'MOVED UP from eighth of thirteen. It is the most distinctive and most credibility-carrying section on the page — 43 of 45 cards now show real skeletal formulas — and it explains what the traditional-use sections below are about. Burying it under three lists of card text wasted it.',
  },
  {
    id: 'healing',
    measure: 'reading',
    requires: 'always',
    rationale:
      'Traditional use, directly after the chemistry it is sometimes attributed to — and carrying the non-claim framing that belongs under this heading and nowhere else.',
  },
  {
    id: 'parts',
    measure: 'split',
    requires: 'always',
    rationale: 'Working with the plant: what you can use, paired with how it has been prepared.',
  },
  {
    id: 'preparations',
    measure: 'split',
    requires: 'always',
    rationale: 'The other half of the pair; sits beside Usable Parts on a wide screen.',
  },
  {
    id: 'habitat',
    measure: 'wide',
    requires: 'always',
    rationale: 'Where to look, once you know what you are looking for and why you want it.',
  },
  {
    id: 'field-data',
    measure: 'wide',
    requires: 'always',
    rationale:
      'Season, encounter rate and growing conditions — the card-printed counterpart to the habitat prose above, so the two read as one answer to "where and when".',
  },
  {
    id: 'taste',
    measure: 'reading',
    requires: 'always',
    rationale: 'Sensory detail, which is confirmation in the hand rather than a reason to go out.',
  },
  {
    id: 'sightings',
    measure: 'wide',
    requires: 'discovered',
    rationale:
      'Your own record of the plant. Only meaningful once it has been found, so it is gated on discovery.',
  },
  {
    id: 'mastery',
    measure: 'wide',
    requires: 'discovered',
    rationale:
      'MOVED DOWN from third. Progression is about the player, not the plant, so it follows the botany rather than interrupting it. OWNS THE KNOWLEDGE-CHECK DIALOG — see the header comment; it may move, but it may never be wrapped in a new conditional.',
  },
  {
    id: 'sources',
    measure: 'reading',
    requires: 'always',
    rationale: 'Provenance for everything above it, which is where a reader goes to check.',
  },
];

/** Sections to render, in order, for a given discovery state. */
export function sectionsFor(discovered: boolean): readonly ProfileSection[] {
  return PROFILE_SECTIONS.filter(
    (section) => section.requires === 'always' || discovered,
  );
}

/**
 * One row of the page: either a band on its own, or a run of `split` bands sharing a
 * two-column grid.
 *
 * Pairing is derived from ADJACENCY rather than declared, so a pair cannot be separated
 * by reordering one half of it and silently leave a half-width orphan — move `parts` away
 * from `preparations` and each simply becomes its own full row.
 */
export type SectionRow =
  | { kind: 'single'; sections: readonly [ProfileSection] }
  | { kind: 'split'; sections: readonly ProfileSection[] };

export function sectionRows(discovered: boolean): SectionRow[] {
  const rows: SectionRow[] = [];
  for (const section of sectionsFor(discovered)) {
    const last = rows[rows.length - 1];
    if (section.measure === 'split' && last?.kind === 'split') {
      rows[rows.length - 1] = { kind: 'split', sections: [...last.sections, section] };
    } else if (section.measure === 'split') {
      rows.push({ kind: 'split', sections: [section] });
    } else {
      rows.push({ kind: 'single', sections: [section] });
    }
  }
  return rows;
}

/** A stable key for a row, so React reconciles rows by identity too. */
export function rowKey(row: SectionRow): string {
  return row.sections.map((section) => section.id).join('+');
}

/**
 * The one band that owns a `<dialog>` and therefore must never be conditionally wrapped.
 *
 * Named here rather than left as folklore so the ordering test can assert it is present
 * exactly once, and so anyone reordering the list meets the constraint in code.
 */
export const DIALOG_OWNING_SECTION: ProfileSectionId = 'mastery';
