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
  'habitat',
  'field-data',
  'healing',
  'compounds',
  'parts',
  'preparations',
  'taste',
  'sources',
  'mastery',
  'sightings',
] as const;

export type ProfileSectionId = (typeof PROFILE_SECTION_IDS)[number];

/**
 * THE FOUR TABS OF THE EXPANDED PROFILE, in the order they appear, owner-approved. Field
 * Identification is first and is the selected tab by default; it supersedes the earlier
 * "traditional use first" sandwich. `hash` is the native anchor that opens the tab, so the
 * Learn library and the card view can deep-link to it with no extra route.
 */
export const PROFILE_TABS = [
  { id: 'field-identification', label: 'Field Identification' },
  { id: 'herbal-knowledge', label: 'Herbal Knowledge' },
  { id: 'mastery-challenges', label: 'Mastery Challenges' },
  { id: 'your-progress', label: 'Your Progress' },
] as const;
export type ProfileTabId = (typeof PROFILE_TABS)[number]['id'];

/**
 * How wide a band is set.
 *
 * Not decoration: the page this replaced was eight identical full-width rectangles, so
 * nothing on it read as more important than anything else. `reading` is a prose measure,
 * `wide` is the full canvas, `split` is a two-column pair on large screens.
 */
export type SectionMeasure = 'wide' | 'reading' | 'narrow' | 'split';

/**
 * What a viewer needs before a band appears.
 *   always      anybody, found or not: identification, lookalikes, habitat, season, sources.
 *   readable    the card's own content (traditional uses, compounds, preparations ...), which
 *               opens on discovery, a reveal or an XP unlock. Safety is never in this tier.
 *   discovered  the player's own record and progression.
 */
export type SectionRequirement = 'always' | 'readable' | 'discovered';

/** How much of the profile this viewer has unlocked. */
export type ProfileAccess = 'locked' | 'readable' | 'discovered';

export interface ProfileSection {
  id: ProfileSectionId;
  tab: ProfileTabId;
  measure: SectionMeasure;
  requires: SectionRequirement;
  /** Why it sits where it sits. Read this before moving one. */
  rationale: string;
}

/**
 * The order, top to bottom within the whole profile, which is also tab order then position
 * within the tab. Safety-critical identification information is `always` and sits in the
 * first tab: discovery unlocks personal progress and rewards, never basic safety.
 */
export const PROFILE_SECTIONS: readonly ProfileSection[] = [
  {
    id: 'identification',
    tab: 'field-identification',
    measure: 'wide',
    requires: 'always',
    rationale: 'First and most prominent: how to recognise the plant, visible to everybody.',
  },
  {
    id: 'lookalikes',
    tab: 'field-identification',
    measure: 'wide',
    requires: 'always',
    rationale: 'Straight after identification: confusion avoidance is safety information.',
  },
  {
    id: 'habitat',
    tab: 'field-identification',
    measure: 'wide',
    requires: 'always',
    rationale: 'Where to look, which is part of recognising a plant in the field.',
  },
  {
    id: 'field-data',
    tab: 'field-identification',
    measure: 'wide',
    requires: 'always',
    rationale: 'The card-printed season, sun, temperature and encounter figures, as seasonality.',
  },
  {
    id: 'healing',
    tab: 'herbal-knowledge',
    measure: 'reading',
    requires: 'readable',
    rationale:
      'Traditional use, with the non-claim framing that belongs under this heading and nowhere else.',
  },
  {
    id: 'compounds',
    tab: 'herbal-knowledge',
    measure: 'wide',
    requires: 'readable',
    rationale: 'The chemistry the traditional uses are sometimes credited to, directly beneath them.',
  },
  {
    id: 'parts',
    tab: 'herbal-knowledge',
    measure: 'split',
    requires: 'readable',
    rationale: 'Working with the plant: what you can use, paired with how it has been prepared.',
  },
  {
    id: 'preparations',
    tab: 'herbal-knowledge',
    measure: 'split',
    requires: 'readable',
    rationale: 'The other half of the pair; sits beside Usable Parts on a wide screen.',
  },
  {
    id: 'taste',
    tab: 'herbal-knowledge',
    measure: 'reading',
    requires: 'readable',
    rationale: 'Sensory detail, which is confirmation in the hand rather than a reason to go out.',
  },
  {
    id: 'sources',
    tab: 'herbal-knowledge',
    measure: 'reading',
    requires: 'always',
    rationale: 'Provenance for the profile, which is where a reader goes to check.',
  },
  {
    id: 'mastery',
    tab: 'mastery-challenges',
    measure: 'wide',
    requires: 'discovered',
    rationale:
      'OWNS THE KNOWLEDGE-CHECK DIALOG. Progression is about the player, so it follows the botany. Its panel stays mounted when another tab is selected, so the dialog never remounts.',
  },
  {
    id: 'sightings',
    tab: 'your-progress',
    measure: 'wide',
    requires: 'discovered',
    rationale: 'Your own record of the plant. Only meaningful once it has been found.',
  },
];

const RANK: Record<ProfileAccess, number> = { locked: 0, readable: 1, discovered: 2 };
const NEEDS: Record<SectionRequirement, ProfileAccess> = {
  always: 'locked',
  readable: 'readable',
  discovered: 'discovered',
};

/** The sections this viewer may see, in order. */
export function sectionsFor(access: ProfileAccess): readonly ProfileSection[] {
  return PROFILE_SECTIONS.filter((section) => RANK[access] >= RANK[NEEDS[section.requires]]);
}

/** Every section a viewer is still waiting to unlock, for the tab's placeholder. */
export function lockedSectionsFor(access: ProfileAccess): readonly ProfileSection[] {
  return PROFILE_SECTIONS.filter((section) => RANK[access] < RANK[NEEDS[section.requires]]);
}

export type SectionRow =
  | { kind: 'single'; sections: readonly [ProfileSection] }
  | { kind: 'split'; sections: readonly ProfileSection[] };

export function sectionRows(access: ProfileAccess, tab?: ProfileTabId): SectionRow[] {
  const rows: SectionRow[] = [];
  for (const section of sectionsFor(access)) {
    if (tab && section.tab !== tab) continue;
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

export function rowKey(row: SectionRow): string {
  return row.sections.map((section) => section.id).join('+');
}

export const DIALOG_OWNING_SECTION: ProfileSectionId = 'mastery';
