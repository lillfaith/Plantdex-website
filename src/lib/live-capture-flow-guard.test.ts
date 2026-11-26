import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const text = readFileSync('.github/workflows/live-capture-flow.yml', 'utf8');
const code = text.replace(/^\s*#.*$/gm, '');
const spec = readFileSync('e2e/capture-flow.e2e.test.ts', 'utf8');

describe('the live camera-to-collection workflow stays TEST-only, secret-free and manual', () => {
  it('is dispatch-only: no push, pull_request or schedule trigger', () => {
    expect(code).toMatch(/on:\s*\n\s*workflow_dispatch:/);
    expect(code).not.toMatch(/^\s{2}(push|pull_request|pull_request_target|schedule):/m);
  });
  it('targets the TEST project literal and never production', () => {
    expect(code).toContain('PROJECT_REF: vgjehmwcpavflbfhbbrp');
    expect(code).not.toContain('vygiamigomwlvnwkryyl');
  });
  it('reads no secret, only the public TEST anon key variable, and is read-only', () => {
    expect(code).not.toMatch(/secrets\./);
    expect([...new Set([...code.matchAll(/vars\.([A-Z_]+)/g)].map((m) => m[1]))]).toEqual(['TEST_SUPABASE_ANON_KEY']);
    expect(code).toMatch(/permissions:\s*\n\s*contents: read/);
  });
  it('deploys, migrates and flips nothing', () => {
    expect(code).not.toMatch(/functions deploy|database\/query|supabase-production|set_discovery_enforcement/i);
  });
  it('runs only the capture-flow suite', () => {
    expect(code).toContain('e2e/capture-flow.e2e.test.ts');
    expect(code).not.toContain('e2e/supabase.e2e.test.ts');
  });
});

describe('the live suite itself', () => {
  it('refuses any project but TEST and skips without credentials', () => {
    expect(spec).toContain("const TEST_REF = 'vgjehmwcpavflbfhbbrp'");
    expect(spec).toMatch(/describe\.skipIf\(!configured\)/);
  });
  it('mocks no backend: it uses the real client, the real RPCs and the deployed function', () => {
    expect(spec).not.toMatch(/vi\.mock|vi\.fn|nock|msw/);
    expect(spec).toContain("functions.invoke('identify-plant'");
    expect(spec).toContain("rpc('open_capture_session')");
    expect(spec).toContain("rpc('claim_discovery'");
  });
  it('never carries a service-role key', () => {
    expect(spec).not.toMatch(/SERVICE_ROLE|service_role_key|sb_secret_/i);
  });
});
