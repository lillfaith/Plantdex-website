import { describe, expect, it } from 'vitest';
import { deriveAwakening } from './awakening-state';
import type { ActivityId } from './boss-form';
import type { CompletionsState } from './challenge-completions';

const all = () => true;
const none = () => false;
const ready = (...ids: ActivityId[]): CompletionsState => ({ status: 'ready', passed: new Set(ids) });
const base = { preview: false, signedIn: true, seen: new Set<ActivityId>(), runnable: all };
const states = (d: ReturnType<typeof deriveAwakening>) => d.nodes.map((n) => n.state);

describe('the Awakening says only what is known', () => {
  it('loading claims nothing: no round is done, and none is "not done" either', () => {
    const d = deriveAwakening({ ...base, completions: { status: 'loading' } });
    expect(d.progress).toBe('loading');
    expect(d.known).toBe(false);
    expect(states(d)).toEqual(['unknown', 'unknown', 'unknown', 'unknown']);
    expect(d.next).toBeNull();
    expect(d.level).toBe(0);
  });

  it('a failed read is NOT an empty record: it claims nothing, even for somebody who has passed rounds', () => {
    const d = deriveAwakening({ ...base, completions: { status: 'error' } });
    expect(d.progress).toBe('error');
    expect(states(d)).toEqual(['unknown', 'unknown', 'unknown', 'unknown']);
    expect(d.next).toBeNull();
    expect(d.done.size).toBe(0);
  });

  it('an answer from the server that is empty really means none yet, and offers the first round', () => {
    const d = deriveAwakening({ ...base, completions: ready() });
    expect(d.progress).toBe('ready');
    expect(states(d)).toEqual(['next', 'later', 'later', 'locked']);
    expect(d.next).toBe('part-spotter');
  });

  it('shows exactly what the server recorded, and opens the Trial only when all three are done', () => {
    const some = deriveAwakening({ ...base, completions: ready('part-spotter', 'compare') });
    expect(states(some)).toEqual(['done', 'done', 'next', 'locked']);
    expect(some.level).toBe(2);
    const every = deriveAwakening({ ...base, completions: ready('part-spotter', 'compare', 'habitat-season') });
    expect(states(every)).toEqual(['done', 'done', 'done', 'next']);
    expect(every.level).toBe(3);
  });

  it('a pass the server confirmed in this visit counts, on top of its record', () => {
    const d = deriveAwakening({ ...base, completions: ready('part-spotter'), seen: new Set<ActivityId>(['compare']) });
    expect(states(d)).toEqual(['done', 'done', 'next', 'locked']);
  });

  it('while a read is loading or failed, a pass seen this visit is still only that: nothing else is inferred', () => {
    const d = deriveAwakening({ ...base, completions: { status: 'error' }, seen: new Set<ActivityId>(['part-spotter']) });
    expect(d.done.has('part-spotter')).toBe(true);
    expect(d.done.size).toBe(1);
    expect(d.known).toBe(false);
  });

  it('signed out in `on` claims nothing and offers nothing', () => {
    const d = deriveAwakening({ ...base, signedIn: false, completions: { status: 'disabled' } });
    expect(d.progress).toBe('signedout');
    expect(d.next).toBeNull();
    expect(states(d)).toEqual(['unknown', 'unknown', 'unknown', 'unknown']);
  });

  it('a round that is not available says so, whatever else is known', () => {
    const d = deriveAwakening({ ...base, completions: ready(), runnable: none });
    expect(states(d)).toEqual(['soon', 'soon', 'soon', 'soon']);
    expect(d.next).toBeNull();
  });
});

describe('a preview is separate from the server', () => {
  const preview = { ...base, preview: true, signedIn: false, completions: { status: 'disabled' } as CompletionsState };
  it('shows only simulated passes from this visit', () => {
    const d = deriveAwakening({ ...preview, seen: new Set<ActivityId>(['part-spotter']) });
    expect(d.progress).toBe('preview');
    expect(states(d)).toEqual(['done', 'next', 'later', 'locked']);
  });
  it('never reads the server record, even if one were handed in', () => {
    const d = deriveAwakening({ ...preview, completions: ready('part-spotter', 'compare', 'habitat-season', 'boss-trial') });
    expect(d.done.size).toBe(0);
    expect(states(d)).toEqual(['next', 'later', 'later', 'locked']);
  });
  it('has no shortcut to the Trial', () => {
    const d = deriveAwakening({ ...preview, seen: new Set<ActivityId>(['part-spotter', 'compare']) });
    expect(states(d)[3]).toBe('locked');
  });
});
