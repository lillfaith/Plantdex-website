import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DIALOG_OWNING_SECTION,
  PROFILE_SECTIONS,
  PROFILE_TABS,
  lockedSectionsFor,
  PROFILE_SECTION_IDS,
  rowKey,
  sectionRows,
  sectionsFor,
  type ProfileSectionId,
} from './profile-sections';

const order = PROFILE_SECTIONS.map((section) => section.id);
const at = (id: ProfileSectionId) => order.indexOf(id);

describe('profile structure (four tabs, Field Identification first)', () => {
  it('has the four approved tabs in order, and Field Identification is first', () => {
    expect(PROFILE_TABS.map((tab) => tab.id)).toEqual([
      'field-identification',
      'herbal-knowledge',
      'mastery-challenges',
      'your-progress',
    ]);
    expect(PROFILE_TABS.map((tab) => tab.label)).toEqual([
      'Field Identification',
      'Herbal Knowledge',
      'Mastery Challenges',
      'Your Progress',
    ]);
  });

  it('is the canonical order: tab by tab, identification first', () => {
    expect(order).toEqual([
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
    ]);
  });

  it('lists every declared id exactly once, each with a rationale and a real tab', () => {
    expect([...order].sort()).toEqual([...PROFILE_SECTION_IDS].sort());
    expect(new Set(order).size).toBe(order.length);
    const tabs = PROFILE_TABS.map((tab) => tab.id) as string[];
    for (const section of PROFILE_SECTIONS) {
      expect(section.rationale.length, section.id).toBeGreaterThan(20);
      expect(tabs, section.id).toContain(section.tab);
    }
  });

  it('keeps sections grouped by tab, in tab order', () => {
    const tabOrder = PROFILE_SECTIONS.map((section) => section.tab);
    const sorted = [...tabOrder].sort(
      (x, y) => PROFILE_TABS.findIndex((t) => t.id === x) - PROFILE_TABS.findIndex((t) => t.id === y),
    );
    expect(tabOrder).toEqual(sorted);
  });

  it('keeps identification before the lookalikes it discriminates, and both before any use', () => {
    expect(at('identification')).toBeLessThan(at('lookalikes'));
    for (const useSection of ['parts', 'preparations', 'taste'] as const) {
      expect(at('lookalikes'), useSection).toBeLessThan(at(useSection));
    }
  });
});

describe('what is open before discovery', () => {
  const ids = (access: 'locked' | 'readable' | 'discovered') =>
    sectionsFor(access).map((section) => section.id);

  it('shows identification, lookalikes, habitat, season and sources to everybody', () => {
    for (const id of ['identification', 'lookalikes', 'habitat', 'field-data', 'sources'] as const) {
      expect(ids('locked'), id).toContain(id);
    }
  });

  it('keeps the card back content and progression locked until discovery', () => {
    for (const id of ['healing', 'compounds', 'parts', 'preparations', 'taste', 'mastery', 'sightings'] as const) {
      expect(ids('locked'), id).not.toContain(id);
    }
  });

  it('opens the card back content on a reveal or XP unlock, but not progression', () => {
    expect(ids('readable')).toContain('healing');
    expect(ids('readable')).not.toContain('mastery');
    expect(ids('readable')).not.toContain('sightings');
  });

  it('shows everything once discovered, in the canonical order', () => {
    expect(ids('discovered')).toEqual(order);
    const locked = ids('locked');
    expect(locked).toEqual(ids('discovered').filter((id) => locked.includes(id)));
  });

  it('never gates an identification, lookalike or habitat section behind collection progress', () => {
    for (const section of PROFILE_SECTIONS) {
      if (section.tab === 'field-identification') expect(section.requires, section.id).toBe('always');
    }
  });

  it('lists what a viewer is still waiting for', () => {
    expect(lockedSectionsFor('locked').map((s) => s.id)).toContain('healing');
    expect(lockedSectionsFor('discovered')).toEqual([]);
  });
});

describe('HerbDetail renders the profile as tabs, after the warnings', () => {
  const detail = readFileSync('src/components/herbdex/HerbDetail.tsx', 'utf8');
  const marker = (text: string) => {
    const index = detail.indexOf(text);
    expect(index, `${text} is not in HerbDetail`).toBeGreaterThan(-1);
    return index;
  };
  it('puts the card warning before the tabs', () => {
    // The readable branch's tabs are the LAST occurrence; the locked branch has its own.
    expect(marker('<CardWarning')).toBeLessThan(detail.lastIndexOf('<ProfileTabs'));
  });
  it('shows the tabs to an undiscovered viewer too', () => {
    expect(detail).toContain('<ProfileTabs herb={herb} access="locked" />');
  });
  it('keeps both dialogs outside the tabs', () => {
    expect(detail).toContain('{celebrationDialog}');
    expect(detail).toContain('{masteryDialog}');
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
    const tabs = readFileSync('src/components/herbdex/ProfileTabs.tsx', 'utf8');
    const rendererBlock = tabs.slice(
      tabs.indexOf('const RENDERERS'),
      tabs.indexOf('};', tabs.indexOf('const RENDERERS')),
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
    const rows = sectionRows('discovered');
    const pair = rows.find((row) => row.kind === 'split')!;
    expect(pair.sections.map((section) => section.id)).toEqual(['parts', 'preparations']);
  });

  it('keeps every section, in order, across the rows', () => {
    const flattened = sectionRows('discovered').flatMap((row) => row.sections.map((s) => s.id));
    expect(flattened).toEqual(order);
  });

  it('gives each row a stable, unique key', () => {
    const keys = sectionRows('discovered').map(rowKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('parts+preparations');
  });
});

describe('tabs keep every panel mounted', () => {
  const tabs = readFileSync('src/components/herbdex/ProfileTabs.tsx', 'utf8');
  it('hides inactive panels instead of unmounting them, so the knowledge-check dialog survives', () => {
    expect(tabs).toContain('hidden={tab.id !== active}');
    expect(tabs).not.toMatch(/active === tab\.id\s*&&/);
  });
  it('selects Field Identification by default and opens a tab from the hash', () => {
    expect(tabs).toContain("useState<ProfileTabId>('field-identification')");
    expect(tabs).toContain("addEventListener('hashchange'");
  });
});
