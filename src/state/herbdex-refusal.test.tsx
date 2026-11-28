// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { HerbdexStorage } from '@/lib/storage';
import { emptyState } from '@/lib/herbdex-state';
import { PRINTED_CARDS } from '@/lib/deck';
import { progressFromState } from '@/lib/progression';
import type { HerbdexState } from '@/lib/types';

const auth = vi.hoisted(() => ({ user: null as { id: string } | null }));
vi.mock('./AuthProvider', () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock('@/lib/sightings-store', () => ({ useSightingCounts: () => ({}) }));

import { HerbdexProvider, useHerbdex } from './HerbdexProvider';
import { createHerbdexStore } from './herbdex-store';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const herb = PRINTED_CARDS[0]!;
const AT = '2026-01-01T00:00:00.000Z';
const flush = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
};

/** A server that refuses any NEW discovery (the receipt rule) and keeps what it holds. */
function controllableAdapter(server: HerbdexState = emptyState()) {
  const saves: HerbdexState[] = [];
  let refuseNew = true;
  let writes = 0;
  const adapter: HerbdexStorage = {
    load: () => Promise.resolve(structuredClone(server)),
    save(state) {
      saves.push(state);
      const fresh = Object.keys(state.discoveries).filter((id) => !(id in server.discoveries));
      if (fresh.length > 0 && refuseNew) {
        writes += 1;
        // Valid rows in the same save still land; only the discovery is refused.
        server = { ...server, learned: { ...server.learned, ...state.learned } };
        queueMicrotask(() =>
          adapter.onRefused?.({ table: 'discoveries', ids: fresh, code: 'discovery_requires_capture_receipt' }),
        );
        return;
      }
      server = structuredClone(state);
    },
    clear() {},
  };
  return {
    adapter,
    saves,
    writes: () => writes,
    allow: () => {
      refuseNew = false;
    },
    server: () => server,
  };
}

describe('store rollback on a refused write', () => {
  it('rolls back XP and achievements, sets the refusal, and dismiss clears it', async () => {
    const ctl = controllableAdapter();
    const store = createHerbdexStore(ctl.adapter);
    await new Promise<void>((resolve) => store.subscribe(resolve));
    const baseline = progressFromState(store.getSnapshot().state).xp;

    const result = store.discover(herb);
    expect(result.awarded).toBe(true);
    expect(progressFromState(store.getSnapshot().state).xp).toBeGreaterThan(baseline);
    expect(Object.keys(store.getSnapshot().state.achievements).length).toBeGreaterThan(0);

    await flush();
    const snap = store.getSnapshot();
    expect(snap.state.discoveries[herb.id]).toBeUndefined();
    expect(snap.state.achievements).toEqual({});
    expect(progressFromState(snap.state).xp).toBe(baseline);
    expect(snap.refusal?.kind).toBe('needs-capture');
    expect(snap.refusal?.herbIds).toEqual([herb.id]);
    // No retry loop: the rollback load is not a new write.
    await flush();
    expect(ctl.writes()).toBe(1);

    store.dismissRefusal();
    expect(store.getSnapshot().refusal).toBeNull();
  });

  it('allows the same card later once it is captured properly', async () => {
    const ctl = controllableAdapter();
    const store = createHerbdexStore(ctl.adapter);
    await new Promise<void>((resolve) => store.subscribe(resolve));
    store.discover(herb);
    await flush();
    ctl.allow();
    expect(store.discover(herb).awarded).toBe(true);
    await flush();
    expect(store.getSnapshot().state.discoveries[herb.id]).toBeTruthy();
    expect(ctl.server().discoveries[herb.id]).toBeTruthy();
  });

  it('keeps the legitimate rows of a mixed save', async () => {
    const held = PRINTED_CARDS[1]!;
    const server = emptyState();
    server.discoveries[held.id] = AT;
    const ctl = controllableAdapter(server);
    const store = createHerbdexStore(ctl.adapter);
    await new Promise<void>((resolve) => store.subscribe(resolve));
    store.markLearned(held); // valid: held card
    store.discover(herb); // refused
    await flush();
    const s = store.getSnapshot().state;
    expect(s.learned[held.id]).toBeTruthy();
    expect(s.discoveries[herb.id]).toBeUndefined();
    expect(s.discoveries[held.id]).toBeTruthy();
  });

  it('does not roll back on a plain success', async () => {
    const ctl = controllableAdapter();
    ctl.allow();
    const store = createHerbdexStore(ctl.adapter);
    await new Promise<void>((resolve) => store.subscribe(resolve));
    store.discover(herb);
    await flush();
    expect(store.getSnapshot().state.discoveries[herb.id]).toBeTruthy();
    expect(store.getSnapshot().refusal).toBeNull();
  });
});

describe('HerbdexProvider refusal', () => {
  let root: Root;
  let host: HTMLElement;
  let latest: ReturnType<typeof useHerbdex>;
  const seenXp: number[] = [];

  function Probe() {
    const value = useHerbdex();
    useEffect(() => {
      latest = value;
      seenXp.push(value.progress.xp);
    });
    return null;
  }
  const mount = (storage: HerbdexStorage) => {
    root = createRoot(host);
    act(() => root.render(<HerbdexProvider storage={storage}><Probe /></HerbdexProvider>));
  };

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    seenXp.length = 0;
    auth.user = null;
    localStorage.clear();
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it('exposes lastRefusal, rolls XP back, and dismissRefusal clears it', async () => {
    const ctl = controllableAdapter();
    mount(ctl.adapter);
    await flush();
    const base = latest.progress.xp;
    act(() => {
      latest.discover(herb);
    });
    expect(latest.progress.xp).toBeGreaterThan(base);
    await flush();
    expect(latest.progress.xp).toBe(base);
    expect(latest.isDiscovered(herb.id)).toBe(false);
    expect(latest.lastRefusal?.kind).toBe('needs-capture');
    act(() => latest.dismissRefusal());
    expect(latest.lastRefusal).toBeNull();
  });

  it('clears lastRefusal when the account changes', async () => {
    const ctl = controllableAdapter();
    const element = (storage: HerbdexStorage) =>
      <HerbdexProvider storage={storage}><Probe /></HerbdexProvider>;
    root = createRoot(host);
    act(() => root.render(element(ctl.adapter)));
    await flush();
    act(() => {
      latest.discover(herb);
    });
    await flush();
    expect(latest.lastRefusal).not.toBeNull();
    // A different account means a different storage, hence a fresh store.
    act(() => root.render(element(controllableAdapter().adapter)));
    await flush();
    expect(latest.lastRefusal).toBeNull();
  });
});
