import Link from 'next/link';
import { DISCLAIMER } from '@/lib/deck';
import { PlantdexIcon } from './icons/PlantdexIcon';

/**
 * Herbal safety.
 *
 * AGENTS.md treats this as non-negotiable: the site is educational, must not read as
 * medical advice, and misidentifying a wild plant has real consequences.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PROGRESSIVE DISCLOSURE
 *
 * The deck's full 59-word disclaimer used to be repeated on three pages. Repetition is
 * how a warning stops being read: by the third identical block people scroll past it, and
 * it crowded out the deck while doing so. The full text now lives in exactly one place —
 * /safety — and every page links there.
 *
 *   brief    — one line. Pages that only list or track plants.
 *   standard — one line plus the risk that page actually raises. Pages where ingestion,
 *              preparation, identification or medicinal traditions are discussed.
 *
 * `standard` is SHORTER than it used to be, not weaker: it names the specific hazard in
 * front of the reader instead of restating a general disclaimer they have already seen.
 * Choosing `brief` on a page that discusses preparation is still a safety regression.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The full wording is the deck's own, transcribed verbatim from the Disclaimer card (#47)
 * so the physical product and the site say exactly the same thing. Edit it in
 * scripts/build_deck.py (DISCLAIMER), not here.
 */
export function SafetyNotice({
  variant = 'standard',
  /** The risk this particular page raises. Shown only by `standard`. */
  context = 'Never eat, drink or apply a wild plant on an uncertain identification.',
}: {
  variant?: 'standard' | 'brief';
  context?: string;
}) {
  if (variant === 'brief') {
    return (
      <aside
        aria-labelledby="safety-heading"
        className="mx-auto flex max-w-2xl flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-center text-xs leading-relaxed text-violet-400"
      >
        <span id="safety-heading" className="font-bold tracking-wide text-gold-400 uppercase">
          <PlantdexIcon name="safety" className="text-sm" /> Herbal safety
        </span>
        <span>For education only. Always verify identification before use.</span>
        <SafetyLink />
      </aside>
    );
  }

  return (
    <aside
      aria-labelledby="safety-heading"
      className="mx-auto max-w-2xl rounded-xl border border-gold-500/30 bg-gold-500/[0.06] p-4"
    >
      <h2
        id="safety-heading"
        className="flex items-center gap-2 text-xs font-bold tracking-wide text-gold-400 uppercase"
      >
        <PlantdexIcon name="safety" className="text-sm" /> Herbal safety
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-violet-200">{context}</p>
      <p className="mt-2 text-xs text-violet-400">
        For education only — not medical advice.
      </p>
      <p className="mt-1">
        <SafetyLink />
      </p>
    </aside>
  );
}

function SafetyLink() {
  return (
    // Given a real tap target rather than left as bare inline text: this is the route to
    // the full safety information, and it is reached one-handed, outdoors, on a phone.
    <Link
      href="/safety"
      className="inline-flex min-h-11 items-center rounded-lg text-xs font-semibold whitespace-nowrap text-gold-400 underline underline-offset-2 hover:text-gold-300"
    >
      Read full safety information →
    </Link>
  );
}

/**
 * The deck's explanation of what Encounter Rate means. Shown next to the rarity filter
 * so the game term is not mistaken for a claim about how safe or potent a plant is.
 */
export function EncounterRateNote() {
  return <p className="text-xs leading-relaxed text-violet-400">{DISCLAIMER.encounterRate}</p>;
}

/**
 * A warning printed on an individual card, such as a poisonous lookalike.
 *
 * The one piece of safety text that got LOUDER in this pass, not quieter: a printed
 * warning is specific, actionable and about a real risk to the person holding the card,
 * which is exactly what a general disclaimer is not. Never collapse this behind an
 * interaction, and never gate it on discovery.
 */
export function CardWarning({ warning }: { warning: string }) {
  return (
    <p
      role="note"
      className="flex items-start gap-2 rounded-xl border border-stat-temp/70 bg-stat-temp/20 px-3 py-2.5 text-sm font-semibold text-violet-100"
    >
      <PlantdexIcon name="safety" className="mt-0.5 shrink-0 text-base" />
      <span>
        <span className="sr-only">Warning: </span>
        {warning}
      </span>
    </p>
  );
}

/**
 * A safety caution the site adds, for a risk the printed card does not carry.
 *
 * Given the SAME weight as `CardWarning` above, because the reader's exposure does not
 * depend on which of the two happened to print it. What differs is the attribution: it says
 * "Not printed on the card" first, so someone holding the deck is never left thinking their
 * card carries a warning it does not — the same reason `CardIssueNote` exists.
 *
 * The bar for adding one is in `src/lib/card-cautions.ts`, and it is high: this is not a
 * place for general herbal caveats, which /safety carries once.
 */
export function SiteCaution({ caution }: { caution: string }) {
  return (
    <p
      role="note"
      className="flex items-start gap-2 rounded-xl border border-stat-temp/70 bg-stat-temp/20 px-3 py-2.5 text-sm font-semibold text-violet-100"
    >
      <PlantdexIcon name="safety" className="mt-0.5 shrink-0 text-base" />
      <span>
        <span className="sr-only">Warning: </span>
        {caution}{' '}
        <span className="font-normal text-violet-200">
          Not printed on the card — added here from reviewed sources.
        </span>
      </span>
    </p>
  );
}

/**
 * A printing error on the physical card, shown beside the transcription it explains.
 *
 * Deliberately NOT styled as a safety warning. `CardWarning` above is reserved for a
 * hazard the card itself prints, and borrowing its colour for "this card has a typo"
 * would spend the reader's alarm on the wrong thing — the next real warning is the one
 * that would pay for it. This is a correction: quieter, and clearly about the card rather
 * than about the plant.
 *
 * It has to exist because the deck is printed and the transcription is faithful by rule,
 * so three cards show another plant's profile in good faith and nothing on screen said so.
 */
export function CardIssueNote({ issue }: { issue: string }) {
  return (
    <p
      role="note"
      className="flex items-start gap-2 rounded-xl border border-violet-600/70 bg-plum-700/70 px-3 py-2.5 text-sm text-violet-100"
    >
      <PlantdexIcon name="errata" className="mt-0.5 shrink-0 text-base" />
      <span>
        <span className="font-semibold">Printing error on this card. </span>
        {issue} The entry below is transcribed exactly as the card reads.
      </span>
    </p>
  );
}
