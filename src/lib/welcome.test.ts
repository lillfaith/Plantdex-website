import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ACHIEVEMENTS, getAchievement } from './achievements';
import { FIELD_FRAMES } from './field-frames';
import { shouldShowWelcome } from './first-run';
import type { HerbdexState } from './types';

const WELCOME = readFileSync('src/components/start/WelcomeIntro.tsx', 'utf8');
const LAYOUT = readFileSync('src/app/layout.tsx', 'utf8');
const START = readFileSync('src/app/start/page.tsx', 'utf8');
const CELEBRATION = readFileSync('src/components/herbdex/DiscoveryCelebration.tsx', 'utf8');
const CSS = readFileSync('src/app/globals.css', 'utf8');

function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function stateWith(ids: string[]): HerbdexState {
  return {
    discoveries: Object.fromEntries(ids.map((id) => [id, '2026-01-01T00:00:00.000Z'])),
    learned: {},
    mastered: {},
    research: {},
    achievements: {},
  } as unknown as HerbdexState;
}

/**
 * The first-discovery reward is NOT new. `first-find` and the `amber-ring` frame already
 * existed; this work only surfaces them. These guard that nobody "completes" the feature by
 * adding a duplicate, which would double-award and — because both are pure predicates —
 * unlock retroactively for every existing player at once.
 */
describe('the first-discovery reward reuses what exists', () => {
  it('keeps the first-find achievement, with its id and name', () => {
    const badge = getAchievement('first-find');
    expect(badge).toBeDefined();
    expect(badge!.name).toBe('First Find');
  });

  it('pays the badge on the first discovery and never again', () => {
    const badge = getAchievement('first-find')!;
    expect(badge.isUnlocked(stateWith([]))).toBe(false);
    expect(badge.isUnlocked(stateWith(['taraxacum-officinale']))).toBe(true);
    // Still just unlocked, not unlocked twice: it is a boolean predicate, not a counter.
    expect(badge.isUnlocked(stateWith(['taraxacum-officinale', 'urtica-dioica']))).toBe(true);
  });

  it('keeps the amber-ring frame gated on that one achievement', () => {
    const frame = FIELD_FRAMES.find((entry) => entry.id === 'amber-ring');
    expect(frame).toBeDefined();
    expect(frame!.isUnlocked(stateWith([]))).toBe(false);
    expect(frame!.isUnlocked(stateWith(['taraxacum-officinale']))).toBe(true);
  });

  /*
   * A second badge or frame for the same event is the failure mode to prevent — and because
   * both are pure predicates, a duplicate would also unlock retroactively for every existing
   * player the moment it shipped.
   *
   * INTERSECTED ACROSS SEVERAL POSSIBLE FIRST SPECIES, which an earlier version of this test
   * got wrong by using one. A single dandelion also unlocks `habitat-wayside`, legitimately
   * — so "unlocks on a first discovery" is not the same question as "unlocks on ANY first
   * discovery". Only the latter identifies a rival to `first-find`.
   */
  const FIRST_SPECIES = [
    'taraxacum-officinale',
    'urtica-dioica',
    'plantago-major',
    'achillea-millefolium',
    'quercus-spp',
  ];

  it('adds no rival first-discovery achievement', () => {
    const universal = ACHIEVEMENTS.filter((entry) =>
      FIRST_SPECIES.every((id) => entry.isUnlocked(stateWith([id]))),
    ).filter((entry) => !entry.isUnlocked(stateWith([])));
    expect(universal.map((entry) => entry.id)).toEqual(['first-find']);
  });

  it('adds no rival first-discovery frame', () => {
    const universal = FIELD_FRAMES.filter((entry) =>
      FIRST_SPECIES.every((id) => entry.isUnlocked(stateWith([id]))),
    ).filter((entry) => !entry.isUnlocked(stateWith([])));
    expect(universal.map((entry) => entry.id)).toEqual(['amber-ring']);
  });

  // Named for the thing we were asked not to build, so the intent survives a refactor.
  it('introduces no Founding Forager duplicate', () => {
    const ids = [...ACHIEVEMENTS.map((a) => a.id), ...FIELD_FRAMES.map((f) => f.id)];
    expect(ids.filter((id) => /founding/i.test(id))).toEqual([]);
  });
});

describe('the welcome awards nothing', () => {
  /*
   * The same argument `seed-shelf.test.ts` makes about the shelf being unable to pay XP: a
   * module that cannot import the reducer cannot call it. The welcome names rewards; it must
   * never be able to grant one.
   */
  it('imports no reducer, store or writer', () => {
    for (const forbidden of [
      'herbdex-reducer',
      'herbdex-store',
      'sightings-store',
      'seed-shelf-store',
      'unlocked-field-cards',
      'reveals',
      'supabase',
    ]) {
      expect(
        WELCOME.includes(`from '@/lib/${forbidden}`),
        `the welcome imports ${forbidden}`,
      ).toBe(false);
    }
  });

  it('calls nothing that records a find, a card or a level', () => {
    for (const call of ['discover(', 'revealHerb(', 'recordUnlocks(', 'markLearned(']) {
      expect(code(WELCOME).includes(call), `the welcome calls ${call}`).toBe(false);
    }
  });

  // It reads the collection to decide whether this player is new, and that is all it reads.
  it('reads the collection only through the published count', () => {
    expect(WELCOME).toContain('discoveredCount');
    expect(WELCOME).toContain('shouldShowWelcome');
  });
});

describe('/start stays a stateless QR destination', () => {
  // entry-point.test.ts owns the full ban; this asserts the welcome did not land there.
  it('does not mount the welcome', () => {
    expect(START).not.toContain('WelcomeIntro');
  });

  it('is mounted in the app shell instead', () => {
    expect(LAYOUT).toContain('WelcomeIntro');
    // Inside both providers: it needs the collection count and the account scope.
    expect(LAYOUT.indexOf('<HerbdexProvider>')).toBeLessThan(LAYOUT.indexOf('<WelcomeIntro />'));
  });
});

describe('what the welcome says', () => {
  it('carries the opening copy', () => {
    expect(WELCOME).toContain('Welcome to Plantdex');
    expect(WELCOME).toContain('Every great herbalist starts with a single discovery.');
    expect(WELCOME).toContain('Begin Your Adventure');
  });

  it('introduces the Field Journal and the first objective', () => {
    expect(WELCOME).toContain('Your Field Journal');
    expect(WELCOME).toContain('Your First Discovery');
    expect(WELCOME).toMatch(/Find and identify your first medicinal plant/);
  });

  /*
   * The rows read the real definitions. Restating a badge's description or a frame's
   * condition here would let this screen promise something the predicate does not pay —
   * the same reason the cosmetics cabinet prints `condition` rather than its own copy.
   */
  it('names the rewards from their own definitions', () => {
    expect(WELCOME).toContain('badge.description');
    expect(WELCOME).toContain('amberRing.condition');
    expect(WELCOME).toContain('amberRing.ring');
  });

  // A number in a button is a promise, and which plant somebody finds decides what it pays.
  it('prints no XP figure', () => {
    expect(code(WELCOME)).not.toMatch(/\+\s*\d+\s*XP/);
    expect(code(WELCOME)).not.toMatch(/\d+\s*XP/);
  });

  it('is skippable by button and by Escape, and both record the dismissal', () => {
    expect(WELCOME).toMatch(/>\s*Skip/);
    expect(WELCOME).toContain('onCancel');
    expect(code(WELCOME).match(/dismiss\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(WELCOME).toContain('markWelcomeSeen');
  });

  // The demonstration must not read as a way to earn anything.
  it('labels the look-around as recording nothing', () => {
    expect(WELCOME).toMatch(/records no discovery and earns no XP/);
  });

  it('uses exactly one dialog', () => {
    expect(code(WELCOME).match(/<dialog/g) ?? []).toHaveLength(1);
  });
});

describe('the first discovery feels bigger, in the same dialog', () => {
  it('carries the headline', () => {
    expect(CELEBRATION).toContain('Your Herbalist Journey Begins!');
  });

  /*
   * DERIVED FROM THE AWARD, NOT COUNTED. `first-find` enters `newAchievementIds` exactly once
   * in an account's life — on the discovery taking the count from nothing to one — so the
   * reducer has already decided this idempotently and a repeat cannot re-enter the list.
   */
  it('derives first-ness from the achievement the reducer awarded', () => {
    expect(code(CELEBRATION)).toContain("result.newAchievementIds.includes('first-find')");
  });

  it('shows the frame only on the first discovery', () => {
    expect(code(CELEBRATION)).toMatch(/firstDiscovery\s*\?\s*\(?\s*FIELD_FRAMES\.find/);
  });

  it('adds no second dialog', () => {
    expect(code(CELEBRATION).match(/<dialog/g) ?? []).toHaveLength(0);
  });

  // Frames are profile cosmetics; `rarity` is printed on the card and read by the aura, the
  // badge and the foil. The celebration must not blur them.
  it('says the cosmetic changes no rarity', () => {
    expect(CELEBRATION).toMatch(/changes no card&rsquo;s rarity/);
  });

  it('keeps the haptics ceiling at two', () => {
    expect(code(CELEBRATION).match(/haptic\(/g) ?? []).toHaveLength(2);
  });
});

/**
 * THE ANONYMOUS → ACCOUNT TRANSITION, which is where this gate was wrong first.
 *
 * A new account is empty until the local-progress import runs, so a player who dismissed the
 * welcome and then signed up met it again — on /account, which already has
 * `ImportLocalProgressDialog` mounted, so two modals would have opened together.
 */
describe('signing in does not replay the welcome', () => {
  it('seeds the account flag from the device, once', () => {
    expect(WELCOME).toContain('welcomeSeen(ANONYMOUS_SCOPE)');
    expect(WELCOME).toMatch(/markWelcomeSeen\(user\.id\)/);
  });

  // One-time and never overwriting: it only ever sets a flag that was unset, which is the
  // arrangement the player profile already uses for seeding from a device.
  it('writes only when the account has no flag of its own', () => {
    expect(code(WELCOME)).toMatch(/if \(welcomeSeen\(user\.id\)\) return;/);
  });

  it('never lets one account read another account flag', () => {
    // The device scope is the only cross-scope read, and it is write-forward only.
    const reads = code(WELCOME).match(/welcomeSeen\([^)]*\)/g) ?? [];
    for (const read of reads) {
      expect(read === 'welcomeSeen(user.id)' || read === 'welcomeSeen(ANONYMOUS_SCOPE)').toBe(true);
    }
  });

  // Once the import has run the count is non-zero, so the gate closes on its own.
  it('is closed by imported progress regardless of any flag', () => {
    expect(shouldShowWelcome({ ready: true, discoveredCount: 1, seen: false })).toBe(false);
  });
});

describe('reduced motion', () => {
  it('names every new animation explicitly rather than trusting the global collapse', () => {
    const reducedBlocks = CSS.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/g) ?? [];
    const joined = reducedBlocks.join('\n');
    for (const utility of ['welcome-greeter', 'first-find-bloom']) {
      expect(joined, `${utility} has no reduced-motion rule`).toContain(utility);
    }
  });

  // The Motion section's rule: nothing here is ambient.
  it('gives the new keyframes a bounded iteration count', () => {
    for (const utility of ['welcome-greeter', 'first-find-bloom']) {
      const block = CSS.match(new RegExp(`@utility ${utility} \\{[\\s\\S]*?\\n\\}`))?.[0] ?? '';
      expect(block).not.toContain('infinite');
    }
  });
});
