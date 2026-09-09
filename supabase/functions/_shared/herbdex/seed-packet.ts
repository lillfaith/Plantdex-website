import { hash, seeded } from './rng.ts';

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
/**
 * Bumped to 2 when the palette became botanical.
 *
 * Species already in `species_packets` keep the artwork they were minted with — that table is
 * insert-only and this generator cannot reach it, which is the whole point of the registry.
 * What changes is what a NEW species mints, and what a signed-out preview draws for a species
 * nobody has minted yet.
 */
export const PACKET_VERSION = 2;

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
interface PacketFamily {
  readonly id: string;
  readonly paper: string;
  readonly band: string;
  readonly ink: string;
}

/**
 * PALETTE FAMILIES — a packet's three colours are chosen together, never independently.
 *
 * The first version drew paper, band and ink from three separate lists, which is how a
 * generator makes mud: most combinations of a pale tint, a saturated strip and a dark motif
 * do not belong on the same piece of paper, and the ones that did were all violet because
 * that is what the deck's token set mostly contained. Choosing a FAMILY picks a trio that was
 * put together on purpose.
 *
 * The families are botanical on purpose and span the whole range — leaf, fern, moss, meadow,
 * gold, berry, bramble, violet, sky, wetland, clay, bark — so a shelf of different species
 * looks like a shelf of different plants rather than one colourway shuffled.
 */
const FAMILIES: readonly PacketFamily[] = [
  { id: 'leaf', paper: 'paper-sage', band: 'band-leaf', ink: 'ink-forest' },
  { id: 'fern', paper: 'paper-fern', band: 'band-teal', ink: 'ink-forest' },
  { id: 'moss', paper: 'paper-moss', band: 'band-moss', ink: 'ink-forest' },
  { id: 'meadow', paper: 'paper-straw', band: 'band-moss', ink: 'ink-bark' },
  { id: 'gold', paper: 'paper-cream', band: 'band-gold', ink: 'ink-bark' },
  { id: 'amber', paper: 'paper-straw', band: 'band-amber', ink: 'ink-bark' },
  { id: 'berry', paper: 'paper-blush', band: 'band-berry', ink: 'ink-wine' },
  { id: 'bramble', paper: 'mystery-lilac', band: 'band-berry', ink: 'ink-wine' },
  { id: 'violet', paper: 'mystery-lilac', band: 'violet-600', ink: 'violet-900' },
  { id: 'orchid', paper: 'mystery-mauve', band: 'mystery-purple', ink: 'violet-900' },
  { id: 'rose', paper: 'paper-blush', band: 'pink-accent', ink: 'ink-wine' },
  { id: 'sky', paper: 'paper-mist', band: 'band-teal', ink: 'ink-sea' },
  { id: 'wetland', paper: 'paper-mist', band: 'cyan-accent', ink: 'ink-sea' },
  { id: 'clay', paper: 'paper-clay', band: 'band-amber', ink: 'ink-bark' },
  { id: 'bark', paper: 'paper-clay', band: 'band-bark', ink: 'ink-bark' },
  { id: 'snow', paper: 'paper-cream', band: 'band-leaf', ink: 'ink-forest' },
] as const;

const FAMILY_BY_ID = new Map(FAMILIES.map((family) => [family.id, family]));

/**
 * WHAT A PLANT'S OWN LATIN NAME SAYS ABOUT ITS COLOUR.
 *
 * READING A NAME IS NOT INVENTING BOTANY, and the line matters. `Lamium purpureum` is
 * *called* purple; that is a fact about the name, checkable by anyone, and the same licence
 * the motif lexicon above already runs on. What this must never do is assert a colour a name
 * does not state — there is no flower-colour field for an arbitrary PlantNet species anywhere
 * in this system, and guessing one from a genus would be exactly the fabricated botany the
 * rest of the codebase refuses.
 *
 * So: epithets that literally name a colour, and epithets that literally name a habitat,
 * which is a statement about where the plant grows rather than what it looks like — a
 * `sylvatica` gets woodland tones because it is a woodland plant, not because anyone claims
 * its flowers are green. Everything else falls through to the deterministic draw, which is
 * the honest answer for a name that says nothing.
 *
 * Matched against the SCIENTIFIC NAME ONLY. The common name is arbitrary text the finder
 * supplied, and `supabase/functions/seed-packet` is forbidden from reading it when minting —
 * whoever found a species first would otherwise choose the artwork everybody else ever sees.
 * Deriving colour from it here would put the preview and the canonical packet out of step.
 */
const COLOUR_FAMILY_WORDS: [RegExp, string][] = [
  // Yellows and golds.
  [/\b\w*(?:lute\w*|flav\w*|aure\w*|chrys\w*|xanth\w*)\b/, 'gold'],
  // Oranges and coppers.
  [/\b\w*(?:aurantiac\w*|croce\w*|cupre\w*|ferrugine\w*)\b/, 'amber'],
  // Reds, from scarlet to blood.
  [/\b\w*(?:rubr\w*|ruber|ruben\w*|coccine\w*|sanguine\w*|erythr\w*|punice\w*)\b/, 'berry'],
  // Pinks and roses.
  [/\b\w*(?:rose\w*|carne\w*|incarnat\w*)\b/, 'rose'],
  // Purples and violets.
  [/\b\w*(?:purpure\w*|violace\w*|lilacin\w*|amethyst\w*)\b/, 'violet'],
  // Blues.
  [/\b\w*(?:caerule\w*|coerule\w*|azure\w*|cyane\w*)\b/, 'sky'],
  // Greens.
  [/\b\w*(?:virid\w*|viren\w*|chlor\w*|glauc\w*)\b/, 'leaf'],
  // Whites and pales — cream paper with a leaf band reads as a white flower on foliage.
  [/\b\w*(?:alb\w*|nive\w*|candid\w*|leuc\w*|lacte\w*)\b/, 'snow'],
  // Dark and blackish.
  [/\b\w*(?:nigr\w*|niger|atr\w*|melan\w*)\b/, 'bramble'],
  // Silvers and greys read as sage foliage.
  [/\b\w*(?:argente\w*|incan\w*|cinere\w*|cane\w*|tomentos\w*)\b/, 'leaf'],

  // HABITAT epithets: where it grows, not what colour it is.
  [/\b\w*(?:sylvatic\w*|sylvestr\w*|nemoros\w*|forest\w*)\b/, 'fern'],
  [/\b\w*(?:palustr\w*|aquatic\w*|fluviatil\w*|riparia\w*|maritim\w*|litoral\w*)\b/, 'wetland'],
  [/\b\w*(?:praten\w*|arven\w*|campestr\w*|meadow\w*)\b/, 'meadow'],
  [/\b\w*(?:montan\w*|alpin\w*|saxatil\w*|rupestr\w*)\b/, 'clay'],
  [/\b\w*(?:arbore\w*|dendro\w*|frutic\w*|lign\w*)\b/, 'bark'],
  [/\b\w*(?:officinal\w*|sativ\w*|hortens\w*|vulgar\w*)\b/, 'moss'],
];

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
  // COLOUR COMES FROM THE SCIENTIFIC NAME ALONE — see COLOUR_FAMILY_WORDS for why the common
  // name is deliberately not consulted here even though `words` above still carries it.
  const latin = (input.scientificName ?? input.speciesKey).toLowerCase();
  const namedFamily = COLOUR_FAMILY_WORDS.find(([pattern]) => pattern.test(latin))?.[1];

  // Drawn in a fixed order so adding a lexicon entry never reshuffles the fields after it.
  const shape = pick(PACKET_SHAPES, rand());
  const drawnMotif = pick(PACKET_MOTIFS, rand());
  const drawnFamily = pick(FAMILIES, rand());
  const accent = pick(PACKET_ACCENTS, rand());

  const family = (namedFamily ? FAMILY_BY_ID.get(namedFamily) : undefined) ?? drawnFamily;

  return {
    version: PACKET_VERSION,
    shape,
    motif: named ?? drawnMotif,
    accent,
    paper: family.paper,
    band: family.band,
    ink: family.ink,
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
