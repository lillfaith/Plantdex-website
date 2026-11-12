import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BOARD_FETCH_LIMIT,
  BOARD_PAGE_SIZE,
  beyondPodium,
  countsLine,
  friendlyBoardError,
  isFull,
  placeNote,
  podiumOf,
  remainingAfter,
  selfOf,
} from './board-view';
import type { Standing } from './remote-leaderboard';
import { BoardScreen, type BoardScreenProps } from '@/components/leaderboard/BoardScreen';

/** MOCK DATA, for tests only: these players do not exist and nothing here is served anywhere. */
const mock = (standing: number, points: number, over: Partial<Standing> = {}): Standing => ({
  standing,
  displayName: `Mock player ${standing}`,
  regionId: null,
  points,
  discoveryPoints: points,
  journalPoints: 0,
  challengePoints: 0,
  discoveries: Math.floor(points / 10),
  journalEntries: 0,
  challenges: 0,
  photoBackedEntries: 0,
  isSelf: false,
  verification: 'provisional',
  ...over,
});

const rows = (count: number): Standing[] =>
  Array.from({ length: count }, (_, i) => mock(i + 1, (count - i) * 10));

const base: BoardScreenProps = {
  access: 'member',
  own: { ready: true, points: 40, discoveries: 4, journalEntries: 0, challenges: 0 },
  membership: { regionId: null },
  standings: rows(8),
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
  renderToStaticMarkup(createElement(BoardScreen, { ...base, ...over }));

describe('podium order and ties', () => {
  it('puts first place in the middle, second left, third right', () => {
    const slots = podiumOf(rows(5));
    expect(slots.map((slot) => slot.place)).toEqual([2, 1, 3]);
    expect(slots.map((slot) => slot.row.displayName)).toEqual([
      'Mock player 2',
      'Mock player 1',
      'Mock player 3',
    ]);
  });

  it('keeps tied players on the same step and never invents a fourth', () => {
    const tied = [mock(1, 50), mock(1, 50), mock(1, 50), mock(4, 40)];
    const slots = podiumOf(tied);
    expect(slots).toHaveLength(3);
    expect(slots.every((slot) => slot.place === 1)).toBe(true);
    expect(beyondPodium(tied, 25)[0]?.standing).toBe(4);
  });

  it('shows a lone leader, or a pair, without empty steps', () => {
    expect(podiumOf(rows(1)).map((slot) => slot.place)).toEqual([1]);
    expect(podiumOf(rows(2)).map((slot) => slot.place)).toEqual([2, 1]);
    expect(podiumOf([])).toEqual([]);
  });
});

describe('pagination and the current player', () => {
  it('slices after the podium and counts what is left', () => {
    const all = rows(60);
    expect(beyondPodium(all, BOARD_PAGE_SIZE)).toHaveLength(BOARD_PAGE_SIZE);
    expect(remainingAfter(all, BOARD_PAGE_SIZE)).toBe(60 - 3 - BOARD_PAGE_SIZE);
    expect(remainingAfter(all, 500)).toBe(0);
    expect(remainingAfter(rows(3), 25)).toBe(0);
  });

  it('finds the player wherever they sit, and says so when they are not shown', () => {
    const all = rows(40);
    all[33] = { ...all[33]!, isSelf: true };
    expect(selfOf(all)?.standing).toBe(34);
    expect(placeNote(all, true, false)).toMatchObject({ kind: 'place', standing: 34 });
    expect(placeNote(rows(5), false, false)).toEqual({ kind: 'unlisted' });
    expect(placeNote(rows(5), true, false)).toEqual({ kind: 'elsewhere' });
    const full = rows(BOARD_FETCH_LIMIT);
    expect(isFull(full)).toBe(true);
    expect(placeNote(full, true, true)).toEqual({ kind: 'outside' });
  });

  it('turns database messages into sentences a player can use', () => {
    expect(friendlyBoardError('Could not find the function public.leaderboard_standings')).toMatch(
      /not switched on/i,
    );
    expect(friendlyBoardError('TypeError: Failed to fetch')).toMatch(/connection/i);
    expect(friendlyBoardError('boom')).toMatch(/try again/i);
    expect(friendlyBoardError(null)).toMatch(/try again/i);
  });

  it('describes counts without folding photographs into the score', () => {
    expect(countsLine(mock(1, 50, { discoveries: 5, journalEntries: 1 }))).toBe('5 species · 1 entry');
    expect(countsLine(mock(1, 50, { photoBackedEntries: 2 }))).toContain('2 with photo');
  });
});

describe('what the screen renders in each state', () => {
  it('always carries the provisional disclosure, which the live-site check looks for', () => {
    for (const access of ['unconfigured', 'signedOut', 'member'] as const) {
      expect(html({ access })).toContain('These scores are provisional');
    }
  });

  it('signed out: asks to sign in and offers no standings', () => {
    const out = html({ access: 'signedOut', standings: null });
    expect(out).toContain('Sign in to see the board');
    expect(out).toContain('href="/account"');
    expect(out).not.toContain('Top three');
  });

  it('accounts not configured: explains, with no sign-in link', () => {
    const out = html({ access: 'unconfigured', standings: null });
    expect(out).toContain('The board needs accounts');
    expect(out).not.toContain('href="/account"');
  });

  it('loading, empty and error states are distinct and announced', () => {
    expect(html({ standings: null })).toContain('aria-busy="true"');
    expect(html({ standings: [] })).toContain('Nobody is listed here yet.');
    const failed = html({ standings: [], error: 'Could not find the function leaderboard_standings' });
    expect(failed).toContain('role="alert"');
    expect(failed).toContain('Try again');
    expect(failed).not.toContain('leaderboard_standings');
  });

  it('shows the podium, highlights the player and pages the rest', () => {
    const all = rows(40);
    all[4] = { ...all[4]!, isSelf: true };
    const out = html({ standings: all });
    expect(out).toContain('Top three');
    expect(out).toContain('You are');
    expect(out).toContain('5th');
    expect(out).toContain('Show more (12 left)');
    // The rows beyond the first page are not in the page until asked for.
    expect(out).not.toContain('Mock player 40');
  });

  it('prints only what the standings function publishes', () => {
    const out = html({ standings: rows(6) });
    expect(out).not.toMatch(/user[_ ]?id|herb[_-]?id|email|@/i);
    // A name, a region, counts and points: never notes, photographs or places.
    expect(out).toContain('Mock player 1');
  });

  it('lets a non-member join, and a member leave', () => {
    expect(html({ membership: null })).toContain('Join the board');
    expect(html({ membership: { regionId: null } })).toContain('Leave the board');
  });
});

describe('the screen is calm, honest and mobile-safe', () => {
  const SRC = readFileSync('src/components/leaderboard/BoardScreen.tsx', 'utf8');
  const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
  const code = strip(SRC);

  it('invents no urgency, streaks or rewards', () => {
    expect(code).not.toMatch(/streak|hurry|expires|ends in|limited[- ]time|countdown|reward|prize|unlock\w* by/i);
  });

  it('keeps every control a touch target and every list within the phone column', () => {
    const buttons = code.match(/<button[\s\S]*?<\/button>/g) ?? [];
    expect(buttons.length).toBeGreaterThan(3);
    for (const button of buttons) expect(button, button).toMatch(/min-h-11|min-h-12/);
    expect(code).toContain('max-w-xl');
    expect(code).toMatch(/truncate/);
    expect(code).not.toMatch(/min-w-\[3\d/);
  });

  it('animates once and switches the animation off under reduced motion', () => {
    const css = readFileSync('src/app/globals.css', 'utf8');
    expect(code).toContain('board-rise');
    expect(css).toMatch(/@utility board-rise \{[\s\S]*?animation: rise-in 420ms ease-out both;/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.board-rise \{\s*animation: none;/);
    expect(css).not.toMatch(/board-rise[^}]*infinite/);
  });
});
