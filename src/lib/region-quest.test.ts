import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PRINTED_CARDS } from './deck';
import { HABITATS } from './habitat';
import { applyDiscovery } from './herbdex-reducer';
import { emptyState } from './herbdex-state';
import { xpForState } from './progression';
import {
  GEORGIA_TRAIL_ID, TRAIL_COPY, georgiaQuestPreviewEnabled, trailProgress,
} from './region-quest';
import {
  NO_COMPLETIONS, QUEST_COMPLETION_KEY, parseCompletions, readCompletions, recordCompletion,
  writeCompletions, type CompletionStorage,
} from './region-quest-store';
import { speciesForRegion } from './region-species';

const AT = '2026-11-26T10:00:00.000Z';
const confirmedIds = speciesForRegion('us-ga').filter((s) => s.occurrence === 'confirmed').map((s) => s.herbId);
const found = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, AT]));

describe('trail supply: the quest cannot be impossible', () => {
  it('is built from the original deck only, and every step has supply', () => {
    const p = trailProgress({})!;
    expect(p).not.toBeNull();
    const deck = new Set(PRINTED_CARDS.map((c) => c.id));
    expect(p.steps.length).toBeGreaterThan(0);
    expect(p.steps.length).toBeLessThanOrEqual(HABITATS.length);
    for (const step of p.steps) {
      expect(step.tiles.length, step.label).toBeGreaterThan(0);
      for (const t of step.tiles) {
        expect(deck.has(t.herbId)).toBe(true);
        expect(confirmedIds).toContain(t.herbId);
      }
    }
  });

  it('collecting every confirmed Georgia card completes it', () => {
    const p = trailProgress(found(confirmedIds))!;
    expect(p.complete).toBe(true);
    expect(p.done).toBe(p.total);
    expect(p.uniqueCollected).toBe(p.uniqueTotal);
  });

  it('starts at zero and is not complete with no finds', () => {
    const p = trailProgress({})!;
    expect(p.done).toBe(0);
    expect(p.complete).toBe(false);
  });

  it('is completable by a small, concrete set of finds (greedy cover)', () => {
    const p = trailProgress({})!;
    const open = new Set(p.steps.map((s) => s.habitat));
    const picked: string[] = [];
    while (open.size > 0) {
      const best = new Map<string, number>();
      for (const s of p.steps) if (open.has(s.habitat)) for (const t of s.tiles) best.set(t.herbId, (best.get(t.herbId) ?? 0) + 1);
      const [id] = [...best.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]!;
      picked.push(id);
      for (const s of p.steps) if (s.tiles.some((t) => t.herbId === id)) open.delete(s.habitat);
    }
    expect(picked.length).toBeLessThanOrEqual(p.total);
    expect(trailProgress(found(picked))!.complete).toBe(true);
  });

  it('one find in every step except one leaves it incomplete', () => {
    const p = trailProgress({})!;
    const sets = p.steps.map((s) => s.tiles.map((t) => t.herbId));
    const skipped = sets.length - 1;
    // Pick, for every other step, ids not present in the skipped step.
    const exclude = new Set(sets[skipped]);
    const ids = sets.slice(0, skipped).map((tiles) => tiles.find((id) => !exclude.has(id)));
    if (ids.every(Boolean)) expect(trailProgress(found(ids as string[]))!.complete).toBe(false);
  });
});

describe('derived progress', () => {
  it('counts a find once and never twice', () => {
    const id = confirmedIds[0]!;
    const once = trailProgress(found([id]))!;
    const again = trailProgress({ [id]: '2027-01-01T00:00:00.000Z' })!;
    expect(again.done).toBe(once.done);
    expect(again.uniqueCollected).toBe(1);
  });

  it('ignores cards outside Georgia supply and unknown ids', () => {
    const p = trailProgress({ 'zzz-not-a-card': AT })!;
    expect(p.done).toBe(0);
    expect(p.uniqueCollected).toBe(0);
  });

  it('reports occasional-only groups without requiring them', () => {
    const p = trailProgress({})!;
    for (const label of p.occasionalOnly) expect(p.steps.some((s) => s.label === label)).toBe(false);
  });

  it('is Georgia only', () => {
    expect(trailProgress({}, 'us')).toBeNull();
    expect(trailProgress({}, 'us-al')).toBeNull();
  });

  it('is the same object-shape on repeat calls (deterministic, no clock)', () => {
    expect(trailProgress(found(confirmedIds.slice(0, 3)))).toEqual(trailProgress(found(confirmedIds.slice(0, 3))));
  });
});

describe('it awards nothing (structurally)', () => {
  const lib = readFileSync('src/lib/region-quest.ts', 'utf8');
  const store = readFileSync('src/lib/region-quest-store.ts', 'utf8');
  const component = readFileSync('src/components/quests/GeorgiaHabitatQuest.tsx', 'utf8');

  it('imports no reducer, progression, store or storage-of-progress module', () => {
    const imports = (src: string) => src.split('\n').filter((l) => /^import |from '/.test(l)).join('\n');
    for (const src of [lib, store]) {
      expect(imports(src)).not.toMatch(/herbdex-reducer|progression|research|mastery|HerbdexProvider/);
    }
    expect(imports(component)).not.toMatch(/herbdex-reducer|progression|research|mastery/);
    expect(component.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/applyDiscovery|\.discover\(|learn\(/);
  });

  it('reads no clock or randomness in the pure modules', () => {
    for (const src of [lib, store]) {
      expect(src.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/Date\.now|new Date|Math\.random/);
    }
  });

  it('has no camera-free route: the screen links to cards and the scanner and writes no discovery', () => {
    expect(component).toMatch(/href="\/scan"/);
    expect(component).toMatch(/cardHref/);
    expect(component.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/\bdiscover\b/);
  });

  it('a player finds plants only through the ordinary path: XP is whatever applyDiscovery pays', () => {
    const id = confirmedIds[0]!;
    const base = emptyState();
    const before = xpForState(base);
    const after = applyDiscovery(base, id, AT);
    // The quest module has no say: completing the trail changes no state object.
    const state = after.state;
    const snapshot = JSON.stringify(state);
    trailProgress(state.discoveries);
    expect(JSON.stringify(state)).toBe(snapshot);
    expect(xpForState(state)).toBeGreaterThanOrEqual(before);
  });

  it('the screen is behind a build-time flag the production build does not set', () => {
    const gate = readFileSync('src/components/quests/GeorgiaQuestGate.tsx', 'utf8');
    expect(gate).toMatch(/process\.env\.NEXT_PUBLIC_GEORGIA_QUEST_PREVIEW === 'on'/);
    expect(gate).toMatch(/: null/);
    expect(georgiaQuestPreviewEnabled(undefined)).toBe(false);
    expect(georgiaQuestPreviewEnabled('ON')).toBe(false);
    expect(georgiaQuestPreviewEnabled('true')).toBe(false);
    expect(georgiaQuestPreviewEnabled('on')).toBe(true);
  });

  it('nothing but the gate, the page and the quests page imports the screen', () => {
    const hits = execSync("grep -rl 'GeorgiaHabitatQuest' src --include=*.ts --include=*.tsx || true", { encoding: 'utf8' })
      .split('\n').filter(Boolean).sort();
    expect(hits).toEqual([
      'src/components/quests/GeorgiaHabitatQuest.tsx',
      'src/components/quests/GeorgiaQuestGate.tsx',
      'src/lib/region-quest.test.ts',
    ]);
  });

  it('adds no navigation: SiteNav is untouched by this lane', () => {
    expect(readFileSync('src/components/SiteNav.tsx', 'utf8')).not.toMatch(/quests\/habitats|Habitat Trail/);
  });
});

describe('wording', () => {
  const BANNED: [string, RegExp][] = [
    ['nearby', /\bnear\s?by\b/i], ['near you', /\bnear you\b/i], ['around you', /\baround you\b/i],
    ['right now', /right now/i], ['currently', /\bcurrent(ly)?\b/i], ['live', /\blive\b/i],
    ['likely', /\blikely\b/i], ['here', /\bhere\b/i], ['XP number', /\b\d+\s*XP\b/],
    ['unlocked', /\bunlock/i],
  ];
  const strings = Object.values(TRAIL_COPY).flatMap((v) =>
    typeof v === 'function' ? [(v as (...a: never[]) => string)(...([2, 5] as never[]))] : [v],
  );
  it('avoids location-implying words, XP figures and the Field Card word "unlock"', () => {
    for (const s of strings) for (const [name, re] of BANNED) expect(s, `${name}: ${s}`).not.toMatch(re);
  });
  it('promises no reward value and states nothing about edibility or medicine', () => {
    for (const s of strings) expect(s).not.toMatch(/edible|medicin|cure|treat|heal|safe to eat/i);
  });
});

describe('completion record: recorded once, never revoked', () => {
  const memory = (): CompletionStorage & { data: Map<string, string> } => {
    const data = new Map<string, string>();
    return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
  };

  it('records only a completed trail, and returns the SAME object otherwise', () => {
    expect(recordCompletion(NO_COMPLETIONS, GEORGIA_TRAIL_ID, false, AT)).toBe(NO_COMPLETIONS);
    const first = recordCompletion(NO_COMPLETIONS, GEORGIA_TRAIL_ID, true, AT);
    expect(first[GEORGIA_TRAIL_ID]).toBe(AT);
    expect(recordCompletion(first, GEORGIA_TRAIL_ID, true, '2030-01-01T00:00:00.000Z')).toBe(first);
  });

  it('never revokes: a later "not complete" leaves the record untouched', () => {
    const first = recordCompletion(NO_COMPLETIONS, GEORGIA_TRAIL_ID, true, AT);
    expect(recordCompletion(first, GEORGIA_TRAIL_ID, false, AT)).toBe(first);
  });

  it('persists across a reload, per account scope, and one scope cannot read another', () => {
    const s = memory();
    writeCompletions('user-a', recordCompletion(NO_COMPLETIONS, GEORGIA_TRAIL_ID, true, AT), s);
    expect(readCompletions('user-a', s)[GEORGIA_TRAIL_ID]).toBe(AT);
    expect(readCompletions('user-b', s)).toBe(NO_COMPLETIONS);
    expect(readCompletions('device', s)).toBe(NO_COMPLETIONS);
    expect([...s.data.keys()].every((k) => k.startsWith('plantdex.'))).toBe(true);
    expect([...s.data.keys()][0]).toBe(`${QUEST_COMPLETION_KEY}:user-a`);
  });

  it('validates on read and keeps nothing but id and timestamp', () => {
    expect(parseCompletions({ [GEORGIA_TRAIL_ID]: AT, 'Bad Key': AT, x: 'not a date', y: 5 })).toEqual({ [GEORGIA_TRAIL_ID]: AT });
    expect(parseCompletions(null)).toBe(NO_COMPLETIONS);
    expect(parseCompletions([AT])).toBe(NO_COMPLETIONS);
    const s = memory();
    s.setItem(`${QUEST_COMPLETION_KEY}:d`, '{not json');
    expect(readCompletions('d', s)).toBe(NO_COMPLETIONS);
  });

  it('survives a storage that throws', () => {
    const bad: CompletionStorage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); } };
    expect(readCompletions('d', bad)).toBe(NO_COMPLETIONS);
    expect(() => writeCompletions('d', { a: AT }, bad)).not.toThrow();
  });
});
