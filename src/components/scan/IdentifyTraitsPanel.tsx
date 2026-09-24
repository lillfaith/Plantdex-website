'use client';

import type { RefObject } from 'react';
import type { Herb } from '@/lib/types';
import {
  GENUS_CARD_NOTICE,
  IDENTIFICATION_CAVEAT,
  fieldNotesFor,
  isGenusCard,
} from '@/lib/card-field-notes';

/**
 * WHAT TO GO AND LOOK AT, BEFORE ANYTHING IS UNLOCKED.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE SCAN SCREEN WAS SPENDING THE REVEAL TO ASK FOR IT. A candidate that matched a card
 * printed the card's COMMON NAME on the row — "Has a Plantdex card: Wood Sorrel" — and
 * offered to open that card. `LockedHerb` states the opposite rule in as many words: an
 * undiscovered card shows "nothing that would spoil the reveal — no name, no artwork, no
 * card-back content". So the one path that ends in a discovery was also the one path that
 * gave the discovery away first, and the flip at the end had nothing left to turn over.
 *
 * WHAT THIS PANEL MAY CONTAIN is therefore decided by what it is FOR: comparing a living
 * plant against a proposed species. That is the site's own field notes — traits, habitat and
 * lookalikes, all curated with sources in `card-field-notes.ts` — and nothing from the
 * collectible at all. No common name, no card number, no artwork, no sprite, and none of the
 * card back: `healingTraits`, `compounds`, `taste`, `aromatic`, `preparations` and
 * `usableParts` are what a player has EARNED, and they say nothing about which plant this is.
 *
 * THE NAME IS THE SCIENTIFIC ONE, AND IT IS NOT A SPOILER. It came from the identifier and
 * is already printed on the row above. Five cards — the `spp.` genus cards — do carry their
 * common name inside the curated trait prose, because for those the common name IS the genus
 * ("Oak", "Maple"), which `Quercus spp.` on the row has already said. Nothing is redacted to
 * hide it: the same prose carries lookalike warnings naming poison sumac and death camas, and
 * editing safety text to protect a surprise is not a trade this app makes.
 *
 * IT ALSO DOES NOT ESTABLISH SAFETY, and says so where the traits are rather than at the foot
 * where it would be scrolled past. `IDENTIFICATION_CAVEAT` is the deck's own sentence.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function IdentifyTraitsPanel({
  dialogRef,
  herb,
  scientificName,
  onConfirm,
  onDismiss,
}: {
  /**
   * Owned by the caller and mounted ONCE, high in the tree.
   *
   * Same rule `KnowledgeCheck` and the discovery celebration follow: confirming advances the
   * collection and re-renders the row this was opened from, so a dialog living inside that
   * row would be unmounted by the very action it reports. It must outlive the state change
   * and keep a stable position, or React recreates the element underneath itself.
   */
  readonly dialogRef: RefObject<HTMLDialogElement | null>;
  /** Absent until a row is chosen, so the dialog can be mounted before there is a subject. */
  readonly herb: Herb | null;
  readonly scientificName: string | null;
  readonly onConfirm: () => void;
  readonly onDismiss: () => void;
}) {
  const notes = herb ? fieldNotesFor(herb) : null;

  return (
    <dialog
      ref={dialogRef}
      aria-label="Check identifying traits"
      className="panel m-auto w-[min(30rem,calc(100vw-2rem))] p-5 text-left text-violet-100 backdrop:bg-plum-950/80 backdrop:backdrop-blur-sm"
      onClose={onDismiss}
    >
      {herb && scientificName && (
        <div className="max-h-[75vh] overflow-y-auto">
          <p className="text-[0.72rem] font-bold tracking-[0.1em] text-gold-300 uppercase">
            Check before you log
          </p>
          {/*
            THE PROPOSED SPECIES, NOT THE CARD. The binomial is the identifier's answer and
            the thing being tested; the collectible it would unlock is deliberately unnamed
            until it is unlocked.
          */}
          <h2 className="font-display mt-1 text-xl font-bold break-words italic text-violet-100">
            {scientificName}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-violet-300">
            Compare the plant in front of you against these traits. Plantdex has not checked
            your photographs against anything &mdash; you are the one deciding.
          </p>

          {isGenusCard(herb) && (
            <p className="mt-2 text-xs leading-relaxed text-violet-400">{GENUS_CARD_NOTICE}</p>
          )}
          {notes?.genusTraitsNote && (
            <p className="mt-2 text-xs leading-relaxed text-violet-400">{notes.genusTraitsNote}</p>
          )}

          {notes?.identification?.length ? (
            <section className="mt-4">
              <h3 className="text-[0.72rem] font-bold tracking-[0.1em] text-violet-300 uppercase">
                What to look at
              </h3>
              <dl className="mt-2 space-y-2">
                {notes.identification.map(({ trait, detail }) => (
                  <div key={trait}>
                    <dt className="text-sm font-bold text-violet-100">{trait}</dt>
                    <dd className="text-sm leading-relaxed text-violet-300">{detail}</dd>
                  </div>
                ))}
              </dl>
              {/* Said where the traits are, which is the only place it gets read. */}
              <p className="mt-3 text-xs leading-relaxed text-gold-300">{IDENTIFICATION_CAVEAT}</p>
            </section>
          ) : (
            /*
             * HONEST ABOUT HAVING NOTHING. A Field Card has no curated field notes, and an
             * empty "What to look at" heading would read as "there is nothing to check".
             */
            <p className="mt-4 text-sm leading-relaxed text-violet-300">
              Plantdex has no field notes for this species yet, so check it against a field
              guide rather than against this screen.
            </p>
          )}

          {notes?.lookalikes?.length ? (
            <section className="mt-4">
              <h3 className="text-[0.72rem] font-bold tracking-[0.1em] text-violet-300 uppercase">
                Easily confused with
              </h3>
              {/*
                IMMEDIATELY AFTER THE TRAITS, the order `FieldNotesSections` already uses: a
                reader who has just matched a trait list is exactly the reader who needs to
                know what else matches it.
              */}
              <ul className="mt-2 space-y-2">
                {notes.lookalikes.map((look) => (
                  <li key={look.commonName}>
                    <p className="text-sm font-bold text-violet-100">
                      {look.commonName}
                      {look.scientificName && (
                        <span className="ml-1 font-normal italic text-violet-400">
                          {look.scientificName}
                        </span>
                      )}
                    </p>
                    <p className="text-sm leading-relaxed text-violet-300">{look.distinguishBy}</p>
                    {look.risk && (
                      <p className="mt-1 rounded-lg border border-pink-accent/50 bg-plum-800/60 p-2 text-xs leading-relaxed text-violet-100">
                        <span className="font-bold text-pink-accent">Risk: </span>
                        {look.risk}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              {notes.lookalikeNote && (
                <p className="mt-2 text-xs leading-relaxed text-violet-300">
                  {notes.lookalikeNote}
                </p>
              )}
            </section>
          ) : null}

          {notes?.habitat && (
            <section className="mt-4">
              <h3 className="text-[0.72rem] font-bold tracking-[0.1em] text-violet-300 uppercase">
                Where it grows
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-violet-300">{notes.habitat}</p>
            </section>
          )}

          {/*
            THE CARD'S OWN PRINTED WARNING, which is the one piece of card content that may
            appear before discovery. AGENTS.md requires a printed warning never to sit behind
            an interaction, and `LockedHerb` already shows it on a locked page for the same
            reason: it names a real risk of misidentification, which outranks the surprise.
          */}
          {herb.warning && (
            <p className="mt-4 rounded-lg border border-pink-accent/50 bg-plum-800/60 p-3 text-xs leading-relaxed text-violet-100">
              <span className="font-bold text-pink-accent">Card warning: </span>
              {herb.warning}
            </p>
          )}

          <p className="mt-4 text-sm leading-relaxed font-semibold text-violet-200">
            Log it only if you met the plant outdoors and the traits above match what you saw.
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={onConfirm}
              className="arcade-key min-h-11 w-full rounded-full border border-gold-500/60 bg-gold-500/12 px-4 text-sm font-bold text-gold-300 transition-colors hover:bg-gold-500/20"
            >
              This matches my plant
            </button>
            {/*
              NOT A CANCEL. "I'm not sure yet" is the honest answer to a comparison somebody
              could not complete, and naming it that way makes leaving a legitimate outcome
              rather than an abandoned task.
            */}
            <button
              type="button"
              onClick={onDismiss}
              className="min-h-11 w-full rounded-full border border-violet-600 px-4 text-sm font-semibold text-violet-200 transition-colors hover:border-violet-400 hover:text-violet-100"
            >
              I&rsquo;m not sure yet
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
