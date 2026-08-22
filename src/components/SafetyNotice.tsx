import Link from 'next/link';
import { DISCLAIMER } from '@/lib/deck';

/**
 * Herbal safety.
 *
 * AGENTS.md treats this as non-negotiable: the site is educational, must not read as
 * medical advice, and misidentifying a wild plant has real consequences.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LESS VISUAL DOMINANCE, NOT LESS SAFETY
 *
 * The full disclaimer used to sit at the bottom of every page as the largest block of
 * text on it, which competed with the deck and — worse — trained people to scroll past
 * it. It now comes in two weights, and BOTH link to the full page at /safety:
 *
 *   brief    — one line. For pages that only list or track plants.
 *   standard — the deck's disclaimer in full. For pages where ingestion, preparation,
 *              identification or medicinal traditions are actually discussed.
 *
 * Choosing `brief` on a page that discusses preparation is a safety regression, not a
 * design choice. When in doubt, use `standard`.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The wording is the deck's own, transcribed verbatim from the Disclaimer card (#47) so
 * the physical product and the site say exactly the same thing. Edit it in
 * scripts/build_deck.py (DISCLAIMER), not here.
 */
export function SafetyNotice({ variant = 'standard' }: { variant?: 'standard' | 'brief' }) {
  if (variant === 'brief') {
    return (
      <aside
        aria-labelledby="safety-heading"
        className="mx-auto flex max-w-2xl flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-center text-xs leading-relaxed text-violet-400"
      >
        <span id="safety-heading" className="font-bold tracking-wide text-gold-400 uppercase">
          <span aria-hidden="true">⚠</span> Herbal safety
        </span>
        <span>
          Educational use only. Always identify a plant properly before use — never from a
          card or an app alone.
        </span>
        <SafetyLink />
      </aside>
    );
  }

  return (
    <aside aria-labelledby="safety-heading" className="mx-auto max-w-2xl">
      <h2
        id="safety-heading"
        className="flex items-center gap-2 text-xs font-bold tracking-wide text-gold-400 uppercase"
      >
        <span aria-hidden="true">⚠</span> Herbal safety
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-violet-300">{DISCLAIMER.main}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-violet-400">{DISCLAIMER.availability}</p>
      <p className="mt-2">
        <SafetyLink />
      </p>
    </aside>
  );
}

function SafetyLink() {
  return (
    <Link
      href="/safety"
      className="text-xs font-semibold whitespace-nowrap text-gold-400 underline underline-offset-2 hover:text-gold-300"
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
      <span aria-hidden="true">⚠</span>
      <span>
        <span className="sr-only">Warning: </span>
        {warning}
      </span>
    </p>
  );
}
