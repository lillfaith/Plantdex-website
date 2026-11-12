import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CARD = readFileSync('src/components/herbdex/FirstQuestCard.tsx', 'utf8');
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the first quest card', () => {
  const code = strip(CARD);
  it('shows only for an empty, hydrated collection', () => {
    expect(code).toContain('!ready || discoveredCount > 0');
  });
  it('reads the real badge and frame and awards nothing', () => {
    expect(code).toContain("getAchievement('first-find')");
    expect(code).toContain("entry.id === 'amber-ring'");
    expect(code).not.toMatch(/herbdex-reducer|discover\(|\d+\s*XP/);
  });
  it('says what counts', () => {
    expect(code).toMatch(/It counts once you\s+confirm the find/);
  });
  it('is on /herbdex without a second scan button, and on research with one', () => {
    expect(readFileSync('src/app/herbdex/page.tsx', 'utf8')).toContain('<FirstQuestCard cta={false} />');
    expect(readFileSync('src/components/research/ResearchView.tsx', 'utf8')).toContain('<FirstQuestCard />');
  });
});
