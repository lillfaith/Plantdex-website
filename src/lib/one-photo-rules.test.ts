import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CAPTURE_CONFIG } from './observation-capture-receipt';
import { MIN_CAPTURE_PHOTOS } from './scans';

/**
 * The one-photo rule has five homes: the migration, the TypeScript contract, the edge copy, the client and the
 * receipt contract document. They were four separate edits, and each of them changing alone is a silent drift.
 * This pins them to one number from five directions.
 */
const read = (p: string) => readFileSync(p, 'utf8');
const MIGRATION = read('supabase/migrations/0016_discovery_capture_enforcement.sql');
const CONTRACT = read('docs/discoveries/discovery-receipt-contract.md');
const INDEX = read('supabase/functions/identify-plant/index.ts');
const EDGE_CAPTURE = read('supabase/functions/identify-plant/capture.ts');

describe('one in-app photograph is the mandatory minimum, and every layer says so', () => {
  it('the database default is min_images 1, max 3, no mandatory delay', () => {
    expect(MIGRATION).toMatch(/'min_images', 1,/);
    expect(MIGRATION).toMatch(/'max_images', 3/);
    expect(MIGRATION).toMatch(/'min_capture_ms', 0,/);
  });
  it('the TypeScript contract mirrors it', () => {
    expect(CAPTURE_CONFIG.minImages).toBe(1);
    expect(CAPTURE_CONFIG.maxImages).toBe(3);
    expect(CAPTURE_CONFIG.minCaptureMs).toBe(0);
  });
  it('the edge function copy and the client mirror it', () => {
    expect(EDGE_CAPTURE).toMatch(/export const MIN_CAPTURE_MS = 0;/);
    expect(MIN_CAPTURE_PHOTOS).toBe(1);
  });
  it('the handler lowers the floor for purpose=collect only', () => {
    expect(INDEX).toMatch(/purpose/);
    expect(INDEX).toMatch(/collect/);
  });
  it('the receipt contract document states the same numbers', () => {
    expect(CONTRACT).toMatch(/1\.\.3/);
    expect(CONTRACT).not.toMatch(/capture_duplicate_image/);
  });
});

describe('the consent gate is the first thing the only upload path does', () => {
  const SCANS = read('src/lib/scans.ts');
  it('no source file other than scans.ts invokes the identify-plant function', () => {
    // Warm-up (scan-warmup.ts) sends an OPTIONS request with no body; it is not an upload.
    const files = ['src/components/scan/ScanPanel.tsx', 'src/components/scan/ObservationPhotos.tsx', 'src/lib/scan-capture-session.ts', 'src/lib/scan-allowance.ts'];
    for (const f of files) expect(read(f), f).not.toMatch(/functions\.invoke\('identify-plant'|functions\/v1\/identify-plant/);
    expect(read('src/lib/scan-warmup.ts')).toMatch(/method: 'OPTIONS'/);
    expect(read('src/lib/scan-warmup.ts')).not.toMatch(/FormData|body:/);
  });
  it('mayTransmit runs before the image is prepared or the function is invoked', () => {
    const fn = SCANS.slice(SCANS.indexOf('export async function identifyPlant('));
    const gate = fn.indexOf('mayTransmit(');
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(fn.indexOf('prepareImage('));
    expect(gate).toBeLessThan(fn.indexOf("functions.invoke('identify-plant'"));
  });
});
