import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  PRODUCTION_PROJECT_REF,
  TEST_PROJECT_REF,
  assertTestProject,
} from '../../e2e/e2e-guard';

describe('the live suites cannot touch production', () => {
  it('allows only the test project, and nothing when no URL is set', () => {
    expect(() => assertTestProject(undefined)).not.toThrow();
    expect(() => assertTestProject('')).not.toThrow();
    expect(() => assertTestProject(`https://${TEST_PROJECT_REF}.supabase.co`)).not.toThrow();
  });

  it('refuses production, any other project, a lookalike host and garbage', () => {
    expect(() => assertTestProject(`https://${PRODUCTION_PROJECT_REF}.supabase.co`)).toThrow(/PRODUCTION/);
    expect(() => assertTestProject('https://someother.supabase.co')).toThrow(/not the test project/);
    expect(() => assertTestProject(`https://${TEST_PROJECT_REF}.supabase.co.evil.example`)).toThrow();
    expect(() => assertTestProject(`https://evil.example/${TEST_PROJECT_REF}.supabase.co`)).toThrow();
    expect(() => assertTestProject('not a url')).toThrow(/valid URL/);
  });

  it('is wired into the live config as a setup file, so no suite can skip it', () => {
    const config = readFileSync('vitest.e2e.config.ts', 'utf8');
    expect(config).toContain("setupFiles: ['e2e/guard.setup.ts']");
    expect(readFileSync('e2e/guard.setup.ts', 'utf8')).toContain('assertTestProject(process.env.NEXT_PUBLIC_SUPABASE_URL)');
  });

  it('names the same refs as the setup docs and the migration workflow', () => {
    const readme = readFileSync('supabase/README.md', 'utf8');
    expect(readme).toContain(TEST_PROJECT_REF);
    expect(readme).toContain(PRODUCTION_PROJECT_REF);
    const workflow = readFileSync('.github/workflows/run-migration.yml', 'utf8');
    expect(workflow).toContain(TEST_PROJECT_REF);
    expect(workflow).toContain(PRODUCTION_PROJECT_REF);
  });
});
