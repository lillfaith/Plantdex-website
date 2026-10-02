import { PlantdexIcon } from './icons/PlantdexIcon';

/**
 * Told when a card was unlocked by a species that is NOT the card's own.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * REQUIRED FOR `curatedEquivalent`, AND ONLY FOR IT. The other four bases do not need it and
 * must not get it: with `exact` and `synonym` the plant and the card are the same species;
 * with `genusCard` the card declared its own scope on its face; with `acceptedGroup` the
 * observation never resolved to a species, so nothing was equated and there is no second name
 * to contrast. `curatedEquivalent` is the one case where Plantdex decided two DISTINCT
 * accepted species share a card, and a player is owed that in words.
 *
 * IT SAYS "different species" EXPLICITLY, rather than printing two binomials side by side and
 * trusting the reader to notice. The failure this whole architecture exists to prevent is
 * somebody concluding that Plantdex renamed their plant — and two italic names in a row is
 * exactly what that would look like.
 *
 * NOT STYLED AS A WARNING. Nothing here is a hazard: the card's use, part, chemistry and
 * safety content were researched to hold for both species before the equivalence was written
 * down. Borrowing `CardWarning`'s treatment would spend the reader's alarm on a taxonomy note
 * and make the next real warning cheaper.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function EquivalentSpeciesNotice({
  observedName,
  cardName,
  anchorName,
}: {
  /** What the identifier actually named. Never rewritten to the anchor. */
  observedName: string;
  cardName: string;
  /** The card's own binomial. */
  anchorName: string;
}) {
  return (
    <p
      role="note"
      className="mt-3 flex items-start gap-2 rounded-xl border border-violet-700 bg-violet-900/40 px-3 py-2.5 text-sm text-violet-100"
    >
      <PlantdexIcon name="revealed" className="mt-0.5 shrink-0 text-base" />
      <span>
        You found <i>{observedName}</i>. That unlocks the <b>{cardName}</b> card, whose species
        is <i>{anchorName}</i> — <b>these are different species</b>. Plantdex has recorded what
        you found.
      </span>
    </p>
  );
}
