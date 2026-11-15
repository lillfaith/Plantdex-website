import { beforeEach, describe, expect, it } from 'vitest';
import { bossArrivalPending, clearBossMoments, consumeBossArrival, noteBossEarned } from './boss-moments';

beforeEach(() => clearBossMoments());

describe('the one-time Garden arrival', () => {
  it('is queued by an earn and not before', () => {
    expect(bossArrivalPending('a')).toBe(false);
    noteBossEarned('a');
    expect(bossArrivalPending('a')).toBe(true);
  });
  it('reading it does not spend it, so a double render cannot lose it', () => {
    noteBossEarned('a');
    expect(bossArrivalPending('a')).toBe(true);
    expect(bossArrivalPending('a')).toBe(true);
  });
  it('is spent once: consuming removes it, and it cannot be queued again this visit', () => {
    noteBossEarned('a');
    consumeBossArrival('a');
    expect(bossArrivalPending('a')).toBe(false);
    noteBossEarned('a');
    expect(bossArrivalPending('a')).toBe(false);
  });
  it('keeps plants apart', () => {
    noteBossEarned('a');
    expect(bossArrivalPending('b')).toBe(false);
    consumeBossArrival('b');
    expect(bossArrivalPending('a')).toBe(true);
  });
});
