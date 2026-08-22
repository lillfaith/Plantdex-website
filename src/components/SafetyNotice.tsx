import { DISCLAIMER } from '@/lib/deck';

/**
 * Herbal safety disclaimer.
 *
 * AGENTS.md treats this as non-negotiable: the site is educational and must not read as
 * medical advice, and misidentifying a wild plant has real consequences. This component
 * appears on the Herbdex and on every herb page.
 *
 * The wording is the deck's own, transcribed verbatim from the Disclaimer card (#47) so
 * the physical product and the site say exactly the same thing. Edit it in
 * scripts/build_deck.py (DISCLAIMER), not here.
 */
export function SafetyNotice({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  if (variant === 'compact') {
    return (
      <p className="text-xs leading-relaxed text-violet-300">
        <span className="font-semibold text-gold-400">Educational use only.</span> Always
        properly identify a plant before use, and never rely on a card or an app alone.
      </p>
    );
  }

  return (
    <aside aria-labelledby="safety-heading" className="panel mx-auto max-w-2xl p-4 sm:p-5">
      <h2
        id="safety-heading"
        className="flex items-center gap-2 text-sm font-bold tracking-wide text-gold-400 uppercase"
      >
        <span aria-hidden="true">⚠</span> Disclaimer
      </h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-violet-200">
        <p>{DISCLAIMER.main}</p>
        <p className="text-violet-300">{DISCLAIMER.availability}</p>
      </div>
    </aside>
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
 * Rendered prominently and never collapsed behind an interaction.
 */
export function CardWarning({ warning }: { warning: string }) {
  return (
    <p
      role="note"
      className="flex items-start gap-2 rounded-xl border border-stat-temp/60 bg-stat-temp/15 px-3 py-2.5 text-sm font-semibold text-violet-100"
    >
      <span aria-hidden="true">⚠</span>
      <span>
        <span className="sr-only">Warning: </span>
        {warning}
      </span>
    </p>
  );
}
