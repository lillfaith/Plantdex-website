import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import manifest from '@/data/sprites.json';
import { BOSS_PILOT } from './boss-form';
import { bossFormsMode } from './boss-forms';
import { SUPPORTED_FRAME_COUNTS, hasStageArt, spriteFor, type PlantSpriteEntry } from './plant-sprites';
import { GROWTH_STAGES, MASTERY_BY_GARDEN_STAGE } from './garden';

const all = manifest as Record<string, PlantSpriteEntry>;
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the Dandelion boss sprite', () => {
  const adult = all['taraxacum-officinale']!;
  const boss = adult.stages!.boss!;

  it('exists only for the pilot species', () => {
    const withBoss = Object.keys(all).filter((id) => all[id]!.stages?.boss);
    expect(withBoss).toEqual([...BOSS_PILOT]);
  });

  it('is an animated sheet on disk, with a still', () => {
    expect(existsSync(`public${boss.src}`)).toBe(true);
    expect(existsSync(`public${boss.still}`)).toBe(true);
    expect(SUPPORTED_FRAME_COUNTS).toContain(boss.frames);
  });

  it('runs faster than the adult and is a little taller, never a different size class', () => {
    expect(boss.fps).toBeGreaterThan(adult.fps);
    expect(boss.frameHeight).toBeGreaterThan(adult.frameHeight);
    expect(boss.frameWidth).toBe(adult.frameWidth);
  });

  it('is reachable through the sprite lookup without changing the three growth stages', () => {
    expect(hasStageArt('taraxacum-officinale', 'boss')).toBe(true);
    expect(spriteFor('taraxacum-officinale', 'boss')?.herbId).toBe('taraxacum-officinale-boss');
    expect(hasStageArt('urtica-dioica', 'boss')).toBe(false);
    expect([...GROWTH_STAGES]).toEqual(['sprout', 'growing', 'flowering']);
    expect(Object.keys(MASTERY_BY_GARDEN_STAGE)).toEqual(['sprout', 'growing', 'flowering']);
  });
});

describe('the Boss Form flag', () => {
  it('is off unless explicitly set, so production behaves as today', () => {
    expect(bossFormsMode(undefined)).toBe('off');
    expect(bossFormsMode('')).toBe('off');
    expect(bossFormsMode('yes')).toBe('off');
    expect(bossFormsMode('preview', 'development')).toBe('preview');
    expect(bossFormsMode('on', 'production')).toBe('on');
  });
  it('preview can never show an unearned Boss Form in a production build', () => {
    expect(bossFormsMode('preview', 'production')).toBe('off');
    expect(bossFormsMode('preview', 'test')).toBe('off');
    expect(bossFormsMode('preview', undefined)).toBe('off');
  });
  it('no workflow sets the flag', () => {
    for (const file of ['.github/workflows/deploy.yml']) {
      expect(readFileSync(file, 'utf8')).not.toContain('NEXT_PUBLIC_BOSS_FORMS');
    }
  });
  it('the Garden shows one status, never Mastered and Boss Form together', () => {
    const view = strip(readFileSync('src/components/garden/GardenView.tsx', 'utf8'));
    expect(view).toMatch(/bossForms\.has\(herbId\)\s*\?\s*'Boss Form'\s*:\s*MASTERY_STAGE_LABEL/);
  });
  it('the browser module has no write path', () => {
    const code = strip(readFileSync('src/lib/boss-forms.ts', 'utf8'));
    expect(code).not.toMatch(/\.(insert|update|upsert|delete|rpc)\(/);
    expect(code).toContain(".from('boss_forms')");
  });
  it('is never stored in HerbdexState', () => {
    expect(readFileSync('src/lib/types.ts', 'utf8')).not.toMatch(/bossForms/);
    expect(readFileSync('src/lib/herbdex-state.ts', 'utf8')).not.toMatch(/boss/i);
  });
  it('the Garden marks an earned Boss Form with a STATIC frame, pedestal and plaque, nothing that moves', () => {
    const view = strip(readFileSync('src/components/garden/GardenView.tsx', 'utf8'));
    expect(view).toContain('boss-frame');
    expect(view).toContain('boss-pedestal');
    expect(view).toContain('bossForms.has(herbId)');
    const css = readFileSync('src/app/globals.css', 'utf8');
    for (const name of ['boss-frame', 'boss-pedestal']) {
      const at = css.indexOf(`@utility ${name}`);
      const block = css.slice(at, css.indexOf('\n}', at));
      expect(block).not.toMatch(/animation|transition/);
    }
  });
  it('the Garden changes only the picture and a label', () => {
    const view = strip(readFileSync('src/components/garden/GardenView.tsx', 'utf8'));
    expect(view).toContain("bossForms.has(herbId) ? 'boss' : stage");
    expect(view).toContain('MASTERY_BY_GARDEN_STAGE[stage]');
  });
});
