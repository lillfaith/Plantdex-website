/**
 * THE ONE-TIME MOMENTS AROUND AN EARNED BOSS FORM, session-only and deliberately not stored.
 *
 * Same call `garden-moments.ts` and `unlocked-field-cards.ts` make, for the same reason: a moment
 * is something that happened during THIS visit. A reload shows a Boss Form as simply held rather
 * than re-announcing something won last week, nothing is written to disk, and so there is no key
 * to leak between accounts on a shared device.
 *
 * IT IS FILLED ONLY BY AN EARNED EVOLUTION, which only ever follows the server's own verdict. A
 * preview never calls `noteBossEarned`, so no animation about an earned Boss Form can play for a
 * preview or for a result the server has not confirmed.
 *
 * THE GARDEN ARRIVAL IS ONCE. `consumeBossArrival` removes it, and `played` stops a second one from
 * ever being queued for the same plant in this visit, so navigating away and back does not replay it.
 */
const pending = new Set<string>();
const played = new Set<string>();

export function noteBossEarned(herbId: string): void {
  if (!played.has(herbId)) pending.add(herbId);
}

/** Reads without consuming, so a render (which may run twice) cannot spend it. */
export function bossArrivalPending(herbId: string): boolean {
  return pending.has(herbId);
}

export function consumeBossArrival(herbId: string): void {
  if (pending.delete(herbId)) played.add(herbId);
}

export function clearBossMoments(): void {
  pending.clear();
  played.clear();
}
