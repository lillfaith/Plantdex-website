/**
 * Deterministic randomness.
 *
 * Everything in Plantdex that looks random is actually seeded: a card's knowledge check
 * shuffles its options the same way every time, and a day's Field Research offers the same
 * tasks however many times you open the page. That is not a stylistic preference — it is
 * what makes both systems testable, and what stops a retry or a refresh from becoming a
 * reroll for an easier draw.
 *
 * `Math.random()` should not appear anywhere those two systems can reach.
 */

/** FNV-1a. Small, dependency-free, and stable across runs — unlike hashing by iteration order. */
export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — a seeded PRNG, so shuffles are reproducible. */
export function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates against a seeded source. Returns a new array; the input is untouched. */
export function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
