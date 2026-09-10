'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSeedShelf } from '@/lib/seed-shelf-store';
import { isShelfEligible } from '@/lib/seed-shelf';
import { loadCanonicalPackets, previewPacket, useCanonicalPackets } from '@/lib/species-packets';
import { normalizeName, type ScanCandidate } from '@/lib/plant-match';
import { track } from '@/lib/analytics';
import { SeedPacket } from './SeedPacket';
import { ScanOutcome } from '../scan/ScanOutcome';

/**
 * "Save to Seed Shelf" — the offer on a scan that named a real plant the deck has no card for.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT OFFERS THE IDENTIFICATION, NOT A GUESS AT ONE. The species saved is the identifier's
 * top-ranked answer, shown by name with its score, and shelving it is an explicit tap — the
 * same rule the confirm buttons follow. Nothing is written by arriving at this screen.
 *
 * AND IT IS NOT A DISCOVERY. The copy says so, the count says so, and the code cannot do
 * otherwise: this writes to the Seed Shelf store, which the collection reducer cannot see.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The packet is drawn BEFORE saving, from the same deterministic recipe the shelf will use.
 * A player deciding whether to keep something should be able to see what they are keeping —
 * and because the recipe is a function of the name, the packet on the shelf is this one.
 */
export function SaveToSeedShelf({
  candidates,
  scanId,
  onSaved,
}: {
  candidates: readonly ScanCandidate[];
  scanId?: string;
  /**
   * Told to the scan screen so it can stand down its own alternatives.
   *
   * Once a packet is saved the player has been handed one obvious next step, and the
   * "Browse the collection instead" link sitting under this panel turned that answer back
   * into a choice between two gold links of the same weight. The scan screen owns that link,
   * so it has to hear about the save.
   */
  onSaved?: () => void;
}) {
  const { entries, save } = useSeedShelf();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The identifier's own leading answer, provided it is a species the deck does not carry.
  // `isShelfEligible` refuses a bare genus and anything confirmable as a card, so a species
  // with a card can never be filed here instead of being discovered.
  const candidate = useMemo(
    () => candidates.find((entry) => isShelfEligible(entry.scientificName)),
    [candidates],
  );

  // Compared on the SPECIES KEY, never on the printed name: "Bellis perennis L." and
  // "Bellis perennis" are the same shelf entry, and the shelf is what decides that.
  const already = useMemo(
    () =>
      candidate
        ? entries.find((entry) => entry.speciesKey === normalizeName(candidate.scientificName))
        : undefined,
    [candidate, entries],
  );

  /*
   * Read the canonical packet for the species being offered, if Plantdex already has one.
   *
   * A READ, never a write: arriving at this screen must not introduce a species to the
   * registry. Minting happens on the explicit save, in `addRemoteFind`.
   */
  const registryVersion = useCanonicalPackets();
  useEffect(() => {
    if (candidate) void loadCanonicalPackets([normalizeName(candidate.scientificName)]);
  }, [candidate]);

  const onSave = useCallback(async () => {
    if (!candidate) return;
    setSaving(true);
    setError(null);
    // Paired with `seed_shelf_saved` below. Only the success used to be counted, so an outage
    // in the one network write this loop depends on would have looked exactly like nobody
    // wanting to save anything. The difference between the two is the failure rate.
    track('seed_shelf_save_started');
    try {
      await save({
        scientificName: candidate.scientificName,
        commonName: candidate.commonName,
        gbifId: candidate.gbifId,
        powoId: candidate.powoId,
        confidence: candidate.score,
        scanId,
        // The scan's signed candidate, relayed untouched. This component cannot read it and
        // has no reason to — `seed-packet` is the only thing that can.
        attestation: candidate.attestation,
      });
      track('seed_shelf_saved');
      setSaved(true);
      onSaved?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That could not be saved. Try again.');
    } finally {
      setSaving(false);
    }
  }, [candidate, save, scanId, onSaved]);

  if (!candidate) return null;

  /*
   * What this species' packet actually looks like.
   *
   * The canonical one if Plantdex has already met the species — which is the honest preview,
   * because that is the bag the shelf will show — and otherwise the generator's answer, which
   * is exactly what the server will mint from the same name.
   */
  // `registryVersion` is read so the preview re-renders the moment the canonical packet
  // arrives; `previewPacket` itself reads the cache the version counts.
  void registryVersion;
  const recipe = previewPacket({
    scientificName: candidate.scientificName,
    commonName: candidate.commonName,
  });
  const name = candidate.commonName ?? candidate.scientificName;

  /*
   * SAVED IS A MOMENT, NOT A CHANGED HEADING.
   *
   * This used to swap the box's own title to "On your Seed Shelf" and leave everything else
   * where it was, which reads as a form acknowledging itself. A species with no card is HALF
   * of what this product does — 45 species out of a world of them, so it is the ordinary
   * outcome — and it deserves the same weight as finding a card does. `ScanOutcome` is the
   * component the card branch uses, so both halves of the loop now end the same way: what
   * Plantdex holds, the artwork of it, one onward link.
   */
  if (saved) {
    return (
      <div className="mt-4">
        <ScanOutcome
          kind="packet"
          recipe={recipe}
          commonName={name}
          scientificName={candidate.scientificName}
          href="/seed-shelf"
        />
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-violet-700/70 bg-plum-800/50 p-4">
      <div className="flex items-start gap-3">
        <span className="w-12 shrink-0">
          <SeedPacket recipe={recipe} alt={`Seed packet for ${name}`} />
        </span>
        <div className="min-w-0 flex-1">
          {/*
            Only the UNSAVED state renders below — the saved one returns `ScanOutcome` above,
            so the `saved ? …` branches that used to be threaded through here are gone rather
            than left unreachable.
          */}
          <h4 className="text-sm font-bold text-violet-100">Keep it on your Seed Shelf</h4>
          <p className="mt-1 text-xs leading-relaxed text-violet-300">
            This plant isn&rsquo;t in the Plantdex yet. Save it here &mdash; if it becomes a
            card in a future collection, your discovery will already be waiting.
          </p>
          <p className="mt-2 text-xs text-violet-400">
            Saving keeps a record. It earns no XP and doesn&apos;t add to your collection.
          </p>

          {already ? (
            <Link
              href="/seed-shelf"
              className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-gold-400 underline underline-offset-2 hover:text-gold-300"
            >
              Open my Seed Shelf &rarr;
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={saving}
              className="arcade-key mt-3 min-h-11 w-full rounded-full border border-violet-500 bg-plum-700/70 px-4 text-sm font-bold text-violet-100 transition-colors hover:bg-plum-600 disabled:opacity-60 sm:w-auto"
            >
              {saving ? 'Saving…' : 'Save to Seed Shelf'}
            </button>
          )}

          {already && (
            <p className="mt-2 text-xs text-violet-400">
              Already on your shelf — found {new Date(already.firstFoundAt).toLocaleDateString()}.
            </p>
          )}
          {error && <p className="mt-2 text-xs font-semibold text-stat-temp">{error}</p>}
        </div>
      </div>
    </div>
  );
}
