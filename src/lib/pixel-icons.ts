import { fromRows, gridToUri } from './pixel-art';

/**
 * THE HERBALISM ICON SET: hand-drawn pixel art, one shared map so a trait looks the same on
 * every plant that prints it.
 *
 * Trait badges are circular gold coins carrying a one-colour glyph, matching the circular
 * use icons printed on the cards (digestive, urinary, lungs, calm, heart, immune, bone,
 * wound, energy). Concepts the cards print no icon for get a new glyph in the same style.
 * Everything here is decorative: the word beside it carries the meaning.
 */

const INK = '#3b1d63';
const mirror = (halves: readonly string[]) => halves.map((h) => h + [...h].reverse().join(''));

const GLYPHS: Record<string, readonly string[]> = {
  urinary: [
    '   ##   ',
    '   ##   ',
    '  ####  ',
    ' ###### ',
    ' ## ### ',
    ' ## ### ',
    ' ###### ',
    '  ####  ',
  ],
  flame: [
    '   #    ',
    '  ##    ',
    '  ###  #',
    ' #### ##',
    ' ### ###',
    ' ## # ##',
    ' ###  ##',
    '  ####  ',
  ],
  snow: [
    '   ##   ',
    '#  ##  #',
    ' # ## # ',
    '  ####  ',
    '########',
    '  ####  ',
    ' # ## # ',
    '#  ##  #',
  ],
  digestive: [
    '  ####  ',
    ' ##  ## ',
    '##    ##',
    '## ## ##',
    '## ## ##',
    '##  # ##',
    ' ##   # ',
    '  ####  ',
  ],
  edible: [
    '    #   ',
    '   #    ',
    '  ## ## ',
    ' ###### ',
    ' ###### ',
    ' ###### ',
    '  ####  ',
    '        ',
  ],
  lungs: mirror(['   #', '   #', ' ## ', '### ', '### ', '### ', ' ## ', '    ']),
  moon: [
    '  ####  ',
    ' ###    ',
    '###     ',
    '###     ',
    '###     ',
    '###     ',
    ' ###  # ',
    '  ####  ',
  ],
  heart: mirror([' ## ', '####', '####', '####', ' ###', '  ##', '   #', '    ']),
  shield: mirror(['####', '####', '####', '####', ' ###', '  ##', '   #', '    ']),
  bone: [
    '     ## ',
    '    ####',
    '     ###',
    '    ### ',
    '   ###  ',
    '  ###   ',
    ' ####   ',
    ' ##     ',
  ],
  flower: mirror(['  ##', ' ###', '### ', '## #', '### ', ' ###', '  ##', '    ']),
  plus: [
    '   ##   ',
    '   ##   ',
    '   ##   ',
    '########',
    '########',
    '   ##   ',
    '   ##   ',
    '   ##   ',
  ],
  sparkle: mirror(['   #', '   #', '  ##', '####', '####', '  ##', '   #', '   #']),
  star: mirror(['   #', '  ##', '####', ' ###', '  ##', ' # #', '#  #', '    ']),
  tooth: mirror([' ###', '####', '####', '####', ' ###', ' ## ', ' ## ', '    ']),
  leaf: [
    '     ###',
    '   ## ##',
    '  ## ###',
    ' ## ####',
    ' ## ### ',
    '# ###   ',
    '##      ',
    '#       ',
  ],
  energy: [
    '    ### ',
    '   ###  ',
    '  ###   ',
    ' ###### ',
    '   ###  ',
    '  ###   ',
    ' ###    ',
    ' #      ',
  ],
};

export type TraitGlyph = keyof typeof GLYPHS;

const BADGE = 16;
function badgeGrid(glyph: readonly string[]) {
  const grid: (string | null)[][] = Array.from({ length: BADGE }, () => Array(BADGE).fill(null));
  for (let y = 0; y < BADGE; y += 1) {
    for (let x = 0; x < BADGE; x += 1) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d > 7.6) continue;
      grid[y]![x] = d > 6.4 ? '#b8841f' : '#ffd45c';
    }
  }
  [
    [3, 3],
    [4, 2],
    [2, 4],
    [5, 2],
  ].forEach(([x, y]) => (grid[y!]![x!] = '#fff0a8'));
  glyph.forEach((row, gy) =>
    [...row].forEach((c, gx) => {
      if (c === '#') grid[4 + gy]![4 + gx] = INK;
    }),
  );
  return grid;
}

/** The deck's own use words, in the order the card prints them, mapped to the same glyph. */
export const TRAIT_GLYPH_RULES: { match: RegExp; glyph: TraitGlyph }[] = [
  { match: /anti-?inflam|fever/i, glyph: 'flame' },
  { match: /cooling/i, glyph: 'snow' },
  { match: /urinary|diuretic/i, glyph: 'urinary' },
  { match: /digest|gut|prebiotic|laxative|nausea/i, glyph: 'digestive' },
  { match: /appetite/i, glyph: 'edible' },
  { match: /respirat|expectorant/i, glyph: 'lungs' },
  { match: /calm|anxiety|sleep|mood|nervous/i, glyph: 'moon' },
  {
    match: /circulat|blood|lymph|glucose|hormone|menopause|menstrual/i,
    glyph: 'heart',
  },
  {
    match: /immune|antimicrob|antiviral|anti-fungal|antioxid/i,
    glyph: 'shield',
  },
  { match: /bone|joint/i, glyph: 'bone' },
  { match: /allergy/i, glyph: 'flower' },
  { match: /wound|antisept|pain|headache/i, glyph: 'plus' },
  { match: /skin|itch|keratin|soothing|drawing/i, glyph: 'sparkle' },
  { match: /mineral|nutrient|vitamin/i, glyph: 'star' },
  { match: /oral/i, glyph: 'tooth' },
  { match: /liver|detox|astringent/i, glyph: 'leaf' },
];

export function glyphForTrait(trait: string): TraitGlyph | null {
  return TRAIT_GLYPH_RULES.find((r) => r.match.test(trait))?.glyph ?? null;
}

const cache = new Map<string, string>();
const memo = (key: string, make: () => string) => {
  let uri = cache.get(key);
  if (!uri) cache.set(key, (uri = make()));
  return uri;
};

export const traitBadge = (glyph: TraitGlyph | null) =>
  memo(`t:${glyph ?? 'leaf'}`, () => gridToUri(badgeGrid(GLYPHS[glyph ?? 'leaf']!)));

// ── Illustrations: parts, preparations, taste ────────────────────────────────────────────

const PAL: Record<string, string> = {
  k: '#3b1d63',
  g: '#6fcf7e',
  G: '#3f9a55',
  y: '#ffd45c',
  Y: '#e0a030',
  b: '#c08a55',
  B: '#7a4e2d',
  r: '#e8556b',
  w: '#fff6e0',
  p: '#c9a4ff',
  a: '#d98b2b',
  c: '#9be0ff',
  u: '#8a6bd6',
};

export const ILLUSTRATIONS: Record<string, readonly string[]> = {
  leaf: [
    '      kk  ',
    '    kkggk ',
    '  kkgggGk ',
    ' kgggggGk ',
    ' kggggGGk ',
    ' kgggGGk  ',
    ' kggGGk   ',
    'kbkGkk    ',
    'b k       ',
    '          ',
  ],
  flower: [
    '   kyyk   ',
    ' kkyyyykk ',
    'kyyyaayyyk',
    'kyyaaaayyk',
    'kyyyaayyyk',
    ' kkyyyykk ',
    '   kyyk   ',
    '    kg    ',
    '    kg    ',
    '   kggk   ',
  ],
  root: [
    '    kgk   ',
    '   kgggk  ',
    '    kbk   ',
    '   kbbbk  ',
    '  kbbbbbk ',
    '  kbBbbbk ',
    ' kbk kbBk ',
    ' kb  kbk  ',
    'kbk   kbk ',
    'kk     kk ',
  ],
  stem: [
    '    kgk   ',
    ' kk kgk   ',
    'kggkkgk   ',
    ' kGgkgk kk',
    '   kkgkkg ',
    '    kgkgG ',
    ' kk kgkk  ',
    'kggkkgk   ',
    ' kGgkgk   ',
    '   kkkk   ',
  ],
  seed: [
    '    kk    ',
    '   kBBk   ',
    '  kBbbBk  ',
    '  kBbbBk  ',
    ' kBbbbbBk ',
    ' kBbbbbBk ',
    ' kBbbbBk  ',
    '  kBBBk   ',
    '   kkk    ',
    '          ',
  ],
  fruit: [
    '     kg   ',
    '    kgGk  ',
    '  kkkrkkk ',
    ' krrrrrrrk',
    'krrwrrrrrk',
    'krrwrrrrrk',
    'krrrrrrrrk',
    ' krrrrrrk ',
    '  kkrrkk  ',
    '    kk    ',
  ],
  bark: [
    ' kkkkkkkk ',
    'kBBbbbbBBk',
    'kBbbBbbbBk',
    'kBbbBbBbBk',
    'kBBbbbbBBk',
    'kBbbBbbbBk',
    'kBbbbbBbBk',
    'kBBbbbbBBk',
    ' kkkkkkkk ',
    '          ',
  ],
  cup: [
    '  w  w    ',
    '   w  w   ',
    '          ',
    ' kkkkkkkk ',
    'kppppppkkk',
    'kppppppk k',
    'kppppppkkk',
    ' kppppppk ',
    '  kkkkkk  ',
    '          ',
  ],
  bottle: [
    '    kk    ',
    '   kbbk   ',
    '   kkkk   ',
    '   kccck  ',
    '  kcaaack ',
    '  kcaaack ',
    '  kcaaack ',
    '  kcaaack ',
    '  kkkkkkk ',
    '          ',
  ],
  jar: [
    '  kkkkkk  ',
    ' kuuuuuuk ',
    ' kkkkkkkk ',
    ' kwwwwwwk ',
    ' kwppppwk ',
    ' kwppppwk ',
    ' kwwwwwwk ',
    ' kwwwwwwk ',
    '  kkkkkk  ',
    '          ',
  ],
  pot: [
    '          ',
    ' kk    kk ',
    'kkkkkkkkkk',
    'kaaaaaaaak',
    'kaGGGGGGak',
    'kaGgGgGgak',
    ' kaaaaaak ',
    '  kkkkkk  ',
    '          ',
    '          ',
  ],
  mortar: [
    '       kb ',
    '      kb  ',
    '     kb   ',
    '  kkkbkkk ',
    ' kYYYYYYYk',
    ' kYyyyyyYk',
    '  kYyyyYk ',
    '   kkkkk  ',
    '          ',
    '          ',
  ],
  drop: [
    '    kk    ',
    '   kccck  ',
    '   kcccck ',
    '  kcwccck ',
    '  kcwccck ',
    '  kccccck ',
    '   kcccck ',
    '    kkkk  ',
    '          ',
    '          ',
  ],
  bowl: [
    '   g  g   ',
    '  ggkgGg  ',
    ' kggggggGk',
    'kkkkkkkkkk',
    'kwwwwwwwwk',
    ' kwwwwwwk ',
    '  kkkkkk  ',
    '          ',
    '          ',
    '          ',
  ],
  cards: [
    ' kkkkkkkk ',
    'kkppppppkk',
    'kpkyyyypk ',
    'kpkyyyypk ',
    'kpkppppuk ',
    'kkkppppukk',
    ' kkpppuuk ',
    '  kkkkkkk ',
    '          ',
    '          ',
  ],
  trophy: [
    ' kkkkkkkk ',
    'kkyyyyyykk',
    'k kyywyk k',
    'k kyyyyk k',
    'kkkyyyykkk',
    '  kkyyk   ',
    '   kyyk   ',
    '   kyyk   ',
    '  kkkkkk  ',
    ' kYYYYYYk ',
  ],
  flask: [
    '   kkkk   ',
    '    kwk   ',
    '    kwk   ',
    '   kwwwk  ',
    '  kwppuwk ',
    '  kppuuuk ',
    ' kppuuuuuk',
    'kppuuuuuuk',
    ' kkkkkkkk ',
    '          ',
  ],
  molecule: [
    '    uu    ',
    '   k  k   ',
    ' uu    uu ',
    ' k      k ',
    '  uu  uu  ',
    '  k    k  ',
    '   u  u   ',
    '          ',
    '          ',
    '          ',
  ],
  taste: [
    '   kkkk   ',
    '  kyyyyk  ',
    ' kywyyyyk ',
    ' kyyyyyyk ',
    '  kyyyyk  ',
    '   kkyk   ',
    '    kyk   ',
    '    kyk   ',
    '    kyk   ',
    '    kkk   ',
  ],
  aroma: [
    '  k   k   ',
    ' k   k    ',
    ' k   k    ',
    '  k   k   ',
    '   k   k  ',
    '   k   k  ',
    '  k   k   ',
    ' k   k    ',
    '          ',
    '          ',
  ],
};

export function illustration(name: string): string {
  const rows = ILLUSTRATIONS[name] ?? ILLUSTRATIONS.leaf!;
  const palette =
    name === 'aroma'
      ? { ...PAL, k: '#c9a4ff' }
      : name === 'molecule'
        ? { ...PAL, k: '#8a6bd6', u: '#c9a4ff' }
        : PAL;
  return memo(`i:${name}`, () => gridToUri(fromRows(rows, palette)));
}

/** The card's own words for a usable part or preparation, mapped onto an illustration. */
export const PART_ART: { match: RegExp; art: string }[] = [
  { match: /^(leaf|shoot|needle)$/i, art: 'leaf' },
  { match: /^(flower|petal)$/i, art: 'flower' },
  { match: /^(berry|fruit|hip|nut|cone)$/i, art: 'fruit' },
  { match: /^seed$/i, art: 'seed' },
  { match: /^(root|bulb|stock)$/i, art: 'root' },
  { match: /^(bark|twigs)$/i, art: 'bark' },
  { match: /^(stem|stalk)$/i, art: 'stem' },
  { match: /^(sap|resin)$/i, art: 'drop' },
];

export const PREP_ART: { match: RegExp; art: string }[] = [
  { match: /^(tea|infusion|cold soak)$/i, art: 'cup' },
  { match: /^(tincture|extract)$/i, art: 'bottle' },
  { match: /^(salve|poultice|powder)$/i, art: 'jar' },
  { match: /^(decoction|cooked|cooked root|steam)$/i, art: 'pot' },
  { match: /^(roasted|roasted roots|spice)$/i, art: 'mortar' },
  { match: /^(oil|juice|syrup|sap)$/i, art: 'drop' },
  { match: /^(fresh|fresh greens|salad)$/i, art: 'bowl' },
];

export const artFor = (rules: { match: RegExp; art: string }[], word: string) =>
  rules.find((r) => r.match.test(word))?.art ?? 'leaf';

// ── Compound gems ────────────────────────────────────────────────────────────────────────

const GEM_ROWS = [
  '  kkkkkkkk  ',
  ' kLLMMMMDDk ',
  'kLLLMMMMDDDk',
  'kkkkkkkkkkkk',
  ' kLMMMMMDDk ',
  '  kLMMMMDk  ',
  '   kLMMDk   ',
  '    kMDk    ',
  '     kk     ',
];
const GEM_SETS = [
  { L: '#ffd7e6', M: '#ff7aa8', D: '#c23a6e' },
  { L: '#d9f0ff', M: '#6cc0ff', D: '#2f7fc4' },
  { L: '#e0ffd9', M: '#6fdc86', D: '#2f9a4d' },
  { L: '#ffeec2', M: '#ffc83d', D: '#c88a10' },
  { L: '#ecdcff', M: '#b48cff', D: '#6b45c4' },
  { L: '#ffe2cc', M: '#ff9a5c', D: '#c45a22' },
];

export function gemFor(name: string): string {
  let h = 0;
  for (const c of name.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const index = h % GEM_SETS.length;
  return memo(`g:${index}`, () =>
    gridToUri(fromRows(GEM_ROWS, { k: '#3b1d63', ...GEM_SETS[index]! })),
  );
}

// ── Field Board podium art ───────────────────────────────────────────────────────────────

ILLUSTRATIONS.crown = [
  'k   kk   k',
  'yk  yy  ky',
  'yyk yy kyy',
  'yyyyyyyyyy',
  'kYYYYYYYYk',
  'kyyyryyyyk',
  'kYYYYYYYYk',
  ' kkkkkkkk ',
  '          ',
  '          ',
];
ILLUSTRATIONS.medal = [
  '  pp  pp  ',
  '   pppp   ',
  '    pp    ',
  '   kkkk   ',
  '  kwwwwk  ',
  ' kwwXXwwk ',
  ' kwwXXwwk ',
  '  kwwwwk  ',
  '   kkkk   ',
  '          ',
];

/** A silver (2nd) or bronze (3rd) medal on the shared ribbon. */
export function medalArt(place: 2 | 3): string {
  const coin =
    place === 2
      ? { w: '#e6e8f5', X: '#aab0d0' }
      : { w: '#f2b784', X: '#b4713f' };
  return memo(`m:${place}`, () =>
    gridToUri(fromRows(ILLUSTRATIONS.medal!, { ...PAL, ...coin })),
  );
}
