import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACTIVE_CHALLENGES, CHALLENGE_BANK } from './challenge-bank';
import { PRESENTATION, REGION_LABEL_OVERRIDES, iconFor, sceneFor, sceneSetFor } from './boss-presentation';
import { BOSS_IMAGES } from './boss-images';

const quickPicks = (activity: string) =>
  ACTIVE_CHALLENGES.filter((item) => item.activity === activity && item.kind === 'quick-pick');

describe('how answers are drawn (client-only)', () => {
  it('every active habitat question that is a plain quick pick has a scene for EVERY option', () => {
    const habitat = quickPicks('habitat-season');
    expect(habitat.length).toBeGreaterThan(0);
    for (const item of habitat) {
      const options = [item.correct, ...item.distractors];
      expect(sceneSetFor(item.id, options), item.id).not.toBeNull();
    }
  });

  it('an entry names only options that exist, so a stale text can never leave a tile blank', () => {
    const bank = new Map(CHALLENGE_BANK.map((item) => [item.id, item]));
    for (const [id, entry] of Object.entries(PRESENTATION)) {
      const item = bank.get(id);
      expect(item, id).toBeDefined();
      const options = new Set([item!.correct, ...item!.distractors]);
      for (const text of [...Object.keys(entry.scenes ?? {}), ...Object.keys(entry.icons ?? {})]) {
        expect(options.has(text), `${id}: ${text}`).toBe(true);
      }
    }
  });

  it('a question with no entry is simply plain text, which is always correct', () => {
    expect(sceneFor('no.such.question', 'x')).toBeUndefined();
    expect(iconFor('no.such.question', 'x')).toBeUndefined();
    expect(sceneSetFor('no.such.question', ['a', 'b'])).toBeNull();
  });

  it('a half-drawn set is refused, never shown', () => {
    expect(sceneSetFor('hb.lawn', ['Lawns and gardens', 'Not an option'])).toBeNull();
  });

  it('region label overrides name regions that exist on that photograph', () => {
    for (const [imageId, labels] of Object.entries(REGION_LABEL_OVERRIDES)) {
      for (const region of Object.keys(labels)) {
        expect(BOSS_IMAGES[imageId]?.regions?.[region], `${imageId}.${region}`).toBeDefined();
      }
    }
  });

  it('stays client-only: nothing the server shares imports it', () => {
    const sync = readFileSync('scripts/sync-edge-shared.mjs', 'utf8');
    expect(sync).not.toMatch(/boss-presentation|tap-select|HabitatScene/);
    const bank = readFileSync('src/lib/challenge-bank.ts', 'utf8');
    expect(bank).not.toMatch(/boss-presentation/);
  });
});
