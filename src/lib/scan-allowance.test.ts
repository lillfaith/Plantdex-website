import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ANON_DAILY_SCANS,
  SIGNED_IN_DAILY_SCANS,
  dailyLimitFor,
  readAllowance,
  scanDay,
  writeAllowance,
} from './scan-allowance';

const memory = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
};

describe('the daily scan allowance', () => {
  it('shows ten for everybody and matches the server constants', () => {
    expect(SIGNED_IN_DAILY_SCANS).toBe(10);
    expect(ANON_DAILY_SCANS).toBe(10);
    const fn = readFileSync('supabase/functions/identify-plant/index.ts', 'utf8');
    expect(fn).toMatch(/const USER_DAILY_LIMIT = 10;/);
    expect(fn).toMatch(new RegExp(`const ANON_DAILY_LIMIT = ${ANON_DAILY_SCANS};`));
    expect(dailyLimitFor(true)).toBe(SIGNED_IN_DAILY_SCANS);
    expect(dailyLimitFor(false)).toBe(ANON_DAILY_SCANS);
  });

  it('starts full, follows the server answer, and resets on a new UTC day', () => {
    const storage = memory();
    const monday = new Date('2026-11-09T12:00:00Z');
    expect(readAllowance('u1', true, monday, storage)).toEqual({ limit: 10, left: 10, used: 0 });
    writeAllowance('u1', 7, 10, monday, storage);
    expect(readAllowance('u1', true, monday, storage)).toEqual({ limit: 10, left: 7, used: 3 });
    expect(readAllowance('u2', true, monday, storage).left).toBe(10);
    const tuesday = new Date('2026-11-10T00:00:01Z');
    expect(scanDay(tuesday)).not.toBe(scanDay(monday));
    expect(readAllowance('u1', true, tuesday, storage).left).toBe(10);
  });

  it('never reads below zero and ignores a corrupt record', () => {
    const storage = memory();
    const now = new Date('2026-11-09T12:00:00Z');
    writeAllowance('u1', -4, 10, now, storage);
    expect(readAllowance('u1', true, now, storage).left).toBe(0);
    storage.setItem('plantdex.scan-allowance.v1:u3', '{not json');
    expect(readAllowance('u3', true, now, storage).left).toBe(10);
  });
});
