'use client';

import { useState, type RefObject } from 'react';
import type { Herb } from '@/lib/types';
import {
  GENUS_CARD_NOTICE,
  IDENTIFICATION_CAVEAT,
  fieldNotesFor,
  isGenusCard,
} from '@/lib/card-field-notes';
import { iconForTrait } from '@/lib/trait-icons';
import { PlantdexIcon } from '../icons/PlantdexIcon';

/**
 * WHAT TO GO AND LOOK AT, AS A CHECKLIST RATHER THAN A BRIEFING.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE SCAN SCREEN MAY NOT SPEND THE REVEAL TO ASK FOR IT. A candidate matching a card used
 * to print the card's COMMON NAME on the row and offer to open it; `LockedHerb` withholds
 * exactly that — "no name, no artwork, no card-back content" — so the one path ending in a
 * discovery was the one path giving it away first. Nothing here names the collectible.
 *
 * WHAT IT MAY CONTAIN is decided by what it is FOR: comparing a living plant against a
 * proposed species. That is the site's own curated field notes, and nothing from the card —
 * no artwork, no sprite, no common name, and none of `healingTraits`, `compounds`, `taste`,
 * `aromatic`, `preparations` or `usableParts`, which are what a discovery BUYS and which say
 * nothing about which plant this is.
 *
 * READ STANDING UP, SO IT IS ROWS AND NOT PARAGRAPHS. This began as prose and read like a
 * briefing: three explanatory sentences before the first trait. A person holding a phone in
 * front of a plant is matching, not reading, so each trait is one tappable row with its own
 * organ icon, and the lookalike and habitat sections are a line each.
 *
 * THE BOXES ARE AN AID AND NOTHING ELSE. They are local state, never persisted, never read
 * by anything, and they gate NOTHING: the confirm button is enabled at zero ticks and at
 * four. Counting them would invent a confidence system this app deliberately does not have —
 * eligibility is the matcher's, and a checkbox may not overrule it in either direction.
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
   * Owned by the caller and mounted ONCE, high in the tree. Same rule `KnowledgeCheck` and
   * the discovery celebration follow: confirming re-renders the row this was opened from, so
   * a dialog living inside that row would be unmounted by the action it reports.
   */
  readonly dialogRef: RefObject<HTMLDialogElement | null>;
  readonly herb: Herb | null;
  readonly scientificName: string | null;
  readonly onConfirm: () => void;
  readonly onDismiss: () => void;
}) {
  /*
   * Keyed by trait label and reset whenever the subject changes, so reopening on a different
   * candidate never shows the previous plant's ticks. Deliberately not lifted, not stored and
   * not returned: there is nothing for anybody to read.
   */
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const [subject, setSubject] = useState<string | null>(null);
  if (subject !== scientificName) {
    setSubject(scientificName);
    setTicked(new Set());
  }

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
            the thing being tested; the collectible stays unnamed until it is unlocked.
          */}
          <h2 className="font-display mt-1 text-xl font-bold break-words italic text-violet-100">
            {scientificName}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-violet-300">
            Compare these traits with the plant in front of you.
          </p>

          {isGenusCard(herb) && (
            <p className="mt-2 text-xs leading-relaxed text-violet-400">{GENUS_CARD_NOTICE}</p>
          )}
          {notes?.genusTraitsNote && (
            <p className="mt-2 text-xs leading-relaxed text-violet-400">{notes.genusTraitsNote}</p>
          )}

          {notes?.identification?.length ? (
            <ul className="mt-4 space-y-1">
              {notes.identification.map(({ trait, detail }) => {
                const icon = iconForTrait(trait);
                const on = ticked.has(trait);
                return (
                  <li key={trait}>
                    {/*
                      A BUTTON WITH `aria-pressed`, NOT A CHECKBOX. It records nothing and
                      submits nothing, so a form control would promise a consequence there
                      isn't one of — and the drawn square is the same filled/hollow marker
                      `ObservationPhotos` uses for its slots, rather than a font's tick.
                    */}
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setTicked((current) => {
                          const next = new Set(current);
                          if (!next.delete(trait)) next.add(trait);
                          return next;
                        })
                      }
                      className="flex min-h-11 w-full items-start gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-plum-700/40"
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 inline-block h-3.5 w-3.5 shrink-0 border-2 ${
                          on ? 'border-gold-400 bg-gold-400' : 'border-violet-400'
                        }`}
                      />
                      {icon && (
                        <PlantdexIcon
                          name={icon}
                          aria-hidden="true"
                          className={`mt-px shrink-0 text-base ${on ? 'text-gold-300' : 'text-violet-400'}`}
                        />
                      )}
                      <span className="min-w-0">
                        <span
                          className={`block text-sm font-bold ${on ? 'text-gold-200' : 'text-violet-100'}`}
                        >
                          {trait}
                        </span>
                        <span className="block text-xs leading-relaxed text-violet-300">
                          {detail}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            /* A Field Card has no curated notes, and an empty heading would read as "nothing to check". */
            <p className="mt-4 text-sm leading-relaxed text-violet-300">
              No field notes for this species yet &mdash; check it against a field guide.
            </p>
          )}

          {/* Said ONCE, where the traits are, which is the only place it gets read. */}
          <p className="mt-3 text-xs leading-relaxed text-gold-300">{IDENTIFICATION_CAVEAT}</p>

          {notes?.lookalikes?.length ? (
            <section className="mt-4">
              {/*
                IMMEDIATELY AFTER THE TRAITS, the order `FieldNotesSections` already uses: a
                reader who has just matched a trait list is the reader who needs to know what
                else matches it. `risk` keeps its own hazard weight; everything else is one line.
              */}
              <h3 className="flex items-center gap-1.5 text-[0.72rem] font-bold tracking-[0.1em] text-pink-accent uppercase">
                <PlantdexIcon name="safety" aria-hidden="true" className="text-sm" />
                Easily confused with
              </h3>
              <ul className="mt-1.5 space-y-2">
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
                    <p className="text-xs leading-relaxed text-violet-300">{look.distinguishBy}</p>
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
              <h3 className="flex items-center gap-1.5 text-[0.72rem] font-bold tracking-[0.1em] text-violet-300 uppercase">
                <PlantdexIcon name="compass" aria-hidden="true" className="text-sm" />
                Typical habitat
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-violet-300">{notes.habitat}</p>
            </section>
          )}

          {/*
            THE CARD'S OWN PRINTED WARNING — the one piece of card content that may appear
            before discovery. AGENTS.md requires a printed warning never to sit behind an
            interaction, and `LockedHerb` shows it on a locked page for the same reason.
          */}
          {herb.warning && (
            <p className="mt-4 rounded-lg border border-pink-accent/50 bg-plum-800/60 p-3 text-xs leading-relaxed text-violet-100">
              <span className="font-bold text-pink-accent">Card warning: </span>
              {herb.warning}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={onConfirm}
              className="arcade-key min-h-12 w-full rounded-full bg-gold-400 px-4 text-sm font-bold tracking-wide text-plum-900 uppercase transition-colors hover:bg-gold-300"
            >
              This matches my plant
            </button>
            {/*
              NOT A CANCEL. "I'm not sure yet" is the honest answer to a comparison somebody
              could not finish, and naming it that way makes leaving an outcome rather than an
              abandoned task.
            */}
            <button
              type="button"
              onClick={onDismiss}
              className="min-h-11 w-full rounded-full border border-violet-600 px-4 text-sm font-semibold text-violet-200 transition-colors hover:border-violet-400 hover:text-violet-100"
            >
              I&rsquo;m not sure yet
            </button>
          </div>
          {/* One line, at the point of decision. The full safety section stays on the page. */}
          <p className="mt-2 text-center text-xs text-violet-400">
            Log it only if you met this plant outdoors.
          </p>
        </div>
      )}
    </dialog>
  );
}
