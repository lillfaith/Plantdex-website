import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BoardScreen, type BoardScreenProps } from '@/components/leaderboard/BoardScreen';

/**
 * Guards for the live two-account test, which cannot run in CI because it needs credentials. It
 * must not rot silently, and it must never be pointed at production, so both are pinned from
 * source here where `npm test` does run.
 */
const E2E = readFileSync('e2e/leaderboard.e2e.test.ts', 'utf8');
const SQL = readFileSync('supabase/migrations/0011_leaderboard.sql', 'utf8');
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

describe('the live leaderboard test', () => {
  it('lists exactly the columns the SQL function returns', () => {
    const table = SQL.match(/returns table \(([\s\S]*?)\)\s*language/)![1]!;
    const columns = table
      .split('\n')
      .map((line) => line.replace(/--.*$/, '').trim().split(/\s+/)[0]!.replace(',', ''))
      .filter(Boolean)
      .sort();
    const listed = [...E2E.match(/const PUBLISHED = \[([\s\S]*?)\]\.sort\(\)/)![1]!.matchAll(/'([a-z_]+)'/g)]
      .map((match) => match[1]!)
      .sort();
    expect(listed).toEqual(columns);
  });

  it('refuses the production project outright and is skipped without credentials', () => {
    const code = strip(E2E);
    expect(code).toContain("'vygiamigomwlvnwkryyl'");
    expect(code).toMatch(/throw new Error\('e2e\/leaderboard\.e2e\.test\.ts refuses to run against the production project\.'\)/);
    expect(code).toContain('describe.skipIf(!configured)');
  });

  it('acts only as ordinary players or as nobody: no service-role key, no policy changes', () => {
    const code = strip(E2E);
    expect(code).not.toMatch(/service_role|SERVICE_ROLE|create policy|alter policy|disable row level/i);
  });

  it('covers every attack the board is designed to resist', () => {
    for (const title of [
      'opt-in',
      'joining lists only you',
      'duplicate discovery',
      'publishes exactly the documented fields',
      'restricted profile fields',
      'malformed region',
      'regional filtering',
      'opt-out',
      'signed-out caller',
    ]) {
      expect(E2E, title).toContain(title);
    }
  });
});

describe('the board screen is a well-formed page', () => {
  const props: BoardScreenProps = {
    access: 'member',
    own: { ready: true, points: 10, discoveries: 1, journalEntries: 0, challenges: 0 },
    membership: { regionId: null },
    standings: [],
    error: null,
    scope: { kind: 'global' },
    regions: [],
    busy: false,
    onScope: () => undefined,
    onJoin: () => undefined,
    onLeave: () => undefined,
    onRetry: () => undefined,
  };
  const html = (over: Partial<BoardScreenProps> = {}) =>
    renderToStaticMarkup(createElement(BoardScreen, { ...props, ...over }));

  it('has one h1 and names every section', () => {
    for (const over of [{}, { access: 'signedOut' as const }, { standings: null }, { error: 'x' }]) {
      const out = html(over);
      expect((out.match(/<h1/g) ?? []).length).toBe(1);
      const sections = out.match(/<section[^>]*>/g) ?? [];
      for (const tag of sections) expect(tag, tag).toMatch(/aria-label(ledby)?=/);
    }
  });

  it('hides decorative art from assistive technology and keeps the rank numbers readable', () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      standing: i + 1, displayName: `Mock ${i + 1}`, regionId: null, points: 100 - i, discoveryPoints: 0,
      journalPoints: 0, challengePoints: 0, discoveries: 1, journalEntries: 0, challenges: 0,
      photoBackedEntries: 0, isSelf: false, verification: 'provisional' as const,
    }));
    const out = html({ standings: rows });
    // Every pixel icon and podium sprite is decorative.
    expect(out).not.toMatch(/<span[^>]*background-image[^>]*>(?![^<]*<)(?![^>]*aria-hidden)/);
    expect(out).toContain('First place, standing');
    expect(out).toContain('aria-label="Top three"');
  });
});
