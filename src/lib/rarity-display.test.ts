import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RARITY_LABEL } from './deck';
import { HERBS } from './deck';
import { RARITIES } from './types';

/**
 * ENCOUNTER RATE IS PRINTED ON THE CARDS.
 *
 * Every card front reads "Encounter Rate: <tier>" in a tier-coloured type. So the tiers
 * are transcribed card data, exactly like the season and the growing-condition pips — not
 * a game vocabulary the site is free to reword. `scripts/build_deck.py` states the rule:
 * "NOTHING in this file is invented. Every field is printed on the physical card."
 *
 * That makes drift a correctness problem rather than a tidiness one. If the site ever
 * showed a tier the card does not, a player holding the deck would be told two different
 * things about the same plant, and the physical card is the one that cannot be patched.
 *
 * Two displays exist — a badge in the collection grid and a meter on the plant page — and
 * these tests keep them speaking with one voice.
 */

const BADGE = 'src/components/herbdex/RarityBadge.tsx';
const METER = 'src/components/game/RarityMeter.tsx';

describe('rarity displays cannot drift', () => {
  it('labels every tier the deck can contain', () => {
    for (const rarity of RARITIES) {
      expect(RARITY_LABEL[rarity], rarity).toBeTruthy();
    }
    expect(Object.keys(RARITY_LABEL).sort()).toEqual([...RARITIES].sort());
  });

  it('uses only tiers that exist, and every tier is used by a real card', () => {
    for (const herb of HERBS) {
      expect(RARITIES, `${herb.id}: unknown rarity`).toContain(herb.rarity);
    }
    // A tier nothing carries would be a vocabulary the deck does not actually print.
    const inUse = new Set(HERBS.map((herb) => herb.rarity));
    for (const rarity of RARITIES) {
      expect(inUse.has(rarity), `${rarity} is declared but no card carries it`).toBe(true);
    }
  });

  it('draws both displays from RARITY_LABEL rather than the raw key', () => {
    // The badge used to print the key directly, which worked only while every label
    // happened to equal its identifier.
    for (const path of [BADGE, METER]) {
      expect(readFileSync(path, 'utf8'), path).toContain('RARITY_LABEL[rarity]');
    }
  });

  it('gives every tier a colour in both displays', () => {
    // Both keep a `Record<Rarity, string>`, so TypeScript already fails the build on a
    // missing tier. This asserts the tokens themselves are present, which types cannot.
    const css = readFileSync('src/app/globals.css', 'utf8');
    for (const rarity of RARITIES) {
      const token = `--color-rarity-${rarity.toLowerCase()}`;
      expect(css, `${rarity}: no colour token`).toContain(token);
      for (const path of [BADGE, METER]) {
        expect(readFileSync(path, 'utf8'), `${path}: ${rarity} has no tone`).toContain(
          `${rarity}:`,
        );
      }
    }
  });

  it('spells the tier out in text, never colour alone', () => {
    // A colour-only signal fails anyone who cannot distinguish the four hues, and the
    // cards themselves print the word.
    for (const path of [BADGE, METER]) {
      expect(readFileSync(path, 'utf8'), path).toMatch(/Encounter rate|RARITY_LABEL\[rarity\]/);
    }
  });

  it('keeps the deck build and the app agreeing on the tier list', () => {
    // scripts/build_deck.py stamps rarity and its XP into herbs.json. If the two lists
    // diverge the build script would emit a tier the app cannot render.
    const script = readFileSync('scripts/build_deck.py', 'utf8');
    const declared = script.match(/^RARITIES = \[(.*)\]$/m);
    expect(declared, 'build_deck.py no longer declares RARITIES').not.toBeNull();
    const fromScript = [...(declared?.[1] ?? '').matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(fromScript).toEqual([...RARITIES]);
  });
});
