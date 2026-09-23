import { random } from 'remotion';

/** Deterministic 0..1 for a string seed. Renders must never read Math.random(). */
export const rand = (seed: string): number => random(seed);
