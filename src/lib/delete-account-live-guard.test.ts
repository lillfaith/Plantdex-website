import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const wf = readFileSync('.github/workflows/comparison-account.yml', 'utf8');
const script = readFileSync('scripts/e2e_delete_boss_forms.mjs', 'utf8');
const job = wf.slice(wf.indexOf('  delete-account-live:'));

/**
 * The live deletion check seeds and deletes real accounts, so it must be impossible to point at
 * production. These tests pin the three places that holds: the workflow, the script, and the
 * script's own refusal at run time.
 */
describe('the account-deletion live check cannot be redirected to production', () => {
  it('has no workflow input that selects a project', () => {
    const inputs = wf.slice(wf.indexOf('inputs:'), wf.indexOf('permissions:'));
    // No input KEY selects a project (descriptions may say "TEST project").
    expect(inputs).not.toMatch(/^\s{6}project\w*:/m);
    // The project is a workflow-level constant, and the job re-checks it.
    expect(wf).toMatch(/^env:\s*\n\s+PROJECT_REF: vgjehmwcpavflbfhbbrp/m);
    expect(job).not.toMatch(/inputs\.project_ref/);
    expect(job).toContain('Hard-scoped to the TEST project');
  });
  it('builds every URL from the test ref constant, never from an argument or the environment', () => {
    expect(script).toContain("const TEST_REF = 'vgjehmwcpavflbfhbbrp'");
    expect(script).toMatch(/const BASE = `https:\/\/\$\{TEST_REF\}\.supabase\.co`/);
    expect(script).toMatch(/const MGMT = `https:\/\/api\.supabase\.com\/v1\/projects\/\$\{TEST_REF\}`/);
    // REF (from the environment) is only ever compared and named in the refusal message, never part of a URL.
    const lines = script.split('\n').filter((l) => l.includes('${REF}'));
    for (const l of lines) expect(l, l).not.toMatch(/https?:|fetch\(/);
  });
  it('refuses to start for production or any other ref, before any network call', () => {
    for (const ref of ['vygiamigomwlvnwkryyl', 'someotherproject', '']) {
      const r = spawnSync('node', ['scripts/e2e_delete_boss_forms.mjs'], {
        env: { PATH: process.env.PATH ?? '', PROJECT_REF: ref, SUPABASE_ACCESS_TOKEN: 'sentinel-token-value' },
        encoding: 'utf8',
        timeout: 15_000,
      });
      expect(r.status, `ref '${ref}'`).toBe(2);
      expect(r.stderr).toContain('Refusing to run');
      expect(r.stdout + r.stderr).not.toContain('sentinel-token-value');
    }
  });
  it('the sweep refuses the same way', () => {
    const r = spawnSync('node', ['scripts/e2e_delete_boss_forms.mjs', '--sweep'], {
      env: { PATH: process.env.PATH ?? '', PROJECT_REF: 'vygiamigomwlvnwkryyl', SUPABASE_ACCESS_TOKEN: 'x' },
      encoding: 'utf8',
      timeout: 15_000,
    });
    expect(r.status).toBe(2);
  });
});

describe('the account-deletion live check handles its token and its leftovers', () => {
  it('passes the token only to the two steps that run the script', () => {
    const uses = job.match(/SUPABASE_ACCESS_TOKEN: \$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}/g) ?? [];
    expect(uses).toHaveLength(2);
  });
  it('redacts the token from every line it prints and checks the whole output for it', () => {
    expect(script).toContain('const redact = (s) => String(s).split(TOKEN).join');
    expect(script).toContain('captured.some((l) => l.includes(TOKEN))');
    expect(script).not.toMatch(/console\.log\([^)]*TOKEN/);
  });
  it('removes every account it created in a finally, and sweeps again whatever happened', () => {
    expect(script).toMatch(/\} finally \{\s*\n\s*const failures = await cleanup\(\)/);
    expect(job).toMatch(/Sweep any leftover disposable accounts\s*\n\s+if: always\(\)/);
  });
  it('compares the bystander column by column, not by count', () => {
    expect(script).toContain('select * from public.${table} where user_id');
    expect(script).toContain('JSON.stringify(bystanderAfter) === JSON.stringify(bystanderBefore)');
  });
});
