import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * The atomic confirm path (migration 0014) is OFF until the owner approves it. An unset flag must
 * be the literal 'off' at build time so the bundler removes the branch, and no workflow or
 * environment file may switch it on.
 */
describe('confirm_scan RPC flag stays off', () => {
  it('defaults to off in the config', () => {
    const config = strip(readFileSync('next.config.ts', 'utf8'));
    expect(config).toMatch(/NEXT_PUBLIC_CONFIRM_SCAN_RPC:\s*process\.env\.NEXT_PUBLIC_CONFIRM_SCAN_RPC \?\? 'off'/);
  });

  it('is only ever compared against the exact string on', () => {
    const scans = strip(readFileSync('src/lib/scans.ts', 'utf8'));
    expect(scans).toMatch(/process\.env\.NEXT_PUBLIC_CONFIRM_SCAN_RPC === 'on'/);
  });

  it('is not enabled by any workflow', () => {
    for (const f of ['deploy.yml', 'pr-verify.yml']) {
      expect(readFileSync(`.github/workflows/${f}`, 'utf8')).not.toMatch(/CONFIRM_SCAN_RPC/);
    }
  });

  it.each(['NEXT_PUBLIC_CAMERA_CAPTURE', 'NEXT_PUBLIC_MULTI_REGION'])('%s defaults to off in the config and no workflow sets it', (name) => {
    const config = strip(readFileSync('next.config.ts', 'utf8'));
    expect(config).toContain(`${name}: process.env.${name} ?? 'off'`);
    for (const f of ['deploy.yml', 'pr-verify.yml', 'live-confirm-scan.yml']) {
      expect(readFileSync(`.github/workflows/${f}`, 'utf8')).not.toContain(name);
    }
  });
});
