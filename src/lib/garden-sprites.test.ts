import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from '@/data/garden-sprites.json';
import { gardenSpriteFor, speciesWithGrowthArt, stageFrame } from './garden-sprites';
import { GROWTH_STAGES } from './garden';
import { HERBS, getHerb } from './deck';

const PUBLIC_DIR = join(process.cwd(), 'public');
const entries = Object.values(manifest as Record<string, (typeof manifest)[keyof typeof manifest]>);

describe('garden growth sprites', () => {
  it('has at least one species authored', () => {
    // The whole system is pointless if the manifest empties out, and an empty manifest
    // would otherwise make every assertion below pass vacuously.
    expect(entries.length).toBeGreaterThan(0);
  });

  it('only names species that are actually in the deck', () => {
    // A typo'd herb id is invisible at runtime — `gardenSpriteFor` just returns undefined
    // and the species silently falls back to its portrait forever.
    for (const entry of entries) {
      expect(getHerb(entry.herbId), `${entry.herbId} is not a herb in the deck`).toBeDefined();
    }
  });

  it('keys every entry by the herb id it declares', () => {
    for (const [key, entry] of Object.entries(manifest)) {
      expect(key).toBe(entry.herbId);
    }
  });

  it('ships the sheet each entry points at', () => {
    for (const entry of entries) {
      expect(entry.src.startsWith('/cards/garden/'), `${entry.herbId}: unexpected path`).toBe(true);
      expect(
        existsSync(join(PUBLIC_DIR, entry.src)),
        `${entry.herbId}: ${entry.src} is in the manifest but not in public/`,
      ).toBe(true);
    }
  });

  it('gives every species exactly the growth stages the Garden asks for', () => {
    // GrowthSprite computes `background-position` from the frame index and the stage count.
    // A sheet with a different number of stages, or the same stages in a different order,
    // silently renders the wrong plant at the wrong moment rather than failing.
    for (const entry of entries) {
      expect(entry.stages, entry.herbId).toEqual([...GROWTH_STAGES]);
    }
  });

  it('maps each stage to its frame in GROWTH_STAGES order', () => {
    GROWTH_STAGES.forEach((stage, index) => {
      expect(stageFrame(stage)).toBe(index);
    });
  });

  it('ships every sheet on the same canvas', () => {
    // Bottom-anchoring only puts a pine and a dandelion on one ground line if every sheet
    // shares a frame box. One species built at a different scale would float or sink.
    const first = entries[0]!;
    for (const entry of entries) {
      expect(entry.frameWidth, entry.herbId).toBe(first.frameWidth);
      expect(entry.frameHeight, entry.herbId).toBe(first.frameHeight);
    }
    expect(first.frameWidth).toBe(first.frameHeight);
  });

  it('resolves a known species and declines an unknown one', () => {
    const known = speciesWithGrowthArt()[0]!;
    expect(gardenSpriteFor(known)?.herbId).toBe(known);
    // The fallback path in GrowthSprite depends on this being undefined rather than a
    // partly-filled object — that is what keeps un-authored species on their portraits.
    expect(gardenSpriteFor('not-a-real-herb')).toBeUndefined();
  });

  it('leaves the rest of the deck on the fallback path, without breaking it', () => {
    // Growth art is partial on purpose. Every species that has none must still have the
    // portrait the Garden falls back to, or the fallback renders a broken image.
    for (const herb of HERBS) {
      if (gardenSpriteFor(herb.id)) continue;
      expect(herb.sprite, `${herb.id} has neither growth art nor a portrait`).toBeTruthy();
    }
  });

  it('lists authored species in a stable order', () => {
    expect(speciesWithGrowthArt()).toEqual([...speciesWithGrowthArt()].sort());
  });
});
