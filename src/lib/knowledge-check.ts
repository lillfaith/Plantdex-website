import type { Herb } from './types';
import { HERBS, RARITY_LABEL, SEASON_LABEL } from './deck';
import { RARITIES, SEASONS } from './types';

/**
 * The card knowledge check — stage 2 of mastery.
 *
 * EVERY question and EVERY option is drawn from text printed on a real Plantdex card.
 * The correct answer comes from the card in hand; the wrong answers come from other cards
 * in the deck. Nothing here is generated, paraphrased or inferred, which is the only way a
 * quiz about plants can exist in this product without inventing botany (AGENTS.md: "do not
 * invent information merely to populate a field").
 *
 * For the same reason the check only ever asks about *what the card says*. It never asks
 * anything a wrong answer could make dangerous — no identification questions, no edibility
 * questions, no "which of these treats X". Passing it means the player read their card,
 * and that is all it is allowed to mean.
 *
 * Question generation is deterministic per herb: the same card always produces the same
 * questions in the same order. That makes the check testable, keeps a retry from becoming
 * a reroll for an easier set, and means the answer positions are shuffled but stable.
 */

export interface KnowledgeQuestion {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  /** Which section of the card the answer is printed in. Shown after answering. */
  where: string;
}

const OPTION_COUNT = 4;

/** FNV-1a. Small, dependency-free, and stable across runs — unlike hashing by iteration order. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — a seeded PRNG, so shuffles are reproducible. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Build one multiple-choice question, shuffling the options deterministically.
 * Returns null if the deck cannot supply enough distinct wrong answers, so a thin card
 * silently drops a question rather than showing a two-option "quiz".
 */
function makeQuestion(
  id: string,
  prompt: string,
  where: string,
  answer: string,
  distractorPool: readonly string[],
  rand: () => number,
): KnowledgeQuestion | null {
  if (!answer) return null;
  const distractors = shuffle(distractorPool, rand).slice(0, OPTION_COUNT - 1);
  if (distractors.length < OPTION_COUNT - 1) return null;

  const options = shuffle([answer, ...distractors], rand);
  return { id, prompt, options, answerIndex: options.indexOf(answer), where };
}

/** Values printed on other cards but not on this one — always real, never invented. */
function distractorsFrom(
  pool: readonly Herb[],
  pick: (herb: Herb) => readonly string[],
  exclude: readonly string[],
): string[] {
  const banned = new Set(exclude.map((value) => value.toLowerCase()));
  const found = new Map<string, string>();
  for (const herb of pool) {
    for (const value of pick(herb)) {
      const key = value.toLowerCase();
      if (banned.has(key) || found.has(key)) continue;
      found.set(key, value);
    }
  }
  return [...found.values()];
}

export function buildKnowledgeCheck(
  herb: Herb,
  pool: readonly Herb[] = HERBS,
): KnowledgeQuestion[] {
  const rand = seeded(hash(herb.id));
  const others = pool.filter((entry) => entry.id !== herb.id);
  const name = herb.commonName;

  const questions: (KnowledgeQuestion | null)[] = [
    makeQuestion(
      'season',
      `Which season does the card give as the best time to find ${name}?`,
      'the season icon on the card front',
      SEASON_LABEL[herb.season],
      SEASONS.filter((season) => season !== herb.season).map((season) => SEASON_LABEL[season]),
      rand,
    ),
    makeQuestion(
      'rarity',
      `How often does the deck say you are likely to come across ${name}?`,
      'the encounter rate on the card front',
      RARITY_LABEL[herb.rarity],
      RARITIES.filter((rarity) => rarity !== herb.rarity).map((rarity) => RARITY_LABEL[rarity]),
      rand,
    ),
    makeQuestion(
      'usable-part',
      `Which of these does ${name}'s card list under Usable Parts?`,
      'Usable Parts, on the card back',
      shuffle(herb.back.usableParts, rand)[0] ?? '',
      distractorsFrom(others, (entry) => entry.back.usableParts, herb.back.usableParts),
      rand,
    ),
    makeQuestion(
      'compound',
      `Which signature compound does ${name}'s card list?`,
      'Signature Compounds, on the card back',
      shuffle(herb.back.compounds, rand)[0] ?? '',
      distractorsFrom(others, (entry) => entry.back.compounds, herb.back.compounds),
      rand,
    ),
  ];

  return questions.filter(
    (question): question is KnowledgeQuestion => question !== null && question.answerIndex >= 0,
  );
}

/** A check must actually check something. Below this a card cannot be learned by quiz. */
export const MIN_QUESTIONS = 3;
