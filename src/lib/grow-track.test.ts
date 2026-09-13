import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FIELD_LOG_TRIGGER_ID, GROW_STEP_IDS, growCtaLabel, growTrack } from './grow-track';
import { SIGHTINGS_FOR_MASTERY, qualifiesForMastery } from './mastery';
import { emptyState } from './herbdex-state';
import { FIELD_CARDS } from './field-cards';
import type { HerbdexState } from './types';

const HERB = 'taraxacum-officinale';
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

const state = (over: Partial<HerbdexState> = {}): HerbdexState => ({ ...emptyState(), ...over });
const at = '2026-09-01T12:00:00.000Z';
const step = (track: ReturnType<typeof growTrack>, id: string) =>
  track?.steps.find((s) => s.id === id);

describe('the growth quest is derived, never a second checklist', () => {
  it('asks exactly the conditions mastery asks, and agrees with it', () => {
    /*
     * THE RULE THIS MODULE EXISTS TO KEEP. The panel may not claim a step is done that
     * `qualifiesForMastery` does not count, and may not miss one it does. Swept across every
     * combination of the three records rather than spot-checked, because "all three steps
     * done" and "qualifies" are two expressions of one predicate and the only useful
     * assertion is that they can never disagree.
     */
    for (const learned of [false, true]) {
      for (const sightings of [0, SIGHTINGS_FOR_MASTERY]) {
        const world = state({
          discoveries: { [HERB]: at },
          learned: learned ? { [HERB]: at } : {},
        });
        const track = growTrack(world, HERB, sightings);
        const allDone = track!.steps.every((s) => s.done);
        expect(
          allDone,
          `steps disagree with qualifiesForMastery at learned=${learned} sightings=${sightings}`,
        ).toBe(qualifiesForMastery(world, HERB, sightings));
      }
    }
  });

  it('draws nothing before the plant has been found', () => {
    /*
     * SWEPT OVER THE REACHABLE STATES ONLY, and the first draft of the test above was not.
     * It also generated `learned` WITHOUT `discovered` and expected no track — but
     * `stageFor` reads `learned` first, so it returns a stage and the track renders. That is
     * correct: `applyLearned` refuses a herb with no discovery (herbdex-reducer.ts), so the
     * combination cannot exist outside a hand-built fixture. Asserting on an impossible state
     * tests the fixture, not the product.
     */
    expect(growTrack(state(), HERB, 0)).toBeNull();
    expect(growTrack(state(), HERB, SIGHTINGS_FOR_MASTERY)).toBeNull();
  });

  it('marks the first unfinished step as the one to act on, and never a later one', () => {
    const track = growTrack(state({ discoveries: { [HERB]: at } }), HERB, 0);
    expect(step(track, 'found')?.done).toBe(true);
    expect(step(track, 'learn')?.current).toBe(true);
    // "Then", not "Next" and not locked — see the note on GrowStep.current.
    expect(step(track, 'sighting')?.current).toBe(false);
    expect(track!.steps.filter((s) => s.current)).toHaveLength(1);
  });

  it('leaves no current step once every requirement is met', () => {
    // What makes the finished panel show a state rather than another button.
    const track = growTrack(
      state({ discoveries: { [HERB]: at }, learned: { [HERB]: at }, mastered: { [HERB]: at } }),
      HERB,
      SIGHTINGS_FOR_MASTERY,
    );
    expect(track!.steps.some((s) => s.current)).toBe(false);
    expect(track!.complete).toBe(true);
  });

  it('tells the truth when a sighting was logged before the card was learned', () => {
    /*
     * THE STATE THE WORDING WAS CHANGED FOR. `qualifiesForMastery` counts every sighting for
     * the species with no date comparison, so one logged in spring satisfies the third
     * condition for a check passed in autumn. Telling that player to go and record a sighting
     * would be issuing an instruction they have already completed.
     */
    const track = growTrack(state({ discoveries: { [HERB]: at } }), HERB, 1);
    const sighting = step(track, 'sighting');
    expect(sighting?.done).toBe(true);
    expect(sighting?.note).toMatch(/already logged/);
    expect(sighting?.note).toMatch(/pass the card check/);
    // And the step the player should act on is the quiz, not the sighting.
    expect(step(track, 'learn')?.current).toBe(true);
  });

  it('never tells a player to "find it again", which is not the rule', () => {
    for (const sightings of [0, 1, 5]) {
      for (const learned of [false, true]) {
        const track = growTrack(
          state({ discoveries: { [HERB]: at }, ...(learned ? { learned: { [HERB]: at } } : {}) }),
          HERB,
          sightings,
        );
        const notes = track!.steps.map((s) => `${s.label} ${s.note ?? ''}`).join(' ');
        expect(notes, 'the panel describes a rule the reducer does not enforce').not.toMatch(
          /find it again/i,
        );
      }
    }
  });

  it('draws no track for a card mastery does not cover', () => {
    /*
     * Case 5. `applyLearned` refuses a Field Card and returns the same state object, so a
     * "learn the card" step for one would offer a stage the reducer silently declines — the
     * exact bug `MasteryTrack` records having shipped once.
     */
    const [fieldCard] = FIELD_CARDS;
    expect(fieldCard, 'expected at least one Field Card to test against').toBeDefined();
    const found = state({ discoveries: { [fieldCard!.id]: at } });
    expect(growTrack(found, fieldCard!.id, 0)).toBeNull();
    expect(growTrack(found, 'not-a-real-herb', 0)).toBeNull();
  });

  it('offers a CTA at every stage that has one, and a state at the one that does not', () => {
    expect(growCtaLabel('discovered')).toBe('Grow your sprite');
    expect(growCtaLabel('learned')).toBe('Keep growing');
    expect(growCtaLabel('mastered')).toBeNull();
  });

  it('names three steps and keeps their order', () => {
    expect([...GROW_STEP_IDS]).toEqual(['found', 'learn', 'sighting']);
    const track = growTrack(state({ discoveries: { [HERB]: at } }), HERB, 0);
    expect(track!.steps.map((s) => s.id)).toEqual([...GROW_STEP_IDS]);
  });
});

describe('the growth panel points at actions that actually exist', () => {
  const TRACK = strip(readFileSync('src/components/herbdex/MasteryTrack.tsx', 'utf8'));
  const CTA = strip(readFileSync('src/components/herbdex/GrowSpriteCta.tsx', 'utf8'));
  const LOG = strip(readFileSync('src/components/journal/MySightings.tsx', 'utf8'));
  const GARDEN = strip(readFileSync('src/components/garden/GardenView.tsx', 'utf8'));

  it('never routes the sighting step at the scanner', () => {
    /*
     * THE DEAD END THIS WHOLE FLOW WAS AUDITED TO AVOID. Scanning a plant already in the
     * collection records nothing — `addSighting` has exactly one call site in the app, the
     * Field Log form — so a "find it again" button pointed at /scan would look like progress,
     * produce none, and leave the plant unable to flower.
     */
    expect(TRACK, 'the growth panel must not send a player to the scanner').not.toMatch(
      /["'`]\/scan/,
    );
  });

  it('reaches the Field Log through the id the Field Log actually carries', () => {
    expect(TRACK).toContain('FIELD_LOG_TRIGGER_ID');
    expect(LOG).toContain('id={FIELD_LOG_TRIGGER_ID}');
    // Imported at both ends, so renaming it is a build error rather than a silent no-op.
    expect(TRACK).toMatch(/import \{[^}]*FIELD_LOG_TRIGGER_ID[^}]*\} from '@\/lib\/grow-track'/);
    expect(LOG).toMatch(/import \{[^}]*FIELD_LOG_TRIGGER_ID[^}]*\} from '@\/lib\/grow-track'/);
    expect(FIELD_LOG_TRIGGER_ID).toBe('log-sighting-trigger');
  });

  it('sends the hero CTA and the Garden tile to the one anchor the track owns', () => {
    expect(CTA).toContain('#card-mastery');
    expect(GARDEN).toContain('#card-mastery');
    expect(TRACK, 'the anchor must still be on the panel both of them target').toContain(
      "id=\"card-mastery\"",
    );
  });

  it('keeps every threshold in mastery.ts', () => {
    // The panel reads `growTrack`; it must not re-derive "how many sightings" for itself.
    expect(TRACK).not.toContain('SIGHTINGS_FOR_MASTERY');
    expect(CTA).not.toContain('SIGHTINGS_FOR_MASTERY');
  });

  it('mounts the knowledge check unconditionally, with only its trigger gated', () => {
    /*
     * Unchanged and must stay so: passing the check advances the stage, which re-renders
     * everything around it. Mounted inside a stage branch, its own result dialog is torn
     * down while still on screen — CLAUDE.md records this biting twice.
     */
    expect(TRACK).toMatch(/<KnowledgeCheck herb=\{herb\} showTrigger=\{learnStepIsNext\} \/>/);
  });
});
