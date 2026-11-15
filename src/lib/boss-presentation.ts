/**
 * HOW A QUESTION'S ANSWERS ARE DRAWN, kept apart from what they say.
 *
 * CLIENT-ONLY, AND NOT PART OF THE SERVER'S SHARED MODULES. The server scores option indexes and
 * never needs a scene or an icon, so none of this reaches `supabase/functions`, and changing a
 * picture here can never change a score or need a redeploy. Like `boss-images.ts` it ships only
 * with the browser bundle behind the build-time flag.
 *
 * KEYED BY QUESTION ID AND THE OPTION'S OWN TEXT, never by position, because the order options are
 * shown in is the engine's business. A question with no entry here is drawn as plain text, which is
 * always correct. Adding a plant adds entries here; no screen names a plant.
 *
 * A scene is only a PICTURE OF A PLACE for the words next to it. It claims nothing the label does
 * not, and the label stays on the card.
 */
export type Ground = 'lawn' | 'meadow' | 'woodland' | 'marsh' | 'rock' | 'bare';
export type Light = 'full' | 'part' | 'deep';
export interface SceneTag {
  readonly ground: Ground;
  readonly light: Light;
}
export type IconName = 'drop' | 'wind' | 'paw' | 'dry' | 'sun' | 'tree' | 'yes' | 'no';
export interface IconTag {
  readonly name: IconName;
  /** An optional fill for icons that take one (a drop of water or of sap). */
  readonly tint?: string;
}

interface QuestionPresentation {
  readonly scenes?: Readonly<Record<string, SceneTag>>;
  readonly icons?: Readonly<Record<string, IconTag>>;
}

export const PRESENTATION: Readonly<Record<string, QuestionPresentation>> = {
  // Habitat
  'hb.lawn': {
    scenes: {
      'Deep woodland interiors': { ground: 'woodland', light: 'deep' },
      'Lawns and gardens': { ground: 'lawn', light: 'full' },
      'Salt marshes': { ground: 'marsh', light: 'full' },
    },
  },
  'hb.sunny': {
    scenes: {
      'Full sun': { ground: 'lawn', light: 'full' },
      'Deep shade': { ground: 'woodland', light: 'deep' },
      'Partial shade': { ground: 'lawn', light: 'part' },
    },
  },
  'hb.disturbed': {
    scenes: {
      'Undisturbed old woodland': { ground: 'woodland', light: 'part' },
      'Undisturbed native prairie': { ground: 'meadow', light: 'full' },
      'Disturbed ground': { ground: 'bare', light: 'full' },
    },
  },
  // Knowledge choices with a simple picture to match the words
  'ps.sap': {
    icons: {
      'Clear water': { name: 'drop', tint: '#8fd0ff' },
      'Milky white sap': { name: 'drop', tint: '#fff7e6' },
      'Nothing, it is dry': { name: 'dry' },
    },
  },
  'tr.wind': {
    icons: {
      'Mostly by water': { name: 'drop', tint: '#8fd0ff' },
      'Mostly on the wind': { name: 'wind' },
      'Mostly on animal fur': { name: 'paw' },
    },
  },
};

/**
 * Names for the parts of a PARTICULAR photograph where the general label would be wrong: the same
 * region id is the "flower head" in a bloom and the "seed head" in a seed photograph.
 */
export const REGION_LABEL_OVERRIDES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'd-seed-stalk': { head: 'Seed head' },
  'd-plant-stalk': { leaves: 'Ring of leaves' },
};

export function sceneFor(questionId: string, optionText: string): SceneTag | undefined {
  return PRESENTATION[questionId]?.scenes?.[optionText];
}

export function iconFor(questionId: string, optionText: string): IconTag | undefined {
  return PRESENTATION[questionId]?.icons?.[optionText];
}

/** A scene for EVERY option, or none: a half-drawn question would look like a broken one. */
export function sceneSetFor(questionId: string, options: readonly string[]): readonly SceneTag[] | null {
  const scenes = options.map((text) => sceneFor(questionId, text));
  return scenes.every((s): s is SceneTag => s !== undefined) ? scenes : null;
}
