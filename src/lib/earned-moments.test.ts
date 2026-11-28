import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  deriveEarnedMoments,
  levelUpId,
  snapshotOf,
  type EarnedSnapshot,
} from './earned-moments';
import {
  acknowledge,
  markAnnounced,
  observeSnapshot,
  pendingEarnedMoments,
  resetEarnedMoments,
} from './earned-moments-store';
import { emptyState } from './herbdex-state';

const snap = (level: number, m: string[] = [], r: string[] = []): EarnedSnapshot => ({
  level,
  masteredIds: m,
  researchIds: r,
});
const none = new Set<string>();

describe('deriveEarnedMoments', () => {
  it('fires nothing when nothing moved', () => {
    expect(deriveEarnedMoments(snap(2, ['a'], ['t']), snap(2, ['a'], ['t']), none)).toEqual([]);
  });
  it('one level-up per crossing, and two levels at once is one moment to the final level', () => {
    const [one] = deriveEarnedMoments(snap(1), snap(2), none);
    expect(one).toEqual({ id: 'level-up:2', kind: 'level-up', fromLevel: 1, toLevel: 2 });
    const many = deriveEarnedMoments(snap(1), snap(3), none);
    expect(many).toEqual([{ id: 'level-up:3', kind: 'level-up', fromLevel: 1, toLevel: 3 }]);
  });
  it('one mastery per new id and research ids once', () => {
    const out = deriveEarnedMoments(snap(1, ['a']), snap(1, ['a', 'b'], ['t']), none);
    expect(out.map((m) => m.id)).toEqual(['mastery:b', 'research:t']);
  });
  it('drops announced ids', () => {
    const out = deriveEarnedMoments(snap(1), snap(2, ['b']), new Set([levelUpId(2)]));
    expect(out.map((m) => m.id)).toEqual(['mastery:b']);
  });
  it('a lower level fires nothing', () => {
    expect(deriveEarnedMoments(snap(3), snap(2), none)).toEqual([]);
  });
  it('snapshotOf an empty state is level 1-ish with no ids', () => {
    const s = snapshotOf(emptyState());
    expect(s.masteredIds).toEqual([]);
    expect(s.researchIds).toEqual([]);
  });
});

describe('earned moments store', () => {
  beforeEach(() => resetEarnedMoments());

  it('the first snapshot is the baseline and fires nothing', () => {
    expect(observeSnapshot('u1', snap(4, ['a'], ['t']))).toEqual([]);
    expect(pendingEarnedMoments()).toEqual([]);
  });
  it('queues real crossings oldest first and acknowledge removes and ledgers them', () => {
    observeSnapshot('u1', snap(1));
    observeSnapshot('u1', snap(2, ['a']));
    expect(pendingEarnedMoments().map((m) => m.id)).toEqual(['level-up:2', 'mastery:a']);
    acknowledge('level-up:2');
    expect(pendingEarnedMoments().map((m) => m.id)).toEqual(['mastery:a']);
  });
  it('stale or lower snapshots fire nothing and keep the baseline', () => {
    observeSnapshot('u1', snap(3, ['a']));
    expect(observeSnapshot('u1', snap(1))).toEqual([]);
    // Baseline stayed at 3/a: returning to the real state is not news.
    expect(observeSnapshot('u1', snap(3, ['a']))).toEqual([]);
    expect(pendingEarnedMoments()).toEqual([]);
  });
  it('does not queue the same id twice, nor re-fire after acknowledge', () => {
    observeSnapshot('u1', snap(1));
    observeSnapshot('u1', snap(2));
    observeSnapshot('u1', snap(2));
    expect(pendingEarnedMoments()).toHaveLength(1);
    acknowledge('level-up:2');
    expect(pendingEarnedMoments()).toEqual([]);
  });
  it('an account switch resets baseline, ledger and queue', () => {
    observeSnapshot('u1', snap(1));
    observeSnapshot('u1', snap(2));
    expect(observeSnapshot('u2', snap(5, ['z']))).toEqual([]);
    expect(pendingEarnedMoments()).toEqual([]);
    observeSnapshot('u2', snap(6));
    expect(pendingEarnedMoments().map((m) => m.id)).toEqual(['level-up:6']);
  });
  it('a discovery-caused level-up pre-announced via markAnnounced never repeats', () => {
    observeSnapshot('u1', snap(1));
    markAnnounced([levelUpId(2)]);
    expect(observeSnapshot('u1', snap(2))).toEqual([]);
    expect(pendingEarnedMoments()).toEqual([]);
  });
  it('markAnnounced removes an already-pending moment', () => {
    observeSnapshot('u1', snap(1));
    observeSnapshot('u1', snap(2));
    markAnnounced(['level-up:2']);
    expect(pendingEarnedMoments()).toEqual([]);
  });
});

describe('guards', () => {
  it.each(['earned-moments.ts', 'earned-moments-store.ts'])('%s reads no clock, randomness or storage', (file) => {
    const src = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toMatch(/Date\.now|new Date|Math\.random|localStorage|sessionStorage|indexedDB/);
  });
  it('is not in the edge shared sync list', () => {
    expect(readFileSync(new URL('../../scripts/sync-edge-shared.mjs', import.meta.url), 'utf8')).not.toContain(
      'earned-moments',
    );
  });
});
