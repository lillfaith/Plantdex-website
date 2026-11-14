import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHALLENGE_BANK } from './challenge-bank';

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * THE DRAFT QUESTIONS MUST NOT SHIP. Hiding them behind a screen is not enough: a draft in a
 * JavaScript file is published, whatever the page shows. So the screens load through one dynamic
 * import behind a build-time flag, the config makes an unset flag the literal 'off' (which is
 * what lets the bundler drop the import), and a built export is searched for the questions.
 */
describe('draft Boss Form questions stay out of a production build', () => {
  it('defaults the flag to off in the config, so the bundler can drop the import', () => {
    const config = strip(readFileSync('next.config.ts', 'utf8'));
    expect(config).toMatch(/NEXT_PUBLIC_BOSS_FORMS:\s*process\.env\.NEXT_PUBLIC_BOSS_FORMS \?\? 'off'/);
  });

  it('the page reaches the experience only through the gated dynamic import', () => {
    const gate = strip(readFileSync('src/components/challenges/ChallengeGate.tsx', 'utf8'));
    expect(gate).toMatch(/process\.env\.NEXT_PUBLIC_BOSS_FORMS === 'on'/);
    expect(gate).toMatch(/import\('\.\/ChallengeExperience'\)/);
    const page = strip(readFileSync('src/app/herbdex/[herbId]/challenge/page.tsx', 'utf8'));
    expect(page).not.toMatch(/ChallengeExperience|ChallengeRunner|challenge-bank|mastery-challenges/);
  });

  it('nothing else in the app imports the question bank or the builder', () => {
    const importers: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) {
          if (/from '[^']*(challenge-bank|mastery-challenges|challenge-odds)'/.test(strip(readFileSync(path, 'utf8')))) {
            importers.push(path.replace(/\\/g, '/'));
          }
        }
      }
    };
    walk('src');
    expect(importers.sort()).toEqual(
      [
        'src/components/challenges/ChallengeExperience.tsx',
        'src/components/challenges/ChallengeRunner.tsx',
        'src/components/challenges/QuestionViews.tsx',
        'src/lib/challenge-odds.ts',
        'src/lib/mastery-challenges.ts',
      ].sort(),
    );
  });

  /**
   * Only meaningful after `next build` with the flag off. Locally it skips when there is no
   * `out/`, so a bare `npm test` still works. In CI the deploy workflow sets
   * REQUIRE_BOSS_BUNDLE=1 and runs it straight after a fresh flag-off build: then it can NOT
   * skip, and a missing build, a flag that is not 'off', or an empty scan is a failure rather
   * than a silent pass. (`npm run verify` runs tests before its build, so on a clean checkout
   * the skip is what used to happen to this guard.)
   */
  const required = process.env.REQUIRE_BOSS_BUNDLE === '1';
  it.skipIf(!required && !existsSync('out/_next'))('a built export contains no draft question text', () => {
    expect(existsSync('out/_next'), 'no fresh production build found in out/').toBe(true);
    expect(existsSync('out/index.html'), 'out/ has no index.html: not a complete export').toBe(true);
    expect(process.env.NEXT_PUBLIC_BOSS_FORMS ?? 'off', 'the build under test must have the flag off').toBe('off');
    const prompts = CHALLENGE_BANK.map((item) => item.prompt.replace(/‘|’/g, ''));
    expect(prompts.length).toBeGreaterThan(0);
    const found: string[] = [];
    let scanned = 0;
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(js|html|txt)$/.test(name)) {
          scanned += 1;
          const text = readFileSync(path, 'utf8');
          for (const prompt of prompts) if (text.includes(prompt)) found.push(`${path}: ${prompt}`);
        }
      }
    };
    walk('out');
    // A scan that read almost nothing proves nothing.
    expect(scanned).toBeGreaterThan(50);
    expect(found).toEqual([]);
  });
});
