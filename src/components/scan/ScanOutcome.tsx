'use client';

import Link from 'next/link';
import { PlantSprite } from '@/components/PlantSprite';
import { SeedPacket } from '@/components/seedshelf/SeedPacket';
import { track } from '@/lib/analytics';
import { getAchievement } from '@/lib/achievements';
import { ScanResearchFeedback } from './ScanResearchFeedback';
import type { PacketRecipe } from '@/lib/seed-packet';

/**
 * WHAT PLANTDEX DID WITH YOUR FIND.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE STEP THE LOOP WAS MISSING. A scan ended with an identification and an action, and then
 * the product went quiet. Case A printed one grey line — "Added to your collection" — at the
 * very bottom of the page. Case B changed a heading inside the save box. Neither told a
 * first-time user what had actually happened to the thing they found, and neither read as a
 * moment.
 *
 * The two cases are the same beat of the same loop, so they get the same component and the
 * same shape: a claim about what Plantdex now holds, the artwork of the thing it holds, and
 * ONE onward link. What differs is only which world the find landed in.
 *
 * WHY IT SHOWS ARTWORK. The whole product is "a plant became a collectible object". Saying so
 * in a sentence and showing nothing is the version of that a spreadsheet would ship. Case A
 * shows the species' own creature, Case B the packet that was just minted for it, and both
 * are already in the app — this draws nothing new.
 *
 * WHY IT MAKES NO SAFETY CLAIM. It is the loudest panel on the screen at the moment somebody
 * has just been told what a plant is, so it is exactly where a safety claim would be read
 * into silence. It reports a bookkeeping fact — a record was written — and says nothing about
 * whether the plant is safe or whether the identification is right. `ScanCaution` above it
 * carries that, unconditionally and never gated on a score.
 * ─────────────────────────────────────────────────────────────────────────────
 */

interface Common {
  /** The onward link's own label, so each case can say where it actually goes. */
  href: string;
}

export type ScanOutcomeProps =
  | ({
      kind: 'card';
      herbId: string;
      commonName: string;
      scientificName: string;
      /** What the discovery paid. Zero on a repeat — the reducer is idempotent. */
      xpAwarded: number;
      /** Achievement ids that unlocked on THIS discovery, from `discover()` itself. */
      newAchievementIds: readonly string[];
      /** When the player confirmed, so research feedback can attribute itself. */
      confirmedAt: number;
    } & Common)
  | ({
      kind: 'packet';
      recipe: PacketRecipe;
      commonName: string;
      scientificName: string;
    } & Common);

export function ScanOutcome(props: ScanOutcomeProps) {
  const card = props.kind === 'card';

  return (
    <section
      /*
       * `aria-live="polite"` and not `assertive`: this announces after an action the player
       * took deliberately, so it is news rather than an interruption, and assertive would cut
       * across a screen reader mid-sentence to say something they just asked for.
       */
      aria-live="polite"
      aria-labelledby="scan-outcome-heading"
      className={`rounded-2xl border-l-4 p-5 ${
        card
          ? 'border-y border-r border-y-gold-500/30 border-r-gold-500/30 border-l-gold-500 bg-plum-800/60'
          : 'border-y border-r border-y-violet-700/70 border-r-violet-700/70 border-l-mystery-violet bg-plum-800/50'
      }`}
    >
      <div className="flex items-start gap-4">
        <span className={`shrink-0 ${card ? 'w-16' : 'w-14'}`}>
          {props.kind === 'card' ? (
            /*
             * `frozen`. This panel appears at the end of an action and stays on screen while
             * somebody reads it and decides where to go; a creature looping beside the text
             * for that whole time is ambient motion with nothing to say. Frame 0 is authored
             * as a complete resting pose precisely so it can be held.
             */
            <PlantSprite
              herbId={props.herbId}
              alt={`Pixel-art character for ${props.commonName}`}
              frozen
              fit
              className="w-full drop-shadow-[0_4px_10px_rgba(23,16,28,0.6)]"
            />
          ) : (
            <SeedPacket
              recipe={props.recipe}
              alt={`Seed packet for ${props.commonName}`}
            />
          )}
        </span>

        <div className="min-w-0 flex-1">
          {/*
            IN-WORLD AND SHORT. "You found a Plantdex species" rather than "Success" or
            "Saved": the first says what happened in the world the deck describes, and the
            other two describe a database.
          */}
          <h3
            id="scan-outcome-heading"
            className={`font-display text-lg leading-tight font-bold ${
              card ? 'text-gold-plate' : 'text-violet-100'
            }`}
          >
            {card ? 'You found a Plantdex species' : 'New seed packet'}
          </h3>
          <div aria-hidden="true" className="pixel-rule mt-2 w-14" />

          <p className="mt-2 text-sm leading-relaxed text-violet-200">
            {card ? (
              <>
                <span className="font-bold text-violet-100">{props.commonName}</span> is in your
                collection now.
              </>
            ) : (
              <>
                <span className="font-bold text-violet-100">{props.commonName}</span> has no card
                in this collection, so Plantdex kept it for you on your Seed Shelf.
              </>
            )}
          </p>
          {/*
            THE FULL BINOMIAL, ALWAYS. A common name is the loose half of an identification —
            several plants share one — and this panel is the record of what was found. The
            Seed Shelf makes the same argument about its own captions for the same reason.
          */}
          <p className="mt-0.5 text-xs text-violet-400 italic">{props.scientificName}</p>

          {!card && (
            <p className="mt-2 text-xs leading-relaxed text-violet-400">
              A packet earns no XP and does not fill your collection. If this species becomes a
              card one day, your find will already be waiting — dated today.
            </p>
          )}

          {/*
            WHAT THE FIND WAS WORTH, AND WHAT IT UNLOCKED.

            THE STARTER OBJECTIVE ALREADY EXISTED. `first-find` — "Discover your first herb" —
            has been in `achievements.ts` since the beginning: a pure predicate over state, so
            it unlocks retroactively, and it pays a badge rather than XP. What was missing is
            that the SCAN path never mentioned it. The card page has celebrated a discovery
            since the beginning; the scanner, which is the path a stranger from a vendor table
            actually takes, called `discover()` and threw its answer away. So the one moment
            that teaches "Plantdex rewards going outside and looking" was silent on the only
            route a new player uses.

            This is wiring, not a new system, which is why no Field Research task was added
            for it. The only XP tiers that exist are 25 (daily — semantically wrong, since a
            daily must be offered before it may pay) and 250/500, both sized for multi-card
            challenges; awarding 250 for a single discovery would devalue the tier that
            "Backyard Collection" sits in AND hand every existing player 250 XP retroactively
            on their next load. A new tier would mean editing RESEARCH_XP, `researchKindFromId`
            and the analytics event names — an architectural change for a teaching moment the
            achievement system already models correctly.

            Rendered only when something actually happened: `awarded` is false on a repeat, so
            a plant found twice says nothing here rather than claiming a second reward.
          */}
          {card && (props.xpAwarded > 0 || props.newAchievementIds.length > 0) && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {props.xpAwarded > 0 && (
                <li className="rounded-full border border-gold-500/40 bg-gold-500/12 px-2.5 py-1 text-xs font-bold tabular-nums text-gold-300">
                  +{props.xpAwarded} XP
                </li>
              )}
              {props.newAchievementIds.map((id) => {
                const achievement = getAchievement(id);
                if (!achievement) return null;
                return (
                  <li
                    key={id}
                    className="rounded-full border border-mystery-violet/50 bg-mystery-violet/15 px-2.5 py-1 text-xs font-bold text-violet-100"
                  >
                    {/* The achievement's own name, never a restatement of its condition —
                        the same rule the frames and titles cabinet follows. */}
                    {achievement.name} unlocked
                  </li>
                );
              })}
            </ul>
          )}

          {/*
            ONE ONWARD LINK, AND IT IS THE OBVIOUS ONE. A first-time user who has just been
            told where their find went wants to go and look at it. Offering a second choice
            here turns an answer back into a decision.
          */}
          <Link
            href={props.href}
            onClick={() =>
              track(card ? 'herbdex_opened_from_scan' : 'seed_shelf_opened_from_scan')
            }
            className={`mt-3 inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-2 ${
              card
                ? 'text-gold-400 hover:text-gold-300'
                : 'text-violet-100 hover:text-gold-400'
            }`}
          >
            {card ? 'Open its card' : 'Open your Seed Shelf'} &rarr;
          </Link>

          {/*
            WHAT THIS FIND DID TO FIELD RESEARCH, when it did anything.

            BELOW the onward link, not above it. Placed first, its own "View Field Research"
            link became the first thing in the panel and the primary action — opening the card
            you just collected — was pushed under a secondary one. The rule this panel was
            built on is one obvious next step; research is the reason to come back, not the
            thing to do right now.

            It reads the outcome reconciliation actually recorded rather than deriving a
            second answer, and renders nothing at all when no task moved — which is the
            common case and must stay silent.
          */}
          {card && <ScanResearchFeedback herbId={props.herbId} since={props.confirmedAt} />}
        </div>
      </div>
    </section>
  );
}
