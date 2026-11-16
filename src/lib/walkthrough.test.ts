import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  WALK_FINISH,
  WALK_STEPS,
  WALK_TOTAL,
  markWalkthroughDone,
  walkthroughDone,
} from './walkthrough';

const read = (path: string) => readFileSync(path, 'utf8');
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

const OVERLAY = read('src/components/start/AppWalkthrough.tsx');
const DATA = read('src/lib/walkthrough.ts');
const CSS = read('src/app/globals.css');

/** The source each step's selectors must be found in, so a renamed element fails a test. */
const SELECTOR_SOURCES: Record<string, string[]> = {
  scan: ['src/components/scan/ScanPanel.tsx'],
  collection: ['src/components/herbdex/HerbGrid.tsx'],
  garden: ['src/components/garden/GardenView.tsx'],
  journal: ['src/components/journal/JournalView.tsx'],
  research: ['src/components/research/ResearchView.tsx'],
  board: ['src/components/leaderboard/BoardScreen.tsx'],
  profile: ['src/components/profile/ProfileHero.tsx'],
};

/** Is the markup a selector looks for present in this source? */
function present(selector: string, haystack: string): boolean | null {
  if (selector === 'main h1') return haystack.includes('<h1');
  const attribute = selector.match(/\[([a-z-]+)="([^"]+)"\]/);
  if (attribute) {
    // A data hook may be written as an expression (`data-tour={i === 0 ? 'first-card' : undefined}`),
    // so for those the attribute name and the value (in either quote style) both have to be there.
    if (attribute[1] === 'data-tour') {
      return (
        haystack.includes('data-tour=') &&
        (haystack.includes(`'${attribute[2]}'`) || haystack.includes(`"${attribute[2]}"`))
      );
    }
    return haystack.includes(`${attribute[1]}="${attribute[2]}"`);
  }
  const id = selector.match(/^#([\w-]+)$/);
  if (id) return haystack.includes(`id="${id[1]}"`);
  const klass = selector.match(/^\.([\w-]+)$/);
  if (klass) return haystack.includes(klass[1]!);
  return null;
}

describe('the walkthrough steps', () => {
  it('cover the seven stops in order', () => {
    expect(WALK_STEPS.map((step) => step.id)).toEqual([
      'scan',
      'collection',
      'garden',
      'journal',
      'research',
      'board',
      'profile',
    ]);
    expect(WALK_TOTAL).toBe(8);
  });

  it('visit real pages', () => {
    for (const step of WALK_STEPS) {
      const page = `src/app${step.route === '/' ? '' : step.route}/page.tsx`;
      expect(existsSync(page), `${step.id}: ${page} must exist`).toBe(true);
      expect(step.route.endsWith('/') && step.route !== '/').toBe(false);
    }
  });

  it('point at markup that exists, so a renamed element fails here instead of in front of a player', () => {
    for (const step of WALK_STEPS) {
      const haystack = SELECTOR_SOURCES[step.id]!.map(read).join('\n');
      // The primary selector is the one a player is meant to see highlighted, so it must be real.
      // Fallbacks exist for a page that has not rendered it yet.
      expect(present(step.targets[0]!, haystack), `${step.id}: ${step.targets[0]} must be in the markup`).toBe(true);
      // Every selector must be one this test can verify, so none can drift unchecked.
      for (const selector of step.targets) expect(present(selector, haystack), selector).not.toBeNull();
    }
  });

  it('are short, friendly sentences and make no medical or identification promises', () => {
    for (const step of WALK_STEPS) {
      expect(step.title.length).toBeLessThanOrEqual(24);
      // Short enough to read at a glance: one line or two on a phone.
      expect(step.body.length).toBeLessThanOrEqual(70);
      expect(step.body).not.toMatch(/\b(cure|treat|heal|edible|safe to|identif(y|ies) (it )?for sure)\b/i);
    }
    // Identification is a suggestion the player confirms, never a verdict.
    expect(WALK_STEPS[0]!.body).toMatch(/suggests/);
    expect(WALK_FINISH.body.length).toBeLessThanOrEqual(50);
  });

  it('says on the Field Board step that joining is a choice and scores are self-reported', () => {
    const board = WALK_STEPS.find((step) => step.id === 'board')!;
    expect(board.body).toMatch(/choose to join/);
    expect(board.body).toMatch(/self-reported/);
  });

  it('uses static sample artwork for the Garden, which is empty ground for a new player', () => {
    expect(WALK_STEPS.find((step) => step.id === 'garden')!.sample).toBe('garden-stages');
    expect(OVERLAY).toContain('Discovered');
    expect(OVERLAY).toContain('Learned');
    expect(OVERLAY).toContain('Mastered');
    expect(OVERLAY).toMatch(/PlantSprite[^>]*frozen/);
  });
});

describe('the closing card', () => {
  it('ends on "Your adventure begins now!" with a Find My First Plant button to the scanner', () => {
    expect(WALK_FINISH.title).toBe('Your adventure begins now!');
    expect(WALK_FINISH.cta).toBe('Find My First Plant');
    expect(WALK_FINISH.href).toBe('/scan');
    expect(OVERLAY).toContain('href={WALK_FINISH.href}');
  });
});

describe('the walkthrough controls', () => {
  it('has Back, Next, Skip and a progress indicator', () => {
    expect(OVERLAY).toContain('Back');
    expect(OVERLAY).toContain('Next');
    expect(OVERLAY).toMatch(/Skip\s*<span className="sr-only"> the tour/);
    expect(OVERLAY).toContain('Step ${progress + 1} of ${WALK_TOTAL}');
    expect(OVERLAY).toContain("event.key === 'Escape'");
    expect(OVERLAY).toContain('role="dialog"');
  });

  it('navigates and scrolls to the real element, and keeps the card clear of it', () => {
    const code = strip(OVERLAY);
    expect(code).toContain('router.push(step.route)');
    expect(code).toContain('window.scrollTo');
    // The card is pinned to the bottom above the tab bar; the target is scrolled to the top.
    expect(code).toContain('bottom-[calc(4.5rem+env(safe-area-inset-bottom))]');
    expect(code).toContain('TOP_GAP');
  });

  it('keeps Shift+Tab inside the card even when focus is on the heading', () => {
    // Focus lands on the heading at every step and the heading precedes the first button, so the
    // wrap has to cover it or the keyboard escapes behind the dim layer.
    expect(strip(OVERLAY)).toMatch(/event\.shiftKey && \(document\.activeElement === first \|\| document\.activeElement === title\.current\)/);
  });

  it('does not push a player forward after they leave a step, and does not let the intro cover it', () => {
    const code = strip(OVERLAY);
    expect(code).toContain('arrived.current === index');
    expect(code).toMatch(/close\('skipped'\);\s*return;/);
    expect(code).toContain('markWelcomeSeen(scope)');
  });

  it('needs no scan and no account, and writes nothing of the collection', () => {
    for (const source of [strip(OVERLAY), strip(DATA)]) {
      expect(source).not.toMatch(/herbdex-reducer|progression|useHerbdex|discover\(|sightings|supabase/);
    }
  });
});

describe('reduced motion', () => {
  it('reads the preference for scrolling and stops the spotlight easing in CSS', () => {
    expect(OVERLAY).toContain("(prefers-reduced-motion: reduce)");
    expect(OVERLAY).toMatch(/reducedMotion\(\) \? 'auto' : 'smooth'/);
    const block = CSS.slice(CSS.indexOf("THE GUIDED WALKTHROUGH'S SPOTLIGHT"));
    expect(block).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.tour-hole \{\s*transition: none;/);
  });
});

describe('remembering that it was done', () => {
  it('starts as not done, then is kept for that account only', () => {
    expect(walkthroughDone('account-a')).toBe(false);
    markWalkthroughDone('account-a', 'finished');
    expect(walkthroughDone('account-a')).toBe(true);
    expect(walkthroughDone('account-b')).toBe(false);
  });

  it('is keyed by account, never one global flag', () => {
    expect(DATA).toContain('`${WALKTHROUGH_STORAGE_KEY}:${scope}`');
    expect(OVERLAY).toContain('user?.id ?? ANONYMOUS_SCOPE');
  });
});

describe('how the tour is reached', () => {
  const scenes = read('src/components/start/WelcomeScenes.tsx');
  const intro = read('src/components/start/WelcomeIntro.tsx');
  const layout = read('src/app/layout.tsx');
  const profile = read('src/components/profile/ProfileView.tsx');

  it('follows the intro: its last scene offers it, and closes the intro before starting it', () => {
    expect(scenes).toContain('Show me around');
    expect(scenes).toContain('onClick={onTour}');
    expect(intro).toMatch(/onTour=\{\(\) => \{\s*dismiss\(\);\s*startWalkthrough\(\);/);
    // The intro stops offering it once it has been finished or skipped.
    expect(scenes).toContain('tourDone ?');
    expect(intro).toContain('useWalkthroughDone(scope)');
  });

  it('leaves the intro itself, its first-find rewards and its scenes alone', () => {
    const ids = [...scenes.matchAll(/id: '([a-z]+)', Component/g)].map((m) => m[1]);
    expect(ids).toEqual(['welcome', 'discover', 'collect', 'garden', 'board', 'explore']);
    expect(scenes).toContain('!returning && badge && amberRing');
    expect(scenes).toContain('Your First Find');
  });

  it('is mounted once in the shell and can be replayed from the profile', () => {
    expect(layout).toContain('<AppWalkthrough />');
    expect(profile).toContain('Replay the guided tour');
    expect(profile).toContain('onClick={startWalkthrough}');
  });
});
