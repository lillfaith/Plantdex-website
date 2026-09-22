import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  MAX_OBSERVATION_PHOTOS,
  MIN_OBSERVATION_PHOTOS,
  identifyPlant,
  isScanFailure,
  type ObservationPhoto,
} from './scans';

/**
 * HOW MANY PHOTOGRAPHS MAKE AN OBSERVATION.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * The count is not a form preference. Both providers treat the submitted images as ONE
 * individual plant and blend them into a single answer, so too few produces a confident
 * result from thin evidence and a mixed set produces a confident result about neither plant.
 *
 * Refused in three places — the button, `identifyPlant`, and the edge function — and this
 * file covers the middle one, which is the only one reachable without a browser and the one
 * a future caller could bypass by importing the library directly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const photo = (name: string, organ: ObservationPhoto['organ']): ObservationPhoto => ({
  file: new File([new Uint8Array([1, 2, 3])], name, { type: 'image/jpeg' }),
  organ,
});

const WHOLE = photo('whole.jpg', 'habit');
const CLOSE = photo('close.jpg', 'leaf');
const FEATURE = photo('feature.jpg', 'auto');

describe('an observation needs two or three photographs', () => {
  it('refuses zero', async () => {
    const result = await identifyPlant([]);
    expect(isScanFailure(result)).toBe(true);
  });

  it('refuses one', async () => {
    /*
     * The specific regression this whole change is about. One photograph still returns an
     * answer from either provider — just a worse one — so nothing downstream would look
     * broken. It has to be refused where the request is built.
     */
    const result = await identifyPlant([WHOLE]);
    expect(isScanFailure(result)).toBe(true);
    if (isScanFailure(result)) expect(result.message).toMatch(/2 photographs/);
  });

  it('refuses four', async () => {
    const result = await identifyPlant([WHOLE, CLOSE, FEATURE, photo('extra.jpg', 'auto')]);
    expect(isScanFailure(result)).toBe(true);
    if (isScanFailure(result)) expect(result.message).toMatch(/At most 3/);
  });

  it('accepts two and three — past the count check, into the work', async () => {
    /*
     * These get past validation and then fail on `prepareImage`, which needs a canvas the
     * node environment has not got. That is the assertion: the COUNT is no longer why they
     * stop. Asserting the failure is not a count failure is the honest form of "accepted"
     * without standing up a browser here — the real path is covered in the browser run.
     */
    for (const set of [[WHOLE, CLOSE], [WHOLE, CLOSE, FEATURE]]) {
      const result = await identifyPlant(set);
      expect(isScanFailure(result), `${set.length} photos`).toBe(true);
      if (isScanFailure(result)) {
        expect(result.message, `${set.length} photos`).not.toMatch(/photographs of the same plant/);
        expect(result.message, `${set.length} photos`).not.toMatch(/At most/);
      }
    }
  });

  it('agrees with the server about the bounds', () => {
    // Two sources for one rule, so they are compared rather than trusted to match.
    const fn = readFileSync('supabase/functions/identify-plant/index.ts', 'utf8');
    expect(fn).toContain(`const MIN_IMAGES = ${MIN_OBSERVATION_PHOTOS};`);
    expect(fn).toContain(`const MAX_IMAGES = ${MAX_OBSERVATION_PHOTOS};`);
  });
});

describe('the observation UI', () => {
  const UI = readFileSync('src/components/scan/ObservationPhotos.tsx', 'utf8');
  const PANEL = readFileSync('src/components/scan/ScanPanel.tsx', 'utf8');

  it('names three slots and marks the third recommended, not required', () => {
    for (const label of ['Whole Plant', 'Close-Up', 'Identifying Feature']) {
      expect(UI, label).toContain(label);
    }
    // A flower or fruit is the most useful third shot and many plants have neither in a
    // given season. Requiring it would block real finds over a feature that does not exist.
    expect(UI).toMatch(/required: false/);
  });

  it('carries the instruction for each slot, because the name alone is not one', () => {
    expect(UI).toContain('Photograph the entire plant');
    expect(UI).toContain('where it attaches to the stem');
    expect(UI).toContain('flower, fruit, seed head, bark');
  });

  it('says the photographs must be of the SAME individual plant', () => {
    // The sentence that makes the set mean anything: the providers blend them into one answer.
    expect(UI).toMatch(/same individual/i);
  });

  it('offers replace and remove per slot', () => {
    expect(UI).toContain('Replace');
    expect(UI).toContain('Remove');
  });

  it('warns about a duplicate rather than blocking it', () => {
    /*
     * Two shots of one leaf a second apart are different files and legitimately similar; only
     * an exact re-pick is cheaply detectable, and even that is sometimes deliberate. A block
     * would cost real observations to prevent a mistake the previews already show.
     */
    expect(UI).toMatch(/same photo/i);
    expect(UI, 'a duplicate must not be refused').not.toMatch(/return;\s*\/\/ duplicate/);
  });

  it('disables the identify button below the minimum instead of hiding it', () => {
    // A control that vanishes teaches nothing; one visibly not ready, beside a count saying
    // why, tells somebody exactly what remains.
    expect(PANEL).toContain('disabled={!canIdentify || busy}');
    expect(PANEL).toContain('canIdentify');
  });

  it('keeps the count honest in words as well as in the drawn markers', () => {
    // The squares are `aria-hidden`; this line is what a screen reader gets.
    expect(UI).toMatch(/photos required/);
    expect(UI).toMatch(/aria-live="polite"/);
  });
});
