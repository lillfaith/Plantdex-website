import { beforeEach, describe, expect, it } from 'vitest';
import { bossArrivalPending, clearBossMoments, consumeBossArrival, noteBossEarned } from './boss-moments';

beforeEach(() => clearBossMoments());

describe('the one-time Garden arrival', () => {
  it('is queued by an earn and not before', () => {
    expect(bossArrivalPending('a', 'u1')).toBe(false);
    noteBossEarned('a', 'u1');
    expect(bossArrivalPending('a', 'u1')).toBe(true);
  });
  it('reading it does not spend it, so a double render cannot lose it', () => {
    noteBossEarned('a', 'u1');
    expect(bossArrivalPending('a', 'u1')).toBe(true);
    expect(bossArrivalPending('a', 'u1')).toBe(true);
  });
  it('is spent once: consuming (even twice) removes it, and it cannot be queued again this visit', () => {
    noteBossEarned('a', 'u1');
    consumeBossArrival('a', 'u1');
    consumeBossArrival('a', 'u1');
    expect(bossArrivalPending('a', 'u1')).toBe(false);
    noteBossEarned('a', 'u1');
    expect(bossArrivalPending('a', 'u1')).toBe(false);
  });
  it('keeps plants apart', () => {
    noteBossEarned('a', 'u1');
    expect(bossArrivalPending('b', 'u1')).toBe(false);
    consumeBossArrival('b', 'u1');
    expect(bossArrivalPending('a', 'u1')).toBe(true);
  });
  it('is never played for another account, and never queued without one', () => {
    noteBossEarned('a', 'u1');
    expect(bossArrivalPending('a', 'u2')).toBe(false);
    expect(bossArrivalPending('a', undefined)).toBe(false);
    noteBossEarned('b', undefined);
    expect(bossArrivalPending('b', undefined)).toBe(false);
  });
});
