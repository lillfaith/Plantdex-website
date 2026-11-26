import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CATALOGUE, getCatalogueEntry } from './catalogue';
import { PRINTED_CARDS, getPrintedCard, printedCardsInDeckOrder } from './deck';
import { EXPANSION_PILOT_ON } from './expansion-pilot-flag';
import { buildGarden } from './garden';
import { emptyState } from './herbdex-state';
import { KNOWLEDGE_CHECK_POOL } from './knowledge-check';
import { profileStats, recentFinds } from './profile-stats';
import { progressFromState } from './progression';
import { matchScientificName } from './plant-match';
import { RESEARCH_POOL, STANDING_TASKS } from './research';
import { cardFor, isShelfEligible } from './seed-shelf';

/**
 * AN UNPUBLISHED EXPANSION CARD IS INACCESSIBLE THROUGH THE PLAYER-FACING COLLECTION FLOW.
 *
 * Owner decision, 2026-11-26: the 85 Herbdex Expansion cards (#57-141) pay 0 XP and are not served until a release gate says
 * otherwise, and migration 0015 (which lets the database STORE their ids on the TEST project) must not publish anything. This file
 * is the proof for the "must not publish" half, and it is deliberately written against the real modules rather than a mock: it asks
 * every surface a player's collection passes through whether it can see any of the 85, with NEXT_PUBLIC_EXPANSION_PILOT off.
 *
 * The ids and scientific names come from the audit inventory, never from this file. When the flag is turned on for real, the
 * expected outcome of these tests changes in the same commit that wires the data in; until then they must all hold.
 */
const root = join(import.meta.dirname, '..', '..');
const INVENTORY = readFileSync(join(root, 'docs', 'expansion', 'audit', 'inventory.csv'), 'utf8');
const EXPANSION = [...INVENTORY.matchAll(/^(\d{2,3}),([a-z0-9-]+),(?:"[^"]*"|[^,]*),([A-Z][a-z]+ [a-z-]+),/gm)].map((m) => ({
  n: Number(m[1]),
  id: m[2] ?? '',
  scientific: m[3] ?? '',
}));
const ids = new Set(EXPANSION.map((e) => e.id));

it('reads the 85 expansion records, #57 to #141', () => {
  expect(EXPANSION).toHaveLength(85);
  expect(EXPANSION[0]?.n).toBe(57);
  expect(EXPANSION[84]?.n).toBe(141);
});

describe('the flag is off, and nothing in the build turns it on', () => {
  it('reads as off in this environment', () => {
    expect(process.env.NEXT_PUBLIC_EXPANSION_PILOT).not.toBe('on');
    expect(EXPANSION_PILOT_ON).toBe(false);
  });
  it('defaults to the literal "off" in next.config.ts, so the bundler can drop a gated import', () => {
    expect(readFileSync(join(root, 'next.config.ts'), 'utf8')).toMatch(/NEXT_PUBLIC_EXPANSION_PILOT:\s*process\.env\.NEXT_PUBLIC_EXPANSION_PILOT \?\? 'off'/);
  });
  it('is set to "on" by no workflow and no env file in the repository', () => {
    const dir = join(root, '.github', 'workflows');
    for (const f of readdirSync(dir)) {
      expect(readFileSync(join(dir, f), 'utf8'), f).not.toMatch(/NEXT_PUBLIC_EXPANSION_PILOT\s*[:=]\s*['"]?on\b/);
    }
  });
});

describe('no expansion card is in any collection the app serves', () => {
  it('the catalogue and the printed deck hold none of the 85, by id or by scientific name', () => {
    for (const herb of CATALOGUE) {
      expect(ids.has(herb.id), herb.id).toBe(false);
    }
    const names = new Set(EXPANSION.map((e) => e.scientific.toLowerCase()));
    for (const herb of CATALOGUE) expect(names.has(herb.scientificName.toLowerCase()), herb.scientificName).toBe(false);
    expect(CATALOGUE).toHaveLength(54);
    expect(PRINTED_CARDS).toHaveLength(45);
  });
  it('the card route (generateStaticParams reads CATALOGUE) therefore builds no page for any of them', () => {
    for (const e of EXPANSION) {
      expect(getCatalogueEntry(e.id), e.id).toBeUndefined();
      expect(getPrintedCard(e.id), e.id).toBeUndefined();
    }
  });
  it('the Herbdex grid, the card route and the garden read only the catalogue modules, never expansion data', () => {
    const forbidden = /expansion-pilot\.generated|scripts\/expansion|docs\/expansion|expansion-pilot-flag/;
    const offenders: string[] = [];
    const walk = (d: string): void => {
      for (const name of readdirSync(d)) {
        const p = join(d, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) && !name.startsWith('expansion-pilot-flag')) {
          if (forbidden.test(readFileSync(p, 'utf8'))) offenders.push(relative(root, p));
        }
      }
    };
    walk(join(root, 'src'));
    expect(offenders).toEqual([]);
  });
});

describe('every surface a collection passes through refuses them', () => {
  it('the scan matcher resolves none of the 85 to a card (no exact match, no genus card)', () => {
    for (const e of EXPANSION) {
      const m = matchScientificName(e.scientific);
      expect(m.kind === 'exact', `${e.scientific} must not be an exact card match`).toBe(false);
    }
  });
  it('the Seed Shelf finds no card for them, so a claimed packet can never sprout one', () => {
    for (const e of EXPANSION) {
      const cardId = cardFor({ scientificName: e.scientific });
      expect(cardId === null || !ids.has(cardId), `${e.scientific} -> ${String(cardId)}`).toBe(true);
    }
    // And eligibility is only "a species with no confirmable card", which is exactly what these are today.
    for (const e of EXPANSION.filter((x) => !/^(Rumex|Plantago|Trifolium|Taraxacum)/.test(x.scientific))) {
      expect(typeof isShelfEligible(e.scientific)).toBe('boolean');
    }
  });
  it('Field Research supply, the standing tasks and the knowledge-check pool hold none of them', () => {
    for (const pool of [RESEARCH_POOL, KNOWLEDGE_CHECK_POOL]) {
      expect(pool).toHaveLength(45);
      for (const herb of pool) expect(ids.has(herb.id), herb.id).toBe(false);
    }
    for (const task of STANDING_TASKS) {
      expect(JSON.stringify(task), task.id).not.toMatch(new RegExp([...ids].join('|')));
    }
  });
  it('the garden lists only printed cards, and a forged record of all 85 appears nowhere and is worth 0 XP', () => {
    const at = '2026-11-26T00:00:00.000Z';
    const all = Object.fromEntries([...ids].map((id) => [id, at]));
    const forged = { ...emptyState(), discoveries: all, learned: all, mastered: all };
    // The Garden page builds its plot from the printed deck, never from the record: forged ids have no tile.
    const order = printedCardsInDeckOrder().map((herb) => herb.id);
    expect(order).toHaveLength(45);
    expect(order.filter((id) => ids.has(id))).toEqual([]);
    expect(buildGarden(forged, order)).toEqual([]);
    // The profile's garden strip and recent finds filter the record through the printed deck as well.
    const stats = profileStats(forged);
    expect(JSON.stringify(stats)).not.toMatch(new RegExp([...ids].join('|')));
    expect(recentFinds(forged, 10)).toEqual([]);
    // And a forged record of all 85 is worth exactly nothing: XP is summed through the printed deck only.
    expect(progressFromState(forged).xp).toBe(0);
  });
});
