/**
 * The Plantdex icon family.
 *
 * WHY THIS EXISTS. The interface used to be signposted with system emoji — 🏠 🌿 🌱 📓 🗓 📖
 * in the nav, 🏆 💎 ✨ on achievements, 🫖 🫙 🧴 in Learn. Emoji are somebody else's art
 * direction: they render as Apple's drawings on one device and Google's on another, they
 * carry a glossy app-store gloss this deck does not have, and six of them side by side in a
 * bottom bar is the visual signature of a phone game rather than a field guide.
 *
 * The replacement is not an icon library either. These are drawn for this deck: one weight,
 * one grid, botanical where botany is the subject, and quiet enough that the printed cards
 * stay the brightest thing on screen.
 *
 * THE RULES, so a later addition still looks like it belongs:
 *
 *   • 24×24 viewBox, always. Optical size comes from the rendered box, never from a
 *     different coordinate space.
 *   • Stroke, not fill, at 1.6 — except where a mark reads better solid at small sizes
 *     (the mastery flower, the stage pips), which are the deliberate exceptions.
 *   • `currentColor` throughout. An icon never carries its own colour; it inherits the
 *     token its text uses, so contrast is decided once, by the palette.
 *   • Low complexity. At 16px a third detail is mud. Two or three strokes is the budget.
 *   • Never the only carrier of meaning: every usage pairs the icon with a label or an
 *     `sr-only` string. AGENTS.md requires it, and a keyhole is not self-explanatory.
 *
 * Decorative by default (`aria-hidden`), because the label beside it is what a screen
 * reader should read. Pass `title` only where the icon genuinely stands alone.
 */

export type IconName =
  // Navigation
  | 'home'
  | 'herbdex'
  | 'garden'
  | 'journal'
  | 'seasons'
  | 'learn'
  // States and marks
  | 'research'
  | 'safety'
  | 'locked'
  | 'revealed'
  | 'discovered'
  | 'learned'
  | 'mastered'
  | 'flip'
  | 'errata'
  | 'close'
  | 'check'
  | 'cross'
  | 'pending'
  // Card stats
  | 'water'
  | 'sun'
  | 'temperature'
  // Seasons
  | 'spring'
  | 'summer'
  | 'autumn'
  | 'winter'
  // Preparations
  | 'infusion'
  | 'decoction'
  | 'tincture'
  | 'salve'
  | 'drying'
  | 'storage'
  // Achievements
  | 'sprout'
  | 'leaves'
  | 'flower'
  | 'bloom'
  | 'crystal'
  | 'laurel'
  | 'compass'
  | 'fallen-leaf'
  | 'plot'
  // Plant parts, for the usable-parts grid on a card page. `sprout`, `leaves`, `flower`
  // and `bloom` already cover the growing end; these are the parts a card actually names
  // that had no mark of their own.
  | 'root'
  | 'stem'
  | 'seed'
  | 'fruit'
  | 'bark'
  | 'whole-plant';

/**
 * Each entry is the inner markup of a 24×24 icon.
 *
 * Kept as JSX rather than path strings so an icon can mix a stroked outline with a solid
 * accent where it needs to — the mastery flower and the stat pips both do.
 */
const ICONS: Record<IconName, React.ReactNode> = {
  // — Navigation ————————————————————————————————————————————————————————————
  // A field guide standing on a shelf, not a house: this deck's "home" is the book.
  home: (
    <>
      <path d="M4 5.2A2.2 2.2 0 0 1 6.2 3H18a1 1 0 0 1 1 1v14.8" />
      <path d="M4 5.2V19a2 2 0 0 0 2 2h13" />
      <path d="M8 8h7M8 11.5h4.5" />
    </>
  ),
  // Two cards fanned in an index — the collection, not a leaf.
  herbdex: (
    <>
      <rect x="8.5" y="3.5" width="11" height="15" rx="1.8" />
      <path d="M5.6 6.2 4 7a1.7 1.7 0 0 0-.7 2.3l5.4 10.4a1.8 1.8 0 0 0 2.4.7l2-1" />
      <path d="M12 8.5c1.6.4 2.6 1.6 2.6 3.1M16 11.6c0-1.5 1-2.7 2.6-3.1" />
    </>
  ),
  // Pixel sprout — two cotyledons on a stem, drawn on the same grid as the portraits.
  garden: (
    <>
      <path d="M12 21v-7.5" />
      <path d="M12 13.5C12 10.4 9.8 8 6.6 8c-.6 0-1 .1-1.4.2-.1 3.4 2.5 5.9 5.6 5.9Z" />
      <path d="M12 12.4c0-3 2.1-5.4 5.2-5.4.6 0 1 .1 1.4.2.1 3.3-2.4 5.7-5.4 5.7Z" />
    </>
  ),
  // Field notebook: stitched spine, ruled page, a pressed leaf marking the place.
  journal: (
    <>
      <path d="M6 3.5h11.5a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6" />
      <path d="M6 3.5A1.5 1.5 0 0 0 4.5 5v14A1.5 1.5 0 0 0 6 20.5" />
      <path d="M8.5 8h7M8.5 11.5h7" />
      <path d="M13 20.5v-4l2.5 1.6Z" fill="currentColor" stroke="none" />
    </>
  ),
  // The turning year: a ring broken into four arcs, one filled.
  seasons: (
    <>
      <path d="M12 3.6a8.4 8.4 0 0 1 8.4 8.4" />
      <path d="M20.4 12a8.4 8.4 0 0 1-8.4 8.4" />
      <path d="M12 20.4A8.4 8.4 0 0 1 3.6 12" />
      <path d="M3.6 12A8.4 8.4 0 0 1 12 3.6" strokeWidth="2.6" />
      <circle cx="12" cy="12" r="2.4" />
    </>
  ),
  // An open guide, spread flat.
  learn: (
    <>
      <path d="M12 6.8v13" />
      <path d="M12 6.8C10.4 5.3 8.4 4.6 6 4.6c-.9 0-1.7.1-2.5.3v13c.8-.2 1.6-.3 2.5-.3 2.4 0 4.4.7 6 2.2" />
      <path d="M12 6.8c1.6-1.5 3.6-2.2 6-2.2.9 0 1.7.1 2.5.3v13c-.8-.2-1.6-.3-2.5-.3-2.4 0-4.4.7-6 2.2" />
    </>
  ),

  // — States and marks ——————————————————————————————————————————————————————
  // A lens over a leaf: looking closely at a plant, which is what research is here.
  research: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.4 15.4 20.5 20.5" />
      <path d="M10.5 14V9.6M10.5 10.8c-.6-1.5-2-2.2-3.4-2.2.1 1.6 1.3 2.6 3 2.6M10.5 12.2c.6-1.5 2-2.2 3.4-2.2-.1 1.6-1.3 2.6-3 2.6" />
    </>
  ),
  // Deliberately spare. A warning earns attention by being rare, not by being loud.
  safety: (
    <>
      <path d="M12 4.2 21 19.4H3Z" />
      <path d="M12 10v3.6" />
      <circle cx="12" cy="16.6" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  // Keyhole, not a padlock: what is behind the card is a secret, not a permission error.
  locked: (
    <>
      <rect x="4.5" y="3.5" width="15" height="17" rx="2" />
      <circle cx="12" cy="10.5" r="2.4" />
      <path d="M12 12.9 10.8 17h2.4Z" fill="currentColor" stroke="none" />
    </>
  ),
  revealed: (
    <>
      <path d="M2.8 12S6.6 5.8 12 5.8 21.2 12 21.2 12 17.4 18.2 12 18.2 2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="2.9" />
    </>
  ),
  // Stage one: found. A single leaf, ticked.
  discovered: (
    <>
      <path d="M4.5 12.2a7.7 7.7 0 0 1 7.7-7.7h5.6a1 1 0 0 1 1 1v4.7a7.7 7.7 0 0 1-7.7 7.7 6.6 6.6 0 0 1-6.6-5.7Z" />
      <path d="M8.4 15.6 18.4 5.2" />
    </>
  ),
  // Stage two: learned. A seed, halved to show it has been opened up and understood.
  learned: (
    <>
      <path d="M12 3.4c3.4 2.3 5.2 5.2 5.2 8.6a5.2 5.2 0 0 1-10.4 0c0-3.4 1.8-6.3 5.2-8.6Z" />
      <path d="M12 3.4v13.8" />
    </>
  ),
  // Stage three: mastered. A flower in full bloom — solid, so it reads at 12px in a grid
  // corner where a stroked mark would disappear.
  mastered: (
    <>
      <path
        d="M12 2.6c1.6 0 2.9 1.3 2.9 2.9v.6l.4-.4a2.9 2.9 0 1 1 4.1 4.1l-.4.4h.5a2.9 2.9 0 1 1 0 5.8h-.5l.4.4a2.9 2.9 0 1 1-4.1 4.1l-.4-.4v.5a2.9 2.9 0 1 1-5.8 0v-.5l-.4.4a2.9 2.9 0 0 1-4.1-4.1l.4-.4h-.5a2.9 2.9 0 1 1 0-5.8h.5l-.4-.4a2.9 2.9 0 0 1 4.1-4.1l.4.4v-.6c0-1.6 1.3-2.9 2.9-2.9Z"
        fill="currentColor"
        stroke="none"
      />
      <circle cx="12" cy="12" r="2.6" className="text-plum-900" fill="currentColor" stroke="none" />
    </>
  ),
  // The flip control: a card caught mid-turn, which is exactly what the button does.
  flip: (
    <>
      <rect x="3.2" y="4.5" width="7.6" height="15" rx="1.6" />
      <path d="M13.2 4.5h5.6a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-5.6" strokeDasharray="2.6 2.4" />
      <path d="M12 2.6v18.8" />
    </>
  ),
  // A correction mark, not a hazard: this is about the card, not the plant.
  errata: (
    <>
      <path d="M16.8 3.9a2 2 0 0 1 2.8 2.8L8.9 17.4l-3.7.9.9-3.7Z" />
      <path d="M14.6 6.1 17.4 8.9" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="M4.5 12.8 9.4 17.6 19.5 6.6" />,
  cross: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  // Not done yet — an empty ring, so a checklist reads as one drawing throughout.
  pending: <circle cx="12" cy="12" r="7.4" />,

  // — Card stats ————————————————————————————————————————————————————————————
  water: <path d="M12 3.6c3.4 3.6 5.4 6.5 5.4 9.1a5.4 5.4 0 0 1-10.8 0c0-2.6 2-5.5 5.4-9.1Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.8v2.4M12 18.8v2.4M4.5 12H2.1M21.9 12h-2.4M6.7 6.7 5 5M19 19l-1.7-1.7M6.7 17.3 5 19M19 5l-1.7 1.7" />
    </>
  ),
  temperature: (
    <>
      <path d="M10 13.4V5.4a2 2 0 1 1 4 0v8a4 4 0 1 1-4 0Z" />
      <circle cx="12" cy="17" r="1.7" fill="currentColor" stroke="none" />
    </>
  ),

  // — Seasons ———————————————————————————————————————————————————————————————
  spring: (
    <>
      <path d="M12 21v-8" />
      <path d="M12 13c0-2.6-2-4.6-4.6-4.6H6.2C6.2 11 8.2 13 10.8 13Z" />
      <circle cx="13.4" cy="7.2" r="3" />
      <circle cx="13.4" cy="7.2" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  summer: (
    <>
      <circle cx="12" cy="12" r="4.4" fill="currentColor" stroke="none" />
      <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" />
    </>
  ),
  autumn: (
    <>
      <path d="M12 20.4v-6.2" />
      <path d="M12 14.2c-3.4 0-6.2-2.6-6.2-5.8 0-1.7.7-3.3 2-4.4 1.3 1 2.9 1.6 4.2 1.6s2.9-.6 4.2-1.6c1.3 1.1 2 2.7 2 4.4 0 3.2-2.8 5.8-6.2 5.8Z" />
    </>
  ),
  winter: (
    <>
      <path d="M12 2.8v18.4M4 7.4l16 9.2M20 7.4 4 16.6" />
      <path d="M12 6.6 9.6 5M12 6.6 14.4 5M12 17.4 9.6 19M12 17.4l2.4 1.6" />
    </>
  ),

  // — Preparations ——————————————————————————————————————————————————————————
  infusion: (
    <>
      <path d="M4.5 8.5h12v6a4.5 4.5 0 0 1-4.5 4.5H9a4.5 4.5 0 0 1-4.5-4.5Z" />
      <path d="M16.5 10.4h1.6a2.6 2.6 0 0 1 0 5.2h-1.6" />
      <path d="M8.4 5.6c0-.9.8-1.4.8-2.2M12 5.6c0-.9.8-1.4.8-2.2" />
    </>
  ),
  // A covered pot over heat — what separates a decoction from a steep.
  decoction: (
    <>
      <path d="M4.6 9.4h14.8v5.2a5 5 0 0 1-5 5h-4.8a5 5 0 0 1-5-5Z" />
      <path d="M3.4 9.4h17.2M9.4 6.6c0-1 .9-1.5.9-2.4M14.6 6.6c0-1 .9-1.5.9-2.4" />
      <path d="M8 22.2c.5-.8 1.1-1.2 1.6-1.2M14.4 22.2c.5-.8 1.1-1.2 1.6-1.2" />
    </>
  ),
  tincture: (
    <>
      <path d="M9.6 3.4h4.8M11 3.4v4.2L7.4 17a3 3 0 0 0 2.8 4.1h3.6A3 3 0 0 0 16.6 17L13 7.6V3.4" />
      <path d="M8.6 14.4h6.8" />
    </>
  ),
  salve: (
    <>
      <rect x="5" y="8" width="14" height="12.4" rx="2" />
      <path d="M8.4 8V5.6a1 1 0 0 1 1-1h5.2a1 1 0 0 1 1 1V8" />
      <path d="M12 11.4c1.5 1.5 2.3 2.8 2.3 3.9a2.3 2.3 0 0 1-4.6 0c0-1.1.8-2.4 2.3-3.9Z" />
    </>
  ),
  drying: (
    <>
      <path d="M12 21V9.4" />
      <path d="M12 9.4C9.6 8 8.4 6.2 8.4 4c2.4.4 3.9 1.6 4.6 3.6M12 11.6c-2.4-1.4-4.4-1.8-6-1.2 1.4 2 3.3 2.8 5.6 2.4M12 11.6c2.4-1.4 4.4-1.8 6-1.2-1.4 2-3.3 2.8-5.6 2.4" />
    </>
  ),
  storage: (
    <>
      <path d="M8.6 3.5h6.8l-.6 2.6c2 1.4 3.2 3.7 3.2 6.3v4.4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4v-4.4c0-2.6 1.2-4.9 3.2-6.3Z" />
      <path d="M7.4 12.6h9.2" />
    </>
  ),

  // — Achievements ——————————————————————————————————————————————————————————
  // Each is a stage of a plant's life or a mark of the search, so the achievement shelf
  // reads as one growing thing rather than a shelf of trophies.
  sprout: (
    <>
      <path d="M12 21v-6.4" />
      <path d="M12 14.6c0-2.8-2-5-4.8-5H6c0 3 2.2 5 5 5Z" />
      <circle cx="12" cy="6.4" r="2.6" />
    </>
  ),
  leaves: (
    <>
      <path d="M3.6 20.4C3.6 13.8 8 9.4 14.6 9.4h5.8c0 6.6-4.4 11-11 11Z" />
      <path d="M6.6 17.4C9 13.4 12.4 11.4 17 11" />
    </>
  ),
  flower: (
    <>
      <path d="M12 21v-6.6" />
      <circle cx="12" cy="9.4" r="2.6" />
      <path d="M12 6.8c0-2 .9-3.4 2.6-4.2.8 1.9.4 3.5-1 4.9M14.6 9.4c2 0 3.4.9 4.2 2.6-1.9.8-3.5.4-4.9-1M12 12c0 2-.9 3.4-2.6 4.2-.8-1.9-.4-3.5 1-4.9M9.4 9.4c-2 0-3.4-.9-4.2-2.6 1.9-.8 3.5-.4 4.9 1" />
    </>
  ),
  bloom: (
    <>
      <path d="M12 2.8 13.8 9l6.2 1.8-6.2 1.8L12 19l-1.8-6.4L4 10.8 10.2 9Z" />
      <path d="M18.6 17.4l.7 2.3 2.3.7-2.3.7-.7 2.3" />
    </>
  ),
  crystal: (
    <>
      <path d="M12 2.8 20.4 9 17.2 19.4H6.8L3.6 9Z" />
      <path d="M3.6 9h16.8M12 2.8 8.6 9l3.4 10.4L15.4 9Z" />
    </>
  ),
  // Laurel rather than a trophy: the deck rewards observation, not competition.
  laurel: (
    <>
      <path d="M8.6 20.2c-3-1.6-4.6-4.4-4.6-8.4C4 7.6 5.6 4.6 8.8 2.8c1.4 2.2 2 4.4 2 6.6" />
      <path d="M15.4 20.2c3-1.6 4.6-4.4 4.6-8.4 0-4.2-1.6-7.2-4.8-9-1.4 2.2-2 4.4-2 6.6" />
      <path d="M9 20.4h6" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M15.4 8.6 13.6 13.6 8.6 15.4 10.4 10.4Z" />
    </>
  ),
  'fallen-leaf': (
    <>
      <path d="M20 4.4c-6.6-1.4-12 1.6-13.8 6.6-1.1 3-.4 5.9 1.4 7.6 3.2-1 5.6-3 7-5.6" />
      <path d="M4 20.4c1.8-2.6 4-5 6.6-7" />
    </>
  ),
  plot: (
    <>
      <path d="M3.4 10.6 12 4l8.6 6.6" />
      <path d="M5.4 12.2v6.2a1.6 1.6 0 0 0 1.6 1.6h10a1.6 1.6 0 0 0 1.6-1.6v-6.2" />
      <path d="M12 20v-3.6M12 16.4c0-1.6-1.2-2.8-2.8-2.8 0 1.7 1.2 2.8 2.8 2.8Z" />
    </>
  ),
  // — Plant parts ——————————————————————————————————————————————————————————————
  // Drawn as the part in the ground or on the plant rather than as a plucked specimen: a
  // card page is about a living plant, and a severed root reads as produce.
  root: (
    <>
      <path d="M4.5 8.5h15" />
      <path d="M12 8.5v3.2" />
      <path d="M12 11.7c-1.6 1.4-2.3 3.4-2.1 6M12 11.7c1.6 1.4 2.3 3.4 2.1 6M12 11.7v8.1" />
    </>
  ),
  stem: (
    <>
      <path d="M12 21V4.4" />
      <path d="M12 12.4c-2.9 0-4.8-1.7-5.2-4.6 2.9-.4 4.8 1.1 5.2 4.6Z" />
      <path d="M12 16.6c2.9 0 4.8-1.7 5.2-4.6-2.9-.4-4.8 1.1-5.2 4.6Z" />
    </>
  ),
  seed: (
    <>
      <path d="M12 3.4c3 2.3 4.6 5 4.6 8.2S15 17.5 12 20.6c-3-3.1-4.6-5.8-4.6-9S9 5.7 12 3.4Z" />
      <path d="M12 7.4v9" />
    </>
  ),
  fruit: (
    <>
      <path d="M12 7.6c-3.1-1.4-6 .6-6 4.6 0 3.4 2.4 7 6 7s6-3.6 6-7c0-4-2.9-6-6-4.6Z" />
      <path d="M12 7.6V4.2" />
      <path d="M12 4.8c1.7-1.6 3.3-2 4.8-1.2-.5 1.8-2.1 2.6-4.8 2.4" />
    </>
  ),
  bark: (
    <>
      <path d="M6.4 3.2v17.6M12 3.2v17.6M17.6 3.2v17.6" />
      <path d="M6.4 8.4h5.6M12 13.6h5.6M6.4 17h5.6" />
    </>
  ),
  // Everything at once: root, stem and crown, for a card whose usable part is the plant.
  'whole-plant': (
    <>
      <path d="M12 21v-8.6" />
      <path d="M12 21c-1.2 0-2-.9-2.4-2.6M12 21c1.2 0 2-.9 2.4-2.6" />
      <path d="M12 12.4c-3.1 0-5-1.9-5.4-5.2 3.1-.4 5 1.3 5.4 5.2Z" />
      <path d="M12 12.4c3.1 0 5-1.9 5.4-5.2-3.1-.4-5 1.3-5.4 5.2Z" />
      <circle cx="12" cy="4.6" r="1.8" />
    </>
  ),
};

export function PlantdexIcon({
  name,
  className = '',
  /**
   * Only for an icon that carries meaning no nearby text repeats. Everything else stays
   * `aria-hidden`, because "🏠 Home" read aloud as "house Home" is worse than "Home".
   */
  title,
  strokeWidth = 1.6,
}: {
  name: IconName;
  className?: string;
  title?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      className={className}
      // Icons sit beside text far more often than not, so they default to the text's own
      // size rather than a fixed pixel box a caller has to keep overriding.
      style={{ width: '1em', height: '1em' }}
    >
      {title && <title>{title}</title>}
      {ICONS[name]}
    </svg>
  );
}
