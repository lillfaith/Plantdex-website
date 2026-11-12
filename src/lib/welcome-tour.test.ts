import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TOUR_EVENT } from './welcome-tour';

const WELCOME = readFileSync('src/components/start/WelcomeIntro.tsx', 'utf8');
const TOUR = readFileSync('src/lib/welcome-tour.ts', 'utf8');
const BUTTON = readFileSync('src/components/start/TakeTourButton.tsx', 'utf8');
const SCENES = readFileSync('src/components/start/WelcomeScenes.tsx', 'utf8');
const HOME = readFileSync('src/app/page.tsx', 'utf8');
const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('Take the tour', () => {
  it('opens through one event the dialog listens for', () => {
    expect(TOUR_EVENT).toBe('plantdex:take-the-tour');
    expect(WELCOME).toContain('addEventListener(TOUR_EVENT');
    expect(BUTTON).toContain('openTour');
  });

  it('touches no flag, so existing players are never reset', () => {
    const code = strip(TOUR) + strip(BUTTON);
    expect(code).not.toMatch(/localStorage|markWelcomeSeen|clearWelcomeState|WELCOME_STORAGE_KEY/);
  });

  it('keeps the storage key unchanged, so no player is re-onboarded', () => {
    expect(readFileSync('src/lib/first-run.ts', 'utf8')).toContain("'plantdex.welcome.v1'");
  });

  it('is offered on the homepage', () => {
    expect(HOME).toContain('<TakeTourButton');
  });

  it('shows a returning player a different last scene, without the first-find rewards', () => {
    expect(SCENES).toMatch(/returning \? 'Find something new'/);
    expect(SCENES).toMatch(/!returning && badge && amberRing/);
  });
});

describe('the tour is skippable and accessible', () => {
  it('has a progress list that names the step', () => {
    expect(WELCOME).toMatch(/aria-label=\{`Step \$\{index \+ 1\} of \$\{SCENES\.length\}`\}/);
    expect(WELCOME).toContain("aria-current={position === index ? 'step'");
  });

  it('moves focus to the new scene heading and starts on the primary button', () => {
    expect(WELCOME).toContain("querySelector<HTMLElement>('#welcome-title')");
    expect(readFileSync('src/components/start/WelcomeScenes.tsx', 'utf8')).toContain('autoFocus');
  });

  it('lets the scene area shrink instead of pushing the footer off a small screen', () => {
    const css = readFileSync('src/app/globals.css', 'utf8');
    expect(css).toMatch(/@utility welcome-scene \{[\s\S]*?min-height: 0;/);
  });
});

describe('the Collect and Garden scenes', () => {
  const code = strip(SCENES);
  it('are part of the tour, in order', () => {
    const ids = [...SCENES.matchAll(/id: '([a-z]+)', Component/g)].map((m) => m[1]);
    expect(ids).toEqual(['welcome', 'discover', 'collect', 'garden', 'explore']);
  });

  it('flip a picture only: no store, reducer or writer is reachable from the scenes', () => {
    expect(code).not.toMatch(/herbdex-store|herbdex-reducer|reveals|useHerbdex|discover\(/);
    expect(code).toContain('aria-pressed={flipped}');
  });

  it('draw the garden from the real growth stages', () => {
    for (const stage of ["'sprout'", "'growing'", "'flowering'"]) expect(code).toContain(stage);
  });
});

describe('a tall slide can be scrolled to its top', () => {
  it('does not centre the scroll container, which hides overflow above the top edge', () => {
    const css = readFileSync('src/app/globals.css', 'utf8');
    const block = css.match(/@utility welcome-scene \{[\s\S]*?\n\}/)![0];
    const code = block.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(/justify-content:\s*center/);
    expect(code).toMatch(/justify-content:\s*flex-start/);
    expect(code).toMatch(/& > \* \{\s*margin-block:\s*auto;/);
    expect(code).toMatch(/overflow-y:\s*auto/);
  });
});
