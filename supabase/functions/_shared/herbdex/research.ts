import type { Herb, HerbdexState, Rarity, Season } from './types.ts';
import { SEASONS } from './types.ts';
import { getHerb, HERBS, herbsInDeckOrder, SEASON_LABEL } from './deck.ts';
import { HABITATS, HABITAT_LABEL, habitatOf, type HabitatClass } from './habitat.ts';
import { RESEARCH_XP, type ResearchKind } from './progression.ts';
import { hash, seeded, shuffle } from './rng.ts';

/**
 * FIELD RESEARCH — small, concrete reasons to pick the deck up and go outside.
 *
 * Two rules shape everything in this file.
 *
 * 1. PROGRESS IS DERIVED, COMPLETION IS RECORDED. A step measures itself from the current
 *    world; no task stores "2 of 3 done", so nothing can drift and no sighting call-site
 *    has to remember to increment anything. Completion, once earned, is written down and
 *    never revoked — a challenge finished in spring must not un-finish in summer, and a
 *    task completed by logging a sighting must survive that sighting being deleted. This
 *    is the same split that makes `mastered` a stored record in src/lib/mastery.ts.
 *
 * 2. EVERY TASK COMES FROM WHAT IS PRINTED ON THE CARDS. Season, encounter rate and card
 *    number are the deck's own data. Nothing here asks the player to find plants grouped
 *    by a property the cards do not carry — a "pollinator challenge" would mean deciding
 *    for myself which species count, which is inventing botany. When verified data for
 *    such a grouping exists, it slots in here as another task; until then it does not
 *    exist rather than existing as a guess.
 *
 * Deliberately absent: currency, streaks, countdowns, and anything that punishes not
 * playing. A task that has been offered stays open until it is done.
 */

// --- The world a task measures itself against ---------------------------------

export interface ResearchWorld {
  state: HerbdexState;
  /** Sightings logged per species. Mastery and several tasks both read this. */
  sightingCounts: Record<string, number>;
  sightingsTotal: number;
  distinctSightingSpecies: number;
}

export function buildWorld(
  state: HerbdexState,
  sightingCounts: Record<string, number>,
): ResearchWorld {
  let sightingsTotal = 0;
  let distinctSightingSpecies = 0;
  for (const count of Object.values(sightingCounts)) {
    if (count > 0) {
      sightingsTotal += count;
      distinctSightingSpecies += 1;
    }
  }
  return { state, sightingCounts, sightingsTotal, distinctSightingSpecies };
}

// --- Task shape ----------------------------------------------------------------

export interface ResearchStep {
  id: string;
  label: string;
  target: number;
  /** Pure. Reads the world, mutates nothing, and is safe to call on every render. */
  measure: (world: ResearchWorld) => number;
}

export interface ResearchTask {
  id: string;
  kind: ResearchKind;
  title: string;
  description: string;
  /** Cards this task is about, so the UI can show the real artwork. May be empty. */
  herbIds: string[];
  steps: ResearchStep[];
}

/** XP is never written on a task — it comes from the table in progression.ts. */
export function xpForTask(task: ResearchTask): number {
  return RESEARCH_XP[task.kind];
}

// --- Measuring -----------------------------------------------------------------

function countMatching(
  record: Record<string, string>,
  predicate: (herb: Herb) => boolean,
): number {
  let n = 0;
  for (const id of Object.keys(record)) {
    const herb = getHerb(id);
    if (herb && predicate(herb)) n += 1;
  }
  return n;
}

const inSeason = (season: Season) => (herb: Herb) => herb.season === season;
const ofRarity = (rarity: Rarity) => (herb: Herb) => herb.rarity === rarity;
/** Primary habitat only, matching the collection filter and the card's own chip. */
const ofHabitat = (habitat: HabitatClass) => (herb: Herb) =>
  habitatOf(herb.id)?.primary === habitat;

/** How many cards in the physical deck could ever satisfy a predicate. */
export function deckSupply(predicate: (herb: Herb) => boolean): number {
  return HERBS.filter(predicate).length;
}

// --- Seasonal research ----------------------------------------------------------

/**
 * Targets are sized against what the deck ACTUALLY contains, never against a round number
 * that reads well. The deck holds 22 summer cards, 14 spring, 8 autumn — and exactly one
 * winter card (Pine, #41). "Discover 3 winter plants" is not a hard challenge, it is an
 * impossible one, and a player would rightly read it as the app being broken.
 */
function seasonalTask(season: Season): ResearchTask {
  const cards = herbsInDeckOrder().filter(inSeason(season));
  const supply = cards.length;
  const label = SEASON_LABEL[season];

  const discoverTarget = Math.min(3, supply);
  const learnTarget = Math.min(2, supply);
  const masterTarget = Math.min(1, supply);

  const steps: ResearchStep[] = [
    {
      id: 'discover',
      label:
        discoverTarget === 1
          ? `Discover the ${label.toLowerCase()} card`
          : `Discover ${discoverTarget} ${label.toLowerCase()} plants`,
      target: discoverTarget,
      measure: (world) => countMatching(world.state.discoveries, inSeason(season)),
    },
    {
      id: 'learn',
      label:
        learnTarget === 1
          ? `Learn its card`
          : `Learn ${learnTarget} ${label.toLowerCase()} cards`,
      target: learnTarget,
      measure: (world) => countMatching(world.state.learned, inSeason(season)),
    },
    {
      id: 'master',
      label: `Master ${masterTarget} ${label.toLowerCase()} card`,
      target: masterTarget,
      measure: (world) => countMatching(world.state.mastered, inSeason(season)),
    },
  ];

  return {
    id: `seasonal:${season}`,
    kind: 'seasonal',
    title: `${label} Field Research`,
    description:
      supply === 1
        ? `One ${label.toLowerCase()} card in the deck. Find it, learn it, find it again.`
        : `${supply} cards, best found in ${label.toLowerCase()}.`,
    herbIds: cards.map((herb) => herb.id),
    steps,
  };
}

// --- Collection challenges -------------------------------------------------------

/**
 * The five plants AGENTS.md names as the Backyard Challenge. Every one of them is a real
 * card in this deck and every one is Common — checked against the deck data rather than
 * assumed. Card numbers in comments so a future deck revision that renumbers or drops one
 * is caught by the test that asserts each id resolves.
 */
const BACKYARD_IDS = [
  'taraxacum-officinale', // #01 Dandelion
  'trifolium-pratense', // #10 Red Clover
  'viola-sororia', // #12 Wild Violet
  'stellaria-media', // #13 Chickweed
  'plantago-major', // #14 Broad Leaf Plantain
] as const;

function backyardTask(): ResearchTask {
  return {
    id: 'collection:backyard',
    kind: 'collection',
    title: 'Backyard Collection',
    description: 'Five plants that turn up in a lawn, a verge or a path edge.',
    herbIds: [...BACKYARD_IDS],
    // One step per card, so the challenge reads as the checklist it is and each row can
    // show that card's artwork.
    steps: BACKYARD_IDS.map((herbId) => ({
      id: herbId,
      label: getHerb(herbId)?.commonName ?? herbId,
      target: 1,
      measure: (world) => (world.state.discoveries[herbId] ? 1 : 0),
    })),
  };
}

function hardToFindTask(): ResearchTask {
  const rareTarget = Math.min(5, deckSupply(ofRarity('Rare')));
  const epicTarget = Math.min(1, deckSupply(ofRarity('Epic')));

  return {
    id: 'collection:hard-to-find',
    kind: 'collection',
    title: 'Hard to Find',
    description: 'The cards the deck rates hardest to come across.',
    herbIds: herbsInDeckOrder()
      .filter((herb) => herb.rarity === 'Rare' || herb.rarity === 'Epic')
      .map((herb) => herb.id),
    steps: [
      {
        id: 'rare',
        label: `Discover ${rareTarget} Rare plants`,
        target: rareTarget,
        measure: (world) => countMatching(world.state.discoveries, ofRarity('Rare')),
      },
      {
        id: 'epic',
        label: `Discover ${epicTarget} Epic plant`,
        target: epicTarget,
        measure: (world) => countMatching(world.state.discoveries, ofRarity('Epic')),
      },
    ],
  };
}

/**
 * One standing challenge per habitat class.
 *
 * SIZED AGAINST REAL SUPPLY, like the seasonal tasks, and for the same reason: a target the
 * deck cannot meet reads as the app being broken. Wetland holds only six primaries against
 * Woodland's ten, so every target is clamped to what actually exists.
 *
 * WHY NOT SIMPLY "FIND ONE". A `collection` task pays 250 XP — more than discovering a
 * Common herb — so a single-find task would pay two and a half times the thing it asks for,
 * five times over. The "first species from each habitat" beat is already covered, correctly
 * and for free, by the six habitat ACHIEVEMENTS. This is the longer challenge behind them,
 * and its first step still progresses on that very first find.
 */
function habitatTask(habitat: HabitatClass): ResearchTask {
  const cards = herbsInDeckOrder().filter(ofHabitat(habitat));
  const supply = cards.length;
  const label = HABITAT_LABEL[habitat];
  const discoverTarget = Math.min(3, supply);
  const learnTarget = Math.min(1, supply);

  return {
    id: `collection:habitat-${habitat}`,
    kind: 'collection',
    title: `${label} Survey`,
    description: `Get to know the plants of one kind of ground.`,
    herbIds: cards.map((herb) => herb.id),
    steps: [
      {
        id: 'discover',
        label: `Discover ${discoverTarget} ${label} ${discoverTarget === 1 ? 'plant' : 'plants'}`,
        target: discoverTarget,
        measure: (world) => countMatching(world.state.discoveries, ofHabitat(habitat)),
      },
      {
        id: 'learn',
        label: `Learn ${learnTarget} ${label} card`,
        target: learnTarget,
        measure: (world) => countMatching(world.state.learned, ofHabitat(habitat)),
      },
    ],
  };
}

/** Every long-running task. Always available — none of these expire. */
export const STANDING_TASKS: readonly ResearchTask[] = [
  ...SEASONS.map(seasonalTask),
  backyardTask(),
  hardToFindTask(),
  ...HABITATS.map(habitatTask),
];

// --- Daily research ---------------------------------------------------------------

/**
 * Every daily is about ONE specific card, which is the point: the deck is the product, so
 * a prompt to go outside should name the card it is about and show its art.
 *
 * A template is only ever offered for a card where it is both possible and not already
 * done — you cannot be told to learn a card you have not found, and you are never handed a
 * task you already satisfied, which is what stops dailies from paying out for nothing.
 */
interface DailyTemplate {
  id: string;
  verb: string;
  title: (herb: Herb) => string;
  description: (herb: Herb) => string;
  stepLabel: (herb: Herb) => string;
  /** Already true for this card — never offer it. */
  satisfied: (herb: Herb, world: ResearchWorld) => boolean;
  /** Meaningful for this card right now (prerequisites met). */
  available: (herb: Herb, world: ResearchWorld) => boolean;
}

const cardRef = (herb: Herb) => `#${String(herb.cardNumber).padStart(2, '0')}`;

const DAILY_TEMPLATES: readonly DailyTemplate[] = [
  {
    id: 'find',
    verb: 'Find',
    title: (herb) => `Find ${herb.commonName}`,
    description: (herb) =>
      `Card ${cardRef(herb)} · ${herb.rarity} · best found in ${SEASON_LABEL[herb.season].toLowerCase()}.`,
    stepLabel: (herb) => `Discover ${herb.commonName}`,
    satisfied: (herb, world) => Boolean(world.state.discoveries[herb.id]),
    available: () => true,
  },
  {
    id: 'learn',
    verb: 'Study',
    title: (herb) => `Study ${herb.commonName}`,
    description: (herb) => `Read card ${cardRef(herb)}, then pass its check.`,
    stepLabel: (herb) => `Learn ${herb.commonName}’s card`,
    satisfied: (herb, world) => Boolean(world.state.learned[herb.id]),
    // Learning a card you have not found is not a challenge, it is a dead end.
    available: (herb, world) => Boolean(world.state.discoveries[herb.id]),
  },
  {
    id: 'revisit',
    verb: 'Revisit',
    title: (herb) => `Go back to ${herb.commonName}`,
    description: (herb) => `Find card ${cardRef(herb)} again and log what you saw.`,
    stepLabel: (herb) => `Log a sighting of ${herb.commonName}`,
    satisfied: (herb, world) => (world.sightingCounts[herb.id] ?? 0) > 0,
    available: (herb, world) => Boolean(world.state.discoveries[herb.id]),
  },
  {
    id: 'master',
    verb: 'Master',
    title: (herb) => `Master ${herb.commonName}`,
    description: (herb) => `Card ${cardRef(herb)} is learned. One more sighting completes it.`,
    stepLabel: (herb) => `Master ${herb.commonName}’s card`,
    satisfied: (herb, world) => Boolean(world.state.mastered[herb.id]),
    available: (herb, world) => Boolean(world.state.learned[herb.id]),
  },
];

const TEMPLATE_BY_ID = new Map(DAILY_TEMPLATES.map((template) => [template.id, template]));

function dailyTask(template: DailyTemplate, herb: Herb): ResearchTask {
  return {
    id: `daily:${template.id}:${herb.id}`,
    kind: 'daily',
    title: template.title(herb),
    description: template.description(herb),
    herbIds: [herb.id],
    steps: [
      {
        id: template.id,
        label: template.stepLabel(herb),
        target: 1,
        measure: (world) => (template.satisfied(herb, world) ? 1 : 0),
      },
    ],
  };
}

/** How many daily tasks sit on the board at once. */
export const DAILY_BOARD_SIZE = 3;

/**
 * Pick daily tasks to fill the board.
 *
 * Seeded by the date, so opening the page five times in a day offers the same three tasks
 * rather than rerolling until something easy appears. Candidates already open or already
 * completed are excluded, and so is anything the player has already done — the board is a
 * list of things left to do, not a list of things to be paid for twice.
 */
export function pickDailyTasks(
  world: ResearchWorld,
  dateKey: string,
  exclude: ReadonlySet<string>,
  count: number = DAILY_BOARD_SIZE,
): ResearchTask[] {
  const rand = seeded(hash(dateKey));
  const candidates: ResearchTask[] = [];

  for (const template of DAILY_TEMPLATES) {
    for (const herb of HERBS) {
      if (template.satisfied(herb, world)) continue;
      if (!template.available(herb, world)) continue;
      const task = dailyTask(template, herb);
      if (exclude.has(task.id)) continue;
      candidates.push(task);
    }
  }

  // Spread the picks across templates rather than handing out three "find" tasks: group by
  // template, shuffle each group, then deal round-robin.
  const byTemplate = new Map<string, ResearchTask[]>();
  for (const task of candidates) {
    const templateId = task.id.split(':')[1]!;
    const bucket = byTemplate.get(templateId);
    if (bucket) bucket.push(task);
    else byTemplate.set(templateId, [task]);
  }

  const buckets = shuffle([...byTemplate.values()], rand).map((bucket) =>
    shuffle(bucket, rand),
  );

  const picked: ResearchTask[] = [];
  for (let round = 0; picked.length < count; round += 1) {
    let dealt = false;
    for (const bucket of buckets) {
      if (picked.length >= count) break;
      const task = bucket[round];
      if (!task) continue;
      picked.push(task);
      dealt = true;
    }
    if (!dealt) break;
  }

  return picked;
}

// --- Resolving an id back to a task -------------------------------------------------

const STANDING_BY_ID = new Map(STANDING_TASKS.map((task) => [task.id, task]));

/**
 * Resolve a stored task id. Returns undefined for anything unrecognised, which is what
 * makes a tampered or stale id worth zero XP rather than an error.
 */
export function researchTaskById(id: string): ResearchTask | undefined {
  const standing = STANDING_BY_ID.get(id);
  if (standing) return standing;

  const [prefix, templateId, herbId] = id.split(':');
  if (prefix !== 'daily' || !templateId || !herbId) return undefined;

  const template = TEMPLATE_BY_ID.get(templateId);
  const herb = getHerb(herbId);
  if (!template || !herb) return undefined;

  return dailyTask(template, herb);
}

// --- Progress -----------------------------------------------------------------------

export interface StepProgress {
  step: ResearchStep;
  current: number;
  target: number;
  done: boolean;
}

export interface TaskProgress {
  task: ResearchTask;
  steps: StepProgress[];
  current: number;
  target: number;
  fraction: number;
  /** Every step is met right now. */
  qualifies: boolean;
  /** Recorded completion, if it has ever been earned. */
  completedAt?: string;
  /** What the UI shows as "done" — recorded, or qualifying and about to be recorded. */
  done: boolean;
}

export function progressForTask(task: ResearchTask, world: ResearchWorld): TaskProgress {
  const steps: StepProgress[] = task.steps.map((step) => {
    const current = Math.max(0, Math.min(step.target, step.measure(world)));
    return { step, current, target: step.target, done: current >= step.target };
  });

  const current = steps.reduce((sum, entry) => sum + entry.current, 0);
  const target = steps.reduce((sum, entry) => sum + entry.target, 0);
  const qualifies = steps.every((entry) => entry.done);
  const completedAt = world.state.research[task.id];

  return {
    task,
    steps,
    current,
    target,
    fraction: target > 0 ? current / target : 0,
    qualifies,
    completedAt,
    done: Boolean(completedAt) || qualifies,
  };
}

/** Today, in the viewer's own timezone. Client-only — never call this while rendering on the server. */
export function localDateKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** The season the deck would call "now". Used only to order the seasonal list. */
export function currentSeason(now: Date = new Date()): Season {
  const month = now.getMonth();
  if (month <= 1 || month === 11) return 'winter';
  if (month <= 4) return 'spring';
  if (month <= 7) return 'summer';
  return 'autumn';
}
