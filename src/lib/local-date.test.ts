import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { localDateKey } from './research';

/**
 * WHAT DAY IT IS, WHERE THE PLAYER IS.
 *
 * A calendar day is a local fact. `new Date().toISOString().slice(0, 10)` is a UTC one, and
 * the two disagree for most of the planet for several hours out of every day — so it is the
 * kind of mistake that passes every test written in the wrong timezone and then only shows
 * up in the evening, or only in Asia.
 *
 * THE BUG THIS CATCHES, reproduced in a browser in two timezones before it was fixed: the
 * "Log sighting" form took its default date and its `max` from the UTC day. In New York at
 * 23:30 it pre-filled TOMORROW and accepted it; in Tokyo at 02:00 both were YESTERDAY, so
 * today was not selectable at all.
 */

const original = process.env.TZ;
afterAll(() => {
  process.env.TZ = original;
});

describe('localDateKey', () => {
  it('is the day where the player is, not the day in Greenwich', () => {
    // 17:00 UTC is already tomorrow in Tokyo; 03:30 UTC is still yesterday in New York.
    process.env.TZ = 'Asia/Tokyo';
    expect(localDateKey(new Date('2026-09-02T17:00:00Z'))).toBe('2026-09-03');
    process.env.TZ = 'America/New_York';
    expect(localDateKey(new Date('2026-09-03T03:30:00Z'))).toBe('2026-09-02');
  });

  it('pads to a sortable YYYY-MM-DD', () => {
    process.env.TZ = 'UTC';
    expect(localDateKey(new Date('2026-01-05T12:00:00Z'))).toBe('2026-01-05');
  });
});

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(path);
  }
  return out;
}

describe('nothing else derives a calendar day from UTC', () => {
  it('never slices a date out of an ISO string', () => {
    // Full ISO timestamps are fine and used everywhere — `createdAt`, `discoveredAt`. It is
    // TRUNCATING one to a date that silently changes which day it names.
    // Comments stripped, the same way `profile-surfaces.test.ts` strips them: the fix for
    // this bug QUOTES the line it replaced, and a guard that reads its own explanation as a
    // violation is a guard nobody can write a comment near.
    const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    const offenders: string[] = [];
    for (const root of ['src/lib', 'src/components', 'src/app', 'src/state']) {
      for (const file of sourceFiles(root)) {
        const source = stripComments(readFileSync(file, 'utf8'));
        if (/toISOString\(\)\s*\.\s*slice\(\s*0\s*,\s*10\s*\)/.test(source)) offenders.push(file);
        if (/toISOString\(\)\s*\.\s*split\(\s*'T'\s*\)\s*\[\s*0\s*\]/.test(source)) offenders.push(file);
      }
    }
    expect(
      offenders,
      `these name a calendar day in UTC instead of the player's own: ${offenders.join(', ')}`,
    ).toEqual([]);
  });
});
