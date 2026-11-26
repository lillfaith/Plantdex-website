import { describe, expect, it, vi } from 'vitest';

import { emptyState } from './herbdex-state';

/**
 * WRITE ORDER: a `discoveries` row lands before the `learned` row that depends on it.
 *
 * Migration 0016 (draft; its switch is OFF) refuses a `learned` or `mastered` insert for a card the
 * player has no `discoveries` row for. A browser that upserts the two tables in parallel can lose that
 * race, so the adapter sequences them. This test holds the discoveries request in flight and shows the
 * learned request has not been issued yet.
 */

const log = vi.hoisted(() => ({ events: [] as string[], releaseDiscoveries: null as null | (() => void) }));

vi.mock('./supabase-client', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({ eq: async () => ({ data: [], error: null }) }),
      upsert: async () => {
        log.events.push(`start:${table}`);
        if (table === 'discoveries') {
          await new Promise<void>((resolve) => {
            log.releaseDiscoveries = resolve;
          });
        }
        log.events.push(`end:${table}`);
        return { error: null };
      },
    }),
    functions: { invoke: async () => ({ data: { masteredIds: [], completedResearchIds: [], newAchievementIds: [] }, error: null }) },
  },
}));

describe('remote adapter write order', () => {
  it('does not issue the learned write until the discoveries write has landed', async () => {
    const { createRemoteHerbdexStorage } = await import('./remote-herbdex-storage');
    const storage = createRemoteHerbdexStorage('user-1');
    await storage.load();
    const at = '2026-01-01T00:00:00.000Z';
    storage.save({
      ...emptyState(),
      discoveries: { 'taraxacum-officinale': at },
      learned: { 'taraxacum-officinale': at },
    });
    // Let microtasks run: discoveries has started and is held.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(log.events).toContain('start:discoveries');
    expect(log.events).not.toContain('start:learned');
    log.releaseDiscoveries!();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(log.events.indexOf('end:discoveries')).toBeLessThan(log.events.indexOf('start:learned'));
  });
});
