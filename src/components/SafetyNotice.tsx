/**
 * Herbal safety disclaimer.
 *
 * AGENTS.md treats this as non-negotiable: the site is educational and must not read as
 * medical advice, and misidentifying a wild plant has real consequences. This component
 * is shown on the Herbdex and on every herb page.
 *
 * NOTE FOR THE OWNER: the deck's own Disclaimer card (#47) carries your official
 * wording. Its back is not in the reference package, so this is placeholder-free but
 * generic safety copy. Replace it with the card's exact text before public launch so
 * the deck and the site say the same thing.
 */
export function SafetyNotice({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  if (variant === 'compact') {
    return (
      <p className="text-xs leading-relaxed text-violet-300">
        <span className="font-semibold text-gold-400">Educational use only.</span> Never eat,
        drink, or apply a wild plant based on a card or an app alone.
      </p>
    );
  }

  return (
    <aside
      aria-labelledby="safety-heading"
      className="panel mx-auto max-w-2xl p-4 sm:p-5"
    >
      <h2
        id="safety-heading"
        className="flex items-center gap-2 text-sm font-bold tracking-wide text-gold-400 uppercase"
      >
        <span aria-hidden="true">⚠</span> Safety first
      </h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-violet-200">
        <p>
          Plantdex is an educational field guide and collecting game. It is not medical
          advice, and nothing here is intended to diagnose, treat, cure, or prevent any
          condition.
        </p>
        <p>
          Plant identification carries real risk. Several common plants have dangerous
          look-alikes.{' '}
          <strong className="text-gold-300">
            Never eat, drink, brew, or apply a wild plant based on a card, a photograph, or
            an app.
          </strong>{' '}
          Confirm any identification with reliable botanical references and qualified local
          expertise first, and check with a healthcare professional before using any plant
          medicinally — especially if you are pregnant, nursing, taking medication, or
          treating a child.
        </p>
        <p className="text-violet-300">
          The traditional-use icons on each card describe historical and folk use only. They
          are not statements of medical effect.
        </p>
      </div>
    </aside>
  );
}
