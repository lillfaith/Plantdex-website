/**
 * How many photographs an observation must carry — and the one deployment that may lower it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS OVERRIDABLE AT ALL, WHICH IS A QUESTION WORTH ANSWERING BEFORE READING THE
 * CODE.
 *
 * Two photographs is a REQUIREMENT the product imposes on every player, and it costs them
 * something: a second tap, a second framing, a second thing to get right while standing in
 * front of a plant. It was chosen because both providers treat the set as one individual and
 * more views of one plant is a better question to ask them — a good argument, and not a
 * measurement. Whether the second photograph buys enough accuracy to be worth that friction
 * is answerable, and it cannot be answered by a benchmark that is itself bound by the floor
 * it is trying to evaluate.
 *
 * So the floor reads an environment variable on the deployment being measured, and NOWHERE
 * ELSE. The variable is unset in production and this returns `fallback` — byte-identical
 * behaviour to the constant it replaced.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT FAILS SAFE IN EVERY DIRECTION, WHICH IS THE WHOLE REASON IT IS A FUNCTION.
 *
 * An env var is a string somebody typed, and the failure modes are not symmetric: a value
 * that accidentally RAISES the floor costs a scan, while a value that accidentally removes
 * it — `0`, `-1`, `''`, `abc`, `1.5` — silently turns off a check on the public endpoint.
 * So anything that is not a positive integer is the fallback, and a value above `max` is
 * clamped to it rather than honoured, because a floor above the ceiling would refuse every
 * request that could ever be made.
 */

export interface ImageBounds {
  /** What the floor is when nothing overrides it. Production always lands here. */
  readonly fallback: number;
  /** The ceiling the floor may never exceed, or no request could satisfy both. */
  readonly max: number;
}

export function resolveMinImages(raw: string | undefined | null, bounds: ImageBounds): number {
  const { fallback, max } = bounds;
  if (raw === undefined || raw === null) return fallback;
  const text = raw.trim();
  if (text === '') return fallback;
  /*
   * `Number` alone accepts '1.5', '1e0', ' 1 ', '0x1' and Infinity, every one of which would
   * be a surprising floor. The pattern is what makes "somebody typed a number of pictures"
   * the only thing that gets through.
   */
  if (!/^\d+$/.test(text)) return fallback;
  const value = Number(text);
  if (!Number.isSafeInteger(value) || value < 1) return fallback;
  return Math.min(value, max);
}
