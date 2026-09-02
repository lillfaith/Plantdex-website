import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DIALOG_OWNING_SECTION,
  PROFILE_SECTIONS,
  PROFILE_SECTION_IDS,
  rowKey,
  sectionRows,
  sectionsFor,
  type ProfileSectionId,
} from './profile-sections';

const order = PROFILE_SECTIONS.map((section) => section.id);
const at = (id: ProfileSectionId) => order.indexOf(id);

describe('profile section order', () => {
  it('is the canonical order', () => {
    // A snapshot in code rather than a file, so a reorder shows up as a reviewable diff
    // with the reason for each move sitting next to it in PROFILE_SECTIONS.
    expect(order).toEqual([
      'healing',
      'compounds',
      'field-data',
      'identification',
      'lookalikes',
      'parts',
      'preparations',
      'habitat',
      'taste',
      'sightings',
      'mastery',
      'sources',
    ]);
  });

  it('lists every declared id exactly once', () => {
    expect([...order].sort()).toEqual([...PROFILE_SECTION_IDS].sort());
    expect(new Set(order).size).toBe(order.length);
  });

  it('gives every section a rationale', () => {
    for (const section of PROFILE_SECTIONS) {
      expect(section.rationale.length, section.id).toBeGreaterThan(20);
    }
  });

  it('keeps identification before everything it discriminates', () => {
    expect(at('identification')).toBeLessThan(at('lookalikes'));
  });

  it('keeps lookalikes above everything about using the plant', () => {
    /*
     * THE INVARIANT THAT REPLACED "lookalikes is second".
     *
     * Compounds and Healing Traits moved above Lookalikes, which is safe for one specific
     * reason: the acute hazards are not in this section. A card-printed `herb.warning` and
     * any site caution render ABOVE the whole section stack in HerbDetail, before any of
     * this order applies. What Lookalikes carries is confusion avoidance.
     *
     * Confusion avoidance has to come before PREPARATION, though — reading how a plant is
     * traditionally made into a tea before reading what it can be mistaken for is the real
     * failure mode, and it is the one this pins. Chemistry above it costs nothing; a
     * preparation above it would.
     */
    for (const useSection of ['parts', 'preparations', 'taste'] as const) {
      expect(
        at('lookalikes'),
        `lookalikes must stay above ${useSection} — never read how to use a plant before what it is confused with`,
      ).toBeLessThan(at(useSection));
    }
  });

  it('opens with the sandwich the owner asked for', () => {
    /*
     * Traditional use, chemistry, the card's own data, then how to recognise it. This
     * REPLACED an assertion that read identification=0, compounds=1, healing=2, and the
     * change of mind is the point of writing it down: the earlier arrangement led with
     * chemistry deliberately, and a later reader finding both rationales in
     * PROFILE_SECTIONS should be able to tell which one is live.
     */
    expect(at('healing')).toBe(0);
    expect(at('compounds')).toBe(1);
    expect(at('field-data')).toBe(2);
    expect(at('identification')).toBe(3);
  });

  it('keeps Signature Compounds in the top half and above preparation', () => {
    /*
     * What survived the reorder. Compounds no longer sits above Healing Traits — that was
     * the old stance and it was reversed on purpose — but it must still land in the top
     * half and above everything about preparing or tasting the plant, so the chemistry is
     * read before any instruction that depends on it.
     */
    expect(at('compounds')).toBeLessThan(at('preparations'));
    expect(at('compounds')).toBeLessThan(at('taste'));
    expect(at('compounds')).toBeLessThan(order.length / 2);
  });

  it('still never puts a use before its hazard framing', () => {
    /*
     * Healing Traits leading the page does not weaken this, because the property never came
     * from the order: `HerbDetail` renders a card-printed warning and the SafetyNotice ABOVE
     * the whole section stack, and this asserts that the component still does so rather than
     * trusting the arrangement below it.
     */
    const detail = readFileSync('src/components/herbdex/HerbDetail.tsx', 'utf8');
    /*
     * The RENDERED elements, not the identifiers. Written as `indexOf('SafetyNotice')` this
     * matched the import on line 43 and so asserted only that imports precede usage — true
     * of every file ever written. And a marker that is absent returns -1, which is less than
     * any index, so each one is required to exist before it is compared.
     */
    const at = (marker: string) => {
      const index = detail.indexOf(marker);
      expect(index, `${marker} is not in HerbDetail at all`).toBeGreaterThan(-1);
      return index;
    };
    const stack = at('sectionRows(discovered).map');
    expect(at('<CardWarning'), 'the card warning must render before the bands').toBeLessThan(stack);
    expect(at('<SafetyNotice'), 'the safety notice must render before the bands').toBeLessThan(
      stack,
    );
  });

  it('puts player progression after the botany', () => {
    expect(at('mastery')).toBeGreaterThan(at('healing'));
    expect(at('mastery')).toBeGreaterThan(at('habitat'));
  });

  it('ends on provenance', () => {
    expect(order[order.length - 1]).toBe('sources');
  });

  it('gates only the sections that describe the player', () => {
    // Everything about the PLANT shows on a revealed-but-undiscovered card; only the
    // player's own record and progression are withheld.
    const gated = PROFILE_SECTIONS.filter((section) => section.requires === 'discovered');
    expect(gated.map((section) => section.id).sort()).toEqual(['mastery', 'sightings']);
  });

  it('drops gated sections when undiscovered and restores them when discovered', () => {
    const undiscovered = sectionsFor(false).map((section) => section.id);
    const discovered = sectionsFor(true).map((section) => section.id);
    expect(undiscovered).not.toContain('mastery');
    expect(undiscovered).not.toContain('sightings');
    expect(discovered).toEqual(order);
    // Relative order of the surviving sections is unchanged by the filter.
    expect(undiscovered).toEqual(discovered.filter((id) => !['mastery', 'sightings'].includes(id)));
  });
});

describe('dialog lifecycle constraints', () => {
  /*
   * These encode the two rules that have broken this page before. They are about
   * STRUCTURE, not appearance, which is why they live beside the order rather than in a
   * browser test — a browser test can only catch the breakage after someone ships it.
   */

  it('names exactly one dialog-owning section, and it is in the order', () => {
    expect(order).toContain(DIALOG_OWNING_SECTION);
    expect(order.filter((id) => id === DIALOG_OWNING_SECTION)).toHaveLength(1);
  });

  it('keeps the dialog-owning section a plain entry, never a split pair', () => {
    // A split row wraps its children in an extra div. That is harmless for content, but
    // the dialog-owning section should stay as structurally simple as possible.
    const section = PROFILE_SECTIONS.find((entry) => entry.id === DIALOG_OWNING_SECTION)!;
    expect(section.measure).not.toBe('split');
  });

  it('renders the discovery celebration outside the ordered bands', () => {
    /*
     * The celebration dialog must live directly in HerbDetail, below the section loop —
     * discovering unmounts whichever panel triggered it, so a dialog inside the loop would
     * be torn down mid-animation. This asserts it is not reachable from the section map.
     */
    const source = readFileSync('src/components/herbdex/HerbDetail.tsx', 'utf8');
    const rendererBlock = source.slice(
      source.indexOf('const SECTION_RENDERERS'),
      source.indexOf('};', source.indexOf('const SECTION_RENDERERS')),
    );
    expect(rendererBlock).not.toContain('DiscoveryCelebration');
    expect(rendererBlock).not.toContain('dialog');
    expect(source).toContain('{celebrationDialog}');
  });

  it('keeps warnings above the discovery CTA', () => {
    // A printed warning may never be reached by scrolling past a game panel, so it must
    // appear earlier in the source than the discover panel it qualifies.
    const source = readFileSync('src/components/herbdex/HerbDetail.tsx', 'utf8');
    const warning = source.indexOf('<CardWarning');
    const caution = source.indexOf('<SiteCaution');
    const discover = source.indexOf('<DiscoverPanel');
    expect(warning).toBeGreaterThan(-1);
    expect(discover).toBeGreaterThan(-1);
    expect(warning).toBeLessThan(discover);
    expect(caution).toBeLessThan(discover);
  });

  it('renders the knowledge check unconditionally inside the mastery track', () => {
    // Only its trigger may be hidden. A conditional mount would tear down the result
    // dialog at the moment passing the check advances the stage.
    const source = readFileSync('src/components/herbdex/MasteryTrack.tsx', 'utf8');
    expect(source).toContain('<KnowledgeCheck herb={herb} showTrigger=');
    expect(source).not.toMatch(/&&\s*<KnowledgeCheck/);
  });
});

describe('section rows', () => {
  it('pairs consecutive split sections into one row', () => {
    const rows = sectionRows(true);
    const pair = rows.find((row) => row.kind === 'split')!;
    expect(pair.sections.map((section) => section.id)).toEqual(['parts', 'preparations']);
  });

  it('keeps every section, in order, across the rows', () => {
    const flattened = sectionRows(true).flatMap((row) => row.sections.map((s) => s.id));
    expect(flattened).toEqual(order);
  });

  it('gives each row a stable, unique key', () => {
    const keys = sectionRows(true).map(rowKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('parts+preparations');
  });
});
