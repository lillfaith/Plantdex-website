import type { AccentName } from '@/components/ui/accents';

/**
 * A colour identity for each achievement.
 *
 * THE SEVEN ARE THE DECK'S OWN. `globals.css` carries a ramp sampled down the middle of the
 * printed card backs, and `accents.ts` already names them. Nothing is invented here and
 * nothing is added to the theme — this only decides which existing shade an achievement
 * wears, so nineteen pills read as a set of distinct things rather than one repeated thing.
 *
 * TRIM, NOT A REPAINT. The shade is a border, an icon tint and a faint wash. Whether an
 * achievement is EARNED is carried by gold, exactly as CLAUDE.md requires — "gold stays the
 * restrained one: display type and earned state, never a chip fill". So colour says which
 * achievement this is, and gold says whether you have it. Two signals, two channels, and
 * neither has to be read off the other.
 *
 * KEYED BY ID, NOT BY POSITION. `ACHIEVEMENTS[i] -> SHADES[i % 7]` would look identical
 * today and reshuffle every shade after any insertion — a cosmetic change nobody asked for,
 * arriving as a side effect of adding an achievement. Hashing the id means a given
 * achievement keeps its colour for as long as it keeps its name.
 */
const SHADES: AccentName[] = [
  'lilac',
  'pink',
  'orchid',
  'mauve',
  'violet',
  'purple',
  'indigo',
];

export function achievementShade(id: string): AccentName {
  // FNV-1a, small and stable. Any spread would do; what matters is that it does not depend
  // on where the achievement sits in the array.
  let hash = 0x811c9dc5;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return SHADES[hash % SHADES.length]!;
}

export const ACHIEVEMENT_SHADES = SHADES;
