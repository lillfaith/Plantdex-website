import { hash, seeded } from './rng';

/**
 * SEED PACKET ART, GENERATED RATHER THAN DRAWN.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS PROCEDURAL AND THE 45 CARDS ARE NOT.
 *
 * Every Plantdex card gets an authored pixel creature: a species with a card is a species
 * somebody has read, checked and drawn (see `scripts/sprite_sources/`). The Seed Shelf is
 * the opposite population — anything an identifier can name, which is hundreds of thousands
 * of species. Hand-drawing that is not a lot of work, it is impossible work, and pretending
 * otherwise would mean either a shelf of identical grey rectangles or a shelf that only
 * accepts species somebody happened to draw.
 *
 * So a packet is a RECIPE, computed from the species' own name, and the artwork is assembled
 * from a small kit: four bag silhouettes, a palette taken entirely from the existing deck
 * tokens, and eleven pixel motifs. Same name in, same packet out — on any device, for any
 * player, today or in a year — because the only input is the name and the generator is
 * deterministic. That is what makes two strangers' shelves agree about what a Bellis
 * perennis packet looks like without a shared registry to consult.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT THE ART CLAIMS, AND WHAT IT MUST NOT. A packet is decoration derived from a NAME, not
 * an illustration of a plant. Where the name itself carries a form ("…grass", Trifolium,
 * Rubus) or a colour ("Yellow woodsorrel"), the kit leans on it, because that is reading the
 * plant's own name rather than inventing botany — the same line `build_deck.py` draws. Where
 * it carries neither, the choice is a deterministic draw and means nothing. Nothing here
 * depicts a real specimen and no packet is evidence about a plant.
 */

/**
 * Bumping this changes what NEW packets look like. Existing entries keep the recipe stored
 * with them (see `remote-seed-shelf.ts`), so a shelf somebody has been looking at for a year
 * does not quietly redraw itself when the kit grows.
 */
export const PACKET_VERSION = 1;

export const PACKET_SHAPES = ['flat', 'folded', 'scalloped', 'notched'] as const;
export type PacketShape = (typeof PACKET_SHAPES)[number];

export const PACKET_MOTIFS = [
  'seedhead',
  'bloom',
  'grass',
  'fern',
  'berry',
  'leafpair',
  'umbel',
  'spike',
  'clover',
  'thistle',
  'cone',
] as const;
export type PacketMotif = (typeof PACKET_MOTIFS)[number];

export const PACKET_ACCENTS = ['none', 'dots', 'stripe', 'corner'] as const;
export type PacketAccent = (typeof PACKET_ACCENTS)[number];

export interface PacketRecipe {
  version: number;
  shape: PacketShape;
  motif: PacketMotif;
  accent: PacketAccent;
  /** Deck colour token names — `mystery-lilac`, `gold-300`. Never raw hex. */
  paper: string;
  band: string;
  ink: string;
}

/**
 * PAPER: the pale half of the deck palette only.
 *
 * A seed packet is paper, so every one of these is light enough to read as one against the
 * shelf's wood. They are the mystery ramp (sampled from the printed card backs), the habitat
 * chips and the rarity ink — all existing tokens, so a shelf full of packets cannot drift
 * away from the rest of the site.
 */
const PAPERS = [
  'mystery-lilac',
  'mystery-mauve',
  'mystery-orchid',
  'mystery-violet',
  'habitat-woodland',
  'habitat-meadow',
  'habitat-wetland',
  'habitat-wayside',
  'habitat-garden',
  'rarity-common',
  'rarity-uncommon',
  'rarity-rare',
  'gold-300',
  'violet-200',
] as const;

/** INK: the dark and saturated half, for the motif and the outline of the band. */
const INKS = [
  'violet-800',
  'violet-700',
  'violet-900',
  'plum-950',
  'mystery-indigo',
  'mystery-purple',
] as const;

/** BAND: the printed strip across the packet. Saturated, never pale — it has to read at 40px. */
const BANDS = [
  'violet-600',
  'mystery-purple',
  'mystery-indigo',
  'pink-accent',
  'cyan-accent',
  'gold-500',
  'mystery-pink',
] as const;

/**
 * WORDS IN A PLANT'S OWN NAME THAT SAY WHAT IT LOOKS LIKE.
 *
 * Matched against the scientific name and the common name together, lowercased. Genus names
 * are here because a genus IS a statement about form — every Trifolium has trifoliate leaves,
 * every Rubus bears an aggregate fruit — while the epithets ("grass", "fern") are the same
 * statement in English. Anything not listed falls through to a deterministic draw, which is
 * the honest answer for a name that describes nothing.
 */
const MOTIF_WORDS: [RegExp, PacketMotif][] = [
  [/\b(?:grass|poa|festuca|bromus|agrostis|carex|juncus|lolium|phleum|setaria)\b/, 'grass'],
  [/\b(?:fern|pteridium|dryopteris|athyrium|polystichum|osmunda|asplenium|adiantum)\b/, 'fern'],
  [/\b(?:berry|rubus|vaccinium|ribes|fragaria|sambucus|morus|prunus|sorbus)\b/, 'berry'],
  [/\b(?:clover|trifolium|medicago|melilotus|oxalis)\b/, 'clover'],
  [/\b(?:thistle|cirsium|carduus|silybum|onopordum|arctium)\b/, 'thistle'],
  [/\b(?:pine|spruce|fir|cone|pinus|picea|abies|juniperus|tsuga|larix)\b/, 'cone'],
  [
    /\b(?:daucus|heracleum|pastinaca|anthriscus|conium|aegopodium|angelica|foeniculum|apium)\b/,
    'umbel',
  ],
  [/\b(?:plantago|verbascum|lythrum|digitalis|linaria|veronica|mentha|prunella)\b/, 'spike'],
  [/\b(?:rosa|rose|lilium|tulipa|viola|violet|geranium|malva|helianthus|bellis)\b/, 'bloom'],
  [/\b(?:seed|dandelion|taraxacum|sonchus|lactuca|hieracium|tragopogon)\b/, 'seedhead'],
];

/**
 * COLOUR WORDS, same idea. "Yellow woodsorrel" is the plant telling you its own colour, so
 * the band takes it. Only the band: a packet whose paper went red would stop reading as
 * paper, and the point of the palette is that the shelf still looks like this site.
 */
const COLOUR_WORDS: [RegExp, string][] = [
  [/\b(?:yellow|gold|golden|lutea|luteus|flava|flavum)\b/, 'gold-500'],
  [/\b(?:blue|azure|caerulea|caeruleum|cyanus)\b/, 'cyan-accent'],
  [/\b(?:purple|violet|viola|purpurea|purpureum|violacea)\b/, 'mystery-purple'],
  [/\b(?:pink|rosea|roseum|rosy)\b/, 'mystery-pink'],
  [/\b(?:red|scarlet|rubra|rubrum|coccinea|sanguinea)\b/, 'pink-accent'],
  [/\b(?:white|alba|album|nivea)\b/, 'violet-200'],
];

function pick<T>(items: readonly T[], roll: number): T {
  return items[Math.floor(roll * items.length) % items.length]!;
}

/**
 * The packet for a species.
 *
 * The seed is the SPECIES KEY — the normalised binomial, the same string the shelf is keyed
 * by — so "Bellis perennis L." and "Bellis perennis" cannot produce two different packets
 * for one plant. Descriptive words are read from the full names, which carry more than the
 * key does.
 */
export function packetRecipe(input: {
  speciesKey: string;
  scientificName?: string;
  commonName?: string;
}): PacketRecipe {
  const rand = seeded(hash(input.speciesKey));
  const words = `${input.scientificName ?? input.speciesKey} ${input.commonName ?? ''}`.toLowerCase();

  const named = MOTIF_WORDS.find(([pattern]) => pattern.test(words))?.[1];
  const namedColour = COLOUR_WORDS.find(([pattern]) => pattern.test(words))?.[1];

  // Drawn in a fixed order so adding a lexicon entry never reshuffles the fields after it.
  const shape = pick(PACKET_SHAPES, rand());
  const drawnMotif = pick(PACKET_MOTIFS, rand());
  const paper = pick(PAPERS, rand());
  const drawnBand = pick(BANDS, rand());
  const ink = pick(INKS, rand());
  const accent = pick(PACKET_ACCENTS, rand());

  return {
    version: PACKET_VERSION,
    shape,
    motif: named ?? drawnMotif,
    accent,
    paper,
    band: namedColour ?? drawnBand,
    ink,
  };
}

/**
 * A stored recipe, validated.
 *
 * Returns null for anything it does not recognise, so the caller falls back to deriving the
 * packet from the name again — which is always available, because the name is the seed. A
 * stored recipe is an optimisation and a pin against future kit changes, never the only copy.
 */
export function parseRecipe(value: unknown): PacketRecipe | null {
  if (typeof value !== 'object' || value === null) return null;
  const row = value as Record<string, unknown>;
  const shape = PACKET_SHAPES.find((name) => name === row.shape);
  const motif = PACKET_MOTIFS.find((name) => name === row.motif);
  const accent = PACKET_ACCENTS.find((name) => name === row.accent);
  const colour = (key: string): string | null =>
    typeof row[key] === 'string' && /^[a-z][a-z0-9-]*$/.test(row[key] as string)
      ? (row[key] as string)
      : null;
  const paper = colour('paper');
  const band = colour('band');
  const ink = colour('ink');
  if (!shape || !motif || !accent || !paper || !band || !ink) return null;
  return {
    version: typeof row.version === 'number' ? row.version : PACKET_VERSION,
    shape,
    motif,
    accent,
    paper,
    band,
    ink,
  };
}

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * THE KIT, AS CHARACTER GRIDS.
 *
 * Same convention as `scripts/sprite_sources/` — a drawing is a grid of characters, so the
 * art is readable in the file that defines it and a change to it is a diff somebody can see.
 *
 *   p  paper        s  paper, shaded (the fold and the right edge)
 *   b  band         i  ink (motif and print)
 *   o  outline      .  transparent
 *
 * 14 wide by 18 tall: a portrait bag with room for a band across the middle and a motif
 * under it, which is the composition every real seed packet uses.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const PACKET_WIDTH = 14;
export const PACKET_HEIGHT = 18;

const SHAPES: Record<PacketShape, string[]> = {
  // A plain glued top — the commonest bag, and the quietest.
  flat: [
    'oooooooooooooo',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oooooooooooooo',
  ],
  // Folded over twice at the top, the way a bag is closed once it has been opened.
  folded: [
    'oooooooooooooo',
    'osssssssssssso',
    'osssssssssssso',
    'oooooooooooooo',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oooooooooooooo',
  ],
  // A shop bag with a scalloped head — the most decorative of the four.
  scalloped: [
    '..oooooooooo..',
    '.opppppppppo..',
    'oppppppppppso.',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oooooooooooooo',
  ],
  // A corner torn off, as though somebody had already taken a pinch of seed from it.
  notched: [
    'oooooooooo..oo',
    'oppppppppo..po',
    'oppppppppoooso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oppppppppppsso',
    'oooooooooooooo',
  ],
};

/** The printed band, drawn across rows 5–7 whatever the silhouette above it does. */
const BAND_ROWS = [5, 6];

/**
 * MOTIFS, 8 wide by 7 tall, stamped under the band.
 *
 * Each one is the crudest true thing about that kind of plant: a grass is stems and nothing
 * else, an umbel is a flat head on a stalk, a cone is a lattice. At 8px there is no room for
 * more, and more would start to claim a likeness the generator cannot honestly make.
 */
const MOTIFS: Record<PacketMotif, string[]> = {
  seedhead: [
    '.i.i.i..',
    '..iii...',
    '.iiiii..',
    '..iii...',
    '...i....',
    '...i....',
    '...i....',
  ],
  bloom: [
    '..iii...',
    '.i...i..',
    '.i...i..',
    '..iii...',
    '...i....',
    '..ii....',
    '...i....',
  ],
  grass: [
    'i..i...i',
    'i..i..i.',
    '.i.i..i.',
    '.i.i.i..',
    '.i.ii i.',
    '..iii...',
    '..iii...',
  ],
  fern: [
    '...i....',
    '..iii...',
    '.i.i.i..',
    '..iii...',
    '.i.i.i..',
    '..iii...',
    '...i....',
  ],
  berry: [
    '..i.i...',
    '.iii ii.',
    '.iii ii.',
    '..i.i...',
    '...i....',
    '..i.....',
    '...i....',
  ],
  leafpair: [
    '.ii..ii.',
    'iiii iii',
    '.ii..ii.',
    '...i....',
    '...i....',
    '...i....',
    '...i....',
  ],
  umbel: [
    'i.i.i.i.',
    '.iiiiii.',
    '..i.i...',
    '...i....',
    '...i....',
    '...i....',
    '..i.i...',
  ],
  spike: [
    '...i....',
    '..iii...',
    '..iii...',
    '..iii...',
    '..iii...',
    '...i....',
    '...i....',
  ],
  clover: [
    '..i.i...',
    '.iii ii.',
    '..iii...',
    '.iiiii..',
    '...i....',
    '...i....',
    '...i....',
  ],
  thistle: [
    'i.i.i...',
    '.iiiii..',
    '..iii...',
    '.iiiii..',
    '...i....',
    '..i.i...',
    '...i....',
  ],
  cone: [
    '...i....',
    '..iii...',
    '.ii.ii..',
    '..iii...',
    '.ii.ii..',
    '..iii...',
    '...i....',
  ],
};

const MOTIF_X = 3;
const MOTIF_Y = 9;

/**
 * Assemble the packet as a grid of cell codes.
 *
 * Returned as characters rather than as coloured rectangles so the renderer decides what a
 * colour is: the tokens live in `globals.css` and nothing here should hold a hex value.
 */
export function packetGrid(recipe: PacketRecipe): string[] {
  const rows = SHAPES[recipe.shape].map((row) => row.split(''));

  const paint = (x: number, y: number, cell: string) => {
    const row = rows[y];
    if (!row) return;
    // Only ever over paper. A motif may not overwrite the outline, or a bag springs a leak.
    if (row[x] === 'p' || row[x] === 's') row[x] = cell;
  };

  for (const y of BAND_ROWS) {
    for (let x = 0; x < PACKET_WIDTH; x += 1) paint(x, y, 'b');
  }

  const motif = MOTIFS[recipe.motif];
  for (let y = 0; y < motif.length; y += 1) {
    const line = motif[y]!;
    for (let x = 0; x < line.length; x += 1) {
      if (line[x] === 'i') paint(MOTIF_X + x, MOTIF_Y + y, 'i');
    }
  }

  if (recipe.accent === 'dots') {
    for (let x = 2; x < PACKET_WIDTH - 2; x += 3) paint(x, 3, 'i');
  } else if (recipe.accent === 'stripe') {
    for (let x = 0; x < PACKET_WIDTH; x += 1) paint(x, PACKET_HEIGHT - 3, 'b');
  } else if (recipe.accent === 'corner') {
    // The BAND's colour, not the ink's. Drawn in ink it read as a bite taken out of the
    // bag rather than as something printed on it — a dark blot in the corner of a paper
    // packet is damage, and half the shelf looked chewed.
    paint(2, 3, 'b');
    paint(3, 3, 'b');
    paint(2, 4, 'b');
  }

  return rows.map((row) => row.join(''));
}
