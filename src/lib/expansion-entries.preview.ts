import generated from '../../docs/expansion/pilot/expansion-pilot.generated.json';
import type { Herb, HerbBack, Rarity, Season, UseKey } from './types';

/**
 * THE PROTECTED PREVIEW'S ENTRIES. Never imported by the committed app: `scripts/build-pilot-preview.mjs`
 * copies this file over `expansion-entries.ts` inside a STAGED copy of the repository and builds that.
 * `expansion-pilot-preview.test.ts` fails if any live module imports it.
 *
 * What it does and does not do:
 *  - It renders HELD content, because the owner asked to see how the five cards behave, and labels every
 *    one `PREVIEW - UNREVIEWED`. The publication gate is untouched: `expansion-pilot.generated.json` still
 *    says HELD for all five, and this module copies the reasons into the card's own warning line.
 *  - It adds NO value. `xp` is 0: expansion cards pay nothing (the ledger resolves XP through the printed
 *    deck, so this is also what the reducer computes). Rarity, season, uses and stats are the draft table
 *    values the importer already validated against the deck's own tables.
 *  - It generates NO art. The three image fields are one neutral, labelled placeholder plate drawn as an
 *    SVG data URI (text only, no plant), and `sprite` is a path that resolves to nothing, so
 *    `hasSprite` is false and the existing missing-sprite state applies.
 *  - Identification features, lookalikes and habitat are `null` in the generated file (no source), so the
 *    entry carries none of them. The unreviewed caution was dropped by the importer and is not restored.
 *  - The six back fields are the owner's master sheet, carried with `reviewed: false`. They are shown
 *    under the PREVIEW label and are not botanical verification.
 */

export const PREVIEW_LABEL = 'PREVIEW - UNREVIEWED';
export const EXPANSION_COLLECTION_ID = 'herbdex-expansion';

interface GeneratedCard {
  id: string;
  cardNumber: number;
  commonName: string;
  scientificName: string;
  deck: { rarity: string; season: string; stats: { sun: number; temperature: number; water: number }; uses: string[] };
  back: Record<keyof HerbBack, { values: string[] }>;
  publication: { status: string; reasons: { code: string; detail?: string }[] };
}

const REASON_WORDS: Record<string, string> = {
  caution_unreviewed: 'safety caution not reviewed',
  image_ai_derivative_unreviewed: 'image is an AI derivative awaiting botanical review',
  image_origin_unrecorded: 'image origin not recorded',
  taxon_identity_unverified: 'taxon identity not verified',
  citations_only_search_links: 'citations are search links only',
  asset_not_approved: 'artwork not approved',
};

function reasonLine(card: GeneratedCard): string {
  const words = [...new Set(card.publication.reasons.map((r) => REASON_WORDS[r.code] ?? r.code))];
  return `${PREVIEW_LABEL}. Held by the publication gate (${words.join('; ')}). This page is not published content: it carries no reviewed safety caution, so do not use it to identify or use any plant.`;
}

/** A neutral plate: labels and a name, no drawing of a plant. */
function placeholderPlate(card: GeneratedCard): string {
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 700">` +
    `<rect width="500" height="700" rx="28" fill="#17101c"/>` +
    `<rect x="14" y="14" width="472" height="672" rx="20" fill="none" stroke="#ffe27a" stroke-width="3" stroke-dasharray="14 10"/>` +
    `<g font-family="sans-serif" text-anchor="middle" fill="#f6ebfd">` +
    `<text x="250" y="110" font-size="30" font-weight="700" fill="#ffe27a">${PREVIEW_LABEL}</text>` +
    `<text x="250" y="150" font-size="22">Expansion card #${card.cardNumber}</text>` +
    `<text x="250" y="340" font-size="40" font-weight="700">${esc(card.commonName)}</text>` +
    `<text x="250" y="384" font-size="26" font-style="italic">${esc(card.scientificName)}</text>` +
    `<text x="250" y="560" font-size="22">No approved artwork in this build</text>` +
    `<text x="250" y="594" font-size="22">Placeholder plate, not a depiction</text>` +
    `</g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function toHerb(card: GeneratedCard): Herb {
  const plate = placeholderPlate(card);
  const back = Object.fromEntries(
    (Object.keys(card.back) as (keyof HerbBack)[]).map((k) => [k, [...card.back[k].values]]),
  ) as unknown as HerbBack;
  return {
    id: card.id,
    cardNumber: card.cardNumber,
    collectionId: EXPANSION_COLLECTION_ID,
    commonName: card.commonName,
    scientificName: card.scientificName,
    rarity: card.deck.rarity as Rarity,
    xp: 0,
    season: card.deck.season as Season,
    uses: card.deck.uses as UseKey[],
    stats: { ...card.deck.stats },
    image: plate,
    thumb: plate,
    backImage: plate,
    // Resolves to nothing and is absent from sprites.json, so the existing missing-sprite state applies.
    sprite: '/cards/sprite/_none.webp',
    back,
    warning: reasonLine(card),
  };
}

const cards = (generated as unknown as { cards: GeneratedCard[] }).cards;

export const EXPANSION_ENTRIES: readonly Herb[] = cards.map(toHerb);

/** Proposed digital collection id and name: awaiting the owner (pilot plan section 3). */
export const EXPANSION_COLLECTION = {
  id: EXPANSION_COLLECTION_ID,
  name: 'Herbdex Expansion',
  shortName: 'Expansion',
  /* The planned set, not what is drawn (same rule as `field-cards`). */
  size: 85,
  current: false,
  medium: 'digital' as const,
};
