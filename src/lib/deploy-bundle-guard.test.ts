import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const wf = readFileSync('.github/workflows/deploy.yml', 'utf8');
const at = (needle: string) => {
  const i = wf.indexOf(needle);
  expect(i, `deploy.yml is missing: ${needle}`).toBeGreaterThan(-1);
  return i;
};

/**
 * The draft-question guard must run in the deploy, against a fresh flag-off build, and be unable
 * to skip. `npm test` runs before the build in that job, so without this step the guard never ran.
 */
describe('deploy workflow runs the Boss Form bundle guard', () => {
  it('cleans old output, builds with the flag pinned off, guards, and only then uploads', () => {
    const clean = at('rm -rf out .next');
    const build = at('run: npm run build');
    const guard = at('Guard - no draft Boss Form questions');
    const upload = at('actions/upload-pages-artifact');
    const deploy = at('actions/deploy-pages');
    expect(clean).toBeLessThan(build);
    expect(build).toBeLessThan(guard);
    expect(guard).toBeLessThan(upload);
    expect(upload).toBeLessThan(deploy);
  });
  it('pins the flag off in the build and the guard, never from a variable', () => {
    expect(wf.match(/NEXT_PUBLIC_BOSS_FORMS: 'off'/g)!.length).toBeGreaterThanOrEqual(2);
    expect(wf).not.toMatch(/NEXT_PUBLIC_BOSS_FORMS:\s*\$\{\{/);
  });
  it('makes the guard unable to skip and checks the report for a pass', () => {
    expect(wf).toContain("REQUIRE_BOSS_BUNDLE: '1'");
    expect(wf).toContain('--reporter=json');
    expect(wf).toContain("t.status !== 'passed'");
  });
  it('keeps the existing checks', () => {
    for (const step of ['npm run lint', 'npm run typecheck', 'npm test', 'actions/configure-pages']) {
      expect(wf).toContain(step);
    }
  });
  it('the test itself cannot skip when required', () => {
    const test = readFileSync('src/lib/boss-form-bundle.test.ts', 'utf8');
    expect(test).toContain("process.env.REQUIRE_BOSS_BUNDLE === '1'");
    expect(test).toContain('it.skipIf(!required && !existsSync');
  });
});
