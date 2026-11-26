import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FILE = '.github/workflows/live-confirm-scan.yml';
const text = readFileSync(FILE, 'utf8');
const code = text.replace(/^\s*#.*$/gm, '');

/**
 * The live confirm_scan workflow may run on a push to `integration`, narrowly and temporarily, because a
 * dispatch-only workflow is not listed until its file reaches the production branch. Every property that makes
 * that safe is pinned here, and each assertion also holds once the temporary trigger is removed.
 */
describe('live confirm_scan workflow stays TEST-only and narrow', () => {
  it('never uses pull_request_target or pull_request', () => {
    expect(code).not.toMatch(/pull_request_target|pull_request\b/);
  });

  it('if it triggers on push, only on integration and only when its own file changes', () => {
    const push = code.match(/^\s{2}push:\s*\n([\s\S]*?)(?=^\s{2}\S)/m);
    if (!push) return; // trigger removed: dispatch only, which is the resting state
    const block = push[1] ?? '';
    expect(block).toMatch(/branches:\s*\[integration\]/);
    expect(block).toMatch(/paths:\s*\n\s*-\s*\.github\/workflows\/live-confirm-scan\.yml\s*$/m);
    expect((block.match(/^\s{6}-\s/gm) ?? []).length).toBe(1);
  });

  it('targets the TEST project literal and never the production ref', () => {
    expect(code).toContain('PROJECT_REF: vgjehmwcpavflbfhbbrp');
    expect(code).not.toContain('vygiamigomwlvnwkryyl');
  });

  it('reads no secret at all, only the public TEST anon key variable, with a read-only GITHUB_TOKEN', () => {
    expect(code).not.toMatch(/secrets\./);
    const vars = [...code.matchAll(/vars\.([A-Z_]+)/g)].map((m) => m[1]);
    expect([...new Set(vars)]).toEqual(['TEST_SUPABASE_ANON_KEY']);
    expect(code).toMatch(/permissions:\s*\n\s*contents: read/);
  });

  it('deploys, migrates and flips nothing', () => {
    expect(code).not.toMatch(/functions deploy|database\/query|CONFIRM_SCAN_RPC|supabase-production|pages/i);
  });
});
